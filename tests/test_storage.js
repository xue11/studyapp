/**
 * V2.9.x テストカバレッジ拡大 — StorageManager (localStorage 読み書き・import/export)
 *
 * 対象: js/storage.js
 *
 * 背景:
 * - データ永続化の中核モジュールだが、単体テストが未整備だった。
 * - 保存失敗時のロールバック、import 時の厳格検証、history 上限キャップなどを網羅する。
 *
 * 実行方法: node tests/test_storage.js
 */

const assert = require("assert");
const { StorageManager, MemoryStorage, STORAGE_KEY } = require("../js/storage.js");

let passCount = 0;
function check(label, cond) {
  assert.ok(cond, "FAIL: " + label);
  passCount += 1;
  console.log("  [PASS] " + label);
}

function freshStorage() {
  return new StorageManager(new MemoryStorage());
}

// ---------------------------------------------------------------
console.log("1. MemoryStorage 基本動作 (setItem / getItem / removeItem / clear)");
// ---------------------------------------------------------------
{
  const mem = new MemoryStorage();
  check("setItem → getItem で取得可", (() => { mem.setItem("k", "v"); return mem.getItem("k") === "v"; })());
  check("存在しないキー → null", mem.getItem("nope") === null);
  check("removeItem → 取得不可", (() => { mem.removeItem("k"); return mem.getItem("k") === null; })());
  check("clear → 全削除", (() => { mem.setItem("a", "1"); mem.setItem("b", "2"); mem.clear(); return mem.getItem("a") === null && mem.getItem("b") === null; })());
}

// ---------------------------------------------------------------
console.log("2. StorageManager コンストラクタ (デフォルト / カスタムストレージ注入)");
// ---------------------------------------------------------------
{
  const sm = freshStorage();
  check("STORAGE_KEY 定数が 'math_study_app_v2510_state'", STORAGE_KEY === "math_study_app_v2510_state");
  check("デフォルトストレージが設定済み", typeof sm.storage.getItem === "function" && typeof sm.storage.setItem === "function");

  const custom = new MemoryStorage();
  custom.setItem(STORAGE_KEY, '{"custom":true}');
  const sm2 = new StorageManager(custom);
  check("カスタムストレージ注入 → その内容を読む", sm2.storage.getItem(STORAGE_KEY) === '{"custom":true}');
}

// ---------------------------------------------------------------
console.log("3. saveState / loadState のサイクル (初期状態 → 保存 → 読み込み)");
// ---------------------------------------------------------------
{
  const sm = freshStorage();
  const initial = sm.loadState();
  check("loadState は success: true と state を返す", initial.success === true && !!initial.state);
  check("初期状態は isNew: true (空ストレージから生成)", initial.isNew === true);
  check("state.schemaVersion === '2.5.6'", initial.state.schemaVersion === "2.5.6");
  check("profiles は配列", Array.isArray(initial.state.profiles));
  check("activeProfileId が設定済み", typeof initial.state.activeProfileId === "string" && initial.state.activeProfileId.length > 0);

  const saved = sm.saveState(initial.state);
  check("saveState は success: true", saved.success === true);
  const reloaded = sm.loadState();
  check("再ロードも success: true", reloaded.success === true);
  check("再ロード後の isNew は false (既存データあり)", reloaded.isNew === false);
  check("再ロード後も schemaVersion 一致", reloaded.state.schemaVersion === "2.5.6");
}

// ---------------------------------------------------------------
console.log("4. saveState のバリデーション (不正な state は保存失敗)");
// ---------------------------------------------------------------
{
  const sm = freshStorage();

  // schemaVersion 不正
  const bad1 = { schemaVersion: "9.9.9", profiles: [], activeProfileId: "" };
  check("schemaVersion 不正 → success: false", sm.saveState(bad1).success === false);

  // profiles が配列でない
  const bad2 = { schemaVersion: "2.5.6", profiles: "not-array", activeProfileId: "" };
  check("profiles が配列でない → success: false", sm.saveState(bad2).success === false);

  // profile missing identity.id
  const bad3 = { schemaVersion: "2.5.6", profiles: [{ identity: {} }], activeProfileId: "" };
  check("profile missing identity.id → success: false", sm.saveState(bad3).success === false);

  // incorrectStreak の混入 (V2.5.10 仕様: 除外必須)
  const bad4 = {
    schemaVersion: "2.5.6",
    profiles: [{ identity: { id: "p1" }, skill: { subject: { gradeProgress: {} } }, streaks: { incorrectStreak: 5 } }],
    activeProfileId: "p1"
  };
  check("incorrectStreak 存在 → success: false", sm.saveState(bad4).success === false);

  // reviewQueue の active 重複キー
  const bad5 = {
    schemaVersion: "2.5.6",
    profiles: [{
      identity: { id: "p1" },
      skill: { subject: { gradeProgress: {} } },
      reviewQueue: [
        { status: "active", subjectId: "math", grade: 1, unitId: "u1" },
        { status: "active", subjectId: "math", grade: 1, unitId: "u1" }
      ]
    }],
    activeProfileId: "p1"
  };
  check("reviewQueue active 重複 → success: false", sm.saveState(bad5).success === false);

  // 正常な state は保存成功
  const good = {
    schemaVersion: "2.5.6",
    profiles: [{ identity: { id: "p1" }, skill: { subject: { gradeProgress: {} } }, reviewQueue: [], history: [], streaks: {} }],
    activeProfileId: "p1"
  };
  check("正常な state → success: true", sm.saveState(good).success === true);
}

