const assert = require("assert");
const { TemplateRegistry, UnitRegistry } = require("../js/registries.js");
require("../js/templates_figures_g1.js");
require("../js/templates_figures_g2.js");
require("../js/templates_g2_extra.js");
const { RuleBasedQuestionSource } = require("../js/question_source.js");
const { QuestionValidator } = require("../js/validator.js");
const { createNewProfile } = require("../js/schema.js");
const { migrateAppState } = require("../js/migration.js");
const { UnitSelector } = require("../js/unit_selector.js");
const { TestEngine } = require("../js/test_engine.js");

console.log("=== V2.6.4 figure toggle + G2 tests ===");

// 1. schema default ON
{
  const p = createNewProfile("t_fig", "A", 1);
  assert.strictEqual(p.settings.figureEnabled, true, "new profile default ON");
  console.log("  [PASS] schema default figureEnabled=true");
}

// 2. migration补完 ON
{
  const old = {
    schemaVersion: "2.5.6",
    profiles: [{
      identity: { id: "o1", name: "B" },
      skill: { subject: { currentGrade: 1, gradeProgress: { grade1: { difficultyLevel: 1, learningStartDate: null, unitStats: {}, unitRotationBag: [] } } } },
      streaks: {}, history: [], reviewQueue: [], tests: [], badges: [],
      settings: { sound: true }
    }],
    activeProfileId: "o1", appMeta: {}
  };
  const m = migrateAppState(old);
  assert.strictEqual(m.profiles[0].settings.figureEnabled, true, "migrated default ON");
  console.log("  [PASS] migration补完 figureEnabled=true");
}

// 3. UnitSelector OFF excludes shape_*
{
  const p = createNewProfile("t_off", "A", 1);
  p.settings.figureEnabled = false;
  const avail = UnitSelector._filterFigureUnits(UnitRegistry.getUnitsForLevel("math", 1, 1), p);
  assert.ok(!avail.some(u => u.id.indexOf("shape_") === 0), "OFF excludes shape_*");
  assert.ok(avail.length >= 3, "calc units remain");
  // 10回選んでも図形が出ない
  for (let i = 0; i < 10; i++) {
    const r = UnitSelector.selectNextUnit(p, null, "2026-01-01");
    assert.ok(r.unitId.indexOf("shape_") !== 0, "OFF selectNextUnit never shape_*");
  }
  // ONなら出る可能性がある
  const pon = createNewProfile("t_on", "A", 1);
  const availOn = UnitSelector._filterFigureUnits(UnitRegistry.getUnitsForLevel("math", 1, 1), pon);
  assert.ok(availOn.some(u => u.id === "shape_basic"), "ON keeps shape_basic");
  console.log("  [PASS] UnitSelector OFF/ON filter");
}

// 3b. Mixed geometry unit keeps non-figure box questions when figures are OFF
{
  const p = createNewProfile("t_g2_off", "A", 2);
  p.settings.figureEnabled = false;
  const lv1 = UnitSelector._filterFigureUnits(
    UnitRegistry.getUnitsForLevel("math", 2, 1), p, "math", 2, 1
  );
  const lv2 = UnitSelector._filterFigureUnits(
    UnitRegistry.getUnitsForLevel("math", 2, 2), p, "math", 2, 2
  );
  assert.ok(lv1.some(u => u.id === "geometry_g2"), "Lv1 keeps mixed geometry unit for box questions");
  assert.ok(!lv2.some(u => u.id === "geometry_g2"), "Lv2 figure-only geometry unit is excluded");

  const boxPool = TemplateRegistry.getByUnit("math", 2, 1, "geometry_g2");
  assert.ok(boxPool.some(t => t.problemType !== "figure"), "Lv1 geometry includes non-figure box questions");
  console.log("  [PASS] mixed geometry unit retains non-figure questions when OFF");
}

