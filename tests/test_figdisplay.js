/**
 * _figureSelectionDisplay 単体テスト (V2.6.3 UI統合分の回帰テスト)
 * - 図形選択問題の回答表示（選択中カードの状態を表示）
 * - 未選択 / 単一選択 / 複数選択 / 異常系（session無し・figureChoices無し）の安全確認
 *
 * 背景: V2.6.4 コミット (9be1315) に UI統合分が含まれず、
 *       「Uncaught TypeError: this._figureSelectionDisplay is not a function」が発生した。
 *       本テストはその回帰防止用。
 */
const assert = require("assert");

// ui.js を require するための最低限のブラウザAPIモック
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

// AppUI インスタンス生成（constructor を通さない軽量生成）
const ui = Object.create(AppUI.prototype);

console.log("1. メソッド定義の存在");
check("_figureSelectionDisplay が AppUI.prototype に定義済み", typeof AppUI.prototype._figureSelectionDisplay === "function");
check("toggleFigureChoice が AppUI.prototype に定義済み", typeof AppUI.prototype.toggleFigureChoice === "function");
check("_renderFigureChoices が AppUI.prototype に定義済み", typeof AppUI.prototype._renderFigureChoices === "function");

console.log("2. 未選択 → プレースホルダー表示");
ui.session = { selectedFigureChoices: [] };
const qEmpty = {
  answerType: "single_choice",
  figureChoices: [{ id: "p1", figure: { type: "triangle", params: {} }, text: "かどが3つの かたち" }],
};
const rEmpty = ui._figureSelectionDisplay(qEmpty);
check("空選択は answer-placeholder を返す", rEmpty.indexOf("answer-placeholder") >= 0);
check("空選択は ？ を含む", rEmpty.indexOf("？") >= 0);

console.log("3. 単一選択 → 選択カードのテキスト表示");
ui.session = { selectedFigureChoices: ["p2"] };
const qSingle = {
  answerType: "single_choice",
  figureChoices: [
    { id: "p1", figure: { type: "triangle", params: {} }, text: "さんかく" },
    { id: "p2", figure: { type: "quadrilateral", params: {} }, text: "しかく" },
  ],
};
check("選択カードの文を返す", ui._figureSelectionDisplay(qSingle) === "しかく");

console.log("4. 複数選択 → nこ えらんだ 表示");
ui.session = { selectedFigureChoices: ["p2", "p6"] };
const qMulti = {
  answerType: "multi_choice",
  figureChoices: [
    { id: "p2", figure: { type: "triangle", params: {} }, text: "さんかく" },
    { id: "p6", figure: { type: "circle", params: {} }, text: "えん" },
  ],
};
check("複数選択は 2こ えらんだ", ui._figureSelectionDisplay(qMulti) === "2こ えらんだ");

console.log("5. 異常系の安全性");
ui.session = null;
check("session 無しでもクラッシュしない（placeholder）",
  ui._figureSelectionDisplay({}).indexOf("answer-placeholder") >= 0);

ui.session = { selectedFigureChoices: ["p9"] };
check("figureChoices が配列でない場合も id を返す", ui._figureSelectionDisplay({}) === "p9");

ui.session = { selectedFigureChoices: ["unknown-id"] };
const qUnknown = {
  answerType: "single_choice",
  figureChoices: [{ id: "p1", figure: { type: "triangle", params: {} }, text: "さんかく" }],
};
check("存在しない選択IDは id をそのまま返す", ui._figureSelectionDisplay(qUnknown) === "unknown-id");

console.log("6. 学習画面・テスト画面の呼び出し元と整合（G2分岐を含む）");
ui.session = { selectedFigureChoices: ["g2c2", "g2c4"] };
const qG2 = {
  templateId: "g2_tri_quad_identify",
  answerType: "multi_choice",
  figureChoices: [
    { id: "g2c1", figure: { type: "triangle", params: {} }, text: "直線が 3本" },
    { id: "g2c2", figure: { type: "quadrilateral", params: {} }, text: "直線が 4本" },
    { id: "g2c4", figure: { type: "triangle", params: {} }, text: "直線が 3本" },
  ],
};
check("G2複数選択も 2こ えらんだ", ui._figureSelectionDisplay(qG2) === "2こ えらんだ");

console.log("");
console.log("=== 図形回答表示 単体テスト 結果 ===");
console.log("PASS: " + pass + " / FAIL: " + fail);
if (fail > 0) process.exit(1);
console.log("ALL FIGURE-DISPLAY TESTS PASSED!");
