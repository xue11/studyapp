/**
 * TestEngine Layer
 * V2.5.10 詳細設計書 第23章・第24章・第38.15〜38.16章 準拠
 * 
 * - テストは正常完了時に必ず10問（10問生成不能時は中止）
 * - 出題配分: 直近学習unit 60% (6問) + 弱点unit 40% (4問)
 * - 1問1回のみ回答可能（再回答なし、即時解説・ヒント・理解確認なし）
 * - 合格基準: 正答率 80% 以上
 * - ポイント: (basePoint + difficultyBonus) * testMultiplier (2.0倍, ストリークなし)
 * - 不正解unitは reviewQueue へ自動登録
 * - 通常学習の attempts, masteryScore, ストリークには直接反映しない
 */

let TemplateRegistryForTest = typeof window !== "undefined" ? window.TemplateRegistry : null;
let UnitRegistryForTest = typeof window !== "undefined" ? window.UnitRegistry : null;
let QuestionSourceForTest = typeof window !== "undefined" ? window.RuleBasedQuestionSource : null;
let ReviewEngineForTest = typeof window !== "undefined" ? window.ReviewEngine : null;
let PointEngineForTest = typeof window !== "undefined" ? window.PointEngine : null;
let StorageModuleForTest = typeof window !== "undefined" ? window : null;

if (typeof require !== "undefined") {
  try { TemplateRegistryForTest = require("./registries.js").TemplateRegistry; } catch (e) {}
  try { UnitRegistryForTest = require("./registries.js").UnitRegistry; } catch (e) {}
  try { QuestionSourceForTest = require("./question_source.js").RuleBasedQuestionSource; } catch (e) {}
  try { ReviewEngineForTest = require("./review_engine.js").ReviewEngine; } catch (e) {}
  try { PointEngineForTest = require("./gamification_engine.js").PointEngine; } catch (e) {}
  try { StorageModuleForTest = require("./storage.js"); } catch (e) {}
}

class TestEngine {
  /**
   * 10問のテスト問題を生成する (第23.2章 & 第24.3章)
   * @param {Object} profile 
   * @param {Object} config 
   * @returns {Array<Object>} 10問の questionInstance 配列
   */
  static generateTestQuestions(profile, config = null) {
    const currentGrade = profile.skill.subject.currentGrade;
    const gradeKey = `grade${currentGrade}`;
    const gradeProgress = profile.skill.subject.gradeProgress[gradeKey];
    const level = gradeProgress.difficultyLevel;
    const count = config?.math?.testEngine?.questionCount || 10;

    const availableUnits = this._getUnitsForLevel("math", currentGrade, level);
    if (!availableUnits || availableUnits.length === 0) {
      throw new Error("TestEngine: No units available for current grade & level.");
    }

    // 1. 直近学習unit の選定 (最近完了順、重複排除)
    const recentUnits = [];
    const gradeHistory = (profile.history || []).filter(h => h.grade === currentGrade);
    for (let i = gradeHistory.length - 1; i >= 0; i--) {
      const uId = gradeHistory[i].unitId;
      if (!recentUnits.includes(uId) && availableUnits.some(u => u.id === uId)) {
        recentUnits.push(uId);
      }
    }

    // 2. 弱点unit の選定 (accuracy !== null かつ accuracy < 0.80)
    const weakUnits = availableUnits
      .filter(u => {
        const stats = gradeProgress.unitStats[u.id];
        return stats && stats.attempts > 0 && stats.accuracy !== null && stats.accuracy < 0.80;
      })
      .map(u => u.id);

    // 3. 60% (6問) 直近 + 40% (4問) 弱点 の割り当て
    const targetRecentCount = Math.round(count * 0.6);
    const targetWeakCount = count - targetRecentCount;

    const selectedUnitIds = [];

    // 直近候補の充当
    for (let i = 0; i < targetRecentCount; i++) {
      if (recentUnits.length > 0) {
        selectedUnitIds.push(recentUnits[i % recentUnits.length]);
      } else {
        selectedUnitIds.push(availableUnits[i % availableUnits.length].id);
      }
    }

    // 弱点候補の充当
    for (let i = 0; i < targetWeakCount; i++) {
      if (weakUnits.length > 0) {
        selectedUnitIds.push(weakUnits[i % weakUnits.length]);
      } else if (recentUnits.length > 0) {
        selectedUnitIds.push(recentUnits[i % recentUnits.length]);
      } else {
        selectedUnitIds.push(availableUnits[i % availableUnits.length].id);
      }
    }

    // 4. 各選定unitから questionInstance を生成
    const testQuestions = [];
    const qSource = QuestionSourceForTest || window.RuleBasedQuestionSource;
    const tReg = TemplateRegistryForTest || window.TemplateRegistry;

    for (let i = 0; i < count; i++) {
      const uId = selectedUnitIds[i];
      const templates = tReg.getByUnit("math", currentGrade, level, uId);
      if (!templates || templates.length === 0) {
        throw new Error(`TestEngine: Template for unit ${uId} not found.`);
      }
      const t = templates[Math.floor(Math.random() * templates.length)];
      const qInstance = qSource.generateQuestion(t.templateId, testQuestions);
      testQuestions.push(qInstance);
    }

    if (testQuestions.length !== count) {
      throw new Error(`TestEngine: Failed to generate exactly ${count} safe questions. Aborting.`);
    }

    return testQuestions;
  }

