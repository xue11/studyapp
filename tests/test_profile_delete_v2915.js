/**
 * V2.9.15 regression tests: プロファイル削除 UI
 *
 * Covered items:
 *  - deleteProfile() で確認モーダルが表示される
 *  - confirmDeleteProfile() でプロファイルが削除される
 *  - アクティブプロファイル削除時に最初のプロファイルに自動切替
 *  - プロファイルが0件になったらオンボーディングへ
 *  - 存在しないプロファイルIDは無視される
 *
 * Run with: npm test  (or node tests/test_profile_delete_v2915.js)
 */

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");

let passCount = 0;
function check(label, cond) {
  assert.ok(cond, "FAIL: " + label);
  passCount += 1;
  console.log("  [PASS] " + label);
}

// Minimal DOM stub
if (typeof global.window === "undefined") {
  global.window = global;
  global.document = {
    documentElement: { setAttribute: () => {}, getAttribute: () => null },
    getElementById: () => null,
    createElement: () => ({ style: {}, classList: { add() {}, remove() {} } }),
    addEventListener: () => {},
    querySelectorAll: () => [],
    querySelector: () => null,
  };
  global.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
}
global.scrollTo = global.scrollTo || (() => {});
global.Sound = global.Sound || {
  playClick: () => {}, playCorrect: () => {}, playIncorrect: () => {},
  playHint: () => {}, playFanfare: () => {}, playWrong: () => {},
};
global.StorageManager = global.StorageManager || class {
  constructor() {}
  loadState() { return { state: null, isNew: true }; }
  saveState() { return { success: true }; }
};
global.window = global;

require(path.join(ROOT, "js/config.js"));
const { AppUI } = require(path.join(ROOT, "js/ui.js"));

function makeProfile(id, nickname, name, grade = 1, active = false) {
  return {
    identity: { id, nickname, name, character: "cat" },
    points: { total: 0 },
    skill: { subject: { currentGrade: grade, gradeProgress: { grade1: { difficultyLevel: 1 } } } },
    settings: {},
    stats: {},
  };
}

console.log("1. deleteProfile() - モーダル表示");
{
  const ui = new AppUI();
  ui.state = {
    profiles: [
      makeProfile("p1", "タロウ", "たろう", 1, true),
      makeProfile("p2", "ハナコ", "はなこ", 2, false),
    ],
    activeProfileId: "p1",
  };

  let modalShown = false;
  let modalTitle = "";
  ui._showModal = (title, body, buttons) => {
    modalShown = true;
    modalTitle = title;
  };

  ui.deleteProfile("p2");
  check("モーダルが表示される", modalShown === true);
  check("モーダルタイトルが設定される", modalTitle === "プロフィールを削除しますか？");
}

console.log("2. confirmDeleteProfile() - 非アクティブプロファイル削除");
{
  const ui = new AppUI();
  ui.state = {
    profiles: [
      makeProfile("p1", "タロウ", "たろう", 1, true),
      makeProfile("p2", "ハナコ", "はなこ", 2, false),
    ],
    activeProfileId: "p1",
  };
  let saved = false;
  ui.storage = { saveState: () => { saved = true; return { success: true }; } };
  let navigatedTo = null;
  ui.navigate = (screen) => { navigatedTo = screen; };
  ui.closeModal = () => {};

  ui.confirmDeleteProfile("p2");
  check("プロファイルが削除される", ui.state.profiles.length === 1);
  check("残りは p1 のみ", ui.state.profiles[0].identity.id === "p1");
  check("saveState が呼ばれる", saved === true);
  check("profile_select に戻る", navigatedTo === "profile_select");
}

console.log("3. confirmDeleteProfile() - アクティブプロファイル削除（自動切替）");
{
  const ui = new AppUI();
  ui.state = {
    profiles: [
      makeProfile("p1", "タロウ", "たろう", 1, true),
      makeProfile("p2", "ハナコ", "はなこ", 2, false),
    ],
    activeProfileId: "p1",
  };
  let savedCount = 0;
  let savedActiveId = undefined;
  ui.storage = { saveState: () => {
    savedCount++;
    savedActiveId = ui.state.activeProfileId;
    return { success: true };
  } };
  let navigatedTo = null;
  ui.navigate = (screen) => { navigatedTo = screen; };
  ui.closeModal = () => {};

  ui.confirmDeleteProfile("p1");
  check("p1 が削除される", ui.state.profiles.length === 1);
  check("p2 がアクティブに切替される", ui.state.activeProfileId === "p2");
  check("saveState が1回呼ばれる", savedCount === 1);
  check("保存時点で activeProfileId が p2 になっている", savedActiveId === "p2");
  check("home に遷移する", navigatedTo === "home");
}

console.log("4. confirmDeleteProfile() - プロファイルが0件になったらオンボーディングへ");
{
  const ui = new AppUI();
  ui.state = {
    profiles: [makeProfile("p1", "タロウ", "たろう", 1, true)],
    activeProfileId: "p1",
  };
  let saved = false;
  let savedActiveId = undefined;
  ui.storage = { saveState: () => {
    saved = true;
    savedActiveId = ui.state.activeProfileId;
    return { success: true };
  } };
  let navigatedTo = null;
  ui.navigate = (screen) => { navigatedTo = screen; };
  ui.closeModal = () => {};

  ui.confirmDeleteProfile("p1");
  check("プロファイルが0件になる", ui.state.profiles.length === 0);
  check("activeProfileId が null になる", ui.state.activeProfileId === null);
  check("saveState が呼ばれる", saved === true);
  check("保存時点で activeProfileId が null になっている（永続化される）", savedActiveId === null);
  check("onboarding に遷移する", navigatedTo === "onboarding");
}

console.log("5. deleteProfile() - 存在しないIDは無視される");
{
  const ui = new AppUI();
  ui.state = {
    profiles: [makeProfile("p1", "タロウ", "たろう", 1, true)],
    activeProfileId: "p1",
  };
  let modalShown = false;
  ui._showModal = () => { modalShown = true; };

  ui.deleteProfile("nonexistent");
  check("モーダルが表示されない", modalShown === false);
}

console.log("");
console.log(`  ${passCount} アサーションすべて PASS`);
console.log("=========================================");
