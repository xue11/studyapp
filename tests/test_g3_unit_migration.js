const assert = require("assert");
const { migrateAppState } = require("../js/migration.js");
const { BadgeRegistry, TemplateRegistry, UnitRegistry } = require("../js/registries.js");
require("../js/templates_math.js");

const grade3UnitsByLevel = [1, 2, 3].map(level =>
  UnitRegistry.getUnitsForLevel("math", 3, level).map(unit => unit.id)
);
assert.ok(grade3UnitsByLevel[0].includes("multiplication_g3"));
assert.ok(grade3UnitsByLevel[0].includes("add_sub_3digit"));
assert.ok(grade3UnitsByLevel[1].includes("multiplication_g3"));
assert.ok(grade3UnitsByLevel[1].includes("division_g3"));
assert.ok(grade3UnitsByLevel[2].includes("multiplication_g3"));
assert.ok(grade3UnitsByLevel[2].includes("division_g3"));
assert.ok(grade3UnitsByLevel[2].includes("calc_application_g3"));
assert.strictEqual(UnitRegistry.findUnit("math", 3, "kuku_all").id, "multiplication_g3");
assert.strictEqual(UnitRegistry.findUnit("math", 3, "div_with_remainder").id, "division_g3");
assert.strictEqual(UnitRegistry.findUnit("math", 3, "mixed_mul_div_2step").id, "calc_application_g3");
assert.strictEqual(UnitRegistry.findUnit("math", 3, "div_no_remainder").name, "わり算（あまりなし・逆向き）");
assert.strictEqual(UnitRegistry.getLearningGroupLabel("math", 3, "calculation_application"), "計算の活用");
assert.strictEqual(
  BadgeRegistry.get("kuku_master").condition.unit,
  "multiplication_g3",
  "The multiplication badge must use the merged grade-3 unit"
);

for (const [level, unitId] of [
  [1, "multiplication_g3"],
  [1, "add_sub_3digit"],
  [2, "multiplication_g3"],
  [2, "division_g3"],
  [3, "multiplication_g3"],
  [3, "division_g3"],
  [3, "calc_application_g3"]
]) {
  assert.ok(
    TemplateRegistry.getByUnit("math", 3, level, unitId).length > 0,
    `Grade 3 Lv${level} ${unitId} must have questions`
  );
}

const history = [
  { grade: 3, unitId: "kuku_all", questionInstanceId: "old-kuku" },
  { grade: 3, unitId: "div_with_remainder", questionInstanceId: "old-division" }
];
const state = {
  schemaVersion: "2.5.6",
  profiles: [{
    identity: { id: "p_g3_migration" },
    skill: {
      subject: {
        currentGrade: 3,
        gradeProgress: {
          grade3: {
            unitStats: {
              multiplication_g3: { attempts: 2, correct: 1, accuracy: 0.5, masteryScore: 0.5 },
              kuku_all: { attempts: 3, correct: 2, accuracy: 2 / 3, masteryScore: 0.7 },
              mul_2digit_1digit: { attempts: 5, correct: 4, accuracy: 0.8, masteryScore: 0.9 },
              div_no_remainder: { attempts: 4, correct: 3, accuracy: 0.75, masteryScore: 0.75 },
              div_with_remainder: { attempts: 2, correct: 1, accuracy: 0.5, masteryScore: 0.4 },
              mixed_mul_div_2step: { attempts: 1, correct: 1, accuracy: 1, masteryScore: 1 }
            },
            unitRotationBag: [
              "kuku_all", "multiplication_g3", "mul_2digit_1digit",
              "div_no_remainder", "div_with_remainder", "mixed_mul_div_2step"
            ]
          }
        }
      }
    },
    reviewQueue: [
      { reviewId: "rev-div-old", subjectId: "math", grade: 3, unitId: "div_no_remainder", status: "active", dueAt: "2026-10-10", failCount: 1, successCount: 1, intervalDays: 3 },
      { reviewId: "rev-div-rem", subjectId: "math", grade: 3, unitId: "div_with_remainder", status: "active", dueAt: "2026-10-08", failCount: 4, successCount: 0, intervalDays: 1 },
      { reviewId: "rev-mul-other-grade", subjectId: "math", grade: 2, unitId: "kuku_all", status: "active", dueAt: "2026-10-09", failCount: 1, successCount: 0, intervalDays: 1 }
    ],
    history
  }]
};

const migrated = migrateAppState(state);
const profile = migrated.profiles[0];
const stats = profile.skill.subject.gradeProgress.grade3.unitStats;
assert.deepStrictEqual(stats.multiplication_g3, {
  attempts: 10,
  correct: 7,
  accuracy: 0.7,
  masteryScore: 0.76
});
assert.strictEqual(stats.division_g3.attempts, 6);
assert.strictEqual(stats.division_g3.correct, 4);
assert.strictEqual(stats.calc_application_g3.attempts, 1);
for (const oldId of ["kuku_all", "mul_2digit_1digit", "div_no_remainder", "div_with_remainder", "mixed_mul_div_2step"]) {
  assert.ok(!Object.prototype.hasOwnProperty.call(stats, oldId), `${oldId} stats must be migrated`);
}
assert.deepStrictEqual(profile.skill.subject.gradeProgress.grade3.unitRotationBag, [
  "multiplication_g3", "division_g3", "calc_application_g3"
]);
const divisionReviews = profile.reviewQueue.filter(item => item.grade === 3 && item.unitId === "division_g3");
assert.strictEqual(divisionReviews.length, 1);
assert.strictEqual(divisionReviews[0].dueAt, "2026-10-08");
assert.strictEqual(divisionReviews[0].failCount, 4);
assert.ok(profile.reviewQueue.some(item =>
  item.reviewId === "rev-mul-other-grade" && item.unitId === "kuku_all"
), "Other-grade records must remain untouched");
assert.deepStrictEqual(profile.history, history, "Historical questions must not be rewritten");
assert.deepStrictEqual(migrateAppState(migrated), migrated, "Migration must be idempotent");

console.log("[PASS] Grade-3 series IDs, levels, and templates are aligned");
console.log("[PASS] Progress, review queue, and rotation bag migrate without rewriting history");
console.log("[PASS] Legacy aliases and multiplication badge remain compatible");
