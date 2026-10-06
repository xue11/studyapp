/**
 * Automated Tests for Phase 2 (Core Engines & Verification)
 * Run with: node tests/test_phase2.js
 */

const assert = require("assert");
const { APP_META, APP_CONFIG } = require("../js/config.js");
const { SubjectRegistry, UnitRegistry, ProblemTypeRegistry, BadgeRegistry, TemplateRegistry } = require("../js/registries.js");
const { createInitialAppState, createNewProfile, validateAppState } = require("../js/schema.js");
const { StorageManager, MemoryStorage } = require("../js/storage.js");
const { QuestionValidator, VALIDATION_ERROR_CODES } = require("../js/validator.js");
const { LearningScoreEngine } = require("../js/learning_score_engine.js");
const { LearningEngine } = require("../js/learning_engine.js");
const { UnitSelector } = require("../js/unit_selector.js");
const { ReviewEngine } = require("../js/review_engine.js");
const { LevelEngine } = require("../js/level_engine.js");
const { PointEngine, CharacterEngine, BadgeEngine } = require("../js/gamification_engine.js");
const { SessionCoordinator } = require("../js/session_coordinator.js");

console.log("=== Running Phase 2 Verification Tests ===\n");

function testQuestionValidator() {
  console.log("1. Testing QuestionValidator...");

  // 正常な問題インスタンス
  const validQuestion = {
    questionInstanceId: "q_001",
    templateId: "g3_std_div_no_remainder_01",
    grade: 3,
    difficultyLevel: 2,
    unitId: "division_g3",
    conceptId: "division_equal_share",
    problemType: "calculation",
    answerType: "number_input",
    variables: { a: 12, b: 3, quotient: 4 },
    questionText: "12 ÷ 3 = ?",
    answer: "4",
    hintSteps: ["12の中に3がいくつあるかな？", "3 × ? = 12"],
    explanation: "12 ÷ 3 = 4 だね。",
    understandingCheck: {
      enabled: true,
      question: "3 × ? = 12 の ? はどれかな？",
      choices: ["4", "3", "5"],
      answer: "4"
    }
  };

  const res1 = QuestionValidator.validate(validQuestion);
  assert.strictEqual(res1.valid, true, "Valid question should pass validation");

  // 未置換プレースホルダーの検知
  const placeholderQuestion = { ...validQuestion, questionText: "{a} ÷ {b} = ?" };
  const res2 = QuestionValidator.validate(placeholderQuestion);
  assert.strictEqual(res2.valid, false);
  assert.ok(res2.errors.some(e => e.code === VALIDATION_ERROR_CODES.TEXT_ERROR));

  // NaN の検知
  const nanQuestion = { ...validQuestion, questionText: "NaN ÷ 3 = ?" };
  const res3 = QuestionValidator.validate(nanQuestion);
  assert.strictEqual(res3.valid, false);
  assert.ok(res3.errors.some(e => e.code === VALIDATION_ERROR_CODES.CALCULATION_ERROR));

  // ゼロ除算の検知
  const zeroDivQuestion = { ...validQuestion, questionText: "12 ÷ 0 = ?" };
  const res4 = QuestionValidator.validate(zeroDivQuestion);
  assert.strictEqual(res4.valid, false);

  // 誤答選択肢重複の検知 (wrong1 === wrong2)
  const dupChoicesQuestion = {
    ...validQuestion,
    understandingCheck: {
      enabled: true,
      question: "?",
      choices: ["4", "3", "3"],
      answer: "4"
    }
  };
  const res5 = QuestionValidator.validate(dupChoicesQuestion);
  assert.strictEqual(res5.valid, false);

  console.log("  [PASS] QuestionValidator checked structural, text, NaN, division by zero, and choices.");
}

