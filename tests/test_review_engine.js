/**
 * V2.9.x テストカバレッジ拡大 — ReviewEngine (復習キュー登録 / 間隔反復 / 卒業判定)
 *
 * 対象: js/review_engine.js
 *
 * 背景:
 * - 復習キューは「一意キー: subjectId + grade + unitId」で管理される。
 *   重複登録・再活性化・卒業判定が崩れると復習が永遠に出題されない等の不具合になる。
 * - 復習間隔 (1 → 3 → 7 → 14日) と卒業条件 (successCount >= 3 かつ intervalDays >= 14) を検証する。
 *
 * 実行方法: node tests/test_review_engine.js
 */

const assert = require("assert");
const { ReviewEngine } = require("../js/review_engine.js");
const { APP_CONFIG } = require("../js/config.js");
const { DateUtils } = require("../js/date_utils.js");

let passCount = 0;
function check(label, cond) {
  assert.ok(cond, "FAIL: " + label);
  passCount += 1;
  console.log("  [PASS] " + label);
}

const TODAY = "2026-09-01";
const TOMORROW = "2026-09-02";

function makeProfile(grade = 2) {
  return {
    reviewQueue: [],
    skill: { subject: { currentGrade: grade } }
  };
}
function makeItem(overrides = {}) {
  return Object.assign({
    subjectId: "math",
    grade: 2,
    unitId: "u1",
    conceptId: "concept_1",
    templateId: "tpl_1",
    sourceQuestionId: "q_1"
  }, overrides);
}

// ---------------------------------------------------------------
console.log("1. registerForReview: 新規登録");
// ---------------------------------------------------------------
{
  const profile = makeProfile();
  const res = ReviewEngine.registerForReview(profile, makeItem(), TODAY);
  check("新規登録: registered = true", res.registered === true);
  check("新規登録: reason = 'new'", res.reason === "new");
  check("新規登録: reviewQueue に1件追加される", profile.reviewQueue.length === 1);

  const item = profile.reviewQueue[0];
  check("新規登録: unitId が保持される", item.unitId === "u1");
  check("新規登録: subjectId が保持される", item.subjectId === "math");
  check("新規登録: grade が保持される", item.grade === 2);
  check("新規登録: conceptId が保持される", item.conceptId === "concept_1");
  check("新規登録: templateId が保持される", item.templateId === "tpl_1");
  check("新規登録: sourceQuestionId が保持される", item.sourceQuestionId === "q_1");
  check("新規登録: failCount = 1", item.failCount === 1);
  check("新規登録: successCount = 0", item.successCount === 0);
  check("新規登録: intervalDays = 1", item.intervalDays === 1);
  check("新規登録: dueAt = 明日", item.dueAt === TOMORROW);
  check("新規登録: registeredAt = 今日", item.registeredAt === TODAY);
  check("新規登録: status = 'active'", item.status === "active");
  check("新規登録: reviewId が発行される", typeof item.reviewId === "string" && item.reviewId.length > 0);
  check("新規登録: 戻り値の reviewItem はキュー内の実体と同一", res.reviewItem === item);
}

// ---------------------------------------------------------------
console.log("2. registerForReview: 既に active なら重複作成しない");
// ---------------------------------------------------------------
{
  const profile = makeProfile();
  ReviewEngine.registerForReview(profile, makeItem({ templateId: "tpl_1" }), TODAY);
  const res = ReviewEngine.registerForReview(profile, makeItem({ templateId: "tpl_2" }), "2026-09-05");
  check("active 既存: registered = false", res.registered === false);
  check("active 既存: reason = 'maintained'", res.reason === "maintained");
  check("active 既存: reviewQueue は1件のまま", profile.reviewQueue.length === 1);
  check("active 既存: templateId は上書きされない", profile.reviewQueue[0].templateId === "tpl_1");
}

