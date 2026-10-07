/**
 * Automated Tests: 2年生 追加単元テンプレート (V2.6.6)
 * RISUさんすうドリル 2年生 単元一覧との突合で追加した6単元 + 既存2単元の補強を検証する。
 * Run with: node tests/test_g2_units.js
 */

const assert = require("assert");
const { TemplateRegistry, UnitRegistry } = require("../js/registries.js");
const { QuestionValidator } = require("../js/validator.js");
const { RuleBasedQuestionSource } = require("../js/question_source.js");
require("../js/templates_math.js");
require("../js/templates_units_p1.js");
require("../js/templates_units_p2.js");
require("../js/templates_g2_extra.js");
require("../js/templates_figures_g2.js");

console.log("=== Running Grade 2 Extra Units Verification Tests ===\n");

// 追加した6単元 (level -> unitId)
const NEW_UNITS = {
  1: ["big_number_10000", "time_clock_basic", "fraction_intro", "geometry_g2", "multiplication_g2"],
  2: ["addition_2digit", "subtraction_2digit", "calc_application"],
  3: ["calc_application", "multiplication_g2", "geometry_g2"]
};

const BREADTH_TEMPLATES = [
  { id: "g2_word_add_carry_01", level: 2, unit: "addition_2digit" },
  { id: "g2_word_sub_borrow_01", level: 2, unit: "subtraction_2digit" },
  { id: "g2_basic_bignum_04", level: 1, unit: "big_number_10000" },
  { id: "g2_basic_length_03", level: 1, unit: "length_unit" },
  { id: "g2_basic_time_04", level: 1, unit: "time_clock_basic" },
  { id: "g2_basic_fraction_03", level: 1, unit: "fraction_intro" },
  { id: "g2_word_kuku_array_01", level: 1, unit: "multiplication_g2" },
  { id: "g2_std_volume_compare_mixed_01", level: 2, unit: "volume_unit" },
  { id: "g2_basic_box_04", level: 1, unit: "geometry_g2" },
  { id: "g2_std_calcidea_03", level: 2, unit: "calc_application" }
];

const DEEPENING_TEMPLATES = [
  { id: "g2_std_inverse_add_sub_01", level: 2, unit: "calc_application" },
  { id: "g2_std_length_add_diff_01", level: 2, unit: "length_unit" },
  { id: "g2_std_volume_add_diff_01", level: 2, unit: "volume_unit" },
  { id: "g2_std_time_elapsed_hour_01", level: 2, unit: "time_clock_basic" },
  { id: "g2_std_fraction_compare_picture_01", level: 2, unit: "fraction_intro" },
  { id: "g2_adv_kuku_reverse_story_01", level: 3, unit: "multiplication_g2" },
  { id: "g2_adv_3terms_make100_01", level: 3, unit: "calc_application" },
  { id: "g2_adv_2step_story_02", level: 3, unit: "calc_application" },
  { id: "g2_adv_rectangle_perimeter_01", level: 3, unit: "geometry_g2" }
];

const BALANCE_TEMPLATES = [
  ["g2_basic_sub_no_borrow_02", 1, "subtraction_2digit"],
  ["g2_basic_sub_no_borrow_03", 1, "subtraction_2digit"],
  ["g2_word_sub_no_borrow_01", 1, "subtraction_2digit"],
  ["g2_basic_kuku_equal_groups_02", 1, "multiplication_g2"],
  ["g2_basic_kuku_repeated_add_03", 1, "multiplication_g2"],
  ["g2_basic_kuku_missing_group_04", 1, "multiplication_g2"],
  ["g2_std_length_convert_mm_02", 2, "length_unit"],
  ["g2_std_length_add_cm_03", 2, "length_unit"],
  ["g2_std_time_elapsed_minutes_02", 2, "time_clock_basic"],
  ["g2_std_time_duration_03", 2, "time_clock_basic"],
  ["g2_std_fraction_equal_parts_02", 2, "fraction_intro"],
  ["g2_std_fraction_compare_same_denominator_03", 2, "fraction_intro"],
  ["g2_word_add_carry_02", 2, "addition_2digit"],
  ["g2_std_add_carry_02", 2, "addition_2digit"],
  ["g2_word_sub_borrow_02", 2, "subtraction_2digit"],
  ["g2_std_geometry_edges_word_01", 2, "geometry_g2"],
  ["g2_std_geometry_shape_edges_02", 2, "geometry_g2"],
  ["g2_adv_geometry_box_faces_01", 3, "geometry_g2"],
  ["g2_adv_geometry_perimeter_text_02", 3, "geometry_g2"],
  ["g2_adv_geometry_square_perimeter_03", 3, "geometry_g2"]
];