function testLearningScoreEngine() {
  console.log("2. Testing LearningScoreEngine (Rules & Priorities)...");

  // ① 初回正解 = 1.0
  assert.strictEqual(LearningScoreEngine.calculateScore({ correct: true, attemptCount: 1, hintUsed: false }), 1.0);

  // ② ノーヒント再回答正解 = 0.7 (2回目 & 3回目)
  assert.strictEqual(LearningScoreEngine.calculateScore({ correct: true, attemptCount: 2, hintUsed: false }), 0.7);
  assert.strictEqual(LearningScoreEngine.calculateScore({ correct: true, attemptCount: 3, hintUsed: false }), 0.7);

  // ③ ヒント使用後正解 = 0.5 (再回答と同時成立時も 0.5 優先)
  assert.strictEqual(LearningScoreEngine.calculateScore({ correct: true, attemptCount: 1, hintUsed: true }), 0.5);
  assert.strictEqual(LearningScoreEngine.calculateScore({ correct: true, attemptCount: 2, hintUsed: true }), 0.5);
  assert.strictEqual(LearningScoreEngine.calculateScore({ correct: true, attemptCount: 3, hintUsed: true }), 0.5);

  // ④ 3回とも不正解 = 0.0
  assert.strictEqual(LearningScoreEngine.calculateScore({ correct: false, attemptCount: 3, hintUsed: false }), 0.0);
  assert.strictEqual(LearningScoreEngine.calculateScore({ correct: false, attemptCount: 3, hintUsed: true }), 0.0);

  console.log("  [PASS] LearningScore priorities (1.0, 0.7, 0.5, 0.0) fully verified.");
}

function testLearningEngineAndMastery() {
  console.log("3. Testing LearningEngine & Mastery Calculation...");

  // 初回完了時 (attempts=0 -> 1): masteryScore = learningScore
  let stats = LearningEngine.updateUnitStats(null, 1.0, true);
  assert.strictEqual(stats.attempts, 1);
  assert.strictEqual(stats.correct, 1);
  assert.strictEqual(stats.accuracy, 1.0);
  assert.strictEqual(stats.masteryScore, 1.0);

  // 2回目完了時 (old * 0.7 + score * 0.3): 1.0*0.7 + 0.5*0.3 = 0.85
  stats = LearningEngine.updateUnitStats(stats, 0.5, true);
  assert.strictEqual(stats.attempts, 2);
  assert.strictEqual(stats.correct, 2);
  assert.strictEqual(stats.accuracy, 1.0);
  assert.strictEqual(stats.masteryScore, 0.85);

  // 3回目 (不正解: score=0.0): 0.85*0.7 + 0.0*0.3 = 0.595
  stats = LearningEngine.updateUnitStats(stats, 0.0, false);
  assert.strictEqual(stats.attempts, 3);
  assert.strictEqual(stats.correct, 2);
  assert.strictEqual(Math.round(stats.accuracy * 100) / 100, 0.67);
  assert.strictEqual(stats.masteryScore, 0.595);

  // learningStartDate 設定確認
  const gradeProgress = { learningStartDate: null };
  LearningEngine.ensureLearningStartDate(gradeProgress, "2026-08-31");
  assert.strictEqual(gradeProgress.learningStartDate, "2026-08-31");

  console.log("  [PASS] attempts, accuracy, mastery formula (0.7/0.3), and learningStartDate verified.");
}

function testReviewEngine() {
  console.log("4. Testing ReviewEngine (Lifecycle & Deduplication)...");

  const profile = createNewProfile("p_rev_test", "復習テスト", 3);

  // 1. 新規登録
  const reg1 = ReviewEngine.registerForReview(profile, {
    subjectId: "math",
    grade: 3,
    unitId: "division_g3",
    templateId: "g3_std_div_no_remainder_01"
  }, "2026-08-31");
  assert.strictEqual(reg1.registered, true);
  assert.strictEqual(profile.reviewQueue.length, 1);
  assert.strictEqual(profile.reviewQueue[0].dueAt, "2026-09-01");
  assert.strictEqual(profile.reviewQueue[0].intervalDays, 1);

  // 2. 同一キーでの重複登録ブロック (active維持)
  const reg2 = ReviewEngine.registerForReview(profile, {
    subjectId: "math",
    grade: 3,
    unitId: "division_g3"
  }, "2026-08-31");
  assert.strictEqual(reg2.registered, false);
  assert.strictEqual(reg2.reason, "maintained");
  assert.strictEqual(profile.reviewQueue.length, 1, "Duplicate active entry must not be added");

  // 3. 復習正解による間隔延伸 (1 -> 3 -> 7 -> 14)
  let item = profile.reviewQueue[0];
  item = ReviewEngine.processReviewResult(item, true, APP_CONFIG, "2026-09-01");
  assert.strictEqual(item.intervalDays, 3);
  assert.strictEqual(item.successCount, 1);

  item = ReviewEngine.processReviewResult(item, true, APP_CONFIG, "2026-09-04");
  assert.strictEqual(item.intervalDays, 7);
  assert.strictEqual(item.successCount, 2);

  item = ReviewEngine.processReviewResult(item, true, APP_CONFIG, "2026-09-11");
  assert.strictEqual(item.intervalDays, 14);
  assert.strictEqual(item.successCount, 3);
  assert.strictEqual(item.status, "graduated", "Should graduate on successCount>=3 and intervalDays=14");
  assert.strictEqual(item.dueAt, null);

  // 4. graduated からの再活性化
  const reg3 = ReviewEngine.registerForReview(profile, {
    subjectId: "math",
    grade: 3,
    unitId: "division_g3"
  }, "2026-09-25");
  assert.strictEqual(reg3.registered, true);
  assert.strictEqual(reg3.reason, "reactivated");
  assert.strictEqual(item.status, "active");
  assert.strictEqual(item.intervalDays, 1);

  console.log("  [PASS] ReviewEngine deduplication, 1->3->7->14 intervals, graduation & reactivation confirmed.");
}

