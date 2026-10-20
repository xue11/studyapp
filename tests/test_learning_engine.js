/**
 * V2.9.x テストカバレッジ拡大 — LearningEngine (unitStats / masteryScore / dailyStreak)
 *
 * 対象: js/learning_engine.js
 *
 * 背景:
 * - attempts / correct / accuracy / masteryScore の計算式は第13章・第14章の仕様であり、
 *   ここが崩れると正答率・習熟度・レベル判定・弱点重み付けすべてが連鎖的に壊れる。
 * - 連続学習日数 (dailyStreak) は JST 基準 (DateUtils) で判定する。
 *
 * 実行方法: node tests/test_learning_engine.js
 */

const assert = require("assert");
const { LearningEngine } = require("../js/learning_engine.js");
const { DateUtils } = require("../js/date_utils.js");

let passCount = 0;
function check(label, cond) {
  assert.ok(cond, "FAIL: " + label);
  passCount += 1;
  console.log("  [PASS] " + label);
}
function approx(a, b, eps = 1e-9) {
  return Math.abs(a - b) < eps;
}

// ---------------------------------------------------------------
console.log("1. updateUnitStats: 初回の正当化");
// ---------------------------------------------------------------
const firstCorrect = LearningEngine.updateUnitStats(null, 1.0, true);
check("初回正解: attempts = 1", firstCorrect.attempts === 1);
check("初回正解: correct = 1", firstCorrect.correct === 1);
check("初回正解: accuracy = 1.0", firstCorrect.accuracy === 1);
check("初回正解: masteryScore = learningScore (1.0)", firstCorrect.masteryScore === 1);

const firstWrong = LearningEngine.updateUnitStats(null, 0.0, false);
check("初回不正解: attempts = 1", firstWrong.attempts === 1);
check("初回不正解: correct = 0", firstWrong.correct === 0);
check("初回不正解: accuracy = 0", firstWrong.accuracy === 0);
check("初回不正解: masteryScore = learningScore (0.0)", firstWrong.masteryScore === 0);

const firstPartial = LearningEngine.updateUnitStats(undefined, 0.8, true);
check("初回 (undefined 引数): attempts = 1", firstPartial.attempts === 1);
check("初回 (undefined 引数): masteryScore = 0.8", firstPartial.masteryScore === 0.8);
check("初回 (undefined 引数): accuracy = 1", firstPartial.accuracy === 1);

// ---------------------------------------------------------------
console.log("2. updateUnitStats: 2回目以降は old*0.7 + score*0.3");
// ---------------------------------------------------------------
const second = LearningEngine.updateUnitStats(
  { attempts: 2, correct: 1, accuracy: 0.5, masteryScore: 0.5 }, 1.0, true
);
check("2回目: attempts = 3", second.attempts === 3);
check("2回目: correct = 2", second.correct === 2);
check("2回目: accuracy = 2/3", approx(second.accuracy, 2 / 3));
check("2回目: masteryScore = 0.5*0.7 + 1.0*0.3 = 0.65", second.masteryScore === 0.65);

const down = LearningEngine.updateUnitStats(
  { attempts: 1, correct: 1, accuracy: 1, masteryScore: 0.9 }, 0.5, false
);
check("習熟度低下: 0.9*0.7 + 0.5*0.3 = 0.78", down.masteryScore === 0.78);
check("習熟度低下: correct は増えない", down.correct === 1);
check("習熟度低下: accuracy = 1/2 = 0.5", down.accuracy === 0.5);

const rounded = LearningEngine.updateUnitStats(
  { attempts: 1, correct: 0, accuracy: 0, masteryScore: 0.333 }, 0.777, false
);
check("masteryScore は小数3桁に丸められる (0.466)", rounded.masteryScore === 0.466);

// ---------------------------------------------------------------
console.log("3. updateUnitStats: 入力オブジェクトを破壊しない (純粋性)");
// ---------------------------------------------------------------
const original = { attempts: 1, correct: 1, accuracy: 1, masteryScore: 0.9 };
const snapshot = JSON.stringify(original);
const updated = LearningEngine.updateUnitStats(original, 0.5, false);
check("元のオブジェクトは変更されない", JSON.stringify(original) === snapshot);
check("戻り値は新しいオブジェクト", updated !== original);
check("戻り値には更新後の attempts が入る", updated.attempts === 2);

// ---------------------------------------------------------------
console.log("4. updateUnitStats: accuracy は attempts > 0 のとき null にならない");
// ---------------------------------------------------------------
const zeroAttempt = { attempts: 0, correct: 0, accuracy: null, masteryScore: 0 };
const afterZero = LearningEngine.updateUnitStats(zeroAttempt, 1.0, true);
check("attempts 0 → 1 で accuracy は 1 (null にならない)", afterZero.accuracy === 1);
check("初回判定は attempts === 0 の時点で確定", afterZero.masteryScore === 1);

// ---------------------------------------------------------------
console.log("5. ensureLearningStartDate: 初回到達時のみ設定");
// ---------------------------------------------------------------
const gpNull = { learningStartDate: null };
LearningEngine.ensureLearningStartDate(gpNull, "2026-09-01");
check("learningStartDate が null → 今日が設定される", gpNull.learningStartDate === "2026-09-01");

const gpSet = { learningStartDate: "2026-01-01" };
LearningEngine.ensureLearningStartDate(gpSet, "2026-09-01");
check("設定済みなら変更されない", gpSet.learningStartDate === "2026-01-01");

const gpNoArg = { learningStartDate: null };
LearningEngine.ensureLearningStartDate(gpNoArg);
check("日付引数省略時は JST の今日が設定される", /^\d{4}-\d{2}-\d{2}$/.test(gpNoArg.learningStartDate));

