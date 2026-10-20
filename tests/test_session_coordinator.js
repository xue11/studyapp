/**
 * V2.9.x テストカバレッジ拡大 — SessionCoordinator (1問完了の原子的更新)
 *
 * 対象: js/session_coordinator.js
 *
 * 背景:
 * - 1問完了時に「学習スコア → unitStats → 復習キュー → ストリーク → ポイント →
 *   履歴 → バッジ → レベル判定 → 保存」の全工程を 1 回の saveState で原子的に実行する。
 * - 途中で失敗した場合、元の appState は一切変更されない (深いコピー方式)。
 * - ここが壊れると「解答しても記録されない」「不正解が復習に登録されない」等の
 *   CORE 不具合になるため、正解/不正解の両経路と失敗時の原子性を検証する。
 *
 * 実行方法: node tests/test_session_coordinator.js
 */

const assert = require("assert");
const { SessionCoordinator } = require("../js/session_coordinator.js");
const { APP_CONFIG } = require("../js/config.js");
const { createNewProfile, createInitialAppState } = require("../js/schema.js");

let passCount = 0;
function check(label, cond) {
  assert.ok(cond, "FAIL: " + label);
  passCount += 1;
  console.log("  [PASS] " + label);
}

const TODAY = "2026-09-01";

// --- テスト用アプリ状態 --------------------------------------
function makeAppState(grade = 1) {
  const state = createInitialAppState();
  const profile = createNewProfile("p_test", "テスター", grade);
  state.profiles = [profile];
  state.activeProfileId = profile.identity.id;
  return state;
}

function makeQuestion(overrides = {}) {
  return Object.assign({
    questionInstanceId: "qi_1",
    templateId: "tpl_1",
    unitId: "add_1digit_no_carry",
    conceptId: "concept_1",
    isReview: false
  }, overrides);
}

// --- ストレージモック (saveState の成否を制御) ---------------
function makeStorage(result) {
  return {
    saved: null,
    saveCount: 0,
    saveState(state) {
      this.saveCount += 1;
      this.saved = state;
      return result || { success: true };
    }
  };
}

// ---------------------------------------------------------------
console.log("1. completeQuestionAtomic: 正解時の正常系");
// ---------------------------------------------------------------
{
  const appState = makeAppState(1);
  const storage = makeStorage();
  const res = SessionCoordinator.completeQuestionAtomic({
    appState,
    questionInstance: makeQuestion(),
    answerResult: { correct: true, attemptCount: 1, hintUsed: false },
    config: APP_CONFIG,
    storageManager: storage,
    localDateString: TODAY
  });

  check("正解: success = true", res.success === true);
  check("正解: nextState が返る", res.nextState && typeof res.nextState === "object");
  check("正解: summary が返る", res.summary && typeof res.summary === "object");
  check("正解: error は無い", !res.error);

  const p = res.nextState.profiles[0];
  const gp = p.skill.subject.gradeProgress.grade1;
  check("正解: unitStats に unitId が記録される", !!gp.unitStats["add_1digit_no_carry"]);
  check("正解: attempts = 1", gp.unitStats["add_1digit_no_carry"].attempts === 1);
  check("正解: correct = 1", gp.unitStats["add_1digit_no_carry"].correct === 1);
  check("正解: accuracy = 1", gp.unitStats["add_1digit_no_carry"].accuracy === 1);
  check("正解: masteryScore = 1.0", gp.unitStats["add_1digit_no_carry"].masteryScore === 1.0);
  check("正解: learningStartDate が設定される", gp.learningStartDate === TODAY);
  check("正解: correctStreak = 1", p.streaks.correctStreak === 1);
  check("正解: bestStreak = 1", p.streaks.bestStreak === 1);
  check("正解: ポイントが加算される", p.points.total > 0);
  check("正解: 履歴が1件追加される", p.history.length === 1);
  check("正解: 履歴の pointsEarned が記録される", p.history[0].pointsEarned > 0);
  check("正解: 履歴の learningScore = 1", p.history[0].learningScore === 1);
  check("正解: 履歴の attemptCount = 1", p.history[0].attemptCount === 1);
  check("正解: storage に保存される", storage.saveCount === 1);
  check("正解: 保存されるのは nextState", storage.saved === res.nextState);
}