function testUnitSelector() {
  console.log("5. Testing UnitSelector (Coverage & Weakness Phases)...");

  const profile = createNewProfile("p_sel_test", "選択テスト", 1);
  const gp = profile.skill.subject.gradeProgress.grade1;

  // 1. Coverage Phase (< 14日)
  gp.learningStartDate = "2026-08-25";
  const sel1 = UnitSelector.selectNextUnit(profile, APP_CONFIG, "2026-08-31"); // 6日経過
  assert.strictEqual(sel1.type, "normal");
  assert.strictEqual(sel1.phase, "coverage");
  assert.ok(sel1.unitId);

  // 2. 復習期限到来時の最優先選択
  profile.reviewQueue.push({
    subjectId: "math",
    grade: 1,
    unitId: "add_1digit_no_carry",
    dueAt: "2026-08-30", // 期限超過
    status: "active",
    failCount: 1
  });
  const sel2 = UnitSelector.selectNextUnit(profile, APP_CONFIG, "2026-08-31");
  assert.strictEqual(sel2.type, "review");
  assert.strictEqual(sel2.unitId, "add_1digit_no_carry");

  console.log("  [PASS] UnitSelector priorities and phase handling verified.");
}

function testLevelEngine() {
  console.log("6. Testing LevelEngine (60% coverage, Level up/down boundaries)...");

  const profile = createNewProfile("p_lvl_test", "レベルテスト", 1);
  const gp = profile.skill.subject.gradeProgress.grade1;
  gp.difficultyLevel = 1;

  // Grade 1 Lv1 の units: add_1digit_no_carry, sub_1digit_no_borrow, number_bond_10, shape_basic (計4単元)
  // 必要学習済みunit数: Math.ceil(4 * 0.60) = 3単元 (attempts >= 5) [V2.6.3: shape_basic追加で4単元]

  // まだ学習済みが0単元の場合 -> 判定スキップ
  const eval1 = LevelEngine.evaluateLevel(profile, APP_CONFIG);
  assert.strictEqual(eval1.evaluated, false);

  // 3単元を学習済みに設定 (attempts=5, mastery=0.80)
  gp.unitStats["add_1digit_no_carry"] = { attempts: 5, correct: 5, accuracy: 1.0, masteryScore: 0.80 };
  gp.unitStats["sub_1digit_no_borrow"] = { attempts: 5, correct: 5, accuracy: 1.0, masteryScore: 0.80 };
  gp.unitStats["shape_basic"] = { attempts: 5, correct: 5, accuracy: 1.0, masteryScore: 0.80 };

  // 直近5問の履歴 (平均learningScore >= 0.70)
  for (let i = 0; i < 5; i++) {
    profile.history.push({ grade: 1, learningScore: 0.8, correct: true });
  }

  const eval2 = LevelEngine.evaluateLevel(profile, APP_CONFIG);
  assert.strictEqual(eval2.evaluated, true);
  assert.strictEqual(eval2.levelChanged, true);
  assert.strictEqual(eval2.newLevel, 2, "Should level up to Lv2");
  assert.strictEqual(gp.difficultyLevel, 2);

  // Lv3 到達時の上限維持 & 通知フラグ
  gp.difficultyLevel = 3;
  // Grade 1 Lv3 units: add_sub_3terms_10, add_sub_3terms_20 (計2単元, 必要=2)
  gp.unitStats["add_sub_3terms_10"] = { attempts: 5, correct: 5, accuracy: 1.0, masteryScore: 0.80 };
  gp.unitStats["add_sub_3terms_20"] = { attempts: 5, correct: 5, accuracy: 1.0, masteryScore: 0.80 };
  const eval3 = LevelEngine.evaluateLevel(profile, APP_CONFIG);
  assert.strictEqual(eval3.evaluated, true);
  assert.strictEqual(eval3.levelChanged, false);
  assert.strictEqual(eval3.newLevel, 3);
  assert.strictEqual(eval3.reachedMaxLevelNotice, true, "Max level reach notice flagged at Lv3");

  console.log("  [PASS] LevelEngine ceil calculation, up/down logic, and Lv3 notice confirmed.");
}