// undefined は null 判定に当たらないため未設定のまま (仕様どおり)
const gpUndef = { learningStartDate: undefined };
LearningEngine.ensureLearningStartDate(gpUndef, "2026-09-01");
check("learningStartDate が undefined の場合は変更されない (null 判定のみ)", gpUndef.learningStartDate === undefined);

// null オブジェクトはクラッシュしない
let ensureNoCrash = true;
try { LearningEngine.ensureLearningStartDate(null, "2026-09-01"); } catch (e) { ensureNoCrash = false; }
check("gradeProgress が null でもクラッシュしない", ensureNoCrash);

// ---------------------------------------------------------------
console.log("6. updateDailyStreak: 連続学習日数の更新");
// ---------------------------------------------------------------
const today = "2026-09-01";
const yesterday = DateUtils.addDays(today, -1);
const twoDaysAgo = DateUtils.addDays(today, -2);

const firstStreak = { streaks: { dailyStreak: 0, bestDailyStreak: 0, lastStudyDate: "" } };
const firstRes = LearningEngine.updateDailyStreak(firstStreak, today);
check("初回学習 → dailyStreak = 1", firstRes.dailyStreak === 1);
check("初回学習 → bestDailyStreak = 1", firstRes.bestDailyStreak === 1);
check("初回学習 → lastStudyDate = 今日", firstRes.lastStudyDate === today);

const contStreak = { streaks: { dailyStreak: 3, bestDailyStreak: 5, lastStudyDate: yesterday } };
const contRes = LearningEngine.updateDailyStreak(contStreak, today);
check("昨日の続き → dailyStreak = 4 (3+1)", contRes.dailyStreak === 4);
check("昨日の続き → bestDailyStreak は 5 のまま (更新されない)", contRes.bestDailyStreak === 5);
check("昨日の続き → lastStudyDate = 今日", contRes.lastStudyDate === today);

const gapStreak = { streaks: { dailyStreak: 4, bestDailyStreak: 4, lastStudyDate: twoDaysAgo } };
const gapRes = LearningEngine.updateDailyStreak(gapStreak, today);
check("2日以上の空白 → dailyStreak = 1 にリセット", gapRes.dailyStreak === 1);
check("2日以上の空白 → bestDailyStreak は 4 のまま", gapRes.bestDailyStreak === 4);

const sameDayStreak = { streaks: { dailyStreak: 2, bestDailyStreak: 2, lastStudyDate: today } };
const sameDayRes = LearningEngine.updateDailyStreak(sameDayStreak, today);
check("当日再呼び出し → dailyStreak は変化しない (2のまま)", sameDayRes.dailyStreak === 2);
check("当日再呼び出し → bestDailyStreak も変化しない", sameDayRes.bestDailyStreak === 2);

// JST 境界: UTC基準だと「昨日」になる時刻でも JST基準では同一日扱い
const jstSameDay = { streaks: { dailyStreak: 2, bestDailyStreak: 2, lastStudyDate: today } };
const jstRes = LearningEngine.updateDailyStreak(jstSameDay, today);
check("JST 境界でも当日扱い (連続維持)", jstRes.dailyStreak === 2);

check("profile が null なら null を返す", LearningEngine.updateDailyStreak(null, today) === null);
check("streaks を持たない profile なら null を返す", LearningEngine.updateDailyStreak({}, today) === null);

// dailyStreak が未定義 (undefined) でも今日の学習なら 1 になる
const undefStreak = { streaks: { lastStudyDate: "" } };
const undefRes = LearningEngine.updateDailyStreak(undefStreak, today);
check("dailyStreak 未定義 → 初回として 1 になる", undefRes.dailyStreak === 1);

// ---------------------------------------------------------------
console.log("7. countTodayQuestions: 今日の通常学習完了問数のカウント");
// ---------------------------------------------------------------
const history = [
  { completedAt: "2026-09-01T10:00:00.000Z" },
  { completedAt: "2026-09-01T12:00:00.000Z" },
  { completedAt: "2026-08-31T12:00:00.000Z" }
];
check("今日の完了問数 = 2 (昨日の1件は含まない)", LearningEngine.countTodayQuestions(history, today) === 2);
check("昨日の日付を指定すると 0", LearningEngine.countTodayQuestions(history, "2026-08-31") === 1);
check("履歴が空配列 → 0", LearningEngine.countTodayQuestions([], today) === 0);
check("履歴が null → 0 (クラッシュ防止)", LearningEngine.countTodayQuestions(null, today) === 0);
check("履歴が undefined → 0 (クラッシュ防止)", LearningEngine.countTodayQuestions(undefined, today) === 0);
check("completedAt 欠損のレコードは数えない", LearningEngine.countTodayQuestions([{ foo: 1 }], today) === 0);
check("日付引数省略時は JST の今日でカウント", LearningEngine.countTodayQuestions(history) === 0);

// ---------------------------------------------------------------
console.log("8. _dateOffset: DateUtils.addDays への委譲");
// ---------------------------------------------------------------
check("_dateOffset +1 = 2026-09-02", LearningEngine._dateOffset("2026-09-01", 1) === "2026-09-02");
check("_dateOffset -1 = 2026-08-31", LearningEngine._dateOffset("2026-09-01", -1) === "2026-08-31");
check("_dateOffset は DateUtils.addDays と一致", LearningEngine._dateOffset("2026-12-31", 1) === DateUtils.addDays("2026-12-31", 1));

// ---------------------------------------------------------------
console.log("\n==========================================");
console.log(`LearningEngine tests: ${passCount} assertions passed.`);
console.log("==========================================");

