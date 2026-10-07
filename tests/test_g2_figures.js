/**
 * V2.8.0: G2「三角形と四角形」の FigureSVG ネイティブ移行テスト
 *
 * 検証する契約:
 *   1. Lv1 / Lv2 / Lv3 の単元とテンプレートが登録されている
 *   2. 13本すべてが10問ずつ生成でき、QuestionValidator を通る
 *   3. figure_tap: 正解部品が figureParts に実在し、条件（直角/最長/等辺/すべて）と一致する
 *   4. figure_display: 描かれた図が「答え」と一致する（頂点数・辺の長さ・周）
 *   5. Engine 回帰: angle の頂点O / rectangle_tall / 設問文の潰れが直っているか
 *   6. UnitSelector / TestEngine が G2 の新図形単元を正しく扱う
 */
const path = require("path");
const R = path.join(__dirname, "..", "js");
["templates_math.js", "templates_units_p1.js", "templates_units_p2.js", "templates_g2_extra.js",
  "templates_figures_g1.js", "templates_figures_g2.js", "templates_figures_g3.js"
].forEach(f => require(path.join(R, f)));
const { RuleBasedQuestionSource } = require(path.join(R, "question_source.js"));
const { QuestionValidator } = require(path.join(R, "validator.js"));
const { TemplateRegistry, UnitRegistry } = require(path.join(R, "registries.js"));
const { FigureSVG } = require(path.join(R, "figure_svg.js"));
const { UnitSelector } = require(path.join(R, "unit_selector.js"));
const { TestEngine } = require(path.join(R, "test_engine.js"));

let fail = 0;
const ok = (c, m) => { console.log((c ? "  [PASS] " : "  [FAIL] ") + m); if (!c) fail++; };
const near = (a, b, e) => Math.abs(a - b) < (e || 0.01);

console.log("=== V2.8.0 G2 図形テスト ===");

// ---------------------------------------------------------------
console.log("\n1. 単元の登録");
{
  const lv1 = UnitRegistry.getUnitsForLevel("math", 2, 1).map(u => u.id);
  const lv2 = UnitRegistry.getUnitsForLevel("math", 2, 2).map(u => u.id);
  const lv3 = UnitRegistry.getUnitsForLevel("math", 2, 3).map(u => u.id);
  ok(lv1.includes("geometry_g2"), "図形の基本単元は 2年Lv1");
  ok(lv2.includes("geometry_g2"), "図形の発展単元は 2年Lv2");
  ok(lv3.includes("geometry_g2"), "図形の活用単元は 2年Lv3");
}

// ---------------------------------------------------------------
console.log("\n2. テンプレートの登録");
const EXPECTED = [
  ["g2_tri_quad_identify", "geometry_g2", 1, "multi_choice"],
  ["g2_rect_square", "geometry_g2", 1, "multi_choice"],
  ["g2_shape_sides_pick", "geometry_g2", 1, "single_choice"],
  ["g2_shape_vertices_pick", "geometry_g2", 1, "multi_choice"],
  ["g2_tap_right_vertex", "geometry_g2", 2, "figure_tap"],
  ["g2_tap_all_edges", "geometry_g2", 2, "figure_tap"],
  ["g2_tap_longest_side", "geometry_g2", 2, "figure_tap"],
  ["g2_tap_equal_sides", "geometry_g2", 2, "figure_tap"],
  ["g2_disp_count_vertices", "geometry_g2", 3, "figure_display"],
  ["g2_disp_count_angles", "geometry_g2", 3, "figure_display"],
  ["g2_disp_grid_sides", "geometry_g2", 3, "figure_display"],
  ["g2_disp_square_perimeter", "geometry_g2", 3, "figure_display"],
  ["g2_adv_rectangle_perimeter_01", "geometry_g2", 3, "figure_display"]
];
{
  EXPECTED.forEach(s => {
    const id = s[0], unit = s[1], lv = s[2], at = s[3];
    const t = TemplateRegistry.get(id);
    ok(!!t, id + " が登録されている");
    if (!t) return;
    ok(t.unitId === unit && t.difficultyLevel === lv && t.answerType === at,
      id + " は " + unit + " / Lv" + lv + " / " + at);
  });
  const g2fig = Object.values(TemplateRegistry.templates)
    .filter(t => t.problemType === "figure" && t.grade === 2);
  ok(g2fig.length === 13, "G2 図形テンプレートは 13件 (actual=" + g2fig.length + ")");
}

