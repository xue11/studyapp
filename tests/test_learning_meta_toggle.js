/**
 * 学習画面メタ情報トグル表示テスト (V2.9.13)
 * Run with: node tests/test_learning_meta_toggle.js
 *
 * 検証項目:
 *  1. 初期表示ではメタバッジ（単元名・出題種別・Lv）が非表示クラス付きで描画される
 *  2. ⓘトグルボタンが存在し、aria-expanded が false
 *  3. toggleQuestionMeta() で非表示⇄表示が切り替わる（session.metaOpen に反映）
 *  4. 回答操作要素（button / fig-part / input 等）のタップではトグルしない
 *  5. metaOpen = true の状態で再描画すると表示状態が維持される
 *  6. 進捗（第 X 問）とタイマーは常に表示される
 */
const assert = require("assert");

// ui.js を require するための最低限のブラウザAPIモック (tests/test_figdisplay.js と同様)
if (typeof global.window === "undefined") {
  global.window = global;
  global.document = {
    getElementById: () => null,
    createElement: () => ({ style: {}, classList: { add() {}, remove() {} } }),
    addEventListener: () => {},
  };
  global.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
}
global.Sound = global.Sound || { playClick: () => {}, playCorrect: () => {}, playWrong: () => {}, playLevelUp: () => {}, playAward: () => {} };
global.StorageManager = global.StorageManager || class { constructor() {} load() { return null; } save() {} };
global.window = global;

const { AppUI } = require("../js/ui.js");

let pass = 0, fail = 0;
function check(name, cond) {
  if (cond) { pass++; console.log("  [PASS] " + name); }
  else { fail++; console.log("  [FAIL] " + name); }
}

// DOM モック: classList を実体管理する要素
function makeEl(initialClasses) {
  const classes = new Set(initialClasses || []);
  const attrs = {};
  return {
    classList: {
      add: (c) => classes.add(c),
      remove: (c) => classes.delete(c),
      toggle: (c, force) => {
        const want = (force === undefined) ? !classes.has(c) : !!force;
        if (want) classes.add(c); else classes.delete(c);
        return want;
      },
      contains: (c) => classes.has(c),
    },
    setAttribute: (k, v) => { attrs[k] = String(v); },
    getAttribute: (k) => (k in attrs ? attrs[k] : null),
    _classes: classes,
    _attrs: attrs,
  };
}

console.log("1. 初期表示: メタバッジは非表示・トグルボタンあり");

const ui = Object.create(AppUI.prototype);
const baseQuestion = {
  questionText: "6 × 7 = ?",
  grade: 2,
  unitId: "multiplication_g2",
  problemType: "calculation",
  difficultyLevel: 2,
};

function renderScreen(sessionExtra) {
  ui.session = Object.assign({
    questions: [baseQuestion],
    currentIndex: 0,
    totalCount: 10,
    startedAt: Date.now(),
    selectedFigureChoices: [],
  }, sessionExtra || {});
  ui.currentInput = "";
  return ui._renderLearningScreen();
}

const html = renderScreen();
check("metaOpen 未設定でも描画エラーがない", typeof html === "string" && html.length > 0);
check("メタバッジが非表示クラス付きで出力される", html.indexOf('question-meta__badges--hidden') >= 0);
check("メタバッジ領域 id が出力される", html.indexOf('id="question-meta-badges"') >= 0);
check("ⓘトグルボタンが存在する", html.indexOf('id="qmeta-toggle"') >= 0 && html.indexOf("app.toggleQuestionMeta(event)") >= 0);
check("aria-expanded=false で初期化", html.indexOf('aria-expanded="false"') >= 0);
check("単元名バッジがメタ領域内に出力される", html.indexOf("multiplication") >= 0 || html.indexOf("Lv2") >= 0);
check("進捗（第 X 問）は常に表示される", html.indexOf("第 1 / 10 問") >= 0);
check("タイマー表示が常に出力される", html.indexOf('id="session-timer"') >= 0);

console.log("2. toggleQuestionMeta(): 非表示 → 表示");

const badgesEl = makeEl(["question-meta__badges", "question-meta__badges--hidden"]);
const toggleEl = makeEl(["qmeta-toggle"]);
const origGetById = global.document.getElementById;
global.document.getElementById = (id) => {
  if (id === "question-meta-badges") return badgesEl;
  if (id === "qmeta-toggle") return toggleEl;
  return null;
};

ui.session.metaOpen = false;
ui.toggleQuestionMeta({ target: null, currentTarget: null });
check("session.metaOpen が true になる", ui.session.metaOpen === true);
check("バッジの hidden クラスが除去される", !badgesEl.classList.contains("question-meta__badges--hidden"));
check("トグルボタンが active 状態になる", toggleEl.classList.contains("qmeta-toggle--on"));
check("aria-expanded=true に更新される", toggleEl.getAttribute("aria-expanded") === "true");

console.log("3. toggleQuestionMeta(): 表示 → 非表示");

ui.toggleQuestionMeta({ target: null, currentTarget: null });
check("session.metaOpen が false に戻る", ui.session.metaOpen === false);
check("バッジに hidden クラスが付与される", badgesEl.classList.contains("question-meta__badges--hidden"));
check("トグルボタンが非アクティブに戻る", !toggleEl.classList.contains("qmeta-toggle--on"));
check("aria-expanded=false に戻る", toggleEl.getAttribute("aria-expanded") === "false");

console.log("4. 回答操作要素のタップではトグルしない");

const fakeBtn = { closest: (sel) => (sel.indexOf("button") >= 0 ? fakeBtn : null) };
ui.session.metaOpen = false;
ui.toggleQuestionMeta({ target: fakeBtn, currentTarget: { } });
check("button タップでは metaOpen が変わらない", ui.session.metaOpen === false);

const fakeFigPart = { closest: (sel) => (sel.indexOf(".fig-part") >= 0 ? fakeFigPart : null) };
ui.toggleQuestionMeta({ target: fakeFigPart, currentTarget: { } });
check("fig-part タップでは metaOpen が変わらない", ui.session.metaOpen === false);

// 問題文エリア自身（question-display）のタップはトグルされる
const plainArea = { closest: () => null };
ui.toggleQuestionMeta({ target: plainArea, currentTarget: { } });
check("問題文エリアのタップではトグルする", ui.session.metaOpen === true);

// e なし呼び出し（プログラムからの直接呼び出し）も安全
ui.toggleQuestionMeta();
check("引数なし呼び出しでも安全にトグルする", ui.session.metaOpen === false);

console.log("5. metaOpen=true での再描画");

const htmlOpen = renderScreen({ metaOpen: true });
check("再描画でも表示状態が維持される（hidden クラスなし）", htmlOpen.indexOf('question-meta__badges--hidden') < 0);
check("再描画でもメタ領域が出力される", htmlOpen.indexOf('id="question-meta-badges"') >= 0);
check("再描画で aria-expanded=true", htmlOpen.indexOf('aria-expanded="true"') >= 0);
check("再描画でトグルボタンが ✕ 表示", htmlOpen.indexOf(">✕</button>") >= 0);

global.document.getElementById = origGetById;

console.log("");
console.log("=========================================");
console.log(` 学習画面メタ情報トグル: ${pass} passed / ${fail} failed`);
console.log("=========================================");
if (fail > 0) process.exit(1);
