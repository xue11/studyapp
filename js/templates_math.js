/**
 * Math Problem Templates (Grade 1 to 6)
 * V2.5.10 詳細設計書 第6章・第7章 準拠
 */

// Node.js / ブラウザ環境の TemplateRegistry 解決
let TemplateRegistryModule = typeof window !== "undefined" ? window.TemplateRegistry : null;
if (typeof require !== "undefined") {
  try {
    TemplateRegistryModule = require("./registries.js").TemplateRegistry;
  } catch (e) {}
}

const MATH_TEMPLATES = [
  // ==========================================
  // 小学1年生 (Grade 1)
  // ==========================================
  // Lv1: add_1digit_no_carry (くり上がりなし足し算)
  {
    templateId: "g1_basic_add_01",
    grade: 1, difficultyLevel: 1,
    unitId: "add_1digit_no_carry", conceptId: "add_basic",
    problemType: "calculation", answerType: "number_input",
    format: "{a} + {b} = ?",
    formats: ["{a} + {b} = ?", "{a} たす {b} は？", "{a} と {b} を たすと？"],
    commutativePairs: [["a", "b"]],
    generate: {
      a: { type: "integer", range: [1, 8] },
      b: { type: "integer", range: [1, 8], constraints: ["a + b <= 9"] },
      answer: { formula: "a + b" }
    },
    answer: { expression: "answer", normalization: "integer" },
    hintSteps: ["{a} に {b} を あわせると いくつになるかな？", "ゆびや ブロックを つかって かぞえてみよう。"],
    explanationTemplate: "{a} + {b} は、あわせると {answer} になるね。",
    understandingCheck: {
      enabled: true, type: "choice",
      questionTemplate: "{a} と {b} を あわせた かずは どれかな？",
      choices: ["{answer}", "{wrong1}", "{wrong2}"],
      answer: "{answer}",
      generateWrong: {
        wrong1: { formula: "answer + 1" },
        wrong2: { formula: "answer > 2 ? answer - 1 : answer + 2" }
      }
    }
  },
  // Lv1: sub_1digit_no_borrow (くり下がりなし引き算)
  {
    templateId: "g1_basic_sub_01",
    grade: 1, difficultyLevel: 1,
    unitId: "sub_1digit_no_borrow", conceptId: "sub_basic",
    problemType: "calculation", answerType: "number_input",
    format: "{a} - {b} = ?",
    formats: ["{a} - {b} = ?", "{a} ひく {b} は？", "{a} から {b} を ひくと？"],
    generate: {
      a: { type: "integer", range: [2, 9] },
      b: { type: "integer", range: [1, 8], constraints: ["a > b"] },
      answer: { formula: "a - b" }
    },
    answer: { expression: "answer", normalization: "integer" },
    hintSteps: ["{a} から {b} を ひくと のこりは いくつかな？", "{a} から {b}こ へらしてみよう。"],
    explanationTemplate: "{a} - {b} は、{a} から {b} を ひくので {answer} だね。",
    understandingCheck: {
      enabled: true, type: "choice",
      questionTemplate: "{a} から {b} を とった のこりは どれかな？",
      choices: ["{answer}", "{wrong1}", "{wrong2}"],
      answer: "{answer}",
      generateWrong: {
        wrong1: { formula: "answer + 1" },
        wrong2: { formula: "answer > 1 ? answer - 1 : answer + 2" }
      }
    }
  },
  // Lv1: number_bond_10 (10の合成・分解)
  {
    templateId: "g1_basic_bond_01",
    grade: 1, difficultyLevel: 1,
    unitId: "number_bond_10", conceptId: "number_bond_10",
    problemType: "calculation", answerType: "number_input",
    format: "{a} と あと いくつで 10 になる？",
    generate: {
      a: { type: "integer", range: [1, 9] },
      answer: { formula: "10 - a" }
    },
    answer: { expression: "answer", normalization: "integer" },
    hintSteps: ["10このたまごパックを おもいうかべてみよう。", "{a} に なにかを たして 10 になる かずを さがそう。"],
    explanationTemplate: "{a} と {answer} で 10 になるよ。",
    understandingCheck: {
      enabled: true, type: "choice",
      questionTemplate: "{a} + ? = 10 の ? は どれ？",
      choices: ["{answer}", "{wrong1}", "{wrong2}"],
      answer: "{answer}",
      generateWrong: {
        wrong1: { formula: "answer + 1 <= 9 ? answer + 1 : answer - 2" },
        wrong2: { formula: "answer > 1 ? answer - 1 : answer + 2" }
      }
    }
  },
  // Lv2: add_1digit_carry (くり上がり足し算)
  {
    templateId: "g1_std_add_carry_01",
    grade: 1, difficultyLevel: 2,
    unitId: "add_1digit_carry", conceptId: "add_carry_10",
    problemType: "calculation", answerType: "number_input",
    format: "{a} + {b} = ?",
    formats: ["{a} + {b} = ?", "{a} たす {b} は？"],
    commutativePairs: [["a", "b"]],
    generate: {
      a: { type: "integer", range: [6, 9] },
      b: { type: "integer", range: [2, 9], constraints: ["a + b >= 11", "a + b <= 18"] },
      answer: { formula: "a + b" },
      needFor10: { formula: "10 - a" },
      remain: { formula: "b - (10 - a)" }
    },
    answer: { expression: "answer", normalization: "integer" },
    hintSteps: ["まず {a} に あと いくつで 10 になるかな？", "{b} を {needFor10} と {remain} に わけて かんがえてみよう。"],
    explanationTemplate: "{a} + {b} は、10のまとまりを作って {answer} になるね。",
    understandingCheck: {
      enabled: true, type: "choice",
      questionTemplate: "{a} + {b} の こたえは どれかな？",
      choices: ["{answer}", "{wrong1}", "{wrong2}"],
      answer: "{answer}",
      generateWrong: {
        wrong1: { formula: "answer - 1" },
        wrong2: { formula: "answer + 1" }
      }
    }
  },
  // Lv2: sub_teen_borrow (くり下がり引き算)
  {
    templateId: "g1_std_sub_borrow_01",
    grade: 1, difficultyLevel: 2,
    unitId: "sub_teen_borrow", conceptId: "sub_borrow_10",
    problemType: "calculation", answerType: "number_input",
    format: "{a} - {b} = ?",
    generate: {
      a: { type: "integer", range: [11, 18] },
      b: { type: "integer", range: [2, 9], constraints: ["a - 10 < b", "a - b < 10"] },
      answer: { formula: "a - b" }
    },
    answer: { expression: "answer", normalization: "integer" },
    hintSteps: ["{a} を 10 と {a - 10} に わけてみよう。", "10 から {b} を ひいて、のこりの {a - 10} を たしてみよう。"],
    explanationTemplate: "{a} - {b} は、10から{b}をひいて {10 - b}、それに {a - 10} をたして {answer} だね。",
    understandingCheck: {
      enabled: true, type: "choice",
      questionTemplate: "{a} - {b} の こたえは どれ？",
      choices: ["{answer}", "{wrong1}", "{wrong2}"],
      answer: "{answer}",
      generateWrong: {
        wrong1: { formula: "answer + 1" },
        wrong2: { formula: "answer - 1" }
      }
    }
  },
  // Lv3: add_sub_3terms_10 (3つの数の計算)
  {
    templateId: "g1_adv_3terms_01",
    grade: 1, difficultyLevel: 3,
    unitId: "add_sub_3terms_10", conceptId: "three_terms_add_sub",
    problemType: "calculation", answerType: "number_input",
    format: "{a} + {b} - {c} = ?",
    generate: {
      a: { type: "integer", range: [2, 6] },
      b: { type: "integer", range: [1, 4], constraints: ["a + b <= 10"] },
      c: { type: "integer", range: [1, 5], constraints: ["a + b > c"] },
      answer: { formula: "a + b - c" }
    },
    answer: { expression: "answer", normalization: "integer" },
    hintSteps: ["まえの 2つの けいさん {a} + {b} を まづ やってみよう。", "でてきた かずから {c} を ひいてみよう。"],
    explanationTemplate: "まず {a} + {b} = {a + b}、つぎに {a + b} - {c} = {answer} だね。",
    understandingCheck: {
      enabled: true, type: "choice",
      questionTemplate: "{a} + {b} - {c} の こたえは どれ？",
      choices: ["{answer}", "{wrong1}", "{wrong2}"],
      answer: "{answer}",
      generateWrong: {
        wrong1: { formula: "answer + 1" },
        wrong2: { formula: "answer > 1 ? answer - 1 : answer + 2" }
      }
    }
  },
  // Lv3: add_sub_3terms_20 (3つの数の計算 20まで)
  {
    templateId: "g1_adv_3terms_20_01",
    grade: 1, difficultyLevel: 3,
    unitId: "add_sub_3terms_20", conceptId: "three_terms_add_sub_20",
    problemType: "calculation", answerType: "number_input",
    format: "{a} + {b} + {c} = ?",
    generate: {
      a: { type: "integer", range: [3, 8] },
      b: { type: "integer", range: [3, 7] },
      c: { type: "integer", range: [2, 5], constraints: ["a + b + c <= 20"] },
      answer: { formula: "a + b + c" }
    },
    answer: { expression: "answer", normalization: "integer" },
    hintSteps: ["じゅんばんに たしていこう。まず {a} + {b} は？", "その こたえに {c} を たしてみよう。"],
    explanationTemplate: "{a} + {b} = {a + b}、それに {c} をたして {answer} だね。",
    understandingCheck: {
      enabled: true, type: "choice",
      questionTemplate: "{a} + {b} + {c} の こたえは どれ？",
      choices: ["{answer}", "{wrong1}", "{wrong2}"],
      answer: "{answer}",
      generateWrong: {
        wrong1: { formula: "answer + 1" },
        wrong2: { formula: "answer - 1" }
      }
    }
  },

  // ==========================================
  // 小学2年生 (Grade 2)
  // ==========================================
  // Lv1: add_2digit_no_carry
  {
    templateId: "g2_basic_add_01",
    grade: 2, difficultyLevel: 1,
    unitId: "addition_2digit", conceptId: "add_2digit_basic",
    problemType: "calculation", answerType: "number_input",
    format: "{a} + {b} = ?",
    commutativePairs: [["a", "b"]],
    generate: {
      a: { type: "integer", range: [11, 45] },
      b: { type: "integer", range: [11, 44], constraints: ["(a % 10) + (b % 10) <= 9"] },
      answer: { formula: "a + b" }
    },
    hissanSpec: { op: "add", a: "{a}", b: "{b}" },
    answer: { expression: "answer", normalization: "integer" },
    hintSteps: ["一の位どうし、十の位どうしをそれぞれ足してみよう。", "{a % 10} + {b % 10} と {Math.floor(a/10)} + {Math.floor(b/10)} を計算しよう。"],
    explanationTemplate: "一の位は {a % 10} + {b % 10} = {(a%10)+(b%10)}、十の位は {Math.floor(a/10)} + {Math.floor(b/10)} = {Math.floor((a+b)/10)} だから {answer} だね。",
    understandingCheck: {
      enabled: true, type: "choice",
      questionTemplate: "{a} + {b} の答えはどれかな？",
      choices: ["{answer}", "{wrong1}", "{wrong2}"],
      answer: "{answer}",
      generateWrong: {
        wrong1: { formula: "answer + 10" },
        wrong2: { formula: "answer - 1" }
      }
    }
  },
  // Lv1: sub_2digit_no_borrow
  {
    templateId: "g2_basic_sub_01",
    grade: 2, difficultyLevel: 1,
    unitId: "subtraction_2digit", conceptId: "sub_2digit_basic",
    problemType: "calculation", answerType: "number_input",
    format: "{a} - {b} = ?",
    generate: {
      a: { type: "integer", range: [35, 89] },
      b: { type: "integer", range: [11, 34], constraints: ["(a % 10) >= (b % 10)"] },
      answer: { formula: "a - b" }
    },
    hissanSpec: { op: "sub", a: "{a}", b: "{b}" },
    answer: { expression: "answer", normalization: "integer" },
    hintSteps: ["一の位どうし、十の位どうしをひいてみよう。", "{a % 10} - {b % 10} はいくつかな？"],
    explanationTemplate: "一の位は {a % 10} - {b % 10} = {(a%10)-(b%10)}、十の位は {Math.floor(a/10)} - {Math.floor(b/10)} = {Math.floor((a-b)/10)} だから {answer} だね。",
    understandingCheck: {
      enabled: true, type: "choice",
      questionTemplate: "{a} - {b} の答えはどれかな？",
      choices: ["{answer}", "{wrong1}", "{wrong2}"],
      answer: "{answer}",
      generateWrong: {
        wrong1: { formula: "answer + 10" },
        wrong2: { formula: "answer - 10" }
      }
    }
  },
  // Lv2: kuku_intro (九九 2〜5の段)
  {
    templateId: "g2_std_kuku_01",
    grade: 2, difficultyLevel: 2,
    unitId: "multiplication_g2", conceptId: "kuku_basic_groups",
    problemType: "calculation", answerType: "number_input",
    format: "{a} × {b} = ?",
    formats: ["{a} × {b} = ?", "{a} の {b} ばい は いくつ？", "{a} × {b} は？"],
    generate: {
      a: { type: "integer", range: [2, 5] },
      b: { type: "integer", range: [1, 9] },
      answer: { formula: "a * b" }
    },
    answer: { expression: "answer", normalization: "integer" },
    hintSteps: ["{a} のだんの 九九を じゅんばんに となえてみよう。", "{a} が {b}こ あると かんがえてみよう。"],
    explanationTemplate: "{a} × {b} は、{a}のだんの九九で {answer} だね。",
    understandingCheck: {
      enabled: true, type: "choice",
      questionTemplate: "{a} × {b} の答えはどれ？",
      choices: ["{answer}", "{wrong1}", "{wrong2}"],
      answer: "{answer}",
      generateWrong: {
        wrong1: { formula: "answer + a" },
        wrong2: { formula: "answer > a ? answer - a : answer + 2*a" }
      }
    }
  },
  // Lv2: add_2digit_carry (2けたのくり上がり足し算)
  {
    templateId: "g2_std_add_carry_01",
    grade: 2, difficultyLevel: 2,
    unitId: "addition_2digit", conceptId: "addition_2digit",
    problemType: "calculation", answerType: "number_input",
    format: "{a} + {b} = ?",
    commutativePairs: [["a", "b"]],
    generate: {
      a: { type: "integer", range: [18, 59] },
      b: { type: "integer", range: [15, 38], constraints: ["(a % 10) + (b % 10) >= 10"] },
      answer: { formula: "a + b" }
    },
    hissanSpec: { op: "add", a: "{a}", b: "{b}", showCarry: true },
    answer: { expression: "answer", normalization: "integer" },
    hintSteps: ["一の位を足すと 10以上になるから、十の位に 1 くり上げよう。", "十の位は {Math.floor(a/10)} + {Math.floor(b/10)} + 1 だね。"],
    explanationTemplate: "一の位のくり上がりを十の位に足して、答えは {answer} だね。",
    understandingCheck: {
      enabled: true, type: "choice",
      questionTemplate: "{a} + {b} の答えはどれ？",
      choices: ["{answer}", "{wrong1}", "{wrong2}"],
      answer: "{answer}",
      generateWrong: {
        wrong1: { formula: "answer - 10" },
        wrong2: { formula: "answer + 1" }
      }
    }
  },
  // Lv2: sub_2digit_borrow (2けたのくり下がり引き算)
  {
    templateId: "g2_std_sub_borrow_01",
    grade: 2, difficultyLevel: 2,
    unitId: "subtraction_2digit", conceptId: "subtraction_2digit",
    problemType: "calculation", answerType: "number_input",
    format: "{a} - {b} = ?",
    generate: {
      a: { type: "integer", range: [41, 85] },
      b: { type: "integer", range: [16, 39], constraints: ["(a % 10) < (b % 10)"] },
      answer: { formula: "a - b" }
    },
    hissanSpec: { op: "sub", a: "{a}", b: "{b}" },
    answer: { expression: "answer", normalization: "integer" },
    hintSteps: ["一の位でひけないので、十の位から 1 くり下げよう。", "10 + {a % 10} から {b % 10} をひいてみよう。"],
    explanationTemplate: "十の位からくり下げて計算すると、答えは {answer} だね。",
    understandingCheck: {
      enabled: true, type: "choice",
      questionTemplate: "{a} - {b} の答えはどれ？",
      choices: ["{answer}", "{wrong1}", "{wrong2}"],
      answer: "{answer}",
      generateWrong: {
        wrong1: { formula: "answer + 10" },
        wrong2: { formula: "answer - 1" }
      }
    }
  },
  // Lv3: kuku_partial (九九 6〜9の段)
  {
    templateId: "g2_adv_kuku_01",
    grade: 2, difficultyLevel: 3,
    unitId: "multiplication_g2", conceptId: "kuku_advanced_groups",
    problemType: "calculation", answerType: "number_input",
    format: "{a} × {b} = ?",
    generate: {
      a: { type: "integer", range: [6, 9] },
      b: { type: "integer", range: [2, 9] },
      answer: { formula: "a * b" }
    },
    answer: { expression: "answer", normalization: "integer" },
    hintSteps: ["{a} の段の九九を思い出してみよう。", "{a} × {b-1} = {a*(b-1)} に {a} を足しても求められるよ。"],
    explanationTemplate: "{a} × {b} = {answer} だね。",
    understandingCheck: {
      enabled: true, type: "choice",
      questionTemplate: "{a} × {b} の答えはどれ？",
      choices: ["{answer}", "{wrong1}", "{wrong2}"],
      answer: "{answer}",
      generateWrong: {
        wrong1: { formula: "answer + a" },
        wrong2: { formula: "answer - a" }
      }
    }
  },
  // Lv3: add_3terms_2digit
  {
    templateId: "g2_adv_3terms_01",
    grade: 2, difficultyLevel: 3,
    unitId: "calc_application", conceptId: "three_terms_2digit",
    problemType: "calculation", answerType: "number_input",
    format: "{a} + {b} + {c} = ?",
    generate: {
      a: { type: "integer", range: [12, 35] },
      b: { type: "integer", range: [10, 30] },
      c: { type: "integer", range: [10, 25] },
      answer: { formula: "a + b + c" }
    },
    answer: { expression: "answer", normalization: "integer" },
    hintSteps: ["まず左の2つ {a} + {b} を計算しよう。", "その答えに {c} を足そう。"],
    explanationTemplate: "{a} + {b} = {a + b}、それに {c} を足して {answer} だね。",
    understandingCheck: {
      enabled: true, type: "choice",
      questionTemplate: "{a} + {b} + {c} の答えはどれ？",
      choices: ["{answer}", "{wrong1}", "{wrong2}"],
      answer: "{answer}",
      generateWrong: {
        wrong1: { formula: "answer + 10" },
        wrong2: { formula: "answer - 1" }
      }
    }
  },
  // Lv3: add_sub_2digit_2step
  {
    templateId: "g2_adv_2step_01",
    grade: 2, difficultyLevel: 3,
    unitId: "calc_application", conceptId: "two_step_2digit",
    problemType: "calculation", answerType: "number_input",
    format: "{a} + {b} - {c} = ?",
    generate: {
      a: { type: "integer", range: [20, 50] },
      b: { type: "integer", range: [15, 40] },
      c: { type: "integer", range: [10, 30], constraints: ["a + b > c"] },
      answer: { formula: "a + b - c" }
    },
    answer: { expression: "answer", normalization: "integer" },
    hintSteps: ["まず {a} + {b} を計算しよう。", "出た数から {c} をひこう。"],
    explanationTemplate: "{a} + {b} = {a + b}、{a + b} - {c} = {answer} だね。",
    understandingCheck: {
      enabled: true, type: "choice",
      questionTemplate: "{a} + {b} - {c} の答えはどれ？",
      choices: ["{answer}", "{wrong1}", "{wrong2}"],
      answer: "{answer}",
      generateWrong: {
        wrong1: { formula: "answer + 10" },
        wrong2: { formula: "answer - 1" }
      }
    }
  },

  // ==========================================
  // 小学3年生 (Grade 3)
  // ==========================================
  // Lv1: kuku_all
  {
    templateId: "g3_basic_kuku_01",
    grade: 3, difficultyLevel: 1,
    unitId: "kuku_all", conceptId: "kuku_mastery",
    problemType: "calculation", answerType: "number_input",
    format: "{a} × {b} = ?",
    formats: ["{a} × {b} = ?", "{a} のだん の {b} ばい？", "{a} × {b} は いくつ？"],
    commutativePairs: [["a", "b"]],
    generate: {
      a: { type: "integer", range: [2, 9] },
      b: { type: "integer", range: [2, 9] },
      answer: { formula: "a * b" }
    },
    answer: { expression: "answer", normalization: "integer" },
    hintSteps: ["{a} の段の九九を唱えてみよう。", "{a} × {b} の答えを探そう。"],
    explanationTemplate: "{a} × {b} = {answer} だね。",
    understandingCheck: {
      enabled: true, type: "choice",
      questionTemplate: "{a} × {b} の答えはどれ？",
      choices: ["{answer}", "{wrong1}", "{wrong2}"],
      answer: "{answer}",
      generateWrong: {
        wrong1: { formula: "answer + a" },
        wrong2: { formula: "answer - a" }
      }
    }
  },
  // Lv1: add_sub_3digit
  {
    templateId: "g3_basic_addsub3_01",
    grade: 3, difficultyLevel: 1,
    unitId: "add_sub_3digit", conceptId: "add_sub_3digit_basic",
    problemType: "calculation", answerType: "number_input",
    format: "{a} + {b} = ?",
    generate: {
      a: { type: "integer", range: [120, 480] },
      b: { type: "integer", range: [110, 390] },
      answer: { formula: "a + b" }
    },
    answer: { expression: "answer", normalization: "integer" },
    hintSteps: ["百の位、十の位、一の位をそれぞれ位ごとに計算しよう。", "一の位から順番に計算していこう。"],
    explanationTemplate: "筆算のように位ごとに足していくと、答えは {answer} だね。",
    understandingCheck: {
      enabled: true, type: "choice",
      questionTemplate: "{a} + {b} の答えはどれ？",
      choices: ["{answer}", "{wrong1}", "{wrong2}"],
      answer: "{answer}",
      generateWrong: {
        wrong1: { formula: "answer + 10" },
        wrong2: { formula: "answer - 100" }
      }
    }
  },
  // Lv2: mul_2digit_1digit
  {
    templateId: "g3_std_mul21_01",
    grade: 3, difficultyLevel: 2,
    unitId: "mul_2digit_1digit", conceptId: "mul_2digit_algorithm",
    problemType: "calculation", answerType: "number_input",
    format: "{a} × {b} = ?",
    generate: {
      a: { type: "integer", range: [12, 48] },
      b: { type: "integer", range: [3, 9] },
      answer: { formula: "a * b" }
    },
    hissanSpec: { op: "mul", a: "{a}", b: "{b}" },
    answer: { expression: "answer", normalization: "integer" },
    hintSteps: ["{a} を {Math.floor(a/10)*10} と {a%10} に分けてかけ算しよう。", "{a%10} × {b} と {Math.floor(a/10)*10} × {b} を足そう。"],
    explanationTemplate: "{a%10} × {b} = {(a%10)*b}、{Math.floor(a/10)*10} × {b} = {Math.floor(a/10)*10*b}。合わせて {answer} だね。",
    understandingCheck: {
      enabled: true, type: "choice",
      questionTemplate: "{a} × {b} の答えはどれ？",
      choices: ["{answer}", "{wrong1}", "{wrong2}"],
      answer: "{answer}",
      generateWrong: {
        wrong1: { formula: "answer + 10" },
        wrong2: { formula: "answer - b" }
      }
    }
  },
  // Lv2: div_no_remainder (割り算 あまりなし)
  {
    templateId: "g3_std_div_no_remainder_01",
    grade: 3, difficultyLevel: 2,
    unitId: "div_no_remainder", conceptId: "division_equal_share",
    problemType: "calculation", answerType: "number_input",
    format: "{a} ÷ {b} = ?",
    generate: {
      b: { type: "integer", range: [2, 9] },
      quotient: { type: "integer", range: [2, 9] },
      a: { formula: "b * quotient" },
      answer: { formula: "quotient" }
    },
    answer: { expression: "answer", normalization: "integer" },
    hintSteps: ["{a} の中に {b} がいくつ入るか考えてみよう。", "{b} × ? = {a} になる九九を探そう。"],
    explanationTemplate: "{b} × {answer} = {a} だから、{a} ÷ {b} = {answer} だね。",
    understandingCheck: {
      enabled: true, type: "choice",
      questionTemplate: "{b} × ? = {a} の ? はどれかな？",
      choices: ["{answer}", "{wrong1}", "{wrong2}"],
      answer: "{answer}",
      generateWrong: {
        wrong1: { formula: "answer + 1" },
        wrong2: { formula: "answer > 2 ? answer - 1 : answer + 2" }
      }
    }
  },
  // Lv3: div_with_remainder (割り算 あまりあり)
  {
    templateId: "g3_adv_div_rem_01",
    grade: 3, difficultyLevel: 3,
    unitId: "div_with_remainder", conceptId: "division_with_remainder",
    problemType: "calculation", answerType: "number_input",
    format: "{a} ÷ {b} の商（あまりは考えない商）はいくつ？",
    generate: {
      b: { type: "integer", range: [3, 9] },
      q: { type: "integer", range: [2, 8] },
      rem: { type: "integer", range: [1, 5], constraints: ["rem < b"] },
      a: { formula: "b * q + rem" },
      answer: { formula: "q" }
    },
    answer: { expression: "answer", normalization: "integer" },
    hintSteps: ["{b} の段の九九で {a} を超えない一番近い数を探そう。", "{b} × {q} = {b*q} で、あと {rem} 余るね。"],
    explanationTemplate: "{a} ÷ {b} = {answer} あまり {rem} だね。",
    understandingCheck: {
      enabled: true, type: "choice",
      questionTemplate: "{a} ÷ {b} の商はどれ？",
      choices: ["{answer}", "{wrong1}", "{wrong2}"],
      answer: "{answer}",
      generateWrong: {
        wrong1: { formula: "answer + 1" },
        wrong2: { formula: "answer - 1" }
      }
    }
  },
  // Lv3: mixed_mul_div_2step
  {
    templateId: "g3_adv_muldiv2_01",
    grade: 3, difficultyLevel: 3,
    unitId: "mixed_mul_div_2step", conceptId: "mixed_mul_div",
    problemType: "calculation", answerType: "number_input",
    format: "{a} × {b} ÷ {c} = ?",
    generate: {
      c: { type: "integer", range: [2, 6] },
      k: { type: "integer", range: [2, 6] },
      b: { type: "integer", range: [2, 5] },
      a: { formula: "(c * k)" },
      answer: { formula: "k * b" }
    },
    answer: { expression: "answer", normalization: "integer" },
    hintSteps: ["左から順番に計算しよう。まず {a} × {b} は？", "その答えを {c} で割ってみよう。"],
    explanationTemplate: "{a} × {b} = {a * b}、{a * b} ÷ {c} = {answer} だね。",
    understandingCheck: {
      enabled: true, type: "choice",
      questionTemplate: "{a} × {b} ÷ {c} の答えはどれ？",
      choices: ["{answer}", "{wrong1}", "{wrong2}"],
      answer: "{answer}",
      generateWrong: {
        wrong1: { formula: "answer + 2" },
        wrong2: { formula: "answer > 2 ? answer - 1 : answer + 3" }
      }
    }
  },

  // ==========================================
  // 小学4年生 (Grade 4)
  // ==========================================
  // Lv1: mul_2digit_2digit
  {
    templateId: "g4_basic_mul22_01",
    grade: 4, difficultyLevel: 1,
    unitId: "mul_2digit_2digit", conceptId: "mul_2digit_2digit_basic",
    problemType: "calculation", answerType: "number_input",
    format: "{a} × {b} = ?",
    commutativePairs: [["a", "b"]],
    generate: {
      a: { type: "integer", range: [12, 35] },
      b: { type: "integer", range: [12, 25] },
      answer: { formula: "a * b" }
    },
    hissanSpec: { op: "mul", a: "{a}", b: "{b}" },
    answer: { expression: "answer", normalization: "integer" },
    hintSteps: ["筆算を思い浮かべよう。{a} × {b%10} と {a} × {Math.floor(b/10)*10} を計算しよう。", "2つの結果を足し合わせよう。"],
    explanationTemplate: "{a} × {b%10} = {a*(b%10)}、{a} × {Math.floor(b/10)*10} = {a*Math.floor(b/10)*10}。合計して {answer} だね。",
    understandingCheck: {
      enabled: true, type: "choice",
      questionTemplate: "{a} × {b} の答えはどれ？",
      choices: ["{answer}", "{wrong1}", "{wrong2}"],
      answer: "{answer}",
      generateWrong: {
        wrong1: { formula: "answer + 10" },
        wrong2: { formula: "answer - 10" }
      }
    }
  },
  // Lv1: decimal_read_write
  {
    templateId: "g4_basic_dec_read_01",
    grade: 4, difficultyLevel: 1,
    unitId: "decimal_read_write", conceptId: "decimal_basic_place_value",
    problemType: "calculation", answerType: "number_input",
    format: "0.1 を {count} こ 集めた数はいくつ？",
    generate: {
      count: { type: "integer", range: [3, 25] },
      answer: { formula: "Math.round(count * 0.1 * 10) / 10" }
    },
    answer: { expression: "answer", normalization: "decimal" },
    hintSteps: ["0.1 が 10個で 1 になるよ。", "{count} は 10がいくつと あまりがいくつかな？"],
    explanationTemplate: "0.1 を {count}こ集めると {answer} だね。",
    understandingCheck: {
      enabled: true, type: "choice",
      questionTemplate: "0.1 を {count}こ集めた数はどれ？",
      choices: ["{answer}", "{wrong1}", "{wrong2}"],
      answer: "{answer}",
      generateWrong: {
        wrong1: { formula: "Math.round((answer + 0.2) * 10) / 10" },
        wrong2: { formula: "Math.round((answer - 0.1) * 10) / 10" }
      }
    }
  },
  // Lv2: div_3digit_1digit_remainder
  {
    templateId: "g4_std_div31_01",
    grade: 4, difficultyLevel: 2,
    unitId: "div_3digit_1digit_remainder", conceptId: "div_3digit_algorithm",
    problemType: "calculation", answerType: "number_input",
    format: "{a} ÷ {b} の商はいくつ？",
    generate: {
      b: { type: "integer", range: [3, 8] },
      q: { type: "integer", range: [25, 75] },
      rem: { type: "integer", range: [0, 4], constraints: ["rem < b"] },
      a: { formula: "b * q + rem" },
      answer: { formula: "q" }
    },
    hissanSpec: { op: "div", a: "{a}", b: "{b}", q: "{q}", rem: "{rem}" },
    answer: { expression: "answer", normalization: "integer" },
    hintSteps: ["上の位（百の位・十の位）から順番に割り算していこう。", "商の十の位を立ててから一の位を計算しよう。"],
    explanationTemplate: "{a} ÷ {b} = {answer} （あまり {rem}）だね。",
    understandingCheck: {
      enabled: true, type: "choice",
      questionTemplate: "{a} ÷ {b} の商はどれ？",
      choices: ["{answer}", "{wrong1}", "{wrong2}"],
      answer: "{answer}",
      generateWrong: {
        wrong1: { formula: "answer + 1" },
        wrong2: { formula: "answer - 1" }
      }
    }
  },
  // Lv2: decimal_add_sub
  {
    templateId: "g4_std_dec_add_01",
    grade: 4, difficultyLevel: 2,
    unitId: "decimal_add_sub", conceptId: "decimal_add_sub_basic",
    problemType: "calculation", answerType: "number_input",
    format: "{a} + {b} = ?",
    commutativePairs: [["a", "b"]],
    generate: {
      a10: { type: "integer", range: [12, 58] },
      b10: { type: "integer", range: [11, 45] },
      a: { formula: "a10 / 10" },
      b: { formula: "b10 / 10" },
      answer: { formula: "Math.round((a10 + b10)) / 10" }
    },
    answer: { expression: "answer", normalization: "decimal" },
    hintSteps: ["小数点の位置をそろえて位ごとに足そう。", "0.1 の位どうし、1 の位どうしを足そう。"],
    explanationTemplate: "小数点をそろえて計算すると、{a} + {b} = {answer} だね。",
    understandingCheck: {
      enabled: true, type: "choice",
      questionTemplate: "{a} + {b} の答えはどれ？",
      choices: ["{answer}", "{wrong1}", "{wrong2}"],
      answer: "{answer}",
      generateWrong: {
        wrong1: { formula: "Math.round((answer + 0.1)*10)/10" },
        wrong2: { formula: "Math.round((answer - 0.1)*10)/10" }
      }
    }
  },
  // Lv3: mixed_2step
  {
    templateId: "g4_adv_order_01",
    grade: 4, difficultyLevel: 3,
    unitId: "mixed_2step", conceptId: "order_of_operations",
    problemType: "calculation", answerType: "number_input",
    format: "{a} + {b} × {c} = ?",
    generate: {
      a: { type: "integer", range: [10, 40] },
      b: { type: "integer", range: [3, 8] },
      c: { type: "integer", range: [2, 6] },
      answer: { formula: "a + b * c" }
    },
    answer: { expression: "answer", normalization: "integer" },
    hintSteps: ["たし算とかけ算がまざっているときは、かけ算を先に計算するよ。", "まず {b} × {c} を計算して、それに {a} を足そう。"],
    explanationTemplate: "{b} × {c} = {b * c} を先に計算し、{a} + {b * c} = {answer} だね。",
    understandingCheck: {
      enabled: true, type: "choice",
      questionTemplate: "{a} + {b} × {c} の答えはどれ？",
      choices: ["{answer}", "{wrong1}", "{wrong2}"],
      answer: "{answer}",
      generateWrong: {
        wrong1: { formula: "(a + b) * c" }, // 演算順序の誤り
        wrong2: { formula: "answer + 10" }
      }
    }
  },
  // Lv3: decimal_mul_basic
  {
    templateId: "g4_adv_dec_mul_01",
    grade: 4, difficultyLevel: 3,
    unitId: "decimal_mul_basic", conceptId: "decimal_mul_integer",
    problemType: "calculation", answerType: "number_input",
    format: "{a} × {b} = ?",
    generate: {
      a10: { type: "integer", range: [12, 45] },
      b: { type: "integer", range: [3, 8] },
      a: { formula: "a10 / 10" },
      answer: { formula: "Math.round(a10 * b) / 10" }
    },
    answer: { expression: "answer", normalization: "decimal" },
    hintSteps: ["まず整数のかけ算 {a10} × {b} を計算しよう。", "その答えの小数点を左に 1つ動かそう。"],
    explanationTemplate: "{a10} × {b} = {a10 * b} だから、小数点を戻して {answer} だね。",
    understandingCheck: {
      enabled: true, type: "choice",
      questionTemplate: "{a} × {b} の答えはどれ？",
      choices: ["{answer}", "{wrong1}", "{wrong2}"],
      answer: "{answer}",
      generateWrong: {
        wrong1: { formula: "Math.round((answer * 10)*10)/10" },
        wrong2: { formula: "Math.round((answer + 0.5)*10)/10" }
      }
    }
  },

  // ==========================================
  // 小学5年生 (Grade 5)
  // ==========================================
  // Lv1: fraction_add_sub_same_denom
  {
    templateId: "g5_basic_frac_add_01",
    grade: 5, difficultyLevel: 1,
    unitId: "fraction_add_sub_same_denom", conceptId: "fraction_same_denom",
    problemType: "calculation", answerType: "number_input",
    format: "{a}/{denom} + {b}/{denom} の分子（答えの上の数）はいくつ？",
    generate: {
      denom: { type: "choice", values: [5, 7, 9, 11] },
      a: { type: "integer", range: [1, 4] },
      b: { type: "integer", range: [1, 4], constraints: ["a + b < denom"] },
      answer: { formula: "a + b" }
    },
    answer: { expression: "answer", normalization: "integer" },
    hintSteps: ["分母が同じ分数のたし算は、分子どうしを足せばいいよ。", "{a} + {b} を計算しよう。"],
    explanationTemplate: "分母はそのままで分子を足すので、分子は {a} + {b} = {answer} だね。",
    understandingCheck: {
      enabled: true, type: "choice",
      questionTemplate: "{a}/{denom} + {b}/{denom} の分子はどれ？",
      choices: ["{answer}", "{wrong1}", "{wrong2}"],
      answer: "{answer}",
      generateWrong: {
        wrong1: { formula: "answer + 1" },
        wrong2: { formula: "answer - 1" }
      }
    }
  },
  // Lv1: fraction_simplify (約分)
  {
    templateId: "g5_basic_simplify_01",
    grade: 5, difficultyLevel: 1,
    unitId: "fraction_simplify", conceptId: "fraction_reduction",
    problemType: "calculation", answerType: "number_input",
    format: "{a * factor}/{b * factor} を約分したときの分子はいくつ？",
    generate: {
      factor: { type: "choice", values: [2, 3, 4] },
      a: { type: "integer", range: [1, 3] },
      b: { type: "integer", range: [4, 7], constraints: ["a < b"] },
      answer: { formula: "a" }
    },
    answer: { expression: "answer", normalization: "integer" },
    hintSteps: ["分子と分母を同じ数（最大公約数 {factor}）で割ってみよう。", "{a * factor} ÷ {factor} はいくつかな？"],
    explanationTemplate: "分子と分母を {factor} で割ると {answer}/{b} になるね。",
    understandingCheck: {
      enabled: true, type: "choice",
      questionTemplate: "約分した後の分子はどれ？",
      choices: ["{answer}", "{wrong1}", "{wrong2}"],
      answer: "{answer}",
      generateWrong: {
        wrong1: { formula: "answer + 1" },
        wrong2: { formula: "answer + factor" }
      }
    }
  },
  // Lv2: fraction_add_sub_diff_denom (通分・異分母分数)
  {
    templateId: "g5_std_diff_frac_01",
    grade: 5, difficultyLevel: 2,
    unitId: "fraction_add_sub_diff_denom", conceptId: "fraction_diff_denom_common",
    problemType: "calculation", answerType: "number_input",
    format: "1/{d1} + 1/{d2} を通分して計算したときの分子はいくつ？",
    generate: {
      d1: { type: "choice", values: [2, 3] },
      d2: { type: "choice", values: [4, 5] },
      commonDenom: { formula: "d1 * d2" },
      answer: { formula: "d2 + d1" }
    },
    answer: { expression: "answer", normalization: "integer" },
    hintSteps: ["分母を {commonDenom} に通分しよう。", "1/{d1} = {d2}/{commonDenom}、1/{d2} = {d1}/{commonDenom} だね。"],
    explanationTemplate: "{d2}/{commonDenom} + {d1}/{commonDenom} = {answer}/{commonDenom} だね。",
    understandingCheck: {
      enabled: true, type: "choice",
      questionTemplate: "通分して足したときの分子はどれ？",
      choices: ["{answer}", "{wrong1}", "{wrong2}"],
      answer: "{answer}",
      generateWrong: {
        wrong1: { formula: "answer + 1" },
        wrong2: { formula: "2" } // 単純に分子を足してしまう誤答
      }
    }
  },
  // Lv2: decimal_mul (小数×小数)
  {
    templateId: "g5_std_dec_mul_01",
    grade: 5, difficultyLevel: 2,
    unitId: "decimal_mul", conceptId: "decimal_mul_algorithm",
    problemType: "calculation", answerType: "number_input",
    format: "{a} × {b} = ?",
    commutativePairs: [["a", "b"]],
    generate: {
      a10: { type: "integer", range: [12, 35] },
      b10: { type: "integer", range: [12, 25] },
      a: { formula: "a10 / 10" },
      b: { formula: "b10 / 10" },
      answer: { formula: "Math.round(a10 * b10) / 100" }
    },
    answer: { expression: "answer", normalization: "decimal" },
    hintSteps: ["整数として {a10} × {b10} を計算しよう。", "かけられる数と かける数の小数のけた数の合計（2けた）分、小数点を左に動かそう。"],
    explanationTemplate: "{a10} × {b10} = {a10 * b10} だから、小数点を2けた左にして {answer} だね。",
    understandingCheck: {
      enabled: true, type: "choice",
      questionTemplate: "{a} × {b} の答えはどれ？",
      choices: ["{answer}", "{wrong1}", "{wrong2}"],
      answer: "{answer}",
      generateWrong: {
        wrong1: { formula: "Math.round((answer * 10)*100)/100" },
        wrong2: { formula: "Math.round((answer + 0.1)*100)/100" }
      }
    }
  },
  // Lv3: percentage_basic (割合と百分率)
  {
    templateId: "g5_adv_percent_01",
    grade: 5, difficultyLevel: 3,
    unitId: "percentage_basic", conceptId: "percentage_ratio_concept",
    problemType: "calculation", answerType: "number_input",
    format: "{total}円の {percent}％ は何円？",
    generate: {
      total: { type: "choice", values: [200, 300, 500, 1000] },
      percent: { type: "choice", values: [10, 20, 30, 50] },
      ratio: { formula: "percent / 100" },
      answer: { formula: "total * (percent / 100)" }
    },
    answer: { expression: "answer", normalization: "integer" },
    hintSteps: ["{percent}％ は 割合になおすと {ratio} だよ。", "もとにする量（{total}円）に 割合（{ratio}）をかけよう。"],
    explanationTemplate: "{total} × {ratio} = {answer}円 だね。",
    understandingCheck: {
      enabled: true, type: "choice",
      questionTemplate: "{total}円の {percent}％ はどれ？",
      choices: ["{answer}", "{wrong1}", "{wrong2}"],
      answer: "{answer}",
      generateWrong: {
        wrong1: { formula: "answer + 50" },
        wrong2: { formula: "answer > 50 ? answer - 50 : answer + 100" }
      }
    }
  },
  // Lv3: fraction_mul_integer
  {
    templateId: "g5_adv_frac_mul_01",
    grade: 5, difficultyLevel: 3,
    unitId: "fraction_mul_integer", conceptId: "fraction_mul_basic",
    problemType: "calculation", answerType: "number_input",
    format: "{a}/{denom} × {mul} の分子はいくつ？",
    generate: {
      denom: { type: "choice", values: [7, 9, 11] },
      a: { type: "integer", range: [2, 4] },
      mul: { type: "integer", range: [2, 3] },
      answer: { formula: "a * mul" }
    },
    answer: { expression: "answer", normalization: "integer" },
    hintSteps: ["分数に整数をかけるときは、分子に整数をかけるよ。", "{a} × {mul} を計算しよう。"],
    explanationTemplate: "分子に {mul} をかけるので、分子は {a} × {mul} = {answer} だね。",
    understandingCheck: {
      enabled: true, type: "choice",
      questionTemplate: "分子はどれかな？",
      choices: ["{answer}", "{wrong1}", "{wrong2}"],
      answer: "{answer}",
      generateWrong: {
        wrong1: { formula: "answer + 1" },
        wrong2: { formula: "answer - 1" }
      }
    }
  },

  // ==========================================
  // 小学6年生 (Grade 6)
  // ==========================================
  // Lv1: fraction_mixed_same_denom (帯分数)
  {
    templateId: "g6_basic_mixed_frac_01",
    grade: 6, difficultyLevel: 1,
    unitId: "fraction_mixed_same_denom", conceptId: "mixed_fraction_calc",
    problemType: "calculation", answerType: "number_input",
    format: "1と{a}/{denom} + 2と{b}/{denom} の整数部分はいくつ？",
    generate: {
      denom: { type: "choice", values: [5, 7, 9] },
      a: { type: "integer", range: [1, 2] },
      b: { type: "integer", range: [1, 2] },
      answer: { formula: "3" }
    },
    answer: { expression: "answer", normalization: "integer" },
    hintSteps: ["整数部分どうし（1 + 2）を足してみよう。", "分数部分（{a}/{denom} + {b}/{denom}）はくり上がるかな？"],
    explanationTemplate: "整数部分は 1 + 2 = {answer} だね。",
    understandingCheck: {
      enabled: true, type: "choice",
      questionTemplate: "整数部分はどれ？",
      choices: ["{answer}", "{wrong1}", "{wrong2}"],
      answer: "{answer}",
      generateWrong: {
        wrong1: { formula: "2" },
        wrong2: { formula: "4" }
      }
    }
  },
  // Lv1: fraction_div_basic (分数のわり算・逆数)
  {
    templateId: "g6_basic_frac_div_01",
    grade: 6, difficultyLevel: 1,
    unitId: "fraction_div_basic", conceptId: "fraction_div_inverse",
    problemType: "calculation", answerType: "number_input",
    format: "1/{denom} ÷ 2/3 は、1/{denom} × ?/2 と同じ。?に入る数は？",
    generate: {
      denom: { type: "choice", values: [4, 5, 7] },
      answer: { formula: "3" }
    },
    answer: { expression: "answer", normalization: "integer" },
    hintSteps: ["分数のわり算は、わる数を「逆数（分母と分子をひっくり返した数）」にしてかけるよ。", "2/3 の逆数は何かな？"],
    explanationTemplate: "2/3 の逆数は 3/2 だから、?に入る数は {answer} だね。",
    understandingCheck: {
      enabled: true, type: "choice",
      questionTemplate: "? に入る数はどれ？",
      choices: ["{answer}", "{wrong1}", "{wrong2}"],
      answer: "{answer}",
      generateWrong: {
        wrong1: { formula: "2" },
        wrong2: { formula: "4" }
      }
    }
  },
  // Lv2: ratio_basic (比)
  {
    templateId: "g6_std_ratio_01",
    grade: 6, difficultyLevel: 2,
    unitId: "ratio_basic", conceptId: "ratio_proportion_concept",
    problemType: "calculation", answerType: "number_input",
    format: "{a} : {b} = ? : {b * 3} の ? に入る数は？",
    generate: {
      a: { type: "integer", range: [2, 5] },
      b: { type: "integer", range: [3, 7] },
      answer: { formula: "a * 3" }
    },
    answer: { expression: "answer", normalization: "integer" },
    hintSteps: ["比の右側が {b} から {b * 3} へ 3倍になっているよ。", "比の左側 {a} も同じように 3倍しよう。"],
    explanationTemplate: "{b} が 3倍になっているので、{a} × 3 = {answer} だね。",
    understandingCheck: {
      enabled: true, type: "choice",
      questionTemplate: "? に入る数はどれ？",
      choices: ["{answer}", "{wrong1}", "{wrong2}"],
      answer: "{answer}",
      generateWrong: {
        wrong1: { formula: "answer + a" },
        wrong2: { formula: "answer - a" }
      }
    }
  },
  // Lv2: fraction_mixed_diff_denom
  {
    templateId: "g6_std_frac_mix_01",
    grade: 6, difficultyLevel: 2,
    unitId: "fraction_mixed_diff_denom", conceptId: "fraction_mixed_all",
    problemType: "calculation", answerType: "number_input",
    format: "1/2 × 2/3 ÷ 1/3 = ?",
    generate: {
      answer: { formula: "1" }
    },
    answer: { expression: "answer", normalization: "integer" },
    hintSteps: ["÷ 1/3 を × 3/1 に直して、1つのかけ算にまとめよう。", "約分できるところを整理しよう。"],
    explanationTemplate: "1/2 × 2/3 × 3/1 = 1 だね。",
    understandingCheck: {
      enabled: true, type: "choice",
      questionTemplate: "計算の答えはどれ？",
      choices: ["{answer}", "{wrong1}", "{wrong2}"],
      answer: "{answer}",
      generateWrong: {
        wrong1: { formula: "2" },
        wrong2: { formula: "3" }
      }
    }
  },
  
// End of array

  // ==========================================
  // 文章問題テンプレート (Grade 1〜6 / Lv1〜3)
  // ==========================================

  // --- Grade 1 ---
  {
    templateId: "g1_word_add_01",
    grade: 1, difficultyLevel: 1,
    unitId: "add_1digit_no_carry", conceptId: "add_basic",
    problemType: "word_problem", answerType: "number_input",
    sentencePatterns: [
      "{person}さんは りんごを {a}こ もっています。{b}こ もらいました。ぜんぶで なんこ？",
      "かごに みかんが {a}こ あります。{b}こ くわえました。ぜんぶで なんこ？"
    ],
    generate: {
      person: { type: "choice", values: ["たろう", "はなこ", "けんた"] },
      a: { type: "integer", range: [1, 6] },
      b: { type: "integer", range: [1, 3], constraints: ["a + b <= 9"] },
      answer: { formula: "a + b" }
    },
    answer: { expression: "answer", normalization: "integer" },
    hintSteps: ["もっている かずと もらった かずを あわせよう。", "{a} + {b} を けいさんしよう。"],
    explanationTemplate: "{a}こ と {b}こ を あわせると {answer}こ だね。",
    understandingCheck: {
      enabled: true, type: "choice",
      questionTemplate: "ぜんぶで なんこ？",
      choices: ["{answer}", "{wrong1}", "{wrong2}"],
      answer: "{answer}",
      generateWrong: {
        wrong1: { formula: "answer + 1" },
        wrong2: { formula: "answer > 2 ? answer - 1 : answer + 2" }
      }
    },
    story: { structureId: "addition", contextId: "c_g1_word_add_01", entityId: "e_g1_word_add_01", actionId: "add" },
    variationGroupId: "vg_g1_word_add_01",
    similarityGroupId: "sg_addition"
  },
  {
    templateId: "g1_word_add_02",
    grade: 1, difficultyLevel: 1,
    unitId: "add_1digit_no_carry", conceptId: "add_basic",
    problemType: "word_problem", answerType: "number_input",
    sentencePatterns: [
      "バスに ねこが {a}ひき のっています。{b}ひき のってきました。ぜんぶで なんびき？",
      "ふくろに おかしが {a}こ あります。{b}こ たしました。ぜんぶで なんこ？"
    ],
    generate: {
      a: { type: "integer", range: [1, 6] },
      b: { type: "integer", range: [1, 3], constraints: ["a + b <= 9"] },
      answer: { formula: "a + b" }
    },
    answer: { expression: "answer", normalization: "integer" },
    hintSteps: ["のっている かずと のってきた かずを あわせよう。", "{a} + {b} を けいさんしよう。"],
    explanationTemplate: "{a} と {b} を あわせると {answer} だね。",
    understandingCheck: {
      enabled: true, type: "choice",
      questionTemplate: "ぜんぶで なんびき（なんこ）？",
      choices: ["{answer}", "{wrong1}", "{wrong2}"],
      answer: "{answer}",
      generateWrong: {
        wrong1: { formula: "answer + 1" },
        wrong2: { formula: "answer > 2 ? answer - 1 : answer + 2" }
      }
    },
    story: { structureId: "addition", contextId: "c_g1_word_add_02", entityId: "e_g1_word_add_02", actionId: "add" },
    variationGroupId: "vg_g1_word_add_02",
    similarityGroupId: "sg_addition"
  },
  {
    templateId: "g1_word_add_03",
    grade: 1, difficultyLevel: 1,
    unitId: "add_1digit_no_carry", conceptId: "add_basic",
    problemType: "word_problem", answerType: "number_input",
    sentencePatterns: [
      "{person}さんは {a}えん もっています。おこづかいを {b}えん もらいました。ぜんぶで なんえん？",
      "おさらが {a}まい あります。{b}まい あらいました。ぜんぶで なんまい？"
    ],
    generate: {
      person: { type: "choice", values: ["たろう", "はなこ", "けんた"] },
      a: { type: "integer", range: [1, 6] },
      b: { type: "integer", range: [1, 3], constraints: ["a + b <= 9"] },
      answer: { formula: "a + b" }
    },
    answer: { expression: "answer", normalization: "integer" },
    hintSteps: ["もっている おかねと もらった おかねを あわせよう。", "{a} + {b} を けいさんしよう。"],
    explanationTemplate: "{a} + {b} ＝ {answer} だね。",
    understandingCheck: {
      enabled: true, type: "choice",
      questionTemplate: "ぜんぶで なんえん（なんまい）？",
      choices: ["{answer}", "{wrong1}", "{wrong2}"],
      answer: "{answer}",
      generateWrong: {
        wrong1: { formula: "answer + 1" },
        wrong2: { formula: "answer > 2 ? answer - 1 : answer + 2" }
      }
    },
    story: { structureId: "addition", contextId: "c_g1_word_add_03", entityId: "e_g1_word_add_03", actionId: "add" },
    variationGroupId: "vg_g1_word_add_03",
    similarityGroupId: "sg_addition"
  },
  {
    templateId: "g1_word_sub_01",
    grade: 1, difficultyLevel: 1,
    unitId: "sub_1digit_no_borrow", conceptId: "sub_basic",
    problemType: "word_problem", answerType: "number_input",
    sentencePatterns: [
      "いちごが {a}こ あります。{b}こ たべました。のこりは なんこ？",
      "{person}さんは あめを {a}こ もっています。{b}こ あげました。のこりは なんこ？"
    ],
    generate: {
      person: { type: "choice", values: ["たろう", "はなこ", "ゆき"] },
      a: { type: "integer", range: [3, 9] },
      b: { type: "integer", range: [1, 4], constraints: ["a > b"] },
      answer: { formula: "a - b" }
    },
    answer: { expression: "answer", normalization: "integer" },
    hintSteps: ["{a}こ から {b}こ を ひいてみよう。", "{a} - {b} を けいさんしよう。"],
    explanationTemplate: "{a}こ から {b}こ とると {answer}こ のこるね。",
    understandingCheck: {
      enabled: true, type: "choice",
      questionTemplate: "のこりは なんこ？",
      choices: ["{answer}", "{wrong1}", "{wrong2}"],
      answer: "{answer}",
      generateWrong: {
        wrong1: { formula: "answer + 1" },
        wrong2: { formula: "answer > 1 ? answer - 1 : answer + 2" }
      }
    },
    story: { structureId: "subtraction", contextId: "c_g1_word_sub_01", entityId: "e_g1_word_sub_01", actionId: "remove" },
    variationGroupId: "vg_g1_word_sub_01",
    similarityGroupId: "sg_subtraction"
  },
  {
    templateId: "g1_word_sub_02",
    grade: 1, difficultyLevel: 1,
    unitId: "sub_1digit_no_borrow", conceptId: "sub_basic",
    problemType: "word_problem", answerType: "number_input",
    sentencePatterns: [
      "{person}さんは えんぴつを {a}ほん もっています。{b}ほん ともだちに あげました。のこりは なんぼん？",
      "とりが {a}わ います。{b}わ とんでいきました。のこりは なんわ？"
    ],
    generate: {
      person: { type: "choice", values: ["たろう", "はなこ", "ゆき"] },
      a: { type: "integer", range: [3, 9] },
      b: { type: "integer", range: [1, 4], constraints: ["a > b"] },
      answer: { formula: "a - b" }
    },
    answer: { expression: "answer", normalization: "integer" },
    hintSteps: ["はじめの かずから へった かずを ひこう。", "{a} - {b} を けいさんしよう。"],
    explanationTemplate: "{a}ほん（わ）から {b} を とると {answer} のこるね。",
    understandingCheck: {
      enabled: true, type: "choice",
      questionTemplate: "のこりは なんぼん（なんわ）？",
      choices: ["{answer}", "{wrong1}", "{wrong2}"],
      answer: "{answer}",
      generateWrong: {
        wrong1: { formula: "answer + 1" },
        wrong2: { formula: "answer > 1 ? answer - 1 : answer + 2" }
      }
    },
    story: { structureId: "subtraction", contextId: "c_g1_word_sub_02", entityId: "e_g1_word_sub_02", actionId: "remove" },
    variationGroupId: "vg_g1_word_sub_02",
    similarityGroupId: "sg_subtraction"
  },
  {
    templateId: "g1_word_add_carry_01",
    grade: 1, difficultyLevel: 2,
    unitId: "add_1digit_carry", conceptId: "add_carry_10",
    problemType: "word_problem", answerType: "number_input",
    sentencePatterns: [
      "{person}さんは シールを {a}まい もっています。{b}まい もらいました。ぜんぶで なんまい？",
      "バスに {a}にん のっています。{b}にん のりました。ぜんぶで なんにん？"
    ],
    generate: {
      person: { type: "choice", values: ["あおい", "りく", "さくら"] },
      a: { type: "integer", range: [4, 9] },
      b: { type: "integer", range: [2, 9], constraints: ["a + b >= 10", "a + b <= 18"] },
      answer: { formula: "a + b" }
    },
    answer: { expression: "answer", normalization: "integer" },
    hintSteps: ["10より おおきくなるね。10のまとまりを つくろう。", "{a} + {b} を けいさんしよう。"],
    explanationTemplate: "{a} + {b} ＝ {answer} だね。くり上がりに ちゅういしよう。",
    understandingCheck: {
      enabled: true, type: "choice",
      questionTemplate: "ぜんぶで なんまい（なんにん）？",
      choices: ["{answer}", "{wrong1}", "{wrong2}"],
      answer: "{answer}",
      generateWrong: {
        wrong1: { formula: "answer + 1" },
        wrong2: { formula: "answer - 1" }
      }
    },
    story: { structureId: "addition", contextId: "c_g1_word_add_carry_01", entityId: "e_g1_word_add_carry_01", actionId: "add" },
    variationGroupId: "vg_g1_word_add_carry_01",
    similarityGroupId: "sg_addition"
  },
  {
    templateId: "g1_word_add_carry_02",
    grade: 1, difficultyLevel: 2,
    unitId: "add_1digit_carry", conceptId: "add_carry_10",
    problemType: "word_problem", answerType: "number_input",
    sentencePatterns: [
      "えんぴつが {a}ほん あります。{b}ほん かいました。ぜんぶで なんぼん？",
      "ねこが {a}ひき います。{b}ひき あつまりました。ぜんぶで なんびき？"
    ],
    generate: {
      a: { type: "integer", range: [4, 9] },
      b: { type: "integer", range: [2, 9], constraints: ["a + b >= 10", "a + b <= 18"] },
      answer: { formula: "a + b" }
    },
    answer: { expression: "answer", normalization: "integer" },
    hintSteps: ["10より おおきくなるね。10のまとまりを つくろう。", "{a} + {b} を けいさんしよう。"],
    explanationTemplate: "{a} + {b} ＝ {answer} だね。くり上がりに ちゅういしよう。",
    understandingCheck: {
      enabled: true, type: "choice",
      questionTemplate: "ぜんぶで なんぼん（なんびき）？",
      choices: ["{answer}", "{wrong1}", "{wrong2}"],
      answer: "{answer}",
      generateWrong: {
        wrong1: { formula: "answer + 1" },
        wrong2: { formula: "answer - 1" }
      }
    },
    story: { structureId: "addition", contextId: "c_g1_word_add_carry_02", entityId: "e_g1_word_add_carry_02", actionId: "add" },
    variationGroupId: "vg_g1_word_add_carry_02",
    similarityGroupId: "sg_addition"
  },
  {
    templateId: "g1_word_sub_borrow_01",
    grade: 1, difficultyLevel: 2,
    unitId: "sub_teen_borrow", conceptId: "sub_borrow_10",
    problemType: "word_problem", answerType: "number_input",
    sentencePatterns: [
      "クッキーが {a}まい あります。{b}まい たべました。のこりは なんまい？",
      "えんぴつが {a}ほん あります。{b}ほん つかいました。のこりは なんぼん？"
    ],
    generate: {
      a: { type: "integer", range: [11, 18] },
      b: { type: "integer", range: [2, 9], constraints: ["a - b >= 1", "a - b <= 9"] },
      answer: { formula: "a - b" }
    },
    answer: { expression: "answer", normalization: "integer" },
    hintSteps: ["10のまとまりから ひいてみよう。", "{a} - {b} を けいさんしよう。"],
    explanationTemplate: "{a} - {b} ＝ {answer} だね。くり下がりに ちゅういしよう。",
    understandingCheck: {
      enabled: true, type: "choice",
      questionTemplate: "のこりは いくつ？",
      choices: ["{answer}", "{wrong1}", "{wrong2}"],
      answer: "{answer}",
      generateWrong: {
        wrong1: { formula: "answer + 1" },
        wrong2: { formula: "answer > 1 ? answer - 1 : answer + 2" }
      }
    },
    story: { structureId: "subtraction", contextId: "c_g1_word_sub_borrow_01", entityId: "e_g1_word_sub_borrow_01", actionId: "remove" },
    variationGroupId: "vg_g1_word_sub_borrow_01",
    similarityGroupId: "sg_subtraction"
  },
  {
    templateId: "g1_word_sub_borrow_02",
    grade: 1, difficultyLevel: 2,
    unitId: "sub_teen_borrow", conceptId: "sub_borrow_10",
    problemType: "word_problem", answerType: "number_input",
    sentencePatterns: [
      "テープが {a}cm あります。{b}cm つかいました。のこりは なんcm？",
      "シールが {a}まい あります。{b}まい はりました。のこりは なんまい？"
    ],
    generate: {
      a: { type: "integer", range: [11, 18] },
      b: { type: "integer", range: [2, 9], constraints: ["a - b >= 1", "a - b <= 9"] },
      answer: { formula: "a - b" }
    },
    answer: { expression: "answer", normalization: "integer" },
    hintSteps: ["10のまとまりから ひいてみよう。", "{a} - {b} を けいさんしよう。"],
    explanationTemplate: "{a} - {b} ＝ {answer} だね。くり下がりに ちゅういしよう。",
    understandingCheck: {
      enabled: true, type: "choice",
      questionTemplate: "のこりは いくつ？",
      choices: ["{answer}", "{wrong1}", "{wrong2}"],
      answer: "{answer}",
      generateWrong: {
        wrong1: { formula: "answer + 1" },
        wrong2: { formula: "answer > 1 ? answer - 1 : answer + 2" }
      }
    },
    story: { structureId: "subtraction", contextId: "c_g1_word_sub_borrow_02", entityId: "e_g1_word_sub_borrow_02", actionId: "remove" },
    variationGroupId: "vg_g1_word_sub_borrow_02",
    similarityGroupId: "sg_subtraction"
  },
  {
    templateId: "g1_word_3terms_01",
    grade: 1, difficultyLevel: 3,
    unitId: "add_sub_3terms_20", conceptId: "three_terms_add_sub_20",
    problemType: "word_problem", answerType: "number_input",
    sentencePatterns: [
      "{person}さんは カードを {a}まい もっています。{b}まい もらい、{c}まい あげました。のこりは なんまい？",
      "はこに ボールが {a}こ あります。{b}こ いれて、{c}こ だしました。いまは なんこ？"
    ],
    generate: {
      person: { type: "choice", values: ["たろう", "はなこ", "そうた"] },
      a: { type: "integer", range: [5, 12] },
      b: { type: "integer", range: [2, 8] },
      c: { type: "integer", range: [1, 6], constraints: ["a + b - c >= 1", "a + b - c <= 20"] },
      answer: { formula: "a + b - c" }
    },
    answer: { expression: "answer", normalization: "integer" },
    hintSteps: ["まず {a} + {b} を けいさんしよう。", "つぎに その こたえから {c} を ひこう。"],
    explanationTemplate: "{a} + {b} - {c} ＝ {answer} だね。じゅんばんに けいさんしよう。",
    understandingCheck: {
      enabled: true, type: "choice",
      questionTemplate: "のこりは なんまい（なんこ）？",
      choices: ["{answer}", "{wrong1}", "{wrong2}"],
      answer: "{answer}",
      generateWrong: {
        wrong1: { formula: "answer + 2" },
        wrong2: { formula: "answer > 2 ? answer - 2 : answer + 3" }
      }
    },
    story: { structureId: "add_sub_3terms", contextId: "c_g1_word_3terms_01", entityId: "e_g1_word_3terms_01", actionId: "add_remove" },
    variationGroupId: "vg_g1_word_3terms_01",
    similarityGroupId: "sg_add_sub_3terms"
  },

  // --- Grade 2 ---
  {
    templateId: "g2_word_add_2digit_01",
    grade: 2, difficultyLevel: 1,
    unitId: "addition_2digit", conceptId: "add_2digit_basic",
    problemType: "word_problem", answerType: "number_input",
    sentencePatterns: [
      "{person}さんは シールを {a}まい もっています。{b}まい もらいました。ぜんぶで なんまい？",
      "赤い おりがみが {a}まい、青い おりがみが {b}まい あります。あわせて なんまい？"
    ],
    generate: {
      person: { type: "choice", values: ["えみ", "けんじ", "みさき"] },
      a: { type: "integer", range: [11, 60] },
      b: { type: "integer", range: [11, 30], constraints: ["(a % 10) + (b % 10) <= 9", "a + b <= 99"] },
      answer: { formula: "a + b" }
    },
    answer: { expression: "answer", normalization: "integer" },
    hintSteps: ["一の位と 十の位に わけて たそう。", "{a} + {b} を けいさんしよう。"],
    explanationTemplate: "{a} + {b} ＝ {answer} だね。",
    understandingCheck: {
      enabled: true, type: "choice",
      questionTemplate: "あわせると なんまい？",
      choices: ["{answer}", "{wrong1}", "{wrong2}"],
      answer: "{answer}",
      generateWrong: {
        wrong1: { formula: "answer + 10" },
        wrong2: { formula: "answer - 10" }
      }
    },
    story: { structureId: "addition", contextId: "c_g2_word_add_2digit_01", entityId: "e_g2_word_add_2digit_01", actionId: "add" },
    variationGroupId: "vg_g2_word_add_2digit_01",
    similarityGroupId: "sg_addition"
  },
  {
    templateId: "g2_word_add_2digit_02",
    grade: 2, difficultyLevel: 1,
    unitId: "addition_2digit", conceptId: "add_2digit_basic",
    problemType: "word_problem", answerType: "number_input",
    sentencePatterns: [
      "りんごが {a}こ、なしが {b}こ あります。ぜんぶで なんこ？",
      "本が {a}さつ あります。{b}さつ かいました。ぜんぶで なんさつ？"
    ],
    generate: {
      a: { type: "integer", range: [11, 60] },
      b: { type: "integer", range: [11, 30], constraints: ["(a % 10) + (b % 10) <= 9", "a + b <= 99"] },
      answer: { formula: "a + b" }
    },
    answer: { expression: "answer", normalization: "integer" },
    hintSteps: ["一の位と 十の位に わけて たそう。", "{a} + {b} を けいさんしよう。"],
    explanationTemplate: "{a} + {b} ＝ {answer} だね。",
    understandingCheck: {
      enabled: true, type: "choice",
      questionTemplate: "ぜんぶで なんこ（なんさつ）？",
      choices: ["{answer}", "{wrong1}", "{wrong2}"],
      answer: "{answer}",
      generateWrong: {
        wrong1: { formula: "answer + 10" },
        wrong2: { formula: "answer - 10" }
      }
    },
    story: { structureId: "addition", contextId: "c_g2_word_add_2digit_02", entityId: "e_g2_word_add_2digit_02", actionId: "add" },
    variationGroupId: "vg_g2_word_add_2digit_02",
    similarityGroupId: "sg_addition"
  },
  {
    templateId: "g2_word_kuku_01",
    grade: 2, difficultyLevel: 2,
    unitId: "multiplication_g2", conceptId: "kuku_basic_groups",
    problemType: "word_problem", answerType: "number_input",
    sentencePatterns: [
      "ふくろに あめが {b}こ はいっています。{a}ふくろ あると ぜんぶで なんこ？",
      "いちぐみが {a}れつ あり、1れつに {b}にん います。ぜんぶで なんにん？"
    ],
    generate: {
      a: { type: "integer", range: [2, 5] },
      b: { type: "integer", range: [2, 5] },
      answer: { formula: "a * b" }
    },
    answer: { expression: "answer", normalization: "integer" },
    hintSteps: ["{a} × {b} の かけ算だよ。{b} を {a}かい たそう。", "{a} × {b} ＝ ?"],
    explanationTemplate: "{a} × {b} ＝ {answer} だね。",
    understandingCheck: {
      enabled: true, type: "choice",
      questionTemplate: "ぜんぶで なんこ（なんにん）？",
      choices: ["{answer}", "{wrong1}", "{wrong2}"],
      answer: "{answer}",
      generateWrong: {
        wrong1: { formula: "answer + b" },
        wrong2: { formula: "answer - b > 0 ? answer - b : answer + a" }
      }
    },
    story: { structureId: "multiplication", contextId: "c_g2_word_kuku_01", entityId: "e_g2_word_kuku_01", actionId: "multiply" },
    variationGroupId: "vg_g2_word_kuku_01",
    similarityGroupId: "sg_multiplication"
  },
  {
    templateId: "g2_word_kuku_02",
    grade: 2, difficultyLevel: 2,
    unitId: "multiplication_g2", conceptId: "kuku_basic_groups",
    problemType: "word_problem", answerType: "number_input",
    sentencePatterns: [
      "ねこが {a}ひき います。1ぴきに 足は 4本。足は ぜんぶで なんぼん？",
      "{person}さんは {a}日 まい日 {b}こ おかしを たべます。ぜんぶで なんこ？"
    ],
    generate: {
      person: { type: "choice", values: ["たろう", "はなこ", "そうた"] },
      a: { type: "integer", range: [2, 5] },
      b: { type: "integer", range: [2, 5] },
      answer: { formula: "a * 4" }
    },
    answer: { expression: "answer", normalization: "integer" },
    hintSteps: ["1ぴきに 4本 だから {a} × 4 だね。", "{a} × 4 ＝ ?"],
    explanationTemplate: "{a} × 4 ＝ {answer} だね。",
    understandingCheck: {
      enabled: true, type: "choice",
      questionTemplate: "ぜんぶで なんぼん（なんこ）？",
      choices: ["{answer}", "{wrong1}", "{wrong2}"],
      answer: "{answer}",
      generateWrong: {
        wrong1: { formula: "answer + 4" },
        wrong2: { formula: "answer - 4 > 0 ? answer - 4 : answer + 4" }
      }
    },
    story: { structureId: "multiplication", contextId: "c_g2_word_kuku_02", entityId: "e_g2_word_kuku_02", actionId: "multiply" },
    variationGroupId: "vg_g2_word_kuku_02",
    similarityGroupId: "sg_multiplication"
  },
  {
    templateId: "g2_word_kuku_03",
    grade: 2, difficultyLevel: 2,
    unitId: "multiplication_g2", conceptId: "kuku_basic_groups",
    problemType: "word_problem", answerType: "number_input",
    sentencePatterns: [
      "1こ {b}えんの あめを {a}こ かいました。だい金は なんえん？",
      "1まい {b}えんの カードを {a}まい かいました。だい金は なんえん？"
    ],
    generate: {
      a: { type: "integer", range: [2, 5] },
      b: { type: "integer", range: [2, 5] },
      answer: { formula: "a * b" }
    },
    answer: { expression: "answer", normalization: "integer" },
    hintSteps: ["1この ねだん かける かず だよ。", "{a} × {b} ＝ ?"],
    explanationTemplate: "{a} × {b} ＝ {answer} だね。",
    understandingCheck: {
      enabled: true, type: "choice",
      questionTemplate: "だい金は なんえん？",
      choices: ["{answer}", "{wrong1}", "{wrong2}"],
      answer: "{answer}",
      generateWrong: {
        wrong1: { formula: "answer + b" },
        wrong2: { formula: "answer - b > 0 ? answer - b : answer + a" }
      }
    },
    story: { structureId: "multiplication", contextId: "c_g2_word_kuku_03", entityId: "e_g2_word_kuku_03", actionId: "multiply" },
    variationGroupId: "vg_g2_word_kuku_03",
    similarityGroupId: "sg_multiplication"
  },
  {
    templateId: "g2_word_kuku_adv_01",
    grade: 2, difficultyLevel: 3,
    unitId: "multiplication_g2", conceptId: "kuku_advanced_groups",
    problemType: "word_problem", answerType: "number_input",
    sentencePatterns: [
      "1はこに ケーキが {b}こ はいっています。{a}はこ ぶんは ぜんぶで なんこ？",
      "テーブルが {a}つ あり、それぞれ {b}ほんずつ えんぴつが おいてあります。ぜんぶで なんほん？"
    ],
    generate: {
      a: { type: "integer", range: [6, 9] },
      b: { type: "integer", range: [6, 9] },
      answer: { formula: "a * b" }
    },
    answer: { expression: "answer", normalization: "integer" },
    hintSteps: ["{a}のだん の 九九を つかおう。", "{a} × {b} ＝ ?"],
    explanationTemplate: "{a} × {b} ＝ {answer} だね。",
    understandingCheck: {
      enabled: true, type: "choice",
      questionTemplate: "ぜんぶで なんこ（なんほん）？",
      choices: ["{answer}", "{wrong1}", "{wrong2}"],
      answer: "{answer}",
      generateWrong: {
        wrong1: { formula: "answer + b" },
        wrong2: { formula: "answer - b > 0 ? answer - b : answer + a" }
      }
    },
    story: { structureId: "multiplication", contextId: "c_g2_word_kuku_adv_01", entityId: "e_g2_word_kuku_adv_01", actionId: "multiply" },
    variationGroupId: "vg_g2_word_kuku_adv_01",
    similarityGroupId: "sg_multiplication"
  },

  // --- Grade 3 ---
  {
    templateId: "g3_word_add3digit_01",
    grade: 3, difficultyLevel: 1,
    unitId: "add_sub_3digit", conceptId: "add_sub_3digit_basic",
    problemType: "word_problem", answerType: "number_input",
    sentencePatterns: [
      "図書館に 本が {a}さつ あります。{b}さつ 新しく 入りました。ぜんぶで なんさつ？",
      "学校に 生徒が {a}人 います。{b}人 転校して きました。ぜんぶで なん人？"
    ],
    generate: {
      a: { type: "integer", range: [200, 700] },
      b: { type: "integer", range: [100, 299], constraints: ["a + b <= 999"] },
      answer: { formula: "a + b" }
    },
    answer: { expression: "answer", normalization: "integer" },
    hintSteps: ["百の位・十の位・一の位に わけて 考えよう。", "{a} + {b} を 計算しよう。"],
    explanationTemplate: "{a} + {b} ＝ {answer} だね。",
    understandingCheck: {
      enabled: true, type: "choice",
      questionTemplate: "ぜんぶで なんさつ（なん人）？",
      choices: ["{answer}", "{wrong1}", "{wrong2}"],
      answer: "{answer}",
      generateWrong: {
        wrong1: { formula: "answer + 100" },
        wrong2: { formula: "answer - 100" }
      }
    },
    story: { structureId: "addition", contextId: "c_g3_word_add3digit_01", entityId: "e_g3_word_add3digit_01", actionId: "add" },
    variationGroupId: "vg_g3_word_add3digit_01",
    similarityGroupId: "sg_addition"
  },
  {
    templateId: "g3_word_add3digit_02",
    grade: 3, difficultyLevel: 1,
    unitId: "add_sub_3digit", conceptId: "add_sub_3digit_basic",
    problemType: "word_problem", answerType: "number_input",
    sentencePatterns: [
      "花が {a}本 あります。{b}本 さきました。ぜんぶで なん本？",
      "シールが {a}まい あります。{b}まい もらいました。ぜんぶで なんまい？"
    ],
    generate: {
      a: { type: "integer", range: [200, 700] },
      b: { type: "integer", range: [100, 299], constraints: ["a + b <= 999"] },
      answer: { formula: "a + b" }
    },
    answer: { expression: "answer", normalization: "integer" },
    hintSteps: ["百の位・十の位・一の位に わけて 考えよう。", "{a} + {b} を 計算しよう。"],
    explanationTemplate: "{a} + {b} ＝ {answer} だね。",
    understandingCheck: {
      enabled: true, type: "choice",
      questionTemplate: "ぜんぶで なん本（なんまい）？",
      choices: ["{answer}", "{wrong1}", "{wrong2}"],
      answer: "{answer}",
      generateWrong: {
        wrong1: { formula: "answer + 100" },
        wrong2: { formula: "answer - 100" }
      }
    },
    story: { structureId: "addition", contextId: "c_g3_word_add3digit_02", entityId: "e_g3_word_add3digit_02", actionId: "add" },
    variationGroupId: "vg_g3_word_add3digit_02",
    similarityGroupId: "sg_addition"
  },
  {
    templateId: "g3_word_div_01",
    grade: 3, difficultyLevel: 2,
    unitId: "div_no_remainder", conceptId: "division_equal_share",
    problemType: "word_problem", answerType: "number_input",
    sentencePatterns: [
      "クッキーが {total}まい あります。{b}人で 同じ数ずつ 分けると、1人 なんまい？",
      "えんぴつ {total}ほんを {b}人で 同じ数ずつ 分けると、1人 なんほん？"
    ],
    generate: {
      b: { type: "integer", range: [2, 9] },
      answer: { type: "integer", range: [2, 9] },
      total: { formula: "b * answer" }
    },
    answer: { expression: "answer", normalization: "integer" },
    hintSteps: ["{total} ÷ {b} の わり算だよ。", "{b} × □ ＝ {total} になる □ を 求めよう。"],
    explanationTemplate: "{total} ÷ {b} ＝ {answer} だね。",
    understandingCheck: {
      enabled: true, type: "choice",
      questionTemplate: "1人 なんまい（なんほん）？",
      choices: ["{answer}", "{wrong1}", "{wrong2}"],
      answer: "{answer}",
      generateWrong: {
        wrong1: { formula: "answer + 1" },
        wrong2: { formula: "answer > 1 ? answer - 1 : answer + 2" }
      }
    },
    story: { structureId: "division", contextId: "c_g3_word_div_01", entityId: "e_g3_word_div_01", actionId: "divide" },
    variationGroupId: "vg_g3_word_div_01",
    similarityGroupId: "sg_division"
  },
  {
    templateId: "g3_word_div_02",
    grade: 3, difficultyLevel: 2,
    unitId: "div_no_remainder", conceptId: "division_equal_share",
    problemType: "word_problem", answerType: "number_input",
    sentencePatterns: [
      "{total}本の 花を 同じ数ずつ {b}本 ずつ たばに します。なんたば できますか？",
      "{total}こ のおかしを {b}こ ずつ ふくろに 入れます。なんふくろ できますか？"
    ],
    generate: {
      b: { type: "integer", range: [2, 9] },
      answer: { type: "integer", range: [2, 9] },
      total: { formula: "b * answer" }
    },
    answer: { expression: "answer", normalization: "integer" },
    hintSteps: ["{total} ÷ {b} の わり算だよ。", "{b} × □ ＝ {total} になる □ を 求めよう。"],
    explanationTemplate: "{total} ÷ {b} ＝ {answer} だね。",
    understandingCheck: {
      enabled: true, type: "choice",
      questionTemplate: "なんたば（なんふくろ）？",
      choices: ["{answer}", "{wrong1}", "{wrong2}"],
      answer: "{answer}",
      generateWrong: {
        wrong1: { formula: "answer + 1" },
        wrong2: { formula: "answer > 1 ? answer - 1 : answer + 2" }
      }
    },
    story: { structureId: "division", contextId: "c_g3_word_div_02", entityId: "e_g3_word_div_02", actionId: "divide" },
    variationGroupId: "vg_g3_word_div_02",
    similarityGroupId: "sg_division"
  },
  {
    templateId: "g3_word_div_03",
    grade: 3, difficultyLevel: 2,
    unitId: "div_no_remainder", conceptId: "division_equal_share",
    problemType: "word_problem", answerType: "number_input",
    sentencePatterns: [
      "1はこに {b}こ はいります。{total}こ の おかしは なんはこ できますか？",
      "1ふくろ {b}こ ずつ 入れます。{total}こ の あめは なんふくろ？"
    ],
    generate: {
      b: { type: "integer", range: [2, 9] },
      answer: { type: "integer", range: [2, 9] },
      total: { formula: "b * answer" }
    },
    answer: { expression: "answer", normalization: "integer" },
    hintSteps: ["{total} を {b} で わろう。", "{total} ÷ {b} ＝ ?"],
    explanationTemplate: "{total} ÷ {b} ＝ {answer} だね。",
    understandingCheck: {
      enabled: true, type: "choice",
      questionTemplate: "なんはこ（なんふくろ）？",
      choices: ["{answer}", "{wrong1}", "{wrong2}"],
      answer: "{answer}",
      generateWrong: {
        wrong1: { formula: "answer + 1" },
        wrong2: { formula: "answer > 1 ? answer - 1 : answer + 2" }
      }
    },
    story: { structureId: "division", contextId: "c_g3_word_div_03", entityId: "e_g3_word_div_03", actionId: "divide" },
    variationGroupId: "vg_g3_word_div_03",
    similarityGroupId: "sg_division"
  },
  {
    templateId: "g3_word_div_rem_01",
    grade: 3, difficultyLevel: 3,
    unitId: "div_with_remainder", conceptId: "division_with_remainder",
    problemType: "word_problem", answerType: "number_input",
    sentencePatterns: [
      "あめ {total}こを {b}人で 同じ数ずつ 分けると、1人 なんこ もらえて、なんこ あまる？ あまりを 答えてください。",
      "折り紙 {total}まいを 1人 {b}まいずつ 配ります。なんまい あまる？"
    ],
    generate: {
      b: { type: "integer", range: [3, 8] },
      q: { type: "integer", range: [2, 9] },
      r: { type: "integer", range: [1, 7], constraints: ["r < b"] },
      total: { formula: "b * q + r" },
      answer: { formula: "r" }
    },
    answer: { expression: "answer", normalization: "integer" },
    hintSteps: ["{total} ÷ {b} ＝ □ あまり □ を 計算しよう。", "あまりの 数が 答えだよ。"],
    explanationTemplate: "{total} ÷ {b} ＝ {q} あまり {answer} だね。",
    understandingCheck: {
      enabled: true, type: "choice",
      questionTemplate: "あまりは なんこ（なんまい）？",
      choices: ["{answer}", "{wrong1}", "{wrong2}"],
      answer: "{answer}",
      generateWrong: {
        wrong1: { formula: "answer + 1 < b ? answer + 1 : answer - 1" },
        wrong2: { formula: "answer + 2 < b ? answer + 2 : 0" }
      }
    },
    story: { structureId: "division_rem", contextId: "c_g3_word_div_rem_01", entityId: "e_g3_word_div_rem_01", actionId: "divide" },
    variationGroupId: "vg_g3_word_div_rem_01",
    similarityGroupId: "sg_division_rem"
  },

  // --- Grade 4 ---
  {
    templateId: "g4_word_mul_2x2_01",
    grade: 4, difficultyLevel: 1,
    unitId: "mul_2digit_2digit", conceptId: "mul_2digit_2digit_basic",
    problemType: "word_problem", answerType: "number_input",
    sentencePatterns: [
      "1箱に みかんが {a}こ 入っています。{b}箱 あると ぜんぶで なんこ？",
      "教室に 机が {a}列、{b}つずつ あります。机は 全部で なんこ？"
    ],
    generate: {
      a: { type: "integer", range: [11, 39] },
      b: { type: "integer", range: [11, 29] },
      answer: { formula: "a * b" }
    },
    answer: { expression: "answer", normalization: "integer" },
    hintSteps: ["{a} × {b} を 計算しよう。", "十の位と 一の位に わけて 計算してみよう。"],
    explanationTemplate: "{a} × {b} ＝ {answer} だね。",
    understandingCheck: {
      enabled: true, type: "choice",
      questionTemplate: "ぜんぶで なんこ？",
      choices: ["{answer}", "{wrong1}", "{wrong2}"],
      answer: "{answer}",
      generateWrong: {
        wrong1: { formula: "answer + a" },
        wrong2: { formula: "answer - b > 0 ? answer - b : answer + b" }
      }
    },
    story: { structureId: "multiplication", contextId: "c_g4_word_mul_2x2_01", entityId: "e_g4_word_mul_2x2_01", actionId: "multiply" },
    variationGroupId: "vg_g4_word_mul_2x2_01",
    similarityGroupId: "sg_multiplication"
  },
  {
    templateId: "g4_word_mul_2x2_02",
    grade: 4, difficultyLevel: 1,
    unitId: "mul_2digit_2digit", conceptId: "mul_2digit_2digit_basic",
    problemType: "word_problem", answerType: "number_input",
    sentencePatterns: [
      "1箱に チョコが {a}こ 入っています。{b}箱 あると ぜんぶで なんこ？",
      "ノートが 1ふくろ {a}さつ 入りです。{b}ふくろ あると ぜんぶで なんさつ？"
    ],
    generate: {
      a: { type: "integer", range: [11, 39] },
      b: { type: "integer", range: [11, 29] },
      answer: { formula: "a * b" }
    },
    answer: { expression: "answer", normalization: "integer" },
    hintSteps: ["{a} × {b} を 計算しよう。", "十の位と 一の位に わけて 計算してみよう。"],
    explanationTemplate: "{a} × {b} ＝ {answer} だね。",
    understandingCheck: {
      enabled: true, type: "choice",
      questionTemplate: "ぜんぶで なんこ（なんさつ）？",
      choices: ["{answer}", "{wrong1}", "{wrong2}"],
      answer: "{answer}",
      generateWrong: {
        wrong1: { formula: "answer + a" },
        wrong2: { formula: "answer - b > 0 ? answer - b : answer + b" }
      }
    },
    story: { structureId: "multiplication", contextId: "c_g4_word_mul_2x2_02", entityId: "e_g4_word_mul_2x2_02", actionId: "multiply" },
    variationGroupId: "vg_g4_word_mul_2x2_02",
    similarityGroupId: "sg_multiplication"
  },
  {
    templateId: "g4_word_decimal_add_01",
    grade: 4, difficultyLevel: 2,
    unitId: "decimal_add_sub", conceptId: "decimal_add_sub_basic",
    problemType: "word_problem", answerType: "number_input",
    sentencePatterns: [
      "ジュースが {a}L あります。{b}L 飲みました。残りは なんL？",
      "リボンが {a}m あります。{b}m 使いました。残りは なんm？"
    ],
    generate: {
      a_int: { type: "integer", range: [2, 9] },
      a_dec: { type: "integer", range: [1, 9] },
      b_int: { type: "integer", range: [1, 4] },
      b_dec: { type: "integer", range: [1, 9] },
      // V2.9.5 修正: 「残り」を求める問題なのに a < b の組み合わせでは答えが負になり
      // （例: ジュースが 2.3L あります。4.3L 飲みました。→ -2.0）。
      // 回答は数値テンキー入力で「−」キーが無いため負の答えは入力不可能で、
      // 必ず3回不正解 → 復習キュー汚染・弱点単元化につながる。
      // constraints により a > b が保証される（= 答えが 0 より大きい）。
      answer: {
        formula: "Math.round((a_int + a_dec * 0.1 - b_int - b_dec * 0.1) * 10) / 10",
        constraints: ["answer > 0"]
      },
      a: { formula: "a_int + a_dec * 0.1" },
      b: { formula: "b_int + b_dec * 0.1" }
    },
    answer: { expression: "answer", normalization: "decimal" },
    hintSteps: ["{a} - {b} を 計算しよう。", "小数点の 位置に 気をつけよう。"],
    explanationTemplate: "{a} - {b} ＝ {answer} だね。",
    understandingCheck: {
      enabled: true, type: "choice",
      questionTemplate: "残りは なんL（なんm）？",
      choices: ["{answer}", "{wrong1}", "{wrong2}"],
      answer: "{answer}",
      generateWrong: {
        wrong1: { formula: "Math.round((answer + 0.5) * 10) / 10" },
        wrong2: { formula: "Math.round((answer - 0.5 > 0 ? answer - 0.5 : answer + 1.0) * 10) / 10" }
      }
    },
    story: { structureId: "subtraction_decimal", contextId: "c_g4_word_decimal_add_01", entityId: "e_g4_word_decimal_add_01", actionId: "remove" },
    variationGroupId: "vg_g4_word_decimal_add_01",
    similarityGroupId: "sg_subtraction_decimal"
  },
  {
    templateId: "g4_word_decimal_add_02",
    grade: 4, difficultyLevel: 2,
    unitId: "decimal_add_sub", conceptId: "decimal_add_sub_basic",
    problemType: "word_problem", answerType: "number_input",
    sentencePatterns: [
      "ジュースが {a}L と お茶が {b}L あります。あわせて なんL？",
      "赤い リボンが {a}m、青い リボンが {b}m あります。ぜんぶで なんm？"
    ],
    generate: {
      a_int: { type: "integer", range: [2, 9] },
      a_dec: { type: "integer", range: [1, 9] },
      b_int: { type: "integer", range: [1, 4] },
      b_dec: { type: "integer", range: [1, 9] },
      answer: { formula: "Math.round((a_int + a_dec * 0.1 + b_int + b_dec * 0.1) * 10) / 10" },
      a: { formula: "a_int + a_dec * 0.1" },
      b: { formula: "b_int + b_dec * 0.1" }
    },
    answer: { expression: "answer", normalization: "integer" },
    hintSteps: ["{a} + {b} を 計算しよう。", "小数点の 位置に 気をつけよう。"],
    explanationTemplate: "{a} + {b} ＝ {answer} だね。",
    understandingCheck: {
      enabled: true, type: "choice",
      questionTemplate: "あわせて なんL（なんm）？",
      choices: ["{answer}", "{wrong1}", "{wrong2}"],
      answer: "{answer}",
      generateWrong: {
        wrong1: { formula: "Math.round((answer + 0.5) * 10) / 10" },
        wrong2: { formula: "Math.round((answer - 0.5 > 0 ? answer - 0.5 : answer + 1.0) * 10) / 10" }
      }
    },
    story: { structureId: "addition_decimal", contextId: "c_g4_word_decimal_add_02", entityId: "e_g4_word_decimal_add_02", actionId: "add" },
    variationGroupId: "vg_g4_word_decimal_add_02",
    similarityGroupId: "sg_addition_decimal"
  },
  {
    templateId: "g4_word_decimal_mul_01",
    grade: 4, difficultyLevel: 3,
    unitId: "decimal_mul_basic", conceptId: "decimal_mul_integer",
    problemType: "word_problem", answerType: "number_input",
    sentencePatterns: [
      "1本 {a}mの テープが {b}本 あります。全部で なんm？",
      "1個 {a}kgの 荷物が {b}個 あります。合計で なんkg？"
    ],
    generate: {
      a_int: { type: "integer", range: [1, 5] },
      a_dec: { type: "integer", range: [1, 9] },
      b: { type: "integer", range: [2, 9] },
      a: { formula: "a_int + a_dec * 0.1" },
      answer: { formula: "Math.round((a_int + a_dec * 0.1) * b * 10) / 10" }
    },
    answer: { expression: "answer", normalization: "integer" },
    hintSteps: ["{a} × {b} を 計算しよう。", "小数点の 位置に 気をつけよう。"],
    explanationTemplate: "{a} × {b} ＝ {answer} だね。",
    understandingCheck: {
      enabled: true, type: "choice",
      questionTemplate: "合計で なんm（なんkg）？",
      choices: ["{answer}", "{wrong1}", "{wrong2}"],
      answer: "{answer}",
      generateWrong: {
        wrong1: { formula: "Math.round((answer + b) * 10) / 10" },
        wrong2: { formula: "Math.round((answer - b > 0 ? answer - b : answer + 1) * 10) / 10" }
      }
    },
    story: { structureId: "multiplication_decimal", contextId: "c_g4_word_decimal_mul_01", entityId: "e_g4_word_decimal_mul_01", actionId: "multiply" },
    variationGroupId: "vg_g4_word_decimal_mul_01",
    similarityGroupId: "sg_multiplication_decimal"
  },

  // --- Grade 5 ---
  {
    templateId: "g5_word_frac_same_01",
    grade: 5, difficultyLevel: 1,
    unitId: "fraction_add_sub_same_denom", conceptId: "fraction_same_denom",
    problemType: "word_problem", answerType: "number_input",
    sentencePatterns: [
      "ピザが 1枚 あります。{person1}さんが {a}/{d} 食べ、{person2}さんが {b}/{d} 食べました。2人 あわせて いくつ分 食べた？（分子を 答えてください）",
      "テープが あります。{a}/{d}m 使い、さらに {b}/{d}m 使いました。合計で いくつ分 使った？（分子を 答えてください）"
    ],
    generate: {
      person1: { type: "choice", values: ["たろう", "あいこ", "けんた"] },
      person2: { type: "choice", values: ["はなこ", "そうた", "みく"] },
      d: { type: "integer", range: [5, 9] },
      a: { type: "integer", range: [1, 3] },
      b: { type: "integer", range: [1, 3], constraints: ["a + b < d"] },
      answer: { formula: "a + b" }
    },
    answer: { expression: "answer", normalization: "integer" },
    hintSteps: ["分母が 同じ 分数は 分子だけ 足せばいいよ。", "{a} + {b} ＝ ?"],
    explanationTemplate: "{a}/{d} + {b}/{d} ＝ {answer}/{d} だね。分子は {answer} だよ。",
    understandingCheck: {
      enabled: true, type: "choice",
      questionTemplate: "分子は いくつ？",
      choices: ["{answer}", "{wrong1}", "{wrong2}"],
      answer: "{answer}",
      generateWrong: {
        wrong1: { formula: "answer + 1" },
        wrong2: { formula: "answer > 1 ? answer - 1 : answer + 2" }
      }
    },
    story: { structureId: "fraction_addition", contextId: "c_g5_word_frac_same_01", entityId: "e_g5_word_frac_same_01", actionId: "add" },
    variationGroupId: "vg_g5_word_frac_same_01",
    similarityGroupId: "sg_fraction_addition"
  },
  {
    templateId: "g5_word_frac_same_02",
    grade: 5, difficultyLevel: 1,
    unitId: "fraction_add_sub_same_denom", conceptId: "fraction_same_denom",
    problemType: "word_problem", answerType: "number_input",
    sentencePatterns: [
      "ケーキが 1こ あります。{person1}さんが {a}/{d} 食べ、{person2}さんが {b}/{d} 食べました。あわせて いくつ分？（分子を 答えてください）",
      "ジュースが あります。{a}/{d}L 飲み、さらに {b}/{d}L 飲みました。合計で いくつ分？（分子を 答えてください）"
    ],
    generate: {
      person1: { type: "choice", values: ["ゆうた", "みお", "しょう"] },
      person2: { type: "choice", values: ["ことね", "そうた", "ほなみ"] },
      d: { type: "integer", range: [5, 9] },
      a: { type: "integer", range: [1, 3] },
      b: { type: "integer", range: [1, 3], constraints: ["a + b < d"] },
      answer: { formula: "a + b" }
    },
    answer: { expression: "answer", normalization: "integer" },
    hintSteps: ["分母が 同じ 分数は 分子だけ 足せばいいよ。", "{a} + {b} ＝ ?"],
    explanationTemplate: "{a}/{d} + {b}/{d} ＝ {answer}/{d} だね。分子は {answer} だよ。",
    understandingCheck: {
      enabled: true, type: "choice",
      questionTemplate: "分子は いくつ？",
      choices: ["{answer}", "{wrong1}", "{wrong2}"],
      answer: "{answer}",
      generateWrong: {
        wrong1: { formula: "answer + 1" },
        wrong2: { formula: "answer > 1 ? answer - 1 : answer + 2" }
      }
    },
    story: { structureId: "fraction_addition", contextId: "c_g5_word_frac_same_02", entityId: "e_g5_word_frac_same_02", actionId: "add" },
    variationGroupId: "vg_g5_word_frac_same_02",
    similarityGroupId: "sg_fraction_addition"
  },
  {
    templateId: "g5_word_decimal_mul_01",
    grade: 5, difficultyLevel: 2,
    unitId: "decimal_mul", conceptId: "decimal_mul_algorithm",
    problemType: "word_problem", answerType: "number_input",
    sentencePatterns: [
      "1mの値段が {a}円の リボンを {b}m 買います。代金は なん円？",
      "時速 {a}kmで {b}時間 走ると なんkm 進む？"
    ],
    generate: {
      a: { type: "integer", range: [120, 450] },
      b_int: { type: "integer", range: [1, 4] },
      b_dec: { type: "integer", range: [1, 9] },
      b: { formula: "b_int + b_dec * 0.1" },
      answer: { formula: "Math.round(a * (b_int + b_dec * 0.1) * 10) / 10" }
    },
    answer: { expression: "answer", normalization: "integer" },
    hintSteps: ["{a} × {b} を 計算しよう。", "小数点の 位置を 確認しよう。"],
    explanationTemplate: "{a} × {b} ＝ {answer} だね。",
    understandingCheck: {
      enabled: true, type: "choice",
      questionTemplate: "代金（または 距離）は いくつ？",
      choices: ["{answer}", "{wrong1}", "{wrong2}"],
      answer: "{answer}",
      generateWrong: {
        wrong1: { formula: "Math.round((answer + a) * 10) / 10" },
        wrong2: { formula: "Math.round((answer - a > 0 ? answer - a : answer + 10) * 10) / 10" }
      }
    },
    story: { structureId: "multiplication_decimal2", contextId: "c_g5_word_decimal_mul_01", entityId: "e_g5_word_decimal_mul_01", actionId: "multiply" },
    variationGroupId: "vg_g5_word_decimal_mul_01",
    similarityGroupId: "sg_multiplication_decimal2"
  },
  {
    templateId: "g5_word_percent_01",
    grade: 5, difficultyLevel: 3,
    unitId: "percentage_basic", conceptId: "percentage_ratio_concept",
    problemType: "word_problem", answerType: "number_input",
    sentencePatterns: [
      "{total}人の 生徒のうち、{pct}% が 眼鏡を かけています。眼鏡を かけている 生徒は なん人？",
      "定価 {total}円の {pct}% 引きで 売ります。値引き額は なん円？"
    ],
    generate: {
      total: { type: "choice", values: [200, 400, 500, 1000] },
      pct: { type: "choice", values: [10, 20, 25, 50] },
      answer: { formula: "total * pct / 100" }
    },
    answer: { expression: "answer", normalization: "integer" },
    hintSteps: ["割合 ＝ 全体 × パーセント ÷ 100 で 求めよう。", "{total} × {pct} ÷ 100 ＝ ?"],
    explanationTemplate: "{total} × {pct} ÷ 100 ＝ {answer} だね。",
    understandingCheck: {
      enabled: true, type: "choice",
      questionTemplate: "答えは いくつ？",
      choices: ["{answer}", "{wrong1}", "{wrong2}"],
      answer: "{answer}",
      generateWrong: {
        wrong1: { formula: "answer + total * 0.05" },
        wrong2: { formula: "answer - total * 0.05 > 0 ? answer - total * 0.05 : answer * 2" }
      }
    },
    story: { structureId: "percentage", contextId: "c_g5_word_percent_01", entityId: "e_g5_word_percent_01", actionId: "calculate" },
    variationGroupId: "vg_g5_word_percent_01",
    similarityGroupId: "sg_percentage"
  },
  {
    templateId: "g5_word_percent_02",
    grade: 5, difficultyLevel: 3,
    unitId: "percentage_basic", conceptId: "percentage_ratio_concept",
    problemType: "word_problem", answerType: "number_input",
    sentencePatterns: [
      "本が {total}さつ あります。そのうち {pct}% が にほんごの本です。にほんごの本は なんさつ？",
      "クラスの {total}人 のうち、{pct}% が サッカーを します。サッカーをする人は なん人？"
    ],
    generate: {
      total: { type: "choice", values: [200, 400, 500, 1000] },
      pct: { type: "choice", values: [10, 20, 25, 50] },
      answer: { formula: "total * pct / 100" }
    },
    answer: { expression: "answer", normalization: "integer" },
    hintSteps: ["割合 ＝ 全体 × パーセント ÷ 100 で 求めよう。", "{total} × {pct} ÷ 100 ＝ ?"],
    explanationTemplate: "{total} × {pct} ÷ 100 ＝ {answer} だね。",
    understandingCheck: {
      enabled: true, type: "choice",
      questionTemplate: "答えは いくつ？",
      choices: ["{answer}", "{wrong1}", "{wrong2}"],
      answer: "{answer}",
      generateWrong: {
        wrong1: { formula: "answer + total * 0.05" },
        wrong2: { formula: "answer - total * 0.05 > 0 ? answer - total * 0.05 : answer * 2" }
      }
    },
    story: { structureId: "percentage", contextId: "c_g5_word_percent_02", entityId: "e_g5_word_percent_02", actionId: "calculate" },
    variationGroupId: "vg_g5_word_percent_02",
    similarityGroupId: "sg_percentage"
  },

  // --- Grade 6 ---
  {
    templateId: "g6_word_frac_div_01",
    grade: 6, difficultyLevel: 1,
    unitId: "fraction_div_basic", conceptId: "fraction_div_inverse",
    problemType: "word_problem", answerType: "number_input",
    sentencePatterns: [
      "{a}/{b}m のテープを {c}等分すると、1本 なんm？ 分子を 答えてください。",
      "{a}/{b}Lの ジュースを {c}人で 等しく 分けると、1人 なんL？ 分子を 答えてください。"
    ],
    generate: {
      a: { type: "integer", range: [2, 6] },
      b: { type: "integer", range: [3, 8], constraints: ["a < b"] },
      c: { type: "integer", range: [2, 4] },
      answer: { formula: "a" }
    },
    answer: { expression: "answer", normalization: "integer" },
    hintSteps: ["{a}/{b} ÷ {c} は 逆数を かけると いいよ。", "{a}/{b} × 1/{c} ＝ {a}/({b}×{c}) だね。分子は？"],
    explanationTemplate: "{a}/{b} ÷ {c} ＝ {a}/{b*c} だよ。分子は {answer} だね。",
    understandingCheck: {
      enabled: true, type: "choice",
      questionTemplate: "分子は いくつ？",
      choices: ["{answer}", "{wrong1}", "{wrong2}"],
      answer: "{answer}",
      generateWrong: {
        wrong1: { formula: "answer + 1" },
        wrong2: { formula: "answer > 1 ? answer - 1 : answer + 2" }
      }
    },
    story: { structureId: "fraction_division", contextId: "c_g6_word_frac_div_01", entityId: "e_g6_word_frac_div_01", actionId: "divide" },
    variationGroupId: "vg_g6_word_frac_div_01",
    similarityGroupId: "sg_fraction_division"
  },
  {
    templateId: "g6_word_frac_div_02",
    grade: 6, difficultyLevel: 1,
    unitId: "fraction_div_basic", conceptId: "fraction_div_inverse",
    problemType: "word_problem", answerType: "number_input",
    sentencePatterns: [
      "{a}/{b}枚の ピザを {c}人で 等しく 分けると、1人 なん枚？ 分子を 答えてください。",
      "{a}/{b}kgの 小麦粉を {c}ふくろに 等しく 分けると、1ふくろ なんkg？ 分子を 答えてください。"
    ],
    generate: {
      a: { type: "integer", range: [2, 6] },
      b: { type: "integer", range: [3, 8], constraints: ["a < b"] },
      c: { type: "integer", range: [2, 4] },
      answer: { formula: "a" }
    },
    answer: { expression: "answer", normalization: "integer" },
    hintSteps: ["{a}/{b} ÷ {c} は 逆数を かけると いいよ。", "{a}/{b} × 1/{c} ＝ {a}/({b}×{c}) だね。分子は？"],
    explanationTemplate: "{a}/{b} ÷ {c} ＝ {a}/{b*c} だよ。分子は {answer} だね。",
    understandingCheck: {
      enabled: true, type: "choice",
      questionTemplate: "分子は いくつ？",
      choices: ["{answer}", "{wrong1}", "{wrong2}"],
      answer: "{answer}",
      generateWrong: {
        wrong1: { formula: "answer + 1" },
        wrong2: { formula: "answer > 1 ? answer - 1 : answer + 2" }
      }
    },
    story: { structureId: "fraction_division", contextId: "c_g6_word_frac_div_02", entityId: "e_g6_word_frac_div_02", actionId: "divide" },
    variationGroupId: "vg_g6_word_frac_div_02",
    similarityGroupId: "sg_fraction_division"
  },
  {
    templateId: "g6_word_ratio_01",
    grade: 6, difficultyLevel: 2,
    unitId: "ratio_basic", conceptId: "ratio_proportion_concept",
    problemType: "word_problem", answerType: "number_input",
    sentencePatterns: [
      "赤と 青の リボンの 長さの比が {a}:{b} で、赤が {total}cm のとき、青は なんcm？",
      "兄と 弟の お小遣いの 比が {a}:{b} で、兄が {total}円 のとき、弟は なん円？"
    ],
    generate: {
      a: { type: "integer", range: [2, 5] },
      b: { type: "integer", range: [2, 5], constraints: ["a != b"] },
      total: { type: "choice", values: [60, 80, 100, 120, 150, 200] },
      answer: { formula: "Math.round(total / a * b)" }
    },
    answer: { expression: "answer", normalization: "integer" },
    hintSteps: ["比 {a}:{b} で、{a} にあたる 量が {total} のとき、1 にあたる 量を 求めよう。", "{total} ÷ {a} × {b} を 計算しよう。"],
    explanationTemplate: "{total} ÷ {a} × {b} ＝ {answer} だね。",
    understandingCheck: {
      enabled: true, type: "choice",
      questionTemplate: "青（または 弟）は いくつ？",
      choices: ["{answer}", "{wrong1}", "{wrong2}"],
      answer: "{answer}",
      generateWrong: {
        wrong1: { formula: "answer + total / a" },
        wrong2: { formula: "answer - total / a > 0 ? answer - total / a : answer + 10" }
      }
    },
    story: { structureId: "ratio", contextId: "c_g6_word_ratio_01", entityId: "e_g6_word_ratio_01", actionId: "calculate" },
    variationGroupId: "vg_g6_word_ratio_01",
    similarityGroupId: "sg_ratio"
  },
  {
    templateId: "g6_word_ratio_02",
    grade: 6, difficultyLevel: 2,
    unitId: "ratio_basic", conceptId: "ratio_proportion_concept",
    problemType: "word_problem", answerType: "number_input",
    sentencePatterns: [
      "赤と 青の ブロックの 数の比が {a}:{b} で、赤が {total}こ のとき、青は なんこ？",
      "みかんと りんごの 数の比が {a}:{b} で、みかんが {total}こ のとき、りんごは なんこ？"
    ],
    generate: {
      a: { type: "integer", range: [2, 5] },
      b: { type: "integer", range: [2, 5], constraints: ["a != b"] },
      total: { type: "choice", values: [60, 80, 100, 120, 150, 200] },
      answer: { formula: "Math.round(total / a * b)" }
    },
    answer: { expression: "answer", normalization: "integer" },
    hintSteps: ["比 {a}:{b} で、{a} にあたる 量が {total} のとき、1 にあたる 量を 求めよう。", "{total} ÷ {a} × {b} を 計算しよう。"],
    explanationTemplate: "{total} ÷ {a} × {b} ＝ {answer} だね。",
    understandingCheck: {
      enabled: true, type: "choice",
      questionTemplate: "青（または りんご）は いくつ？",
      choices: ["{answer}", "{wrong1}", "{wrong2}"],
      answer: "{answer}",
      generateWrong: {
        wrong1: { formula: "answer + total / a" },
        wrong2: { formula: "answer - total / a > 0 ? answer - total / a : answer + 10" }
      }
    },
    story: { structureId: "ratio", contextId: "c_g6_word_ratio_02", entityId: "e_g6_word_ratio_02", actionId: "calculate" },
    variationGroupId: "vg_g6_word_ratio_02",
    similarityGroupId: "sg_ratio"
  },
  {
    templateId: "g6_adv_percent_word_01",
    grade: 6, difficultyLevel: 3,
    unitId: "percentage_word", conceptId: "percentage_word_problems",
    problemType: "word_problem", answerType: "number_input",
    sentencePatterns: [
      "定価 {price}円のノートが、{discount}割引きで売られています。値引きされる金額は何円？",
      "{price}円のケーキが {discount}割引きになっています。安くなる金額は何円？"
    ],
    generate: {
      price: { type: "choice", values: [200, 300, 400, 500] },
      discount: { type: "choice", values: [1, 2, 3, 4] },
      ratio: { formula: "discount * 0.1" },
      answer: { formula: "Math.round(price * (discount * 0.1))" }
    },
    answer: { expression: "answer", normalization: "integer" },
    hintSteps: ["{discount}割 は 割合になおすと {ratio} だよ。", "定価（{price}円）に 割引の割合（{ratio}）をかけよう。"],
    explanationTemplate: "{price} × {ratio} = {answer}円 だね。",
    understandingCheck: {
      enabled: true, type: "choice",
      questionTemplate: "値引きされる金額はどれ？",
      choices: ["{answer}", "{wrong1}", "{wrong2}"],
      answer: "{answer}",
      generateWrong: {
        wrong1: { formula: "answer + 20" },
        wrong2: { formula: "answer - 20" }
      }
    },
    story: { structureId: "percentage_discount", contextId: "c_g6_adv_percent_word_01", entityId: "e_g6_adv_percent_word_01", actionId: "calculate" },
    variationGroupId: "vg_g6_adv_percent_word_01",
    similarityGroupId: "sg_percentage_discount"
  },
  {
    templateId: "g6_adv_speed_01",
    grade: 6, difficultyLevel: 3,
    unitId: "ratio_speed_basic", conceptId: "speed_time_distance",
    problemType: "word_problem", answerType: "number_input",
    sentencePatterns: [
      "時速 {speed}km で走る自動車が、{time}時間 進むと 何km 進む？",
      "時速 {speed}km の電車が {time}時間 走ったときの 道のりは 何km？"
    ],
    generate: {
      speed: { type: "choice", values: [40, 50, 60, 70] },
      time: { type: "integer", range: [2, 4] },
      answer: { formula: "speed * time" }
    },
    answer: { expression: "answer", normalization: "integer" },
    hintSteps: ["「道のり ＝ 速さ × 時間」の公式を使おう。", "{speed} × {time} を計算しよう。"],
    explanationTemplate: "道のり ＝ {speed} × {time} ＝ {answer}km だね。",
    understandingCheck: {
      enabled: true, type: "choice",
      questionTemplate: "進む道のりはどれ？",
      choices: ["{answer}", "{wrong1}", "{wrong2}"],
      answer: "{answer}",
      generateWrong: {
        wrong1: { formula: "answer + speed" },
        wrong2: { formula: "answer - speed" }
      }
    },
    story: { structureId: "speed_distance", contextId: "c_g6_adv_speed_01", entityId: "e_g6_adv_speed_01", actionId: "calculate" },
    variationGroupId: "vg_g6_adv_speed_01",
    similarityGroupId: "sg_speed_distance"
  },
  {
    templateId: "g6_adv_speed_02",
    grade: 6, difficultyLevel: 3,
    unitId: "ratio_speed_basic", conceptId: "speed_time_distance",
    problemType: "word_problem", answerType: "number_input",
    sentencePatterns: [
      "分速 {speed}m で 歩くと、{time}分間で 何m 進む？",
      "分速 {speed}m で {time}分 歩いたときの 道のりは 何m？",
      "ある人は 分速 {speed}m で 歩きます。{time}分 歩くと 何m 進む？"
    ],
    generate: {
      speed: { type: "choice", values: [60, 70, 80] },
      time: { type: "integer", range: [3, 9] },
      answer: { formula: "speed * time" }
    },
    answer: { expression: "answer", normalization: "integer" },
    hintSteps: ["「道のり ＝ 速さ × 時間」の公式を使おう。", "{speed} × {time} を計算しよう。"],
    explanationTemplate: "道のり ＝ {speed} × {time} ＝ {answer}m だね。",
    understandingCheck: {
      enabled: true, type: "choice",
      questionTemplate: "進む道のりはどれ？",
      choices: ["{answer}", "{wrong1}", "{wrong2}"],
      answer: "{answer}",
      generateWrong: {
        wrong1: { formula: "answer + speed" },
        wrong2: { formula: "answer - speed" }
      }
    },
    story: { structureId: "speed_distance", contextId: "c_g6_adv_speed_02", entityId: "e_g6_adv_speed_02", actionId: "calculate" },
    variationGroupId: "vg_g6_adv_speed_02",
    similarityGroupId: "sg_speed_distance"
  }
,
  {
    templateId: "g2_adv_kuku_fill_01",
    grade: 2, difficultyLevel: 3,
    unitId: "multiplication_g2", conceptId: "kuku_advanced_groups",
    problemType: "calculation", answerType: "choice",
    format: "□ × {b} = {answer_val} の □ に入る数はどれ？",
    generate: {
      a: { type: "integer", range: [6, 9] },
      b: { type: "integer", range: [6, 9] },
      answer_val: { formula: "a * b" },
      answer: { formula: "a" }
    },
    answer: { expression: "answer", normalization: "integer" },
    hintSteps: [
      "{b}の段の九九で、答えが {answer_val} になるものを探そう。",
      "「？ × {b} ＝ {answer_val}」 だね。"
    ],
    explanationTemplate: "{answer} × {b} = {answer_val} だから、□に入るのは {answer} だね。",
    understandingCheck: { enabled: false }
  },
  {
    templateId: "g3_word_reverse_div_01",
    grade: 3, difficultyLevel: 3,
    unitId: "div_no_remainder", conceptId: "division_equal_share",
    problemType: "word_problem", answerType: "number_input",
    sentencePatterns: [
      "クッキーを {b}人で 同じ数ずつ 分けたら、1人分が {a}枚に なりました。クッキーは ぜんぶで 何枚 あった？",
      "カードを {b}人に 同じ数ずつ くばると、1人に {a}枚ずつ わたせました。カードは ぜんぶで 何枚？"
    ],
    generate: {
      a: { type: "integer", range: [6, 9] },
      b: { type: "integer", range: [4, 9] },
      answer: { formula: "a * b" }
    },
    answer: { expression: "answer", normalization: "integer" },
    hintSteps: [
      "「ぜんぶの数 ÷ {b}人 ＝ {a}枚」 ということだよ。",
      "もとの数を求めるには、かけ算をつかおう。{a} × {b} は？"
    ],
    explanationTemplate: "1人分が {a}枚で、それが {b}人分あるから、ぜんぶで {a} × {b} = {answer} 枚だね。",
    understandingCheck: {
      enabled: true, type: "choice",
      questionTemplate: "ぜんぶで何枚？",
      choices: ["{answer}", "{wrong1}", "{wrong2}"],
      answer: "{answer}",
      generateWrong: {
        wrong1: { formula: "answer - b" },
        wrong2: { formula: "answer + a" }
      }
    },
    story: { structureId: "reverse_division", contextId: "c_g3_rev_div_01", entityId: "e_g3_rev_div_01", actionId: "distribute" },
    variationGroupId: "vg_g3_rev_div_01",
    similarityGroupId: "sg_reverse_division"
  },
  {
    templateId: "g4_adv_error_spotting_01",
    grade: 4, difficultyLevel: 3,
    unitId: "mixed_2step", conceptId: "order_of_operations",
    problemType: "calculation", answerType: "choice",
    format: "次の計算には まちがい があります。正しい答えは どれ？\n「 {a} + {b} × {c} = {wrong_calc} 」",
    generate: {
      a: { type: "integer", range: [10, 20] },
      b: { type: "integer", range: [3, 8] },
      c: { type: "integer", range: [2, 6] },
      wrong_calc: { formula: "(a + b) * c" },
      answer: { formula: "a + b * c" }
    },
    answer: { expression: "answer", normalization: "integer" },
    hintSteps: [
      "たし算と かけ算が まざっているときは、どちらを先に計算するかな？",
      "かけ算（{b} × {c}）を先に計算しよう。"
    ],
    explanationTemplate: "かけ算を先に計算するので、正しくは {b} × {c} = {b*c}。それに {a} を足して {answer} が正しい答えだね。",
    understandingCheck: { enabled: false }
  },
  {
    templateId: "g5_std_compare_01",
    grade: 5, difficultyLevel: 2,
    unitId: "decimal_mul", conceptId: "fraction_decimal_compare",
    problemType: "calculation", answerType: "number_input",
    format: "{num1} と {num2} ではどちらが大きい？\n(小数が大きいなら 1、分数が大きいなら 2、同じなら 0 を入力)",
    generate: {
      type_idx: { type: "integer", range: [1, 3] },
      dec_val: { type: "integer", range: [2, 8] },
      frac_num: { formula: "type_idx === 1 ? 1 : (type_idx === 2 ? 1 : 3)" },
      frac_den: { formula: "type_idx === 1 ? 4 : (type_idx === 2 ? 2 : 4)" },
      frac_val: { formula: "frac_num / frac_den" },
      dec: { formula: "dec_val / 10" },
      num1: { formula: "frac_num + \"/\" + frac_den" },
      num2: { formula: "dec" },
      answer: { formula: "frac_val > dec ? 2 : (frac_val < dec ? 1 : 0)" }
    },
    answer: { expression: "answer", normalization: "integer" },
    hintSteps: [
      "分数を小数になおして くらべてみよう。",
      "{num1} は 小数になおすと いくつになるかな？"
    ],
    explanationTemplate: "{num1} は小数で {frac_val} だね。{dec} とくらべると... だから答えは {answer} だね。",
    understandingCheck: { enabled: false }
  },
  {
    templateId: "g6_challenge_ratio_01",
    grade: 6, difficultyLevel: 3,
    unitId: "ratio_basic", conceptId: "ratio_proportion_concept",
    problemType: "word_problem", answerType: "number_input",
    sentencePatterns: [
      "兄と弟で {total}円を 分けます。兄と弟の もらうお金の比が {a} : {b} になるようにすると、兄は いくらもらえる？",
      "赤いテープと青いテープ、あわせて {total}cm あります。赤と青の長さの比が {a} : {b} のとき、赤いテープは 何cm？"
    ],
    generate: {
      a: { type: "integer", range: [3, 5] },
      b: { type: "integer", range: [1, 2] },
      unit_val: { type: "choice", values: [100, 150, 200, 300] },
      total: { formula: "(a + b) * unit_val" },
      answer: { formula: "a * unit_val" }
    },
    answer: { expression: "answer", normalization: "integer" },
    hintSteps: [
      "全体の比は、兄の {a} と 弟の {b} を あわせた {a+b} になるね。",
      "全体が {total} で、そのうちの {a+b}分の{a} が兄の分だよ。"
    ],
    explanationTemplate: "全体を {a+b} としたときの {a} 分なので、{total} × ({a}/{a+b}) = {answer} になるね。",
    understandingCheck: {
      enabled: true, type: "choice",
      questionTemplate: "弟の分は いくら（何cm）？",
      choices: ["{b * unit_val}", "{a * unit_val}", "{total}"],
      answer: "{b * unit_val}",
      generateWrong: {
        wrong1: { formula: "b * unit_val" },
        wrong2: { formula: "a * unit_val" }
      }
    },
    story: { structureId: "ratio_distribution", contextId: "c_g6_chal_ratio_01", entityId: "e_g6_chal_ratio_01", actionId: "distribute" },
    variationGroupId: "vg_g6_chal_ratio_01",
    similarityGroupId: "sg_ratio_distribution"
  },
  {
    templateId: "g4_puzzle_magicbox_01",
    grade: 4, difficultyLevel: 3,
    unitId: "mixed_2step", conceptId: "pattern_recognition",
    problemType: "word_problem", answerType: "number_input",
    format: "「魔法の箱」に {in1} を入れると {out1} になり、{in2} を入れると {out2} になります。では、{q_in} を入れるといくつになる？",
    generate: {
      a: { type: "integer", range: [2, 4] },
      b: { type: "integer", range: [1, 5] },
      in1: { formula: "2" },
      out1: { formula: "a * 2 + b" },
      in2: { formula: "3" },
      out2: { formula: "a * 3 + b" },
      q_in: { type: "integer", range: [5, 8] },
      answer: { formula: "a * q_in + b" }
    },
    answer: { expression: "answer", normalization: "integer" },
    hintSteps: [
      "箱の中で「かけ算」と「たし算」が両方行われているよ。",
      "入れた数を {a}倍 して、{b} を足してみて！"
    ],
    explanationTemplate: "この魔法の箱は「入れた数を {a}倍 して {b} を足す」ルールでした。だから {q_in} × {a} + {b} = {answer} だね。",
    understandingCheck: { enabled: false }
  },
  {
    templateId: "g2_puzzle_reverse_story_01",
    grade: 2, difficultyLevel: 3,
    unitId: "calc_application", conceptId: "working_backwards",
    problemType: "word_problem", answerType: "number_input",
    sentencePatterns: [
      "バスに人が乗っています。バス停で {off}人 降りて、{on}人 乗りました。いまバスには {current}人 います。さいしょは 何人 乗っていた？"
    ],
    generate: {
      start: { type: "integer", range: [15, 30] },
      off: { type: "integer", range: [3, 9] },
      on: { type: "integer", range: [2, 8] },
      current: { formula: "start - off + on" },
      answer: { formula: "start" }
    },
    answer: { expression: "answer", normalization: "integer" },
    hintSteps: [
      "今の人数から「時間を巻き戻して」考えてみよう。",
      "「乗ってきた {on}人」を引いて、「降りた {off}人」を戻して（足して）あげよう。"
    ],
    explanationTemplate: "時間を戻すので、今の {current}人 から {on}人引いて、{off}人足すよ。 {current} - {on} + {off} = {answer}人だね。",
    understandingCheck: { enabled: false }
  },
  {
    templateId: "g4_puzzle_coins_01",
    grade: 4, difficultyLevel: 3,
    unitId: "mixed_2step", conceptId: "logical_deduction",
    problemType: "word_problem", answerType: "number_input",
    format: "50円玉と 10円玉が あわせて {coins}枚 あります。金額は ぜんぶで {total}円 です。50円玉は 何枚 ある？",
    generate: {
      c50: { type: "integer", range: [1, 5] },
      c10: { type: "integer", range: [2, 6] },
      coins: { formula: "c50 + c10" },
      total: { formula: "c50 * 50 + c10 * 10" },
      answer: { formula: "c50" }
    },
    answer: { expression: "answer", normalization: "integer" },
    hintSteps: [
      "あてずっぽうでもいいから、枚数を当てはめてみよう。",
      "もし全部が 10円玉だったら、10円 × {coins}枚 ＝ {coins*10}円 になるね。そこから少しずつ 50円玉に変えていこう。"
    ],
    explanationTemplate: "50円玉が {answer}枚（{answer*50}円）、10円玉が {coins - answer}枚（{(coins - answer)*10}円）だと、ぴったり {total}円 になるね。",
    understandingCheck: { enabled: false }
  },
  {
    templateId: "g3_puzzle_symbol_01",
    grade: 3, difficultyLevel: 3,
    unitId: "kuku_all", conceptId: "cryptarithmetic",
    problemType: "calculation", answerType: "number_input",
    format: "同じマークには 同じ数が入ります。\n「 ★ × ★ = {sq} 」のとき、★ に入る数は？",
    generate: {
      a: { type: "integer", range: [4, 9] },
      sq: { formula: "a * a" },
      answer: { formula: "a" }
    },
    answer: { expression: "answer", normalization: "integer" },
    hintSteps: [
      "九九の中で、「同じ数」をかけて {sq} になるものを探そう。",
      "かけ算九九の表を 思い出してみよう。同じ数を かけた 列を なぞってみよう。"
    ],
    explanationTemplate: "{answer} × {answer} = {sq} だから、★には {answer} が入るね。",
    understandingCheck: { enabled: false }
  },
  {
    templateId: "g4_puzzle_symbol_02",
    grade: 4, difficultyLevel: 3,
    unitId: "mixed_2step", conceptId: "cryptarithmetic",
    problemType: "calculation", answerType: "number_input",
    format: "違うマークには 違う数が入ります。\n「 ■ ＋ ■ ＝ {sum} 」\n「 ■ × ▲ ＝ {prod} 」\nのとき、▲ に入る数は？",
    generate: {
      box: { type: "integer", range: [3, 9] },
      tri: { type: "integer", range: [2, 8], constraints: ["box !== tri"] },
      sum: { formula: "box + box" },
      prod: { formula: "box * tri" },
      answer: { formula: "tri" }
    },
    answer: { expression: "answer", normalization: "integer" },
    hintSteps: [
      "まずは上の式から考えよう。同じ数を足して {sum} になるのは何かな？",
      "■ が {box} だとわかったら、下の式は「 {box} × ▲ ＝ {prod} 」になるね。"
    ],
    explanationTemplate: "■ は {box} だね。{box} × {answer} ＝ {prod} なので、▲ は {answer} になるよ。",
    understandingCheck: { enabled: false }
  }
];


function registerAllMathTemplates() {
  const reg = typeof window !== "undefined" ? window.TemplateRegistry : require('./registries.js').TemplateRegistry;
  MATH_TEMPLATES.forEach(t => reg.register(t));
}

// 自動登録の実行
registerAllMathTemplates();

if (typeof module !== "undefined" && module.exports) {
  module.exports = { MATH_TEMPLATES, registerAllMathTemplates };
}
