/**
 * RuleBasedQuestionSource Layer
 * V2.5.10 詳細設計書 第7章・第8章・第10章・第38.19章 準拠
 * 
 * - template からの variables 生成・制約検証
 * - questionText, answer, hintSteps, explanation, understandingCheck の安全な組み立て
 * - QuestionValidator による出題前自動検証
 * - MAX_GENERATION_RETRY (5回) 再試行 & 安全なフォールバック
 * - generateSimilarQuestion (復習用再生成)
 */

// モジュール依存関係の解決
let TemplateRegistryRef = typeof window !== "undefined" ? window.TemplateRegistry : null;
let QuestionValidatorRef = typeof window !== "undefined" ? window.QuestionValidator : null;

if (typeof require !== "undefined") {
  try { TemplateRegistryRef = require("./registries.js").TemplateRegistry; } catch (e) {}
  try { QuestionValidatorRef = require("./validator.js").QuestionValidator; } catch (e) {}
  try { require("./templates_math.js"); } catch (e) {}
  try { require("./templates_units_p1.js"); } catch (e) {}
  try { require("./templates_units_p2.js"); } catch (e) {}
  try { require("./templates_g2_extra.js"); } catch (e) {}
  try { require("./templates_figures_g1.js"); } catch (e) {}
  try { require("./templates_figures_g2.js"); } catch (e) {}
  // V2.6.7: 時計問題 (Node 実行時の読み込み。ブラウザは index.html で先行読込済み)
  try {
    const clockMod = require("./clock_svg.js");
    if (clockMod && clockMod.ClockSVG && typeof globalThis !== "undefined" && !globalThis.ClockSVG) {
      globalThis.ClockSVG = clockMod.ClockSVG;
    }
  } catch (e) {}
  try { require("./templates_clock.js"); } catch (e) {}
  // V2.7.0: 図形SVG部品 (figure_tap の組み立てに使う)
  try {
    const figMod = require("./figure_svg.js");
    if (figMod && figMod.FigureSVG && typeof globalThis !== "undefined" && !globalThis.FigureSVG) {
      globalThis.FigureSVG = figMod.FigureSVG;
    }
  } catch (e) {}
  // V2.9.0: 筆算SVG部品 (hissanSpec の組み立てに使う)
  try {
    const hissanMod = require("./hissan_svg.js");
    if (hissanMod && hissanMod.HissanSVG && typeof globalThis !== "undefined" && !globalThis.HissanSVG) {
      globalThis.HissanSVG = hissanMod.HissanSVG;
    }
  } catch (e) {}
  try { require("./templates_figures_g3.js"); } catch (e) {}
}

const MAX_GENERATION_RETRY = 5;
// V2.9.0: 変数生成の制約違反を救済するための「ルール全体引き直し」上限回数
// 1回あたり _evalFormula（new Function）を数回呼ぶが、正常系では 0 回しか発生しない。
const MAX_VARIABLE_REDRAW_ROUNDS = 50;

