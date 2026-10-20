/**
 * V2.9.13 regression tests: answer guard + render() re-entrancy + mobile viewport
 *
 * Covered fixes:
 *  - P1-1: submitLearningAnswer() aborts when the session has not started or is invalid
 *  - P1-2: render() re-entrancy guard (blank screen when _renderLearningScreen() navigates)
 *  - P1-3: viewport meta no longer disables pinch-zoom (maximum-scale / user-scalable)
 *
 * Run with: npm test  (or node tests/test_p1_guard_v2913.js)
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

// Minimal DOM stub (same style as tests/test_clock.js)
if (typeof global.window === "undefined") {
  global.window = global;
  global.document = {
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
global.StorageManager = global.StorageManager || class { constructor() {} load() { return null; } save() {} };
global.window = global;

require(path.join(ROOT, "js/config.js"));
const { AppUI } = require(path.join(ROOT, "js/ui.js"));
// ---
// 1. P1-1: submitLearningAnswer() guard
// ---
console.log("1. submitLearningAnswer() guard (session not started / invalid)");
const ui = new AppUI();
ui.state = {
  profiles: [{
    identity: { id: "p1", nickname: "T", name: "T", character: "cat" },
    points: { total: 0 },
    skill: { subject: { currentGrade: 1, gradeProgress: { grade1: { difficultyLevel: 1 } } } },
    settings: { figureEnabled: false },
    stats: {},
  }],
  activeProfileId: "p1",
};

// session === null -> must not throw and must not touch state
ui.session = null;
ui.currentInput = "5";
let threw = null;
try { ui.submitLearningAnswer(); } catch (e) { threw = e; }
check("session が null でも例外を出さない", threw === null);
check("session が null でも attemptCount を増やさない", ui.session === null);

// session without questions array -> must abort
ui.session = { type: "learning", currentIndex: 0, totalCount: 10 };
threw = null;
try { ui.submitLearningAnswer(); } catch (e) { threw = e; }
check("questions 配列が無いセッションでも例外を出さない", threw === null);
check("questions 配列が無いセッションは currentAttemptCount が増えない", ui.session.currentAttemptCount === undefined);

// session with currentIndex === null -> must abort
ui.session = { type: "learning", currentIndex: null, totalCount: 10, questions: [] };
threw = null;
try { ui.submitLearningAnswer(); } catch (e) { threw = e; }
check("currentIndex が null でも例外を出さない", threw === null);
check("currentIndex が null でも attemptCount が増えない", ui.session.currentAttemptCount === undefined);

// ---
// 2. P1-2: render() re-entrancy guard (blank screen)
// ---
console.log("2. render() re-entrancy guard (no blank <main> screen)");
let rendered = "";
global.document.getElementById = (id) =>
  id === "app-container"
    ? { set innerHTML(v) { rendered = v; }, get innerHTML() { return rendered; } }
    : null;

const ui2 = new AppUI();
ui2.state = ui.state;
ui2.currentScreen = "learning";
// Broken session: no questions -> _renderLearningScreen() calls navigate("home")
ui2.session = { type: "learning", currentIndex: 0, totalCount: 10, questions: [] };
ui2.render({});
check("不正セッション描画後も currentScreen は home", ui2.currentScreen === "home");
check("<main> が空のまま残らない (空白画面の回帰防止)", !/<main class="app-content">\s*<\/main>/.test(rendered));
check("ホーム画面の内容が描画される", rendered.includes("app-content"));
check("guard が描画後に解除されている (次の描画が正常)", ui2._rendering === false);

// render() re-entrancy itself must be a no-op while already rendering
let innerCalled = 0;
ui2._renderInner = function () { innerCalled += 1; };
ui2._rendering = true;
ui2.render({});
check("再入中の render() は _renderInner を呼ばない", innerCalled === 0);
ui2._rendering = false;
ui2.render({});
check("再入していない render() は _renderInner を1回呼ぶ", innerCalled === 1);

// ---
// 3. P1-3: mobile viewport must allow pinch-zoom
// ---
console.log("3. viewport meta (pinch-zoom allowed on mobile)");
const indexHtml = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
const viewportMatch = indexHtml.match(/<meta\s+name="viewport"\s+content="([^"]*)"/i);
check("index.html に viewport meta がある", viewportMatch !== null);
const viewport = viewportMatch ? viewportMatch[1] : "";
check("viewport に maximum-scale を含まない", !/maximum-scale/i.test(viewport));
check("viewport に user-scalable=no を含まない", !/user-scalable\s*=\s*no/i.test(viewport));
check("viewport に width=device-width がある", /width\s*=\s*device-width/i.test(viewport));
check("viewport に initial-scale=1.0 がある", /initial-scale\s*=\s*1\.0/i.test(viewport));

// ---
console.log("");
console.log("PASS: " + passCount + " checks");
