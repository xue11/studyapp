/**
 * Automated Tests for Phase 8 (V2.5.15: 連続学習日数・デイリー目標・学習推移グラフ)
 * Run with: node tests/test_phase8.js
 *
 * 検証項目:
 *  - updateDailyStreak: 初回 / 同日重複 / 連続(+1) / 空白ギャップ(リセット) / best更新
 *  - countTodayQuestions: 今日の通常学習完了問数（テストは含めない）
 *  - buildDailyStats: all / learning / test の3モード集計・ゼロ日含む・同日合算
 */

const assert = require("assert");
const { LearningEngine } = require("../js/learning_engine.js");
const { ParentDashboard } = require("../js/parent_dashboard.js");

console.log("=== Running Phase 8 Verification Tests (連続学習日数・学習推移グラフ) ===\n");

// 日付ユーティリティ (テスト内で再現)
const formatISO = (y, m, d) => `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
const offset = (dateStr, days) => LearningEngine._dateOffset(dateStr, days);

function testDailyStreak() {
  console.log("1. Testing updateDailyStreak (初回/同日/連続/ギャップ/best)...");
  const mk = () => ({ streaks: { correctStreak: 0, bestStreak: 0, dailyStreak: 0, bestDailyStreak: 0, lastStudyDate: "" } });
  const today = "2026-09-05";

  // 初回
  let p1 = mk();
  LearningEngine.updateDailyStreak(p1, today);
  assert.strictEqual(p1.streaks.dailyStreak, 1, "初回は1日");
  assert.strictEqual(p1.streaks.lastStudyDate, today, "lastStudyDate 更新");

  // 同日再呼び出しは加算しない
  LearningEngine.updateDailyStreak(p1, today);
  assert.strictEqual(p1.streaks.dailyStreak, 1, "同日再呼び出しは1のまま");

  // 翌日 = 連続 (+1)
  LearningEngine.updateDailyStreak(p1, "2026-09-06");
  assert.strictEqual(p1.streaks.dailyStreak, 2, "連続日 +1");
  assert.strictEqual(p1.streaks.bestDailyStreak, 2, "best更新");
  assert.strictEqual(p1.streaks.lastStudyDate, "2026-09-06");

  // 2日空けるとリセット
  LearningEngine.updateDailyStreak(p1, "2026-09-09");
  assert.strictEqual(p1.streaks.dailyStreak, 1, "2日以上空くとリセット");
  assert.strictEqual(p1.streaks.bestDailyStreak, 2, "bestは維持");

  // さらに連続で2 → best は2のまま
  LearningEngine.updateDailyStreak(p1, "2026-09-10");
  assert.strictEqual(p1.streaks.dailyStreak, 2, "再び連続2");

  // 3連続で best 更新
  LearningEngine.updateDailyStreak(p1, "2026-09-11");
  assert.strictEqual(p1.streaks.dailyStreak, 3, "連続3");
  assert.strictEqual(p1.streaks.bestDailyStreak, 3, "best 3に更新");

  console.log("  [PASS] 連続日数の全ケース (初回/同日/連続/ギャップ/best) OK.");
}

function testCountTodayQuestions() {
  console.log("2. Testing countTodayQuestions (デイリー目標・テスト含めない)...");
  const today = "2026-09-05";
  const history = [
    { completedAt: "2026-09-04T10:00:00Z", correct: true },
    { completedAt: "2026-09-05T08:00:00Z", correct: true },
    { completedAt: "2026-09-05T09:00:00Z", correct: false },
    { completedAt: "2026-09-06T01:00:00Z", correct: true }
  ];
  assert.strictEqual(LearningEngine.countTodayQuestions(history, today), 2, "今日の2問のみ");
  assert.strictEqual(LearningEngine.countTodayQuestions([], today), 0, "空は0");
  console.log("  [PASS] 今日の通常学習完了問数のカウント OK.");
}

function testBuildDailyStats() {
  console.log("3. Testing buildDailyStats (all/learning/test・ゼロ日含む・同日合算)...");
  const today = "2026-09-05";
  const history = [
    { completedAt: "2026-09-03T08:00:00Z", correct: true },
    { completedAt: "2026-09-05T08:00:00Z", correct: true },
    { completedAt: "2026-09-05T09:00:00Z", correct: false }
  ];
  const tests = [
    { completedAt: "2026-09-04T10:00:00Z", questionCount: 10, correctCount: 8 },
    { completedAt: "2026-09-05T11:00:00Z", questionCount: 10, correctCount: 10 }
  ];

  const all = ParentDashboard.buildDailyStats(history, tests, today, 3, "all");
  assert.strictEqual(all.length, 3, "3日分 (ゼロ日含む)");
  const d3 = all.find(d => d.date === "2026-09-03");
  const d4 = all.find(d => d.date === "2026-09-04");
  const d5 = all.find(d => d.date === "2026-09-05");
  assert.ok(d3 && d4 && d5, "各日が存在");

  assert.strictEqual(d3.attempts, 1, "9/03: 学習1問 (テストなし)");
  assert.strictEqual(d4.attempts, 10, "9/04: テスト10問のみ");
  assert.strictEqual(d4.accuracy, 0.8, "9/04: テスト正答率0.8");
  assert.strictEqual(d5.attempts, 12, "9/05: 学習2問 + テスト10問 = 合算12");
  assert.strictEqual(d5.correct, 11, "9/05: 正解1+10 = 11");
  assert.ok(Math.abs(d5.accuracy - 11 / 12) < 0.001, "9/05: 統合正答率");

  const learningOnly = ParentDashboard.buildDailyStats(history, tests, today, 3, "learning");
  assert.strictEqual(learningOnly.find(d => d.date === "2026-09-04").attempts, 0, "learningモードはテストを含まない");
  assert.strictEqual(learningOnly.find(d => d.date === "2026-09-05").attempts, 2, "learningモードの9/05は2問");

  const testOnly = ParentDashboard.buildDailyStats(history, tests, today, 3, "test");
  assert.strictEqual(testOnly.find(d => d.date === "2026-09-03").attempts, 0, "testモードは学習を含まない");
  assert.strictEqual(testOnly.find(d => d.date === "2026-09-05").attempts, 10, "testモードの9/05はテスト10問のみ");

  console.log("  [PASS] 3モード集計・ゼロ日・同日合算・正答率 OK.");
}

try {
  testDailyStreak();
  testCountTodayQuestions();
  testBuildDailyStats();
  console.log("\n==============================================");
  console.log("ALL PHASE 8 TESTS PASSED SUCCESSFULLY! (3/3)");
  console.log("==============================================");
} catch (err) {
  console.error("\nTEST FAILED:", err);
  process.exit(1);
}