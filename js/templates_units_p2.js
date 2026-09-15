/**
 * Unit Templates part 2 (area/volume/circle)
 */
(function () {
  var T = [
    {
      templateId: "g4_std_area_01",
      grade: 4, difficultyLevel: 2,
      unitId: "area_basic", conceptId: "area_rectangle_square",
      problemType: "calculation", answerType: "number_input",
      format: "{q_text}",
      generate: {
        type_idx: { type: "integer", range: [1, 2] },
        a: { type: "integer", range: [2, 9] },
        b: { type: "integer", range: [2, 9] },
        q_text: { formula: "type_idx === 1 ? 'たて' + a + 'cm よこ' + b + 'cm の長方形の面積は ?平方cm' : '1辺' + a + 'cm の正方形の面積は ?平方cm'" },
        answer: { formula: "type_idx === 1 ? a * b : a * a" }
      },
      answer: { expression: "answer", normalization: "integer" },
      hintSteps: ["長方形は たて×よこ、正方形は 辺×辺だよ。", "かけ算で求めよう。"],
      explanationTemplate: "答えは {answer}平方cm だね。",
      understandingCheck: { enabled: false }
    },
    {
      templateId: "g5_basic_volume_01",
      grade: 5, difficultyLevel: 2,
      unitId: "volume_basic", conceptId: "volume_cuboid",
      problemType: "calculation", answerType: "number_input",
      format: "たて{a}cm よこ{b}cm 高さ{c}cm の直方体の体積は ?立方cm",
      generate: {
        a: { type: "integer", range: [2, 5] },
        b: { type: "integer", range: [2, 5] },
        c: { type: "integer", range: [2, 5] },
        answer: { formula: "a * b * c" }
      },
      answer: { expression: "answer", normalization: "integer" },
      hintSteps: ["直方体は たて×よこ×高さだよ。", "順にかけ算しよう。"],
      explanationTemplate: "たて{a}×よこ{b}×高さ{c} = {answer}立方cm だね。",
      understandingCheck: { enabled: false }
    },
    {
      templateId: "g6_std_circle_01",
      grade: 6, difficultyLevel: 2,
      unitId: "circle_basic", conceptId: "circle_circumference_area",
      problemType: "calculation", answerType: "number_input",
      format: "{q_text}",
      generate: {
        type_idx: { type: "integer", range: [1, 2] },
        r: { type: "integer", range: [2, 5] },
        q_text: { formula: "type_idx === 1 ? '半径' + r + 'cm の円の円周は ?cm（円周率3.14）' : '半径' + r + 'cm の円の面積は ?平方cm（円周率3.14）'" },
        answer: { formula: "type_idx === 1 ? r * 2 * 3.14 : r * r * 3.14" }
      },
      answer: { expression: "answer", normalization: "decimal" },
      hintSteps: ["円周は 直径×3.14、面積は 半径×半径×3.14だよ。", "小数のかけ算に気をつけよう。"],
      explanationTemplate: "{q_text} の答えは {answer} だね。",
      understandingCheck: { enabled: false }
    }
  ];
  function registerAll() {
    var reg = null;
    if (typeof window !== "undefined" && window.TemplateRegistry) reg = window.TemplateRegistry;
    else { try { reg = require("./registries.js").TemplateRegistry; } catch (e) {} }
    if (!reg) return;
    T.forEach(function (t) { try { reg.register(t); } catch (e) {} });
  }
  registerAll();
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { UNIT_TEMPLATES_P2: T };
  } else {
    window.UNIT_TEMPLATES_P2 = T;
  }
})();
