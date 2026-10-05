/**
 * 時計問題 (answerType: "clock_input") 自動テスト — V2.6.8
 * Run with: node tests/test_clock.js
 *
 * 検証項目:
 *  1. ClockSVG 公開APIと針の角度計算
 *  2. 時計テンプレート4件 (G2) + 4件 (G3) の登録 (answerType: clock_input / clockSpec 付き)
 *  3. 大量生成 + QuestionValidator 検証 + clockHTML / clockFields / answer の付与
 *  4. 回答の正規化・比較 (formatHMS / equalsAnswer / answerLabel) + HhM 形式
 *  5. AppUI の時計入力UI (_renderClockInputs / _readClockAnswer / _clockSelectionDisplay)
 *  6. AppUI 学習画面が時計図・時計入力欄を含むこと
 *  7. 回答判定 (AppUI._checkAnswer / _formatAnswerLabel / TestEngine._checkAnswer)
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

const { ClockSVG } = require("../js/clock_svg.js");
global.ClockSVG = ClockSVG; // window.ClockSVG 相当 (ui.js は window.ClockSVG を参照)

const { TemplateRegistry } = require("../js/registries.js");
const { QuestionValidator } = require("../js/validator.js");
const { RuleBasedQuestionSource } = require("../js/question_source.js"); // 内部で templates_clock.js を読込
const { AppUI } = require("../js/ui.js");
const { TestEngine } = require("../js/test_engine.js");

const CLOCK_TEMPLATE_IDS = [
  "g2_clock_read_01",       // H:M  (時計1つ・大)
  "g2_clock_read_02",       // H:M:S (時計1つ・大・秒まで)
  "g2_clock_elapsed_01",    // M    (時計2つ・小・横並び)
  "g2_clock_time_after_01", // H:M  (時計1つ・大)
  // V2.6.8: 3年生 (time_unit)
  "g3_clock_read_24_01",     // H:M  (24時間表記・大・show24)
  "g3_clock_time_after_h_01", // H:M  (何時間後・大・show24)
  "g3_clock_elapsed_hm_01",   // HhM  (時間差・時計2つ・小)
  "g3_clock_to_minutes_01",   // M    (単位変換・大)
];

let pass = 0, fail = 0;
function check(name, cond) {
  if (cond) { pass++; console.log("  [PASS] " + name); }
  else { fail++; console.log("  [FAIL] " + name); }
}

console.log("=== V2.6.8 時計問題 (clock_input) tests ===\n");

// ---------------------------------------------------------------
console.log("1. ClockSVG 公開APIと針の角度");
// ---------------------------------------------------------------
check("ClockSVG が読込済み", !!(ClockSVG && typeof ClockSVG.render === "function"));
["renderPair", "resolveClocks", "buildDisplay", "fieldsForFormat", "formatHMS", "parseHMS", "equalsAnswer", "answerLabel", "handAngles", "layoutForSize"]
  .forEach((k) => check(`ClockSVG.${k} が関数`, typeof ClockSVG[k] === "function"));

const ang = ClockSVG.handAngles(3, 40, 0);
check("短針 3時40分 = 110度 (3*30 + 40*0.5)", Math.abs(ang.hour - 110) < 1e-9);
check("長針 40分 = 240度", Math.abs(ang.minute - 240) < 1e-9);
check("秒針 0秒 = 0度", Math.abs(ang.second - 0) < 1e-9);
check("12時 = 短針0度 (12→0 正規化)", Math.abs(ClockSVG.handAngles(12, 0, 0).hour - 0) < 1e-9);
check("大きい時計は縦並び", ClockSVG.layoutForSize("large") === "vertical");
check("小さい時計は横並び", ClockSVG.layoutForSize("small") === "horizontal");

const svg1 = ClockSVG.render({ hour: 3, minute: 40, second: 0, size: "large" });
check("render が <svg> を返す", svg1.indexOf("<svg") >= 0);
check("文字盤に数字1〜12のみ表示 (13 なし)", svg1.indexOf(">13<") < 0 && svg1.indexOf(">12<") >= 0);
check("秒針要素を含む", svg1.indexOf("clock-hand-second") >= 0);
check("短針・長針のクラスも付与", svg1.indexOf("clock-hand-hour") >= 0 && svg1.indexOf("clock-hand-minute") >= 0);

// ---------------------------------------------------------------
console.log("2. 時計テンプレートの登録");
// ---------------------------------------------------------------
CLOCK_TEMPLATE_IDS.forEach((id) => {
  const t = TemplateRegistry.get(id);
  check(`${id} が登録済み`, !!t);
  if (!t) return;
  check(`${id} は clock_input`, t.answerType === "clock_input");
  check(`${id} は clockSpec を持つ`, !!(t.clockSpec && Array.isArray(t.clockSpec.clocks) && t.clockSpec.clocks.length >= 1));
  // V2.6.8: G2 は time_clock_basic / G3 は time_unit
  const expUnit = id.indexOf("g3_") === 0 ? "time_unit" : "time_clock_basic";
  check(`${id} は ${expUnit} 単位`, t.unitId === expUnit);
});
// ---------------------------------------------------------------
console.log("3. 大量生成 + 検証 + 時計表示データ");
// ---------------------------------------------------------------
CLOCK_TEMPLATE_IDS.forEach((id) => {
  const prev = [];
  let ok = 0;
  for (let i = 0; i < 10; i++) {
    const q = RuleBasedQuestionSource.generateQuestion(id, prev);
    const v = QuestionValidator.validate(q, prev);
    if (!v.valid) {
      console.log(`  [FAIL] ${id} invalid: ${JSON.stringify(v.errors).slice(0, 300)}`);
      break;
    }
    assert.ok(q.clockHTML && q.clockHTML.indexOf("<svg") >= 0, `${id}: clockHTML がSVGを含まない`);
    assert.ok(Array.isArray(q.clockFields) && q.clockFields.length >= 1, `${id}: clockFields なし`);
    assert.ok(/^(\d{1,3}(:\d{2}){0,2})$/.test(q.answer), `${id}: answer 形式異常: ${q.answer}`);
    assert.ok(typeof q.clockFormat === "string" && q.clockFormat.length > 0, `${id}: clockFormat なし`);
    assert.ok(typeof q.clockAnswerLabel === "string" && q.clockAnswerLabel.length > 0, `${id}: clockAnswerLabel なし`);
    assert.ok(q.hintSteps.length >= 2, `${id}: hintSteps不足`);
    prev.push(q);
    ok++;
  }
  check(`${id} を10問生成・検証`, ok === 10);
});

check("H:M は 時・分 の2欄", ClockSVG.fieldsForFormat("H:M").map(f => f.key).join(",") === "h,m");
check("H:M:S は 時・分・秒 の3欄", ClockSVG.fieldsForFormat("H:M:S").map(f => f.key).join(",") === "h,m,s");
check("M は 分 の1欄", ClockSVG.fieldsForFormat("M").map(f => f.key).join(",") === "m");
// V2.6.8: HhM (時間差) 形式
check("HhM は 時間・分 の2欄", ClockSVG.fieldsForFormat("HhM").map(f => f.key).join(",") === "h,m");
check('HhM のラベルは「時間」「分」', ClockSVG.fieldsForFormat("HhM").map(f => f.label).join(",") === "時間,分");

// ---------------------------------------------------------------
console.log("4. 回答の正規化・比較 (formatHMS / equalsAnswer / answerLabel)");
// ---------------------------------------------------------------
check('formatHMS(3,40,0,"H:M") = "3:40"', ClockSVG.formatHMS(3, 40, 0, "H:M") === "3:40");
check('formatHMS(3,5,0,"H:M") = "3:05" (ゼロ埋め)', ClockSVG.formatHMS(3, 5, 0, "H:M") === "3:05");
check('formatHMS(3,40,25,"H:M:S") = "3:40:25"', ClockSVG.formatHMS(3, 40, 25, "H:M:S") === "3:40:25");
check('formatHMS(0,45,0,"M") = "45"', ClockSVG.formatHMS(0, 45, 0, "M") === "45");
// V2.6.8: HhM (時間差) 形式
check('formatHMS(2,30,0,"HhM") = "2:30"', ClockSVG.formatHMS(2, 30, 0, "HhM") === "2:30");
check('answerLabel("2:30","HhM") = "2時間30分"', ClockSVG.answerLabel("2:30", "HhM") === "2時間30分");
check('answerLabel("775","M") = "775分"', ClockSVG.answerLabel("775", "M") === "775分");

check('equalsAnswer("3:40", "03:40") = true (桁数ゆれ)', ClockSVG.equalsAnswer("3:40", "03:40") === true);
check('equalsAnswer("3時40分", "3:40") = true (単位付き)', ClockSVG.equalsAnswer("3時40分", "3:40") === true);
check('equalsAnswer("３：４０", "3:40") = true (全角)', ClockSVG.equalsAnswer("３：４０", "3:40") === true);
check('equalsAnswer("3:40:00", "3:40:00") = true (秒まで)', ClockSVG.equalsAnswer("3:40:00", "3:40:00") === true);
check('equalsAnswer("4:00", "3:40") = false', ClockSVG.equalsAnswer("4:00", "3:40") === false);
check('equalsAnswer("340", "3:40") = false (コロン欠落は不一致)', ClockSVG.equalsAnswer("340", "3:40") === false);
check('equalsAnswer("", "3:40") = false (空入力)', ClockSVG.equalsAnswer("", "3:40") === false);

check('answerLabel("3:40","H:M") = "3時40分"', ClockSVG.answerLabel("3:40", "H:M") === "3時40分");
check('answerLabel("3:40:25","H:M:S") = "3時40分25秒"', ClockSVG.answerLabel("3:40:25", "H:M:S") === "3時40分25秒");
check('answerLabel("45","M") = "45分"', ClockSVG.answerLabel("45", "M") === "45分");
// ---------------------------------------------------------------
console.log("5. AppUI 時計入力UI (_renderClockInputs / _readClockAnswer / _clockSelectionDisplay)");
// ---------------------------------------------------------------
const ui = Object.create(AppUI.prototype);
check("_renderClockInputs が定義済み", typeof AppUI.prototype._renderClockInputs === "function");
check("_readClockAnswer が定義済み", typeof AppUI.prototype._readClockAnswer === "function");
check("_clockSelectionDisplay が定義済み", typeof AppUI.prototype._clockSelectionDisplay === "function");
check("syncClockDisplay が定義済み", typeof AppUI.prototype.syncClockDisplay === "function");

const qHM = {
  answerType: "clock_input",
  clockHTML: ClockSVG.render({ hour: 3, minute: 40, second: 0, size: "large" }),
  clockFormat: "H:M",
  clockFields: ClockSVG.fieldsForFormat("H:M"),
  clockAnswerLabel: "3時40分",
  answer: "3:40",
  questionText: "とけいが さす 時こくは？",
};

const inputsHTML = ui._renderClockInputs(qHM, "app.submitLearningAnswer()", "こたえる ➔");
check("時・分の入力欄が出る", inputsHTML.indexOf('id="clock-field-h"') >= 0 && inputsHTML.indexOf('id="clock-field-m"') >= 0);
check("ラベル「時」「分」が出る", inputsHTML.indexOf(">時<") >= 0 && inputsHTML.indexOf(">分<") >= 0);
check("oninput に syncClockDisplay が紐付く", inputsHTML.indexOf("app.syncClockDisplay()") >= 0);
check("submitAction がボタンに反映", inputsHTML.indexOf("app.submitLearningAnswer()") >= 0);
check("submitLabel がボタンに反映", inputsHTML.indexOf("こたえる ➔") >= 0);
// V2.6.11 (案A): OSキーボード抑止 + 専用テンキー
check("OSキーボード抑止 (readonly + inputmode=none)", inputsHTML.indexOf('readonly') >= 0 && inputsHTML.indexOf('inputmode="none"') >= 0);
check("時計専用テンキー (clock-pad-grid) を出す", inputsHTML.indexOf("clock-pad-grid") >= 0);
check("テンキーに 00 / けす / つぎ がある", inputsHTML.indexOf("app.pressClockKey('00')") >= 0 && inputsHTML.indexOf("app.clockBackspace()") >= 0 && inputsHTML.indexOf("app.clockNextField()") >= 0);
check("欄タップでフォーカス選択", inputsHTML.indexOf("app.selectClockField('h')") >= 0);
check("先頭欄が active", inputsHTML.indexOf('id="clock-wrap-h"') >= 0 || inputsHTML.indexOf("clock-field active") >= 0);
check("新メソッド群が定義済み", typeof AppUI.prototype.selectClockField === "function" && typeof AppUI.prototype.pressClockKey === "function" && typeof AppUI.prototype.clockBackspace === "function" && typeof AppUI.prototype.clockNextField === "function" && typeof AppUI.prototype.handleClockPhysicalKey === "function");

// 未入力の表示プレースホルダー
const dispEmpty = ui._clockSelectionDisplay(qHM);
check("未入力時は ？ プレースホルダー", dispEmpty.indexOf("answer-placeholder") >= 0);

// document.getElementById をモックして _readClockAnswer を検証
function withFields(values, fn) {
  const orig = global.document.getElementById;
  global.document.getElementById = (id) => (Object.prototype.hasOwnProperty.call(values, id) ? { value: values[id] } : null);
  try { return fn(); }
  finally { global.document.getElementById = orig; }
}

ui.session = null; // syncClockDisplay は session なしでも安全
const readHM = withFields({ "clock-field-h": "3", "clock-field-m": "40" }, () => ui._readClockAnswer(qHM));
check('_readClockAnswer(H:M) = "3:40"', !!readHM && readHM.answer === "3:40");
check("値の内訳も保持 (h=3, m=40)", !!readHM && readHM.values.h === "3" && readHM.values.m === "40");

const qHMS = { ...qHM, clockFormat: "H:M:S", clockFields: ClockSVG.fieldsForFormat("H:M:S"), answer: "3:40:25" };
const readHMS = withFields({ "clock-field-h": "3", "clock-field-m": "40", "clock-field-s": "25" }, () => ui._readClockAnswer(qHMS));
check('_readClockAnswer(H:M:S) = "3:40:25"', !!readHMS && readHMS.answer === "3:40:25");

const qM = { ...qHM, clockFormat: "M", clockFields: ClockSVG.fieldsForFormat("M"), answer: "45" };
const readM = withFields({ "clock-field-m": "45" }, () => ui._readClockAnswer(qM));
check('_readClockAnswer(M) = "45"', !!readM && readM.answer === "45");

const readPartial = withFields({ "clock-field-h": "", "clock-field-m": "40" }, () => ui._readClockAnswer(qHM));
check("未入力欄があると null (学習画面はモーダル表示)", readPartial === null);

// 全角数字・単位付き入力も数字だけ抽出して正規化
const readWide = withFields({ "clock-field-h": "３", "clock-field-m": "４０" }, () => ui._readClockAnswer(qHM));
check('全角入力も "3:40" へ正規化', !!readWide && readWide.answer === "3:40");

// 入力済みのとき選択中表示へ反映
const filled = withFields({ "clock-field-h": "3", "clock-field-m": "40" }, () => ui._clockSelectionDisplay(qHM, true));
check("入力済みのとき「3 時 40 分」表示", filled.indexOf("3") >= 0 && filled.indexOf("40") >= 0 && filled.indexOf("answer-placeholder") < 0);

// ---------------------------------------------------------------
console.log("6. AppUI 学習画面の描画");
// ---------------------------------------------------------------
ui.session = {
  questions: [qHM],
  currentIndex: 0,
  totalCount: 1,
  startedAt: Date.now(),
  selectedFigureChoices: [],
};
ui.currentInput = "";
const screen = ui._renderLearningScreen();
check("clock-stage コンテナを含む", screen.indexOf('class="clock-stage"') >= 0);
check("時計SVGを含む", screen.indexOf("<svg") >= 0);
check("時計入力欄を含む", screen.indexOf('id="clock-field-h"') >= 0 && screen.indexOf('id="clock-field-m"') >= 0);
// V2.6.11: 時計専用テンキー (clock-pad-grid) は出す。通常テンキー (numpad-grid) は出さない
check("時計専用テンキーを出す", screen.indexOf("clock-pad-grid") >= 0);
check("通常テンキーを出さない", screen.indexOf("numpad-grid") < 0);
check("回答表示に ？ プレースホルダー", screen.indexOf("answer-placeholder") >= 0);
// V2.6.11: 専用テンキーの入力フロー (DOMモックで pressClockKey / 削除 / 次欄)
console.log("6b. 時計専用テンキーの入力フロー");
(function () {
  const store = { "clock-field-h": "", "clock-field-m": "" };
  const origGet = global.document.getElementById;
  const origSync = ui.syncClockDisplay;
  ui.syncClockDisplay = () => {};
  global.document.getElementById = (id) => {
    if (Object.prototype.hasOwnProperty.call(store, id)) {
      return {
        get value() { return store[id]; },
        set value(v) { store[id] = String(v); },
        classList: { add() {}, remove() {} },
      };
    }
    if (id.indexOf("clock-wrap-") === 0) return { classList: { add() {}, remove() {} } };
    return null;
  };
  try {
    ui.session = {
      questions: [{ ...qHM, questionInstanceId: "q-pad-1" }],
      currentIndex: 0, totalCount: 1, selectedFigureChoices: [],
      clockFocus: undefined, clockFocusQ: undefined,
    };
    ui._clockFocus = undefined;
    ui.selectClockField("h");
    check("先頭欄 h にフォーカス", ui.session.clockFocus === "h");
    ui.pressClockKey("4");
    ui.pressClockKey("5");
    check("4→5 で時欄が2桁に (h=45, focus=m)", store["clock-field-h"] === "45" && ui.session.clockFocus === "m");
    ui.pressClockKey("3");
    check("分欄に 3 が入る", store["clock-field-m"] === "3");
    ui.clockBackspace();
    check("削除で分欄が空になる", store["clock-field-m"] === "");
    ui.clockBackspace();
    check("空欄での削除は前の欄へ戻る (focus=h, h=4)", ui.session.clockFocus === "h" && store["clock-field-h"] === "4");
    // 満杯欄への追記は次欄へ送られる
    store["clock-field-h"] = "12"; store["clock-field-m"] = "";
    ui.selectClockField("h");
    ui.pressClockKey("9");
    check("満杯欄への追記は次欄へ (m=9)", store["clock-field-m"] === "9" && store["clock-field-h"] === "12");
    // 物理キーボード: 数字・Backspace・Enter
    store["clock-field-h"] = ""; store["clock-field-m"] = "";
    ui.selectClockField("h");
    const handledDigit = ui.handleClockPhysicalKey({ key: "7", target: { tagName: "DIV" }, preventDefault() {} });
    check("物理キー 7 が処理される (h=7)", handledDigit === true && store["clock-field-h"] === "7");
    const handledBs = ui.handleClockPhysicalKey({ key: "Backspace", target: { tagName: "DIV" }, preventDefault() {} });
    check("物理キー Backspace が処理される (h=空)", handledBs === true && store["clock-field-h"] === "");
    let submitted = false;
    ui.submitLearningAnswer = () => { submitted = true; };
    ui.session.type = "learning";
    const handledEnter = ui.handleClockPhysicalKey({ key: "Enter", target: { tagName: "DIV" }, preventDefault() {} });
    check("物理キー Enter で回答確定が呼ばれる", handledEnter === true && submitted === true);
    const ignored = ui.handleClockPhysicalKey({ key: "7", target: { tagName: "INPUT" }, preventDefault() {} });
    check("入力欄フォーカス中の物理キーは無視", ignored === false);
  } finally {
    global.document.getElementById = origGet;
    ui.syncClockDisplay = origSync;
    delete ui.submitLearningAnswer;
  }
})();
// ---------------------------------------------------------------
console.log("7. 回答判定 (_checkAnswer / _formatAnswerLabel / TestEngine)");
// ---------------------------------------------------------------
check('AppUI._checkAnswer("3:40", "03:40") = true', ui._checkAnswer("3:40", "03:40") === true);
check('AppUI._checkAnswer("3時40分", "3:40") = true', ui._checkAnswer("3時40分", "3:40") === true);
check('AppUI._checkAnswer("4:00", "3:40") = false', ui._checkAnswer("4:00", "3:40") === false);
check('_formatAnswerLabel("3:40") = "3時40分"', ui._formatAnswerLabel("3:40") === "3時40分");
check('_formatAnswerLabel("45") = "45" (通常数値はそのまま)', ui._formatAnswerLabel("45") === "45");

check('TestEngine._checkAnswer("3:40","03:40","clock_input") = true',
  TestEngine._checkAnswer("3:40", "03:40", "clock_input") === true);
check('TestEngine._checkAnswer("3:40:00","3:40:00","clock_input") = true',
  TestEngine._checkAnswer("3:40:00", "3:40:00", "clock_input") === true);
check('TestEngine._checkAnswer("4:00","3:40","clock_input") = false',
  TestEngine._checkAnswer("4:00", "3:40", "clock_input") === false);
check('TestEngine._checkAnswer("10","10","clock_input") = true (M形式)',
  TestEngine._checkAnswer("10", "10", "clock_input") === true);
check('TestEngine._checkAnswer("3:40","03:40","number_input") = true (コロンでも委譲)',
  TestEngine._checkAnswer("3:40", "03:40", "number_input") === true);
check('TestEngine._checkAnswer("5","4","number_input") = false (数値判定は維持)',
  TestEngine._checkAnswer("5", "4", "number_input") === false);

// ---------------------------------------------------------------

// ---------------------------------------------------------------
console.log("8. 前の設問の時計回答が残らないこと (V2.9.6 回帰)");
// ---------------------------------------------------------------
check("_clearClockInputs が定義済み", typeof AppUI.prototype._clearClockInputs === "function");
ui.session = { questions: [{ ...qHM, questionInstanceId: "Q2" }], currentIndex: 0, clockFocus: undefined, clockFocusQ: undefined };
const q2 = { ...qHM, questionInstanceId: "Q2" };
const staleDisplay = withFields({ "clock-field-h": "3", "clock-field-m": "40" }, () => ui._clockSelectionDisplay(q2));
check("残留DOMがあると前の回答 3:40 が表示される(バグ再現)", staleDisplay.indexOf("answer-placeholder") < 0);
(function () {
const store = { "clock-field-h": "3", "clock-field-m": "40", "clock-field-s": "25", "clock-field-count": "10" };
const orig = global.document.getElementById;
global.document.getElementById = (id) => {
if (Object.prototype.hasOwnProperty.call(store, id)) {
return { get value() { return store[id]; }, set value(v) { store[id] = String(v); } };
}
return null;
};
try {
ui._clearClockInputs();
check("クリア後は時欄が空", store["clock-field-h"] === "");
check("クリア後は分欄が空", store["clock-field-m"] === "");
check("クリア後は秒欄が空", store["clock-field-s"] === "");
check("クリア後はCOUNT欄が空", store["clock-field-count"] === "");
} finally {
global.document.getElementById = orig;
}
})();
const clearedDisplay = withFields({ "clock-field-h": "", "clock-field-m": "" }, () => ui._clockSelectionDisplay(q2));
check("クリア後はプレースホルダー表示", clearedDisplay.indexOf("answer-placeholder") >= 0);
const clearedRead = withFields({ "clock-field-h": "", "clock-field-m": "" }, () => ui._readClockAnswer(q2));
check("クリア後は _readClockAnswer が null", clearedRead === null);
const currentRead = withFields({ "clock-field-h": "7", "clock-field-m": "05" }, () => ui._readClockAnswer(qHM));
check("現在の設問の値は読める", !!currentRead && currentRead.answer === "7:05");
(function () {
let calls = 0;
const origClear = ui._clearClockInputs;
const origGet = global.document.getElementById;
ui._clearClockInputs = () => { calls++; };
ui.state = { profiles: [{ identity: { id: "p1", nickname: "" }, skill: {}, stats: {} }], activeProfileId: "p1" };
ui.currentScreen = "unit_select";
global.document.getElementById = (id) => (id === "app-container" ? { innerHTML: "" } : null);
try { ui.render({}); } catch (e) {}
global.document.getElementById = origGet;
ui._clearClockInputs = origClear;
check("render() が描画前にクリアを呼ぶ", calls === 1);
})();
console.log(`\n=== Result: ${pass} passed, ${fail} failed ===`);
if (fail > 0) process.exit(1);



