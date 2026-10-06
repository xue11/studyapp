/**
 * Automated Tests for Phase 5 (ParentDashboard & PIN)
 * Run with: node tests/test_phase5.js
 */

const assert = require("assert");
const { APP_CONFIG } = require("../js/config.js");
const { createNewProfile, createInitialAppState } = require("../js/schema.js");
const { ParentDashboard } = require("../js/parent_dashboard.js");
const { UnitRegistry } = require("../js/registries.js");

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
    { grade: 2, unitId: "addition_2digit", correct: true, completedAt: "2026-09-01T00:00:00Z" },
    { grade: 2, unitId: "addition_2digit", correct: true, completedAt: "2026-09-02T00:00:00Z" },
    { grade: 2, unitId: "subtraction_2digit", correct: false, completedAt: "2026-09-03T00:00:00Z" }
  ];
  gp.unitStats["addition_2digit"] = { attempts: 8, correct: 7, accuracy: 0.875, masteryScore: 0.85 };
  gp.unitStats["subtraction_2digit"] = { attempts: 5, correct: 3, accuracy: 0.60, masteryScore: 0.55 };
  profile.reviewQueue = [
    { unitId: "subtraction_2digit", status: "active" },
    { unitId: "addition_2digit", status: "active" },
    { unitId: "multiplication_g2", status: "graduated" }
  ];
  profile.badges = ["first_step"];

  const summary = ParentDashboard.buildSummary(profile, APP_CONFIG);

  assert.strictEqual(summary.currentGrade, 2);
  assert.strictEqual(summary.currentLevel, 1);
  assert.strictEqual(summary.totalPoints, 250);
  assert.strictEqual(summary.totalAttempts, 3);
  assert.strictEqual(summary.totalAccuracy, Math.round((2 / 3) * 1000) / 1000);

  // 現在学年 + Lv1 の単元 (registry 登録数と一致すること)
  const lv1Units = UnitRegistry.getUnitsForLevel("math", 2, 1);
  assert.strictEqual(summary.currentUnitRows.length, lv1Units.length,
    `Grade2 Lv1 unit rows must match registry (${lv1Units.length})`);
  const addRow = summary.currentUnitRows.find(r => r.unitId === "addition_2digit");
  const subRow = summary.currentUnitRows.find(r => r.unitId === "subtraction_2digit");
  assert.ok(addRow, "add unit row present");
  assert.strictEqual(addRow.status, "achieved");
  assert.strictEqual(addRow.accuracy, 0.875);
  assert.ok(subRow);
  assert.strictEqual(subRow.status, "weak");
  assert.strictEqual(subRow.name, "2けたのひき算", "unified unit name resolved from registry");

  // 弱点単元抽出 (全学年またぎ)
  assert.ok(summary.weakUnits.some(w => w.unitId === "subtraction_2digit"), "weak unit extracted");

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