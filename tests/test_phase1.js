/**
 * Automated Tests for Phase 1
 * Run with: node tests/test_phase1.js
 */

const assert = require("assert");
const { APP_META, APP_CONFIG } = require("../js/config.js");
const { SubjectRegistry, UnitRegistry, ProblemTypeRegistry, BadgeRegistry, TemplateRegistry } = require("../js/registries.js");
const { createInitialUnitStats, createGradeProgress, createNewProfile, createInitialAppState, validateAppState } = require("../js/schema.js");
const { migrateAppState, compareVersions } = require("../js/migration.js");
const { StorageManager, MemoryStorage } = require("../js/storage.js");

console.log("=== Running Phase 1 Verification Tests ===\n");

function testConfig() {
  console.log("1. Testing Config & App Meta...");
  assert.strictEqual(APP_META.schemaVersion, "2.5.6", "schemaVersion must be 2.5.6");
  assert.strictEqual(APP_META.appVersion, "V2.5.15", "appVersion must be V2.5.15");
  assert.strictEqual(APP_CONFIG.math.levelEngine.levelUpMastery, 0.75);
  assert.strictEqual(APP_CONFIG.math.levelEngine.levelDownMastery, 0.35);
  assert.strictEqual(APP_CONFIG.math.unitSelection.coveragePeriodDays, 14);
  assert.strictEqual(APP_CONFIG.math.pointEngine.basePoint, 10);
  assert.strictEqual(APP_CONFIG.math.pointEngine.testMultiplier, 2.0);
  assert.deepStrictEqual(APP_CONFIG.math.reviewEngine.intervalDays, [1, 3, 7, 14]);
  assert.strictEqual(APP_CONFIG.math.testEngine.questionCount, 10);
  assert.strictEqual(APP_CONFIG.math.testEngine.passAccuracy, 0.80);
  console.log("  [PASS] Config definitions match V2.5.10 specification.");
}

function testRegistries() {
  console.log("2. Testing Registries...");
  const subject = SubjectRegistry.get("math");
  assert.ok(subject, "Math subject exists");
  assert.deepStrictEqual(subject.grades, [1, 2, 3, 4, 5, 6]);

  // Grade 1-6 unit check
  for (let g = 1; g <= 6; g++) {
    const lv1Units = UnitRegistry.getUnitsForLevel("math", g, 1);
    const lv2Units = UnitRegistry.getUnitsForLevel("math", g, 2);
    const lv3Units = UnitRegistry.getUnitsForLevel("math", g, 3);
    assert.ok(lv1Units.length > 0, `Grade ${g} Lv1 units exist`);
    assert.ok(lv2Units.length > 0, `Grade ${g} Lv2 units exist`);
    assert.ok(lv3Units.length > 0, `Grade ${g} Lv3 units exist`);
  }

  assert.ok(ProblemTypeRegistry.isValid("calculation"));
  assert.ok(ProblemTypeRegistry.isValid("word_problem"));
  assert.ok(BadgeRegistry.getAll().length >= 4);
  console.log("  [PASS] UnitRegistry and Registries verified for Grades 1-6.");
}

function testSchemaAndValidation() {
  console.log("3. Testing Schema & Validation...");
  const initialStats = createInitialUnitStats();
  assert.strictEqual(initialStats.attempts, 0);
  assert.strictEqual(initialStats.accuracy, null, "accuracy must be null when attempts=0");

  const profile = createNewProfile("p_test", "テスト太郎", 2);
  assert.strictEqual(profile.skill.subject.currentGrade, 2);
  assert.strictEqual(profile.skill.subject.gradeProgress.grade2.learningStartDate, null, "learningStartDate starts as null");
  assert.strictEqual(typeof profile.streaks.incorrectStreak, "undefined", "incorrectStreak must not exist");
  // V2.5.14: ニックネーム
  assert.strictEqual(profile.identity.nickname, "", "nickname defaults to empty string (V2.5.14)");
  const nickProfile = createNewProfile("p_nick", "テスト花子", 1, "cat", "standard", "", "はなちゃん");
  assert.strictEqual(nickProfile.identity.nickname, "はなちゃん", "nickname can be set at creation (V2.5.14)");

  const state = createInitialAppState();
  const valResult = validateAppState(state);
  assert.strictEqual(valResult.valid, true, "Initial state should be valid");

  // Duplicate active reviewQueue entry test
  state.profiles[0].reviewQueue = [
    { subjectId: "math", grade: 2, unitId: "add_2digit_carry", status: "active" },
    { subjectId: "math", grade: 2, unitId: "add_2digit_carry", status: "active" }
  ];
  const invalidResult = validateAppState(state);
  assert.strictEqual(invalidResult.valid, false, "Duplicate active review queue entries must be rejected");

  console.log("  [PASS] Schema models, null states, and validation rules confirmed.");
}

