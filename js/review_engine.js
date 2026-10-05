/**
 * ReviewEngine Layer
 * V2.5.10 詳細設計書 第17章・第38.12〜38.14章 準拠
 * 
 * - 復習キュー管理 (一意キー: subjectId + grade + unitId)
 * - 復習登録トリガー (A: 3回不正解, B: attempts>=5 & mastery<0.50, C: テスト不正解)
 * - 復習間隔: 1日 → 3日 → 7日 → 14日
 * - 卒業条件: successCount >= 3 かつ intervalDays === 14
 * - graduated からの復帰処理 & 学年別フィルタリング
 */

class ReviewEngine {
  /**
   * V2.9.7 (P1-2): 日付キーは DateUtils.localDateKey() (JST基準) に統一。
   * @param {string} [localDateStringOverride] テスト等で上書きする日付キー
   */
  static _todayKey(localDateStringOverride = null) {
    if (localDateStringOverride) return localDateStringOverride;
    try {
      if (typeof window !== "undefined" && window.DateUtils) return window.DateUtils.localDateKey();
    } catch (e) { /* ignore */ }
    try {
      if (typeof require !== "undefined") return require("./date_utils.js").DateUtils.localDateKey();
    } catch (e) { /* ignore */ }
    return new Date().toISOString().split("T")[0];
  }

  /**
   * 復習キューに対象unitを登録または再活性化する
   * @param {Object} profile 
   * @param {Object} itemParams { subjectId, grade, unitId, conceptId, templateId, sourceQuestionId }
   * @param {string} localDateString (YYYY-MM-DD)
   * @returns {Object} { registered: boolean, reviewItem: Object, reason: "new"|"reactivated"|"maintained" }
   */
  static registerForReview(profile, itemParams, localDateString = null) {
    if (!profile || !itemParams || !itemParams.unitId) {
      throw new Error("ReviewEngine.registerForReview: invalid arguments.");
    }

    const today = this._todayKey(localDateString);
    const subjectId = itemParams.subjectId || "math";
    const grade = itemParams.grade || profile.skill.subject.currentGrade;
    const unitId = itemParams.unitId;

    if (!Array.isArray(profile.reviewQueue)) {
      profile.reviewQueue = [];
    }

    // 既存項目の検索 (一意キー: subjectId + grade + unitId)
    const existingIndex = profile.reviewQueue.findIndex(r => 
      r.subjectId === subjectId &&
      r.grade === grade &&
      r.unitId === unitId
    );

    const dueTomorrow = this._addDays(today, 1);

    if (existingIndex >= 0) {
      const existing = profile.reviewQueue[existingIndex];
      if (existing.status === "active") {
        // すでに active の場合は重複作成せず既存項目を維持
        return { registered: false, reviewItem: existing, reason: "maintained" };
      } else if (existing.status === "graduated") {
        // graduated の場合は active に戻して再利用 (第17.7.1章)
        existing.status = "active";
        existing.successCount = 0;
        existing.failCount = 0;
        existing.intervalDays = 1;
        existing.dueAt = dueTomorrow;
        existing.templateId = itemParams.templateId || existing.templateId;
        existing.sourceQuestionId = itemParams.sourceQuestionId || existing.sourceQuestionId;
        return { registered: true, reviewItem: existing, reason: "reactivated" };
      }
    }

    // 新規登録
    const newReview = {
      reviewId: `rev_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      subjectId: subjectId,
      grade: grade,
      unitId: unitId,
      conceptId: itemParams.conceptId || "",
      templateId: itemParams.templateId || "",
      sourceQuestionId: itemParams.sourceQuestionId || "",
      failCount: 1,
      successCount: 0,
      intervalDays: 1,
      dueAt: dueTomorrow,
      registeredAt: today,
      status: "active"
    };

    profile.reviewQueue.push(newReview);
    return { registered: true, reviewItem: newReview, reason: "new" };
  }

  /**
   * 復習問題の回答完了時のキュー更新
   * @param {Object} reviewItem 
   * @param {boolean} isCorrect 
   * @param {Object} config 
   * @param {string} localDateString (YYYY-MM-DD)
   * @returns {Object} updatedReviewItem
   */
  static processReviewResult(reviewItem, isCorrect, config = null, localDateString = null) {
    const today = this._todayKey(localDateString);
    const intervals = config?.math?.reviewEngine?.intervalDays || [1, 3, 7, 14];
    const maxInterval = config?.math?.reviewEngine?.maxIntervalDays || 14;
    const gradSuccessCount = config?.math?.reviewEngine?.graduationSuccessCount || 3;

    if (isCorrect) {
      // 復習正解時 (第17.5章)
      reviewItem.successCount = (reviewItem.successCount || 0) + 1;
      reviewItem.failCount = 0;

      // 次の間隔へ延長 (1 -> 3 -> 7 -> 14)
      const currentIndex = intervals.indexOf(reviewItem.intervalDays);
      if (currentIndex >= 0 && currentIndex < intervals.length - 1) {
        reviewItem.intervalDays = intervals[currentIndex + 1];
      } else {
        reviewItem.intervalDays = maxInterval;
      }

      // 卒業判定: successCount >= 3 かつ intervalDays === 14 (第17.7章)
      if (reviewItem.successCount >= gradSuccessCount && reviewItem.intervalDays >= maxInterval) {
        reviewItem.status = "graduated";
        reviewItem.dueAt = null;
        return reviewItem;
      }

      reviewItem.dueAt = this._addDays(today, reviewItem.intervalDays);
      reviewItem.status = "active";
    } else {
      // 復習不正解時 (第17.6章: 間隔を1日にリセット)
      reviewItem.failCount = (reviewItem.failCount || 0) + 1;
      reviewItem.successCount = 0;
      reviewItem.intervalDays = 1;
      reviewItem.dueAt = this._addDays(today, 1);
      reviewItem.status = "active";
    }

    return reviewItem;
  }

  static _addDays(dateStr, days) {
    // V2.9.7 (P1-2): DateUtils.addDays (JST日付ベース) に統一
    try {
      if (typeof window !== "undefined" && window.DateUtils) return window.DateUtils.addDays(dateStr, days);
    } catch (e) { /* ignore */ }
    try {
      if (typeof require !== "undefined") return require("./date_utils.js").DateUtils.addDays(dateStr, days);
    } catch (e) { /* ignore */ }
    const d = new Date(dateStr);
    d.setDate(d.getDate() + days);
    return d.toISOString().split("T")[0];
  }
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { ReviewEngine };
} else {
  window.ReviewEngine = ReviewEngine;
}
