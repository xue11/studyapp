/**
 * G2 part 1: helpers (right-angle mark, G2 SVG/card wrappers,判定委譲)
 */
(function () {
  function esc(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function baseFigureSVG(type, params) {
    var G1 = (typeof globalThis !== "undefined" && globalThis.FigureShapeUI) || null;
    if (G1 && typeof G1.createFigureSVG === "function") return G1.createFigureSVG(type, params);
    return "";
  }
  // V2.7.0: 直角マークは FigureSVG が「頂点の座標」から算出する。
  // 旧実装は固定座標 (30,30) に描いていたため、正方形・長方形の頂点と一致しなかった。
  function getFigureSVG() {
    if (typeof globalThis !== "undefined" && globalThis.FigureSVG) return globalThis.FigureSVG;
    if (typeof window !== "undefined" && window.FigureSVG) return window.FigureSVG;
    if (typeof require !== "undefined") {
      try { return require("./figure_svg.js").FigureSVG; } catch (e) {}
    }
    return null;
  }
  function createFigureSVG2(type, params) {
    params = params || {};
    var Fig = getFigureSVG();
    if (Fig && typeof Fig.toLegacy === "function") return Fig.toLegacy(type, params);
    return baseFigureSVG(type, params);
  }
  function shapeCardHTML2(choice, selected) {
    var G1 = (typeof globalThis !== "undefined" && globalThis.FigureShapeUI) || null;
    if (G1 && typeof G1.shapeCardHTML === "function") {
      var sel = selected ? " shape-card--selected" : "";
      var label = choice && typeof choice.text === "string" ? choice.text : "";
      var fig = (choice && choice.figure) || { type: "circle", params: {} };
      return '<button type="button" class="shape-card' + sel + '" data-choice-id="' + esc(choice.id) + '" ' +
        'onclick="app.toggleFigureChoice(\'' + esc(choice.id) + '\')">' +
        '<span class="shape-card-figure">' + createFigureSVG2(fig.type, fig.params) + "</span>" +
        '<span class="shape-card-text">' + esc(label) + "</span></button>";
    }
    return "";
  }
  function isSingleCorrect(a, b) {
    var G1 = (typeof globalThis !== "undefined" && globalThis.FigureShapeUI) || null;
    if (G1 && typeof G1.isSingleCorrect === "function") return G1.isSingleCorrect(a, b);
    return Array.isArray(b) && b.indexOf(a) >= 0;
  }
  function isMultiCorrect(a, b) {
    var G1 = (typeof globalThis !== "undefined" && globalThis.FigureShapeUI) || null;
    if (G1 && typeof G1.isMultiCorrect === "function") return G1.isMultiCorrect(a, b);
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
    var need = {};
    b.forEach(function (id) { need[id] = true; });
    return a.every(function (id) { return !!need[id]; });
  }
  function choicesSnapshot(choices) {
    var G1 = (typeof globalThis !== "undefined" && globalThis.FigureShapeUI) || null;
    if (G1 && typeof G1.choicesSnapshot === "function") return G1.choicesSnapshot(choices);
    return (choices || []).map(function (c) {
      return { id: c.id, figure: { type: (c.figure || {}).type || "", params: Object.assign({}, (c.figure || {}).params || {}) }, text: c.text || "" };
    });
  }
  var G2H = { esc: esc, createFigureSVG2: createFigureSVG2, shapeCardHTML2: shapeCardHTML2, isSingleCorrect: isSingleCorrect, isMultiCorrect: isMultiCorrect, choicesSnapshot: choicesSnapshot };
  if (typeof globalThis !== "undefined") globalThis.FigureShapeUI_G2H = G2H;
  if (typeof module !== "undefined" && module.exports) module.exports = G2H;
})();

// G2 part 2: buildProblem (2 templates only)
(function () {
  function buildProblem(template, vars) {
    var tid = template.templateId;
    if (tid === "g2_tri_quad_identify") {
      // 三角形・四角形・五角形・六角形から「三角形と四角形」をすべて選ぶ
      // V2.8.0: 図の「辺の数」を読む問題へ強化（此前は まる/三角形/四角形の3択）
      var cat = [
        { t: "quadrilateral", p: { variant: "rectangle_wide" }, sides: 4 },
        { t: "triangle", p: { variant: "isosceles" }, sides: 3 },
        { t: "polygon", p: { variant: "pentagon" }, sides: 5 },
        { t: "quadrilateral", p: { variant: "trapezoid" }, sides: 4 },
        { t: "polygon", p: { variant: "hexagon" }, sides: 6 },
        { t: "triangle", p: { variant: "right" }, sides: 3 }
      ];
      var order1 = [0, 1, 2, 3, 4, 5];
      for (var si = order1.length - 1; si > 0; si--) {
        var jj = Math.floor(Math.random() * (si + 1));
        var tt = order1[si]; order1[si] = order1[jj]; order1[jj] = tt;
      }
      var cards1 = [], correct1 = [];
      for (var oi = 0; oi < order1.length; oi++) {
        var cc1 = cat[order1[oi]];
        var isTgt = (cc1.sides === 3 || cc1.sides === 4);
        var idc = "c" + oi;
        if (isTgt) correct1.push(idc);
        cards1.push({ id: idc, figure: { type: cc1.t, params: cc1.p }, text: isTgt ? "よんでOK" : "ちがう" });
      }
      return {
        questionText: "図を 見て 三角形と 四角形を すべて えらびましょう。",
        figureChoices: cards1,
        correctChoiceIds: correct1,
        answer: correct1.join(","),
        vars: { shape_count: correct1.length }
      };
    }
    if (tid === "g2_rect_square") {
      // 「直角が すべて」＝長方形（正方形は 特別扱い）を直角マーク付きで見分ける。
      // V2.8.0: 縦長長方形 (rectangle_tall) を追加。QUAD に無い variant は
      // square に化けていたため、選択肢が「横長と正方形」だけになっていた。
      var tgt = Math.min(2, Math.max(1, Number(vars.target_idx) || 1));
      var ds = Number(vars.distractor_seed) || 0;
      var cards2 = [
        { id: "c1", figure: { type: "quadrilateral", params: { size: 92, variant: "rectangle_wide", rotation: 0, rightAngle: true } }, text: "4つの 角が 直角" },
        { id: "c2", figure: { type: "quadrilateral", params: { size: 92, variant: "rectangle_tall", rotation: 0, rightAngle: true } }, text: "4つの 角が 直角" },
        { id: "c3", figure: { type: "quadrilateral", params: { size: 88, variant: "square", rotation: 0, rightAngle: true } }, text: "4つの 角が 直角" },
        { id: "c4", figure: { type: "quadrilateral", params: { size: 92, variant: "parallelogram", rotation: 0 } }, text: "ななめの 角がある" },
        { id: "c5", figure: { type: "quadrilateral", params: { size: 92, variant: "trapezoid", rotation: 0 } }, text: "ななめの 角がある" },
        { id: "c6", figure: { type: "quadrilateral", params: { size: 92, variant: "rhombus", rotation: 0 } }, text: "ななめの 角がある" }
      ];
      if (ds % 2 === 1) {
        var tmp = cards2[0]; cards2[0] = cards2[2]; cards2[2] = tmp;
      }
      // tgt=1 → 横長長方形のみ / tgt=2 → 長方形をすべて選ぶ（縦長・正方形も含む）
      var answerIds = tgt === 1 ? ["c1"] : ["c1", "c2", "c3"];
      var qlabel = tgt === 1 ? "横長の 長方形" : "4つの 角が すべて 直角の 四角形";
      return {
        questionText: qlabel + "を すべて えらびましょう。",
        figureChoices: cards2,
        correctChoiceIds: answerIds,
        answer: answerIds.join(","),
        vars: { target_label: qlabel, target_idx: tgt }
      };
    }
    if (tid === "g2_shape_sides_pick") {
      // 「何本の 辺で かこまれているか」を図から読んで選ぶ
      var kinds = [
        { id: "s3", sides: 3, text: "3本", figure: { type: "triangle", params: { variant: "isosceles" } } },
        { id: "s4", sides: 4, text: "4本", figure: { type: "quadrilateral", params: { variant: "rectangle_wide" } } },
        { id: "s5", sides: 5, text: "5本", figure: { type: "polygon", params: { variant: "pentagon" } } },
        { id: "s6", sides: 6, text: "6本", figure: { type: "polygon", params: { variant: "hexagon" } } }
      ];
      var want = (Number(vars.target_idx) || 1) - 1;
      if (!(want >= 0 && want < 4)) want = Math.floor(Math.random() * 4);
      var cards3 = kinds.map(function (k) {
        return { id: k.id, figure: k.figure, text: k.text };
      });
      for (var k2 = cards3.length - 1; k2 > 0; k2--) {
        var j2 = Math.floor(Math.random() * (k2 + 1));
        var t2 = cards3[k2]; cards3[k2] = cards3[j2]; cards3[j2] = t2;
      }
      return {
        questionText: "よんで「" + kinds[want].text + "の 辺で かこまれている」図を えらびましょう。",
        figureChoices: cards3,
        correctChoiceIds: [kinds[want].id],
        answer: kinds[want].id,
        vars: { want_sides: kinds[want].sides }
      };
    }
    if (tid === "g2_shape_vertices_pick") {
      // 頂点（ちょうてん）が 3つの図形（三角形）をすべて選ぶ
      var vsets = [
        { id: "v3a", sides: 3, figure: { type: "triangle", params: { variant: "isosceles" } } },
        { id: "v4a", sides: 4, figure: { type: "quadrilateral", params: { variant: "rectangle_tall" } } },
        { id: "v3b", sides: 3, figure: { type: "triangle", params: { variant: "right" } } },
        { id: "v5a", sides: 5, figure: { type: "polygon", params: { variant: "pentagon" } } },
        { id: "v4b", sides: 4, figure: { type: "quadrilateral", params: { variant: "parallelogram" } } },
        { id: "v6a", sides: 6, figure: { type: "polygon", params: { variant: "hexagon" } } }
      ];
      var order4 = [0, 1, 2, 3, 4, 5];
      for (var s4 = order4.length - 1; s4 > 0; s4--) {
        var j4 = Math.floor(Math.random() * (s4 + 1));
        var t4 = order4[s4]; order4[s4] = order4[j4]; order4[j4] = t4;
      }
      var cards4 = [], correct4 = [];
      for (var q4 = 0; q4 < order4.length; q4++) {
        var src = vsets[order4[q4]];
        var id4 = "c" + q4;
        if (src.sides === 3) correct4.push(id4);
        cards4.push({ id: id4, figure: src.figure, text: src.sides === 3 ? "よんでOK" : "ちがう" });
      }
      return {
        questionText: "頂点（ちょうてん）が 3つの 図を すべて えらびましょう。",
        figureChoices: cards4,
        correctChoiceIds: correct4,
        answer: correct4.join(","),
        vars: { triangle_count: correct4.length }
      };
    }
    return null;
  }
  if (typeof globalThis !== "undefined") globalThis.FigureShapeUI_G2BP = { buildProblem: buildProblem };
})();

// G2 part 3: templates + register + facade
(function () {
  var FIGURE_TEMPLATES_G2 = [
    {
      templateId: "g2_tri_quad_identify",
      grade: 2, difficultyLevel: 1,
      unitId: "shape_tri_quad", conceptId: "tri_quad_identify",
      problemType: "figure", answerType: "multi_choice",
      format: "三角形・四角形を すべて 選びましょう。",
      generate: {
        target_idx: { type: "integer", range: [1, 2] },
        pattern_seed: { type: "integer", range: [0, 2] }
      },
      answer: { expression: "target_idx", normalization: "integer" },
      hintSteps: ["直線が 何本で 囲まれているか 数えよう。", "3本なら 三角形、4本なら 四角形だよ。"],
      explanationTemplate: "3本の 直線で 囲まれた形が 三角形、4本が 四角形だよ。",
      understandingCheck: { enabled: false }
    },
    {
      templateId: "g2_rect_square",
      grade: 2, difficultyLevel: 1,
      unitId: "shape_tri_quad", conceptId: "rect_square_identify",
      // V2.8.0: 「直角がすべて」の四角形をすべて選ぶ = 長方形（縦長・正方形含む）ため multi_choice へ
      problemType: "figure", answerType: "multi_choice",
      format: "4つの 角が すべて 直角の 四角形を 選びましょう。",
      generate: {
        target_idx: { type: "integer", range: [1, 2] },
        distractor_seed: { type: "integer", range: [0, 1] }
      },
      answer: { expression: "target_idx", normalization: "integer" },
      hintSteps: ["□の マークが ある 角を 4つ さがそう。", "4つ 全部に □が あるのが 長方形だよ。"],
      explanationTemplate: "4つの 角が すべて 直角の 四角形が 長方形だよ。正方形も 長方形の 一種だよ。",
      understandingCheck: { enabled: false }
    },
    {
      templateId: "g2_shape_sides_pick",
      grade: 2, difficultyLevel: 1,
      unitId: "shape_tri_quad", conceptId: "tri_quad_sides_count",
      problemType: "figure", answerType: "single_choice",
      format: "図を よんで、つぎの 本数の 辺で かこまれている 図を 選びましょう。",
      generate: { target_idx: { type: "integer", range: [1, 4] } },
      answer: { expression: "target_idx", normalization: "integer" },
      hintSteps: ["図の まわりを 1かい まわって 辺を 数えよう。", "3本なら 三角形、4本なら 四角形、5本なら 五角形だよ。"],
      explanationTemplate: "辺の 本数が 図の 形を あらわすよ。",
      understandingCheck: { enabled: false }
    },
    {
      templateId: "g2_shape_vertices_pick",
      grade: 2, difficultyLevel: 1,
      unitId: "shape_tri_quad", conceptId: "tri_quad_vertices_pick",
      problemType: "figure", answerType: "multi_choice",
      format: "頂点（ちょうてん）が 3つの 図を すべて 選びましょう。",
      generate: { pattern_seed: { type: "integer", range: [0, 5] } },
      answer: { expression: "pattern_seed", normalization: "integer" },
      hintSteps: ["角の さき（●の ところ）を 全部 数えよう。", "頂点が 3つの 図が 三角形だよ。"],
      explanationTemplate: "頂点が 3つ なら 三角形、4つ なら 四角形だよ。",
      understandingCheck: { enabled: false }
    },
    // ---------------------------------------------- Lv2: 図を直接タップする
    {
      templateId: "g2_tap_right_vertex",
      grade: 2, difficultyLevel: 2,
      unitId: "shape_figure_tap", conceptId: "tri_quad_tap_vertex",
      problemType: "figure", answerType: "figure_tap",
      format: "直角（□の マーク）がある 頂点を すべて タップしてね。",
      generate: { shape_idx: { type: "integer", range: [1, 4] } },
      answer: { expression: "shape_idx", normalization: "integer" },
      figureSpec: {
        shape: "quadrilateral", variant: "rectangle_wide", autoMarks: true,
        tap: { kind: "vertex", mode: "multi", select: { rightAngle: true }, hint: "□の マークの ある 頂点を すべて タップしてね。" }
      },
      hintSteps: ["□の マークが ある 頂点を さがそう。", "マークが ある 角（かく）の さきを すべて タップしてね。"],
      explanationTemplate: "□（しかく）の マークは 直角の 頂点につけてあるよ。",
      understandingCheck: { enabled: false }
    },
    {
      templateId: "g2_tap_all_edges",
      grade: 2, difficultyLevel: 2,
      unitId: "shape_figure_tap", conceptId: "tri_quad_tap_edge",
      problemType: "figure", answerType: "figure_tap",
      format: "四角形の 4本の 辺を すべて タップしてね。",
      generate: { pattern_seed: { type: "integer", range: [0, 1] } },
      answer: { expression: "pattern_seed", normalization: "integer" },
      figureSpec: {
        shape: "quadrilateral", variant: "rectangle_tall", autoMarks: false,
        tap: { kind: "edge", mode: "multi", select: { all: true }, hint: " たてと よこ、4本の 辺を 全部 タップしてね。" }
      },
      hintSteps: ["たての 辺が 2本、よこの 辺が 2本 あるよ。", "4本 ぜんぶに タップしたら おわり。"],
      explanationTemplate: "四角形は たて 2本 と よこ 2本、合わせて 4本の 辺があるよ。",
      understandingCheck: { enabled: false }
    },
    {
      templateId: "g2_tap_longest_side",
      grade: 2, difficultyLevel: 2,
      unitId: "shape_figure_tap", conceptId: "tri_quad_tap_longest",
      problemType: "figure", answerType: "figure_tap",
      format: "いちばん 長い 辺を すべて タップしてね。",
      generate: { shape_idx: { type: "integer", range: [1, 2] } },
      answer: { expression: "shape_idx", normalization: "integer" },
      figureSpec: {
        shape: "quadrilateral", variant: "rectangle_wide", autoMarks: false, vary: ["rotate"],
        rotateOptions: [0, 90, 180, 270],
        tap: { kind: "edge", mode: "multi", select: { longest: true }, hint: "2本の 辺を くらべて ながい ほうを すべて タップしてね。" }
      },
      hintSteps: ["ながい 辺と みじかい 辺を くらべよう。", "ながい 辺は 2本 あるよ。ぜんぶ タップしてね。"],
      explanationTemplate: "いちばん ながい 辺は、たて の ほうだよ。",
      understandingCheck: { enabled: false }
    },
    {
      templateId: "g2_tap_equal_sides",
      grade: 2, difficultyLevel: 2,
      unitId: "shape_figure_tap", conceptId: "tri_quad_tap_equal",
      problemType: "figure", answerType: "figure_tap",
      format: "長さが 同じ 辺を すべて タップしてね。",
      generate: { pattern_seed: { type: "integer", range: [0, 1] } },
      answer: { expression: "pattern_seed", normalization: "integer" },
      figureSpec: {
        shape: "triangle", variant: "isosceles", autoMarks: true,
        tap: { kind: "edge", mode: "multi", select: { equalSides: true }, hint: "// の マークが ある 2本の 辺を タップしてね。" }
      },
      hintSteps: ["// の マークが ついている 辺を さがそう。", "マークが ある 辺を すべて タップしてね。"],
      explanationTemplate: "2本の 辺が 等しい（ながさが 同じ）三角形を 二等辺三角形というよ。",
      understandingCheck: { enabled: false }
    },
    // ------------------------------------ Lv3: 図を見て数値で答える
    {
      templateId: "g2_disp_count_vertices",
      grade: 2, difficultyLevel: 3,
      unitId: "shape_figure_measure", conceptId: "tri_quad_count_vertices",
      problemType: "figure", answerType: "figure_display",
      format: "図の 頂点（ちょうてん）は いくつ？",
      generate: { sides: { type: "integer", range: [3, 6] } },
      answer: { expression: "sides", normalization: "integer" },
      // sides を生成変数に紐づける（答え = 頂点の数 = 辺の数）
      figureSpec: { shape: "polygon", sides: "{sides}", radius: 2.3, autoMarks: false, vertexMark: true },
      hintSteps: ["角の さき（●の ところ）を 1こずつ 数えよう。", "3つなら 三角形、4つ なら 四角形だよ。"],
      explanationTemplate: "頂点の 数が 図の 形を あらわすよ。",
      understandingCheck: { enabled: false }
    },
    {
      templateId: "g2_disp_count_angles",
      grade: 2, difficultyLevel: 3,
      unitId: "shape_figure_measure", conceptId: "tri_quad_count_angles",
      problemType: "figure", answerType: "figure_display",
      format: "図の 角（かく）は いくつ？",
      generate: { sides: { type: "integer", range: [3, 5] } },
      answer: { expression: "sides", normalization: "integer" },
      // sides を生成変数に紐づける（答え = 角の数 = 頂点の数）
      figureSpec: { shape: "polygon", sides: "{sides}", radius: 2.3, autoMarks: false, vertexMark: true },
      hintSteps: ["角（かく）の さきにある ●が 頂点（ちょうてん）だ。", "角の 数は 頂点の 数と 同じになるよ。"],
      explanationTemplate: "角の 数は 頂点の 数と同じなので、それぞれ 3 / 4 / 5 個 だよ。",
      understandingCheck: { enabled: false }
    },
    {
      templateId: "g2_disp_grid_sides",
      grade: 2, difficultyLevel: 3,
      unitId: "shape_figure_measure", conceptId: "tri_quad_grid_count",
      problemType: "figure", answerType: "figure_display",
      format: "方眼（こう眼）の 図の よこの 辺は いくつ？",
      generate: { n: { type: "integer", range: [2, 4] } },
      answer: { expression: "n", normalization: "integer" },
      // 1辺 n マスの正方形（w/h を生成変数に紐づけ、答え = n と一致させる）
      figureSpec: { shape: "quadrilateral", w: "{n}", h: "{n}", pxPerUnit: 26, grid: 1, autoMarks: false, labels: { edges: { AB: "{n}cm" } } },
      hintSteps: ["方眼の 1マスずつ よこの 辺を 数えよう。", "1マスにつき 1つ と 数えるよ。"],
      explanationTemplate: "方眼の 図は、1マスを 1として 辺の 長さを かぞえるよ。",
      understandingCheck: { enabled: false }
    },
    {
      templateId: "g2_disp_square_perimeter",
      grade: 2, difficultyLevel: 3,
      unitId: "shape_figure_measure", conceptId: "tri_quad_grid_length",
      problemType: "figure", answerType: "figure_display",
      format: "方眼の 正方形の 周（まわり）の 長さは何cm？",
      generate: { n: { type: "integer", range: [2, 4] } },
      answer: { expression: "n * 4", normalization: "integer" },
      // 1辺 n マスの正方形（w/h を生成変数に紐づけ、周 = n × 4）
      figureSpec: { shape: "quadrilateral", w: "{n}", h: "{n}", pxPerUnit: 26, grid: 1, autoMarks: false, labels: { edges: { AB: "{n}cm" } } },
      hintSteps: ["1つの 辺が 何cm かを 図から よみ取ろう。", "4つの 辺を ぜんぶ たすと 周の 長さになるよ。"],
      explanationTemplate: "正方形の 周は 1つの 辺の 長さ × 4 で 求められるよ。",
      understandingCheck: { enabled: false }
    }
  ];
  function registerAll() {
    var reg = null;
    if (typeof window !== "undefined" && window.TemplateRegistry) reg = window.TemplateRegistry;
    else { try { reg = require("./registries.js").TemplateRegistry; } catch (e) {} }
    if (!reg) return;
    FIGURE_TEMPLATES_G2.forEach(function (t) { try { reg.register(t); } catch (e) {} });
  }
  registerAll();
  var FigureShapeUI_G2 = {
    FIGURE_TEMPLATES_G2: FIGURE_TEMPLATES_G2,
    createFigureSVG2: globalThis.FigureShapeUI_G2H.createFigureSVG2,
    shapeCardHTML2: globalThis.FigureShapeUI_G2H.shapeCardHTML2,
    buildProblem: globalThis.FigureShapeUI_G2BP.buildProblem,
    isSingleCorrect: globalThis.FigureShapeUI_G2H.isSingleCorrect,
    isMultiCorrect: globalThis.FigureShapeUI_G2H.isMultiCorrect,
    choicesSnapshot: globalThis.FigureShapeUI_G2H.choicesSnapshot
  };
  if (typeof globalThis !== "undefined") globalThis.FigureShapeUI_G2 = FigureShapeUI_G2;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = FigureShapeUI_G2;
  } else {
    window.FIGURE_TEMPLATES_G2 = FIGURE_TEMPLATES_G2;
    window.FigureShapeUI_G2 = FigureShapeUI_G2;
  }
})();