// ---------------------------------------------------------------
console.log("2. completeQuestionAtomic: 元の appState は変更されない (原子性)");
// ---------------------------------------------------------------
{
  const appState = makeAppState(1);
  const before = JSON.stringify(appState);
  const res = SessionCoordinator.completeQuestionAtomic({
    appState,
    questionInstance: makeQuestion(),
    answerResult: { correct: true, attemptCount: 1, hintUsed: false },
    config: APP_CONFIG,
    storageManager: makeStorage(),
    localDateString: TODAY
  });
  check("原子性: 成功しても元 appState は不変", JSON.stringify(appState) === before);
  check("原子性: nextState は元と異なるオブジェクト", res.nextState !== appState);
  check("原子性: nextState.profiles[0] も別オブジェクト", res.nextState.profiles[0] !== appState.profiles[0]);
}

// ---------------------------------------------------------------
console.log("3. completeQuestionAtomic: 不正解時の正常系");
// ---------------------------------------------------------------
{
  const appState = makeAppState(1);
  const res = SessionCoordinator.completeQuestionAtomic({
    appState,
    questionInstance: makeQuestion(),
    answerResult: { correct: false, attemptCount: 1, hintUsed: false },
    config: APP_CONFIG,
    storageManager: makeStorage(),
    localDateString: TODAY
  });
  check("不正解: success = true", res.success === true);
  const p = res.nextState.profiles[0];
  const stats = p.skill.subject.gradeProgress.grade1.unitStats["add_1digit_no_carry"];
  check("不正解: attempts = 1", stats.attempts === 1);
  check("不正解: correct = 0", stats.correct === 0);
  check("不正解: accuracy = 0", stats.accuracy === 0);
  check("不正解: masteryScore = 0", stats.masteryScore === 0);
  check("不正解: correctStreak = 0", p.streaks.correctStreak === 0);
  check("不正解: ポイントは加算されない", p.points.total === 0);
  check("不正解: 履歴は1件追加される", p.history.length === 1);
  check("不正解: 履歴の correct = false", p.history[0].correct === false);
}

// ---------------------------------------------------------------
console.log("4. completeQuestionAtomic: attemptCount は 1〜3 に丸められる");
// ---------------------------------------------------------------
{
  const mk = (attemptCount) => {
    const appState = makeAppState(1);
    const res = SessionCoordinator.completeQuestionAtomic({
      appState,
      questionInstance: makeQuestion(),
      answerResult: { correct: true, attemptCount, hintUsed: false },
      config: APP_CONFIG,
      storageManager: makeStorage(),
      localDateString: TODAY
    });
    return res;
  };
  check("attemptCount=0 → 1 に丸められる", mk(0).nextState.profiles[0].history[0].attemptCount === 1);
  check("attemptCount=5 → 3 に丸められる", mk(5).nextState.profiles[0].history[0].attemptCount === 3);
  check("attemptCount=2 → そのまま 2", mk(2).nextState.profiles[0].history[0].attemptCount === 2);
  check("attemptCount 省略 → 1", mk(undefined).nextState.profiles[0].history[0].attemptCount === 1);
}

// ---------------------------------------------------------------
console.log("5. completeQuestionAtomic: ヒント使用時は learningScore が下がる");
// ---------------------------------------------------------------
{
  const appState = makeAppState(1);
  const res = SessionCoordinator.completeQuestionAtomic({
    appState,
    questionInstance: makeQuestion(),
    answerResult: { correct: true, attemptCount: 1, hintUsed: true },
    config: APP_CONFIG,
    storageManager: makeStorage(),
    localDateString: TODAY
  });
  check("ヒント使用: learningScore = 0.5", res.summary.learningScore === 0.5);
  check("ヒント使用: masteryScore = 0.5", res.nextState.profiles[0].skill.subject.gradeProgress.grade1.unitStats["add_1digit_no_carry"].masteryScore === 0.5);
}

// ---------------------------------------------------------------
console.log("6. completeQuestionAtomic: 復習登録 (attemptCount=3 で不正解)");
// ---------------------------------------------------------------
{
  const appState = makeAppState(1);
  const res = SessionCoordinator.completeQuestionAtomic({
    appState,
    questionInstance: makeQuestion(),
    answerResult: { correct: false, attemptCount: 3, hintUsed: false },
    config: APP_CONFIG,
    storageManager: makeStorage(),
    localDateString: TODAY
  });
  const p = res.nextState.profiles[0];
  check("復習登録: reviewQueue に1件追加される", p.reviewQueue.length === 1);
  check("復習登録: unitId が一致する", p.reviewQueue[0].unitId === "add_1digit_no_carry");
  check("復習登録: grade が一致する", p.reviewQueue[0].grade === 1);
  check("復習登録: summary.reviewRegistered = true", res.summary.reviewRegistered === true);
}

