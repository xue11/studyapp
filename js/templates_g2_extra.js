/**
 * Unit Templates (Grade 2) part 3 — RISUさんすうドリル 2年生単元の不足分を補完
 * V2.6.6 準拠
 *
 * 追加単元 (RISU 2年生 単元一覧との突合で不足していたもの):
 *   - big_number_10000  大きな数（3けた〜10000）
 *   - time_clock_basic  時こくと時間
 *   - fraction_intro    分数（2年）
 *   - box_shape         はこの形（面・辺・ちょう点）
 *   - calc_idea_basic   計算のくふう（まとめて計算）
 *   - estimation_basic  計算の見積もり（およその数）
 *
 * すべて number_input (整数) で出題するため UI 変更は不要。
 */
(function () {
  var T = [
    // ==========================================
    // big_number_10000 (Lv1): 大きな数（3けた〜10000）
    // ==========================================
    {
      templateId: "g2_basic_bignum_01",
      grade: 2, difficultyLevel: 1,
      unitId: "big_number_10000", conceptId: "place_value_1000",
      problemType: "calculation", answerType: "number_input",
      format: "1000を {a}こ、100を {b}こ、10を {c}こ、1を {d}こ あわせた 数は ?",
      generate: {
        a: { type: "integer", range: [1, 9] },
        b: { type: "integer", range: [0, 9] },
        c: { type: "integer", range: [0, 9] },
        d: { type: "integer", range: [0, 9] },
        answer: { formula: "a * 1000 + b * 100 + c * 10 + d" }
      },
      answer: { expression: "answer", normalization: "integer" },
      hintSteps: [
        "くらいを じゅんに 見ていこう。1000の くらいから ならべるよ。",
        "{a} × 1000 = {a * 1000}、{b} × 100 = {b * 100}、{c} × 10 = {c * 10}、のこりは {d} だね。"
      ],
      explanationTemplate: "{a * 1000} + {b * 100} + {c * 10} + {d} = {answer} だね。",
      understandingCheck: {
        enabled: true, type: "choice",
        questionTemplate: "この くらいの 数を あわせた こたえは どれ？",
        choices: ["{answer}", "{wrong1}", "{wrong2}"],
        answer: "{answer}",
        generateWrong: {
          wrong1: { formula: "answer + 100" },
          wrong2: { formula: "answer - 10" }
        }
      }
    },
    {
      templateId: "g2_basic_bignum_02",
      grade: 2, difficultyLevel: 1,
      unitId: "big_number_10000", conceptId: "big_number_read_write",
      problemType: "calculation", answerType: "number_input",
      format: "{q_text}",
      generate: {
        type_idx: { type: "integer", range: [1, 4] },
        a: { type: "integer", range: [1, 9] },
        b: { type: "integer", range: [0, 9] },
        c: { type: "integer", range: [0, 9] },
        d: { type: "integer", range: [0, 9] },
        n: { formula: "a * 1000 + b * 100 + c * 10 + d" },
        place: { formula: "type_idx === 1 ? '千の位' : (type_idx === 2 ? '百の位' : (type_idx === 3 ? '十の位' : '一の位'))" },
        q_text: {
          formula: "n + ' の ' + place + 'の 数は ?'"
        },
        answer: {
          formula: "type_idx === 1 ? a : (type_idx === 2 ? b : (type_idx === 3 ? c : d))"
        }
      },
      answer: { expression: "answer", normalization: "integer" },
      hintSteps: [
        "くらいは 左から 千・百・十・一 の じゅんに ならんでいるよ。",
        "{n} の {place}は 左から {type_idx}ばんめ の 数だよ。"
      ],
      explanationTemplate: "{n} の {place}は {answer} だね。",
      understandingCheck: {
        enabled: true, type: "choice",
        questionTemplate: "{q_text}",
        choices: ["{answer}", "{wrong1}", "{wrong2}"],
        answer: "{answer}",
        generateWrong: {
          wrong1: { formula: "answer + 1" },
          wrong2: { formula: "answer + 10" }
        }
      }
    },
    {
      templateId: "g2_basic_bignum_03",
      grade: 2, difficultyLevel: 1,
      unitId: "big_number_10000", conceptId: "big_number_compare",
      problemType: "calculation", answerType: "number_input",
      format: "{a} と {b} では どちらが 大きい？ 大きい ほうの 数を こたえよう。",
      generate: {
        a: { type: "integer", range: [1001, 9999] },
        b: { type: "integer", range: [1001, 9999], constraints: ["b !== a"] },
        answer: { formula: "a > b ? a : b" }
      },
      answer: { expression: "answer", normalization: "integer" },
      hintSteps: [
        "大きさを くらべる ときは、上の くらいから じゅんに 見ていくよ。",
        "千の位が 同じなら 百の位、その つぎは 十の位、一の位 の じゅんに くらべよう。"
      ],
      explanationTemplate: "上の くらいから くらべると、{answer} の ほうが 大きいね。",
      understandingCheck: {
        enabled: true, type: "choice",
        questionTemplate: "大きい ほうの 数は どれ？",
        choices: ["{answer}", "{wrong1}", "{wrong2}"],
        answer: "{answer}",
        generateWrong: {
          wrong1: { formula: "a === answer ? b : a" },
          wrong2: { formula: "answer + 1000" }
        }
      }
    },

    // ==========================================
    // time_clock_basic (Lv1): 時こくと時間
    // ==========================================
    {
      templateId: "g2_basic_time_01",
      grade: 2, difficultyLevel: 1,
      unitId: "time_clock_basic", conceptId: "time_minute_convert_g2",
      problemType: "calculation", answerType: "number_input",
      format: "{q_text}",
      generate: {
        h: { type: "integer", range: [1, 9] },
        m: { type: "choice", values: [0, 10, 20, 30, 40, 50] },
        q_text: {
          formula: "m === 0 ? h + '時ちょうど は なん分？' : h + '時 ' + m + '分 は なん分？'"
        },
        answer: { formula: "h * 60 + m" }
      },
      answer: { expression: "answer", normalization: "integer" },
      hintSteps: [
        "1時間は 60分だよ。",
        "{m === 0 ? h + ' × 60 = ' + (h * 60) + ' 分 だね。' : h + ' × 60 = ' + (h * 60) + ' 分、それに ' + m + '分 を たそう。'}"
      ],
      explanationTemplate: "{h} × 60 = {h * 60} だから {answer}分 だね。",
      understandingCheck: {
        enabled: true, type: "choice",
        questionTemplate: "{q_text}",
        choices: ["{answer}", "{wrong1}", "{wrong2}"],
        answer: "{answer}",
        generateWrong: {
          wrong1: { formula: "answer + 10" },
          wrong2: { formula: "answer - 60" }
        }
      }
    },
    {
      templateId: "g2_basic_time_02",
      grade: 2, difficultyLevel: 1,
      unitId: "time_clock_basic", conceptId: "time_duration_forward",
      problemType: "calculation", answerType: "number_input",
      format: "{h}時 の {k}時間ご は なん時？",
      generate: {
        h: { type: "integer", range: [1, 8] },
        k: { type: "integer", range: [1, 3] },
        answer: { formula: "h + k" }
      },
      answer: { expression: "answer", normalization: "integer" },
      hintSteps: [
        "時計の みじかいはりが {k}つ すすむ かんがえよう。",
        "{h} に {k} を たすと なん時 に なるかな？"
      ],
      explanationTemplate: "{h}時 から {k}時間 すすむと {answer}時 に なるね。",
      understandingCheck: {
        enabled: true, type: "choice",
        questionTemplate: "{h}時 の {k}時間ご は なん時？",
        choices: ["{answer}", "{wrong1}", "{wrong2}"],
        answer: "{answer}",
        generateWrong: {
          wrong1: { formula: "answer + 1" },
          wrong2: { formula: "answer - 1" }
        }
      }
    },
    {
      templateId: "g2_basic_time_03",
      grade: 2, difficultyLevel: 1,
      unitId: "time_clock_basic", conceptId: "time_duration_between",
      problemType: "calculation", answerType: "number_input",
      format: "{a}時 から {b}時 までは なん時間？",
      generate: {
        a: { type: "integer", range: [1, 6] },
        k: { type: "integer", range: [1, 3] },
        b: { formula: "a + k" },
        answer: { formula: "b - a" }
      },
      answer: { expression: "answer", normalization: "integer" },
      hintSteps: [
        "みじかいはりが いくつ すすむか かんがえよう。",
        "{b} − {a} で なん時間か わかるよ。"
      ],
      explanationTemplate: "{a}時 から {b}時 までは {answer}時間 だね。",
      understandingCheck: {
        enabled: true, type: "choice",
        questionTemplate: "{a}時 から {b}時 までは なん時間？",
        choices: ["{answer}", "{wrong1}", "{wrong2}"],
        answer: "{answer}",
        generateWrong: {
          wrong1: { formula: "answer + 1" },
          wrong2: { formula: "answer - 1" }
        }
      }
    },

    // ==========================================
    // fraction_intro (Lv1): 分数（2年は 1/2 1/4 などの かんたんな分数）
    // ==========================================
    {
      templateId: "g2_basic_fraction_01",
      grade: 2, difficultyLevel: 1,
      unitId: "fraction_intro", conceptId: "fraction_denominator",
      problemType: "calculation", answerType: "number_input",
      format: "{q_text}",
      generate: {
        type_idx: { type: "integer", range: [1, 2] },
        d: { type: "choice", values: [2, 3, 4, 5, 6, 8, 10] },
        q_text: {
          formula: "type_idx === 1 ? '1つの ケーキを ' + d + 'こに 同じ 大きさで 分けました。1つ分は「1/' + d + '」です。下の 数は いくつ？' : '1つの ケーキを ' + d + 'こに 同じ 大きさで 分けました。1つ分は「1/' + d + '」です。上の 数は いくつ？'"
        },
        answer: { formula: "type_idx === 1 ? d : 1" }
      },
      answer: { expression: "answer", normalization: "integer" },
      hintSteps: [
        "同じ 大きさに {d}こ に 分けたね。",
        "1つ分は「{d}分の1」と かくよ。下の 数は {d}、上の 数は 1 だね。"
      ],
      explanationTemplate: "「{d}分の1」は、下の 数が {d}、上の 数が 1 だから こたえは {answer} だね。",
      understandingCheck: {
        enabled: true, type: "choice",
        questionTemplate: "「{d}分の1」の こたえは どれ？",
        choices: ["{answer}", "{wrong1}", "{wrong2}"],
        answer: "{answer}",
        generateWrong: {
          wrong1: { formula: "type_idx === 1 ? d + 1 : 2" },
          wrong2: { formula: "type_idx === 1 ? d - 1 : 3" }
        }
      }
    },
    {
      templateId: "g2_basic_fraction_02",
      grade: 2, difficultyLevel: 1,
      unitId: "fraction_intro", conceptId: "fraction_compare_basic",
      problemType: "calculation", answerType: "number_input",
      format: "{q_text}",
      generate: {
        type_idx: { type: "integer", range: [1, 3] },
        d1: { type: "choice", values: [2, 3, 4, 5, 6, 8] },
        d2: { type: "choice", values: [3, 4, 5, 6, 8, 10], constraints: ["d2 !== d1"] },
        ask: { formula: "type_idx === 3 ? '小さいのは' : '大きいのは'" },
        q_text: {
          formula: "type_idx === 1 ? '1を ' + d1 + 'こに 分けた 1つ分 と、1を ' + d2 + 'こに 分けた 1つ分。大きいのは なん分の1？ 下の 数を こたえよう。' : (type_idx === 2 ? '1を ' + d1 + 'こに 分けた 1つ分は、1を ' + d2 + 'こに 分けた 1つ分より 大きい？ 大きい ほうの 下の 数を こたえよう。' : '1を ' + d1 + 'こに 分けた 1つ分と、1を ' + d2 + 'こに 分けた 1つ分。小さいのは なん分の1？ 下の 数を こたえよう。')"
        },
        answer: {
          formula: "type_idx === 3 ? (d1 > d2 ? d1 : d2) : (d1 < d2 ? d1 : d2)"
        }
      },
      answer: { expression: "answer", normalization: "integer" },
      hintSteps: [
        "同じ 大きさを 分けるとき、分ける 数が 大きいほど 1つ分は 小さく なるよ。",
        "{d1} と {d2} を くらべて かんがえよう。"
      ],
      explanationTemplate: "分ける 数が 大きいほど 1つ分は 小さいから、こたえは {answer}分の1 だね。",
      understandingCheck: {
        enabled: true, type: "choice",
        questionTemplate: "{d1}分の1 と {d2}分の1、{ask} どれ？",
        choices: ["{answer}", "{wrong1}", "{wrong2}"],
        answer: "{answer}",
        generateWrong: {
          wrong1: { formula: "d1 === answer ? d2 : d1" },
          wrong2: { formula: "answer + 1" }
        }
      }
    },
    // ==========================================
    // box_shape (Lv1): はこの形（面・辺・ちょう点の数）
    // ==========================================
    {
      templateId: "g2_basic_box_01",
      grade: 2, difficultyLevel: 1,
      unitId: "box_shape", conceptId: "box_faces_edges_vertices",
      problemType: "calculation", answerType: "number_input",
      format: "{q_text}",
      generate: {
        type_idx: { type: "integer", range: [1, 3] },
        n: { type: "integer", range: [1, 6] },
        label: { formula: "type_idx === 1 ? '面' : (type_idx === 2 ? '辺' : 'ちょう点')" },
        base: { formula: "type_idx === 1 ? 6 : (type_idx === 2 ? 12 : 8)" },
        q_text: {
          formula: "n === 1 ? 'はこの形（直方体）の ' + label + 'は いくつ ある？' : '同じ はこの形が ' + n + 'つ あります。' + label + 'は ぜんぶで いくつ ある？'"
        },
        answer: { formula: "base * n" }
      },
      answer: { expression: "answer", normalization: "integer" },
      hintSteps: [
        "はこの形の 面は 6つ、辺は 12、ちょう点は 8 だよ。",
        "{n}つ ある ときは、{base} × {n} で ぜんぶの 数を もとめよう。"
      ],
      explanationTemplate: "はこの形 1つで {label}は {base} だから、{base} × {n} = {answer} だね。",
      understandingCheck: {
        enabled: true, type: "choice",
        questionTemplate: "この 問題の こたえは どれ？",
        choices: ["{answer}", "{wrong1}", "{wrong2}"],
        answer: "{answer}",
        generateWrong: {
          wrong1: { formula: "base * n + 2" },
          wrong2: { formula: "base * n - 4" }
        }
      }
    },
    {
      templateId: "g2_basic_box_02",
      grade: 2, difficultyLevel: 1,
      unitId: "box_shape", conceptId: "box_face_shape",
      problemType: "calculation", answerType: "number_input",
      format: "{q_text}",
      generate: {
        type_idx: { type: "integer", range: [1, 2] },
        n: { type: "integer", range: [1, 8] },
        label: { formula: "type_idx === 1 ? 'まるい 面' : '面'" },
        base: { formula: "type_idx === 1 ? 2 : 3" },
        q_text: {
          formula: "n === 1 ? 'つつの 形の ' + label + 'は いくつ ある？' : 'つつの 形を ' + n + 'こ つくります。' + label + 'は ぜんぶで いくつ いる？'"
        },
        answer: { formula: "base * n" }
      },
      answer: { expression: "answer", normalization: "integer" },
      hintSteps: [
        "つつの 形は、上下の まるい 面と、まきの ような 側の 面で できているよ。",
        "まるい 面は 2つ、面は ぜんぶで 3つ だよ。"
      ],
      explanationTemplate: "つつの 形 1つで {label}は {base} だから、{base} × {n} = {answer} だね。",
      understandingCheck: {
        enabled: true, type: "choice",
        questionTemplate: "この 問題の こたえは どれ？",
        choices: ["{answer}", "{wrong1}", "{wrong2}"],
        answer: "{answer}",
        generateWrong: {
          wrong1: { formula: "base * n + 1" },
          wrong2: { formula: "base * n + 2" }
        }
      }
    },
    {
      templateId: "g2_basic_box_03",
      grade: 2, difficultyLevel: 1,
      unitId: "box_shape", conceptId: "box_net_basic",
      problemType: "calculation", answerType: "number_input",
      format: "{q_text}",
      generate: {
        type_idx: { type: "integer", range: [1, 3] },
        facePair: { type: "choice", values: [2, 3, 4, 6] },
        pairs: { type: "choice", values: [2, 3, 4] },
        q_text: {
          formula: "type_idx === 1 ? 'はこの形を ひらいた 形（てんかいず）に すると、面は ぜんぶで いくつ ある？' : (type_idx === 2 ? 'はこの形を ひらいた 形（てんかいず）に します。同じ 大きさの 面が ' + facePair + 'まい ずつ ' + pairs + 'しゅるい あります。面は ぜんぶで いくつ ある？' : 'はこの形の 面は ぜんぶで ' + facePair * pairs + 'まい です。同じ 大きさの 面が ' + facePair + 'まい ずつ あるとき、面は なんしゅるいに わかれる？')"
        },
        answer: {
          formula: "type_idx === 1 ? 6 : (type_idx === 2 ? facePair * pairs : pairs)"
        },
        exp_text: {
          formula: "type_idx === 1 ? 'はこの形の 面は、上の 1つ・下の 1つ・まわりの 4つ で ぜんぶで 6つ だね。' : (type_idx === 2 ? '同じ 大きさの 面が ' + facePair + 'まい ずつ ' + pairs + 'しゅるい だから、' + facePair + ' × ' + pairs + ' で もとめられるね。' : '同じ 大きさの 面を 1しゅるいと かぞえると、' + pairs + 'しゅるい に わかれるね。')"
        }
      },
      answer: { expression: "answer", normalization: "integer" },
      hintSteps: [
        "はこの形は 四角い 面が 6つ あるよ。",
        "ひらいた 形に しても 面の 数は かわらない。{facePair}まい ずつ の かたまりが いくつ あるか かんがえよう。"
      ],
      explanationTemplate: "{exp_text} こたえは {answer} だね。",
      understandingCheck: {
        enabled: true, type: "choice",
        questionTemplate: "この 問題の こたえは どれ？",
        choices: ["{answer}", "{wrong1}", "{wrong2}"],
        answer: "{answer}",
        generateWrong: {
          wrong1: { formula: "answer + 2" },
          wrong2: { formula: "answer + 1" }
        }
      }
    },

    // ==========================================
    // calc_idea_basic (Lv2): 計算のくふう（まとめて計算）
    // ==========================================
    {
      templateId: "g2_std_calcidea_01",
      grade: 2, difficultyLevel: 2,
      unitId: "calc_idea_basic", conceptId: "calc_idea_make_100",
      problemType: "calculation", answerType: "number_input",
      commutativePairs: [["a", "b"]],
      format: "{a} + {b} + {c} = ? （くふうして けいさんしよう）",
      generate: {
        a: { type: "integer", range: [11, 49] },
        b: { type: "integer", range: [11, 45] },
        c: { formula: "100 - a" },
        answer: { formula: "a + b + c" }
      },
      answer: { expression: "answer", normalization: "integer" },
      hintSteps: [
        "{a} と {c} を さきに たすと、ちょうど 100 に なるよ。",
        "100 に {b} を たそう。"
      ],
      explanationTemplate: "{a} + {c} = 100、それに {b} を たして {answer} だね。",
      understandingCheck: {
        enabled: true, type: "choice",
        questionTemplate: "{a} + {b} + {c} の こたえは どれ？",
        choices: ["{answer}", "{wrong1}", "{wrong2}"],
        answer: "{answer}",
        generateWrong: {
          wrong1: { formula: "answer + 10" },
          wrong2: { formula: "answer - 10" }
        }
      }
    },
    {
      templateId: "g2_std_calcidea_02",
      grade: 2, difficultyLevel: 2,
      unitId: "calc_idea_basic", conceptId: "calc_idea_sub_together",
      problemType: "calculation", answerType: "number_input",
      format: "{n} − {a} − {b} = ? （くふうして けいさんしよう）",
      generate: {
        n: { type: "integer", range: [150, 299] },
        a: { type: "integer", range: [21, 79] },
        b: { formula: "100 - a" },
        answer: { formula: "n - a - b" }
      },
      answer: { expression: "answer", normalization: "integer" },
      hintSteps: [
        "{a} と {b} を まとめて ひく くふうを しよう。",
        "{a} + {b} = 100 だから、{n} − 100 で もとまるよ。"
      ],
      explanationTemplate: "{a} + {b} = 100 だから、{n} − 100 = {answer} だね。",
      understandingCheck: {
        enabled: true, type: "choice",
        questionTemplate: "{n} − {a} − {b} の こたえは どれ？",
        choices: ["{answer}", "{wrong1}", "{wrong2}"],
        answer: "{answer}",
        generateWrong: {
          wrong1: { formula: "answer + 100" },
          wrong2: { formula: "answer - 10" }
        }
      }
    },
    // ==========================================
    // estimation_basic (Lv2): 計算の見積もり（およその数）
    // ==========================================
    {
      templateId: "g2_std_estimation_01",
      grade: 2, difficultyLevel: 2,
      unitId: "estimation_basic", conceptId: "estimation_round10_add",
      problemType: "calculation", answerType: "number_input",
      commutativePairs: [["a", "b"]],
      format: "{a} + {b} は およそ いくつ？ 十のくらいまでの がい数に して 見つもろう。",
      generate: {
        a: { type: "integer", range: [21, 89], constraints: ["a % 10 !== 0"] },
        b: { type: "integer", range: [21, 89], constraints: ["b % 10 !== 0"] },
        answer: { formula: "Math.round(a / 10) * 10 + Math.round(b / 10) * 10" }
      },
      answer: { expression: "answer", normalization: "integer" },
      hintSteps: [
        "十のくらいまでの がい数に するには、一のくらいを 四捨五入するよ。",
        "{a} は およそ {Math.round(a / 10) * 10}、{b} は およそ {Math.round(b / 10) * 10} に なるね。"
      ],
      explanationTemplate: "{Math.round(a / 10) * 10} + {Math.round(b / 10) * 10} = {answer} と 見つもれるね。",
      understandingCheck: {
        enabled: true, type: "choice",
        questionTemplate: "{a} + {b} の およその こたえは どれ？",
        choices: ["{answer}", "{wrong1}", "{wrong2}"],
        answer: "{answer}",
        generateWrong: {
          wrong1: { formula: "answer + 10" },
          wrong2: { formula: "answer - 10" }
        }
      }
    },
    {
      templateId: "g2_std_estimation_02",
      grade: 2, difficultyLevel: 2,
      unitId: "estimation_basic", conceptId: "estimation_round100_mul",
      problemType: "calculation", answerType: "number_input",
      format: "1つ {a}円の おかしを {n}こ 買います。全部で およそ いくら？ 百のくらいまでの がい数で 見つもろう。",
      generate: {
        a: { type: "integer", range: [101, 499], constraints: ["a % 100 !== 0"] },
        n: { type: "integer", range: [2, 4] },
        answer: { formula: "Math.round(a / 100) * 100 * n" }
      },
      answer: { expression: "answer", normalization: "integer" },
      hintSteps: [
        "百のくらいまでの がい数に するには、十のくらいを 四捨五入するよ。",
        "{a}円 は およそ {Math.round(a / 100) * 100}円 に なるね。"
      ],
      explanationTemplate: "{a}円 は およそ {Math.round(a / 100) * 100}円 だから、{Math.round(a / 100) * 100} × {n} = {answer}円 と 見つもれるね。",
      understandingCheck: {
        enabled: true, type: "choice",
        questionTemplate: "およそ いくらに なる？",
        choices: ["{answer}", "{wrong1}", "{wrong2}"],
        answer: "{answer}",
        generateWrong: {
          wrong1: { formula: "answer + 100" },
          wrong2: { formula: "answer - 100" }
        }
      }
    },
    // ==========================================
    // kuku_intro (Lv2): 「何倍」の考え方 (RISU: 九九の文章題)
    // ==========================================
    {
      templateId: "g2_std_kuku_bai_01",
      grade: 2, difficultyLevel: 2,
      unitId: "kuku_intro", conceptId: "kuku_basic_groups",
      problemType: "word_problem", answerType: "number_input",
      sentencePatterns: [
        "{person}さんは シールを {a}まい もっています。おにいさんは {person}さんの {b}ばい もっています。おにいさんは なんまい もっている？",
        "{person}さんは おりがみを {a}まい もっています。いもうとは {person}さんの {b}ばい もっています。いもうとは なんまい？"
      ],
      generate: {
        person: { type: "choice", values: ["たろう", "はなこ", "けんた"] },
        a: { type: "integer", range: [2, 9] },
        b: { type: "integer", range: [2, 5] },
        answer: { formula: "a * b" }
      },
      answer: { expression: "answer", normalization: "integer" },
      hintSteps: [
        "「{b}ばい」は、同じ 数が {b}つ ある という いみだよ。",
        "{a} × {b} で もとめよう。"
      ],
      explanationTemplate: "{a}の {b}ばい だから、{a} × {b} = {answer} だね。",
      understandingCheck: {
        enabled: true, type: "choice",
        questionTemplate: "{a} の {b}ばい は いくつ？",
        choices: ["{answer}", "{wrong1}", "{wrong2}"],
        answer: "{answer}",
        generateWrong: {
          wrong1: { formula: "a + b" },
          wrong2: { formula: "a * b + b" }
        }
      }
    },
    // ==========================================
    // kuku_partial (Lv3): 九九の表ときまり (交換法則)
    // ==========================================
    {
      templateId: "g2_adv_kuku_table_01",
      grade: 2, difficultyLevel: 3,
      unitId: "kuku_partial", conceptId: "kuku_mastery",
      problemType: "calculation", answerType: "number_input",
      commutativePairs: [["a", "b"]],
      format: "九九の 表で、{a}の だん と {b}の だん が 交わるところ の 数は いくつ？",
      generate: {
        a: { type: "integer", range: [2, 9] },
        b: { type: "integer", range: [2, 9] },
        answer: { formula: "a * b" }
      },
      answer: { expression: "answer", normalization: "integer" },
      hintSteps: [
        "{a}の だん を {b}つ 分 かんがえよう。",
        "{a} × {b} で もとまるよ。かけ算は じゅんばんを いれかえても こたえは 同じだね。"
      ],
      explanationTemplate: "{a} × {b} = {answer}、{b} × {a} も {answer} で 同じに なるね。",
      understandingCheck: {
        enabled: true, type: "choice",
        questionTemplate: "{a} × {b} の こたえは どれ？",
        choices: ["{answer}", "{wrong1}", "{wrong2}"],
        answer: "{answer}",
        generateWrong: {
          wrong1: { formula: "answer + a" },
          wrong2: { formula: "answer - b" }
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
    module.exports = { UNIT_TEMPLATES_G2_EXTRA: T };
  } else {
    window.UNIT_TEMPLATES_G2_EXTRA = T;
  }
})();