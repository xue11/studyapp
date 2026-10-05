/**
 * V2.9.7 回帰テスト — DateUtils (JST日付) + history 上限キャップ
 *
 * 対応する修正:
 *  - P1-2: `toISOString().split("T")[0]` (UTC基準) を廃止し DateUtils.localDateKey()
 *    (JST基準) に統一。JST 0〜9時台の学習が「昨日」扱いになる不具合の回帰防止。
 *  - P1-3: profile.history を config.common.historyLimit (既定1000件) に上限付き。
 *    session_coordinator の push 後キャップと storage の loadState/import キャップを検証。
 *  - P1-1: ui.js._saveOrAlert / test_engine の saveRes チェックの存在確認。
 */

const assert = require("assert");

const { DateUtils } = require("../js/date_utils.js");
const { APP_CONFIG } = require("../js/config.js");
const { StorageManager, MemoryStorage } = require("../js/storage.js");
const { LearningEngine } = require("../js/learning_engine.js");
const { SessionCoordinator } = require("../js/session_coordinator.js");

let passCount = 0;
function check(label, cond) {
  assert.ok(cond, "FAIL: " + label);
  passCount += 1;
  console.log("  [PASS] " + label);
}

// ---------------------------------------------------------------
console.log("1. DateUtils.localDateKey は JST 基準 (UTC基準との差の検証)");
// ---------------------------------------------------------------
const key = DateUtils.localDateKey();
check("YYYY-MM-DD 形式", /^\d{4}-\d{2}-\d{2}$/.test(key));

// 2026-01-01T16:30:00Z = JST 2026-01-02 01:30 → JST では翌日
const utcBoundary = new Date("2026-01-01T16:30:00Z");
check(
  "UTC 16:30 = JST 翌日01:30 → localDateKey は 2026-01-02 (toISOString は 2026-01-01)",
  DateUtils.localDateKey(utcBoundary) === "2026-01-02" &&
    utcBoundary.toISOString().split("T")[0] === "2026-01-01"
);
// UTC 14:59 = JST 23:59 = 同日 / UTC 15:00 = JST 翌日00:00 が境界
const utcSameDay = new Date("2026-01-01T14:59:00Z");
check("UTC 14:59 = JST 23:59 → 2026-01-01", DateUtils.localDateKey(utcSameDay) === "2026-01-01");
check("UTC 15:00 = JST 翌日00:00 → 2026-01-02", DateUtils.localDateKey(new Date("2026-01-01T15:00:00Z")) === "2026-01-02");

// ---------------------------------------------------------------
console.log("2. DateUtils.addDays / diffDays (月・年・うるう年境界)");
// ---------------------------------------------------------------
check("2026-12-31 + 1 = 2027-01-01", DateUtils.addDays("2026-12-31", 1) === "2027-01-01");
check("2027-01-01 - 1 = 2026-12-31", DateUtils.addDays("2027-01-01", -1) === "2026-12-31");
check("2028-02-28 + 1 = 2028-02-29 (うるう年)", DateUtils.addDays("2028-02-28", 1) === "2028-02-29");
check("addDays 7日分を diffDays で戻すと 7", DateUtils.diffDays("2026-01-01", DateUtils.addDays("2026-01-01", 7)) === 7);
check("不正な日付キーでもクラッシュしない", /^\d{4}-\d{2}-\d{2}$/.test(DateUtils.addDays("invalid", 1)));
check("datePartOf は ISO 日時の先頭10桁を返す", DateUtils.datePartOf("2026-09-01T00:00:00.000Z") === "2026-09-01");

// ---------------------------------------------------------------
console.log("3. LearningEngine.updateDailyStreak が昨日→今日の連続を正しく伸ばす");
// ---------------------------------------------------------------
const todayKey = DateUtils.localDateKey();
const yesterdayKey = DateUtils.addDays(todayKey, -1);
const prof = {
  streaks: { dailyStreak: 2, bestDailyStreak: 5, lastStudyDate: yesterdayKey }
};
const streakRes = LearningEngine.updateDailyStreak(prof, todayKey);
check("昨日の続き → dailyStreak 3", streakRes.dailyStreak === 3);
check("bestDailyStreak は 5 のまま", streakRes.bestDailyStreak === 5);

// 前回学習が「2日前」→ リセット (addDays のオフセットが正しいことの間接検証)
const prof2 = { streaks: { dailyStreak: 4, lastStudyDate: DateUtils.addDays(todayKey, -2) } };
const streakRes2 = LearningEngine.updateDailyStreak(prof2, todayKey);
check("2日前の学習 → dailyStreak 1 にリセット", streakRes2.dailyStreak === 1);