// ---------------------------------------------------------------
console.log("3. registerForReview: graduated からの再活性化");
// ---------------------------------------------------------------
{
  const profile = makeProfile();
  ReviewEngine.registerForReview(profile, makeItem(), TODAY);
  const item = profile.reviewQueue[0];
  item.status = "graduated";
  item.successCount = 3;
  item.failCount = 0;
  item.intervalDays = 14;
  item.dueAt = null;

  const res = ReviewEngine.registerForReview(profile, makeItem({ templateId: "tpl_new" }), "2026-09-10");
  check("graduated 再活性化: registered = true", res.registered === true);
  check("graduated 再活性化: reason = 'reactivated'", res.reason === "reactivated");
  check("graduated 再活性化: status = 'active' に戻る", item.status === "active");
  check("graduated 再活性化: successCount = 0 にリセット", item.successCount === 0);
  check("graduated 再活性化: failCount = 0 にリセット", item.failCount === 0);
  check("graduated 再活性化: intervalDays = 1 にリセット", item.intervalDays === 1);
  check("graduated 再活性化: dueAt = 再登録日の翌日 (2026-09-11)", item.dueAt === "2026-09-11");
  check("graduated 再活性化: templateId が新项目建设される", item.templateId === "tpl_new");
  check("graduated 再活性化: reviewQueue は増えない", profile.reviewQueue.length === 1);
}

// ---------------------------------------------------------------
console.log("4. registerForReview: 一意キー (subjectId + grade + unitId)");
// ---------------------------------------------------------------
{
  const profile = makeProfile();
  ReviewEngine.registerForReview(profile, makeItem({ grade: 2 }), TODAY);
  const res = ReviewEngine.registerForReview(profile, makeItem({ grade: 3 }), TODAY);
  check("grade が違えば別項目として新規登録される", res.reason === "new" && profile.reviewQueue.length === 2);

  const res2 = ReviewEngine.registerForReview(profile, makeItem({ grade: 2 }), TODAY);
  check("grade が同じなら既存 maintained", res2.reason === "maintained" && profile.reviewQueue.length === 2);
}

// ---------------------------------------------------------------
console.log("5. registerForReview: 不正引数は例外を投げる");
// ---------------------------------------------------------------
{
  let threw = false;
  try { ReviewEngine.registerForReview(null, makeItem(), TODAY); } catch (e) { threw = true; }
  check("profile が null なら Error を投げる", threw);

  threw = false;
  try { ReviewEngine.registerForReview(makeProfile(), null, TODAY); } catch (e) { threw = true; }
  check("itemParams が null なら Error を投げる", threw);

  threw = false;
  try { ReviewEngine.registerForReview(makeProfile(), makeItem({ unitId: "" }), TODAY); } catch (e) { threw = true; }
  check("unitId が空文字なら Error を投げる", threw);
}

// ---------------------------------------------------------------
console.log("6. registerForReview: reviewQueue が未初期化でも自動生成される");
// ---------------------------------------------------------------
{
  const profile = makeProfile();
  delete profile.reviewQueue;
  const res = ReviewEngine.registerForReview(profile, makeItem(), TODAY);
  check("reviewQueue が無ければ空配列を作成", Array.isArray(profile.reviewQueue) && profile.reviewQueue.length === 1);
  check("reviewQueue 未初期化でも登録できる", res.registered === true);
}

// ---------------------------------------------------------------
console.log("7. registerForReview: grade 省略時は currentGrade を使う");
// ---------------------------------------------------------------
{
  const profile = makeProfile(3);
  const res = ReviewEngine.registerForReview(profile, { subjectId: "math", unitId: "u_auto" }, TODAY);
  check("grade 省略 → currentGrade (3) が使われる", profile.reviewQueue[0].grade === 3);
  check("grade 省略でも conceptId は空文字で補われる", profile.reviewQueue[0].conceptId === "");
  check("grade 省略でも unitId は保持される", profile.reviewQueue[0].unitId === "u_auto");
  check("grade 省略でも registered = true", res.registered === true);
}

