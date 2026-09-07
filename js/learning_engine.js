/**
 * LearningEngine & MasteryEngine Layer
 * V2.5.10 詳細設計書 第13章・第14章・第18.1.3章 準拠
 * 
 * - attempts: 完了したquestionInstance数のみを加算
 * - attemptCount: そのquestionInstanceへの実回答回数（1〜3）
 * - accuracy: attempts === 0 は null、それ以外は correct / attempts
 * - masteryScore: 初回=learningScore、2回目以降=old*0.7 + score*0.3
 * - learningStartDate: 当該gradeで初回通常学習完了時に設定
 */

class LearningEngine {
  /**
   * 1問完了時に unitStats と masteryScore を更新する
   * @param {Object} currentUnitStats ({ attempts, correct, accuracy, masteryScore })
   * @param {number} learningScore (0.0〜1.0)
   * @param {boolean} isCorrect (最終正解か否か)
   * @returns {Object} updatedUnitStats
   */
  static updateUnitStats(currentUnitStats, learningScore, isCorrect) {
    const stats = currentUnitStats ? { ...currentUnitStats } : {
      attempts: 0,
      correct: 0,
      accuracy: null,
      masteryScore: 0.0
    };

    const isFirstTime = stats.attempts === 0;

    // 1. attempts と correct の加算 (attempts は完了questionInstance数)
    stats.attempts += 1;
    if (isCorrect) {
      stats.correct += 1;
    }

    // 2. accuracy の算出
    stats.accuracy = stats.attempts > 0 ? (stats.correct / stats.attempts) : null;

    // 3. masteryScore の更新 (第14章)
    if (isFirstTime) {
      stats.masteryScore = learningScore;
    } else {
      const updatedMastery = (stats.masteryScore * 0.7) + (learningScore * 0.3);
      stats.masteryScore = Math.round(updatedMastery * 1000) / 1000;
    }

    return stats;
  }

  /**
   * gradeの learningStartDate を必要に応じて設定する
   * @param {Object} gradeProgress 
   * @param {string} localDateString (YYYY-MM-DD)
   */
  static ensureLearningStartDate(gradeProgress, localDateString = null) {
    if (gradeProgress && gradeProgress.learningStartDate === null) {
      const today = localDateString || new Date().toISOString().split("T")[0];
      gradeProgress.learningStartDate = today;
    }
  }

  /**
   * 連続学習日数 (dailyStreak) を更新する (V2.5.15)
   * - 通常学習の1問完了時とテスト完了時の両方から呼ばれる
   * - 当日の再呼び出しは無視（重複加算しない）
   * - 昨日の学習があれば +1、それ以外（初回・2日以上の空白）は 1 にリセット
   * @param {Object} profile
   * @param {string} localDateString (YYYY-MM-DD)
   * @returns {Object|null} 更新後の streaks
   */
  static updateDailyStreak(profile, localDateString = null) {
    if (!profile || !profile.streaks) return null;
    const today = localDateString || new Date().toISOString().split("T")[0];
    const streaks = profile.streaks;
    const last = streaks.lastStudyDate || "";

    if (last !== today) {
      const yesterday = this._dateOffset(today, -1);
      streaks.dailyStreak = (last === yesterday) ? (streaks.dailyStreak || 0) + 1 : 1;
      streaks.lastStudyDate = today;
      if (streaks.dailyStreak > (streaks.bestDailyStreak || 0)) {
        streaks.bestDailyStreak = streaks.dailyStreak;
      }
    }
    return streaks;
  }

  /**
   * 今日の通常学習の完了問数を数える (V2.5.15 / デイリー目標用・テストは含めない)
   * @param {Array<Object>} history profile.history (completedAt付き)
   * @param {string} localDateString (YYYY-MM-DD)
   * @returns {number}
   */
  static countTodayQuestions(history, localDateString = null) {
    if (!Array.isArray(history)) return 0;
    const today = localDateString || new Date().toISOString().split("T")[0];
    return history.filter(h => (h.completedAt || "").slice(0, 10) === today).length;
  }

  /**
   * YYYY-MM-DD の日付キーを日数分ずらす (UTC ベース)
   * @param {string} dateKey (YYYY-MM-DD)
   * @param {number} offsetDays
   * @returns {string} (YYYY-MM-DD)
   */
  static _dateOffset(dateKey, offsetDays) {
    const t = new Date(dateKey + "T00:00:00Z").getTime() + offsetDays * 86400000;
    return new Date(t).toISOString().slice(0, 10);
  }
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { LearningEngine };
} else {
  window.LearningEngine = LearningEngine;
}

