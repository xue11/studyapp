const assert = require("assert");
const { migrateAppState } = require("../js/migration.js");
const { BadgeRegistry, TemplateRegistry, UnitRegistry } = require("../js/registries.js");
const { RuleBasedQuestionSource } = require("../js/question_source.js");
const { QuestionValidator } = require("../js/validator.js");
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
assert.ok(grade3UnitsByLevel[2].includes("add_sub_3digit"));
assert.ok(grade3UnitsByLevel[1].includes("calc_application_g3"));
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

const balancedTemplates = [
  ["g3_basic_sub3_no_borrow_02", 1, "add_sub_3digit"],
  ["g3_word_sub3_no_borrow_01", 1, "add_sub_3digit"],
  ["g3_std_add3_carry_01", 2, "add_sub_3digit"],
  ["g3_std_sub3_borrow_01", 2, "add_sub_3digit"],
  ["g3_word_addsub3_choose_01", 2, "add_sub_3digit"],
  ["g3_adv_addsub3_missing_01", 3, "add_sub_3digit"],
  ["g3_adv_addsub3_two_step_01", 3, "add_sub_3digit"],
  ["g3_adv_addsub3_compare_02", 3, "add_sub_3digit"],
  ["g3_basic_kuku_missing_factor_02", 1, "multiplication_g3"],
  ["g3_basic_kuku_story_03", 1, "multiplication_g3"],
  ["g3_basic_kuku_fact_family_04", 1, "multiplication_g3"],
  ["g3_std_mul21_no_carry_02", 2, "multiplication_g3"],
  ["g3_std_mul21_carry_02", 2, "multiplication_g3"],
  ["g3_word_mul21_01", 2, "multiplication_g3"],
  ["g3_adv_mul21_missing_01", 3, "multiplication_g3"],
  ["g3_adv_mul21_story_02", 3, "multiplication_g3"],
  ["g3_adv_mul21_pattern_03", 3, "multiplication_g3"],
  ["g3_std_div_share_04", 2, "division_g3"],
  ["g3_std_div_grouping_05", 2, "division_g3"],
  ["g3_adv_div_remainder_02", 3, "division_g3"],
  ["g3_adv_div_check_03", 3, "division_g3"],
  ["g3_std_calc_choose_operation_01", 2, "calc_application_g3"],
  ["g3_std_calc_division_story_02", 2, "calc_application_g3"],
  ["g3_std_calc_expression_03", 2, "calc_application_g3"],
  ["g3_adv_calc_two_step_story_02", 3, "calc_application_g3"],
  ["g3_adv_calc_two_step_compare_03", 3, "calc_application_g3"],
  ["g3_std_length_m_to_cm_02", 2, "length_unit"],
  ["g3_std_length_km_to_m_03", 2, "length_unit"],
  ["g3_std_weight_kg_to_g_02", 2, "weight_unit"],
  ["g3_std_weight_compare_03", 2, "weight_unit"]
];
for (const [id, level, unitId] of balancedTemplates) {
  assert.strictEqual(TemplateRegistry.get(id).unitId, unitId, `${id} canonical unit`);
  assert.strictEqual(TemplateRegistry.get(id).difficultyLevel, level, `${id} level`);
  for (let i = 0; i < 20; i++) {
    const question = RuleBasedQuestionSource.generateQuestion(id, []);
    const validation = QuestionValidator.validate(question, []);
    assert.ok(validation.valid, `${id}: ${JSON.stringify(validation.errors).slice(0, 250)}`);
    assert.ok(Number.isInteger(Number(question.answer)), `${id} answer must be an integer`);
    assert.ok(question.hintSteps.length >= 2, `${id} needs two hints`);
    assert.ok(question.explanation.length > 0, `${id} needs explanation`);
    const v = question.variables;
    if (id === "g3_basic_sub3_no_borrow_02" || id === "g3_word_sub3_no_borrow_01") {
      assert.ok(v.a % 10 >= v.b % 10);
      assert.ok(Math.floor(v.a / 10) % 10 >= Math.floor(v.b / 10) % 10);
    } else if (id === "g3_std_add3_carry_01") {
      assert.ok(v.a % 10 + v.b % 10 >= 10);
    } else if (id === "g3_std_sub3_borrow_01") {
      assert.ok(v.a % 10 < v.b % 10);
    } else if (id === "g3_std_mul21_no_carry_02") {
      assert.ok(v.ones * v.b < 10);
    } else if (id === "g3_std_mul21_carry_02") {
      assert.ok(v.ones * v.b >= 10);
    } else if (id === "g3_adv_div_remainder_02") {
      assert.strictEqual(v.total, v.each * v.fullBags + v.remainder);
      assert.ok(v.remainder > 0 && v.remainder < v.each);
      assert.strictEqual(Number(question.answer), Math.ceil(v.total / v.each));
    }
  }
}
assert.ok(TemplateRegistry.getByUnit("math", 3, 1, "add_sub_3digit").length >= 5);
assert.ok(TemplateRegistry.getByUnit("math", 3, 2, "add_sub_3digit").length >= 3);
assert.ok(TemplateRegistry.getByUnit("math", 3, 3, "add_sub_3digit").length >= 3);
for (const level of [1, 2, 3]) {
  assert.ok(TemplateRegistry.getByUnit("math", 3, level, "multiplication_g3").length >= 4);
}
assert.ok(TemplateRegistry.getByUnit("math", 3, 2, "calc_application_g3").length >= 3);
assert.ok(TemplateRegistry.getByUnit("math", 3, 3, "calc_application_g3").length >= 3);
assert.ok(TemplateRegistry.getByUnit("math", 3, 2, "division_g3").length >= 6);
assert.ok(TemplateRegistry.getByUnit("math", 3, 3, "division_g3").length >= 5);
assert.ok(TemplateRegistry.getByUnit("math", 3, 2, "length_unit").length >= 3);
assert.ok(TemplateRegistry.getByUnit("math", 3, 2, "weight_unit").length >= 3);

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
console.log(`[PASS] ${balancedTemplates.length} grade-3 templates generated and validated x20`);
console.log("[PASS] Progress, review queue, and rotation bag migrate without rewriting history");
console.log("[PASS] Legacy aliases and multiplication badge remain compatible");
