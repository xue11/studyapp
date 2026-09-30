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
      var ti = Math.min(2, Math.max(1, Number(vars.target_idx) || 1)) - 1;
      var ps = Number(vars.pattern_seed) || 0;
      var TYPES = ["triangle", "quadrilateral"];
      var TEXTS = ["直線が 3本", "直線が 4本", "まるい かたち"];
      var FIGS = ["triangle", "quadrilateral", "circle"];
      var layouts = [[0, 1, 2, 0, 1, 2], [1, 1, 0, 2, 0, 2], [0, 2, 1, 1, 2, 0]];
      var layout = layouts[ps % layouts.length];
      var cards = layout.map(function (k, idx) {
        return {
          id: "p" + (idx + 1),
          figure: { type: FIGS[k], params: { size: 80 } },
          text: TEXTS[k],
          position: { col: idx % 3, row: Math.floor(idx / 3) }
        };
      });
      var targetType = TYPES[ti];
      var hasTarget = cards.some(function (c) { return c.figure.type === targetType; });
      if (!hasTarget) {
        cards[0].figure.type = targetType;
        cards[0].text = TEXTS[ti];
      }
      var correct = cards.filter(function (c) { return c.figure.type === targetType; }).map(function (c) { return c.id; });
      var label = ti === 0 ? "三角形" : "四角形";
      return {
        questionText: "つぎの 中から " + label + "を すべて 選びましょう。",
        figureChoices: cards,
        correctChoiceIds: correct,
        answer: correct.join(","),
        vars: { target_label: label, target_idx: ti + 1 }
      };
    }
    if (tid === "g2_rect_square") {
      var tgt = Math.min(2, Math.max(1, Number(vars.target_idx) || 1));
      var ds = Number(vars.distractor_seed) || 0;
      var cards2 = [
        { id: "c1", figure: { type: "quadrilateral", params: { size: 92, variant: "rectangle_wide", rotation: 0, rightAngle: true } }, text: "角は すべて 直角" },
        { id: "c2", figure: { type: "quadrilateral", params: { size: 88, variant: "square", rotation: 0, rightAngle: true } }, text: "角は すべて 直角" },
        { id: "c3", figure: { type: "quadrilateral", params: { size: 92, variant: "parallelogram", rotation: 0 } }, text: "ななめの 四角形" },
        { id: "c4", figure: { type: "quadrilateral", params: { size: 92, variant: "trapezoid", rotation: 0 } }, text: "ななめの 四角形" }
      ];
      if (ds % 2 === 1) {
        var tmp = cards2[2]; cards2[2] = cards2[3]; cards2[3] = tmp;
      }
      var answerId = tgt === 1 ? "c1" : "c2";
      var qlabel = tgt === 1 ? "長方形" : "正方形";
      return {
        questionText: qlabel + "を 選びましょう。",
        figureChoices: cards2,
        correctChoiceIds: [answerId],
        answer: answerId,
        vars: { target_label: qlabel, target_idx: tgt }
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
      problemType: "figure", answerType: "single_choice",
      format: "長方形・正方形を 選びましょう。",
      generate: {
        target_idx: { type: "integer", range: [1, 2] },
        distractor_seed: { type: "integer", range: [0, 1] }
      },
      answer: { expression: "target_idx", normalization: "integer" },
      hintSteps: ["直角が あるか たしかめよう。", "角が すべて 直角なのは どれかな。"],
      explanationTemplate: "角が すべて 直角の 四角形が 長方形だよ。",
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