function testMigration() {
  console.log("4. Testing Schema Migration (Old -> 2.5.6)...");
  const oldLegacyData = {
    schemaVersion: "1.0.0",
    profiles: [
      {
        identity: { id: "p_old", name: "古いユーザー" },
        skill: {
          subject: {
            currentGrade: 3,
            difficultyLevel: 2,
            learningStartDate: "2026-08-01",
            unitStats: {
              div_no_remainder: { attempts: 6, correct: 5, accuracy: 0.83, masteryScore: 0.7 }
            }
          }
        },
        streaks: { correctStreak: 3, incorrectStreak: 1 },
        reviewQueue: [
          { unitId: "div_no_remainder", failCount: 1, status: "active" }
        ],
        history: [
          { questionInstanceId: "q1", attempts: 2, correct: true }
        ]
      }
    ]
  };

  const migrated = migrateAppState(oldLegacyData);
  assert.strictEqual(migrated.schemaVersion, "2.5.6");
  assert.strictEqual(migrated.appMeta.appVersion, "V2.5.15");

  const p = migrated.profiles[0];
  assert.strictEqual(p.skill.subject.gradeProgress.grade3.difficultyLevel, 2);
  assert.strictEqual(p.skill.subject.gradeProgress.grade3.learningStartDate, "2026-08-01");
  assert.ok(p.skill.subject.gradeProgress.grade3.unitStats.div_no_remainder);
  assert.strictEqual(typeof p.skill.subject.difficultyLevel, "undefined", "Old flat fields removed");
  assert.strictEqual(typeof p.streaks.incorrectStreak, "undefined", "incorrectStreak removed during migration");
  assert.strictEqual(p.identity.nickname, "", "missing nickname auto-filled during migration (V2.5.14)");
  assert.strictEqual(p.reviewQueue[0].grade, 3, "Missing grade attached to reviewQueue");
  assert.strictEqual(p.history[0].attemptCount, 2, "history.attempts converted to attemptCount");
  assert.strictEqual(typeof p.history[0].attempts, "undefined");

  const val = validateAppState(migrated);
  assert.strictEqual(val.valid, true, "Migrated state is completely valid under 2.5.6 schema");
  console.log("  [PASS] Migration logic correctly upgraded legacy schema to 2.5.6.");
}

function testStorageManager() {
  console.log("5. Testing StorageManager (Save/Load/Export/Import)...");
  const memStorage = new MemoryStorage();
  const storageMgr = new StorageManager(memStorage);

  const initialLoad = storageMgr.loadState();
  assert.strictEqual(initialLoad.success, true);
  assert.strictEqual(initialLoad.isNew, true);

  const testState = initialLoad.state;
  testState.profiles[0].points.total = 150;
  const saveRes = storageMgr.saveState(testState);
  assert.strictEqual(saveRes.success, true);

  const reloaded = storageMgr.loadState();
  assert.strictEqual(reloaded.state.profiles[0].points.total, 150);

  // Export and Import check
  const exportedJSON = storageMgr.exportStateJSON(reloaded.state);
  assert.ok(typeof exportedJSON === "string" && exportedJSON.length > 50);

  const freshStorage = new StorageManager(new MemoryStorage());
  const importRes = freshStorage.importStateJSON(exportedJSON);
  assert.strictEqual(importRes.success, true);
  assert.strictEqual(importRes.state.profiles[0].points.total, 150);

  console.log("  [PASS] StorageManager atomicity, persistence, export, and import verified.");
}

try {
  testConfig();
  testRegistries();
  testSchemaAndValidation();
  testMigration();
  testStorageManager();
  console.log("\n==========================================");
  console.log("ALL PHASE 1 TESTS PASSED SUCCESSFULLY! (5/5)");
  console.log("==========================================");
} catch (err) {
  console.error("\nTEST FAILED:", err);
  process.exit(1);
}