// 1. UnitRegistry 登録確認
function testUnitsRegistered() {
  console.log("1. Testing UnitRegistry registration for new units...");
  for (const lv of Object.keys(NEW_UNITS)) {
    const ids = UnitRegistry.getUnitsForLevel("math", 2, parseInt(lv, 10)).map(u => u.id);
    for (const unitId of NEW_UNITS[lv]) {
      assert.ok(ids.includes(unitId), `Grade2 Lv${lv} must contain unit '${unitId}'`);
    }
  }
  console.log("  [PASS] 6 new grade-2 units registered (Lv1: 4, Lv2: 2)");
}

// 2. 各単元にテンプレートが存在すること
function testTemplatesExist() {
  console.log("2. Testing template existence per new unit...");
  for (const lv of Object.keys(NEW_UNITS)) {
    for (const unitId of NEW_UNITS[lv]) {
      const templates = TemplateRegistry.getByUnit("math", 2, parseInt(lv, 10), unitId);
      assert.ok(templates.length > 0, `Unit '${unitId}' must have at least one template`);
    }
  }
  console.log("  [PASS] All new units have registered templates");
}

// 3. 大量生成 + 完全検証
function testMassGeneration() {
  console.log("3. Testing mass generation & validation for new templates...");
  let total = 0;
  for (const lv of Object.keys(NEW_UNITS)) {
    for (const unitId of NEW_UNITS[lv]) {
      const templates = TemplateRegistry.getByUnit("math", 2, parseInt(lv, 10), unitId);
      for (const t of templates) {
        const prev = [];
        for (let i = 0; i < 10; i++) {
          const q = RuleBasedQuestionSource.generateQuestion(t.templateId, prev);
          total++;
          const v = QuestionValidator.validate(q, prev);
          assert.ok(v.valid, `${t.templateId} invalid: ${JSON.stringify(v.errors).slice(0, 300)}`);
          assert.ok(q.questionText.length > 3, `${t.templateId} questionText too short`);
          assert.ok(q.answer !== "" && q.answer !== "undefined", `${t.templateId} answer empty`);
          assert.ok(q.hintSteps.length >= 2, `${t.templateId} needs >= 2 hint steps`);
          assert.ok(q.explanation.length > 3, `${t.templateId} explanation too short`);
          if (q.answerType === "figure_tap") {
            assert.ok(Array.isArray(q.figureParts) && q.figureParts.length > 0, `${t.templateId} must render tappable figure parts`);
          } else if (q.answerType === "figure_display") {
            assert.ok(q.figureHTML && q.figureHTML.includes("<svg"), `${t.templateId} must render figure SVG`);
          } else if (q.answerType === "clock_input") {
            assert.ok(q.clockHTML && q.clockHTML.indexOf("<svg") >= 0, `${t.templateId} must render clock SVG`);
            assert.ok(Array.isArray(q.clockFields) && q.clockFields.length >= 1, `${t.templateId} must have clockFields`);
            assert.ok(/^\d{1,2}(:\d{2}){0,2}$/.test(q.answer), `${t.templateId} clock answer format: ${q.answer}`);
          } else if (q.answerType === "number_input") {
            assert.ok(!isNaN(Number(q.answer)), `${t.templateId} answer must be numeric: ${q.answer}`);
          } else {
            assert.ok(["choice", "multi_choice", "single_choice"].includes(q.answerType),
              `${t.templateId} has supported answer type: ${q.answerType}`);
          }
          if (q.understandingCheck && q.understandingCheck.enabled) {
            const uc = q.understandingCheck;
            assert.strictEqual(new Set(uc.choices).size, 3, `${t.templateId} must have 3 unique choices`);
            assert.ok(uc.choices.includes(uc.answer), `${t.templateId} choices must include answer`);
          }
          prev.push(q);
        }
      }
    }
  }
  console.log(`  [PASS] Generated & validated ${total} questions (100% pass)`);
}

