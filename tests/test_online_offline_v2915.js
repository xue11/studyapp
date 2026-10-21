/**
 * V2.9.15 regression tests: オンライン/オフライン表示
 *
 * Covered items:
 *  - _isOnline が初期化される
 *  - _updateOnlineStatus() で状態が切り替わる
 *
 * Run with: npm test  (or node tests/test_online_offline_v2915.js)
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
// Node.js v24 に navigator が既定存在する可能性があるため上書き
try { Object.defineProperty(global, "navigator", { value: { onLine: true }, writable: true, configurable: true }); } catch (e) { global.navigator = { onLine: true }; }
global.window = global;

require(path.join(ROOT, "js/config.js"));
const { AppUI } = require(path.join(ROOT, "js/ui.js"));

console.log("1. _isOnline 初期化");
{
  const ui = new AppUI();
  check("_isOnline が true に初期化される", ui._isOnline === true);
}

console.log("2. _updateOnlineStatus() で状態が切り替わる");
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

  // render() をスタブして呼ばれることを確認
  let renderCalled = 0;
  ui.render = () => { renderCalled++; };

  ui._updateOnlineStatus(false);
  check("_isOnline が false に変更される", ui._isOnline === false);
  check("render() が呼ばれる", renderCalled === 1);

  ui._updateOnlineStatus(true);
  check("_isOnline が true に戻る", ui._isOnline === true);
  check("render() が再度呼ばれる", renderCalled === 2);
}

console.log("");
console.log(`  ${passCount} アサーションすべて PASS`);
console.log("=========================================");
