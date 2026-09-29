/**
 * V2.6.12 統合検証テスト
 *  (a) DiversitySelector を ui.js の出題選択に接続したこと
 *  (b) 復習キュー / 弱点単元 → 単元特訓の直結導線
 *  (c) バージョン・アセット登録の整合
 * Run with: node tests/test_diversity_integration.js
 */

const fs = require("fs");
const path = require("path");

global.window = global;
global.Sound = global.Sound || { playClick() {}, playCorrect() {}, playWrong() {}, playLevelUp() {}, playAward() {}, playFanfare() {} };
global.StorageManager = global.StorageManager || class { constructor() {} load() { return null; } save() {} };

const registries = require("../js/registries.js");
const { UnitRegistry, TemplateRegistry } = registries;
global.TemplateRegistry = TemplateRegistry;
global.UnitRegistry = UnitRegistry;

const { APP_META, APP_CONFIG } = require("../js/config.js");
global.APP_CONFIG = APP_CONFIG;
global.APP_META = APP_META;

const { createNewProfile } = require("../js/schema.js");
const { UnitSelector } = require("../js/unit_selector.js");
global.UnitSelector = UnitSelector;
const { RuleBasedQuestionSource } = require("../js/question_source.js");
global.RuleBasedQuestionSource = RuleBasedQuestionSource;

const { ClockSVG } = require("../js/clock_svg.js");
globalThis.ClockSVG = ClockSVG;

const { DiversitySelector } = require("../js/diversity_selector.js");
global.DiversitySelector = DiversitySelector;

const { ParentDashboard } = require("../js/parent_dashboard.js");
global.ParentDashboard = ParentDashboard;

require("../js/templates_math.js");
require("../js/templates_units_p1.js");
require("../js/templates_units_p2.js");
require("../js/templates_g2_extra.js");
require("../js/templates_figures_g1.js");
require("../js/templates_figures_g2.js");
require("../js/templates_clock.js");

const { AppUI } = require("../js/ui.js");

console.log("=== Running V2.6.12 Diversity Integration Tests ===\n");

function check(desc, cond) {
  if (cond) {
    console.log(`  [PASS] ${desc}`);
  } else {
    console.error(`  [FAIL] ${desc}`);
    process.exit(1);
  }
}

function makeMockUI() {
  const ui = Object.create(AppUI.prototype);
  ui.characterAvatars = { cat: "🐱", dog: "🐶", owl: "🦉", robot: "🤖", dragon: "🐲" };
  ui.getDisplayName = function (p) { return (p && p.identity && p.identity.name) || "テスト太郎"; };
  ui.state = { activeProfileId: "p_test", profiles: [createNewProfile("p_test", "テスト太郎", 2)] };
  ui.getActiveProfile = function () { return this.state.profiles[0]; };
  ui.navigate = function (screen, params) { this.navigatedTo = screen; this.navigatedParams = params; };
  ui._startSessionTimer = function () {};
  ui._stopSessionTimer = function () {};
  return ui;
}

const mockUI = makeMockUI();

// -------------------------------------------------------------
// 1. 問題インスタンスへの story メタ伝搬 (DiversitySelector の前提)
// -------------------------------------------------------------
console.log("1. questionInstance への story / similarityGroupId 伝搬");

const wp = RuleBasedQuestionSource.generateQuestion("g1_word_add_01", []);
check("story が伝搬する", !!wp.story && wp.story.contextId === "c_g1_word_add_01");
check("similarityGroupId が伝搬する", wp.similarityGroupId === "sg_addition");
check("variationGroupId が伝搬する", wp.variationGroupId === "vg_g1_word_add_01");

const calc = RuleBasedQuestionSource.generateQuestion("g2_std_kuku_01", []);
check("story なしテンプレートは story:null", calc.story === null);
check("story なしテンプレートは similarityGroupId = templateId", calc.similarityGroupId === "g2_std_kuku_01");

// -------------------------------------------------------------
// 2. DiversitySelector が実際に呼ばれること (接続確認)
// -------------------------------------------------------------
console.log("\n2. ui.js → DiversitySelector の接続確認");

const realSelector = global.DiversitySelector;
let selectorCalls = 0;
global.DiversitySelector = {
  selectDiverseCandidate: function (candidates, history) {
    selectorCalls++;
    return realSelector.selectDiverseCandidate(candidates, history);
  }
};