function testBoxNetFaceCounts() {
  console.log("3.5 Testing box-net questions use valid face counts...");
  const originalRandom = Math.random;
  try {
    for (let type = 1; type <= 3; type++) {
      for (const facePair of [2, 6]) {
        const facePairIndex = facePair === 2 ? 0 : 1;
        const randomValues = [(type - 0.5) / 3, (facePairIndex + 0.5) / 2];
        Math.random = () => randomValues.length > 0 ? randomValues.shift() : 0.1;
        const q = RuleBasedQuestionSource.generateQuestion("g2_basic_box_03", []);
        const pairs = 6 / facePair;
        assert.strictEqual(q.variables.type_idx, type);
        assert.strictEqual(q.variables.facePair, facePair);
        assert.strictEqual(q.variables.pairs, pairs);
        assert.ok(Number.isInteger(pairs), "A face-type count must be an integer");
        assert.strictEqual(q.variables.facePair * q.variables.pairs, 6, "A cuboid must have six faces");
        assert.strictEqual(q.answer, String(type === 3 ? pairs : 6));
        if (type === 2) {
          assert.ok(q.questionText.includes(`${facePair}まい ずつ ${pairs}しゅるい`), q.questionText);
        } else if (type === 3) {
          assert.ok(q.questionText.includes("6まい"), q.questionText);
          assert.ok(q.questionText.includes(`${facePair}まい ずつ`), q.questionText);
        }
        assert.ok(QuestionValidator.validate(q, []).valid, "Generated question must pass validation");
      }
    }
  } finally {
    Math.random = originalRandom;
  }
  console.log("  [PASS] All box-net variants describe six faces and have correct answers");
}

function testBreadthTemplates() {
  console.log("3.6 Testing the 10 new grade-2 breadth templates...");
  const validNets = new Set(["　□<br>□□□<br>　□<br>　□", "　□<br>　□<br>□□□<br>　□"]);
  for (const spec of BREADTH_TEMPLATES) {
    const template = TemplateRegistry.get(spec.id);
    assert.ok(template, `${spec.id} must be registered`);
    assert.strictEqual(template.grade, 2, `${spec.id} must target grade 2`);
    assert.strictEqual(template.difficultyLevel, spec.level, `${spec.id} difficulty`);
    assert.strictEqual(template.unitId, spec.unit, `${spec.id} unit`);

    for (let i = 0; i < 20; i++) {
      const q = RuleBasedQuestionSource.generateQuestion(spec.id, []);
      assert.ok(QuestionValidator.validate(q, []).valid, `${spec.id} must pass validation`);
      assert.strictEqual(q.answerType, "number_input", `${spec.id} must use numeric input`);
      assert.ok(Number.isInteger(Number(q.answer)), `${spec.id} answer must be an integer`);

      const v = q.variables;
      if (spec.id === "g2_word_add_carry_01") {
        assert.ok((v.a % 10) + (v.b % 10) >= 10, "Addition word problem must carry");
        assert.strictEqual(Number(q.answer), v.a + v.b);
      } else if (spec.id === "g2_word_sub_borrow_01") {
        assert.ok(v.b < v.a && (v.a % 10) < (v.b % 10), "Subtraction word problem must borrow");
        assert.strictEqual(Number(q.answer), v.a - v.b);
      } else if (spec.id === "g2_basic_bignum_04") {
        assert.strictEqual(v.left + 100, Number(q.answer));
        assert.strictEqual(v.right - 100, Number(q.answer));
      } else if (spec.id === "g2_basic_length_03") {
        assert.strictEqual(Number(q.answer), (v.a + v.c) * 10 + v.b + v.d);
      } else if (spec.id === "g2_basic_time_04") {
        assert.ok(v.endM < v.m, "Elapsed-time question must cross the hour");
        assert.strictEqual(Number(q.answer), 60 - v.m + v.endM);
      } else if (spec.id === "g2_basic_fraction_03") {
        assert.ok(v.shaded < v.d, "Shaded fraction must be less than one whole");
        assert.strictEqual((v.picture.match(/■/g) || []).length, v.shaded);
        assert.strictEqual((v.picture.match(/□/g) || []).length, v.d - v.shaded);
        assert.strictEqual(Number(q.answer), v.shaded);
      } else if (spec.id === "g2_word_kuku_array_01") {
        assert.strictEqual((v.picture.match(/●/g) || []).length, Number(q.answer));
        assert.strictEqual(Number(q.answer), v.groups * v.perGroup);
      } else if (spec.id === "g2_std_volume_compare_mixed_01") {
        assert.notStrictEqual(v.left, v.right);
        assert.strictEqual(Number(q.answer), Math.max(v.left, v.right));
      } else if (spec.id === "g2_basic_box_04") {
        const nets = [v.net1, v.net2, v.net3];
        assert.strictEqual(new Set(nets).size, 3, "Net choices must be distinct");
        assert.strictEqual(nets.filter(net => validNets.has(net)).length, 1, "Exactly one net must fold into a box");
        assert.ok(validNets.has(nets[Number(q.answer) - 1]), "Correct net number must match answer");
        const diagrams = q.figureHTML.match(/<svg\b[\s\S]*?<\/svg>/g) || [];
        assert.strictEqual(diagrams.length, 3, "Three net diagrams must be rendered");
        assert.ok(diagrams.every(svg => (svg.match(/<rect\b/g) || []).length === 6),
          "Each diagram must show all six faces");
        assert.ok(diagrams.every(svg => (svg.match(/stroke-dasharray=/g) || []).length > 0),
          "Shared edges must be marked as fold lines");
        assert.ok(q.figureHTML.includes("box-net-fold-hint"), "Folding cue must be shown");
        assert.ok(!q.questionText.includes("{net"), "Question text must not show raw net placeholders");
      } else if (spec.id === "g2_std_calcidea_03") {
        assert.strictEqual(v.a % 10 + v.c, 10, "The selected addends must make a ten");
        assert.strictEqual(Number(q.answer), v.a + v.b + v.c);
      }
    }
  }
  console.log("  [PASS] 10 templates × 20 generated questions meet content and answer checks");
}