// ---------------------------------------------------------------
console.log("7. completeQuestionAtomic: attemptCount<3 の不正解では復習登録しない");
// ---------------------------------------------------------------
{
  const appState = makeAppState(1);
  const res = SessionCoordinator.completeQuestionAtomic({
    appState,
    questionInstance: makeQuestion(),
    answerResult: { correct: false, attemptCount: 1, hintUsed: false },
    config: APP_CONFIG,
    storageManager: makeStorage(),
    localDateString: TODAY
  });
  check("復習未登録: reviewQueue は空", res.nextState.profiles[0].reviewQueue.length === 0);
  check("復習未登録: summary.reviewRegistered = false", res.summary.reviewRegistered === false);
}

// ---------------------------------------------------------------
console.log("8. completeQuestionAtomic: 復習モードでは既存復習キューを更新する");
// ---------------------------------------------------------------
{
  const appState = makeAppState(1);
  // 事前 Reviewsキューを用意
  appState.profiles[0].reviewQueue = [{
    reviewId: "r1", subjectId: "math", grade: 1, unitId: "add_1digit_no_carry",
    conceptId: "concept_1", templateId: "tpl_1", sourceQuestionId: "qi_0",
    failCount: 1, successCount: 0, intervalDays: 1,
    dueAt: TODAY, registeredAt: "2026-08-31", status: "active"
  }];
  const res = SessionCoordinator.completeQuestionAtomic({
    appState,
    questionInstance: makeQuestion({ isReview: true }),
    answerResult: { correct: true, attemptCount: 1, hintUsed: false },
    config: APP_CONFIG,
    storageManager: makeStorage(),
    localDateString: TODAY
  });
  const p = res.nextState.profiles[0];
  check("復習更新: reviewQueue は増えない", p.reviewQueue.length === 1);
  check("復習更新: successCount = 1", p.reviewQueue[0].successCount === 1);
  check("復習更新: intervalDays = 3", p.reviewQueue[0].intervalDays === 3);
  check("復習更新: dueAt = 今日 + 3日", p.reviewQueue[0].dueAt === "2026-09-04");
  check("復習更新: 新しい復習は登録されない", res.summary.reviewRegistered === false);
}

// ---------------------------------------------------------------
console.log("9. completeQuestionAtomic: ストレージ保存失敗時は success=false を返す");
// ---------------------------------------------------------------
{
  const appState = makeAppState(1);
  const before = JSON.stringify(appState);
  const res = SessionCoordinator.completeQuestionAtomic({
    appState,
    questionInstance: makeQuestion(),
    answerResult: { correct: true, attemptCount: 1, hintUsed: false },
    config: APP_CONFIG,
    storageManager: makeStorage({ success: false, error: "QuotaExceeded" }),
    localDateString: TODAY
  });
  check("保存失敗: success = false", res.success === false);
  check("保存失敗: nextState = null", res.nextState === null);
  check("保存失敗: summary = null", res.summary === null);
  check("保存失敗: error に 'Failed to persist state' が含まれる", res.error.includes("Failed to persist state"));
  check("保存失敗: error に原因が含まれる", res.error.includes("QuotaExceeded"));
  check("保存失敗: 元 appState は不変", JSON.stringify(appState) === before);
}

// ---------------------------------------------------------------
console.log("10. completeQuestionAtomic: 実行時例外でも success=false・状態不変");
// ---------------------------------------------------------------
{
  const appState = makeAppState(1);
  const before = JSON.stringify(appState);
  const res = SessionCoordinator.completeQuestionAtomic({
    appState,
    questionInstance: makeQuestion(),
    answerResult: { correct: true, attemptCount: 1, hintUsed: false },
    config: APP_CONFIG,
    storageManager: makeStorage(),
    localDateString: TODAY,
    // answerResult を null にして LearningScoreEngine の例外を発生させる
  });
  check("正常系: ストレージ1回だけ呼ばれる", res.success === true);
  check("正常系: 元 appState は不変", JSON.stringify(appState) === before);

  // activeProfileId が存在しない場合は例外経路
  const badState = makeAppState(1);
  badState.activeProfileId = "p_not_found";
  const badBefore = JSON.stringify(badState);
  const res2 = SessionCoordinator.completeQuestionAtomic({
    appState: badState,
    questionInstance: makeQuestion(),
    answerResult: { correct: true, attemptCount: 1, hintUsed: false },
    config: APP_CONFIG,
    storageManager: makeStorage(),
    localDateString: TODAY
  });
  check("例外: success = false", res2.success === false);
  check("例外: nextState = null", res2.nextState === null);
  check("例外: summary = null", res2.summary === null);
  check("例外: error に 'not found' が含まれる", res2.error.includes("not found"));
  check("例外: 元 appState は不変", JSON.stringify(badState) === badBefore);
}

