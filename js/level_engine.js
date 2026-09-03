/**
 * LevelEngine Layer
 * V2.5.10 詳細設計書 第18章・第38.8〜38.11章 準拠
 * 
 * - 判定開始条件: 現在レベルの総unitの60%以上が学習済み（attempts >= 5, ceil端数処理）
 * - レベルアップ条件: 学習済みunitのmastery平均 >= 0.75 かつ 直近5問learningScore平均 >= 0.70
 * - レベルダウン条件: 学習済みunitのmastery平均 < 0.35 かつ 直近5問learningScore平均 < 0.40
 * - Lv1〜Lv3の境界制約 & Lv3到達時の学年変更通知フラグ
 */

class LevelEngine {
  /**
   * 現在の進捗からレベルアップ・ダウン判定を行う
   * @param {Object} profile 
   * @param {Object} config 
   * @returns {{ evaluated: boolean, levelChanged: boolean, previousLevel: number, newLevel: number, reason: string, reachedMaxLevelNotice: boolean }}
   */
  static evaluateLevel(profile, config = null) {
    const currentGrade = profile.skill.subject.currentGrade;
    const gradeKey = `grade${currentGrade}`;
    const gradeProgress = profile.skill.subject.gradeProgress[gradeKey];
    const currentLevel = gradeProgress.difficultyLevel;

    const conf = config?.math?.levelEngine || {
      levelUpMastery: 0.75,
      levelUpLearningScore: 0.70,
      levelDownMastery: 0.35,
      levelDownLearningScore: 0.40,
      levelCheckCoverage: 0.60,
      unitCompletionAttempts: 5
    };

    const availableUnits = this._getUnitsForLevel("math", currentGrade, currentLevel);
    const totalUnitsCount = availableUnits.length;
    if (totalUnitsCount === 0) {
      return { evaluated: false, levelChanged: false, previousLevel: currentLevel, newLevel: currentLevel, reason: "no_units", reachedMaxLevelNotice: false };
    }

    // 1. 学習済みunit (attempts >= 5) の抽出
    const completedUnits = availableUnits.filter(u => {
      const stats = gradeProgress.unitStats[u.id];
      return stats && stats.attempts >= conf.unitCompletionAttempts;
    });

    // 2. 60% カバレッジ判定 (第18.2章: Math.ceil(total * 0.60))
    const requiredCompletedUnits = Math.ceil(totalUnitsCount * conf.levelCheckCoverage);
    if (completedUnits.length < requiredCompletedUnits) {
      return {
        evaluated: false,
        levelChanged: false,
        previousLevel: currentLevel,
        newLevel: currentLevel,
        reason: `coverage_not_met (${completedUnits.length}/${requiredCompletedUnits})`,
        reachedMaxLevelNotice: false
      };
    }

    // 3. 直近5問の履歴抽出 (第18.6章: 当該学年の通常学習完了直近5問)
    const gradeHistory = (profile.history || []).filter(h => h.grade === currentGrade);
    if (gradeHistory.length < 5) {
      return {
        evaluated: false,
        levelChanged: false,
        previousLevel: currentLevel,
        newLevel: currentLevel,
        reason: `history_not_enough (${gradeHistory.length}/5)`,
        reachedMaxLevelNotice: false
      };
    }
    const last5 = gradeHistory.slice(-5);
    const avgLearningScore = last5.reduce((sum, h) => sum + (h.learningScore || 0), 0) / 5;

    // 4. 学習済みunitの masteryScore 平均算出
    const totalMastery = completedUnits.reduce((sum, u) => {
      const stats = gradeProgress.unitStats[u.id];
      return sum + (stats?.masteryScore || 0);
    }, 0);
    const avgMastery = totalMastery / completedUnits.length;

    // 5. レベルアップ判定 (第18.3章)
    if (avgMastery >= conf.levelUpMastery && avgLearningScore >= conf.levelUpLearningScore) {
      if (currentLevel < 3) {
        gradeProgress.difficultyLevel = currentLevel + 1;
        gradeProgress.unitRotationBag = []; // レベル変更時はバッグを再生成
        return {
          evaluated: true,
          levelChanged: true,
          previousLevel: currentLevel,
          newLevel: currentLevel + 1,
          reason: "level_up",
          reachedMaxLevelNotice: false
        };
      } else {
        // Lv3でアップ条件達成（Lv3維持 & 学年変更促進通知フラグ）
        return {
          evaluated: true,
          levelChanged: false,
          previousLevel: 3,
          newLevel: 3,
          reason: "max_level_reached",
          reachedMaxLevelNotice: true
        };
      }
    }

    // 6. レベルダウン判定 (第18.4章)
    if (avgMastery < conf.levelDownMastery && avgLearningScore < conf.levelDownLearningScore) {
      if (currentLevel > 1) {
        gradeProgress.difficultyLevel = currentLevel - 1;
        gradeProgress.unitRotationBag = [];
        return {
          evaluated: true,
          levelChanged: true,
          previousLevel: currentLevel,
          newLevel: currentLevel - 1,
          reason: "level_down",
          reachedMaxLevelNotice: false
        };
      } else {
        // Lv1でダウン条件成立（Lv1維持）
        return {
          evaluated: true,
          levelChanged: false,
          previousLevel: 1,
          newLevel: 1,
          reason: "min_level_maintained",
          reachedMaxLevelNotice: false
        };
      }
    }

    return {
      evaluated: true,
      levelChanged: false,
      previousLevel: currentLevel,
      newLevel: currentLevel,
      reason: "maintained",
      reachedMaxLevelNotice: false
    };
  }

  static _getUnitsForLevel(subjectId, grade, level) {
    if (typeof UnitRegistry !== "undefined") {
      return UnitRegistry.getUnitsForLevel(subjectId, grade, level);
    }
    const { UnitRegistry: UR } = require("./registries.js");
    return UR.getUnitsForLevel(subjectId, grade, level);
  }
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { LevelEngine };
} else {
  window.LevelEngine = LevelEngine;
}