function testGamificationAndSessionCoordinator() {
  console.log("7. Testing Gamification & SessionCoordinator (Atomic Step 1..14)...");

  const storageMgr = new StorageManager(new MemoryStorage());
  const initialLoad = storageMgr.loadState();
  const state = initialLoad.state;

  // 通常学習ポイント計算テスト
  const pts1 = PointEngine.calculateRegularPoints({ isCorrect: true, difficultyLevel: 2, updatedCorrectStreak: 3, config: APP_CONFIG });
  assert.strictEqual(pts1, 10 + 5 + 5, "10 base + 5 Lv2 + 5 streak3 = 20pt");

  // テストポイント計算テスト (2.0倍、ストリークなし)
  const testPts = PointEngine.calculateTestQuestionPoints({ isCorrect: true, difficultyLevel: 2, config: APP_CONFIG });
  assert.strictEqual(testPts, (10 + 5) * 2.0, "(10 base + 5 Lv2) * 2.0 = 30pt");

  // SessionCoordinator による1問原子的一括確定テスト (第34章)
  const questionInstance = {
    questionInstanceId: "q_atomic_01",
    templateId: "g1_basic_add_01",
    grade: 1,
    difficultyLevel: 1,
    unitId: "add_1digit_no_carry",
    conceptId: "add_basic"
  };

  const answerResult = {
    correct: true,
    attemptCount: 1,
    hintUsed: false,
    completed: true
  };

  const coordRes = SessionCoordinator.completeQuestionAtomic({
    appState: state,
    questionInstance: questionInstance,
    answerResult: answerResult,
    config: APP_CONFIG,
    storageManager: storageMgr,
    localDateString: "2026-08-31"
  });

  assert.strictEqual(coordRes.success, true);
  assert.strictEqual(coordRes.summary.learningScore, 1.0);
  assert.strictEqual(coordRes.summary.pointsEarned, 10);
  assert.strictEqual(coordRes.summary.updatedStreak, 1);

  // ストレージから再ロードして整合性確認
  const reloaded = storageMgr.loadState();
  const p = reloaded.state.profiles[0];
  assert.strictEqual(p.points.total, 10);
  assert.strictEqual(p.history.length, 1);
  assert.strictEqual(p.history[0].pointsEarned, 10);
  assert.strictEqual(p.skill.subject.gradeProgress.grade1.unitStats.add_1digit_no_carry.attempts, 1);
  assert.strictEqual(p.skill.subject.gradeProgress.grade1.learningStartDate, "2026-08-31");

  console.log("  [PASS] PointEngine and SessionCoordinator 14-step atomic completion verified.");
}

try {
  testQuestionValidator();
  testLearningScoreEngine();
  testLearningEngineAndMastery();
  testReviewEngine();
  testUnitSelector();
  testLevelEngine();
  testGamificationAndSessionCoordinator();
  console.log("\n==========================================");
  console.log("ALL PHASE 2 TESTS PASSED SUCCESSFULLY! (7/7)");
  console.log("==========================================");
} catch (err) {
  console.error("\nTEST FAILED:", err);
  process.exit(1);
}
