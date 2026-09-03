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
}

const MAX_GENERATION_RETRY = 5;

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
   */
  static _generateVariables(generateRules) {
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

    // 問題文の選定と置換
    let questionTemplateStr = template.format || "";
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

    return {
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
      isFallback: !!options.isFallback
    };
  }

  /**
   * 安全なフォールバック問題生成 (第7.22章)
   */
  static _fallback(template, previousInstances, options) {
    const reg = TemplateRegistryRef || (typeof window !== "undefined" ? window.TemplateRegistry : null);
    if (!reg) throw new Error("TemplateRegistry unavailable for fallback.");

    // 同一unitの別テンプレートを検索
    const siblingTemplates = reg.getByUnit("math", template.grade, template.difficultyLevel, template.unitId)
      .filter(t => t.templateId !== template.templateId);

    if (siblingTemplates.length > 0) {
      return this.generateQuestion(siblingTemplates[0].templateId, previousInstances, { ...options, maxRetries: 2 });
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
      return fn(...Object.values(scope));
    } catch (e) {
      console.warn(`Formula eval failed for '${expr}':`, e.message);
      return undefined;
    }
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