// ---------------------------------------------------------------
console.log("8. registerForReview: subjectId 省略時は 'math' になる");
// ---------------------------------------------------------------
{
  const profile = makeProfile();
  ReviewEngine.registerForReview(profile, { unitId: "u_nosubject" }, TODAY);
  check("subjectId 省略 → 'math' が補われる", profile.reviewQueue[0].subjectId === "math");
}

// ---------------------------------------------------------------
console.log("9. processReviewResult: 復習正解時の間隔延長 (1 → 3 → 7 → 14)");
// ---------------------------------------------------------------
{
  const item = {
    reviewId: "r1", subjectId: "math", grade: 2, unitId: "u1",
    failCount: 1, successCount: 0, intervalDays: 1,
    dueAt: TODAY, registeredAt: "2026-08-31", status: "active"
  };

  ReviewEngine.processReviewResult(item, true, APP_CONFIG, TODAY);
  check("1回目正解: successCount = 1", item.successCount === 1);
  check("1回目正解: failCount = 0 にリセット", item.failCount === 0);
  check("1回目正解: intervalDays = 3", item.intervalDays === 3);
  check("1回目正解: dueAt = 今日 + 3日 (2026-09-04)", item.dueAt === "2026-09-04");
  check("1回目正解: status = 'active'", item.status === "active");

  ReviewEngine.processReviewResult(item, true, APP_CONFIG, "2026-09-04");
  check("2回目正解: successCount = 2", item.successCount === 2);
  check("2回目正解: intervalDays = 7", item.intervalDays === 7);
  check("2回目正解: dueAt = 今日 + 7日 (2026-09-11)", item.dueAt === "2026-09-11");

  ReviewEngine.processReviewResult(item, true, APP_CONFIG, "2026-09-11");
  check("3回目正解: successCount = 3", item.successCount === 3);
  check("3回目正解: intervalDays = 14 (上限)", item.intervalDays === 14);
  check("3回目正解: 卒業判定 → status = 'graduated'", item.status === "graduated");
  check("3回目正解: 卒業後は dueAt = null", item.dueAt === null);
}

// ---------------------------------------------------------------
console.log("10. processReviewResult: 復習不正解時は間隔を1日へリセット");
// ---------------------------------------------------------------
{
  const item = {
    reviewId: "r2", subjectId: "math", grade: 2, unitId: "u2",
    failCount: 0, successCount: 2, intervalDays: 7,
    dueAt: "2026-09-10", registeredAt: "2026-08-31", status: "active"
  };
  ReviewEngine.processReviewResult(item, false, APP_CONFIG, TODAY);
  check("不正解: failCount = 1 に増加", item.failCount === 1);
  check("不正解: successCount = 0 にリセット", item.successCount === 0);
  check("不正解: intervalDays = 1 にリセット", item.intervalDays === 1);
  check("不正解: dueAt = 明日 (2026-09-02)", item.dueAt === "2026-09-02");
  check("不正解: status は 'active' のまま", item.status === "active");
}

// ---------------------------------------------------------------
console.log("11. processReviewResult: 卒業済み項目に正解しても卒業状態を維持");
// ---------------------------------------------------------------
{
  const item = {
    reviewId: "r3", subjectId: "math", grade: 2, unitId: "u3",
    failCount: 0, successCount: 3, intervalDays: 14,
    dueAt: null, registeredAt: "2026-08-01", status: "graduated"
  };
  ReviewEngine.processReviewResult(item, true, APP_CONFIG, TODAY);
  check("卒業済み + 正解: intervalDays は 14 のまま", item.intervalDays === 14);
  check("卒業済み + 正解: dueAt は null のまま", item.dueAt === null);
  check("卒業済み + 正解: status は 'graduated' のまま", item.status === "graduated");
  check("卒業済み + 正解: successCount は増える (4)", item.successCount === 4);
}