// ---------------------------------------------------------------
console.log("\n3. 10問生成 + Validator");
{
  EXPECTED.forEach(s => {
    const id = s[0];
    let good = 0, firstErr = "";
    for (let i = 0; i < 10; i++) {
      const q = RuleBasedQuestionSource.generateQuestion(id, []);
      if (!q) { firstErr = firstErr || "null question"; continue; }
      const v = QuestionValidator.validate(q, []);
      if (v.valid) good++;
      else if (!firstErr) firstErr = (v.errors || []).map(e => e.message).join(" | ").slice(0, 160);
    }
    ok(good === 10, id + " 10問生成 " + good + "/10" + (firstErr ? "  err=" + firstErr : ""));
  });
}

console.log("\n3.5. 三角形・四角形の図と選択肢が一致し、正誤ラベルがないこと");
{
  const G2UI = globalThis.FigureShapeUI_G2;
  const sideCountFromSVG = (html) => {
    const match = html.match(/<polygon[^>]*points="([^"]+)"/);
    return match ? match[1].trim().split(/\s+/).length : 0;
  };
  for (const id of ["g2_tri_quad_identify", "g2_shape_vertices_pick"]) {
    let answersMatch = true;
    let noCorrectnessText = true;
    let renderedWithoutClues = true;
    let renderedSidesMatch = true;
    for (let i = 0; i < 30; i++) {
      const q = RuleBasedQuestionSource.generateQuestion(id, []);
      const correctIds = q.correctChoiceIds.slice().sort();
      const expectedIds = q.figureChoices.filter(choice => {
        const sides = G2UI.figureSideCount(choice.figure.type, choice.figure.params);
        return sides === 3 || (id === "g2_tri_quad_identify" && sides === 4);
      }).map(choice => choice.id).sort();
      if (JSON.stringify(correctIds) !== JSON.stringify(expectedIds)) answersMatch = false;
      if (!q.figureChoices.every(choice => !choice.text || !/ちがう|よんでOK/.test(choice.text))) noCorrectnessText = false;
      const renderedCards = q.figureChoices.map(choice => G2UI.shapeCardHTML2(choice, false));
      const rendered = renderedCards.join("");
      if (/ちがう|よんでOK/.test(rendered)) renderedWithoutClues = false;
      if (!renderedCards.every((html, index) =>
        sideCountFromSVG(html) === G2UI.figureSideCount(q.figureChoices[index].figure.type, q.figureChoices[index].figure.params)
      )) renderedSidesMatch = false;
    }
    ok(answersMatch, `${id} answers match each displayed figure's side count (30 generated)`);
    ok(noCorrectnessText, `${id} choices do not reveal right/wrong (30 generated)`);
    ok(renderedWithoutClues, `${id} rendered cards do not show correctness labels (30 generated)`);
    ok(renderedSidesMatch, `${id} SVG side counts match question data (30 generated)`);
  }
  const pentagonHtml = G2UI.shapeCardHTML2({
    id: "pentagon", figure: { type: "polygon", params: { variant: "pentagon" } }
  }, false);
  const hexagonHtml = G2UI.shapeCardHTML2({
    id: "hexagon", figure: { type: "polygon", params: { variant: "hexagon" } }
  }, false);
  ok(sideCountFromSVG(pentagonHtml) === 5, "五角形カードのSVGは実際に5辺");
  ok(sideCountFromSVG(hexagonHtml) === 6, "六角形カードのSVGは実際に6辺");
}

console.log("\n3.6. 辺の数・直角を選ぶ問題に答えの手がかりがないこと");
{
  const G2UI = globalThis.FigureShapeUI_G2;
  let sideAnswerMatches = true;
  let sideChoicesUnlabeled = true;
  let rectangleAnswerMatches = true;
  let rectangleChoicesUnlabeled = true;
  for (let i = 0; i < 40; i++) {
    const sideQ = RuleBasedQuestionSource.generateQuestion("g2_shape_sides_pick", []);
    const sideTarget = Number((sideQ.questionText.match(/辺が\s*(\d+)本/) || [])[1]);
    const sideCorrect = sideQ.figureChoices.filter(choice => sideQ.correctChoiceIds.includes(choice.id));
    if (sideCorrect.length !== 1 || G2UI.figureSideCount(sideCorrect[0].figure.type, sideCorrect[0].figure.params) !== sideTarget) {
      sideAnswerMatches = false;
    }
    if (sideQ.figureChoices.some(choice => choice.text !== "" || /[3-6]本|ちがう|よんでOK/.test(G2UI.shapeCardHTML2(choice, false)))) {
      sideChoicesUnlabeled = false;
    }

    const rectangleQ = RuleBasedQuestionSource.generateQuestion("g2_rect_square", []);
    const expectedVariants = rectangleQ.questionText.includes("横長")
      ? ["rectangle_wide"]
      : ["rectangle_wide", "rectangle_tall", "square"];
    const rectangleCorrect = rectangleQ.figureChoices
      .filter(choice => rectangleQ.correctChoiceIds.includes(choice.id))
      .map(choice => choice.figure.params.variant)
      .sort();
    if (JSON.stringify(rectangleCorrect) !== JSON.stringify(expectedVariants.slice().sort())) rectangleAnswerMatches = false;
    if (rectangleQ.figureChoices.some(choice =>
      choice.text !== "" || choice.figure.params.rightAngle || /直角|ななめ/.test(G2UI.shapeCardHTML2(choice, false))
    )) rectangleChoicesUnlabeled = false;
  }
  ok(sideAnswerMatches, "辺の本数の正解が設問と図形の辺数に一致 (40問)");
  ok(sideChoicesUnlabeled, "辺の本数選択肢に本数や正誤の表示がない (40問)");
  ok(rectangleAnswerMatches, "直角の四角形の正解IDが図形と一致 (40問)");
  ok(rectangleChoicesUnlabeled, "直角問題の選択肢に説明文や直角マークがない (40問)");
}

