/**
 * ParentDashboard Layer
 * V2.5.11 新設 (保護者向けダッシュボード集計エンジン)
 *
 * - profile の学習データを保護者向けダッシュボード用に集計する
 * - 集計ロジックは UI (Screen 10) から分離し、Node.js でテスト可能にする
 * - PIN 検証 (4桁) も本レイヤーに集約
 */

let UnitRegistryRef = typeof window !== "undefined" ? window.UnitRegistry : null;
let BadgeRegistryRef = typeof window !== "undefined" ? window.BadgeRegistry : null;

if (typeof require !== "undefined") {
  try { UnitRegistryRef = require("./registries.js").UnitRegistry; } catch (e) {}
  try { BadgeRegistryRef = require("./registries.js").BadgeRegistry; } catch (e) {}
}

class ParentDashboard {
  /**
   * grade の unitId -> 単元名 マップ構築 (Lv1..Lv3 を横断)
   */
  static _getUnitNameMap(grade) {
    const map = {};
    const gradeUnits = (UnitRegistryRef && UnitRegistryRef.units && UnitRegistryRef.units.math) ? UnitRegistryRef.units.math[grade] : {};
    for (const lv of [1, 2, 3]) {
      const list = gradeUnits[lv] || [];
      for (const u of list) map[u.id] = u.name;
    }
    return map;
  }

  /**
   * 単元の状態分類
   * - not_started : 未学習 (attempts = 0)
   * - learning    : 学習中 (attempts > 0) だが accuracy 未確定
   * - weak        : 学習中かつ accuracy < weakThreshold (弱点)
   * - achieved    : accuracy >= weakThreshold (習得)
   */
  static classifyUnit(attempts, accuracy, weakThreshold) {
    if (!attempts || attempts === 0) return "not_started";
    if (accuracy === null || typeof accuracy === "undefined") return "learning";
    if (accuracy < weakThreshold) return "weak";
    return "achieved";
  }