// ---------------------------------------------------------------
console.log("4. P1-3: storage.loadState() で history が上限に丸められる");
// ---------------------------------------------------------------
const LIMIT = (APP_CONFIG.common && APP_CONFIG.common.historyLimit) || 1000;
check("config.common.historyLimit = 1000", LIMIT === 1000);

const memStore = new MemoryStorage();
const mgr = new StorageManager(memStore);
const st = mgr.loadState().state;
const rec = (i) => ({
  questionInstanceId: "q" + i,
  templateId: "g1_basic_add_01",
  subjectId: "math",
  grade: 1,
  unitId: "add_1digit_no_carry",
  completedAt: "2026-09-01T00:00:00.000Z",
  correct: true,
  attemptCount: 1,
  usedHint: false,
  learningScore: 1,
  pointsEarned: 10
});
for (let i = 0; i < 1500; i++) st.profiles[0].history.push(rec(i));
const saveRes = mgr.saveState(st);
check("1500件の状態が保存できる", saveRes.success === true);
const loaded = mgr.loadState();
check("loadState 成功", loaded.success === true);
const loadedHist = loaded.state.profiles[0].history;
check(
  "1500件 → 上限" + LIMIT + "件に丸め (古い順に破棄され先頭が q500 / 末尾が q1499)",
  loadedHist.length === LIMIT &&
    loadedHist[0].questionInstanceId === "q500" &&
    loadedHist[LIMIT - 1].questionInstanceId === "q1499"
);

// ---------------------------------------------------------------
console.log("5. P1-3: SessionCoordinator.push 後に history を上限内に収める");
// ---------------------------------------------------------------
const memStore2 = new MemoryStorage();
const mgr2 = new StorageManager(memStore2);
const st2 = mgr2.loadState().state;
const profB = st2.profiles[0];
// historyLimit を 5 に絞った設定を合成 (他設定はそのまま)
const cfg = JSON.parse(JSON.stringify(APP_CONFIG));
cfg.common.historyLimit = 5;
for (let i = 0; i < 5; i++) profB.history.push(rec(i)); // 上限ちょうどまで事前投入

const coordRes = SessionCoordinator.completeQuestionAtomic({
  appState: st2,
  questionInstance: {
    questionInstanceId: "q_cap_01",
    templateId: "g1_basic_add_01",
    grade: 1,
    difficultyLevel: 1,
    unitId: "add_1digit_no_carry",
    conceptId: "add_basic"
  },
  answerResult: { correct: true, attemptCount: 1, hintUsed: false, completed: true },
  config: cfg,
  storageManager: mgr2,
  localDateString: todayKey
});
check("completeQuestionAtomic 成功", coordRes.success === true);
const coordHist = coordRes.nextState.profiles[0].history;
check("push 後も history は上限5件以内 (古い q0 が破棄済み)", coordHist.length === 5);
check("先頭が 2番目に古い q1 (古い順に1件破棄)", coordHist[0].questionInstanceId === "q1");
check("末尾が今回完了した q_cap_01", coordHist[4].questionInstanceId === "q_cap_01");

// ---------------------------------------------------------------
console.log("6. P1-1: 保存失敗ハンドラの実在確認");
// ---------------------------------------------------------------
const fs = require("fs");
const path = require("path");
const uiSrc = fs.readFileSync(path.join(__dirname, "..", "js", "ui.js"), "utf8");
check("ui.js に _saveOrAlert ヘルパーが定義されている", /_saveOrAlert\(\)\s*\{/.test(uiSrc));
// ヘルパー本体を除いた範囲に、素の saveState 呼び出し（戻り値無視）が残っていないこと
const uiWithoutHelper = uiSrc.replace(/_saveOrAlert\(\)\s*\{[\s\S]*?\n  \}/, "");
check(
  "ui.js の保存呼び出しが _saveOrAlert 経由 (素の saveState 呼び出しは残っていない)",
  !/this\.storage\.saveState\(this\.state\);/.test(uiWithoutHelper)
);
check("_saveOrAlert の呼び出し回数が7箇所 (P1-1 対象)", (uiSrc.match(/if \(!this\._saveOrAlert\(\)\) return;/g) || []).length >= 7);
const teSrc = fs.readFileSync(path.join(__dirname, "..", "js", "test_engine.js"), "utf8");
check("test_engine.js が saveRes.success を検査している", /saveRes\.success/.test(teSrc));

// ---------------------------------------------------------------
console.log("\n==========================================");
console.log(`V2.9.7 Date/History tests: ${passCount} assertions passed.`);
console.log("==========================================");

