/**
 * 時計問題 (answerType: "clock_input") 自動テスト — V2.6.7
 * Run with: node tests/test_clock.js
 *
 * 検証項目:
 *  1. ClockSVG 公開APIと針の角度計算
 *  2. 時計テンプレート4件の登録 (answerType: clock_input / clockSpec 付き)
 *  3. 大量生成 + QuestionValidator 検証 + clockHTML / clockFields / answer の付与
 *  4. 回答の正規化・比較 (formatHMS / equalsAnswer / answerLabel)
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
];

let pass = 0, fail = 0;
function check(name, cond) {
  if (cond) { pass++; console.log("  [PASS] " + name); }
  else { fail++; console.log("  [FAIL] " + name); }
}

console.log("=== V2.6.7 時計問題 (clock_input) tests ===\n");

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
  check(`${id} は time_clock_basic 単位`, t.unitId === "time_clock_basic");
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
    assert.ok(/^\d{1,2}(:\d{2}){0,2}$/.test(q.answer), `${id}: answer 形式異常: ${q.answer}`);
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

// ---------------------------------------------------------------
console.log("4. 回答の正規化・比較 (formatHMS / equalsAnswer / answerLabel)");
// ---------------------------------------------------------------
check('formatHMS(3,40,0,"H:M") = "3:40"', ClockSVG.formatHMS(3, 40, 0, "H:M") === "3:40");
check('formatHMS(3,5,0,"H:M") = "3:05" (ゼロ埋め)', ClockSVG.formatHMS(3, 5, 0, "H:M") === "3:05");
check('formatHMS(3,40,25,"H:M:S") = "3:40:25"', ClockSVG.formatHMS(3, 40, 25, "H:M:S") === "3:40:25");
check('formatHMS(0,45,0,"M") = "45"', ClockSVG.formatHMS(0, 45, 0, "M") === "45");

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
check("入力が数値のみに制限 (inputmode=numeric)", inputsHTML.indexOf('inputmode="numeric"') >= 0);

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
check("テンキーを出さない", screen.indexOf("numpad-grid") < 0);
check("回答表示に ？ プレースホルダー", screen.indexOf("answer-placeholder") >= 0);
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
console.log(`\n=== Result: ${pass} passed, ${fail} failed ===`);
if (fail > 0) process.exit(1);



