/**
 * V2.9.x テストカバレッジ拡大 — DateUtils (JST基準の日付キー操作)
 *
 * 対象: js/date_utils.js
 *
 * 背景:
 * - 既往の `toISOString().split("T")[0]` (UTC基準) 由来の不具合 (JST 0〜9時に
 *   「昨日」扱い) の再発を防ぐため、JST固定オフセットの日付演算を網羅的に検証する。
 * - 月末・年末・うるう年・不正入力など、境界条件でのクラッシュが無いことを確認する。
 *
 * 実行方法: node tests/test_date_utils.js
 */

const assert = require("assert");
const { DateUtils } = require("../js/date_utils.js");

let passCount = 0;
function check(label, cond) {
  assert.ok(cond, "FAIL: " + label);
  passCount += 1;
  console.log("  [PASS] " + label);
}

// ---------------------------------------------------------------
console.log("1. localDateKey は JST 固定 (UTC+9) 基準の日付キーを返す");
// ---------------------------------------------------------------
const nowKey = DateUtils.localDateKey();
check("YYYY-MM-DD 形式", /^\d{4}-\d{2}-\d{2}$/.test(nowKey));

// UTC 16:30 = JST 翌日 01:30 → UTC基準なら「本日」だが JST基準では「翌日」
const jstNextDay = new Date("2026-01-01T16:30:00Z");
check(
  "UTC 16:30 = JST 翌日 01:30 → 2026-01-02 (UTC基準の 2026-01-01 ではない)",
  DateUtils.localDateKey(jstNextDay) === "2026-01-02" &&
    jstNextDay.toISOString().split("T")[0] === "2026-01-01"
);

// UTC 14:59 = JST 23:59 = 同日 / UTC 15:00 = JST 翌日 00:00 が境界
check("UTC 14:59 = JST 23:59 → 2026-01-01 (同一日)", DateUtils.localDateKey(new Date("2026-01-01T14:59:00Z")) === "2026-01-01");
check("UTC 15:00 = JST 翌日 00:00 → 2026-01-02 (境界)", DateUtils.localDateKey(new Date("2026-01-01T15:00:00Z")) === "2026-01-02");

// 同じ日内の時刻差は日付キーに影響しない
check("UTC 00:00 = JST 09:00 → 2026-01-01", DateUtils.localDateKey(new Date("2026-01-01T00:00:00Z")) === "2026-01-01");
check("UTC 09:59 = JST 18:59 → 2026-01-01", DateUtils.localDateKey(new Date("2026-01-01T09:59:00Z")) === "2026-01-01");

// 引数省略時は現在時刻 keys
check("引数省略でも YYYY-MM-DD", /^\d{4}-\d{2}-\d{2}$/.test(DateUtils.localDateKey()));

// ---------------------------------------------------------------
console.log("2. addDays: 月末・年末・うるう年の日付演算");
// ---------------------------------------------------------------
check("2026-01-31 + 1 = 2026-02-01 (月末)", DateUtils.addDays("2026-01-31", 1) === "2026-02-01");
check("2026-12-31 + 1 = 2027-01-01 (年末)", DateUtils.addDays("2026-12-31", 1) === "2027-01-01");
check("2027-01-01 - 1 = 2026-12-31 (年跨ぎ)", DateUtils.addDays("2027-01-01", -1) === "2026-12-31");
check("2028-02-28 + 1 = 2028-02-29 (うるう年)", DateUtils.addDays("2028-02-28", 1) === "2028-02-29");
check("2028-02-29 + 1 = 2028-03-01 (うるう年の翌月)", DateUtils.addDays("2028-02-29", 1) === "2028-03-01");
check("2026-02-28 + 1 = 2026-03-01 (平年)", DateUtils.addDays("2026-02-28", 1) === "2026-03-01");
check("2027-02-28 + 1 = 2027-03-01 (平年)", DateUtils.addDays("2027-02-28", 1) === "2027-03-01");
check("2026-02-01 - 1 = 2026-01-31 (前月末)", DateUtils.addDays("2026-02-01", -1) === "2026-01-31");
check("2026-01-15 + 30 = 2026-02-14 (月またぎ)", DateUtils.addDays("2026-01-15", 30) === "2026-02-14");
check("2026-03-01 + 0 = 2026-03-01 (offset 0)", DateUtils.addDays("2026-03-01", 0) === "2026-03-01");
check("2026-01-05 - 2 = 2026-01-03 (負オフセット)", DateUtils.addDays("2026-01-05", -2) === "2026-01-03");
check("offset 省略時は 0 日扱い", DateUtils.addDays("2026-03-01") === "2026-03-01");

// addDays は往復で必ず元に戻る
check(
  "addDays 往復で元に戻る (7日)",
  DateUtils.addDays(DateUtils.addDays("2026-01-01", 7), -7) === "2026-01-01"
);


