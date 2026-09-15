/**
 * Unit Templates part 1 (length/volume/weight/time)
 */
(function () {
  var T = [
    {
      templateId: "g2_basic_length_01",
      grade: 2, difficultyLevel: 1,
      unitId: "length_unit", conceptId: "length_convert_basic",
      problemType: "calculation", answerType: "number_input",
      format: "{a}cm = ?mm",
      generate: {
        a: { type: "integer", range: [1, 9] },
        answer: { formula: "a * 10" }
      },
      answer: { expression: "answer", normalization: "integer" },
      hintSteps: ["1cm は 10mm だよ。", "{a}cm は {a} × 10 で求めよう。"],
      explanationTemplate: "{a}cm は {a} × 10 = {answer}mm だね。",
      understandingCheck: { enabled: false }
    },
    {
      templateId: "g3_std_length_01",
      grade: 3, difficultyLevel: 2,
      unitId: "length_unit", conceptId: "length_convert_m_km",
      problemType: "calculation", answerType: "number_input",
      format: "{q_text}",
      generate: {
        type_idx: { type: "integer", range: [1, 2] },
        a: { type: "integer", range: [1, 9] },
        q_text: { formula: "type_idx === 1 ? a + 'm = ?cm' : a + 'km = ?m'" },
        answer: { formula: "type_idx === 1 ? a * 100 : a * 1000" }
      },
      answer: { expression: "answer", normalization: "integer" },
      hintSteps: ["1m は 100cm、1km は 1000m だよ。", "かけ算で求めよう。"],
      explanationTemplate: "{q_text} の答えは {answer} だね。",
      understandingCheck: { enabled: false }
    },
    {
      templateId: "g2_std_volume_unit_01",
      grade: 2, difficultyLevel: 2,
      unitId: "volume_unit", conceptId: "volume_convert_basic",
      problemType: "calculation", answerType: "number_input",
      format: "{q_text}",
      generate: {
        type_idx: { type: "integer", range: [1, 2] },
        a: { type: "integer", range: [1, 9] },
        q_text: { formula: "type_idx === 1 ? a + 'L = ?dL' : a + 'dL = ?mL'" },
        answer: { formula: "type_idx === 1 ? a * 10 : a * 100" }
      },
      answer: { expression: "answer", normalization: "integer" },
      hintSteps: ["1L は 10dL、1dL は 100mL だよ。", "倍数をかけて求めよう。"],
      explanationTemplate: "{q_text} の答えは {answer} だね。",
      understandingCheck: { enabled: false }
    },
    {
      templateId: "g3_std_weight_01",
      grade: 3, difficultyLevel: 2,
      unitId: "weight_unit", conceptId: "weight_convert_basic",
      problemType: "calculation", answerType: "number_input",
      format: "{q_text}",
      generate: {
        type_idx: { type: "integer", range: [1, 2] },
        a: { type: "integer", range: [1, 5] },
        b100: { type: "integer", range: [1, 9] },
        q_text: { formula: "type_idx === 1 ? a + 'kg = ?g' : a + 'kg' + (b100 * 100) + 'g = ?g'" },
        answer: { formula: "type_idx === 1 ? a * 1000 : a * 1000 + b100 * 100" }
      },
      answer: { expression: "answer", normalization: "integer" },
      hintSteps: ["1kg は 1000g だよ。", "kg を g に直してから足そう。"],
      explanationTemplate: "{q_text} の答えは {answer}g だね。",
      understandingCheck: { enabled: false }
    },
    {
      templateId: "g3_std_time_01",
      grade: 3, difficultyLevel: 2,
      unitId: "time_unit", conceptId: "time_convert_calc",
      problemType: "calculation", answerType: "number_input",
      format: "{q_text}",
      generate: {
        type_idx: { type: "integer", range: [1, 3] },
        a: { type: "integer", range: [1, 5] },
        b: { type: "integer", range: [1, 9] },
        q_text: { formula: "type_idx === 1 ? a + '時間 = ?分' : (type_idx === 2 ? b + '分 = ?秒' : '午前' + b + '時から' + a + '時間後は ?時')" },
        answer: { formula: "type_idx === 1 ? a * 60 : (type_idx === 2 ? b * 60 : b + a)" }
      },
      answer: { expression: "answer", normalization: "integer" },
      hintSteps: ["1時間は60分、1分は60秒だよ。", "時計を思い浮かべて進めよう。"],
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
    module.exports = { UNIT_TEMPLATES_P1: T };
  } else {
    window.UNIT_TEMPLATES_P1 = T;
  }
})();