mockUI.startUnitPracticeSession("kuku_intro", 10, 2);
check("単元特訓の出題時に DiversitySelector が呼ばれる", selectorCalls > 0);
check("出題数が10問", mockUI.session.questions.length === 10);
check("全問が kuku_intro 単元", mockUI.session.questions.every(q => q.unitId === "kuku_intro"));

const selectorCallsPractice = selectorCalls;
mockUI.startLearningSession();
check("通常学習の出題時も DiversitySelector が呼ばれる", selectorCalls > selectorCallsPractice);
check("通常学習でも10問生成される", mockUI.session.questions.length === 10);

// -------------------------------------------------------------
// 3. 多様性ルール: 直近1問と同一テンプレート/同一コンテキストを連続させない
// -------------------------------------------------------------
console.log("\n3. 多様性ルール (同一テンプレート・同一コンテキストの連続禁止)");

let sameTemplateAdjacent = 0;
let sameContextAdjacent = 0;
for (let run = 0; run < 20; run++) {
  mockUI.startUnitPracticeSession("kuku_intro", 10, 2);
  const qs = mockUI.session.questions;
  for (let i = 1; i < qs.length; i++) {
    if (qs[i].templateId === qs[i - 1].templateId) sameTemplateAdjacent++;
    if (qs[i].story && qs[i - 1].story && qs[i].story.contextId === qs[i - 1].story.contextId) sameContextAdjacent++;
  }
}
check("20回×10問で同一テンプレートが連続しない", sameTemplateAdjacent === 0);
check("20回×10問で同一storyコンテキストが連続しない", sameContextAdjacent === 0);
global.DiversitySelector = realSelector;

// -------------------------------------------------------------
// 4. 緩和フォールバック (テンプレート1本の単元でも問題数が確保される)
// -------------------------------------------------------------
console.log("\n4. 緩和フォールバック (テンプレート1本の単元)");

mockUI.startUnitPracticeSession("add_2digit_carry", 10, 2);
check("テンプレート1本の単元でも10問生成できる", mockUI.session.questions.length === 10);
check("全問が add_2digit_carry 単元", mockUI.session.questions.every(q => q.unitId === "add_2digit_carry"));

// 4b. 全単元 × 全学年でのロバスト性 (DiversitySelector 接続後もクラッシュしないこと)
let unitRuns = 0;
const unitFailures = [];
const seenUnits = new Set();
for (let g = 1; g <= 6; g++) {
  for (let lv = 1; lv <= 3; lv++) {
    for (const u of UnitRegistry.getUnitsForLevel("math", g, lv)) {
      const key = g + ":" + u.id;
      if (seenUnits.has(key)) continue;
      seenUnits.add(key);
      let pool = 0;
      for (let l2 = 1; l2 <= 3; l2++) pool += (TemplateRegistry.getByUnit("math", g, l2, u.id) || []).length;
      if (pool === 0) continue;
      try {
        mockUI.startUnitPracticeSession(u.id, 10, g);
        if (mockUI.session.questions.length !== 10 || !mockUI.session.questions.every(q => q.unitId === u.id)) {
          unitFailures.push(key);
        }
        unitRuns++;
      } catch (err) {
        unitFailures.push(key);
      }
    }
  }
}
check(`全${unitRuns}単元で10問特訓が生成できる (失敗: ${unitFailures.length})`, unitFailures.length === 0);

// -------------------------------------------------------------
// 5. _pickDiverseTemplate の単体挙動
// -------------------------------------------------------------
console.log("\n5. _pickDiverseTemplate 単体挙動");

const tA = { templateId: "tA", similarityGroupId: "tA" };
const tB = { templateId: "tB", similarityGroupId: "tB" };
const tC = { templateId: "tC", similarityGroupId: "tC" };

check("空デッキは null を返す", mockUI._pickDiverseTemplate([], []) === null);
check("未定義デッキも null を返す", mockUI._pickDiverseTemplate(null, []) === null);

const deck1 = [tA];
const picked1 = mockUI._pickDiverseTemplate(deck1, [{ templateId: "tA", similarityGroupId: "tA" }]);
check("1件デッキは緩和して同一テンプレートを選ぶ", picked1 === tA);
check("選択済みがデッキから除去される", deck1.length === 0);

const deck2 = [tA, tB];
const picked2 = mockUI._pickDiverseTemplate(deck2, [{ templateId: "tA", similarityGroupId: "tA" }]);
check("直近1問と同一テンプレートを避けて選択する", picked2 === tB);
check("デッキは選択分のみ除去される", deck2.length === 1 && deck2[0] === tA);

