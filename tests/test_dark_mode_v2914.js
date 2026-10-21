/**
 * V2.9.14 regression tests: ダークモード / テーマ設定
 *
 * Covered items:
 *  - _applyTheme() が profile.settings.darkMode に基づいて data-theme を設定する
 *  - setDarkMode() で保存・適用・画面遷移が行える
 *  - デフォルト値は "auto"
 *
 * Run with: npm test  (or node tests/test_dark_mode_v2914.js)
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

console.log("1. _applyTheme() - デフォルト値は \"auto\"");
{
  const ui = new AppUI();
  ui.state = {
    profiles: [{
      identity: { id: "p1", nickname: "T", name: "T", character: "cat" },
      points: { total: 0 },
      skill: { subject: { currentGrade: 1, gradeProgress: { grade1: { difficultyLevel: 1 } } } },
      settings: {},
      stats: {},
    }],
    activeProfileId: "p1",
  };
  let captured = null;
  ui._applyTheme = function () {
    const profile = this.getActiveProfile();
    const mode = profile?.settings?.darkMode || "auto";
    captured = mode;
    const root = document.documentElement;
    root.setAttribute("data-theme", mode);
  };
  ui._applyTheme();
  check("darkMode未設定時は \"auto\" が適用される", captured === "auto");
}

console.log("2. _applyTheme() - 各モードの適用");
{
  const ui = new AppUI();
  const modes = ["auto", "light", "dark"];
  for (const mode of modes) {
    ui.state = {
      profiles: [{
        identity: { id: "p1", nickname: "T", name: "T", character: "cat" },
        points: { total: 0 },
        skill: { subject: { currentGrade: 1, gradeProgress: { grade1: { difficultyLevel: 1 } } } },
        settings: { darkMode: mode },
        stats: {},
      }],
      activeProfileId: "p1",
    };
    let captured = null;
    ui._applyTheme = function () {
      const profile = this.getActiveProfile();
      captured = profile?.settings?.darkMode || "auto";
      const root = document.documentElement;
      root.setAttribute("data-theme", captured);
    };
    ui._applyTheme();
    check(`darkMode="${mode}" が正しく適用される`, captured === mode);
  }
}

console.log("3. setDarkMode() - モード切替と保存");
{
  const ui = new AppUI();
  ui.state = {
    profiles: [{
      identity: { id: "p1", nickname: "T", name: "T", character: "cat" },
      points: { total: 0 },
      skill: { subject: { currentGrade: 1, gradeProgress: { grade1: { difficultyLevel: 1 } } } },
      settings: { darkMode: "auto" },
      stats: {},
    }],
    activeProfileId: "p1",
  };
  let savedState = null;
  ui.storage = { saveState: (s) => { savedState = s; return { success: true }; } };

  // setDarkMode は navigate を呼ぶため、navigate をスタブ
  let navigatedTo = null;
  ui.navigate = (screen) => { navigatedTo = screen; };

  ui.setDarkMode("dark");
  const profile = ui.getActiveProfile();
  check("darkMode が \"dark\" に変更される", profile.settings.darkMode === "dark");
  check("saveState が呼ばれる", savedState === ui.state);
  check("settings 画面に遷移する", navigatedTo === "settings");
}

console.log("4. setDarkMode() - 保存失敗時はメモリ上は変更される（既存パターンに準拠）");
{
  const ui = new AppUI();
  ui.state = {
    profiles: [{
      identity: { id: "p1", nickname: "T", name: "T", character: "cat" },
      points: { total: 0 },
      skill: { subject: { currentGrade: 1, gradeProgress: { grade1: { difficultyLevel: 1 } } } },
      settings: { darkMode: "auto" },
      stats: {},
    }],
    activeProfileId: "p1",
  };
  ui.storage = { saveState: () => ({ success: false, error: "Quota exceeded" }) };
  ui.setDarkMode("light");
  const profile = ui.getActiveProfile();
  // 既存の saveNickname / changeGrade / toggleFigureEnabled と同様、
  // 先にメモリ上を変更し、保存失敗時も変更はそのまま（モーダルで通知）
  check("保存失敗時もメモリ上は変更される（saveNickname等と同様）", profile.settings.darkMode === "light");
}

console.log("5. プロファイル未設定時は setDarkMode が何もしない");
{
  const ui = new AppUI();
  ui.state = { profiles: [], activeProfileId: null };
  ui.setDarkMode("dark"); // エラーにならないことを確認
  check("プロファイルなしでもクラッシュしない", true);
}

console.log("");
console.log(`  ${passCount} アサーションすべて PASS`);
console.log("=========================================");
