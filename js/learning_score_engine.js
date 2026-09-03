/**
 * LearningScoreEngine Layer
 * V2.5.10 詳細設計書 第12章 準拠
 * 
 * - 1問につき1つの learningScore を確定
 * - 初回正解 = 1.0
 * - 再回答正解（ヒント未使用） = 0.7
 * - ヒント使用後正解 = 0.5（再回答と同時成立時は 0.5 を最優先）
 * - 最終不正解（3回終了） = 0.0
 * - PointEngine / understandingCheck とは完全に分離
 */

class LearningScoreEngine {
  /**
   * AnswerResult から 1問の learningScore を算出する
   * @param {Object} answerResult
   *   - correct: boolean (questionInstance全体として正解に到達したか)
   *   - attemptCount: number (実回答回数 1〜3)
   *   - hintUsed: boolean (ヒントを使用したか)
   *   - completed: boolean (完了フラグ)
   * @returns {number} learningScore (1.0, 0.7, 0.5, 0.0)
   */
  static calculateScore(answerResult) {
    if (!answerResult || typeof answerResult !== "object") {
      throw new Error("LearningScoreEngine: answerResult must be a non-null object.");
    }

    const { correct, attemptCount, hintUsed } = answerResult;

    // 最終的に正解しなかった場合 (3回目終了)
    if (!correct) {
      return 0.0;
    }

    // ① 初回回答で正解
    if (attemptCount === 1 && !hintUsed) {
      return 1.0;
    }

    // ② 初回回答では不正解で、ヒント使用後に正解 (2回目・3回目のいずれでも 0.5 優先)
    // または初回でヒントを見て正解した場合も 0.5
    if (hintUsed) {
      return 0.5;
    }

    // ③ ヒントを使用せず、再回答で正解 (attemptCount === 2 または 3)
    if (attemptCount > 1 && !hintUsed) {
      return 0.7;
    }

    return 0.0;
  }
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { LearningScoreEngine };
} else {
  window.LearningScoreEngine = LearningScoreEngine;
}

