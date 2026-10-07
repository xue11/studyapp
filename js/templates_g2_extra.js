/**
 * Unit Templates (Grade 2) part 3 — 2年生の不足単元と問題バリエーションを補完
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
      unitId: "geometry_g2", conceptId: "box_faces_edges_vertices",
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
      unitId: "geometry_g2", conceptId: "box_face_shape",
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
      unitId: "geometry_g2", conceptId: "box_net_basic",
      problemType: "calculation", answerType: "number_input",
      format: "{q_text}",
      generate: {
        type_idx: { type: "integer", range: [1, 3] },
        facePair: { type: "choice", values: [2, 4, 6] },
        pairs: { formula: "6 / facePair" },
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
      unitId: "calc_application", conceptId: "calc_idea_make_100",
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
      unitId: "calc_application", conceptId: "calc_idea_sub_together",
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
      unitId: "calc_application", conceptId: "estimation_round10_add",
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
      unitId: "calc_application", conceptId: "estimation_round100_mul",
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
      unitId: "multiplication_g2", conceptId: "kuku_basic_groups",
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
      unitId: "multiplication_g2", conceptId: "kuku_mastery",
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
    },
    {
      templateId: "g2_word_add_carry_01",
      grade: 2, difficultyLevel: 2,
      unitId: "addition_2digit", conceptId: "addition_2digit",
      problemType: "word_problem", answerType: "number_input",
      format: "あかいカードを {a}まい、あおいカードを {b}まい もっています。カードは あわせて なんまい？",
      generate: {
        a: { type: "integer", range: [15, 49] },
        b: { type: "integer", range: [15, 49], constraints: ["(a % 10) + (b % 10) >= 10"] },
        answer: { formula: "a + b" }
      },
      answer: { expression: "answer", normalization: "integer" },
      hintSteps: ["一のくらいを たすと 10以上に なるか 見よう。", "{a % 10} + {b % 10} は くり上がりが あるね。十のくらいにも 1を たそう。"],
      explanationTemplate: "一のくらいで くり上がるから、{a} + {b} = {answer} だね。",
      understandingCheck: { enabled: false }
    },
    {
      templateId: "g2_word_sub_borrow_01",
      grade: 2, difficultyLevel: 2,
      unitId: "subtraction_2digit", conceptId: "subtraction_2digit",
      problemType: "word_problem", answerType: "number_input",
      format: "シールを {a}まい もっていました。{b}まい あげると、のこりは なんまい？",
      generate: {
        a: { type: "integer", range: [40, 89] },
        b: { type: "integer", range: [11, 39], constraints: ["b < a && (a % 10) < (b % 10)"] },
        answer: { formula: "a - b" }
      },
      answer: { expression: "answer", normalization: "integer" },
      hintSteps: ["一のくらいで ひけるか 見よう。", "十のくらいから 1つ くり下げて、{a % 10} に 10を たしてから ひこう。"],
      explanationTemplate: "十のくらいから 1つ くり下げると、{a} - {b} = {answer} だね。",
      understandingCheck: { enabled: false }
    },
    {
      templateId: "g2_basic_bignum_04",
      grade: 2, difficultyLevel: 1,
      unitId: "big_number_10000", conceptId: "big_number_read_write",
      problemType: "calculation", answerType: "number_input",
      format: "数直線で {left} と {right} のあいだは、100ずつの目もりです。まんなかの目もりの数は？",
      generate: {
        start: { type: "integer", range: [1, 8] },
        tick: { type: "integer", range: [1, 8] },
        left: { formula: "start * 1000 + (tick - 1) * 100" },
        right: { formula: "start * 1000 + (tick + 1) * 100" },
        answer: { formula: "start * 1000 + tick * 100" }
      },
      answer: { expression: "answer", normalization: "integer" },
      hintSteps: ["100ずつ ふえる 数直線だね。", "{left} の つぎが {answer}、その つぎが {right} だよ。"],
      explanationTemplate: "{left}、{answer}、{right} のじゅんに 100ずつ ふえるね。まんなかは {answer} だよ。",
      understandingCheck: { enabled: false }
    },
    {
      templateId: "g2_basic_length_03",
      grade: 2, difficultyLevel: 1,
      unitId: "length_unit", conceptId: "length_convert_basic",
      problemType: "calculation", answerType: "number_input",
      format: "{a}cm {b}mm のテープと、{c}cm {d}mm のテープを つなぎます。あわせて なんmm？",
      generate: {
        a: { type: "integer", range: [1, 4] },
        b: { type: "integer", range: [1, 9] },
        c: { type: "integer", range: [1, 4] },
        d: { type: "integer", range: [1, 9] },
        answer: { formula: "(a + c) * 10 + b + d" }
      },
      answer: { expression: "answer", normalization: "integer" },
      hintSteps: ["まず cm を mm に なおそう。1cm は 10mm だよ。", "{a}cm は {a * 10}mm、{c}cm は {c * 10}mm。mmどうしも あわせよう。"],
      explanationTemplate: "{a * 10} + {b} + {c * 10} + {d} = {answer}mm だね。",
      understandingCheck: { enabled: false }
    },
    {
      templateId: "g2_basic_time_04",
      grade: 2, difficultyLevel: 1,
      unitId: "time_clock_basic", conceptId: "time_duration_between",
      problemType: "word_problem", answerType: "number_input",
      format: "としょかんに {h}時 {m}分に入り、{h + 1}時 {endM}分に出ました。なん分 いたでしょう？",
      generate: {
        h: { type: "integer", range: [1, 11] },
        m: { type: "choice", values: [10, 20, 30, 40, 50] },
        endM: { type: "choice", values: [0, 10, 20, 30, 40, 50], constraints: ["endM < m"] },
        answer: { formula: "60 - m + endM" }
      },
      answer: { expression: "answer", normalization: "integer" },
      hintSteps: ["{h}時から{h + 1}時までは 60分だよ。", "{h}時{m}分から{h + 1}時までの分と、そのあと{endM}分を あわせよう。"],
      explanationTemplate: "60 - {m} + {endM} = {answer}分 いたね。",
      understandingCheck: { enabled: false }
    },
    {
      templateId: "g2_basic_fraction_03",
      grade: 2, difficultyLevel: 1,
      unitId: "fraction_intro", conceptId: "fraction_denominator",
      problemType: "calculation", answerType: "number_input",
      format: "図の ■ は色をぬったところです。全体を同じ大きさの {d}こに分けると、分数の分子はいくつ？<br>{picture}",
      generate: {
        d: { type: "integer", range: [2, 8] },
        shadeIndex: { type: "integer", range: [1, 7] },
        shaded: { formula: "((shadeIndex - 1) % (d - 1)) + 1" },
        picture: { formula: "'■'.repeat(shaded) + '□'.repeat(d - shaded)" },
        answer: { formula: "shaded" }
      },
      answer: { expression: "answer", normalization: "integer" },
      hintSteps: ["■ が いくつあるか かぞえよう。", "分子は、色をぬった部分の数だよ。"],
      explanationTemplate: "■ は {shaded}こ あるから、分数の分子は {answer} だね。",
      understandingCheck: { enabled: false }
    },
    {
      templateId: "g2_word_kuku_array_01",
      grade: 2, difficultyLevel: 1,
      unitId: "multiplication_g2", conceptId: "kuku_groups_intro",
      problemType: "word_problem", answerType: "number_input",
      format: "{groups}つのまとまりに、●が {perGroup}こずつあります。<br>{picture}<br>●は ぜんぶで なんこ？",
      generate: {
        groups: { type: "integer", range: [2, 5] },
        perGroup: { type: "integer", range: [2, 5] },
        picture: { formula: "('●'.repeat(perGroup) + '　＋　').repeat(groups - 1) + '●'.repeat(perGroup)" },
        answer: { formula: "groups * perGroup" }
      },
      answer: { expression: "answer", normalization: "integer" },
      hintSteps: ["同じ数のまとまりが {groups}つ あるね。", "{perGroup} + {perGroup} を {groups}つ分。かけ算の式にしてみよう。"],
      explanationTemplate: "{perGroup} × {groups} = {answer}こ だね。",
      understandingCheck: { enabled: false }
    },
    {
      templateId: "g2_std_volume_compare_mixed_01",
      grade: 2, difficultyLevel: 2,
      unitId: "volume_unit", conceptId: "volume_compare_basic",
      problemType: "calculation", answerType: "number_input",
      format: "{leftL}L {leftDL}dL と {rightL}L {rightDL}dL では、どちらが多い？ 多いほうのかさを dL で答えよう。",
      generate: {
        leftL: { type: "integer", range: [1, 4] },
        leftDL: { type: "integer", range: [0, 9] },
        rightL: { type: "integer", range: [1, 4] },
        rightDL: { type: "integer", range: [0, 9], constraints: ["leftL * 10 + leftDL !== rightL * 10 + rightDL"] },
        left: { formula: "leftL * 10 + leftDL" },
        right: { formula: "rightL * 10 + rightDL" },
        answer: { formula: "Math.max(left, right)" }
      },
      answer: { expression: "answer", normalization: "integer" },
      hintSteps: ["1L は 10dL だから、まず L を dL に なおそう。", "{leftL}L {leftDL}dL は {left}dL、{rightL}L {rightDL}dL は {right}dL だね。"],
      explanationTemplate: "{left}dL と {right}dL をくらべると、多いほうは {answer}dL だね。",
      understandingCheck: { enabled: false }
    },
    {
      templateId: "g2_basic_box_04",
      grade: 2, difficultyLevel: 1,
      unitId: "geometry_g2", conceptId: "box_net_basic",
      problemType: "calculation", answerType: "number_input",
      format: "箱の形に組み立てられる展開図は どれ？ 図を見て、1・2・3の番号で答えよう。",
      generate: {
        correctPosition: { type: "integer", range: [1, 3] },
        validNet: { type: "choice", values: ["　□<br>□□□<br>　□<br>　□", "　□<br>　□<br>□□□<br>　□"] },
        invalidNetA: { type: "choice", values: ["□□□□<br>□<br>□", "□□□<br>□□□", "□□□□□□"] },
        invalidNetB: { type: "choice", values: ["□□□□<br>□<br>□", "□□□<br>□□□", "□□□□□□"], constraints: ["invalidNetB !== invalidNetA"] },
        net1: { formula: "correctPosition === 1 ? validNet : (correctPosition === 2 ? invalidNetA : invalidNetB)" },
        net2: { formula: "correctPosition === 2 ? validNet : invalidNetA" },
        net3: { formula: "correctPosition === 3 ? validNet : invalidNetB" },
        answer: { formula: "correctPosition" }
      },
      answer: { expression: "answer", normalization: "integer" },
      hintSteps: [
        "はこの形は、6まいの面でできているよ。青い点線は折り目だよ。",
        "まんなかの面を底にして、まわりの面を立てたとき、最後の面でふたができるか考えよう。"
      ],
      explanationTemplate: "{correctPosition}ばんは、6まいの面を折り目で立てると、面が重ならずに箱の形になるよ。",
      understandingCheck: { enabled: false }
    },
    {
      templateId: "g2_std_calcidea_03",
      grade: 2, difficultyLevel: 2,
      unitId: "calc_application", conceptId: "calc_idea_make_10",
      problemType: "calculation", answerType: "number_input",
      format: "{a} + {b} + {c} = ? （10のまとまりをつくって けいさんしよう）",
      generate: {
        a: { type: "integer", range: [11, 59], constraints: ["a % 10 !== 0"] },
        b: { type: "integer", range: [11, 49] },
        c: { formula: "10 - (a % 10)" },
        answer: { formula: "a + b + c" }
      },
      answer: { expression: "answer", normalization: "integer" },
      hintSteps: ["{a} の一のくらいは {a % 10}。{c} をたすと 10のまとまりになるよ。", "{a} + {c} を先に計算してから、{b} をたそう。"],
      explanationTemplate: "{a} + {c} = {a + c}。それに {b} をたして {answer} だね。",
      understandingCheck: { enabled: false }
    },
    {
      templateId: "g2_std_inverse_add_sub_01",
      grade: 2, difficultyLevel: 2,
      unitId: "calc_application", conceptId: "add_sub_missing_number",
      problemType: "word_problem", answerType: "number_input",
      format: "{q_text}",
      generate: {
        type_idx: { type: "integer", range: [1, 2] },
        a: { type: "integer", range: [15, 49] },
        b: {
          type: "integer", range: [11, 39],
          constraints: ["type_idx === 1 ? (a % 10) + (b % 10) >= 10 : b < a && (a % 10) < (b % 10)"]
        },
        total: { formula: "a + b" },
        remaining: { formula: "a - b" },
        q_text: {
          formula: "type_idx === 1 ? 'カードを ' + a + 'まい もっています。何まいか もらうと ' + total + 'まいに なりました。もらったのは 何まい？' : 'シールを ' + a + 'まい もっています。何まいか あげると ' + remaining + 'まいに なりました。あげたのは 何まい？'"
        },
        answer: { formula: "b" }
      },
      answer: { expression: "answer", normalization: "integer" },
      hintSteps: [
        "分からない数を □ として、たし算か ひき算の式にしよう。",
        "{type_idx === 1 ? total + ' から ' + a + ' を ひくと、もらった数が 分かるよ。' : a + ' から ' + remaining + ' を ひくと、あげた数が 分かるよ。'}"
      ],
      explanationTemplate: "{type_idx === 1 ? total + ' - ' + a + ' = ' + answer + ' まい だね。' : a + ' - ' + remaining + ' = ' + answer + ' まい だね。'}",
      understandingCheck: { enabled: false }
    },
    {
      templateId: "g2_std_length_add_diff_01",
      grade: 2, difficultyLevel: 2,
      unitId: "length_unit", conceptId: "length_add_sub_mixed",
      problemType: "word_problem", answerType: "number_input",
      format: "{q_text}",
      generate: {
        operation: { type: "integer", range: [1, 2] },
        a: { type: "integer", range: [1, 5] },
        b: { type: "integer", range: [0, 9] },
        c: { type: "integer", range: [1, 5] },
        d: { type: "integer", range: [0, 9], constraints: ["a * 10 + b !== c * 10 + d"] },
        left: { formula: "a * 10 + b" },
        right: { formula: "c * 10 + d" },
        answer: { formula: "operation === 1 ? left + right : Math.abs(left - right)" },
        q_text: {
          formula: "operation === 1 ? (a + 'cm ' + b + 'mm と ' + c + 'cm ' + d + 'mm のテープを つなぎます。あわせて なんmm？') : (a + 'cm ' + b + 'mm と ' + c + 'cm ' + d + 'mm のテープの 長さのちがいは なんmm？')"
        }
      },
      answer: { expression: "answer", normalization: "integer" },
      hintSteps: [
        "1cm は 10mm だから、cm を mm に なおそう。",
        "{a}cm {b}mm は {left}mm、{c}cm {d}mm は {right}mm だよ。"
      ],
      explanationTemplate: "{left}mm と {right}mm を {operation === 1 ? 'あわせる' : 'くらべる'}と、答えは {answer}mm だね。",
      understandingCheck: { enabled: false }
    },
    {
      templateId: "g2_std_volume_add_diff_01",
      grade: 2, difficultyLevel: 2,
      unitId: "volume_unit", conceptId: "volume_add_sub_mixed",
      problemType: "word_problem", answerType: "number_input",
      format: "{q_text}",
      generate: {
        operation: { type: "integer", range: [1, 2] },
        a: { type: "integer", range: [1, 4] },
        b: { type: "integer", range: [0, 9] },
        c: { type: "integer", range: [1, 4] },
        d: { type: "integer", range: [0, 9], constraints: ["a * 10 + b !== c * 10 + d"] },
        left: { formula: "a * 10 + b" },
        right: { formula: "c * 10 + d" },
        answer: { formula: "operation === 1 ? left + right : Math.abs(left - right)" },
        q_text: {
          formula: "operation === 1 ? (a + 'L ' + b + 'dL と ' + c + 'L ' + d + 'dL の水を あわせます。なんdL？') : (a + 'L ' + b + 'dL と ' + c + 'L ' + d + 'dL の水の かさのちがいは なんdL？')"
        }
      },
      answer: { expression: "answer", normalization: "integer" },
      hintSteps: [
        "1L は 10dL だから、L を dL に なおそう。",
        "{a}L {b}dL は {left}dL、{c}L {d}dL は {right}dL だね。"
      ],
      explanationTemplate: "{left}dL と {right}dL を {operation === 1 ? 'あわせる' : 'くらべる'}と、答えは {answer}dL だね。",
      understandingCheck: { enabled: false }
    },
    {
      templateId: "g2_std_time_elapsed_hour_01",
      grade: 2, difficultyLevel: 2,
      unitId: "time_clock_basic", conceptId: "time_duration_across_hour",
      problemType: "word_problem", answerType: "number_input",
      format: "午前 {startH}時 {startM}分から 午前 {endH}時 {endM}分まで、何分 かかりましたか？",
      generate: {
        startH: { type: "integer", range: [7, 9] },
        startM: { type: "choice", values: [10, 20, 30, 40, 50] },
        elapsed: {
          type: "choice", values: [20, 30, 40, 50, 60, 70, 80, 90],
          constraints: ["startM + elapsed >= 60"]
        },
        endH: { formula: "startH + Math.floor((startM + elapsed) / 60)" },
        endM: { formula: "(startM + elapsed) % 60" },
        answer: { formula: "elapsed" }
      },
      answer: { expression: "answer", normalization: "integer" },
      hintSteps: [
        "{startH}時{startM}分から {endH}時まで、あと何分か考えよう。",
        "{startM}分から 60分までの分と、{endM}分を あわせよう。"
      ],
      explanationTemplate: "(60 - {startM}) + {endM} を計算すると、{answer}分 だね。",
      understandingCheck: { enabled: false }
    },
    {
      templateId: "g2_std_fraction_compare_picture_01",
      grade: 2, difficultyLevel: 2,
      unitId: "fraction_intro", conceptId: "fraction_compare_pictures",
      problemType: "calculation", answerType: "number_input",
      format: "同じ大きさに {denominator}こに分けたテープです。色のついた部分が多いほうの分子を答えよう。<br>A　{pictureA}　B　{pictureB}",
      generate: {
        denominator: { type: "integer", range: [3, 8] },
        numeratorA: { type: "integer", range: [1, 7], constraints: ["numeratorA < denominator"] },
        numeratorB: { type: "integer", range: [1, 7], constraints: ["numeratorB < denominator && numeratorB !== numeratorA"] },
        pictureA: { formula: "'■'.repeat(numeratorA) + '□'.repeat(denominator - numeratorA)" },
        pictureB: { formula: "'■'.repeat(numeratorB) + '□'.repeat(denominator - numeratorB)" },
        answer: { formula: "Math.max(numeratorA, numeratorB)" }
      },
      answer: { expression: "answer", normalization: "integer" },
      hintSteps: [
        "どちらも同じ大きさに、同じ数だけ分けているね。",
        "■の数が多いテープの分子を答えよう。"
      ],
      explanationTemplate: "分けた数が同じときは、色のついた部分が多いほうが大きい分数だよ。答えは {answer} だね。",
      understandingCheck: { enabled: false }
    },
    {
      templateId: "g2_adv_kuku_reverse_story_01",
      grade: 2, difficultyLevel: 3,
      unitId: "multiplication_g2", conceptId: "kuku_advanced_groups",
      problemType: "word_problem", answerType: "number_input",
      format: "{total}このクッキーを、1ふくろに {perGroup}こずつ入れます。ふくろは 何ふくろできますか？",
      generate: {
        groups: { type: "integer", range: [6, 9] },
        perGroup: { type: "integer", range: [6, 9] },
        total: { formula: "groups * perGroup" },
        answer: { formula: "groups" }
      },
      answer: { expression: "answer", normalization: "integer" },
      hintSteps: [
        "1ふくろに {perGroup}こずつ入れるんだね。九九の {perGroup}の段を使おう。",
        "{perGroup} × □ = {total} になる □ をさがそう。"
      ],
      explanationTemplate: "{perGroup} × {answer} = {total} だから、{answer}ふくろ できるね。",
      understandingCheck: { enabled: false }
    },
    {
      templateId: "g2_adv_3terms_make100_01",
      grade: 2, difficultyLevel: 3,
      unitId: "calc_application", conceptId: "three_terms_2digit",
      problemType: "calculation", answerType: "number_input",
      commutativePairs: [["a", "b"], ["b", "c"], ["a", "c"]],
      format: "{a} + {b} + {c} = ? くふうして計算しよう。",
      generate: {
        a: { type: "integer", range: [11, 49] },
        b: { type: "integer", range: [11, 49] },
        c: { formula: "100 - a" },
        answer: { formula: "a + b + c" }
      },
      answer: { expression: "answer", normalization: "integer" },
      hintSteps: [
        "{a} と {c} をたすと、どんな数になるかな？",
        "{a} + {c} で100をつくってから、{b} をたそう。"
      ],
      explanationTemplate: "{a} + {c} = 100。100 + {b} = {answer} だから、答えは {answer} だね。",
      understandingCheck: { enabled: false }
    },
    {
      templateId: "g2_adv_2step_story_02",
      grade: 2, difficultyLevel: 3,
      unitId: "calc_application", conceptId: "working_backwards",
      problemType: "word_problem", answerType: "number_input",
      format: "{q_text}",
      generate: {
        type_idx: { type: "integer", range: [1, 2] },
        start: { type: "integer", range: [20, 59] },
        gained: { type: "integer", range: [11, 29] },
        used: { type: "integer", range: [11, 29], constraints: ["start + gained > used"] },
        final: { formula: "start + gained - used" },
        answer: { formula: "type_idx === 1 ? final : start" },
        q_text: {
          formula: "type_idx === 1 ? ('ノートを ' + start + 'さつ もっています。さらに ' + gained + 'さつ もらい、そのあと ' + used + 'さつ つかいました。いま 何さつ？') : ('ノートを何さつか もっていました。' + gained + 'さつ もらい、そのあと ' + used + 'さつ つかうと ' + final + 'さつに なりました。はじめは何さつ？')"
        }
      },
      answer: { expression: "answer", normalization: "integer" },
      hintSteps: [
        "{type_idx === 1 ? 'まず もらった数を たして、そのあと つかった数を ひこう。' : 'いまの数から、あとでつかった数をもどし、もらった数をひこう。'}",
        "{type_idx === 1 ? start + ' + ' + gained + ' - ' + used + ' のじゅんに計算しよう。' : final + ' + ' + used + ' - ' + gained + ' のじゅんに、はじめの数をもとめよう。'}"
      ],
      explanationTemplate: "{type_idx === 1 ? start + ' + ' + gained + ' - ' + used + ' = ' + final + ' だね。' : final + ' + ' + used + ' - ' + gained + ' = ' + answer + ' だね。'}",
      understandingCheck: { enabled: false }
    },
    {
      templateId: "g2_adv_rectangle_perimeter_01",
      grade: 2, difficultyLevel: 3,
      unitId: "geometry_g2", conceptId: "tri_quad_grid_length",
      problemType: "figure", answerType: "figure_display",
      format: "図の長方形の まわりの長さは何cm？",
      generate: {
        width: { type: "integer", range: [2, 6] },
        height: { type: "integer", range: [1, 4] },
        answer: { formula: "2 * (width + height)" }
      },
      figureSpec: {
        shape: "quadrilateral",
        w: "{width}", h: "{height}", pxPerUnit: 26, grid: 1,
        autoMarks: false,
        labels: { edges: { AB: "{width}cm", BC: "{height}cm" } }
      },
      figureAnswerUnit: "cm",
      answer: { expression: "answer", normalization: "integer" },
      hintSteps: [
        "長方形は向かい合う辺の長さが同じだよ。",
        "{width}cm と {height}cm の辺が2本ずつあるね。"
      ],
      explanationTemplate: "{width} + {height} + {width} + {height} = {answer}cm だね。",
      understandingCheck: { enabled: false }
    }
  ];

  function numericTemplate(options) {
    return {
      templateId: options.id,
      grade: 2,
      difficultyLevel: options.level,
      unitId: options.unit,
      conceptId: options.concept,
      problemType: options.problemType || "calculation",
      answerType: "number_input",
      format: options.format,
      generate: Object.assign({}, options.generate, {
        answer: { formula: options.answer }
      }),
      answer: { expression: "answer", normalization: "integer" },
      hintSteps: options.hints,
      explanationTemplate: options.explanation,
      understandingCheck: { enabled: false }
    };
  }

  T.push(
    // Lv1 addition and subtraction fundamentals.
    numericTemplate({
      id: "g2_basic_sub_no_borrow_02", level: 1, unit: "subtraction_2digit",
      concept: "sub_2digit_basic", format: "{a} − {b} = ?",
      generate: { a: { type: "integer", range: [40, 99] }, b: { type: "integer", range: [10, 39], constraints: ["Math.floor(a / 10) > Math.floor(b / 10)", "a % 10 >= b % 10"] } },
      answer: "a - b",
      hints: ["十のくらいと一のくらいに分けよう。", "一のくらいから順番にひこう。"],
      explanation: "{a} − {b} = {answer} だね。"
    }),
    numericTemplate({
      id: "g2_basic_sub_no_borrow_03", level: 1, unit: "subtraction_2digit",
      concept: "sub_2digit_basic", format: "{a} − {b} = ?",
      generate: { a: { type: "integer", range: [30, 99] }, b: { type: "integer", range: [10, 29], constraints: ["a % 10 >= b % 10", "a > b"] } },
      answer: "a - b",
      hints: ["一のくらいでくり下がりがあるか見よう。", "{a % 10} から {b % 10} をひけるかな？"],
      explanation: "くり下がりをしないで計算できるね。{a} − {b} = {answer}。"
    }),
    numericTemplate({
      id: "g2_word_sub_no_borrow_01", level: 1, unit: "subtraction_2digit",
      concept: "sub_2digit_basic", problemType: "word_problem",
      format: "シールが {a}まい あります。{b}まい あげると、のこりは 何まい？",
      generate: { a: { type: "integer", range: [40, 99] }, b: { type: "integer", range: [10, 39], constraints: ["Math.floor(a / 10) > Math.floor(b / 10)", "a % 10 >= b % 10"] } },
      answer: "a - b",
      hints: ["あげたあとの数だから、ひき算をしよう。", "{a} から {b} をひこう。"],
      explanation: "{a} − {b} = {answer}。のこりは {answer}まいだね。"
    }),
    numericTemplate({
      id: "g2_word_add_carry_02", level: 2, unit: "addition_2digit",
      concept: "add_2digit_carry", problemType: "word_problem",
      format: "赤い花が {a}本、白い花が {b}本 あります。あわせて何本？",
      generate: { a: { type: "integer", range: [21, 64] }, b: { type: "integer", range: [12, 34], constraints: ["a % 10 + b % 10 >= 10", "a + b < 100"] } },
      answer: "a + b",
      hints: ["あわせた数だから、たし算だね。", "一のくらいにくり上がりがないか確かめよう。"],
      explanation: "{a} + {b} = {answer}本 だね。"
    }),
    numericTemplate({
      id: "g2_std_add_carry_02", level: 2, unit: "addition_2digit",
      concept: "add_2digit_carry", format: "{a} + {b} = ?",
      generate: { a: { type: "integer", range: [24, 68] }, b: { type: "integer", range: [17, 39], constraints: ["a % 10 + b % 10 >= 10", "a + b < 100"] } },
      answer: "a + b",
      hints: ["一のくらいを先にたそう。", "10以上になったら、十のくらいに1くり上げよう。"],
      explanation: "一のくらいでくり上がるね。{a} + {b} = {answer}。"
    }),
    numericTemplate({
      id: "g2_word_sub_borrow_02", level: 2, unit: "subtraction_2digit",
      concept: "sub_2digit_borrow", problemType: "word_problem",
      format: "本が {a}さつ あります。{b}さつ 読みました。まだ読んでいない本は何さつ？",
      generate: { a: { type: "integer", range: [41, 89] }, b: { type: "integer", range: [12, 38], constraints: ["a % 10 < b % 10", "a > b"] } },
      answer: "a - b",
      hints: ["読んだ本をひくと、まだ読んでいない本の数になるよ。", "一のくらいでくり下がりをしよう。"],
      explanation: "{a} − {b} = {answer}さつ だね。"
    }),
    // Lv1 multiplication meaning and Lv2 length, time, and fractions.
    numericTemplate({
      id: "g2_basic_kuku_equal_groups_02", level: 1, unit: "multiplication_g2",
      concept: "kuku_groups_intro",
      format: "{groups}人に あめを {each}こずつ 配ります。あめは ぜんぶで何こ？",
      generate: { groups: { type: "integer", range: [2, 5] }, each: { type: "integer", range: [2, 5] } },
      answer: "groups * each",
      hints: ["同じ数ずつのまとまりがいくつあるか考えよう。", "{each} を {groups}回 たすかわりに、かけ算にしよう。"],
      explanation: "{each} × {groups} = {answer}こ だね。"
    }),
    numericTemplate({
      id: "g2_basic_kuku_repeated_add_03", level: 1, unit: "multiplication_g2",
      concept: "kuku_groups_intro",
      format: "{each} + {each} + {each} + {each} = ? かけ算の式で考えよう。",
      generate: { each: { type: "integer", range: [2, 5] } },
      answer: "each * 4",
      hints: ["同じ数を何回たしているか数えよう。", "{each} が4つあるから、{each} × 4 だね。"],
      explanation: "{each} × 4 = {answer} だね。"
    }),
    numericTemplate({
      id: "g2_basic_kuku_missing_group_04", level: 1, unit: "multiplication_g2",
      concept: "kuku_groups_intro", format: "{each} × □ = {product}。□に入る数は？",
      generate: { each: { type: "integer", range: [2, 5] }, groups: { type: "integer", range: [2, 5] }, product: { formula: "each * groups" } },
      answer: "groups",
      hints: ["{each}ずつのまとまりを何こ作ると {product} になるかな？", "{each} の段の九九からさがそう。"],
      explanation: "{each} × {groups} = {product} だから、□は {answer} だね。"
    }),
    numericTemplate({
      id: "g2_std_length_convert_mm_02", level: 2, unit: "length_unit",
      concept: "length_convert_m_cm", format: "{cm}cm は 何mm？",
      generate: { cm: { type: "integer", range: [2, 45] } },
      answer: "cm * 10",
      hints: ["1cm は 10mm だよ。", "{cm} を 10倍しよう。"],
      explanation: "{cm} × 10 = {answer}mm だね。"
    }),
    numericTemplate({
      id: "g2_std_length_add_cm_03", level: 2, unit: "length_unit",
      concept: "length_add_sub_mixed", problemType: "word_problem",
      format: "リボンが {a}cm と {b}cm あります。つなぐと何cm？",
      generate: { a: { type: "integer", range: [15, 75] }, b: { type: "integer", range: [12, 69] } },
      answer: "a + b",
      hints: ["つないだ長さは、2本の長さをたすよ。", "{a} と {b} をたそう。"],
      explanation: "{a} + {b} = {answer}cm だね。"
    }),
    numericTemplate({
      id: "g2_std_time_elapsed_minutes_02", level: 2, unit: "time_clock_basic",
      concept: "time_duration_across_hour",
      format: "{hour}時{minute}分から {endHour}時{endMinute}分まで、何分間？",
      generate: {
        hour: { type: "integer", range: [1, 8] },
        minute: { type: "choice", values: [15, 30, 45] },
        duration: { type: "choice", values: [15, 30, 45], constraints: ["minute + duration >= 60"] },
        endTotal: { formula: "minute + duration" },
        endHour: { formula: "hour + Math.floor(endTotal / 60)" },
        endMinute: { formula: "endTotal % 60" }
      },
      answer: "(endHour - hour) * 60 + endMinute - minute",
      hints: ["時こくを分になおして、あととまえの時こくの差を出そう。", "{hour}時{minute}分から次の時までの分も考えよう。"],
      explanation: "{hour}時{minute}分から{endHour}時{endMinute}分までは {answer}分 だね。"
    }),
    numericTemplate({
      id: "g2_std_time_duration_03", level: 2, unit: "time_clock_basic",
      concept: "time_duration_across_hour", problemType: "word_problem",
      format: "べんきょうを {start}分 はじめて、{end}分に おわりました。何分べんきょうした？",
      generate: { start: { type: "integer", range: [5, 35] }, duration: { type: "integer", range: [15, 45] }, end: { formula: "start + duration" } },
      answer: "end - start",
      hints: ["おわった時こくから、はじめた時こくをひこう。", "{end} − {start} を計算しよう。"],
      explanation: "{end} − {start} = {answer}分 だね。"
    }),
    numericTemplate({
      id: "g2_std_fraction_equal_parts_02", level: 2, unit: "fraction_intro",
      concept: "fraction_denominator", format: "テープを {parts}こに同じ大きさに分けました。1つ分は全体の何分の1？ 分母を答えよう。",
      generate: { parts: { type: "integer", range: [2, 8] } },
      answer: "parts",
      hints: ["同じ大きさに分けた数が、分母になるよ。", "分けた数をそのまま答えよう。"],
      explanation: "全体を {parts}こに分けた1つ分は {parts}分の1。分母は {answer} だね。"
    }),
    numericTemplate({
      id: "g2_std_fraction_compare_same_denominator_03", level: 2, unit: "fraction_intro",
      concept: "fraction_compare_pictures",
      format: "{a}/{denominator} と {b}/{denominator}。大きい分数の分子を答えよう。",
      generate: { denominator: { type: "integer", range: [4, 8] }, a: { type: "integer", range: [1, 3] }, b: { formula: "a + 1", constraints: ["b < denominator"] } },
      answer: "b",
      hints: ["分母が同じときは、分子をくらべよう。", "同じ大きさに分けた何こ分かをくらべるよ。"],
      explanation: "{b}こ分のほうが大きいから、答えは {answer} だね。"
    }),
    numericTemplate({
      id: "g2_std_geometry_edges_word_01", level: 2, unit: "geometry_g2",
      concept: "box_faces_edges_vertices",
      format: "三角形の頂点は3こ、長方形の頂点は4こ。頂点はあわせて何こ？",
      generate: { triangleVertices: { type: "choice", values: [3] }, rectangleVertices: { type: "choice", values: [4] } },
      answer: "triangleVertices + rectangleVertices",
      hints: ["それぞれの形の頂点の数をたそう。", "{triangleVertices} + {rectangleVertices} を計算しよう。"],
      explanation: "{triangleVertices} + {rectangleVertices} = {answer}こ だね。"
    }),
    numericTemplate({
      id: "g2_std_geometry_shape_edges_02", level: 2, unit: "geometry_g2",
      concept: "tri_quad_identify",
      format: "三角形が {triangles}こ、四角形が {quadrilaterals}こあります。頂点はぜんぶで何こ？",
      generate: { triangles: { type: "integer", range: [1, 4] }, quadrilaterals: { type: "integer", range: [1, 4] } },
      answer: "triangles * 3 + quadrilaterals * 4",
      hints: ["三角形は頂点が3こ、四角形は4こだよ。", "それぞれの頂点の数をかけてから、あわせよう。"],
      explanation: "{triangles} × 3 + {quadrilaterals} × 4 = {answer}こ だね。"
    }),
    numericTemplate({
      id: "g2_adv_geometry_box_faces_01", level: 3, unit: "geometry_g2",
      concept: "box_faces_edges_vertices",
      format: "はこの形が2つあります。面は1つのはこに6まい。面はぜんぶで何まい？",
      generate: { boxes: { type: "choice", values: [2] }, faces: { type: "choice", values: [6] } },
      answer: "boxes * faces",
      hints: ["1つのはこの面の数を、はこの数だけたそう。", "同じ数のまとまりだから、かけ算にできるよ。"],
      explanation: "{faces} × {boxes} = {answer}まい だね。"
    }),
    numericTemplate({
      id: "g2_adv_geometry_perimeter_text_02", level: 3, unit: "geometry_g2",
      concept: "tri_quad_grid_length",
      format: "長方形のたては {height}cm、よこは {width}cm。まわりの長さは何cm？",
      generate: { height: { type: "integer", range: [2, 8] }, width: { type: "integer", range: [3, 12] } },
      answer: "2 * (height + width)",
      hints: ["たてとよこの長さは、それぞれ向かい合う辺にもあるよ。", "たてとよこをたして、2倍しよう。"],
      explanation: "({height} + {width}) × 2 = {answer}cm だね。"
    }),
    numericTemplate({
      id: "g2_adv_geometry_square_perimeter_03", level: 3, unit: "geometry_g2",
      concept: "tri_quad_grid_length",
      format: "1辺が {side}cm の正方形です。まわりの長さは何cm？",
      generate: { side: { type: "integer", range: [2, 12] } },
      answer: "side * 4",
      hints: ["正方形の辺は4本とも同じ長さだよ。", "{side}cm を4つ分たそう。"],
      explanation: "{side} × 4 = {answer}cm だね。"
    })
  );

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