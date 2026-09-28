/**
 * Automated Tests for Unit Practice Mode (単元選択練習機能)
 * Run with: node tests/test_unit_practice.js
 */

const assert = require("assert");

global.Sound = global.Sound || { playClick: () => {}, playCorrect: () => {}, playWrong: () => {}, playLevelUp: () => {}, playAward: () => {}, playFanfare: () => {} };
global.StorageManager = global.StorageManager || class { constructor() {} load() { return null; } save() {} };

// Load Registries first
const { UnitRegistry, TemplateRegistry } = require("../js/registries.js");
global.TemplateRegistry = TemplateRegistry;
global.UnitRegistry = UnitRegistry;
global.window = global;

// Load Core Modules
const { APP_CONFIG } = require("../js/config.js");
const { createNewProfile } = require("../js/schema.js");
const { RuleBasedQuestionSource } = require("../js/question_source.js");
global.RuleBasedQuestionSource = RuleBasedQuestionSource;
const { ClockSVG } = require("../js/clock_svg.js");
globalThis.ClockSVG = ClockSVG;
require("../js/templates_math.js");
require("../js/templates_units_p1.js");
require("../js/templates_figures_g1.js");
require("../js/templates_figures_g2.js");
require("../js/templates_clock.js");

const { AppUI } = require("../js/ui.js");

console.log("=== Running Unit Practice Mode Verification Tests ===\n");

function check(desc, cond) {
  if (cond) {
    console.log(`  [PASS] ${desc}`);
  } else {
    console.error(`  [FAIL] ${desc}`);
    process.exit(1);
  }
}

// -------------------------------------------------------------
// 1. startUnitPracticeSession の生成検証
// -------------------------------------------------------------
console.log("1. startUnitPracticeSession 実行検証 (時計: time_clock_basic)");

const mockUI = Object.create(AppUI.prototype);
mockUI.characterAvatars = { cat: "🐱", dog: "🐶", owl: "🦉", robot: "🤖", dragon: "🐲" };
mockUI.getDisplayName = function(p) { return p.identity?.name || "テスト太郎"; };
mockUI.state = {
  activeProfileId: "p_test",
  profiles: [createNewProfile("p_test", "テスト太郎", 2)]
};
mockUI.getActiveProfile = function() {
  return this.state.profiles[0];
};
mockUI.navigate = function(screen, params) {
  this.navigatedTo = screen;
  this.navigatedParams = params;
};
mockUI._startSessionTimer = function() {};
mockUI._stopSessionTimer = function() {};

// 時計単元で10問練習開始
mockUI.startUnitPracticeSession("time_clock_basic", 10, 2);

check("sessionが作成されている", !!mockUI.session);
check("session.type は learning", mockUI.session.type === "learning");
check("session.mode は unit_practice", mockUI.session.mode === "unit_practice");
check("session.targetUnitId は time_clock_basic", mockUI.session.targetUnitId === "time_clock_basic");
check("出題数が10問", mockUI.session.questions.length === 10);
check("全問が time_clock_basic 単元", mockUI.session.questions.every(q => q.unitId === "time_clock_basic"));
check("時計問題 (clock_input) が含まれる", mockUI.session.questions.some(q => q.clockHTML && q.clockHTML.includes("<svg")));
check("navigate('learning') が呼ばれた", mockUI.navigatedTo === "learning");

// -------------------------------------------------------------
// 2. 5問れんしゅう & 別学年単元 (3年: time_unit)
// -------------------------------------------------------------
console.log("\n2. startUnitPracticeSession 実行検証 (3年時計: time_unit 5問)");

mockUI.startUnitPracticeSession("time_unit", 5, 3);
check("出題数が5問", mockUI.session.questions.length === 5);
check("全問が time_unit 単元", mockUI.session.questions.every(q => q.unitId === "time_unit"));
check("全問が grade 3", mockUI.session.questions.every(q => q.grade === 3));

// -------------------------------------------------------------
// 3. 九九単元 (2年: kuku_intro 10問)
// -------------------------------------------------------------
console.log("\n3. startUnitPracticeSession 実行検証 (九九: kuku_intro 10問)");

mockUI.startUnitPracticeSession("kuku_intro", 10, 2);
check("出題数が10問", mockUI.session.questions.length === 10);
check("全問が kuku_intro 単元", mockUI.session.questions.every(q => q.unitId === "kuku_intro"));

// -------------------------------------------------------------
// 4. UI 画面描画の検証 (_renderUnitSelectScreen)
// -------------------------------------------------------------
console.log("\n4. UI描画検証 (_renderUnitSelectScreen / _renderHomeScreen)");

const unitSelectHTML = mockUI._renderUnitSelectScreen({ grade: 2 });
check("単元選択画面に「単元をえらんで練習」見出しが含まれる", unitSelectHTML.includes("単元をえらんで練習"));
check("時こくと時間のカードが含まれる", unitSelectHTML.includes("時こくと時間"));
check("かけ算のいみと九九のカードが含まれる", unitSelectHTML.includes("かけ算のいみと九九"));
check("5問れんしゅうボタンが含まれる", unitSelectHTML.includes("5問れんしゅう"));
check("10問れんしゅうボタンが含まれる", unitSelectHTML.includes("10問れんしゅう"));

const homeHTML = mockUI._renderHomeScreen(mockUI.getActiveProfile());
check("ホーム画面に「たんげんをえらんで練習」ボタンが含まれる", homeHTML.includes("たんげんをえらんで練習"));

// -------------------------------------------------------------
// 5. 結果画面描画の検証 (_renderSessionResultScreen)
// -------------------------------------------------------------
console.log("\n5. 結果画面描画検証 (特訓モード完了表示)");

const resultHTML = mockUI._renderSessionResultScreen({
  correctCount: 9,
  totalCount: 10,
  earnedPoints: 90,
  elapsedSeconds: 45,
  isPracticeMode: true,
  targetUnitName: "時こくと時間"
});

check("特訓完了タイトルが含まれる", resultHTML.includes("時こくと時間 特訓完了！"));
check("別の単元をえらぶボタンが含まれる", resultHTML.includes("別の単元をえらぶ"));

console.log("\n=== ALL UNIT PRACTICE TESTS PASSED! ===");
