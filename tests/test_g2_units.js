/**
 * Automated Tests: 2年生 追加単元テンプレート (V2.6.6)
 * RISUさんすうドリル 2年生 単元一覧との突合で追加した6単元 + 既存2単元の補強を検証する。
 * Run with: node tests/test_g2_units.js
 */

const assert = require("assert");
const { TemplateRegistry, UnitRegistry } = require("../js/registries.js");
const { QuestionValidator } = require("../js/validator.js");
const { RuleBasedQuestionSource } = require("../js/question_source.js");
require("../js/templates_units_p1.js");
require("../js/templates_units_p2.js");
require("../js/templates_g2_extra.js");

console.log("=== Running Grade 2 Extra Units Verification Tests ===\n");

// 追加した6単元 (level -> unitId)
const NEW_UNITS = {
  1: ["big_number_10000", "time_clock_basic", "fraction_intro", "box_shape"],
  2: ["calc_idea_basic", "estimation_basic"]
};

const BREADTH_TEMPLATES = [
  { id: "g2_word_add_carry_01", level: 2, unit: "add_2digit_carry" },
  { id: "g2_word_sub_borrow_01", level: 2, unit: "sub_2digit_borrow" },
  { id: "g2_basic_bignum_04", level: 1, unit: "big_number_10000" },
  { id: "g2_basic_length_03", level: 1, unit: "length_unit" },
  { id: "g2_basic_time_04", level: 1, unit: "time_clock_basic" },
  { id: "g2_basic_fraction_03", level: 1, unit: "fraction_intro" },
  { id: "g2_word_kuku_array_01", level: 2, unit: "kuku_intro" },
  { id: "g2_std_volume_compare_mixed_01", level: 2, unit: "volume_unit" },
  { id: "g2_basic_box_04", level: 1, unit: "box_shape" },
  { id: "g2_std_calcidea_03", level: 2, unit: "calc_idea_basic" }
];

const DEEPENING_TEMPLATES = [
  { id: "g2_std_inverse_add_sub_01", level: 2, unit: "add_sub_inverse" },
  { id: "g2_std_length_add_diff_01", level: 2, unit: "length_unit" },
  { id: "g2_std_volume_add_diff_01", level: 2, unit: "volume_unit" },
  { id: "g2_std_time_elapsed_hour_01", level: 2, unit: "time_clock_basic" },
  { id: "g2_std_fraction_compare_picture_01", level: 2, unit: "fraction_intro" },
  { id: "g2_adv_kuku_reverse_story_01", level: 3, unit: "kuku_partial" },
  { id: "g2_adv_3terms_make100_01", level: 3, unit: "add_3terms_2digit" },
  { id: "g2_adv_2step_story_02", level: 3, unit: "add_sub_2digit_2step" },
  { id: "g2_adv_rectangle_perimeter_01", level: 3, unit: "shape_figure_measure" }
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
          // V2.6.7: 時計問題 (clock_input) は時計図の確認へ分岐
          if (q.answerType === "clock_input") {
            assert.ok(q.clockHTML && q.clockHTML.indexOf("<svg") >= 0, `${t.templateId} must render clock SVG`);
            assert.ok(Array.isArray(q.clockFields) && q.clockFields.length >= 1, `${t.templateId} must have clockFields`);
            assert.ok(/^\d{1,2}(:\d{2}){0,2}$/.test(q.answer), `${t.templateId} clock answer format: ${q.answer}`);
          } else {
            assert.strictEqual(q.answerType, "number_input", `${t.templateId} must be number_input`);
            assert.ok(!isNaN(Number(q.answer)), `${t.templateId} answer must be numeric: ${q.answer}`);
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
      for (let facePair = 2; facePair <= 6; facePair += 2) {
        const randomValues = [(type - 0.5) / 3, ((facePair / 2) - 0.5) / 3];
        Math.random = () => randomValues.length > 0 ? randomValues.shift() : 0.1;
        const q = RuleBasedQuestionSource.generateQuestion("g2_basic_box_03", []);
        const pairs = 6 / facePair;
        assert.strictEqual(q.variables.type_idx, type);
        assert.strictEqual(q.variables.facePair, facePair);
        assert.strictEqual(q.variables.pairs, pairs);
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
  assert.strictEqual(TemplateRegistry.get("g2_std_kuku_bai_01").unitId, "kuku_intro", "何倍 must belong to kuku_intro");
  assert.strictEqual(TemplateRegistry.get("g2_adv_kuku_table_01").unitId, "kuku_partial", "九九の表 must belong to kuku_partial");
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
    unitRotationBag: ["add_2digit_no_carry", "sub_2digit_no_borrow", "length_unit", "shape_tri_quad"]
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
    unitRotationBag: ["add_2digit_carry", "sub_2digit_borrow", "kuku_intro", "volume_unit", "calc_idea_basic", "estimation_basic"]
  };
  const unitsLv2 = UnitRegistry.getUnitsForLevel("math", 2, 2);
  const seenLv2 = new Set();
  for (let i = 0; i < unitsLv2.length; i++) {
    seenLv2.add(UnitSelector._drawFromRotationBag(gpLv2, unitsLv2));
  }
  for (const unitId of ["add_sub_inverse", "length_unit", "time_clock_basic", "fraction_intro"]) {
    assert.ok(seenLv2.has(unitId), `New Lv2 unit '${unitId}' must appear within one rotation`);
  }
  console.log(`  [PASS] New units injected into legacy Lv1/Lv2 bags within 1 rotation (Lv1=${units.length}, Lv2=${unitsLv2.length})`);
}

// 5. RISU 2年生 単元一覧との突合サマリー (図形1単元 + 図形以外11単元)
function testRisuCoverageMap() {
  console.log("5. RISU grade-2 unit coverage summary...");
  const RISU_UNITS = [
    { risu: "かけ算 (九九)", units: ["kuku_intro", "kuku_partial"] },
    { risu: "かさ (mL・dL・L)", units: ["volume_unit"] },
    { risu: "はこの形", units: ["box_shape"] },
    { risu: "分数（2年）", units: ["fraction_intro"] },
    { risu: "図形 (表示品質は後回し)", units: ["shape_tri_quad"] },
    { risu: "大きな数（2年）", units: ["big_number_10000"] },
    { risu: "引き算の筆算", units: ["sub_2digit_no_borrow", "sub_2digit_borrow"] },
    { risu: "時刻と時間", units: ["time_clock_basic"] },
    { risu: "計算のくふう", units: ["calc_idea_basic"] },
    { risu: "計算の見積もり", units: ["estimation_basic"] },
    { risu: "足し算の筆算", units: ["add_2digit_no_carry", "add_2digit_carry"] },
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
testKukuSubTopics();
testExistingUnitStrengthening();
testRotationBagSync();
testRisuCoverageMap();

console.log("\n=== All Grade 2 Extra Units Tests Passed ===");