class RuleBasedQuestionSource {
  /**
   * templateId から1問の questionInstance を生成・検証して返す
   * @param {string} templateId 
   * @param {Array<Object>} previousInstances (重複防止用)
   * @param {Object} options { isReview, maxRetries }
   * @returns {Object} questionInstance
   */
  static generateQuestion(templateId, previousInstances = [], options = {}) {
    const template = this._getTemplate(templateId);
    if (!template) {
      throw new Error(`RuleBasedQuestionSource: Template '${templateId}' not found.`);
    }

    const maxRetries = options.maxRetries || MAX_GENERATION_RETRY;
    let lastError = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        // 1. 変数の生成
        const vars = this._generateVariables(template.generate);

        // 2. 問題文・式・正解・ヒント・解説の組み立て
        const instance = this._assembleInstance(template, vars, previousInstances, options);

        // 3. QuestionValidator による厳格検証 (第10章)
        const valRes = (QuestionValidatorRef || window.QuestionValidator).validate(instance, previousInstances);
        if (valRes.valid) {
          return instance;
        } else {
          lastError = valRes.errors.map(e => `${e.code}: ${e.message}`).join(", ");
        }
      } catch (err) {
        lastError = err.message;
      }
    }

    // 4. フォールバック処理 (第7.22章 & 第38.3章)
    console.warn(`RuleBasedQuestionSource: Retries exceeded for '${templateId}' (${lastError}). Trying fallback...`);
    return this._fallback(template, previousInstances, options);
  }

  /**
   * 復習用: 同一templateから新しい変数を再生成する (第7.7章)
   */
  static generateSimilarQuestion(templateId, previousVariables = null, options = {}) {
    const prevList = previousVariables ? [{ templateId, variables: previousVariables }] : [];
    return this.generateQuestion(templateId, prevList, { ...options, isReview: true });
  }

  /**
   * 変数の生成と依存計算
   *
   * V2.9.0 修正:
   * 従来の「変数ごとに最大20回リトライ」は、制約が原理的に不可能な組み合わせ
   * （例: 制約 (a%10)+(b%10)>=10 のとき、a%10==0 になると b%10 の最大値が9なので
   *   何度引き直しても成立しない）では必ず失敗し、**違反値をそのまま採用していた**。
   * 実測では g2_std_add_carry_01 で 11.7%、g2_std_sub_borrow_01 で 8.7% の問題が
   * 「くり上がりあり/くり下がりあり」の単元なのに繰り上がりの無い問題になっていた。
   *
   * 修正方針（2段構え・正常系の分布は不変）:
   *   1) まず従来ロジックで1回生成する（従来は成功していたテンプレートは 100% ここで成功し、
   *      生成分布も従来と完全に同一になる）
   *   2) 制約に違反していた場合のみ、ルール全体をまとめて引き直す（最大 MAX_ROUNDS 回）
   *      → a%10==0 などの不可能な組み合わせが自然に見除かれ、
   *        「繰り上がりの余地が大きい a が優先される」正しい分布になる
   *   3) それでも満たせないテンプレート（不変条件自体が不可能）は、従来と同じ
   *      「最後の値を返す」でフォールバックする（挙動不変＝既存テストに影響しない）
   *
   * @param {Object} generateRules テンプレートの generate 定義
   * @returns {Object} 制約を満たす変数の集合
   */
  static _generateVariables(generateRules) {
    if (!generateRules) return {};

    // 1) 従来ロジックによる1回目の生成（大半のテンプレートはここで完了する）
    const firstAttempt = this._generateVariablesOnce(generateRules);
    if (this._constraintsSatisfied(generateRules, firstAttempt)) return firstAttempt;

    // 2) 制約に違反していた場合のみ、ルール全体をまとめて引き直す
    for (let round = 0; round < MAX_VARIABLE_REDRAW_ROUNDS; round++) {
      const vars = this._generateVariablesOnce(generateRules);
      if (this._constraintsSatisfied(generateRules, vars)) return vars;
    }

    // 3) フォールバック: 従来と同じ「最後の値を返す」（挙動不変）
    return firstAttempt;
  }

  /**
   * 生成された変数の集合が、全ルールの constraints を満たしているか検証する。
   * （生成途中ではなく完成後の vars で評価するため、formula 依存の制約も正しく判定できる）
   * @param {Object} generateRules
   * @param {Object} vars
   * @returns {boolean} すべて満たすなら true
   */
  static _constraintsSatisfied(generateRules, vars) {
    if (!generateRules || !vars) return true;
    for (const varName in generateRules) {
      const rule = generateRules[varName];
      if (rule && rule.constraints && Array.isArray(rule.constraints) && rule.constraints.length > 0) {
        const scope = { ...vars, [varName]: vars[varName] };
        if (!rule.constraints.every(c => !!this._evalFormula(c, scope))) return false;
      }
    }
    return true;
  }

  /**
   * 変数生成的基础ロジック（変数単位に最大20回リトライ）。
   * _generateVariables からのみ呼び出す。
   * @param {Object} generateRules
   * @returns {Object}
   */
  static _generateVariablesOnce(generateRules) {
    if (!generateRules) return {};
    const vars = {};

    for (const varName in generateRules) {
      const rule = generateRules[varName];
      let value = null;
      let ok = false;
      let varRetries = 0;

      while (!ok && varRetries < 20) {
        varRetries++;
        if (rule.type === "integer") {
          const [min, max] = rule.range || [1, 10];
          value = Math.floor(Math.random() * (max - min + 1)) + min;
        } else if (rule.type === "choice") {
          const vals = rule.values || [];
          value = vals[Math.floor(Math.random() * vals.length)];
        } else if (rule.formula) {
          value = this._evalFormula(rule.formula, vars);
        }

        // 制約（constraints）の検証
        if (rule.constraints && Array.isArray(rule.constraints)) {
          const currentScope = { ...vars, [varName]: value };
          ok = rule.constraints.every(c => !!this._evalFormula(c, currentScope));
        } else {
          ok = true;
        }
      }

      vars[varName] = value;
    }

    return vars;
  }

  /**
   * テンプレートと変数から questionInstance を組み立てる
   */
  static _assembleInstance(template, vars, previousInstances, options) {
    const qId = `q_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

    // 問題文の選定と置換 (V2.5.12: formats 配列による複数パターン対応)
    let questionTemplateStr = template.format || "";
    if (Array.isArray(template.formats) && template.formats.length > 0) {
      const fidx = Math.floor(Math.random() * template.formats.length);
      questionTemplateStr = template.formats[fidx];
    }
    if (Array.isArray(template.sentencePatterns) && template.sentencePatterns.length > 0) {
      const idx = Math.floor(Math.random() * template.sentencePatterns.length);
      questionTemplateStr = template.sentencePatterns[idx];
    }
    const questionText = this._resolvePlaceholders(questionTemplateStr, vars);

    // 正解の評価
    let answerVal = vars.answer;
    if (typeof answerVal === "undefined" && template.answer && template.answer.expression) {
      answerVal = this._evalFormula(template.answer.expression, vars);
    }
    const answerStr = String(answerVal);

    // ヒントの置換 (2段階以上)
    const hintSteps = (template.hintSteps || []).map(h => this._resolvePlaceholders(h, vars));

    // 解説の置換
    const explanation = this._resolvePlaceholders(template.explanationTemplate || "", vars);

    // 理解確認 (understandingCheck) の組み立て
    let understandingCheck = null;
    if (template.understandingCheck && template.understandingCheck.enabled) {
      const uCheckDef = template.understandingCheck;
      const uQuestion = this._resolvePlaceholders(uCheckDef.questionTemplate, vars);
      const uAnswer = this._resolvePlaceholders(uCheckDef.answer, vars);

      // wrong1, wrong2 の生成
      let wrong1 = null;
      let wrong2 = null;

      if (uCheckDef.generateWrong) {
        const wrongScope = { ...vars, answer: Number(uAnswer) || uAnswer };
        if (uCheckDef.generateWrong.wrong1) {
          wrong1 = String(this._evalFormula(uCheckDef.generateWrong.wrong1.formula, wrongScope));
        }
        if (uCheckDef.generateWrong.wrong2) {
          wrong2 = String(this._evalFormula(uCheckDef.generateWrong.wrong2.formula, wrongScope));
        }
      }

      // フォールバック誤答生成（重複回避: 第7.4.2章）
      const numAns = parseFloat(uAnswer);
      if (wrong1 === null || wrong1 === uAnswer) {
        wrong1 = !isNaN(numAns) ? String(numAns + 1) : uAnswer + "A";
      }
      if (wrong2 === null || wrong2 === uAnswer || wrong2 === wrong1) {
        wrong2 = !isNaN(numAns) ? String(numAns > 1 ? numAns - 1 : numAns + 2) : uAnswer + "B";
      }

      // 選択肢のシャッフル
      const choices = this._shuffleArray([uAnswer, wrong1, wrong2]);

      understandingCheck = {
        enabled: true,
        type: "choice",
        question: uQuestion,
        choices: choices,
        answer: uAnswer
      };
    }

    const instance = {
      questionInstanceId: qId,
      templateId: template.templateId,
      grade: template.grade,
      difficultyLevel: template.difficultyLevel,
      unitId: template.unitId,
      conceptId: template.conceptId,
      problemType: template.problemType,
      answerType: template.answerType || "number_input",
      variables: vars,
      questionText: questionText,
      answer: answerStr,
      hintSteps: hintSteps,
      explanation: explanation,
      understandingCheck: understandingCheck,
      isReview: !!options.isReview,
      isFallback: !!options.isFallback,
      commutativePairs: Array.isArray(template.commutativePairs) ? template.commutativePairs : null,
      // V2.6.12: DiversitySelector の多様性判定 (story系 Level 1〜3) に必要なメタ情報を伝搬
      story: template.story || null,
      variationGroupId: template.variationGroupId || null,
      similarityGroupId: template.similarityGroupId || template.templateId
    };

    if (template.templateId === "g2_basic_box_04") {
      const g2 = (typeof globalThis !== "undefined" && globalThis.FigureShapeUI_G2)
        ? globalThis.FigureShapeUI_G2
        : null;
      if (g2 && typeof g2.renderBoxNetChoices === "function") {
        instance.figureHTML = g2.renderBoxNetChoices([vars.net1, vars.net2, vars.net3]);
      }
    }

    // V2.6.3: 図形テンプレート (figure) → 図+文カード選択肢を生成して付与
    // V2.6.4: g2_shape_* は FigureShapeUI_G2、それ以外は FigureShapeUI (G1)
    // V2.8.0: 「図を出す」だけのテンプレート (figure_tap / figure_display) は
    // カード選択の設問ではないため、buildProblem を経由させない。
    // 此前は problemType だけで判定していたため、G3の figure_tap が
    // FigureShapeUI.buildProblem に落ち、設問文と選択肢がG1のカード問題に
    // 上書きされていた（angle_right_vertex すら「おおきいほうをえらびましょう」になっていた）。
    const isCardChoice = (template.answerType === "single_choice" || template.answerType === "multi_choice");
    if (template.problemType === "figure" && isCardChoice) {
      const g = (typeof globalThis !== "undefined") ? globalThis : null;
      const isG2 = typeof template.templateId === "string" && template.templateId.indexOf("g2_") === 0;
      const figUI = (g && isG2 && g.FigureShapeUI_G2 && typeof g.FigureShapeUI_G2.buildProblem === "function")
        ? g.FigureShapeUI_G2
        : ((g && g.FigureShapeUI) || null);
      if (figUI && typeof figUI.buildProblem === "function") {
        const fig = figUI.buildProblem(template, vars);
        if (fig && Array.isArray(fig.figureChoices) && fig.figureChoices.length > 0) {
          instance.questionText = fig.questionText || instance.questionText;
          instance.figureChoices = fig.figureChoices;
          instance.correctChoiceIds = fig.correctChoiceIds;
          instance.answer = String(fig.answer);
          if (fig.vars) Object.assign(instance.variables, fig.vars);
        }
      }
    }

    // V2.7.0: 図形タップ問題 (answerType: "figure_tap")
    // 表示は FigureSVG に委譲し、タップできる部品と正解IDを付与する
    if (template.answerType === "figure_tap" && template.figureSpec) {
      const fig = (typeof globalThis !== "undefined" && globalThis.FigureSVG) ? globalThis.FigureSVG
        : ((typeof window !== "undefined" && window.FigureSVG) ? window.FigureSVG : null);
      if (fig && typeof fig.buildDisplay === "function") {
        const disp = fig.buildDisplay(template.figureSpec, vars);
        if (disp) {
          instance.figureHTML = disp.figureHTML;
          instance.figureSpec = disp.figureSpec;
          instance.figureParts = disp.figureParts;
          instance.correctPartIds = disp.correctPartIds;
          instance.partLabels = disp.partLabels;
          instance.answer = String(disp.answer);
        }
      }
    }

    // V2.8.0: 図＋数値入力問題 (answerType: "figure_display")
    // 図は表示するだけでタップ部品は作らない。figureParts / figureChoices を持たないので
    // UI は naturally に numpad へフォールスルーし、currentInput を回答として扱う。
    if (template.answerType === "figure_display" && template.figureSpec) {
      const fig = (typeof globalThis !== "undefined" && globalThis.FigureSVG) ? globalThis.FigureSVG
        : ((typeof window !== "undefined" && window.FigureSVG) ? window.FigureSVG : null);
      if (fig && typeof fig.render === "function") {
        const base = JSON.parse(JSON.stringify(template.figureSpec));
        // 変数を spec へ埋め込む（{n}cm のようなラベルにも使える）
        const filled = typeof fig.fillSpecVars === "function" ? fig.fillSpecVars(base, vars) : base;
        // 数値フィールドは文字列 "{sides}" のまま描画できないため数値へ変換する
        ["sides", "radius", "pxPerUnit", "rotate", "w", "h"].forEach(k => {
          if (typeof filled[k] === "string") {
            const n = Number(filled[k]);
            if (Number.isFinite(n)) filled[k] = n;
          }
        });
        const spec = typeof fig.varySpec === "function" ? fig.varySpec(filled, vars) : filled;
        const html = fig.render(spec, { size: spec.sizeName || "large" });
        // 描画に失敗した spec（NaN 座標など）は出題しない
        if (typeof html === "string" && html.indexOf("<svg") >= 0 && html.indexOf("NaN") < 0) {
          instance.figureHTML = html;
          instance.figureSpec = spec;
          instance.figureAnswerUnit = template.figureAnswerUnit || "";
        }
      }
    }

    // V2.6.7: 時計テンプレート (answerType: "clock_input") → 時計図 + 分離入力欄の定義を付与
    // 表示は ClockSVG 共通部品に委譲する (2年生以降で共通利用)
    if (template.answerType === "clock_input" && template.clockSpec) {
      const clock = (typeof globalThis !== "undefined" && globalThis.ClockSVG)
        ? globalThis.ClockSVG
        : ((typeof window !== "undefined" && window.ClockSVG) ? window.ClockSVG : null);
      if (clock && typeof clock.buildDisplay === "function") {
        const disp = clock.buildDisplay(template.clockSpec, vars);
        instance.clockHTML = disp.clockHTML;
        instance.clockFormat = disp.format;
        instance.clockFields = disp.fields;
        instance.clockSpec = template.clockSpec;
        instance.clockAnswerLabel = (typeof clock.answerLabel === "function")
          ? clock.answerLabel(disp.answer, disp.format)
          : String(disp.answer);
        instance.answer = String(disp.answer);
      }
    }

    // V2.9.0: 筆算テンプレート (hissanSpec) → 筆算図 + 段階表示の3点を付与
    // answerType は変更しない（既存问答フローはそのまま数値入力のまま維持する）。
    // 判定は answerType ではなく hissanSpec の有無で行うことで、
    // 既存の number_input テンプレと衝突しない。
    if (template.hissanSpec) {
      const hissan = (typeof globalThis !== "undefined" && globalThis.HissanSVG)
        ? globalThis.HissanSVG
        : ((typeof window !== "undefined" && window.HissanSVG) ? window.HissanSVG : null);
      if (hissan && typeof hissan.buildDisplay === "function") {
        const disp = hissan.buildDisplay(template.hissanSpec, vars);
        if (typeof disp.hissanHTML === "string" && disp.hissanHTML.indexOf("<svg") >= 0 && disp.hissanHTML.indexOf("NaN") < 0) {
          instance.hissanHTML = disp.hissanHTML;
          instance.hissanHintHTML = disp.hissanHintHTML;
          instance.hissanSolutionHTML = disp.hissanSolutionHTML;
          instance.hissanOp = disp.op;
          instance.hissanSpec = template.hissanSpec;
          instance.hissanAnswerText = disp.answerText;
        }
      }
    }

    return instance;
  }

  /**
   * 安全なフォールバック問題生成 (第7.22章)
   */
  static _fallback(template, previousInstances, options) {
    const reg = TemplateRegistryRef || (typeof window !== "undefined" ? window.TemplateRegistry : null);
    if (!reg) throw new Error("TemplateRegistry unavailable for fallback.");

    // V2.6.6: 兄弟テンプレートへのフォールバックは1段のみ許可する。
    // (変数空間が小さい単元では兄弟同士が互いを呼び続けて無限再帰になるため)
    if (!options || !options._isFallbackSibling) {
      // 同一unitの別テンプレートを検索
      const siblingTemplates = reg.getByUnit("math", template.grade, template.difficultyLevel, template.unitId)
        .filter(t => t.templateId !== template.templateId);

      if (siblingTemplates.length > 0) {
        return this.generateQuestion(siblingTemplates[0].templateId, previousInstances, {
          ...options, maxRetries: 2, _isFallbackSibling: true
        });
      }
    }

    // 最後の手段: 最小限の静的置換
    const vars = this._generateVariables(template.generate);
    return this._assembleInstance(template, vars, [], { ...options, isFallback: true });
  }

  static _resolvePlaceholders(str, vars) {
    if (!str || typeof str !== "string") return "";
    return str.replace(/\{([^{}]+)\}/g, (match, expr) => {
      const trimmed = expr.trim();
      if (typeof vars[trimmed] !== "undefined") {
        return vars[trimmed];
      }
      // 式として評価
      try {
        const val = this._evalFormula(trimmed, vars);
        return typeof val !== "undefined" ? val : match;
      } catch (e) {
        return match;
      }
    });
  }

  static _evalFormula(expr, scope) {
    try {
      const fn = new Function(...Object.keys(scope), `return (${expr});`);
      const result = fn(...Object.values(scope));
      // V2.5.13: 浮動小数点誤差の除去 (例: 1.1 + 0.6 = 1.7000000000000002 → 1.7)
      return this._cleanNumber(result);
    } catch (e) {
      console.warn(`Formula eval failed for '${expr}':`, e.message);
      return undefined;
    }
  }

  /**
   * 浮動小数点の丸め誤差を除去する (V2.5.13)
   * 2進浮動小数点の累積誤差 (例: 0.30000000000000004, 1.7000000000000002) を
   * 10桁精度で丸めて除去する。意図した有効小数 (小数第10位より上) は保持される。
   * 例: 1.7000000000000002 → 1.7 / 0.30000000000000004 → 0.3 / 2.675 → 2.675
   * @param {*} value 任意の評価結果 (数値以外はそのまま返す)
   * @returns {*}
   */
  static _cleanNumber(value) {
    // 極大値 (|v| >= 1e9) は 1e10 倍で精度劣化するため整数としてそのまま返す
    if (typeof value === "number" && Number.isFinite(value) && Math.abs(value) < 1e9) {
      return Math.round(value * 1e10) / 1e10;
    }
    return value;
  }

  static _shuffleArray(array) {
    const a = [...array];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  static _getTemplate(templateId) {
    const reg = TemplateRegistryRef || (typeof window !== "undefined" ? window.TemplateRegistry : null);
    return reg ? reg.get(templateId) : null;
  }
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    MAX_GENERATION_RETRY,
    RuleBasedQuestionSource
  };
} else {
  window.MAX_GENERATION_RETRY = MAX_GENERATION_RETRY;
  window.RuleBasedQuestionSource = RuleBasedQuestionSource;
}