function testDeepeningTemplates() {
  console.log("3.7 Testing grade-2 deepening templates across Lv2 and Lv3...");
  for (const spec of DEEPENING_TEMPLATES) {
    const template = TemplateRegistry.get(spec.id);
    assert.ok(template, `${spec.id} must be registered`);
    assert.strictEqual(template.grade, 2, `${spec.id} must target grade 2`);
    assert.strictEqual(template.difficultyLevel, spec.level, `${spec.id} difficulty`);
    assert.strictEqual(template.unitId, spec.unit, `${spec.id} unit`);
    const registeredUnits = UnitRegistry.getUnitsForLevel("math", 2, spec.level).map(unit => unit.id);
    assert.ok(registeredUnits.includes(spec.unit), `${spec.id} unit must be selectable at Lv${spec.level}`);

    for (let i = 0; i < 20; i++) {
      const q = RuleBasedQuestionSource.generateQuestion(spec.id, []);
      assert.ok(QuestionValidator.validate(q, []).valid, `${spec.id} must pass validation`);
      assert.ok(Number.isInteger(Number(q.answer)), `${spec.id} answer must be an integer`);
      const v = q.variables;

      if (spec.id === "g2_std_inverse_add_sub_01") {
        assert.strictEqual(Number(q.answer), v.b);
        if (v.type_idx === 1) {
          assert.ok((v.a % 10) + (v.b % 10) >= 10);
          assert.strictEqual(v.a + v.b, v.total);
        } else {
          assert.ok(v.b < v.a && (v.a % 10) < (v.b % 10));
          assert.strictEqual(v.a - v.b, v.remaining);
        }
      } else if (spec.id === "g2_std_length_add_diff_01" || spec.id === "g2_std_volume_add_diff_01") {
        const expected = v.operation === 1 ? v.left + v.right : Math.abs(v.left - v.right);
        assert.strictEqual(Number(q.answer), expected);
        assert.notStrictEqual(v.left, v.right);
      } else if (spec.id === "g2_std_time_elapsed_hour_01") {
        assert.ok(v.endH > v.startH, "Elapsed-time problem must cross at least one hour");
        assert.strictEqual((v.endH - v.startH) * 60 + v.endM - v.startM, Number(q.answer));
      } else if (spec.id === "g2_std_fraction_compare_picture_01") {
        assert.ok(v.numeratorA > 0 && v.numeratorA < v.denominator);
        assert.ok(v.numeratorB > 0 && v.numeratorB < v.denominator);
        assert.notStrictEqual(v.numeratorA, v.numeratorB);
        assert.strictEqual((v.pictureA.match(/■/g) || []).length, v.numeratorA);
        assert.strictEqual((v.pictureB.match(/■/g) || []).length, v.numeratorB);
        assert.strictEqual((v.pictureA.match(/■|□/g) || []).length, v.denominator);
        assert.strictEqual((v.pictureB.match(/■|□/g) || []).length, v.denominator);
        assert.strictEqual(Number(q.answer), Math.max(v.numeratorA, v.numeratorB));
      } else if (spec.id === "g2_adv_kuku_reverse_story_01") {
        assert.strictEqual(v.groups * v.perGroup, v.total);
        assert.strictEqual(Number(q.answer), v.groups);
      } else if (spec.id === "g2_adv_3terms_make100_01") {
        assert.strictEqual(v.a + v.c, 100);
        assert.strictEqual(Number(q.answer), v.a + v.b + v.c);
      } else if (spec.id === "g2_adv_2step_story_02") {
        assert.strictEqual(v.start + v.gained - v.used, v.final);
        assert.strictEqual(Number(q.answer), v.type_idx === 1 ? v.final : v.start);
        if (v.type_idx === 2) assert.strictEqual(v.final + v.used - v.gained, v.start);
      } else if (spec.id === "g2_adv_rectangle_perimeter_01") {
        assert.ok(q.figureHTML && q.figureHTML.includes("<svg"), "Rectangle must render as SVG");
        assert.strictEqual(Number(q.answer), 2 * (v.width + v.height));
      }
    }
  }
  console.log("  [PASS] All deepening patterns generated x20 with valid units, displays, and answers");
}