// 4. 復習スキップ (figure OFF)
{
  const p = createNewProfile("t_rev", "A", 1);
  p.settings.figureEnabled = false;
  p.reviewQueue = [{ subjectId: "math", grade: 1, unitId: "shape_basic", status: "active", dueAt: "2026-01-01", failCount: 1, registeredAt: "2026-01-01" }];
  const r = UnitSelector.selectNextUnit(p, null, "2026-01-01");
  assert.ok(r.unitId.indexOf("shape_") !== 0, "figure review skipped when OFF");
  console.log("  [PASS] review skip when OFF");
}

// 5. G2 templates gen+validate
{
  // V2.8.0: 図形問題は 12件（Lv1:4 / Lv2 figure_tap:4 / Lv3 figure_display:4）
  for (const id of ["g2_tri_quad_identify", "g2_rect_square", "g2_shape_sides_pick", "g2_shape_vertices_pick"]) {
    const t = TemplateRegistry.get(id);
    assert.ok(t, id + " registered");
    assert.strictEqual(t.unitId, "geometry_g2", id + " unit");
    assert.strictEqual(t.grade, 2, id + " grade 2");
    for (let i = 0; i < 5; i++) {
      const q = RuleBasedQuestionSource.generateQuestion(id, []);
      assert.ok(Array.isArray(q.figureChoices) && q.figureChoices.length > 0, id + " has choices");
      const v = QuestionValidator.validate(q, []);
      assert.ok(v.valid, id + " valid: " + JSON.stringify(v.errors).slice(0, 200));
    }
  }
  // G2 unit registered at grade2 Lv1
  const units = UnitRegistry.getUnitsForLevel("math", 2, 1).map(u => u.id);
  assert.ok(units.includes("geometry_g2"), "shape_tri_quad in grade2 Lv1");
  console.log("  [PASS] G2 4 Lv1 templates gen+validate x5");
}

// 6. G2 helpers (right-angle mark, card, judgment)
{
  const G2 = globalThis.FigureShapeUI_G2;
  assert.ok(G2, "FigureShapeUI_G2 exists");
  const svg = G2.createFigureSVG2("quadrilateral", { size: 92, variant: "rectangle_wide", rotation: 0, rightAngle: true });
  assert.ok(svg.indexOf("<svg") >= 0 && svg.indexOf("<path") >= 0, "right-angle mark injected");
  const svgNo = G2.createFigureSVG2("circle", { size: 80 });
  assert.ok(svgNo.indexOf("<svg") >= 0 && svgNo.indexOf("<path") < 0, "no mark without flag");
  const card = G2.shapeCardHTML2({ id: "c1", figure: { type: "circle", params: { size: 80 } }, text: "まるい かたち" }, false);
  assert.ok(card.indexOf("shape-card") >= 0, "card html");
  assert.ok(G2.isSingleCorrect("c1", ["c1"]) && !G2.isSingleCorrect("c2", ["c1"]), "single judgment");
  assert.ok(G2.isMultiCorrect(["p2", "p1"], ["p1", "p2"]) && !G2.isMultiCorrect(["p1"], ["p1", "p2"]), "multi complete-match");
  // identify: target always present
  for (let i = 0; i < 6; i++) {
    const q = RuleBasedQuestionSource.generateQuestion("g2_tri_quad_identify", []);
    assert.ok(q.correctChoiceIds.length >= 1, "identify has correct");
    assert.strictEqual(q.figureChoices.length, 6, "identify 6 cards");
  }
  console.log("  [PASS] G2 helpers + identify coverage");
}
// 7. TestEngine OFF excludes figure
{
  const p = createNewProfile("t_test", "A", 1);
  p.settings.figureEnabled = false;
  const qs = TestEngine.generateTestQuestions(p, null);
  assert.strictEqual(qs.length, 10, "10 questions");
  assert.ok(!qs.some(q => q.unitId && q.unitId.indexOf("shape_") === 0), "no figure in test when OFF");
  console.log("  [PASS] TestEngine OFF excludes figure");
}

console.log("\nALL V2.6.4 TESTS PASSED!");
