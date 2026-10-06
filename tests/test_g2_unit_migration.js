const assert = require("assert");
const { migrateAppState } = require("../js/migration.js");
const { UnitRegistry } = require("../js/registries.js");

const history = [
  { grade: 2, unitId: "add_2digit_no_carry", questionInstanceId: "old-add" },
  { grade: 2, unitId: "shape_tri_quad", questionInstanceId: "old-shape" }
];
const state = {
  schemaVersion: "2.5.6",
  profiles: [{
    identity: { id: "p_migration" },
    skill: {
      subject: {
        currentGrade: 2,
        gradeProgress: {
          grade2: {
            unitStats: {
              addition_2digit: { attempts: 2, correct: 1, accuracy: 0.5, masteryScore: 0.5 },
              add_2digit_no_carry: { attempts: 4, correct: 3, accuracy: 0.75, masteryScore: 0.75 },
              add_2digit_carry: { attempts: 4, correct: 2, accuracy: 0.5, masteryScore: 0.5 },
              shape_tri_quad: { attempts: 3, correct: 2, accuracy: 2 / 3, masteryScore: 0.6 }
            },
            unitRotationBag: ["add_2digit_no_carry", "addition_2digit", "add_2digit_carry", "shape_tri_quad"]
          }
        }
      }
    },
    reviewQueue: [
      { reviewId: "review-old-easy", subjectId: "math", grade: 2, unitId: "add_2digit_no_carry", status: "active", dueAt: "2026-10-10", failCount: 1, successCount: 2, intervalDays: 3 },
      { reviewId: "review-old-hard", subjectId: "math", grade: 2, unitId: "add_2digit_carry", status: "active", dueAt: "2026-10-08", failCount: 4, successCount: 0, intervalDays: 1 },
      { reviewId: "review-canonical", subjectId: "math", grade: 2, unitId: "addition_2digit", status: "active", dueAt: "2026-10-09", failCount: 2, successCount: 1, intervalDays: 2 },
      { reviewId: "review-other-grade", subjectId: "math", grade: 3, unitId: "add_2digit_no_carry", status: "active", dueAt: "2026-10-09", failCount: 1, successCount: 0, intervalDays: 1 }
    ],
    history
  }]
};

const migrated = migrateAppState(state);
const profile = migrated.profiles[0];
const grade2 = profile.skill.subject.gradeProgress.grade2;

assert.deepStrictEqual(grade2.unitStats.addition_2digit, {
  attempts: 10,
  correct: 6,
  accuracy: 0.6,
  masteryScore: 0.6
});
assert.strictEqual(grade2.unitStats.geometry_g2.attempts, 3);
assert.ok(!Object.prototype.hasOwnProperty.call(grade2.unitStats, "add_2digit_no_carry"));
assert.deepStrictEqual(grade2.unitRotationBag, ["addition_2digit", "geometry_g2"]);

const additionReviews = profile.reviewQueue.filter(item =>
  item.grade === 2 && item.unitId === "addition_2digit" && item.status === "active"
);
assert.strictEqual(additionReviews.length, 1);
assert.strictEqual(additionReviews[0].dueAt, "2026-10-08");
assert.strictEqual(additionReviews[0].failCount, 4);
assert.strictEqual(additionReviews[0].intervalDays, 1);
assert.ok(profile.reviewQueue.some(item => item.reviewId === "review-other-grade" && item.unitId === "add_2digit_no_carry"));
assert.deepStrictEqual(profile.history, history, "Historical question records must not be rewritten");
assert.strictEqual(UnitRegistry.findUnit("math", 2, "add_2digit_no_carry").id, "addition_2digit");
assert.strictEqual(UnitRegistry.findUnit("math", 2, "shape_tri_quad").id, "geometry_g2");

const migratedAgain = migrateAppState(migrated);
assert.deepStrictEqual(migratedAgain, migrated, "Unit migration must be idempotent");

console.log("[PASS] Grade-2 unit progress, review queue, and rotation bag migrate to canonical IDs");
console.log("[PASS] Historical question records remain unchanged and legacy unit labels resolve");
console.log("[PASS] Re-running migration is idempotent");
