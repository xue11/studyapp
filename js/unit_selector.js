/**
 * UnitSelector Layer
 * V2.5.10 詳細設計書 第15章・第16章・第38.4〜38.7章 準拠
 * 
 * - 出題優先順位: 復習期限超過 → 復習当日 → Coverage/Weakness Phase → 通常ローテーション
 * - Coverage Phase (< 14日): ローテーションバッグを優先
 * - Weakness Phase (>= 14日): 40% ローテーション + 60% 弱点重み付け
 * - 未学習unit (attempts = 0) は accuracy = null のため弱点重み付け対象外
 * - V2.9.7 (P1-2): 日付キーは DateUtils.localDateKey() (JST基準) に統一
 */

let DateUtilsForUS = typeof window !== "undefined" ? window.DateUtils : null;
if (typeof require !== "undefined") {
  try { DateUtilsForUS = require("./date_utils.js").DateUtils; } catch (e) {}
}

class UnitSelector {
  /**
   * 次の出題単元または復習項目を選択する
   * @param {Object} profile 
   * @param {Object} config 
   * @param {string} localDateString (YYYY-MM-DD)
   * @returns {{ type: "review"|"normal", unitId: string, reviewItem?: Object, phase: string }}
   */
  static selectNextUnit(profile, config = null, localDateString = null) {
    const today = (localDateString ||
      (DateUtilsForUS ? DateUtilsForUS.localDateKey() : new Date().toISOString().split("T")[0]));
    const currentGrade = profile.skill.subject.currentGrade;
    const gradeKey = `grade${currentGrade}`;
    const gradeProgress = profile.skill.subject.gradeProgress[gradeKey];
    const level = gradeProgress.difficultyLevel;

    // 1. 復習キューの確認（優先順位 ① 期限超過 ② 当日）
    const activeReviews = (profile.reviewQueue || []).filter(r => 
      r.status === "active" &&
      r.grade === currentGrade &&
      r.dueAt && r.dueAt <= today
    );

    // V2.6.2 (minimal B): skip review items whose unit no longer exists in any level
    // V2.6.4: if figureEnabled===false, also skip figure (shape_*) review items
    const validReviews = activeReviews.filter(r =>
      this._unitExistsInAnyLevel(currentGrade, r.unitId) &&
      (this._isFigureEnabled(profile) || this._reviewHasEnabledTemplates(r))
    );

    if (validReviews.length > 0) {
      // dueAt が古い順 -> failCount が多い順 -> registeredAt が古い順
      validReviews.sort((a, b) => {
        if (a.dueAt !== b.dueAt) return a.dueAt.localeCompare(b.dueAt);
        if (a.failCount !== b.failCount) return b.failCount - a.failCount;
        return (a.registeredAt || "").localeCompare(b.registeredAt || "");
      });
      const topReview = validReviews[0];
      return {
        type: "review",
        unitId: topReview.unitId,
        reviewItem: topReview,
        phase: "review"
      };
    }

    // 2. Normal unit selection (Coverage vs Weakness Phase)
    // V2.6.4: if figureEnabled===false, exclude shape_* units
    let availableUnits = this._getUnitsForLevel("math", currentGrade, level);
    availableUnits = this._filterFigureUnits(availableUnits, profile, "math", currentGrade, level);
    if (!availableUnits || availableUnits.length === 0) {
      // Safety fallback: restore unfiltered list (grade1 Lv1 keeps 3 calc units, so normally not empty)
      availableUnits = this._getUnitsForLevel("math", currentGrade, level);
    }
    if (!availableUnits || availableUnits.length === 0) {
      throw new Error(`UnitSelector: No units registered for grade ${currentGrade} level ${level}`);
    }

    const daysElapsed = this._calculateDaysElapsed(gradeProgress.learningStartDate, today);
    const coveragePeriod = config?.math?.unitSelection?.coveragePeriodDays ?? 14;

    if (daysElapsed < coveragePeriod) {
      // Coverage Phase (< 14日)
      const unitId = this._drawFromRotationBag(gradeProgress, availableUnits);
      return {
        type: "normal",
        unitId: unitId,
        phase: "coverage"
      };
    } else {
      // Weakness Phase (>= 14日)
      // 40% ローテーション、60% 弱点
      const minRotationRatio = config?.math?.unitSelection?.minRotationRatio ?? 0.40;
      const weakThreshold = config?.math?.unitSelection?.weakAccuracyThreshold ?? 0.80;

      // 弱点unitの抽出 (attempts >= 1 かつ accuracy !== null かつ accuracy < 0.80)
      const weakUnits = availableUnits.filter(u => {
        const stats = gradeProgress.unitStats[u.id];
        return stats && stats.attempts > 0 && stats.accuracy !== null && stats.accuracy < weakThreshold;
      });

      // 乱数で判定 (弱点unitが存在し、かつ 60% の枠に入った場合)
      const roll = Math.random();
      if (weakUnits.length > 0 && roll >= minRotationRatio) {
        // 弱点重み付け選択: weight = 1 + max(0, 0.80 - accuracy) * 3
        const selectedWeakUnitId = this._selectWeightedWeakUnit(weakUnits, gradeProgress.unitStats);
        return {
          type: "normal",
          unitId: selectedWeakUnitId,
          phase: "weakness"
        };
      } else {
        // ローテーション出題
        const unitId = this._drawFromRotationBag(gradeProgress, availableUnits);
        return {
          type: "normal",
          unitId: unitId,
          phase: "weakness_rotation"
        };
      }
    }
  }

