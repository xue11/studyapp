/**
 * SessionCoordinator Layer
 * V2.5.10 詳細設計書 第34章 準拠
 * 
 * - 1問完了時の確定順序 (ステップ 1〜14) の原子的実行
 * - メモリ上での nextState 整合性検証
 * - 中間状態を永続化せず、1回の saveState で保存
 */

// Node.js / ブラウザ環境のモジュール解決
let LearningScoreEngineModule = typeof window !== "undefined" ? window.LearningScoreEngine : null;
let LearningEngineModule = typeof window !== "undefined" ? window.LearningEngine : null;
let ReviewEngineModule = typeof window !== "undefined" ? window.ReviewEngine : null;
let LevelEngineModule = typeof window !== "undefined" ? window.LevelEngine : null;
let PointEngineModule = typeof window !== "undefined" ? window.PointEngine : null;
let CharacterEngineModule = typeof window !== "undefined" ? window.CharacterEngine : null;
let BadgeEngineModule = typeof window !== "undefined" ? window.BadgeEngine : null;
let StorageModule = typeof window !== "undefined" ? window : null;

if (typeof require !== "undefined") {
  try { LearningScoreEngineModule = require("./learning_score_engine.js").LearningScoreEngine; } catch (e) {}
  try { LearningEngineModule = require("./learning_engine.js").LearningEngine; } catch (e) {}
  try { ReviewEngineModule = require("./review_engine.js").ReviewEngine; } catch (e) {}
  try { LevelEngineModule = require("./level_engine.js").LevelEngine; } catch (e) {}
  const gModule = require("./gamification_engine.js");
  PointEngineModule = gModule.PointEngine;
  CharacterEngineModule = gModule.CharacterEngine;
  BadgeEngineModule = gModule.BadgeEngine;
  StorageModule = require("./storage.js");
}