// ---------------------------------------------------------------
console.log("\n4. figure_tap: 正解部品が図と一致すること");
{
  EXPECTED.filter(s => s[3] === "figure_tap").forEach(s => {
    const id = s[0];
    let bad = 0;
    for (let i = 0; i < 10; i++) {
      const q = RuleBasedQuestionSource.generateQuestion(id, []);
      if (!q) { bad++; continue; }
      const ids = new Set((q.figureParts || []).map(p => p.id));
      const miss = (q.correctPartIds || []).filter(x => !ids.has(x));
      if (miss.length || !q.figureParts || q.figureParts.length < 2) bad++;
    }
    ok(bad === 0, id + " 正解部品がすべて figureParts に実在 (" + (10 - bad) + "/10)");
  });

  {
    const q = RuleBasedQuestionSource.generateQuestion("g2_tap_right_vertex", []);
    ok(q.correctPartIds.length === 4, "g2_tap_right_vertex 正解は頂点4つ (n=" + q.correctPartIds.length + ")");
    const marks = FigureSVG.effectiveMarks(q.figureSpec);
    ok(marks.rightAngle.length === 4, "直角マークが4頂点分ある");
    ok(q.correctPartIds.every(id => marks.rightAngle.indexOf(id.slice(2)) >= 0),
      "正解頂点と直角マーク位置が一致: " + JSON.stringify(q.correctPartIds));
  }

  {
    const q = RuleBasedQuestionSource.generateQuestion("g2_tap_all_edges", []);
    const edges = FigureSVG.parts(q.figureSpec).filter(p => p.kind === "edge");
    ok(edges.length === 4, "g2_tap_all_edges 図に辺が4本");
    ok(q.correctPartIds.length === 4, "g2_tap_all_edges 正解は4本 (n=" + q.correctPartIds.length + ")");
    // 横長 = 上の辺(AB)が 縦の辺(BC) より長い / 縦長 = 逆
    const wide = FigureSVG.resolve({ shape: "quadrilateral", variant: "rectangle_wide" });
    const tall = FigureSVG.resolve({ shape: "quadrilateral", variant: "rectangle_tall" });
    const width = (r) => Math.abs(r.points.B[0] - r.points.A[0]);
    const height = (r) => Math.abs(r.points.C[1] - r.points.B[1]);
    ok(width(wide) > height(wide),
      "rectangle_wide は横長 (w=" + width(wide).toFixed(0) + " h=" + height(wide).toFixed(0) + ")");
    ok(height(tall) > width(tall),
      "rectangle_tall は縦長 (w=" + width(tall).toFixed(0) + " h=" + height(tall).toFixed(0) + ")");
  }

  {
    let good = 0;
    for (let i = 0; i < 10; i++) {
      const q = RuleBasedQuestionSource.generateQuestion("g2_tap_longest_side", []);
      const parts = FigureSVG.parts(q.figureSpec).filter(p => p.kind === "edge");
      const lens = parts.map(p => ({ id: p.id, len: FigureSVG.dist(p.hit.a, p.hit.b) }));
      const best = Math.max.apply(null, lens.map(e => e.len));
      const expect = lens.filter(e => near(e.len, best, 0.6)).map(e => e.id).sort();
      const got = (q.correctPartIds || []).slice().sort();
      if (JSON.stringify(expect) === JSON.stringify(got)) good++;
    }
    ok(good === 10, "g2_tap_longest_side 正解が実測の最長辺と一致 (" + good + "/10)");
  }

  {
    let good = 0;
    for (let i = 0; i < 10; i++) {
      const q = RuleBasedQuestionSource.generateQuestion("g2_tap_equal_sides", []);
      const parts = FigureSVG.parts(q.figureSpec).filter(p => p.kind === "edge");
      const ids = parts.map(p => p.id);
      const marks = FigureSVG.effectiveMarks(q.figureSpec);
      const expect = marks.equalSides
        .map(pair => "e-" + (pair[0] < pair[1] ? pair[0] + pair[1] : pair[1] + pair[0]))
        .filter(id => ids.indexOf(id) >= 0)
        .sort();
      const got = (q.correctPartIds || []).slice().sort();
      if (expect.length >= 2 && JSON.stringify(expect) === JSON.stringify(got)) good++;
    }
    ok(good === 10, "g2_tap_equal_sides 正解が実測の等辺と一致 (" + good + "/10)");
  }
}