  /**
   * V2.6.2: unit が当該学年のいずれかのレベル (Lv1〜3) に存在するか判定する
   * 復習キューに残る別レベル所属 unit を許可し、削除済み unit のみ除外するためのガード
   * @param {number} grade
   * @param {string} unitId
   * @returns {boolean}
   */
  static _unitExistsInAnyLevel(grade, unitId) {
    for (let lv = 1; lv <= 3; lv++) {
      const units = this._getUnitsForLevel("math", grade, lv);
      if (units && units.some(u => u.id === unitId)) return true;
    }
    return false;
  }

  // V2.6.4: figureEnabled helpers (Phase 0, plan A/A-1)
  // A profile with settings.figureEnabled===false excludes figure units.
  // V2.7.0: 判定を「"shape_" 接頭辞」から「figure テンプレートを1本以上持つ単元」へ汎化する。
  //   - box_shape（はこの形）は接頭辞が shape_ ではなく、図形問題を含みうる単元
  //   - 今後追加される G3 図形単元（angle_figure 等）も自動的に追従する
  static _isFigureEnabled(profile) {
    if (!profile || !profile.settings) return true;
    if (typeof profile.settings.figureEnabled !== "boolean") return true;
    return profile.settings.figureEnabled;
  }

  /**
   * figure テンプレート (problemType === "figure") を持つ unitId の集合
   * 登録済みテンプレートの増加を検知してキャッシュを破棄する。
   */
  static _figureUnitIds() {
    const cache = this.__figureUnitIdCache;
    if (cache && cache.count === Object.keys(this._templateList()).length) {
      return cache.ids;
    }
    const ids = new Set();
    const list = this._templateList();
    list.forEach(t => {
      if (t && t.problemType === "figure" && typeof t.unitId === "string") {
        ids.add(t.unitId);
      }
    });
    this.__figureUnitIdCache = { count: list.length, ids };
    return ids;
  }

  /** TemplateRegistry からテンプレート一覧を安全に取得する (Node / ブラウザ両対応) */
  static _templateList() {
    try {
      let reg = (typeof TemplateRegistry !== "undefined") ? TemplateRegistry : null;
      if (!reg && typeof window !== "undefined") reg = window.TemplateRegistry;
      if (!reg && typeof require !== "undefined") reg = require("./registries.js").TemplateRegistry;
      if (reg && reg.templates) return Object.values(reg.templates);
    } catch (e) { /* require不可の環境では空として扱う */ }
    return [];
  }

  static _isFigureUnit(unitId) {
    if (typeof unitId !== "string" || !unitId) return false;
    // 接頭辞ルールはフォールバック（テンプレートが未読込でも図形OFF判定を保つ）
    if (unitId.indexOf("shape_") === 0) return true;
    return this._figureUnitIds().has(unitId);
  }