// ---------------------------------------------------------------
console.log("3. addDays: 不正入力はクラッシュせず今日の日付キーを返す");
// ---------------------------------------------------------------
const todayKey = DateUtils.localDateKey();
check("不正文字列 'invalid' → 今日の日付キー", DateUtils.addDays("invalid", 1) === todayKey);
check("空文字 '' → 今日の日付キー", DateUtils.addDays("", 1) === todayKey);
check("null → 今日の日付キー", DateUtils.addDays(null, 1) === todayKey);
check("undefined → 今日の日付キー", DateUtils.addDays(undefined, 1) === todayKey);
check("不正入力でも YYYY-MM-DD 形式を保つ", /^\d{4}-\d{2}-\d{2}$/.test(DateUtils.addDays("invalid", 1)));
check("要素数不足 ('2026-01') → 今日の日付キー", DateUtils.addDays("2026-01", 1) === todayKey);
check("数値のみ ('2026') → 今日の日付キー", DateUtils.addDays("2026", 1) === todayKey);

// ---------------------------------------------------------------
console.log("4. diffDays: 2つの日付キーの日数差");
// ---------------------------------------------------------------
check("2026-01-01 → 2026-01-05 = 4日", DateUtils.diffDays("2026-01-01", "2026-01-05") === 4);
check("2026-01-05 → 2026-01-01 = -4日 (負)", DateUtils.diffDays("2026-01-05", "2026-01-01") === -4);
check("同一日 = 0日", DateUtils.diffDays("2026-01-01", "2026-01-01") === 0);
check("月末跨ぎ 2026-01-31 → 2026-02-01 = 1日", DateUtils.diffDays("2026-01-31", "2026-02-01") === 1);
check("年跨ぎ 2026-12-31 → 2027-01-01 = 1日", DateUtils.diffDays("2026-12-31", "2027-01-01") === 1);
check("うるう年 2028-02-28 → 2028-03-01 = 2日", DateUtils.diffDays("2028-02-28", "2028-03-01") === 2);
check("addDays と diffDays が整合 (7日)", DateUtils.diffDays("2026-01-01", DateUtils.addDays("2026-01-01", 7)) === 7);
check("addDays と diffDays が整合 (365日)", DateUtils.diffDays("2026-01-01", DateUtils.addDays("2026-01-01", 365)) === 365);

// diffDays の要素数チェックは length のみなので、3要素でない場合は 0
check("要素数不足の fromKey は 0 を返す (クラッシュ防止)", DateUtils.diffDays("2026-01", "2026-01-05") === 0);
check("要素数不足の toKey は 0 を返す (クラッシュ防止)", DateUtils.diffDays("2026-01-01", "2026-01") === 0);


// ---------------------------------------------------------------
console.log("5. datePartOf: ISO日時文字列の日付部分を取り出す");
// ---------------------------------------------------------------
check("ISO日時 '2026-09-01T00:00:00.000Z' → '2026-09-01'", DateUtils.datePartOf("2026-09-01T00:00:00.000Z") === "2026-09-01");
check("ISO日時 '2026-09-01T23:59:59Z' → '2026-09-01'", DateUtils.datePartOf("2026-09-01T23:59:59Z") === "2026-09-01");
check("日付のみ '2026-09-01' → '2026-09-01'", DateUtils.datePartOf("2026-09-01") === "2026-09-01");
check("文字列以外 (null) → ''", DateUtils.datePartOf(null) === "");
check("文字列以外 (undefined) → ''", DateUtils.datePartOf(undefined) === "");
check("長さ不足 ('2026') → ''", DateUtils.datePartOf("2026") === "");
check("空文字 → ''", DateUtils.datePartOf("") === "");

// ---------------------------------------------------------------
console.log("6. 相互運用: addDays / diffDays / localDateKey の整合");
// ---------------------------------------------------------------
const base = "2026-09-01";
const next = DateUtils.addDays(base, 1);
const prev = DateUtils.addDays(base, -1);
check("明日 - 今日 = 1", DateUtils.diffDays(base, next) === 1);
check("今日 - 明日 = -1", DateUtils.diffDays(next, base) === -1);
check("今日 - 昨日 = 1", DateUtils.diffDays(prev, base) === 1);
check("addDays は結果を YYYY-MM-DD 形式で返す", /^\d{4}-\d{2}-\d{2}$/.test(next) && /^\d{4}-\d{2}-\d{2}$/.test(prev));

// 30日跨度で往復しても必ず一致
check(
  "30日跨度でも往復一致",
  DateUtils.diffDays(base, DateUtils.addDays(base, 30)) === 30 &&
    DateUtils.diffDays(DateUtils.addDays(base, 30), base) === -30
);

// ---------------------------------------------------------------
console.log("\n==========================================");
console.log(`DateUtils tests: ${passCount} assertions passed.`);
console.log("==========================================");
