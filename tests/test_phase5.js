/**
 * Automated Tests for Phase 5 (ParentDashboard & PIN)
 * Run with: node tests/test_phase5.js
 */

const assert = require("assert");
const { APP_CONFIG } = require("../js/config.js");
const { createNewProfile, createInitialAppState } = require("../js/schema.js");
const { ParentDashboard } = require("../js/parent_dashboard.js");

console.log("=== Running Phase 5 Verification Tests (Parent Dashboard & PIN) ===\n");

function testClassifyUnit() {
  console.log("1. Testing classifyUnit...");
  assert.strictEqual(ParentDashboard.classifyUnit(0, null, 0.80), "not_started");
  assert.strictEqual(ParentDashboard.classifyUnit(0, undefined, 0.80), "not_started");
  assert.strictEqual(ParentDashboard.classifyUnit(3, null, 0.80), "learning");
  assert.strictEqual(ParentDashboard.classifyUnit(5, 0.50, 0.80), "weak");
  assert.strictEqual(ParentDashboard.classifyUnit(5, 0.80, 0.80), "achieved");
  assert.strictEqual(ParentDashboard.classifyUnit(5, 0.95, 0.80), "achieved");
  console.log("  [PASS] classifyUnit returns correct status for all 5 cases.");
}

function testValidatePin() {
  console.log("2. Testing validatePin (4-digit numeric)...");
  assert.strictEqual(ParentDashboard.validatePin("1234"), true);
  assert.strictEqual(ParentDashboard.validatePin("0000"), true);
  assert.strictEqual(ParentDashboard.validatePin("9999"), true);
  assert.strictEqual(ParentDashboard.validatePin("123"), false, "3 digits must be invalid");
  assert.strictEqual(ParentDashboard.validatePin("12345"), false, "5 digits must be invalid");
  assert.strictEqual(ParentDashboard.validatePin("12a4"), false, "non-numeric must be invalid");
  assert.strictEqual(ParentDashboard.validatePin("12 4"), false, "space must be invalid");
  assert.strictEqual(ParentDashboard.validatePin(null), false);
  assert.strictEqual(ParentDashboard.validatePin(1234), false, "number (not string) must be invalid");
  console.log("  [PASS] validatePin accepts only 4-digit numeric strings.");
}

function testBuildSummary() {
  console.log("3. Testing buildSummary aggregation & classification...");
  const profile = createNewProfile("p_dash", "テスト保護者対象", 2);
  const gp = profile.skill.subject.gradeProgress.grade2;

  profile.points.total = 250;
  profile.points.achievementLevel = 3;
  profile.history = [
    { grade: 2, unitId: "add_2digit_no_carry", correct: true, completedAt: "2026-09-01T00:00:00Z" },
    { grade: 2, unitId: "add_2digit_no_carry", correct: true, completedAt: "2026-09-02T00:00:00Z" },
    { grade: 2, unitId: "sub_2digit_no_borrow", correct: false, completedAt: "2026-09-03T00:00:00Z" }
  ];
  gp.unitStats["add_2digit_no_carry"] = { attempts: 8, correct: 7, accuracy: 0.875, masteryScore: 0.85 };
  gp.unitStats["sub_2digit_no_borrow"] = { attempts: 5, correct: 3, accuracy: 0.60, masteryScore: 0.55 };
  profile.reviewQueue = [
    { unitId: "sub_2digit_no_borrow", status: "active" },
    { unitId: "add_2digit_carry", status: "active" },
    { unitId: "kuku_intro", status: "graduated" }
  ];
  profile.badges = ["first_step"];

  const summary = ParentDashboard.buildSummary(profile, APP_CONFIG);

  assert.strictEqual(summary.currentGrade, 2);
  assert.strictEqual(summary.currentLevel, 1);
  assert.strictEqual(summary.totalPoints, 250);
  assert.strictEqual(summary.totalAttempts, 3);
  assert.strictEqual(summary.totalAccuracy, Math.round((2 / 3) * 1000) / 1000);

  // 現在学年 + Lv1 の単元 (add_2digit_no_carry, sub_2digit_no_borrow)
  assert.strictEqual(summary.currentUnitRows.length, 2, "Grade2 Lv1 has 2 units");
  const addRow = summary.currentUnitRows.find(r => r.unitId === "add_2digit_no_carry");
  const subRow = summary.currentUnitRows.find(r => r.unitId === "sub_2digit_no_borrow");
  assert.ok(addRow, "add unit row present");
  assert.strictEqual(addRow.status, "achieved");
  assert.strictEqual(addRow.accuracy, 0.875);
  assert.ok(subRow);
  assert.strictEqual(subRow.status, "weak");
  assert.strictEqual(subRow.name, "2けたのひき算（くり下がりなし）", "unit name resolved from registry");

  // 弱点単元抽出 (全学年またぎ)
  assert.ok(summary.weakUnits.some(w => w.unitId === "sub_2digit_no_borrow"), "weak unit extracted");

  // 復習状況
  assert.strictEqual(summary.reviewInfo.active, 2);
  assert.strictEqual(summary.reviewInfo.graduated, 1);

  // 学年別サマリー
  const g2Summary = summary.gradeSummaries.find(g => g.grade === 2);
  assert.ok(g2Summary);
  assert.strictEqual(g2Summary.attempts, 13, "g2 attempts = 8 + 5");
  assert.strictEqual(g2Summary.level, 1);

  // バッジ一覧
  const firstStepBadge = summary.badges.find(b => b.id === "first_step");
  assert.ok(firstStepBadge, "badge entries resolved");
  assert.strictEqual(firstStepBadge.unlocked, true);
  assert.ok(summary.badges.some(b => b.id === "kuku_master" && b.unlocked === false), "locked badge listed");

  console.log("  [PASS] buildSummary aggregation, unit naming, weakness, review, badges verified.");
}

try {
  testClassifyUnit();
  testValidatePin();
  testBuildSummary();
  console.log("\n==============================================");
  console.log("ALL PHASE 5 TESTS PASSED SUCCESSFULLY! (3/3)");
  console.log("==============================================");
} catch (err) {
  console.error("\nTEST FAILED:", err);
  process.exit(1);
}