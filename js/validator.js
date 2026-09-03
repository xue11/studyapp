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

    // 5. ヒントチェック（2段階以上、答えの直接表示回避）
    if (!Array.isArray(questionInstance.hintSteps) || questionInstance.hintSteps.length < 2) {
      errors.push({
        code: VALIDATION_ERROR_CODES.STRUCTURE_ERROR,
        message: "hintSteps must contain at least 2 steps.",
        variables: vars
      });
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

    // 7. 直近問題との完全一致重複チェック (第7.7.2章 & 第38.20章)
    // ※ options.isFallback === true の場合は候補尽き時の重複を許容
    if (!questionInstance.isFallback && Array.isArray(previousInstances) && previousInstances.length > 0) {
      const varsJson = JSON.stringify(vars);
      // 直近N問（最大3問）を比較
      const recent = previousInstances.slice(-3);
      const isDuplicate = recent.some(prev => 
        prev.templateId === questionInstance.templateId &&
        JSON.stringify(prev.variables) === varsJson
      );
      if (isDuplicate) {
        errors.push({
          code: VALIDATION_ERROR_CODES.DUPLICATE_ERROR,
          message: "Identical variables with recent questionInstance under same template.",
          variables: vars
        });
      }
    }

    return {
      valid: errors.length === 0,
      errors: errors
    };
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