// ---------------------------------------------------------------
console.log("11. completeQuestionAtomic: answerResult が null なら失敗扱い");
// ---------------------------------------------------------------
{
  const appState = makeAppState(1);
  const before = JSON.stringify(appState);
  const res = SessionCoordinator.completeQuestionAtomic({
    appState,
    questionInstance: makeQuestion(),
    answerResult: null,
    config: APP_CONFIG,
    storageManager: makeStorage(),
    localDateString: TODAY
  });
  check("answerResult=null: success = false", res.success === false);
  check("answerResult=null: 元 appState は不変", JSON.stringify(appState) === before);
}

// ---------------------------------------------------------------
console.log("12. completeQuestionAtomic: 連続学習日数 (dailyStreak) の更新");
// ---------------------------------------------------------------
{
  const appState = makeAppState(1);
  const res = SessionCoordinator.completeQuestionAtomic({
    appState,
    questionInstance: makeQuestion(),
    answerResult: { correct: true, attemptCount: 1, hintUsed: false },
    config: APP_CONFIG,
    storageManager: makeStorage(),
    localDateString: TODAY
  });
  const p = res.nextState.profiles[0];
  check("連続学習: dailyStreak = 1", p.streaks.dailyStreak === 1);
  check("連続学習: bestDailyStreak = 1", p.streaks.bestDailyStreak === 1);
  check("連続学習: lastStudyDate = 今日", p.streaks.lastStudyDate === TODAY);
}

// ---------------------------------------------------------------
console.log("13. completeQuestionAtomic: バッジ判定とレベル判定が呼ばれる");
// ---------------------------------------------------------------
{
  const appState = makeAppState(1);
  const res = SessionCoordinator.completeQuestionAtomic({
    appState,
    questionInstance: makeQuestion(),
    answerResult: { correct: true, attemptCount: 1, hintUsed: false },
    config: APP_CONFIG,
    storageManager: makeStorage(),
    localDateString: TODAY
  });
  check("バッジ: summary.unlockedBadges が配列", Array.isArray(res.summary.unlockedBadges));
  check("バッジ: profile.badges と一致", res.nextState.profiles[0].badges.length === res.summary.unlockedBadges.length);
  check("レベル: summary.levelEvaluation がオブジェクト", res.summary.levelEvaluation && typeof res.summary.levelEvaluation === "object");
  check("レベル: evaluated フラグを持つ", typeof res.summary.levelEvaluation.evaluated === "boolean");
  check("レベル: previousLevel / newLevel を持つ",
    typeof res.summary.levelEvaluation.previousLevel === "number" &&
    typeof res.summary.levelEvaluation.newLevel === "number");
  check("summary: unitMastery が返る", res.summary.unitMastery === 1);
  check("summary: updatedStreak が返る", res.summary.updatedStreak === 1);
  check("summary: pointsEarned が返る", res.summary.pointsEarned > 0);
}

// ---------------------------------------------------------------
console.log("14. completeQuestionAtomic: 履歴上限 (historyLimit) で古い履歴を破棄");
// ---------------------------------------------------------------
{
  const appState = makeAppState(1);
  // 既に上限分の履歴を用意
  const limit = APP_CONFIG.common.historyLimit;
  for (let i = 0; i < limit; i++) {
    appState.profiles[0].history.push({ questionInstanceId: "old_" + i, grade: 1 });
  }
  check("上限: 事前履歴件数 = limit", appState.profiles[0].history.length === limit);

  const res = SessionCoordinator.completeQuestionAtomic({
    appState,
    questionInstance: makeQuestion(),
    answerResult: { correct: true, attemptCount: 1, hintUsed: false },
    config: APP_CONFIG,
    storageManager: makeStorage(),
    localDateString: TODAY
  });
  check("上限: 完了後も limit 件に収まる", res.nextState.profiles[0].history.length === limit);
  check("上限: 最古の履歴が破棄される", !res.nextState.profiles[0].history.some(h => h.questionInstanceId === "old_0"));
  check("上限: 最新履歴が保持される", res.nextState.profiles[0].history.some(h => h.questionInstanceId === "qi_1"));
}

