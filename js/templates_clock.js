/**
 * Unit Templates — 時計（とけい）付き 時こく問題
 * V2.6.7 準拠
 *
 * 設計方針 (ユーザー確定事項):
 *   - 時計は数字 1〜12 のみ表示（5分単位の補助数字は入れない）
 *   - 秒針は常に表示する。秒問題でないときは 0秒固定
 *   - 時計の大きさは "large" / "small" の2段階
 *   - 大きい時計2つ → 縦並び、小さい時計2つ → 横並び（ClockSVG が自動決定）
 *   - 12時間表示を基本とし、学年により 24時間表示（show24）も許容
 *   - 回答は「時」「分」「秒」を分けて入力する（answerType: "clock_input"）
 *
 * 表示は ClockSVG（js/clock_svg.js）が担当する。テンプレート側は
 * clockSpec（どの時計を何個・どの変数で出すか）を宣言するだけ。
 * これにより 2年生だけでなく 3年生以降でも同じ部品を使い回せる。
 */
(function () {
  var T = [
    // ==========================================
    // G2 Lv1: 時計を読む（時・分） ※秒針は0秒固定
    // ==========================================
    {
      templateId: "g2_clock_read_01",
      grade: 2, difficultyLevel: 1,
      unitId: "time_clock_basic", conceptId: "clock_read_hm",
      problemType: "calculation", answerType: "clock_input",
      format: "とけいが さす 時こくを こたえよう。",
      clockSpec: {
        size: "large", layout: "vertical", format: "H:M",
        showSeconds: true, show24: false,
        clocks: [{ hourVar: "h", minuteVar: "m", secondVar: "s", label: "" }]
      },
      generate: {
        h: { type: "integer", range: [1, 12] },
        m: { type: "choice", values: [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55] },
        s: { type: "integer", range: [0, 0] },
        answer: { formula: "h + ':' + (m < 10 ? '0' + m : '' + m)" }
      },
      answer: { expression: "answer", normalization: "clock" },
      hintSteps: [
        "みじかい はりが 時、ながい はりが 分だよ。",
        "みじかい はりは {h} と {h + 1} の あいだ、ながい はりは {m} の ところだね。"
      ],
      explanationTemplate: "みじかい はりが {h}、ながい はりが {m} を さしているから、{h}時{m}分 だね。",
      understandingCheck: {
        enabled: true, type: "choice",
        questionTemplate: "この とけいが さす 時こくは どれ？",
        choices: ["{h}時{m}分", "{wrong1}", "{wrong2}"],
        answer: "{h}時{m}分",
        generateWrong: {
          wrong1: { formula: "(m >= 55 ? h : h + 1) === h ? (h % 12 + 1) + '時' + m + '分' : (h + 1) + '時' + m + '分'" },
          wrong2: { formula: "h + '時' + ((m + 5) % 60) + '分'" }
        }
      }
    },
    // ==========================================
    // G2 Lv1: 秒まである時計を読む（時・分・秒）
    // ==========================================
    {
      templateId: "g2_clock_read_02",
      grade: 2, difficultyLevel: 1,
      unitId: "time_clock_basic", conceptId: "clock_read_hms",
      problemType: "calculation", answerType: "clock_input",
      format: "とけいの よみを こたえよう。ほそい はりは 秒を さしているよ。",
      clockSpec: {
        size: "large", layout: "vertical", format: "H:M:S",
        showSeconds: true, show24: false,
        clocks: [{ hourVar: "h", minuteVar: "m", secondVar: "s", label: "" }]
      },
      generate: {
        h: { type: "integer", range: [1, 12] },
        m: { type: "choice", values: [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55] },
        s: { type: "choice", values: [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55] },
        answer: {
          formula: "h + ':' + (m < 10 ? '0' + m : '' + m) + ':' + (s < 10 ? '0' + s : '' + s)"
        }
      },
      answer: { expression: "answer", normalization: "clock" },
      hintSteps: [
        "ほそい はりが 秒を さしているよ。1目もりが 1秒だね。",
        "時は {h}、分は {m}、秒は {s} だね。"
      ],
      explanationTemplate: "{h}時{m}分{s}秒 だね。",
      understandingCheck: {
        enabled: true, type: "choice",
        questionTemplate: "ほそい はりが さす 数は どれ？",
        choices: ["{s}秒", "{wrong1}", "{wrong2}"],
        answer: "{s}秒",
        generateWrong: {
          wrong1: { formula: "(s + 5) % 60 + '秒'" },
          wrong2: { formula: "(s + 10) % 60 + '秒'" }
        }
      }
    },
    // ==========================================
    // G2 Lv1: 2つの時計（小）→ 何分後？ ※横並び
    // ==========================================
    {
      templateId: "g2_clock_elapsed_01",
      grade: 2, difficultyLevel: 1,
      unitId: "time_clock_basic", conceptId: "time_duration_between",
      problemType: "calculation", answerType: "clock_input",
      format: "「はじめ」の とけいから 「おわり」の とけいまで、なん分 かかったかな？",
      clockSpec: {
        size: "small", layout: "horizontal", format: "M",
        showSeconds: true, show24: false,
        clocks: [
          { hourVar: "h", minuteVar: "m", secondVar: "s0", label: "はじめ", size: "small" },
          { hourVar: "h", minuteVar: "m2", secondVar: "s0", label: "おわり", size: "small" }
        ]
      },
      generate: {
        h: { type: "integer", range: [1, 12] },
        m: { type: "choice", values: [0, 10, 20, 30] },
        k: { type: "choice", values: [5, 10, 15, 20, 25, 30] },
        m2: { formula: "m + k" },
        s0: { type: "integer", range: [0, 0] },
        answer: { formula: "k" }
      },
      answer: { expression: "answer", normalization: "integer" },
      hintSteps: [
        "「はじめ」の ながい はりは {m}、「おわり」は {m2} を さしているよ。",
        "{m2} - {m} で、すすんだ 分を もとめよう。"
      ],
      explanationTemplate: "{m2} - {m} = {answer} だから、{answer}分 だね。",
      understandingCheck: {
        enabled: true, type: "choice",
        questionTemplate: "なん分 かかったかな？",
        choices: ["{answer}分", "{wrong1}", "{wrong2}"],
        answer: "{answer}分",
        generateWrong: {
          wrong1: { formula: "(k + 5) + '分'" },
          wrong2: { formula: "(k + 10) + '分'" }
        }
      }
    },
    // ==========================================
    // G2 Lv1: 時計＋「何分後」（大）→ 時こく H:M
    // ==========================================
    {
      templateId: "g2_clock_time_after_01",
      grade: 2, difficultyLevel: 1,
      unitId: "time_clock_basic", conceptId: "time_duration_forward",
      problemType: "calculation", answerType: "clock_input",
      format: "いまの 時こくから {k}分 あとの 時こくは なん時なん分？",
      clockSpec: {
        size: "large", layout: "vertical", format: "H:M",
        showSeconds: true, show24: false,
        clocks: [{ hourVar: "h", minuteVar: "m", secondVar: "s", label: "いま" }]
      },
      generate: {
        h: { type: "integer", range: [1, 10] },
        m: { type: "choice", values: [0, 10, 20, 30, 40, 50] },
        k: { type: "choice", values: [10, 20, 30] },
        s: { type: "integer", range: [0, 0] },
        total: { formula: "h * 60 + m + k" },
        answer: {
          formula: "Math.floor(total / 60) + ':' + ((total % 60) < 10 ? '0' + (total % 60) : '' + (total % 60))"
        }
      },
      answer: { expression: "answer", normalization: "clock" },
      hintSteps: [
        "いまの 時こくは {h}時{m}分だね。",
        "分が 60 を こえたら 1時間 くり上げよう。{m} + {k} = {m + k}分だね。"
      ],
      explanationTemplate: "{h}時{m}分の {k}分後は {answer} だね。",
      understandingCheck: {
        enabled: true, type: "choice",
        questionTemplate: "{h}時{m}分の {k}分後は なん時なん分？",
        choices: ["{answer}", "{wrong1}", "{wrong2}"],
        answer: "{answer}",
        generateWrong: {
          wrong1: { formula: "Math.floor(total / 60) + ':' + ((total % 60) < 10 ? '0' + (total % 60) : '' + (total % 60)) + ''" },
          wrong2: { formula: "Math.floor((total + 10) / 60) + ':' + (((total + 10) % 60) < 10 ? '0' + ((total + 10) % 60) : '' + ((total + 10) % 60))" }
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
    module.exports = { UNIT_TEMPLATES_CLOCK: T };
  } else {
    window.UNIT_TEMPLATES_CLOCK = T;
  }
})();