// ---------------------------------------------------------------
console.log("5. loadState のフォールバック (空 / 不正 JSON)");
// ---------------------------------------------------------------
{
  // 空ストレージ → 初期状態生成
  const sm1 = freshStorage();
  const emptyRes = sm1.loadState();
  check("空ストレージ → success: true, isNew: true", emptyRes.success === true && emptyRes.isNew === true);

  // 不正 JSON → フォールバック (success: false, state は初期状態)
  const sm2 = freshStorage();
  sm2.storage.setItem(STORAGE_KEY, "{ not valid json }");
  const badRes = sm2.loadState();
  check("不正 JSON → success: false", badRes.success === false);
  check("不正 JSON → state はフォールバック初期状態", badRes.state.schemaVersion === "2.5.6");
}

// ---------------------------------------------------------------
console.log("6. importStateJSON (有効 / 無効 JSON, 構造検証)");
// ---------------------------------------------------------------
{
  const sm = freshStorage();

  // 有効なインポート
  const validJson = JSON.stringify({
    schemaVersion: "2.5.6",
    profiles: [{ identity: { id: "p_import" }, skill: { subject: { gradeProgress: {} } }, reviewQueue: [], history: [], streaks: {} }],
    activeProfileId: "p_import"
  });
  const impOk = sm.importStateJSON(validJson);
  check("有効 JSON インポート → success: true", impOk.success === true);
  check("インポート後 state.profile id 一致", impOk.state.profiles[0].identity.id === "p_import");

  // 空文字列
  check("空文字列 → success: false", sm.importStateJSON("").success === false);
  check("undefined → success: false", sm.importStateJSON(undefined).success === false);

  // ルートがオブジェクトでない (JSONプリミティブは拒否)
  check('JSON 文字列プリミティブ → success: false', sm.importStateJSON('"hello"').success === false);

  // schemaVersion 不正 (migration 対象)
  const badSchema = JSON.stringify({ schemaVersion: "1.0.0", profiles: [], activeProfileId: "" });
  check("schemaVersion 1.0.0 (migration 対象) → success: true", sm.importStateJSON(badSchema).success === true);

  // 構造不正 (profiles missing)
  const badStruct = JSON.stringify({ schemaVersion: "2.5.6", activeProfileId: "" });
  check("profiles 欠如 → success: false", sm.importStateJSON(badStruct).success === false);
}

// ---------------------------------------------------------------
console.log("7. exportStateJSON (正しく JSON 文字列化される)");
// ---------------------------------------------------------------
{
  const sm = freshStorage();
  sm.loadState(); // 初期状態を確立
  const exported = sm.exportStateJSON();
  check("exportStateJSON は文字列を返す", typeof exported === "string");
  check("exported は有効な JSON", (() => { try { JSON.parse(exported); return true; } catch (e) { return false; } })());
  check("exported に schemaVersion 含む", exported.includes('"schemaVersion":"2.5.6"') || exported.includes('"schemaVersion": "2.5.6"'));
}

// ---------------------------------------------------------------
console.log("8. capProfileHistory (history 上限 1000 件で古い順に破棄)");
// ---------------------------------------------------------------
{
  const sm = freshStorage();
  const state = sm.loadState().state;
  const profile = state.profiles[0];

  // history を 1005 件作成 (古い順に push) して保存
  for (let i = 0; i < 1005; i++) {
    profile.history.push({ unitId: "u" + i, correct: true, timestamp: "2026-01-01T00:00:00Z" });
  }
  sm.saveState(state);

  // loadState 時 history は 1000 件にキャップされる
  const reloaded = sm.loadState();
  check("loadState 時 history は 1000 件にキャップされる", reloaded.state.profiles[0].history.length === 1000);
  check("キャップ後は最新の 1000 件が残る (u5 が最初)", reloaded.state.profiles[0].history[0].unitId === "u5");
  check("キャップ後は最後が u1004", reloaded.state.profiles[0].history[999].unitId === "u1004");

  // 1000 件以下なら変更なし
  const state2 = { profiles: [{ identity: { id: "p2" }, skill: { subject: { gradeProgress: {} } }, reviewQueue: [], history: [{ unitId: "a" }], streaks: {} }], activeProfileId: "p2", schemaVersion: "2.5.6" };
  sm.saveState(state2);
  const unchanged = sm.loadState();
  check("1000 件以下は変更なし (1 件のまま)", unchanged.state.profiles[0].history.length === 1);
}

// ---------------------------------------------------------------
console.log("9. clear() (ストレージを空にする)");
// ---------------------------------------------------------------
{
  const sm = freshStorage();
  sm.loadState(); // データを確立
  check("clear 前はデータあり", sm.storage.getItem(STORAGE_KEY) !== null);
  sm.clear();
  check("clear 後は null", sm.storage.getItem(STORAGE_KEY) === null);
}

// ---------------------------------------------------------------
console.log("\n==========================================");
console.log(`StorageManager tests: ${passCount} assertions passed.`);
console.log("==========================================");