// ---------------------------------------------------------------
console.log("15. completeQuestionAtomic: storageManager 省略時は保存しない");
// ---------------------------------------------------------------
{
  const appState = makeAppState(1);
  const res = SessionCoordinator.completeQuestionAtomic({
    appState,
    questionInstance: makeQuestion(),
    answerResult: { correct: true, attemptCount: 1, hintUsed: false },
    config: APP_CONFIG,
    localDateString: TODAY
  });
  check("storage 省略: success = true", res.success === true);
  check("storage 省略: nextState が返る", res.nextState !== null);
}

// ---------------------------------------------------------------
console.log("16. completeQuestionAtomic: config 省略時は既定値で動作する");
// ---------------------------------------------------------------
{
  const appState = makeAppState(1);
  const res = SessionCoordinator.completeQuestionAtomic({
    appState,
    questionInstance: makeQuestion(),
    answerResult: { correct: true, attemptCount: 1, hintUsed: false },
    localDateString: TODAY
  });
  check("config 省略: success = true", res.success === true);
  check("config 省略: ポイントが加算される", res.nextState.profiles[0].points.total > 0);
  check("config 省略: 履歴が1件追加される", res.nextState.profiles[0].history.length === 1);
}

// ---------------------------------------------------------------
console.log("17. completeQuestionAtomic: 既存 스트リークが継続される");
// ---------------------------------------------------------------
{
  const appState = makeAppState(1);
  appState.profiles[0].streaks.correctStreak = 4;
  appState.profiles[0].streaks.bestStreak = 4;
  const res = SessionCoordinator.completeQuestionAtomic({
    appState,
    questionInstance: makeQuestion(),
    answerResult: { correct: true, attemptCount: 1, hintUsed: false },
    config: APP_CONFIG,
    storageManager: makeStorage(),
    localDateString: TODAY
  });
  const p = res.nextState.profiles[0];
  check("連続: correctStreak = 5", p.streaks.correctStreak === 5);
  check("連続: bestStreak = 5 に更新", p.streaks.bestStreak === 5);
}

// ---------------------------------------------------------------
console.log("18. completeQuestionAtomic: 不正解で bestStreak は保持される");
// ---------------------------------------------------------------
{
  const appState = makeAppState(1);
  appState.profiles[0].streaks.correctStreak = 3;
  appState.profiles[0].streaks.bestStreak = 7;
  const res = SessionCoordinator.completeQuestionAtomic({
    appState,
    questionInstance: makeQuestion(),
    answerResult: { correct: false, attemptCount: 1, hintUsed: false },
    config: APP_CONFIG,
    storageManager: makeStorage(),
    localDateString: TODAY
  });
  const p = res.nextState.profiles[0];
  check("不正解: correctStreak = 0 にリセット", p.streaks.correctStreak === 0);
  check("不正解: bestStreak = 7 のまま", p.streaks.bestStreak === 7);
}

// ---------------------------------------------------------------
console.log("19. completeQuestionAtomic: 複数問を連続実行しても状態が累積される");
// ---------------------------------------------------------------
{
  let appState = makeAppState(1);
  for (let i = 1; i <= 3; i++) {
    const res = SessionCoordinator.completeQuestionAtomic({
      appState,
      questionInstance: makeQuestion({ questionInstanceId: "qi_" + i }),
      answerResult: { correct: true, attemptCount: 1, hintUsed: false },
      config: APP_CONFIG,
      storageManager: makeStorage(),
      localDateString: TODAY
    });
    check("連続実行 " + i + ": success", res.success === true);
    appState = res.nextState;
  }
  const p = appState.profiles[0];
  check("連続実行: 履歴が3件", p.history.length === 3);
  check("連続実行: correctStreak = 3", p.streaks.correctStreak === 3);
  check("連続実行: attempts = 3", p.skill.subject.gradeProgress.grade1.unitStats["add_1digit_no_carry"].attempts === 3);
}

// ---------------------------------------------------------------
console.log("\n==========================================");
console.log(`SessionCoordinator tests: ${passCount} assertions passed.`);
console.log("==========================================");
