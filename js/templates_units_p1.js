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
      // V2.9.11: 誤答は _buildWrongChoices が正解から自動生成する
      understandingCheck: {
        enabled: true, type: "choice",
        choices: ["{answer}", "{wrong1}", "{wrong2}"],
        answer: "{answer}"
      }
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
      // V2.9.11: 誤答は _buildWrongChoices が正解から自動生成する
      understandingCheck: {
        enabled: true, type: "choice",
        choices: ["{answer}", "{wrong1}", "{wrong2}"],
        answer: "{answer}"
      }
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
      // V2.9.11: 誤答は _buildWrongChoices が正解から自動生成する
      understandingCheck: {
        enabled: true, type: "choice",
        choices: ["{answer}", "{wrong1}", "{wrong2}"],
        answer: "{answer}"
      }
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
      // V2.9.11: 誤答は _buildWrongChoices が正解から自動生成する
      understandingCheck: {
        enabled: true, type: "choice",
        choices: ["{answer}", "{wrong1}", "{wrong2}"],
        answer: "{answer}"
      }
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
      // V2.9.11: 誤答は _buildWrongChoices が正解から自動生成する
      understandingCheck: {
        enabled: true, type: "choice",
        choices: ["{answer}", "{wrong1}", "{wrong2}"],
        answer: "{answer}"
      }
    },

    // ==========================================
    // fraction_meaning (3年 Lv2): 分数の意味と表し方
    // V2.9.10: 学習指導要領（解説 平成29年告示）3年 A(6) 対応。
    // 「単位分数及びそれを幾つか集めた分数について，その意味と表し方について理解し，
    //  簡単な場合について，分数の加法・減法の計算ができるようにする」
    // 2年の fraction_intro（図で 1/2・1/4 を識別）から一歩進み、
    // 分子・分母が何を表すか／単位分数を幾つ集めたか／同分母の加減の「上の数」を問う。
    // ※ answerType は number_input（integer）。numpad に "/" キーはあるが採点は数値比較
    //   （_checkAnswer は parseFloat）なので、答えは「上の数（分子）」だけに限定する。
    //   5年 g5_basic_frac_add_01 と同じ規約。
    // ==========================================
    {
      templateId: "g3_basic_fraction_01",
      grade: 3, difficultyLevel: 2,
      unitId: "fraction_meaning", conceptId: "fraction_num_den_meaning",
      problemType: "calculation", answerType: "number_input",
      format: "{q_text}",
      generate: {
        type_idx: { type: "integer", range: [1, 3] },
        denom: { type: "choice", values: [2, 3, 4, 5, 6, 8, 10] },
        // 3年 A(6) は約分を扱わないため、既約分数（分子と分母が互いに素）のみ出題する
        numer: { type: "integer", range: [1, 5], constraints: ["numer < denom", "((x,y)=>{while(y){const t=y;y=x%y;x=t;}return x;})(numer,denom)===1"] },
        ask_part: { formula: "type_idx === 3 ? '下の数（分母）' : '上の数（分子）'" },
        q_text: {
          formula: "type_idx === 1 ? 'ぜんぶを 同じ 大きさに ' + denom + 'こに 分けて、そのうち ' + numer + 'こ 分を とりました。この 分数を 表すと「' + numer + '/' + denom + '」です。' + ask_part + ' は いくつ？' : (type_idx === 2 ? '「' + numer + '/' + denom + '」の ' + ask_part + ' は いくつ？' : '「' + numer + '/' + denom + '」の ' + ask_part + ' は なんこに 分けたか を 表しています。いくつ？')"
        },
        answer: { formula: "type_idx === 3 ? denom : numer" }
      },
      answer: { expression: "answer", normalization: "integer" },
      hintSteps: [
        "分数の 上の数は「なんこ 分を とったか」、下の数は「なんこに 分けたか」を 表しているよ。",
        "「{numer}/{denom}」は {denom}こに 分けて {numer}こ 分を とった 分数だね。"
      ],
      explanationTemplate: "「{numer}/{denom}」の 上の数は {numer}、下の数は {denom}。だから {ask_part} は {answer} だね。",
      understandingCheck: {
        enabled: true, type: "choice",
        questionTemplate: "「{numer}/{denom}」の {ask_part} は どれ？",
        choices: ["{answer}", "{wrong1}", "{wrong2}"],
        answer: "{answer}",
        generateWrong: {
          wrong1: { formula: "type_idx === 3 ? numer : denom" },
          wrong2: { formula: "answer + 1" }
        }
      }
    },
    {
      templateId: "g3_basic_fraction_02",
      grade: 3, difficultyLevel: 2,
      unitId: "fraction_meaning", conceptId: "unit_fraction_count",
      problemType: "calculation", answerType: "number_input",
      format: "{q_text}",
      generate: {
        type_idx: { type: "integer", range: [1, 3] },
        denom: { type: "choice", values: [2, 3, 4, 5, 6, 8, 10] },
        // 既約分数のみ（約分は3年範囲外）。1/2 を1つ = 1 になるので count は2以上
        count: { type: "integer", range: [2, 5], constraints: ["count < denom", "((x,y)=>{while(y){const t=y;y=x%y;x=t;}return x;})(count,denom)===1"] },
        ask_part: { formula: "type_idx === 3 ? '下の数（分母）' : '上の数（分子）'" },
        q_text: {
          formula: "type_idx === 1 ? '1/' + denom + ' を ' + count + 'つ あつめました。なん分の いくつ ですか。' + ask_part + ' は いくつ？' : (type_idx === 2 ? 'ぜんぶを ' + denom + 'こに 分けると 1こ 分は 1/' + denom + ' です。これを ' + count + 'こ 分 あつめると ' + ask_part + ' は いくつ？' : '1/' + denom + ' を ' + count + 'つ あつめると、なん分の いくつ に なりますか。' + ask_part + ' は いくつ？')"
        },
        answer: { formula: "type_idx === 3 ? denom : count" }
      },
      answer: { expression: "answer", normalization: "integer" },
      hintSteps: [
        "単位分数 1/{denom} を なんこ あつめたかが そのまま 上の数に なるよ。",
        "下の数は ぜんぶを なんこに 分けたか なので、あつめても 変わらないよ。"
      ],
      explanationTemplate: "1/{denom} を {count}つ あつめると {count}/{denom}。上の数は {count}、下の数は {denom}。だから {ask_part} は {answer} だね。",
      understandingCheck: {
        enabled: true, type: "choice",
        questionTemplate: "1/{denom} を {count}つ あつめた 分数の {ask_part} は どれ？",
        choices: ["{answer}", "{wrong1}", "{wrong2}"],
        answer: "{answer}",
        generateWrong: {
          wrong1: { formula: "type_idx === 3 ? count : denom" },
          wrong2: { formula: "answer + 1" }
        }
      }
    },
    {
      templateId: "g3_basic_fraction_03",
      grade: 3, difficultyLevel: 2,
      unitId: "fraction_meaning", conceptId: "fraction_add_same_denom_intro",
      problemType: "calculation", answerType: "number_input",
      format: "{q_text}",
      generate: {
        type_idx: { type: "integer", range: [1, 2] },
        // 分母は分子（1〜4）と互いに素な値のみ。a・b・a±b が分母と互いに素である既約性を
        // 下の constraint で保証する（約分は3年範囲外）
        denom: { type: "choice", values: [5, 6, 7, 8, 9, 10, 11, 12] },
        a: { type: "integer", range: [1, 6], constraints: ["a < denom", "((x,y)=>{while(y){const t=y;y=x%y;x=t;}return x;})(a,denom)===1"] },
        b: { type: "integer", range: [1, 6], constraints: [
          "b < denom",
          "a !== b",
          "((x,y)=>{while(y){const t=y;y=x%y;x=t;}return x;})(b,denom)===1",
          "type_idx === 1 ? a + b < denom : a > b",
          "type_idx === 1 ? ((x,y)=>{while(y){const t=y;y=x%y;x=t;}return x;})(a+b,denom)===1 : ((x,y)=>{while(y){const t=y;y=x%y;x=t;}return x;})(a-b,denom)===1"
        ] },
        op: { formula: "type_idx === 1 ? '+' : '−'" },
        q_text: {
          formula: "a + '/' + denom + ' ' + op + ' ' + b + '/' + denom + ' の こたえは なん分の いくつ ですか。こたえの 上の数（分子）は いくつ？'"
        },
        answer: { formula: "type_idx === 1 ? a + b : a - b" }
      },
      answer: { expression: "answer", normalization: "integer" },
      hintSteps: [
        "下の数（分母）が 同じ 分数どうしの 計算は、下の数は そのまま だよ。",
        "上の数 どうしを {op} しよう。"
      ],
      explanationTemplate: "下の数は そのまま 上の数 どうしを 計算すると {a} {op} {b} = {answer}。だから こたえは {answer}/{denom} だね。",
      understandingCheck: {
        enabled: true, type: "choice",
        questionTemplate: "{a}/{denom} {op} {b}/{denom} の こたえの 上の数 は どれ？",
        choices: ["{answer}", "{wrong1}", "{wrong2}"],
        answer: "{answer}",
        generateWrong: {
          wrong1: { formula: "type_idx === 1 ? a : a + b" },
          wrong2: { formula: "answer + 1" }
        }
      }
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
