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
  console.log(`  [PASS] New units injected into legacy bag within 1 rotation (units=${units.length})`);
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
testKukuSubTopics();
testExistingUnitStrengthening();
testRotationBagSync();
testRisuCoverageMap();

console.log("\n=== All Grade 2 Extra Units Tests Passed ===");
