/**
 * Figure Templates for Grade 3 (V2.7.0)
 *
 * V2.7.0 で導入した answerType: "figure_tap"（図の部品をタップして答える）の
 * 3年生向けテンプレート群。描画はすべて js/figure_svg.js (FigureSVG) に委譲する。
 *
 * 3つの単元:
 *   - angle_figure     角と三角形の種類（直角の頂点・直角をすべて・いちばん長い辺）
 *   - area_grid_figure 面積（方眼上场数を数える・同じ長さの辺をすべて）
 *   - solid_net_figure 立体と展開図（見える面・上の面・折り目）
 *
 * 回答形式:
 *   tap.mode = "single" ... 正解部品が1つ（タップで置き換え）
 *   tap.mode = "multi"  ... 正解部品が複数（タップの追加/解除）
 */
(function () {
  "use strict";

  var FIGURE_TEMPLATES_G3 = [
// ========== 単元A: angle_figure（角と三角形の種類） ==========
    {
      templateId: "g3_angle_right_vertex",
      grade: 3, difficultyLevel: 3,
      unitId: "angle_figure", conceptId: "angle_right_vertex",
      problemType: "figure", answerType: "figure_tap",
      format: "直角（□の マーク）がある ちょう点を タップしてね。",
      figureSpec: {
        shape: "triangle", variant: "right",
        marks: { rightAngle: ["A"] },
        labels: { vertices: ["A", "B", "C"] },
        tap: { kind: "vertex", mode: "single", select: { rightAngle: true }, hint: "□の マークが ある ちょう点を タップしてね。" }
      },
      generate: { pattern_seed: { type: "integer", range: [0, 2] } },
      answer: { expression: "pattern_seed", normalization: "integer" },
      hintSteps: ["□の マークが ある ところを探そう。", "それは 90度（まっすぐ）の 角だよ。"],
      explanationTemplate: "□の マークは 直角（90度）を 表すよ。",
      understandingCheck: { enabled: false }
    },
    {
      templateId: "g3_angle_rect_right_all",
      grade: 3, difficultyLevel: 3,
      unitId: "angle_figure", conceptId: "angle_right_all",
      problemType: "figure", answerType: "figure_tap",
      format: "長方形の 直角を すべて タップしてね。",
      figureSpec: {
        shape: "quadrilateral", variant: "rectangle",
        marks: { rightAngle: ["A", "B", "C", "D"] },
        tap: { kind: "angle", mode: "multi", select: { rightAngle: true }, hint: "かどの 内側を 4つ 全部 タップしてね。" }
      },
      generate: { pattern_seed: { type: "integer", range: [0, 2] } },
      answer: { expression: "pattern_seed", normalization: "integer" },
      hintSteps: ["長方形は 角的（かく）いくつ あるかな。", "4つ 全部が 直角だよ。"],
      explanationTemplate: "長方形の 4つの 角は すべて 直角（90度）だよ。",
      understandingCheck: { enabled: false }
    },
    {
      templateId: "g3_tri_longest_side",
      grade: 3, difficultyLevel: 3,
      unitId: "angle_figure", conceptId: "tri_longest_side",
      problemType: "figure", answerType: "figure_tap",
      format: "いちばん 長い 辺を タップしてね。",
      figureSpec: {
        shape: "triangle", variant: "general",
        tap: { kind: "edge", mode: "single", select: { longest: true }, hint: "3本の 辺を 比べて 、いちばん 長い 辺を タップしてね。" }
      },
      generate: { pattern_seed: { type: "integer", range: [0, 2] } },
      answer: { expression: "pattern_seed", normalization: "integer" },
      hintSteps: ["3本の 辺を 目で くらべてみよう。", "いちばん 長く 見える 辺を タップだよ。"],
      explanationTemplate: "三角形の いちばん 長い 辺は、いちばん 大きな 角の さきに あるよ。",
      understandingCheck: { enabled: false }
    },
// ========== 単元B: area_grid_figure（面積・方眼でかぞえる） ==========
    {
      templateId: "g3_area_square_sides",
      grade: 3, difficultyLevel: 3,
      unitId: "area_grid_figure", conceptId: "area_square_sides",
      problemType: "figure", answerType: "figure_tap",
      format: "方眼（こう眼）の 正方形の 4本の 辺を すべて タップしてね。",
      figureSpec: {
        shape: "quadrilateral", variant: "square",
        pxPerUnit: 26, grid: 1,
        labels: { edges: { AB: "4cm" } },
        tap: { kind: "edge", mode: "multi", select: { all: true }, hint: "図の まわりに ある 4本の 線を 全部 タップしてね。" }
      },
      generate: { pattern_seed: { type: "integer", range: [0, 2] } },
      answer: { expression: "pattern_seed", normalization: "integer" },
      hintSteps: ["方眼の まわりの 線（せん）を さがそう。", "4本 全部を タップだよ。"],
      explanationTemplate: "正方形の 面積は、たて 4マス × 4マス = 16 平方cm になるよ。",
      understandingCheck: { enabled: false }
    },
    {
      templateId: "g3_area_rect_sides",
      grade: 3, difficultyLevel: 3,
      unitId: "area_grid_figure", conceptId: "area_rect_sides",
      problemType: "figure", answerType: "figure_tap",
      format: "方眼（こう眼）の 長方形の 4本の 辺を すべて タップしてね。",
      figureSpec: {
        shape: "quadrilateral", variant: "rectangle",
        pxPerUnit: 24, grid: 1,
        tap: { kind: "edge", mode: "multi", select: { all: true }, hint: "図の まわりに ある 4本の 線を 全部 タップしてね。" }
      },
      generate: { pattern_seed: { type: "integer", range: [0, 2] } },
      answer: { expression: "pattern_seed", normalization: "integer" },
      hintSteps: ["方眼の まわりの 線（せん）を さがそう。", "4本 全部を タップだよ。"],
      explanationTemplate: "長方形の 面積は、たてのマス数 × よこのマス数 で 求（もと）められるよ。",
      understandingCheck: { enabled: false }
    },
    {
      templateId: "g3_area_square_equal_sides",
      grade: 3, difficultyLevel: 3,
      unitId: "area_grid_figure", conceptId: "area_square_equal_sides",
      problemType: "figure", answerType: "figure_tap",
      format: "長さが 同じ 辺を すべて タップしてね。",
      figureSpec: {
        shape: "quadrilateral", variant: "square",
        autoMarks: true,
        tap: { kind: "edge", mode: "multi", select: { equalSides: true }, hint: "//の マークが ある 辺を 全部 タップしてね。" }
      },
      generate: { pattern_seed: { type: "integer", range: [0, 2] } },
      answer: { expression: "pattern_seed", normalization: "integer" },
      hintSteps: ["同じ 印（じるし）が ある 辺を さがそう。", "正方形は 4本の 辺が すべて 同じ 長さだよ。"],
      explanationTemplate: "正方形は、4本の 辺が すべて おなじ 長さ だよ。",
      understandingCheck: { enabled: false }
    },
// ========== 単元C: solid_net_figure（立体と展開図） ==========
    {
      templateId: "g3_solid_cube_faces",
      grade: 3, difficultyLevel: 3,
      unitId: "solid_net_figure", conceptId: "solid_visible_faces",
      problemType: "figure", answerType: "figure_tap",
      format: "この立体の みえる 面（めん）を すべて タップしてね。",
      figureSpec: {
        shape: "solid", variant: "cube",
        tap: { kind: "face", mode: "multi", select: { all: true }, hint: "図の なかの 面（めん）を すべて タップしてね。" }
      },
      generate: { pattern_seed: { type: "integer", range: [0, 2] } },
      answer: { expression: "pattern_seed", normalization: "integer" },
      hintSteps: ["図の なかの 面（めん）を さがそう。", "かくれた 3つの 面が みえるよ。"],
      explanationTemplate: "立体の 図で みえる 面は 3つ だよ（あと 3つは みえない）。",
      understandingCheck: { enabled: false }
    },
    {
      templateId: "g3_solid_cuboid_top_face",
      grade: 3, difficultyLevel: 3,
      unitId: "solid_net_figure", conceptId: "solid_top_face",
      problemType: "figure", answerType: "figure_tap",
      format: "この立体の 上の 面（めん）を タップしてね。",
      figureSpec: {
        shape: "solid", variant: "cuboid",
        tap: { kind: "face", mode: "single", select: { topFace: true }, hint: "いちばん たかい ところにある 面を タップしてね。" }
      },
      generate: { pattern_seed: { type: "integer", range: [0, 2] } },
      answer: { expression: "pattern_seed", normalization: "integer" },
      hintSteps: ["3つの 面の うち、いちばん たかい 面は どれかな。", "上の 面（うえの めん）を タップだよ。"],
      explanationTemplate: "いちばん たかい 位置にある 面が「上の面」だよ。",
      understandingCheck: { enabled: false }
    },
    {
      templateId: "g3_net_cuboid_fold_lines",
      grade: 3, difficultyLevel: 3,
      unitId: "solid_net_figure", conceptId: "net_fold_lines",
      problemType: "figure", answerType: "figure_tap",
      format: "この 展開図（てんらくず）の 折りめ線（おりめせん）を すべて タップしてね。",
      figureSpec: {
        shape: "net", variant: "cuboid_net",
        tap: { kind: "edge", mode: "multi", select: { all: true }, hint: "破線（はせん）を さがして 全部 タップしてね。" }
      },
      generate: { pattern_seed: { type: "integer", range: [0, 2] } },
      answer: { expression: "pattern_seed", normalization: "integer" },
      hintSteps: ["破線（はせん）は どこにあるかな。", "折り目（おりめ）は 破線 で えがかれているよ。"],
      explanationTemplate: "展開図の 破線は 折り目（おりめ）を 表すよ。そこを 折ると 立体 になるよ。",
      understandingCheck: { enabled: false }
    }
  ];

  function registerAll() {
    var reg = null;
    if (typeof window !== "undefined" && window.TemplateRegistry) reg = window.TemplateRegistry;
    else { try { reg = require("./registries.js").TemplateRegistry; } catch (e) {} }
    if (!reg) return;
    FIGURE_TEMPLATES_G3.forEach(function (t) { try { reg.register(t); } catch (e) {} });
  }
  registerAll();

  var FigureShapeUI_G3 = { FIGURE_TEMPLATES_G3: FIGURE_TEMPLATES_G3 };
  if (typeof globalThis !== "undefined") globalThis.FigureShapeUI_G3 = FigureShapeUI_G3;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = FigureShapeUI_G3;
  } else {
    window.FIGURE_TEMPLATES_G3 = FIGURE_TEMPLATES_G3;
    window.FigureShapeUI_G3 = FigureShapeUI_G3;
  }
})();