/**
 * Figure Shape Templates (Grade 1: shape identification / select-all / size compare)
 * V2.6.3 追加: SVG図形 + 文カードの選択肢テンプレート (方針B: 共通カード + 配置モード分け)
 */
(function () {
  function esc(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  // 共通図形描画ユーティリティ (JSでSVG生成。表示配置はCSS側)
  // V2.7.0: 図形描画は FigureSVG (js/figure_svg.js) に集約した。
  // ここは旧 createFigureSVG(type, params) の互換ラッパのみを提供する。
  function getFigureSVG() {
    if (typeof globalThis !== "undefined" && globalThis.FigureSVG) return globalThis.FigureSVG;
    if (typeof window !== "undefined" && window.FigureSVG) return window.FigureSVG;
    if (typeof require !== "undefined") {
      try { return require("./figure_svg.js").FigureSVG; } catch (e) {}
    }
    return null;
  }

  function createFigureSVG(type, params) {
    var Fig = getFigureSVG();
    if (Fig && typeof Fig.toLegacy === "function") return Fig.toLegacy(type, params || {});
    return '<svg viewBox="0 0 120 120" width="100%" height="96" role="img" aria-hidden="true"></svg>';
  }

  function shapeCardHTML(choice, selected) {
    var sel = selected ? " shape-card--selected" : "";
    var label = choice && typeof choice.text === "string" ? choice.text : "";
    var fig = (choice && choice.figure) || { type: "circle", params: {} };
    return '<button type="button" class="shape-card' + sel + '" data-choice-id="' + esc(choice.id) + '" ' +
      'onclick="app.toggleFigureChoice(\'' + esc(choice.id) + '\')">' +
      '<span class="shape-card-figure">' + createFigureSVG(fig.type, fig.params) + "</span>" +
      '<span class="shape-card-text">' + esc(label) + "</span></button>";
  }

  function isSingleCorrect(selectedId, correctChoiceIds) {
    if (!Array.isArray(correctChoiceIds)) return false;
    return correctChoiceIds.indexOf(selectedId) >= 0;
  }

  // 1-Bは正解集合の完全一致のみ正解 (部分正解なし)
  function isMultiCorrect(selectedIds, correctChoiceIds) {
    if (!Array.isArray(selectedIds) || !Array.isArray(correctChoiceIds)) return false;
    if (selectedIds.length !== correctChoiceIds.length) return false;
    var need = {};
    for (var i = 0; i < correctChoiceIds.length; i++) need[correctChoiceIds[i]] = true;
    for (var j = 0; j < selectedIds.length; j++) {
      if (!need[selectedIds[j]]) return false;
    }
    return true;
  }

  function choicesSnapshot(choices) {
    return (choices || []).map(function (c) {
      return {
        id: c.id,
        figure: { type: (c.figure || {}).type || "", params: Object.assign({}, (c.figure || {}).params || {}) },
        text: typeof c.text === "string" ? c.text : ""
      };
    });
  }
  // V2.6.3: 図形問題の生成 (vars から 図+文カードを決定)
  function buildProblem(template, vars) {
    var FIGURE_LABELS = ["さんかくけい", "しかくけい", "まる"];
    var FIGURE_TEXTS = ["かどが3つの かたち", "かどが4つの かたち", "まるい かたち"];
    var FIGURE_TYPES = ["triangle", "quadrilateral", "circle"];
    function rot(seed, base) {
      var steps = [0, 15, -12, 30];
      return steps[((seed || 0) + (base || 0)) % steps.length];
    }
    var tid = template.templateId;
    if (tid === "g1_shape_identification") {
      var ti = Math.min(3, Math.max(1, Number(vars.target_idx) || 1)) - 1;
      var rs = Number(vars.rotation_seed) || 0;
      var cards = [];
      var order = [0, 1, 2];
      for (var i = order.length - 1; i > 0; i--) {
        var j = (rs + i) % order.length;
        var tmp = order[i]; order[i] = order[j]; order[j] = tmp;
      }
      order.forEach(function (k, idx) {
        cards.push({
          id: "c" + (idx + 1),
          figure: { type: FIGURE_TYPES[k], params: { size: 96, rotation: rot(rs, idx) } },
          text: FIGURE_TEXTS[k]
        });
      });
      var correct = cards.filter(function (c) { return c.figure.type === FIGURE_TYPES[ti]; }).map(function (c) { return c.id; });
      return {
        questionText: "つぎの なかから " + FIGURE_LABELS[ti] + " を えらびましょう。",
        figureChoices: cards,
        correctChoiceIds: correct.slice(0, 1),
        answer: correct[0] || "c1",
        vars: { target_label: FIGURE_LABELS[ti], target_idx: ti + 1 }
      };
    }
    if (tid === "g1_shape_select_all") {
      var ti2 = Math.min(3, Math.max(1, Number(vars.target_idx) || 1)) - 1;
      var ps = Number(vars.pattern_seed) || 0;
      var layouts = [
        [0, 1, 2, 0, 1, 2], [1, 1, 0, 2, 0, 2], [2, 0, 0, 1, 1, 2]
      ];
      var layout = layouts[ps % layouts.length];
      var cards2 = layout.map(function (k, idx) {
        return {
          id: "p" + (idx + 1),
          figure: { type: FIGURE_TYPES[k], params: { size: 80 } },
          text: FIGURE_TEXTS[k],
          position: { col: idx % 3, row: Math.floor(idx / 3) }
        };
      });
      var hasTarget = cards2.some(function (c) { return c.figure.type === FIGURE_TYPES[ti2]; });
      if (!hasTarget) {
        cards2[0].figure.type = FIGURE_TYPES[ti2];
        cards2[0].text = FIGURE_TEXTS[ti2];
      }
      var correct2 = cards2.filter(function (c) { return c.figure.type === FIGURE_TYPES[ti2]; }).map(function (c) { return c.id; });
      return {
        questionText: "つぎの なかから " + FIGURE_LABELS[ti2] + " を すべて えらびましょう。",
        figureChoices: cards2,
        correctChoiceIds: correct2,
        answer: correct2.join(","),
        vars: { target_label: FIGURE_LABELS[ti2], target_idx: ti2 + 1 }
      };
    }
    // g1_shape_compare (大小・向きの基礎比較: かならず しかくけい で比較)
    var ci = Math.min(2, Math.max(1, Number(vars.compare_idx) || 1));
    var sizes = ci === 1 ? [70, 100, 85, 92] : [88, 88, 88, 88];
    var rots = ci === 2 ? [0, 45, 0, 0] : [0, 0, 0, 0];
    var labels = ci === 1
      ? ["ちいさい しかく", "おおきい しかく", "ちゅうくらいの しかく", "もうひとつの しかく"]
      : ["むきが おなじ", "むきが ちがう", "むきが おなじ", "むきが おなじ"];
    var cards3 = sizes.map(function (sz, idx) {
      return {
        id: "c" + (idx + 1),
        figure: { type: "quadrilateral", params: { size: sz, rotation: rots[idx] } },
        text: labels[idx]
      };
    });
    var answerId = "c2";
    return {
      questionText: ci === 1 ? "おおきい ほう を えらびましょう。" : "むきが ちがう ず を えらびましょう。",
      figureChoices: cards3,
      correctChoiceIds: [answerId],
      answer: answerId,
      vars: { compare_label: ci === 1 ? "おおきい ほう" : "むきが ちがう ず", compare_idx: ci }
    };
  }

  var FIGURE_TEMPLATES = [
    // 1-A: 基本図形の識別 (単一選択, list)
    {
      templateId: "g1_shape_identification",
      grade: 1, difficultyLevel: 1,
      unitId: "shape_basic", conceptId: "shape_identify_basic",
      problemType: "figure", answerType: "single_choice",
      format: "ず を みて かたち を えらびましょう。",
      generate: {
        target_idx: { type: "integer", range: [1, 3] },
        rotation_seed: { type: "integer", range: [0, 3] }
      },
      answer: { expression: "target_idx", normalization: "integer" },
      hintSteps: ["かど の かず を かぞえて みよう。", "まるい かたち と しかく・さんかく を わけて みよう。"],
      explanationTemplate: "かたち の かず を かぞえて こたえよう。",
      understandingCheck: { enabled: false }
    },
    // 1-B: すべて選ぶ (複数選択, grid固定)
    {
      templateId: "g1_shape_select_all",
      grade: 1, difficultyLevel: 1,
      unitId: "shape_basic", conceptId: "shape_select_all",
      problemType: "figure", answerType: "multi_choice",
      format: "ず を みて かたち を すべて えらびましょう。",
      generate: {
        target_idx: { type: "integer", range: [1, 3] },
        pattern_seed: { type: "integer", range: [0, 2] }
      },
      answer: { expression: "target_idx", normalization: "integer" },
      hintSteps: ["ひとつずつ かど の かず を たしかめよう。", "みのがし が ないか もういちど みなおそう。"],
      explanationTemplate: "えらんだ カード を みんなで たしかめよう。",
      understandingCheck: { enabled: false }
    },
    // 1-C: 大小・向きの基礎比較 (単一選択, list)
    {
      templateId: "g1_shape_compare",
      grade: 1, difficultyLevel: 1,
      unitId: "shape_basic", conceptId: "shape_compare_size",
      problemType: "figure", answerType: "single_choice",
      format: "ず を みて こたえ を えらびましょう。",
      generate: {
        compare_idx: { type: "integer", range: [1, 2] },
        figure_seed: { type: "integer", range: [0, 2] }
      },
      answer: { expression: "compare_idx", normalization: "integer" },
      hintSteps: ["おおきさ を くらべて みよう。", "いちばん おおきい もの を さがそう。"],
      explanationTemplate: "くらべると いちばん の もの が こたえ だよ。",
      understandingCheck: { enabled: false }
    }
  ];

  function registerAll() {
    var reg = null;
    if (typeof window !== "undefined" && window.TemplateRegistry) reg = window.TemplateRegistry;
    else { try { reg = require("./registries.js").TemplateRegistry; } catch (e) {} }
    if (!reg) return;
    FIGURE_TEMPLATES.forEach(function (t) { try { reg.register(t); } catch (e) {} });
  }
  registerAll();

  var FigureShapeUI = {
    FIGURE_TEMPLATES: FIGURE_TEMPLATES,
    createFigureSVG: createFigureSVG,
    shapeCardHTML: shapeCardHTML,
    buildProblem: buildProblem,
    isSingleCorrect: isSingleCorrect,
    isMultiCorrect: isMultiCorrect,
    choicesSnapshot: choicesSnapshot
  };
  // question_source.js からの参照用 (Node と Browser の両方で有効)
  if (typeof globalThis !== "undefined") {
    globalThis.FigureShapeUI = FigureShapeUI;
  }
  if (typeof module !== "undefined" && module.exports) {
    module.exports = FigureShapeUI;
  } else {
    window.FIGURE_TEMPLATES = FIGURE_TEMPLATES;
    window.FigureShapeUI = FigureShapeUI;
  }
})();