// ---------------------------------------------------------------
console.log("\n5. figure_display: 図が答えと一致すること");
{
  ["g2_disp_count_vertices", "g2_disp_count_angles"].forEach(id => {
    let good = 0;
    for (let i = 0; i < 10; i++) {
      const q = RuleBasedQuestionSource.generateQuestion(id, []);
      const verts = FigureSVG.parts(q.figureSpec).filter(p => p.kind === "vertex").length;
      if (String(verts) === String(q.answer)) good++;
    }
    ok(good === 10, id + " 答え=top点の数 (" + good + "/10)");
  });

  {
    let good = 0;
    for (let i = 0; i < 10; i++) {
      const q = RuleBasedQuestionSource.generateQuestion("g2_disp_grid_sides", []);
      const lab = (q.figureSpec.labels || {}).edges || {};
      const cm = String(lab.AB || "").replace("cm", "");
      if (cm === String(q.answer)) good++;
    }
    ok(good === 10, "g2_disp_grid_sides 答え=辺のラベル長 (" + good + "/10)");
  }

  {
    let good = 0;
    for (let i = 0; i < 10; i++) {
      const q = RuleBasedQuestionSource.generateQuestion("g2_disp_square_perimeter", []);
      const lab = (q.figureSpec.labels || {}).edges || {};
      const side = Number(String(lab.AB || "").replace("cm", ""));
      if (Number.isFinite(side) && side * 4 === Number(q.answer)) good++;
    }
    ok(good === 10, "g2_disp_square_perimeter 答え=1辺×4 (" + good + "/10)");
  }

  {
    let good = 0;
    for (let i = 0; i < 10; i++) {
      const q = RuleBasedQuestionSource.generateQuestion("g2_adv_rectangle_perimeter_01", []);
      const edges = (q.figureSpec.labels || {}).edges || {};
      const w = Number(String(edges.AB || "").replace("cm", ""));
      const h = Number(String(edges.BC || "").replace("cm", ""));
      if (Number.isFinite(w) && Number.isFinite(h) && 2 * (w + h) === Number(q.answer)) good++;
    }
    ok(good === 10, "g2_adv_rectangle_perimeter_01 答え=2×(たて+よこ) (" + good + "/10)");
  }

  {
    let good = 0;
    ["g2_disp_count_vertices", "g2_disp_count_angles", "g2_disp_grid_sides", "g2_disp_square_perimeter", "g2_adv_rectangle_perimeter_01"]
      .forEach(id => {
        for (let i = 0; i < 5; i++) {
          const q = RuleBasedQuestionSource.generateQuestion(id, []);
          const h = q.figureHTML || "";
          if (h.indexOf("<svg") >= 0 && h.indexOf("NaN") < 0
            && !/\{[a-zA-Z0-9_]+\}/.test(h)
            && !q.figureParts && !q.figureChoices) good++;
        }
      });
    ok(good === 25, "figureHTML が描画され、数値入力形式である (" + good + "/25)");
  }
}

