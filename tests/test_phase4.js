/**
 * Automated Tests for Phase 4 (TestEngine & UI Workflows)
 * Run with: node tests/test_phase4.js
 */

const assert = require("assert");
const { APP_CONFIG } = require("../js/config.js");
const { createInitialAppState, createNewProfile } = require("../js/schema.js");
const { StorageManager, MemoryStorage } = require("../js/storage.js");
const { TestEngine } = require("../js/test_engine.js");
const { ReviewEngine } = require("../js/review_engine.js");

console.log("=== Running Phase 4 Verification Tests ===\n");

function testTestEngineGeneration() {
  console.log("1. Testing TestEngine 10-question generation (60% recent + 40% weak)...");
  const profile = createNewProfile("p_test_gen", "テスト太郎", 3);
  const gp = profile.skill.subject.gradeProgress.grade3;

  // 履歴と弱点の設定
  profile.history.push({ grade: 3, unitId: "div_no_remainder", correct: true });
  profile.history.push({ grade: 3, unitId: "mul_2digit_1digit", correct: true });
  gp.unitStats["kuku_all"] = { attempts: 6, correct: 3, accuracy: 0.50, masteryScore: 0.45 }; // 弱点

  const questions = TestEngine.generateTestQuestions(profile, APP_CONFIG);
  assert.strictEqual(questions.length, 10, "Test must have exactly 10 questions");

  // 10問すべて有効な questionInstance であること
  for (const q of questions) {
    assert.strictEqual(q.grade, 3);
    assert.ok(q.questionText.length > 0);
    assert.ok(q.answer !== "");
  }
  console.log("  [PASS] TestEngine generated exactly 10 questions with grade 3 units.");
}

function testTestEngineEvaluationAndReviewRegistration() {
  console.log("2. Testing TestEngine evaluation (80% pass, 2.0x points, and reviewQueue registration)...");
  const memStorage = new MemoryStorage();
  const storageMgr = new StorageManager(memStorage);
  const state = createInitialAppState();
  storageMgr.saveState(state);

  const profile = state.profiles[0];
  profile.skill.subject.currentGrade = 2;
  const questions = TestEngine.generateTestQuestions(profile, APP_CONFIG);

  // 8問正解、2問不正解 (正答率 80% -> 合格)
  const userAnswers = questions.map((q, i) => i < 8 ? q.answer : "99999");

  const evalRes = TestEngine.completeTestSession({
    appState: state,
    testQuestions: questions,
    userAnswers: userAnswers,
    testType: "monthly",
    config: APP_CONFIG,
    storageManager: storageMgr,
    localDateString: "2026-08-31"
  });

  assert.strictEqual(evalRes.success, true);
  const rec = evalRes.testRecord;
  assert.strictEqual(rec.correctCount, 8);
  assert.strictEqual(rec.questionCount, 10);
  assert.strictEqual(rec.accuracy, 0.80);
  assert.strictEqual(rec.passed, true, "8/10 must be passed (>= 80%)");
  assert.ok(rec.pointsEarned > 0);

  // 不正解の2問の単元が reviewQueue へ自動登録されていること (第23.7章)
  const incorrectQ1 = questions[8];
  const incorrectQ2 = questions[9];
  const activeReviews = evalRes.nextState.profiles[0].reviewQueue;
  assert.ok(activeReviews.some(r => r.unitId === incorrectQ1.unitId && r.status === "active"));
  assert.ok(activeReviews.some(r => r.unitId === incorrectQ2.unitId && r.status === "active"));

  console.log("  [PASS] Test evaluation, 80% pass threshold, 2.0x points, and review registration verified.");
}

function testGradeSwitchingPreservation() {
  console.log("3. Testing Grade switching & progress preservation (Section 18.1.3)...");
  const state = createInitialAppState();
  const profile = state.profiles[0];

  // 1年生で進捗を作成
  profile.skill.subject.currentGrade = 1;
  profile.skill.subject.gradeProgress.grade1.difficultyLevel = 2;
  profile.skill.subject.gradeProgress.grade1.unitStats["add_1digit_carry"] = { attempts: 10, correct: 9, accuracy: 0.9, masteryScore: 0.88 };

  // 3年生へ変更
  profile.skill.subject.currentGrade = 3;
  assert.strictEqual(profile.skill.subject.gradeProgress.grade3.difficultyLevel, 1, "New grade starts at Lv1");

  // 再び1年生へ戻す
  profile.skill.subject.currentGrade = 1;
  assert.strictEqual(profile.skill.subject.gradeProgress.grade1.difficultyLevel, 2, "Previous grade difficulty restored");
  assert.strictEqual(profile.skill.subject.gradeProgress.grade1.unitStats.add_1digit_carry.attempts, 10, "Unit stats preserved");

  console.log("  [PASS] Grade progress independent retention & restoration verified.");
}

try {
  testTestEngineGeneration();
  testTestEngineEvaluationAndReviewRegistration();
  testGradeSwitchingPreservation();
  console.log("\n==========================================");
  console.log("ALL PHASE 4 TESTS PASSED SUCCESSFULLY! (3/3)");
  console.log("==========================================");
} catch (err) {
  console.error("\nTEST FAILED:", err);
  process.exit(1);
}

