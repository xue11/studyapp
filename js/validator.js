/**
 * QuestionValidator Layer
 * V2.5.10 詳細設計書 第10章・第38.19章・第38.25.7章 準拠
 * 
 * - 出題前の全questionInstance検証
 * - 表示安全性 (NaN / undefined / Infinity / 未置換placeholder)
 * - ゼロ除算・数学的一意性・教育的難易度
 * - 誤答選択肢 (wrong1 !== wrong2 !== answer)
 * - エラーコード分類
 */

const VALIDATION_ERROR_CODES = {
  STRUCTURE_ERROR: "STRUCTURE_ERROR",
  VARIABLE_ERROR: "VARIABLE_ERROR",
  CALCULATION_ERROR: "CALCULATION_ERROR",
  RANGE_ERROR: "RANGE_ERROR",
  ANSWER_ERROR: "ANSWER_ERROR",
  TEXT_ERROR: "TEXT_ERROR",
  EDUCATIONAL_LEVEL_ERROR: "EDUCATIONAL_LEVEL_ERROR",
  DUPLICATE_ERROR: "DUPLICATE_ERROR"
};

class QuestionValidator {
  /**
   * 生成された questionInstance を検証する
   * @param {Object} questionInstance 
   * @param {Object} previousInstances (重複判定用)
   * @returns {{ valid: boolean, errors: Array<{ code: string, message: string, variables?: Object }> }}
   */
  static validate(questionInstance, previousInstances = []) {
    const errors = [];

    if (!questionInstance || typeof questionInstance !== "object") {
      return {
        valid: false,
        errors: [{ code: VALIDATION_ERROR_CODES.STRUCTURE_ERROR, message: "questionInstance must be a non-null object." }]
      };
    }

    // 1. 構造チェック (第10.1章)
    const requiredFields = [
      "questionInstanceId", "templateId", "grade", "difficultyLevel",
      "unitId", "conceptId", "problemType", "answerType", "variables",
      "questionText", "answer", "hintSteps", "explanation"
    ];

    // V2.6.3 図形テンプレート: figureChoices + correctChoiceIds を持つ選択肢問題
    const isFigureChoice = questionInstance.answerType === "single_choice" ||
      questionInstance.answerType === "multi_choice";

    for (const field of requiredFields) {
      if (typeof questionInstance[field] === "undefined" || questionInstance[field] === null) {
        errors.push({
          code: VALIDATION_ERROR_CODES.STRUCTURE_ERROR,
          message: `Missing required field: ${field}`,
          variables: questionInstance.variables
        });
      }
    }

    // 2. 表示安全性チェック (第10.1章 & 第38.25.7章: NaN / undefined / Infinity / 未置換プレースホルダー)
    const textToCheck = [
      questionInstance.questionText,
      questionInstance.explanation,
      ...(Array.isArray(questionInstance.hintSteps) ? questionInstance.hintSteps : [])
    ];

    for (const text of textToCheck) {
      if (typeof text === "string") {
        if (/\{[a-zA-Z0-9_]+\}/.test(text)) {
          errors.push({
            code: VALIDATION_ERROR_CODES.TEXT_ERROR,
            message: `Unresolved placeholder found in text: "${text}"`,
            variables: questionInstance.variables
          });
        }
        if (text.includes("NaN") || text.includes("undefined") || text.includes("Infinity")) {
          errors.push({
            code: VALIDATION_ERROR_CODES.CALCULATION_ERROR,
            message: `Invalid numerical string (NaN/undefined/Infinity) found in text: "${text}"`,
            variables: questionInstance.variables
          });
        }
      }
    }

    // 3. 数学・計算・ゼロ除算チェック
    const vars = questionInstance.variables || {};
    for (const key in vars) {
      const val = vars[key];
      if (typeof val === "number") {
        if (isNaN(val) || !isFinite(val)) {
          errors.push({
            code: VALIDATION_ERROR_CODES.VARIABLE_ERROR,
            message: `Variable ${key} is NaN or non-finite.`,
            variables: vars
          });
        }
      }
    }

    // わり算のゼロ除算チェック (÷ 0)
    if (questionInstance.questionText && questionInstance.questionText.includes("÷ 0")) {
      errors.push({
        code: VALIDATION_ERROR_CODES.CALCULATION_ERROR,
        message: "Division by zero detected in questionText.",
        variables: vars
      });
    }

    // 4. 正解（answer）チェック
    if (questionInstance.answer === null || typeof questionInstance.answer === "undefined" || questionInstance.answer === "") {
      errors.push({
        code: VALIDATION_ERROR_CODES.ANSWER_ERROR,
        message: "Answer is empty or undefined.",
        variables: vars
      });
    }

    // 4-1. V2.9.5: 数値入力問題の答えは 0 以上であること
    //
    // 回答は画面上の数字テンキー（「−」キーなし）で行うため、負の答えは入力不可能で
    // 必ず3回不正解になり、復習キューと弱点単元のデータが汚染される。
    // テンプレ側の generate 制約漏れを自動検出するため、Validator で体系的に弾く。
    //
    // 入力がテンキーになる回答形式:
    //   number_input  … 常にテンキー
    //   figure_display … 図を表示するが回答は数値（テンキーへフォールスルー）
    if (questionInstance.answerType === "number_input" ||
        questionInstance.answerType === "figure_display") {
      const numericAnswer = Number(questionInstance.answer);
      if (!Number.isNaN(numericAnswer) && numericAnswer < 0) {
        errors.push({
          code: VALIDATION_ERROR_CODES.ANSWER_ERROR,
          message: `Answer must be non-negative for numeric keypad input (got ${questionInstance.answer}).`,
          variables: vars
        });
      }
    }

    // 5. ヒントチェック（2段階以上、答えの直接表示回避）
    if (!Array.isArray(questionInstance.hintSteps) || questionInstance.hintSteps.length < 2) {
      errors.push({
        code: VALIDATION_ERROR_CODES.STRUCTURE_ERROR,
        message: "hintSteps must contain at least 2 steps.",
        variables: vars
      });
    }

    // V2.6.3 図形選択肢の構造チェック (figureChoices + correctChoiceIds の整合性)
    if (isFigureChoice) {
      const fc = questionInstance.figureChoices;
      const cc = questionInstance.correctChoiceIds;
      if (!Array.isArray(fc) || fc.length < 2) {
        errors.push({
          code: VALIDATION_ERROR_CODES.STRUCTURE_ERROR,
          message: "figureChoices must be an array with at least 2 choices.",
          variables: vars
        });
      } else {
        for (const c of fc) {
          if (!c || typeof c.id !== "string" || !c.figure || typeof c.figure.type !== "string" || typeof c.text !== "string") {
            errors.push({
              code: VALIDATION_ERROR_CODES.STRUCTURE_ERROR,
              message: "Each figureChoice must have { id, figure: { type }, text }.",
              variables: vars
            });
            break;
          }
        }
        const ids = fc.map(c => c.id);
        if (new Set(ids).size !== ids.length) {
          errors.push({
            code: VALIDATION_ERROR_CODES.ANSWER_ERROR,
            message: "figureChoices contain duplicate ids.",
            variables: vars
          });
        }
        if (!Array.isArray(cc) || cc.length === 0 || !cc.every(id => ids.includes(id))) {
          errors.push({
            code: VALIDATION_ERROR_CODES.ANSWER_ERROR,
            message: "correctChoiceIds must be a non-empty subset of figureChoices ids.",
            variables: vars
          });
        }
        if (questionInstance.answerType === "single_choice" && Array.isArray(cc) && cc.length !== 1) {
          errors.push({
            code: VALIDATION_ERROR_CODES.ANSWER_ERROR,
            message: "single_choice must have exactly one correctChoiceId.",
            variables: vars
          });
        }
      }
    }

    // V2.7.0: figure_tap (図の部品をタップして答える) の構造チェック
    //   figureParts: タップできる部品 [{id, kind, label}]
    //   correctPartIds: 正解の部品ID（answerType が single でも配列で持つ）
    if (questionInstance.answerType === "figure_tap") {
      const parts = questionInstance.figureParts;
      const correctIds = questionInstance.correctPartIds;
      if (!Array.isArray(parts) || parts.length < 2) {
        errors.push({
          code: VALIDATION_ERROR_CODES.STRUCTURE_ERROR,
          message: "figureParts must be an array with at least 2 parts.",
          variables: vars
        });
      } else {
        for (const p of parts) {
          if (!p || typeof p.id !== "string" || typeof p.kind !== "string" || typeof p.label !== "string") {
            errors.push({
              code: VALIDATION_ERROR_CODES.STRUCTURE_ERROR,
              message: "Each figurePart must have { id, kind, label } as strings.",
              variables: vars
            });
            break;
          }
        }
        const pIds = parts.map(p => p.id);
        if (new Set(pIds).size !== pIds.length) {
          errors.push({
            code: VALIDATION_ERROR_CODES.ANSWER_ERROR,
            message: "figureParts contain duplicate ids.",
            variables: vars
          });
        }
        if (!Array.isArray(correctIds) || correctIds.length === 0 || !correctIds.every(id => pIds.includes(id))) {
          errors.push({
            code: VALIDATION_ERROR_CODES.ANSWER_ERROR,
            message: "correctPartIds must be a non-empty subset of figureParts ids.",
            variables: vars
          });
        } else {
          const norm = list => list.map(s => String(s).trim()).filter(s => s.length > 0).sort().join(",");
          if (norm(String(questionInstance.answer).split(",")) !== norm(correctIds)) {
            errors.push({
              code: VALIDATION_ERROR_CODES.ANSWER_ERROR,
              message: "answer must equal correctPartIds (comma separated).",
              variables: vars
            });
          }
        }
      }
    }

    // V2.8.0: figure_display (図を見て数値で答える) の構造チェック
    //   図は表示のみ。figureParts / figureChoices を持たないことが契約で、
    //   回答は answer の数値（テンキー入力）をそのまま使う。
    if (questionInstance.answerType === "figure_display") {
      const html = questionInstance.figureHTML;
      if (typeof html !== "string" || html.indexOf("<svg") < 0) {
        errors.push({
          code: VALIDATION_ERROR_CODES.STRUCTURE_ERROR,
          message: "figure_display must provide figureHTML containing an <svg> element.",
          variables: vars
        });
      } else if (html.indexOf("NaN") >= 0 || html.indexOf("undefined") >= 0) {
        errors.push({
          code: VALIDATION_ERROR_CODES.CALCULATION_ERROR,
          message: "figureHTML contains NaN/undefined in the rendered figure.",
          variables: vars
        });
      }
      if (questionInstance.figureParts || questionInstance.figureChoices) {
        errors.push({
          code: VALIDATION_ERROR_CODES.STRUCTURE_ERROR,
          message: "figure_display must not define figureParts/figureChoices (numeric input expected).",
          variables: vars
        });
      }
      // 回答は数値として解釈できること（図を見て「いくつ？」に答えるため）
      if (String(questionInstance.answer).trim() === "" || isNaN(Number(questionInstance.answer))) {
        errors.push({
          code: VALIDATION_ERROR_CODES.ANSWER_ERROR,
          message: "figure_display answer must be a number.",
          variables: vars
        });
      }
    }

    // 6. understandingCheck チェック (有効な場合)
    const check = questionInstance.understandingCheck;
    if (check && check.enabled) {
      if (!check.question || !Array.isArray(check.choices) || check.choices.length < 2 || !check.answer) {
        errors.push({
          code: VALIDATION_ERROR_CODES.STRUCTURE_ERROR,
          message: "understandingCheck has invalid structure.",
          variables: vars
        });
      } else {
        // 選択肢の重複チェック (wrong1 !== wrong2 !== answer)
        const choiceSet = new Set(check.choices);
        if (choiceSet.size !== check.choices.length) {
          errors.push({
            code: VALIDATION_ERROR_CODES.ANSWER_ERROR,
            message: "understandingCheck choices contain duplicates.",
            variables: vars
          });
        }
        if (!choiceSet.has(check.answer)) {
          errors.push({
            code: VALIDATION_ERROR_CODES.ANSWER_ERROR,
            message: "understandingCheck choices do not include the correct answer.",
            variables: vars
          });
        }
      }
    }

    // 7. 直近問題との重複チェック (第7.7.2章 & 第38.20章)
    // V2.5.12 強化:
    //  - 判定範囲を直近10問(10問セッション全体)へ拡大
    //  - commutativePairs 宣言がある加算・乗算では可換正規化により
    //    「1+2」と「2+1」を同一と判定して重複を防止 (生成の多様性は維持)
    // ※ options.isFallback === true の場合は候補尽き時の重複を許容
    if (!questionInstance.isFallback && Array.isArray(previousInstances) && previousInstances.length > 0) {
      const varsJson = this._canonicalVarsJson(vars, questionInstance.commutativePairs);
      // 直近N問（最大10問 = セッション全体）を比較
      const recent = previousInstances.slice(-10);
      const isDuplicate = recent.some(prev =>
        prev.templateId === questionInstance.templateId &&
        this._canonicalVarsJson(prev.variables, questionInstance.commutativePairs) === varsJson
      );
      if (isDuplicate) {
        errors.push({
          code: VALIDATION_ERROR_CODES.DUPLICATE_ERROR,
          message: "Identical variables (or commutative-equivalent) with recent questionInstance under same template.",
          variables: vars
        });
      }
    }

    return {
      valid: errors.length === 0,
      errors: errors
    };
  }

  /**
   * 可換ペア（commutativePairs）を考慮した変数の正規化 JSON を返す
   * 例: "a + b" のテンプレートで {a:1, b:2} と {a:2, b:1} を同一扱いにする
   * @param {Object} vars
   * @param {Array<Array<string>>|null} commutativePairs
   * @returns {string}
   */
  static _canonicalVarsJson(vars, commutativePairs) {
    if (!vars || typeof vars !== "object") return "{}";
    const copy = { ...vars };
    if (Array.isArray(commutativePairs)) {
      for (const pair of commutativePairs) {
        if (!Array.isArray(pair) || pair.length !== 2) continue;
        const [k1, k2] = pair;
        const v1 = copy[k1];
        const v2 = copy[k2];
        if (typeof v1 === "number" && typeof v2 === "number" && v1 > v2) {
          copy[k1] = v2;
          copy[k2] = v1;
        }
      }
    }
    return JSON.stringify(copy);
  }
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    VALIDATION_ERROR_CODES,
    QuestionValidator
  };
} else {
  window.VALIDATION_ERROR_CODES = VALIDATION_ERROR_CODES;
  window.QuestionValidator = QuestionValidator;
}