  /**
   * テストセッションを採点し、結果とState更新を行う (第23章)
   * @param {Object} params
   *   - appState: 全体のアプリケーションState
   *   - testQuestions: 出題された10問の配列
   *   - userAnswers: ユーザーが入力した回答配列 (文字列)
   *   - testType: "monthly"|"midterm"|"final"
   *   - config: APP_CONFIG
   *   - storageManager: StorageManager
   *   - localDateString: YYYY-MM-DD
   * @returns {Object} testSummary
   */
  static completeTestSession({
    appState,
    testQuestions,
    userAnswers,
    testType = "monthly",
    config = null,
    storageManager = null,
    localDateString = null
  }) {
    const nextState = JSON.parse(JSON.stringify(appState));
    const profile = nextState.profiles.find(p => p.identity.id === nextState.activeProfileId);
    const today = localDateString || new Date().toISOString().split("T")[0];
    const currentGrade = profile.skill.subject.currentGrade;
    const gradeProgress = profile.skill.subject.gradeProgress[`grade${currentGrade}`];
    const level = gradeProgress.difficultyLevel;

    let correctCount = 0;
    const unitResultsMap = {};
    const incorrectUnits = new Set();
    const details = [];

    // 1問ずつ採点
    for (let i = 0; i < testQuestions.length; i++) {
      const q = testQuestions[i];
      const rawAns = (userAnswers[i] || "").trim();
      const isCorrect = this._checkAnswer(rawAns, q.answer, q.answerType);

      if (!unitResultsMap[q.unitId]) {
        unitResultsMap[q.unitId] = { unitId: q.unitId, questionCount: 0, correctCount: 0 };
      }
      unitResultsMap[q.unitId].questionCount++;

      if (isCorrect) {
        correctCount++;
        unitResultsMap[q.unitId].correctCount++;
      } else {
        incorrectUnits.add(q.unitId);
      }

      details.push({
        questionInstanceId: q.questionInstanceId,
        unitId: q.unitId,
        questionText: q.questionText,
        userAnswer: rawAns,
        correctAnswer: q.answer,
        isCorrect: isCorrect
      });
    }

    const accuracy = correctCount / testQuestions.length;
    const passThreshold = config?.math?.testEngine?.passAccuracy ?? 0.80;
    const passed = accuracy >= passThreshold;

    // テストポイント計算: 1問あたり (basePoint + diffBonus) * 2.0
    const pointEngine = PointEngineForTest || window.PointEngine;
    let totalTestPoints = 0;
    for (let i = 0; i < correctCount; i++) {
      totalTestPoints += pointEngine.calculateTestQuestionPoints({
        isCorrect: true,
        difficultyLevel: level,
        config: config
      });
    }
    profile.points.total = (profile.points.total || 0) + totalTestPoints;

    // 不正解単元を復習キューへ登録 (第23.7章: トリガーC)
    const reviewEngine = ReviewEngineForTest || window.ReviewEngine;
    for (const uId of incorrectUnits) {
      const sampleQ = testQuestions.find(q => q.unitId === uId);
      reviewEngine.registerForReview(profile, {
        subjectId: "math",
        grade: currentGrade,
        unitId: uId,
        conceptId: sampleQ?.conceptId || "",
        templateId: sampleQ?.templateId || "",
        sourceQuestionId: sampleQ?.questionInstanceId || ""
      }, today);
    }

    // unitResults 配列の作成
    const unitResults = Object.values(unitResultsMap).map(u => ({
      unitId: u.unitId,
      questionCount: u.questionCount,
      correctCount: u.correctCount,
      accuracy: u.questionCount > 0 ? (u.correctCount / u.questionCount) : null
    }));

    // テスト履歴レコード保存 (第23.11章)
    const testRecord = {
      testId: `test_${Date.now()}`,
      testType: testType,
      grade: currentGrade,
      difficultyLevel: level,
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      questionCount: testQuestions.length,
      correctCount: correctCount,
      accuracy: accuracy,
      passed: passed,
      pointsEarned: totalTestPoints,
      unitResults: unitResults,
      details: details
    };

    if (!profile.tests) profile.tests = [];
    profile.tests.push(testRecord);

    // バッジ・達成レベル再評価
    if (typeof window !== "undefined" && window.BadgeEngine) {
      window.BadgeEngine.evaluateBadges(profile);
      profile.points.achievementLevel = window.CharacterEngine.calculateAchievementLevel(profile.points.total, config);
    }

    // 保存
    if (storageManager) {
      storageManager.saveState(nextState);
    }

    return {
      success: true,
      nextState: nextState,
      testRecord: testRecord
    };
  }

  static _checkAnswer(userInput, correctAnswer, answerType) {
    if (!userInput) return false;
    const cleanUser = userInput.replace(/\s+/g, "");
    const cleanAns = correctAnswer.replace(/\s+/g, "");
    if (cleanUser === cleanAns) return true;

    // 小数・数値の許容判定
    const numUser = parseFloat(cleanUser);
    const numAns = parseFloat(cleanAns);
    if (!isNaN(numUser) && !isNaN(numAns) && numUser === numAns) {
      return true;
    }
    return false;
  }

  static _getUnitsForLevel(subjectId, grade, level) {
    const reg = UnitRegistryForTest || (typeof window !== "undefined" ? window.UnitRegistry : null);
    return reg ? reg.getUnitsForLevel(subjectId, grade, level) : [];
  }
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { TestEngine };
} else {
  window.TestEngine = TestEngine;
}