function testBalancedTemplates() {
  console.log("3.8 Testing grade-2 breadth additions across all target units...");
  for (const [id, level, unitId] of BALANCE_TEMPLATES) {
    const template = TemplateRegistry.get(id);
    assert.ok(template, `${id} must be registered`);
    assert.strictEqual(template.grade, 2, `${id} grade`);
    assert.strictEqual(template.difficultyLevel, level, `${id} level`);
    assert.strictEqual(template.unitId, unitId, `${id} unit`);
    assert.ok(UnitRegistry.getUnitsForLevel("math", 2, level).some(unit => unit.id === unitId),
      `${id} unit must be selectable at Lv${level}`);
    for (let i = 0; i < 20; i++) {
      const question = RuleBasedQuestionSource.generateQuestion(id, []);
      assert.ok(QuestionValidator.validate(question, []).valid,
        `${id} invalid: ${JSON.stringify(QuestionValidator.validate(question, []).errors).slice(0, 250)}`);
      assert.ok(Number.isInteger(Number(question.answer)), `${id} answer must be an integer`);
      assert.ok(question.hintSteps.length >= 2, `${id} needs two hint steps`);
      assert.ok(question.explanation.length > 0, `${id} needs an explanation`);
      const variables = question.variables;
      if (id.startsWith("g2_basic_sub_no_borrow_") || id === "g2_word_sub_no_borrow_01") {
        assert.ok(variables.a % 10 >= variables.b % 10, `${id} must not require borrowing in ones`);
      } else if (id === "g2_word_add_carry_02" || id === "g2_std_add_carry_02") {
        assert.ok(variables.a % 10 + variables.b % 10 >= 10, `${id} must require carrying`);
      } else if (id === "g2_std_time_elapsed_minutes_02") {
        assert.ok(variables.endHour > variables.hour, `${id} must cross an hour`);
        assert.strictEqual(Number(question.answer), variables.duration);
      } else if (id === "g2_std_fraction_compare_same_denominator_03") {
        assert.ok(variables.b > variables.a && variables.b < variables.denominator);
        assert.strictEqual(Number(question.answer), variables.b);
      }
    }
  }
  assert.ok(TemplateRegistry.getByUnit("math", 2, 1, "subtraction_2digit").length >= 4);
  assert.ok(TemplateRegistry.getByUnit("math", 2, 1, "multiplication_g2").length >= 4);
  for (const unitId of ["length_unit", "time_clock_basic", "fraction_intro"]) {
    assert.ok(TemplateRegistry.getByUnit("math", 2, 2, unitId).length >= 3, `${unitId} Lv2 must have at least 3 types`);
  }
  assert.ok(TemplateRegistry.getByUnit("math", 2, 2, "geometry_g2").some(t => t.problemType !== "figure"),
    "Figure-disabled learners need text-based Lv2 geometry questions");
  assert.ok(TemplateRegistry.getByUnit("math", 2, 3, "geometry_g2").some(t => t.problemType !== "figure"),
    "Figure-disabled learners need text-based Lv3 geometry questions");
  console.log(`  [PASS] ${BALANCE_TEMPLATES.length} new grade-2 templates generated and validated x20`);
}

