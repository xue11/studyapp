/**
 * Application Configuration & Feature Flags
 * V2.5.10 詳細設計書 第26章・第27章 準拠
 */

const APP_META = {
  appName: "小学生向け算数学習アプリ",
  appVersion: "V2.9.3",
  schemaVersion: "2.5.6",
  generationMode: "rule_based"
};

const APP_CONFIG = {
  math: {
    levelEngine: {
      levelUpMastery: 0.75,
      levelUpLearningScore: 0.70,
      levelDownMastery: 0.35,
      levelDownLearningScore: 0.40,
      levelCheckCoverage: 0.60,
      unitCompletionAttempts: 5
    },
    unitSelection: {
      coveragePeriodDays: 14,
      minRotationRatio: 0.40,
      weakAccuracyThreshold: 0.80
    },
    pointEngine: {
      basePoint: 10,
      difficultyBonus: {
        1: 0,
        2: 5,
        3: 10
      },
      streakBonus3: 5,
      streakBonus5: 10,
      testMultiplier: 2.0
    },
    reviewEngine: {
      graduationSuccessCount: 3,
      maxIntervalDays: 14,
      intervalDays: [1, 3, 7, 14],
      weakMasteryThreshold: 0.50,
      weakMinAttempts: 5
    },
    testEngine: {
      questionCount: 10,
      passAccuracy: 0.80,
      multiplier: 2.0
    },
    generation: {
      maxRetry: 5
    }
  },
  common: {
    achievementLevel: {
      levelThresholds: [80, 150, 250, 400]
    },
    dailyGoal: 5,        // V2.5.15: デイリー目標の完了問数 (通常学習のみカウント)
    graphDays: 14        // V2.5.15: 保護者ダッシュボードの学習推移グラフ表示日数
  },
  features: {
    tests: true,
    parentMode: true,
    wordProblems: true,
    figureProblems: true,
    claudeApi: false
  }
};

// Node.js / ES Module / ブラウザグローバル環境の互換性確保
if (typeof module !== "undefined" && module.exports) {
  module.exports = { APP_META, APP_CONFIG };
} else {
  window.APP_META = APP_META;
  window.APP_CONFIG = APP_CONFIG;
}