// ---------------------------------------------------------------
console.log("12. processReviewResult: 設定に無い intervalDays は上限値に補正される");
// ---------------------------------------------------------------
{
  const item = {
    reviewId: "r4", subjectId: "math", grade: 2, unitId: "u4",
    failCount: 0, successCount: 0, intervalDays: 5, // 設定に無い値
    dueAt: TODAY, registeredAt: "2026-08-31", status: "active"
  };
  ReviewEngine.processReviewResult(item, true, APP_CONFIG, TODAY);
  check("未知の intervalDays → maxIntervalDays (14) に補正", item.intervalDays === 14);
  check("未知の intervalDays: successCount = 1 なので卒業しない", item.status === "active");
  check("未知の intervalDays: dueAt = 今日 + 14日", item.dueAt === "2026-09-15");
}

// ---------------------------------------------------------------
console.log("13. processReviewResult: config による上書き");
// ---------------------------------------------------------------
{
  const customConfig = {
    math: { reviewEngine: { intervalDays: [2, 4], maxIntervalDays: 4, graduationSuccessCount: 2 } }
  };
  const item = {
    reviewId: "r5", subjectId: "math", grade: 2, unitId: "u5",
    failCount: 0, successCount: 0, intervalDays: 2,
    dueAt: TODAY, registeredAt: "2026-08-31", status: "active"
  };
  ReviewEngine.processReviewResult(item, true, customConfig, TODAY);
  check("カスタム config: 1回目正解で successCount = 1", item.successCount === 1);
  check("カスタム config: intervalDays = 4 (カスタム上限)", item.intervalDays === 4);
  check("カスタム config: 卒業条件 successCount=2 未達なので active", item.status === "active");
  check("カスタム config: dueAt = 今日 + 4日", item.dueAt === "2026-09-05");

  ReviewEngine.processReviewResult(item, true, customConfig, TODAY);
  check("カスタム config: 2回目正解で卒業 (successCount = 2)", item.successCount === 2 && item.status === "graduated");
  check("カスタム config: 卒業後は dueAt = null", item.dueAt === null);
}

// ---------------------------------------------------------------
console.log("14. processReviewResult: config 省略時は既定値が使われる");
// ---------------------------------------------------------------
{
  const item = {
    reviewId: "r6", subjectId: "math", grade: 2, unitId: "u6",
    failCount: 0, successCount: 0, intervalDays: 1,
    dueAt: TODAY, registeredAt: "2026-08-31", status: "active"
  };
  ReviewEngine.processReviewResult(item, true, null, TODAY);
  check("config 省略時は既定の intervalDays = 3", item.intervalDays === 3);
  check("config 省略時は既定の graduationSuccessCount = 3 が有効", item.status === "active");
  check("config 省略時は既定の dueAt = 今日 + 3日", item.dueAt === "2026-09-04");
}

// ---------------------------------------------------------------
console.log("15. _addDays / _todayKey: DateUtils 経由");
// ---------------------------------------------------------------
check("_addDays +1 = 2026-09-02", ReviewEngine._addDays(TODAY, 1) === "2026-09-02");
check("_addDays -1 = 2026-08-31", ReviewEngine._addDays(TODAY, -1) === "2026-08-31");
check("_addDays は DateUtils.addDays と一致", ReviewEngine._addDays("2026-12-31", 1) === DateUtils.addDays("2026-12-31", 1));
check("_addDays 年跨ぎ 2026-12-31 + 1 = 2027-01-01", ReviewEngine._addDays("2026-12-31", 1) === "2027-01-01");
check("_todayKey は YYYY-MM-DD 形式", /^\d{4}-\d{2}-\d{2}$/.test(ReviewEngine._todayKey()));
check("_todayKey は指定値をそのまま返す", ReviewEngine._todayKey("2026-09-01") === "2026-09-01");
check("_todayKey の既定値は DateUtils.localDateKey と一致", ReviewEngine._todayKey() === DateUtils.localDateKey());

// ---------------------------------------------------------------
console.log("\n==========================================");
console.log(`ReviewEngine tests: ${passCount} assertions passed.`);
console.log("==========================================");