// 4.5 かけ算単元の追加サブトピック (何倍・九九の表ときまり)
function testKukuSubTopics() {
  console.log("4.5 Testing kuku sub-topic templates (何倍 / 九九の表ときまり)...");
  const ids = ["g2_std_kuku_bai_01", "g2_adv_kuku_table_01"];
  for (const id of ids) {
    const t = TemplateRegistry.get(id);
    assert.ok(t, `${id} must be registered`);
    const prev = [];
    for (let i = 0; i < 10; i++) {
      const q = RuleBasedQuestionSource.generateQuestion(id, prev);
      const v = QuestionValidator.validate(q, prev);
      assert.ok(v.valid, `${id} invalid: ${JSON.stringify(v.errors).slice(0, 300)}`);
      assert.strictEqual(new Set(q.understandingCheck.choices).size, 3, `${id} needs 3 unique choices`);
      prev.push(q);
    }
  }
  assert.strictEqual(TemplateRegistry.get("g2_std_kuku_bai_01").unitId, "multiplication_g2", "何倍 must belong to kuku_intro");
  assert.strictEqual(TemplateRegistry.get("g2_adv_kuku_table_01").unitId, "multiplication_g2", "九九の表 must belong to kuku_partial");
  console.log("  [PASS] kuku sub-topics (何倍 / 九九の表) generated & validated x10");
}

// 4.6 既存単元の補強 (長さ m・cm / かさ 大小比較)
function testExistingUnitStrengthening() {
  console.log("4.6 Testing strengthened templates for existing units (m・cm / かさの大小比較)...");
  const ids = ["g2_basic_length_02", "g2_std_volume_02"];
  for (const id of ids) {
    const t = TemplateRegistry.get(id);
    assert.ok(t, `${id} must be registered`);
    const prev = [];
    for (let i = 0; i < 10; i++) {
      const q = RuleBasedQuestionSource.generateQuestion(id, prev);
      const v = QuestionValidator.validate(q, prev);
      assert.ok(v.valid, `${id} invalid: ${JSON.stringify(v.errors).slice(0, 300)}`);
      assert.strictEqual(q.answerType, "number_input", `${id} must be number_input`);
      assert.ok(!isNaN(Number(q.answer)), `${id} answer must be numeric: ${q.answer}`);
      if (q.understandingCheck && q.understandingCheck.enabled) {
        assert.strictEqual(new Set(q.understandingCheck.choices).size, 3, `${id} needs 3 unique choices`);
      }
      prev.push(q);
    }
  }
  assert.ok(TemplateRegistry.getByUnit("math", 2, 1, "length_unit").length >= 2, "length_unit must cover cm/mm and m/cm");
  assert.ok(TemplateRegistry.getByUnit("math", 2, 2, "volume_unit").length >= 2, "volume_unit must cover conversion and comparison");
  console.log("  [PASS] strengthened templates (m・cm / かさの大小比較) generated & validated x10");
}

