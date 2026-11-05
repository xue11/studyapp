const CHALLENGE_STAGE_COUNT = 5;
const CHALLENGE_PASS_SCORE = 4;

const CHALLENGE_CATEGORIES = {
  number_reasoning: "数の関係",
  pattern_reasoning: "規則",
  systematic_counting: "場合の数",
  spatial_reasoning: "図形",
  time_reasoning: "時刻",
  measurement_reasoning: "単位・量",
  logic_reasoning: "論理",
  fraction_reasoning: "分数"
};

const CHALLENGE_METHODS = [
  { id: "organize", label: "図や式にして整理した" },
  { id: "search", label: "小さい方から順に調べた" },
  { id: "pattern", label: "きまりや関係を見つけた" },
  { id: "cases", label: "場合を分けて考えた" },
  { id: "convert", label: "単位や数の大きさをそろえた" },
  { id: "reverse", label: "逆から考えた" }
];

class ChallengeEngine {
  static getProgress(profile, grade) {
    if (!profile || !Number.isInteger(grade) || grade < 1 || grade > 3) {
      throw new Error("ChallengeEngine: profile and grade 1-3 are required.");
    }
    if (!profile.challengeProgress || typeof profile.challengeProgress !== "object") {
      profile.challengeProgress = {};
    }

    const key = `grade${grade}`;
    if (!profile.challengeProgress[key]) {
      profile.challengeProgress[key] = { unlockedStage: 1, stages: {}, categoryStats: {} };
    }

    const progress = profile.challengeProgress[key];
    if (!Number.isInteger(progress.unlockedStage) || progress.unlockedStage < 1 || progress.unlockedStage > 3) {
      progress.unlockedStage = 1;
    }
    if (!progress.stages || typeof progress.stages !== "object") progress.stages = {};
    if (!progress.categoryStats || typeof progress.categoryStats !== "object") progress.categoryStats = {};
    for (let stage = 1; stage <= 3; stage++) {
      const current = progress.stages[stage] || {};
      progress.stages[stage] = {
        attempts: Number.isInteger(current.attempts) && current.attempts >= 0 ? current.attempts : 0,
        bestScore: Number.isInteger(current.bestScore) && current.bestScore >= 0 && current.bestScore <= CHALLENGE_STAGE_COUNT
          ? current.bestScore : 0,
        completed: current.completed === true,
        methodCorrect: Number.isInteger(current.methodCorrect) && current.methodCorrect >= 0
          ? current.methodCorrect : 0
      };
    }
    return progress;
  }

  static canStartStage(profile, grade, stage) {
    if (!Number.isInteger(stage) || stage < 1 || stage > 3) return false;
    return stage <= this.getProgress(profile, grade).unlockedStage;
  }

  static getTemplates(grade, stage) {
    if (!Number.isInteger(grade) || grade < 1 || grade > 3 ||
        !Number.isInteger(stage) || stage < 1 || stage > 3) {
      throw new Error("ChallengeEngine: grade and stage are out of range.");
    }
    let registry = (typeof TemplateRegistry !== "undefined") ? TemplateRegistry : null;
    if (!registry && typeof window !== "undefined") registry = window.TemplateRegistry;
    if (!registry && typeof require !== "undefined") registry = require("./registries.js").TemplateRegistry;
    if (!registry) throw new Error("ChallengeEngine: TemplateRegistry is unavailable.");
    return Object.values(registry.templates).filter(template =>
      template.grade === grade &&
      template.difficultyLevel === 3 &&
      template.unitId === `challenge_g${grade}` &&
      template.challenge &&
      template.challenge.stage === stage
    );
  }

  static recordStageResult(profile, grade, stage, correctCount, methodResults = []) {
    if (!this.canStartStage(profile, grade, stage)) {
      throw new Error(`ChallengeEngine: stage ${stage} is locked.`);
    }
    if (!Number.isInteger(correctCount) || correctCount < 0 || correctCount > CHALLENGE_STAGE_COUNT) {
      throw new Error("ChallengeEngine: correctCount must be between 0 and 5.");
    }
    if (!Array.isArray(methodResults)) throw new Error("ChallengeEngine: methodResults must be an array.");

    const progress = this.getProgress(profile, grade);
    const stageProgress = progress.stages[stage];
    stageProgress.attempts += 1;
    stageProgress.bestScore = Math.max(stageProgress.bestScore, correctCount);
    stageProgress.completed = stageProgress.completed || correctCount >= CHALLENGE_PASS_SCORE;
    stageProgress.methodCorrect += methodResults.filter(result => result && result.correct).length;

    for (const result of methodResults) {
      if (!result || typeof result.category !== "string") continue;
      const stats = progress.categoryStats[result.category] || { attempts: 0, correct: 0 };
      stats.attempts += 1;
      if (result.correct) stats.correct += 1;
      progress.categoryStats[result.category] = stats;
    }

    const passed = correctCount >= CHALLENGE_PASS_SCORE;
    if (passed && stage < 3) {
      progress.unlockedStage = Math.max(progress.unlockedStage, stage + 1);
    }
    return {
      passed,
      unlockedStage: progress.unlockedStage,
      stageProgress: { ...stageProgress }
    };
  }
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    ChallengeEngine,
    CHALLENGE_STAGE_COUNT,
    CHALLENGE_PASS_SCORE,
    CHALLENGE_CATEGORIES,
    CHALLENGE_METHODS
  };
} else {
  window.ChallengeEngine = ChallengeEngine;
  window.CHALLENGE_STAGE_COUNT = CHALLENGE_STAGE_COUNT;
  window.CHALLENGE_PASS_SCORE = CHALLENGE_PASS_SCORE;
  window.CHALLENGE_CATEGORIES = CHALLENGE_CATEGORIES;
  window.CHALLENGE_METHODS = CHALLENGE_METHODS;
}