const deck3 = [tA, tB, tC];
check("候補ウィンドウ外のテンプレートは選択されない", mockUI._pickDiverseTemplate(deck3, [], 1) === tA);

const savedSelector = global.DiversitySelector;
delete global.DiversitySelector;
const deck4 = [tA, tB, tC];
const picked4 = mockUI._pickDiverseTemplate(deck4, [{ templateId: "tA" }, { templateId: "tB" }]);
check("DiversitySelector 未ロード時は直近テンプレート回避にフォールバック", picked4 === tC);
global.DiversitySelector = { selectDiverseCandidate: function () { throw new Error("boom"); } };
const deck5 = [tA, tB];
const picked5 = mockUI._pickDiverseTemplate(deck5, [{ templateId: "tA" }]);
check("DiversitySelector 例外時もクラッシュせずフォールバック", picked5 === tB);
global.DiversitySelector = savedSelector;

// -------------------------------------------------------------
// 6. 復習キュー → 単元特訓の直結導線
// -------------------------------------------------------------
console.log("\n6. 復習キュー → 単元特訓導線");

const profile = createNewProfile("p_test", "テスト太郎", 2);
profile.reviewQueue = [{
  reviewId: "rev_test_1", subjectId: "math", grade: 2, unitId: "add_2digit_carry",
  conceptId: "add_2digit_carry", templateId: "", failCount: 1, successCount: 0,
  intervalDays: 1, dueAt: "2026-09-29", registeredAt: "2026-09-28", status: "active"
}, {
  reviewId: "rev_test_2", subjectId: "math", grade: 3, unitId: "time_unit",
  conceptId: "time_unit", templateId: "", failCount: 1, successCount: 0,
  intervalDays: 3, dueAt: "2026-09-30", registeredAt: "2026-09-27", status: "graduated"
}];

const reviewHtml = mockUI._renderReviewHistoryScreen(profile);
check("復習キューに「5問とっくん」ボタンがある", reviewHtml.includes("⚡ 5問とっくん"));
check("復習キューに「10問とっくん」ボタンがある", reviewHtml.includes("🚀 10問とっくん"));
check("単元IDと学年がそのまま渡される", reviewHtml.includes("app.startUnitPracticeSession('add_2digit_carry', 10, 2)"));
check("卒業済み項目はそのまま表示される", reviewHtml.includes("14日間隔クリア"));

// -------------------------------------------------------------
// 7. 保護者ダッシュボード 弱点単元 → 単元特訓導線
// -------------------------------------------------------------
console.log("\n7. 保護者ダッシュボード 弱点単元 → 単元特訓導線");

profile.skill.subject.gradeProgress["grade2"].unitStats["sub_2digit_no_borrow"] = {
  attempts: 10, correct: 3, accuracy: 0.30, masteryScore: 0.30
};
const dashHtml = mockUI._renderParentDashboard(profile);
check("弱点単元に「5問とっくん」ボタンがある", dashHtml.includes("app.startUnitPracticeSession('sub_2digit_no_borrow', 5, 2)"));
check("弱点単元に「10問とっくん」ボタンがある", dashHtml.includes("app.startUnitPracticeSession('sub_2digit_no_borrow', 10, 2)"));

// -------------------------------------------------------------
// 8. アセット登録 / バージョン整合
// -------------------------------------------------------------
console.log("\n8. アセット登録 / バージョン整合");

const root = path.resolve(__dirname, "..");
const indexHtml = fs.readFileSync(path.join(root, "index.html"), "utf8");
check("index.html が diversity_selector.js を読み込む", indexHtml.includes('src="js/diversity_selector.js"'));

const swSrc = fs.readFileSync(path.join(root, "sw.js"), "utf8");
check("sw.js の urlsToCache に diversity_selector.js がある", swSrc.includes("'/js/diversity_selector.js'"));
check("sw.js の CACHE_NAME が現行バージョンを含む", swSrc.includes(APP_META.appVersion.replace(/^V/, "")));

const distIndexPath = path.join(root, "dist", "index.html");
if (fs.existsSync(distIndexPath)) {
  check("dist/index.html も diversity_selector.js を読み込む", fs.readFileSync(distIndexPath, "utf8").includes('src="js/diversity_selector.js"'));
  check("dist/js/diversity_selector.js が存在する", fs.existsSync(path.join(root, "dist", "js", "diversity_selector.js")));
} else {
  console.log("  [SKIP] dist/ 未ビルドのため dist 検証をスキップ");
}

console.log("\n=== ALL V2.6.12 DIVERSITY INTEGRATION TESTS PASSED! ===");