  static _unitHasNonFigureTemplates(unitId, grade, level = null) {
    return this._templateList().some(template =>
      template &&
      template.unitId === unitId &&
      template.grade === grade &&
      (level === null || template.difficultyLevel === level) &&
      template.problemType !== "figure"
    );
  }

  static _reviewHasEnabledTemplates(reviewItem) {
    if (reviewItem.templateId) {
      const template = this._templateList().find(t => t && t.templateId === reviewItem.templateId);
      if (template) return template.problemType !== "figure";
    }
    return !this._isFigureUnit(reviewItem.unitId) ||
      this._unitHasNonFigureTemplates(reviewItem.unitId, reviewItem.grade);
  }

  static _filterFigureUnits(units, profile, subjectId = null, grade = null, level = null) {
    if (!Array.isArray(units)) return units;
    if (this._isFigureEnabled(profile)) return units;
    return units.filter(u => {
      if (!this._isFigureUnit(u && u.id)) return true;
      if (!subjectId || grade === null || level === null) return false;
      return this._unitHasNonFigureTemplates(u.id, grade, level);
    });
  }

  static _drawFromRotationBag(gradeProgress, availableUnits) {
    const availableIds = availableUnits.map(u => u.id);
    let bag = Array.isArray(gradeProgress.unitRotationBag) ? [...gradeProgress.unitRotationBag] : [];

    // V2.6.1: bag とレジストリの同期
    //  - レジストリから削除された unit を bag から除去
    //  - 「一度も bag に入ったことがない新規 unit」のみをランダム位置に注入
    //    (既に引いた unit が即座に戻ることを防ぎ、1巡ローテーションを維持)
    //  - 既知unitリスト (unitRotationKnownUnits) は永続化され、旧バージョン状態にも後方互換
    bag = bag.filter(id => availableIds.includes(id));

    let known = Array.isArray(gradeProgress.unitRotationKnownUnits)
      ? gradeProgress.unitRotationKnownUnits.filter(id => availableIds.includes(id))
      : [];
    // V2.6.6: すでに bag に残っている unit も「既知」として扱う。
    // (旧版で永続化された bag の中身が新規扱いされ、巡の途中で再注入されて
    //  同じ unit が1巡内に2回出題される不具合を防ぐ)
    for (const id of bag) {
      if (!known.includes(id)) known.push(id);
    }
    const brandNew = availableIds.filter(id => !known.includes(id) && !bag.includes(id));
    for (const id of brandNew) {
      bag.splice(Math.floor(Math.random() * (bag.length + 1)), 0, id);
      known.push(id);
    }
    gradeProgress.unitRotationKnownUnits = known;

    if (bag.length === 0) {
      bag = this._shuffleArray([...availableIds]);
      gradeProgress.unitRotationKnownUnits = [...availableIds];
    }

    gradeProgress.unitRotationBag = bag;
    return gradeProgress.unitRotationBag.pop();
  }

  static _selectWeightedWeakUnit(weakUnits, unitStats) {
    let totalWeight = 0;
    const weightedList = weakUnits.map(u => {
      const stats = unitStats[u.id];
      const acc = stats?.accuracy ?? 0.80;
      const weight = 1 + Math.max(0, 0.80 - acc) * 3;
      totalWeight += weight;
      return { id: u.id, weight: totalWeight };
    });

    const r = Math.random() * totalWeight;
    for (const item of weightedList) {
      if (r <= item.weight) {
        return item.id;
      }
    }
    return weakUnits[0].id;
  }

  static _calculateDaysElapsed(startDateStr, todayStr) {
    if (!startDateStr) return 0;
    const start = new Date(startDateStr);
    const today = new Date(todayStr);
    const diffTime = today.getTime() - start.getTime();
    return Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
  }

  static _shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  static _getUnitsForLevel(subjectId, grade, level) {
    if (typeof UnitRegistry !== "undefined") {
      return UnitRegistry.getUnitsForLevel(subjectId, grade, level);
    }
    // Node.js 環境での require フォールバック
    const { UnitRegistry: UR } = require("./registries.js");
    return UR.getUnitsForLevel(subjectId, grade, level);
  }
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { UnitSelector };
} else {
  window.UnitSelector = UnitSelector;
}