  /**
   * ダッシュボード表示用サマリーを生成する (表示ロジック非依存)
   * @param {Object} profile
   * @param {Object} config
   * @returns {Object} summary
   */
  static buildSummary(profile, config = null) {
    const weakThreshold = (config && config.math && config.math.unitSelection && config.math.unitSelection.weakAccuracyThreshold) || 0.80;
    const subject = (profile.skill && profile.skill.subject) || {};
    const currentGrade = subject.currentGrade || 1;
    const gradeProgress = subject.gradeProgress || {};
    const currentProgress = gradeProgress["grade" + currentGrade] || { difficultyLevel: 1, unitStats: {} };
    const currentLevel = currentProgress.difficultyLevel || 1;

    const history = Array.isArray(profile.history) ? profile.history : [];
    const tests = Array.isArray(profile.tests) ? profile.tests : [];
    const reviewQueue = Array.isArray(profile.reviewQueue) ? profile.reviewQueue : [];
    const badges = Array.isArray(profile.badges) ? profile.badges : [];

    // 総合統計
    const correctTotal = history.filter(h => h.correct).length;
    const totalAccuracy = history.length > 0 ? Math.round((correctTotal / history.length) * 1000) / 1000 : null;

    // 現在学年 + 現在レベルの単元別一覧
    const currentUnits = (UnitRegistryRef && UnitRegistryRef.units && UnitRegistryRef.units.math && UnitRegistryRef.units.math[currentGrade])
      ? (UnitRegistryRef.units.math[currentGrade][currentLevel] || [])
      : [];
    const currentUnitRows = currentUnits.map(u => {
      const stats = currentProgress.unitStats[u.id] || { attempts: 0, correct: 0, accuracy: null, masteryScore: 0 };
      return {
        unitId: u.id,
        name: u.name,
        attempts: stats.attempts || 0,
        accuracy: (typeof stats.accuracy === "undefined" || stats.accuracy === null) ? null : stats.accuracy,
        mastery: stats.masteryScore || 0,
        status: this.classifyUnit(stats.attempts || 0, (typeof stats.accuracy === "undefined" ? null : stats.accuracy), weakThreshold)
      };
    });

    // 全学年にまたがる弱点単元の抽出
    const weakUnits = [];
    for (let g = 1; g <= 6; g++) {
      const gp = gradeProgress["grade" + g];
      if (!gp || !gp.unitStats) continue;
      const nameMap = this._getUnitNameMap(g);
      for (const uId in gp.unitStats) {
        const s = gp.unitStats[uId];
        if (s && s.attempts > 0 && s.accuracy !== null && typeof s.accuracy !== "undefined" && s.accuracy < weakThreshold) {
          weakUnits.push({
            grade: g,
            unitId: uId,
            name: nameMap[uId] || uId,
            attempts: s.attempts,
            accuracy: s.accuracy
          });
        }
      }
    }
    weakUnits.sort((a, b) => a.accuracy - b.accuracy);

    // 学年別サマリー
    const gradeSummaries = [];
    for (let g = 1; g <= 6; g++) {
      const gp = gradeProgress["grade" + g];
      let attempts = 0;
      let correct = 0;
      if (gp && gp.unitStats) {
        for (const uId in gp.unitStats) {
          const s = gp.unitStats[uId];
          attempts += s.attempts || 0;
          correct += s.correct || 0;
        }
      }
      gradeSummaries.push({
        grade: g,
        level: (gp && gp.difficultyLevel) || 1,
        attempts,
        accuracy: attempts > 0 ? Math.round((correct / attempts) * 1000) / 1000 : null
      });
    }

    // 直近履歴 10件 (新しい順)
    const recentHistory = history.slice(-10).reverse().map(h => ({
      correct: !!h.correct,
      grade: h.grade,
      unitId: h.unitId,
      completedAt: h.completedAt || ""
    }));

    // 直近テスト 3回 (新しい順)
    const recentTests = tests.slice(-3).reverse().map(t => ({
      grade: t.grade,
      passed: !!t.passed,
      accuracy: t.accuracy,
      correctCount: t.correctCount,
      questionCount: t.questionCount,
      completedAt: t.completedAt || ""
    }));

    // バッジ一覧 (獲得 / 未獲得)
    let allBadges = [];
    if (BadgeRegistryRef && typeof BadgeRegistryRef.getAll === "function") {
      allBadges = BadgeRegistryRef.getAll().map(b => ({
        id: b.id,
        label: b.label,
        description: b.description,
        unlocked: badges.includes(b.id)
      }));
    }

    return {
      profileName: (profile.identity && profile.identity.name) || "",
      currentGrade,
      currentLevel,
      achievementLevel: (profile.points && profile.points.achievementLevel) || 1,
      totalPoints: (profile.points && profile.points.total) || 0,
      totalAttempts: history.length,
      totalAccuracy,
      bestStreak: (profile.streaks && profile.streaks.bestStreak) || 0,
      currentStreak: (profile.streaks && profile.streaks.correctStreak) || 0,
      currentUnitRows,
      weakUnits,
      gradeSummaries,
      recentHistory,
      recentTests,
      reviewInfo: {
        active: reviewQueue.filter(r => r.status === "active").length,
        graduated: reviewQueue.filter(r => r.status === "graduated").length
      },
      badges: allBadges,
      createdAt: (profile.identity && profile.identity.createdAt) || ""
    };
  }

  /**
   * 4桁の数字列か検証する
   * @param {*} raw
   * @returns {boolean}
   */
  static validatePin(raw) {
    if (typeof raw !== "string" || raw.length !== 4) return false;
    for (let i = 0; i < raw.length; i++) {
      const ch = raw.charAt(i);
      if (ch < "0" || ch > "9") return false;
    }
    return true;
  }
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { ParentDashboard };
} else {
  window.ParentDashboard = ParentDashboard;
}