// 4. 単元選択の回転バッグに新単元が注入されること
function testRotationBagSync() {
  console.log("4. Testing unit rotation bag sync with new units...");
  const { UnitSelector } = require("../js/unit_selector.js");
  const gp = {
    difficultyLevel: 1,
    unitStats: {},
    // V2.6.5 以前の永続化済み bag (新単元が含まれない)
    unitRotationBag: ["addition_2digit", "subtraction_2digit", "length_unit", "geometry_g2"]
  };
  const units = UnitRegistry.getUnitsForLevel("math", 2, 1);
  const seen = new Set();
  for (let i = 0; i < units.length; i++) {
    seen.add(UnitSelector._drawFromRotationBag(gp, units));
  }
  for (const unitId of NEW_UNITS[1]) {
    assert.ok(seen.has(unitId), `New unit '${unitId}' must appear within one rotation`);
  }
  const gpLv2 = {
    difficultyLevel: 2,
    unitStats: {},
    unitRotationBag: ["addition_2digit", "subtraction_2digit", "multiplication_g2", "volume_unit", "calc_application"]
  };
  const unitsLv2 = UnitRegistry.getUnitsForLevel("math", 2, 2);
  const seenLv2 = new Set();
  for (let i = 0; i < unitsLv2.length; i++) {
    seenLv2.add(UnitSelector._drawFromRotationBag(gpLv2, unitsLv2));
  }
  for (const unitId of ["calc_application", "length_unit", "time_clock_basic", "fraction_intro"]) {
    assert.ok(seenLv2.has(unitId), `New Lv2 unit '${unitId}' must appear within one rotation`);
  }
  console.log(`  [PASS] New units injected into legacy Lv1/Lv2 bags within 1 rotation (Lv1=${units.length}, Lv2=${unitsLv2.length})`);
}

// 5. RISU 2年生 単元一覧との突合サマリー (図形1単元 + 図形以外11単元)
function testRisuCoverageMap() {
  console.log("5. RISU grade-2 unit coverage summary...");
  const RISU_UNITS = [
    { risu: "かけ算 (九九)", units: ["multiplication_g2", "multiplication_g2"] },
    { risu: "かさ (mL・dL・L)", units: ["volume_unit"] },
    { risu: "はこの形", units: ["geometry_g2"] },
    { risu: "分数（2年）", units: ["fraction_intro"] },
    { risu: "図形 (表示品質は後回し)", units: ["geometry_g2"] },
    { risu: "大きな数（2年）", units: ["big_number_10000"] },
    { risu: "引き算の筆算", units: ["subtraction_2digit", "subtraction_2digit"] },
    { risu: "時刻と時間", units: ["time_clock_basic"] },
    { risu: "計算のくふう", units: ["calc_application"] },
    { risu: "計算の見積もり", units: ["calc_application"] },
    { risu: "足し算の筆算", units: ["addition_2digit", "addition_2digit"] },
    { risu: "長さ (mm・cm・m)", units: ["length_unit"] }
  ];
  let missing = 0;
  console.log("  --- RISU 2年生 単元カバレッジ ---");
  for (const row of RISU_UNITS) {
    const found = [];
    const notFound = [];
    for (const uid of row.units) {
      const t = TemplateRegistry.getByUnit("math", 2, 1, uid)
        .concat(TemplateRegistry.getByUnit("math", 2, 2, uid))
        .concat(TemplateRegistry.getByUnit("math", 2, 3, uid));
      if (t.length > 0) found.push(uid + "(" + t.length + "問型)");
      else notFound.push(uid);
    }
    if (notFound.length > 0) missing++;
    console.log("  " + (notFound.length === 0 ? "OK  " : "MISS") + " " + row.risu + " -> " + (found.join(", ") || "(none)"));
  }
  assert.strictEqual(missing, 0, "RISU 2年生の全単元に出題テンプレートが存在すること");
  console.log("  [PASS] RISU 2年生 全12単元に出題テンプレートあり (図形含む)");
}

testUnitsRegistered();
testTemplatesExist();
testMassGeneration();
testBoxNetFaceCounts();
testBreadthTemplates();
testDeepeningTemplates();
testBalancedTemplates();
testKukuSubTopics();
testExistingUnitStrengthening();
testRotationBagSync();
testRisuCoverageMap();

console.log("\n=== All Grade 2 Extra Units Tests Passed ===");
