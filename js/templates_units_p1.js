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
      templateId: "g2_basic_length_02",
      grade: 2, difficultyLevel: 1,
      unitId: "length_unit", conceptId: "length_convert_m_cm",
      problemType: "calculation", answerType: "number_input",
      format: "{q_text}",
      generate: {
        type_idx: { type: "integer", range: [1, 3] },
        a: { type: "integer", range: [1, 9] },
        b: { type: "choice", values: [10, 20, 30, 40, 50, 60, 70, 80, 90] },
        q_text: {
          formula: "type_idx === 1 ? a + 'm = ?cm' : (type_idx === 2 ? (a * 100) + 'cm = ?m' : a + 'm' + b + 'cm = ?cm')"
        },
        answer: { formula: "type_idx === 1 ? a * 100 : (type_idx === 2 ? a : a * 100 + b)" }
      },
      answer: { expression: "answer", normalization: "integer" },
      hintSteps: [
        "1m は 100cm だよ。",
        "m を cm に なおす ときは 100を かけて、cm を m に なおす ときは 100で わろう。"
      ],
      explanationTemplate: "{q_text} の こたえは {answer} だね。",
      understandingCheck: {
        enabled: true, type: "choice",
        questionTemplate: "{q_text} の こたえは どれ？",
        choices: ["{answer}", "{wrong1}", "{wrong2}"],
        answer: "{answer}",
        generateWrong: {
          wrong1: { formula: "answer + 10" },
          wrong2: { formula: "answer + 100" }
        }
      }
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
      templateId: "g2_std_volume_02",
      grade: 2, difficultyLevel: 2,
      unitId: "volume_unit", conceptId: "volume_compare_basic",
      problemType: "calculation", answerType: "number_input",
      format: "{q_text}",
      generate: {
        type_idx: { type: "integer", range: [1, 6] },
        a: { type: "integer", range: [1, 4] },
        sign: { type: "choice", values: [1, -1] },
        base_idx: { formula: "type_idx > 3 ? type_idx - 3 : type_idx" },
        want_more: { formula: "type_idx > 3 ? 0 : 1" },
        delta: { formula: "base_idx === 1 ? 100 : (base_idx === 2 ? 1 : 10)" },
        unit_name: { formula: "base_idx === 2 ? 'dL' : 'mL'" },
        v1: { formula: "base_idx === 1 ? a * 1000 : (base_idx === 2 ? a * 10 : a * 100)" },
        v2: { formula: "v1 + sign * delta" },
        q_text: {
          formula: "((base_idx === 1 ? a + 'L' : (base_idx === 2 ? a + 'L' : a + 'dL')) + ' と ' + v2 + unit_name + ' では どちらが ' + (want_more === 1 ? '多い' : '少ない') + '？ ' + (want_more === 1 ? '多い' : '少ない') + ' ほうの かさを ' + unit_name + ' で こたえよう。')"
        },
        answer: {
          formula: "want_more === 1 ? (sign > 0 ? v2 : v1) : (sign > 0 ? v1 : v2)"
        }
      },
      answer: { expression: "answer", normalization: "integer" },
      hintSteps: [
        "1L は 1000mL、1L は 10dL、1dL は 100mL だよ。",
        "はじめに 2つを 同じ たんい に なおしてから くらべよう。"
      ],
      explanationTemplate: "2つを 同じ たんいに なおして くらべると、{want_more === 1 ? '多い' : '少ない'} ほうは {answer}{unit_name} だね。",
      understandingCheck: {
        enabled: true, type: "choice",
        questionTemplate: "{want_more === 1 ? '多い' : '少ない'} ほうの かさは どれ？",
        choices: ["{answer}", "{wrong1}", "{wrong2}"],
        answer: "{answer}",
        generateWrong: {
          wrong1: { formula: "want_more === 1 ? (sign > 0 ? v1 : v2) : (sign > 0 ? v2 : v1)" },
          wrong2: { formula: "answer + delta * 10" }
        }
      }
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