class SessionCoordinator {
  /**
   * 1問の回答完了処理を原子的に実行し、Stateを保存する (第34章)
   * @param {Object} params
   *   - appState: 全体のアプリケーションState
   *   - questionInstance: 出題された問題
   *   - answerResult: { correct: boolean, attemptCount: number, hintUsed: boolean, understandingCheckResult?: string }
   *   - config: 設定オブジェクト (APP_CONFIG)
   *   - storageManager: StorageManager インスタンス
   *   - localDateString: 日付文字列 (YYYY-MM-DD)
   * @returns {Object} { success: boolean, nextState: Object, summary: Object, error?: string }
   */
  static completeQuestionAtomic({
    appState,
    questionInstance,
    answerResult,
    config = null,
    storageManager = null,
    localDateString = null
  }) {
    try {
      // 0. 深いコピーで nextState を作成（中間状態の破損を防止）
      const nextState = JSON.parse(JSON.stringify(appState));
      const today = localDateString || new Date().toISOString().split("T")[0];

      const profile = nextState.profiles.find(p => p.identity.id === nextState.activeProfileId);
      if (!profile) {
        throw new Error(`SessionCoordinator: Active profile ${nextState.activeProfileId} not found.`);
      }

      const currentGrade = profile.skill.subject.currentGrade;
      const gradeKey = `grade${currentGrade}`;
      const gradeProgress = profile.skill.subject.gradeProgress[gradeKey];
      const unitId = questionInstance.unitId;

      // 1. 回答結果・attemptCount確定
      const isCorrect = !!answerResult.correct;
      const attemptCount = Math.min(3, Math.max(1, answerResult.attemptCount || 1));
      const hintUsed = !!answerResult.hintUsed;

      // 2 & 3 & 4. LearningScoreEngine で learningScore 確定
      const learningScore = LearningScoreEngineModule.calculateScore({
        correct: isCorrect,
        attemptCount: attemptCount,
        hintUsed: hintUsed,
        completed: true
      });

      // 5. unitStats 更新 (attempts + 1, correct, accuracy, masteryScore)
      const currentUnitStats = gradeProgress.unitStats[unitId] || null;
      const updatedUnitStats = LearningEngineModule.updateUnitStats(currentUnitStats, learningScore, isCorrect);
      gradeProgress.unitStats[unitId] = updatedUnitStats;

      // 6. learningStartDate 更新 (初回到達時)
      LearningEngineModule.ensureLearningStartDate(gradeProgress, today);

      // 7. reviewQueue 更新 (復習登録トリガー判定)
      let reviewResult = null;
      if (questionInstance.isReview) {
        // 復習問題として出題されていた場合のキュー更新
        const reviewItem = profile.reviewQueue.find(r => r.unitId === unitId && r.grade === currentGrade && r.status === "active");
        if (reviewItem) {
          ReviewEngineModule.processReviewResult(reviewItem, isCorrect, config, today);
        }
      } else {
        // 通常問題の場合の復習登録トリガー評価
        // トリガーA: 3回目不正解
        // トリガーB: attempts >= 5 かつ masteryScore < 0.50
        const weakMinAttempts = config?.math?.reviewEngine?.weakMinAttempts ?? 5;
        const weakMasteryThreshold = config?.math?.reviewEngine?.weakMasteryThreshold ?? 0.50;

        if (!isCorrect && attemptCount === 3) {
          reviewResult = ReviewEngineModule.registerForReview(profile, {
            subjectId: "math",
            grade: currentGrade,
            unitId: unitId,
            conceptId: questionInstance.conceptId,
            templateId: questionInstance.templateId,
            sourceQuestionId: questionInstance.questionInstanceId
          }, today);
        } else if (updatedUnitStats.attempts >= weakMinAttempts && updatedUnitStats.masteryScore < weakMasteryThreshold) {
          reviewResult = ReviewEngineModule.registerForReview(profile, {
            subjectId: "math",
            grade: currentGrade,
            unitId: unitId,
            conceptId: questionInstance.conceptId,
            templateId: questionInstance.templateId,
            sourceQuestionId: questionInstance.questionInstanceId
          }, today);
        }
      }

      // 8. ストリーク更新
      if (isCorrect) {
        profile.streaks.correctStreak = (profile.streaks.correctStreak || 0) + 1;
        if (profile.streaks.correctStreak > (profile.streaks.bestStreak || 0)) {
          profile.streaks.bestStreak = profile.streaks.correctStreak;
        }
      } else {
        profile.streaks.correctStreak = 0;
      }

      // 8b. 連続学習日数 (dailyStreak) 更新 (V2.5.15: 通常学習1問完了で更新・テスト完了も別途)
      if (LearningEngineModule && LearningEngineModule.updateDailyStreak) {
        LearningEngineModule.updateDailyStreak(profile, today);
      }

      // 9. ポイント計算
      const pointsEarned = PointEngineModule.calculateRegularPoints({
        isCorrect: isCorrect,
        difficultyLevel: gradeProgress.difficultyLevel,
        updatedCorrectStreak: profile.streaks.correctStreak,
        config: config
      });
      profile.points.total = (profile.points.total || 0) + pointsEarned;

      // 10. 履歴追加 (第30章: pointsEarned を含む)
      const historyRecord = {
        questionInstanceId: questionInstance.questionInstanceId,
        templateId: questionInstance.templateId,
        subjectId: "math",
        grade: currentGrade,
        unitId: unitId,
        conceptId: questionInstance.conceptId,
        completedAt: new Date().toISOString(),
        correct: isCorrect,
        attemptCount: attemptCount,
        usedHint: hintUsed,
        learningScore: learningScore,
        pointsEarned: pointsEarned
      };
      profile.history.push(historyRecord);

      // 11 & 13. 達成レベル・キャラクター成長判定
      profile.points.achievementLevel = CharacterEngineModule.calculateAchievementLevel(profile.points.total, config);

      // 12. バッジ判定
      const unlockedBadges = BadgeEngineModule.evaluateBadges(profile);

      // 14. スキルレベル判定 (LevelEngine)
      const levelEval = LevelEngineModule.evaluateLevel(profile, config);

      // 15. ストレージへの原子的保存
      if (storageManager) {
        const saveRes = storageManager.saveState(nextState);
        if (!saveRes.success) {
          return {
            success: false,
            error: `Failed to persist state: ${saveRes.error}`,
            nextState: null,
            summary: null
          };
        }
      }

      return {
        success: true,
        nextState: nextState,
        summary: {
          learningScore,
          pointsEarned,
          updatedStreak: profile.streaks.correctStreak,
          unitMastery: updatedUnitStats.masteryScore,
          unlockedBadges,
          levelEvaluation: levelEval,
          reviewRegistered: !!(reviewResult && reviewResult.registered)
        }
      };

    } catch (err) {
      console.error("SessionCoordinator.completeQuestionAtomic error:", err);
      return {
        success: false,
        error: err.message,
        nextState: null,
        summary: null
      };
    }
  }
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { SessionCoordinator };
} else {
  window.SessionCoordinator = SessionCoordinator;
}

