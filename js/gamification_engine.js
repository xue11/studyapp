/**
 * Gamification Layer (PointEngine, BadgeEngine, CharacterEngine)
 * V2.5.10 詳細設計書 第19章〜第21章・第38.18章 準拠
 * 
 * - 通常学習ポイント: basePoint + difficultyBonus + streakBonus (ヒント正解でも満額)
 * - テストポイント: (basePoint + difficultyBonus) * testMultiplier (ストリークなし)
 * - 達成レベル: 累計ポイントによるキャラクター成長判定
 * - バッジ判定: BadgeRegistry に基づく実績アンロック
 */

class PointEngine {
  /**
   * 通常学習での獲得ポイントを計算する
   * @param {Object} params { isCorrect, difficultyLevel, updatedCorrectStreak, config }
   * @returns {number} pointsEarned
   */
  static calculateRegularPoints({ isCorrect, difficultyLevel = 1, updatedCorrectStreak = 0, config = null }) {
    if (!isCorrect) {
      return 0;
    }

    const basePoint = config?.math?.pointEngine?.basePoint ?? 10;
    const diffBonusMap = config?.math?.pointEngine?.difficultyBonus ?? { 1: 0, 2: 5, 3: 10 };
    const diffBonus = diffBonusMap[difficultyLevel] ?? 0;

    const streak3Bonus = config?.math?.pointEngine?.streakBonus3 ?? 5;
    const streak5Bonus = config?.math?.pointEngine?.streakBonus5 ?? 10;

    // ストリークボーナス (第19章: 3問連続で5pt、5問以上で10pt、重複加算なし)
    let streakBonus = 0;
    if (updatedCorrectStreak >= 5) {
      streakBonus = streak5Bonus;
    } else if (updatedCorrectStreak >= 3) {
      streakBonus = streak3Bonus;
    }

    return basePoint + diffBonus + streakBonus;
  }

  /**
   * テストでの1問あたり獲得ポイントを計算する
   * (第19.3章 & 第38.18.1章: ストリークボーナスなし、2.0倍固定)
   * @param {Object} params { isCorrect, difficultyLevel, config }
   * @returns {number} pointsEarned
   */
  static calculateTestQuestionPoints({ isCorrect, difficultyLevel = 1, config = null }) {
    if (!isCorrect) {
      return 0;
    }

    const basePoint = config?.math?.pointEngine?.basePoint ?? 10;
    const diffBonusMap = config?.math?.pointEngine?.difficultyBonus ?? { 1: 0, 2: 5, 3: 10 };
    const diffBonus = diffBonusMap[difficultyLevel] ?? 0;
    const multiplier = config?.math?.testEngine?.multiplier ?? 2.0;

    return (basePoint + diffBonus) * multiplier;
  }
}

class CharacterEngine {
  /**
   * 累計ポイントから達成レベルを計算する
   * (第20章: 80, 150, 250, 400...)
   * @param {number} totalPoints 
   * @param {Object} config 
   * @returns {number} achievementLevel
   */
  static calculateAchievementLevel(totalPoints, config = null) {
    const thresholds = config?.common?.achievementLevel?.levelThresholds || [80, 150, 250, 400];
    let level = 1;
    for (let i = 0; i < thresholds.length; i++) {
      if (totalPoints >= thresholds[i]) {
        level = i + 2; // 80ptでLv2, 150ptでLv3...
      } else {
        break;
      }
    }
    return level;
  }
}

class BadgeEngine {
  /**
   * 条件を満たす未獲得バッジを判定・付与する
   * @param {Object} profile 
   * @returns {Array<Object>} newBadgesUnlocked
   */
  static evaluateBadges(profile) {
    if (!profile.badges) profile.badges = [];
    const unlocked = [];

    const allBadges = this._getAllBadges();
    for (const badge of allBadges) {
      if (profile.badges.includes(badge.id)) {
        continue; // すでに獲得済み
      }

      if (this._checkBadgeCondition(badge.condition, profile)) {
        profile.badges.push(badge.id);
        unlocked.push(badge);
      }
    }

    return unlocked;
  }

  static _checkBadgeCondition(cond, profile) {
    if (!cond) return false;

    switch (cond.type) {
      case "total_attempts":
        return (profile.history || []).length >= cond.count;

      case "streak":
        return (profile.streaks?.bestStreak || 0) >= cond.count;

      case "total_points":
        return (profile.points?.total || 0) >= cond.points;

      case "test_passed":
        return (profile.tests || []).filter(t => t.passed).length >= cond.count;

      case "unit_accuracy": {
        const currentGrade = profile.skill.subject.currentGrade;
        const stats = profile.skill.subject.gradeProgress[`grade${currentGrade}`]?.unitStats[cond.unit];
        return !!(stats && stats.attempts >= (cond.minAttempts || 10) && (stats.accuracy || 0) >= cond.minAccuracy);
      }

      default:
        return false;
    }
  }

  static _getAllBadges() {
    if (typeof BadgeRegistry !== "undefined") {
      return BadgeRegistry.getAll();
    }
    const { BadgeRegistry: BR } = require("./registries.js");
    return BR.getAll();
  }
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    PointEngine,
    CharacterEngine,
    BadgeEngine
  };
} else {
  window.PointEngine = PointEngine;
  window.CharacterEngine = CharacterEngine;
  window.BadgeEngine = BadgeEngine;
}