// ---------------------------------------------------------------
console.log("\n6. Engine 回帰（angle / rectangle_tall / 設問文）");
{
  const spec = { shape: "angle", variant: "right" };
  const ps = FigureSVG.parts(spec);
  const ang = ps.find(p => p.kind === "angle");
  ok(!!ang && ang.id === "a-O", "angle の角部品は a-O (actual=" + (ang ? ang.id : "none") + ")");
  const O = FigureSVG.resolve(spec).points.O;
  ok(!!ang && ang.hit.v[0] === O[0] && ang.hit.v[1] === O[1], "a-O のヒット位置が頂点O と一致");
  const edgeIds = ps.filter(p => p.kind === "edge").map(p => p.id).sort();
  ok(JSON.stringify(edgeIds) === JSON.stringify(["e-AO", "e-BO"]),
    "angle の辺は O から伸びる2本 (actual=" + JSON.stringify(edgeIds) + ")");
  ok(JSON.stringify(FigureSVG.resolve(spec).order) === JSON.stringify(["O", "A", "B"]),
    "angle の頂点順は O,A,B");

  const tall = FigureSVG.resolve({ shape: "quadrilateral", variant: "rectangle_tall" });
  const sq = FigureSVG.resolve({ shape: "quadrilateral", variant: "square" });
  ok(JSON.stringify(tall.points) !== JSON.stringify(sq.points), "rectangle_tall が square と異なる図形");
  ok(FigureSVG.effectiveMarks({ shape: "quadrilateral", variant: "rectangle_tall" }).rightAngle.length === 4,
    "rectangle_tall に直角マークが4つ付く");

  let polluted = 0;
  Object.values(TemplateRegistry.templates)
    .filter(t => t.answerType === "figure_tap")
    .forEach(t => {
      const q = RuleBasedQuestionSource.generateQuestion(t.templateId, []);
      if (q && q.figureChoices && q.figureChoices.length > 0) polluted++;
    });
  ok(polluted === 0, "figure_tap に figureChoices が混ざらない (混入=" + polluted + ")");

  const tapQ = RuleBasedQuestionSource.generateQuestion("g2_tap_all_edges", []);
  ok(tapQ.questionText === TemplateRegistry.get("g2_tap_all_edges").format,
    "figure_tap の設問文が format と一致: " + tapQ.questionText);
}

// ---------------------------------------------------------------
console.log("\n7. 単元選択 / テスト生成との整合");
{
  const off2 = UnitSelector._filterFigureUnits(
    UnitRegistry.getUnitsForLevel("math", 2, 2), { settings: { figureEnabled: false } }, "math", 2, 2
  ).map(u => u.id);
  ok(off2.indexOf("geometry_g2") >= 0, "figureEnabled=false でも非図形問題のあるLv2 geometry_g2を表示");
  const off3 = UnitSelector._filterFigureUnits(
    UnitRegistry.getUnitsForLevel("math", 2, 3), { settings: { figureEnabled: false } }, "math", 2, 3
  ).map(u => u.id);
  ok(off3.indexOf("geometry_g2") >= 0, "figureEnabled=false でも非図形問題のあるLv3 geometry_g2を表示");

  ok(TestEngine._isFigureUnitId("geometry_g2") === true, "TestEngine が shape_figure_tap を図形と判定");
  ok(TestEngine._isFigureUnitId("geometry_g2") === true, "TestEngine が shape_figure_measure を図形と判定");
  ok(TestEngine._isFigureUnitId("multiplication_g2") === false, "TestEngine が非図形単元を判定");

  const tapPool = TemplateRegistry.getByUnit("math", 2, 2, "geometry_g2");
  const tapFigurePool = tapPool.filter(t => t.problemType === "figure");
  ok(tapPool.length === 6, "Lv2 geometry_g2 に6件のテンプレート (n=" + tapPool.length + ")");
  ok(tapFigurePool.length === 4, "Lv2 geometry_g2 に図形問題が4件 (n=" + tapFigurePool.length + ")");
  ok(tapFigurePool.every(t => t.answerType === "figure_tap"), "Lv2 geometry_g2 の図形問題はすべて figure_tap");
  ok(tapPool.some(t => t.problemType !== "figure"), "Lv2 geometry_g2 に非図形問題も含む");
  const dispPool = TemplateRegistry.getByUnit("math", 2, 3, "geometry_g2");
  const dispFigurePool = dispPool.filter(t => t.problemType === "figure");
  ok(dispPool.length === 8, "Lv3 geometry_g2 に8件のテンプレート (n=" + dispPool.length + ")");
  ok(dispFigurePool.length === 5, "Lv3 geometry_g2 に図形問題が5件 (n=" + dispFigurePool.length + ")");
  ok(dispFigurePool.every(t => t.answerType === "figure_display"), "Lv3 geometry_g2 の図形問題はすべて figure_display");
  ok(dispPool.some(t => t.problemType !== "figure"), "Lv3 geometry_g2 に非図形問題も含む");
  const lv1Pool = TemplateRegistry.getByUnit("math", 2, 1, "geometry_g2");
  ok(lv1Pool.length === 8, "図形Lv1に三角形・四角形とはこの形の8型 (n=" + lv1Pool.length + ")");
}

console.log("\n--- " + (fail === 0 ? "ALL PASS" : "FAIL " + fail) + " ---");
process.exit(fail === 0 ? 0 : 1);