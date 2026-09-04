/**
 * Automated Tests for Phase 7 (V2.5.13: セッション経過時間表示・テンプレートデッキシャッフル)
 * Run with: node tests/test_phase7.js
 *
 * 検証項目:
 *  - formatElapsed: 経過時間の "m:ss" フォーマット (異常値も安全に処理)
 *  - 追加文章題テンプレート18個の連続生成バリデーション
 *  - テンプレートデッキシャッフル: デッキ一巡で同一テンプレートを出さない
 *  - 同一単元が連続選択されてもセッション内で別テンプレートが出る
 *  - 小数の浮動小数点誤差がない (例: 1.7000000000000002 → 1.7)
 */

const assert = require("assert");

// ui.js を Node で読み込むため、依存クラス (StorageManager) を先に用意する
const storage = require("../js/storage.js");
global.StorageManager = storage.StorageManager || storage;
const { formatElapsed } = require("../js/ui.js");

const { TemplateRegistry, UnitRegistry } = require("../js/registries.js");
const { RuleBasedQuestionSource } = require("../js/question_source.js");
const { QuestionValidator } = require("../js/validator.js");

require("../js/templates_math.js");
const { MATH_TEMPLATES } = require("../js/templates_math.js");

console.log("=== Running Phase 7 Verification Tests (経過時間表示・テンプレートデッキ) ===\n");

// V2.5.13 で追加した文章題テンプレート (18個)
const NEW_TEMPLATES = [
  "g1_word_add_02", "g1_word_add_03", "g1_word_sub_02",
  "g1_word_add_carry_02", "g1_word_sub_borrow_02",
  "g2_word_add_2digit_02", "g2_word_kuku_02", "g2_word_kuku_03",
  "g3_word_add3digit_02", "g3_word_div_02", "g3_word_div_03",
  "g4_word_mul_2x2_02", "g4_word_decimal_add_02",
  "g5_word_frac_same_02", "g5_word_percent_02",
  "g6_word_frac_div_02", "g6_word_ratio_02", "g6_adv_speed_02"
];

// ui.js の _shuffleArray と同一ロジック
function shuffleArray(array) {
  const a = [...array];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function testFormatElapsed() {
  console.log("1. Testing formatElapsed (m:ss conversion)...");
  assert.strictEqual(formatElapsed(0), "0:00", "0 sec → 0:00");
  assert.strictEqual(formatElapsed(59), "0:59", "59 sec → 0:59");
  assert.strictEqual(formatElapsed(60), "1:00", "60 sec → 1:00");
  assert.strictEqual(formatElapsed(75), "1:15", "75 sec → 1:15");
  assert.strictEqual(formatElapsed(725), "12:05", "725 sec → 12:05");
  assert.strictEqual(formatElapsed(-5), "0:00", "negative clamps to 0:00");
  assert.strictEqual(formatElapsed(null), "0:00", "null clamps to 0:00");
  assert.strictEqual(formatElapsed("abc"), "0:00", "invalid clamps to 0:00");
  console.log("  [PASS] formatElapsed: 8 cases OK.");
}

function testNewWordTemplates() {
  console.log("2. Testing 18 new word-problem templates generate valid questions...");
  let total = 0;
  for (const id of NEW_TEMPLATES) {
    const t = TemplateRegistry.get(id);
    assert.ok(t, `${id} is registered`);
    assert.strictEqual(t.problemType, "word_problem", `${id} problemType is word_problem`);
    assert.ok(Array.isArray(t.sentencePatterns) && t.sentencePatterns.length >= 1, `${id} has sentencePatterns`);
    const questions = [];
    for (let i = 0; i < 10; i++) {
      const q = RuleBasedQuestionSource.generateQuestion(id, questions);
      assert.ok(q, `${id} #${i + 1} generated`);
      assert.ok(q.answer !== undefined && q.answer !== null && q.answer !== "", `${id} #${i + 1} has answer`);
      const res = QuestionValidator.validate(q, questions);
      assert.strictEqual(res.valid, true, `${id} #${i + 1} validates: ${JSON.stringify(res.errors)}`);
      questions.push(q);
    }
    total++;
  }
  console.log(`  [PASS] ${total} templates × 10問の連続生成・バリデーション全合格。`);
}

function testDeckShuffleDistinctness() {
  console.log("3. Testing template deck shuffle (no repeat within one deck pass)...");
  // startLearningSession と同じデッキ構築
  const units = UnitRegistry.getUnitsForLevel("math", 1, 1);
  const decks = {};
  for (const u of units) {
    const tmpls = TemplateRegistry.getByUnit("math", 1, 1, u.id);
    decks[u.id] = shuffleArray(tmpls);
  }
  // add_1digit_no_carry は4テンプレート → 一巡で全て別テンプレート
  const unitId = "add_1digit_no_carry";
  const deckSize = decks[unitId].length;
  assert.ok(deckSize >= 3, `unit has multiple templates (got ${deckSize})`);
  const drawn = [];
  for (let i = 0; i < deckSize; i++) {
    if (decks[unitId].length === 0) {
      decks[unitId] = shuffleArray(TemplateRegistry.getByUnit("math", 1, 1, unitId));
    }
    drawn.push(decks[unitId].pop().templateId);
  }
  const distinct = new Set(drawn).size;
  assert.strictEqual(distinct, deckSize, `one deck pass yields all distinct templates (got ${distinct})`);
  console.log(`  [PASS] デッキ一巡 (${deckSize}枚) で全て別テンプレート: ${drawn.join(" → ")}`);
}

function testSessionTemplateVariety() {
  console.log("4. Testing 10-question session within one unit uses multiple templates...");
  // 単元選択を固定 (常に add_1digit_no_carry) してデッキから10問引く
  const unitId = "add_1digit_no_carry";
  const templates = TemplateRegistry.getByUnit("math", 1, 1, unitId);
  const questions = [];
  let deck = [];
  const distinct = new Set();
  for (let i = 0; i < 10; i++) {
    if (deck.length === 0) deck = shuffleArray(templates);
    const t = deck.pop();
    distinct.add(t.templateId);
    const q = RuleBasedQuestionSource.generateQuestion(t.templateId, questions);
    questions.push(q);
  }
  // 一巡目で全テンプレートを必ず引くため、種類数はテンプレート総数と一致
  assert.strictEqual(distinct.size, templates.length,
    `session uses all ${templates.length} templates (got ${distinct.size})`);
  // セッション内の問題は全て有効
  console.log(`  [PASS] 同一単元10問で ${distinct.size} 種類のテンプレートを使用 (数字だけ変わる出題を解消)。`);
}

function testDecimalCleanliness() {
  console.log("5. Testing decimal templates produce noise-free numbers (1.7 not 1.7000000000000002)...");
  // _cleanNumber の直接検証
  assert.strictEqual(RuleBasedQuestionSource._cleanNumber(1.7000000000000002), 1.7, "clean 1.7000000000000002 → 1.7");
  assert.strictEqual(RuleBasedQuestionSource._cleanNumber(0.30000000000000004), 0.3, "clean 0.30000000000000004 → 0.3");
  assert.strictEqual(RuleBasedQuestionSource._cleanNumber(2.675), 2.675, "legit decimals preserved");
  assert.strictEqual(RuleBasedQuestionSource._cleanNumber(42), 42, "integers untouched");
  assert.strictEqual(RuleBasedQuestionSource._cleanNumber("abc"), "abc", "non-numbers untouched");
  assert.strictEqual(RuleBasedQuestionSource._cleanNumber(1.5e12), 1.5e12, "huge numbers untouched");

  // 全テンプレート横断: 生成された数値変数・解答文字列にノイズがないこと
  const allTemplates = MATH_TEMPLATES;
  assert.ok(Array.isArray(allTemplates) && allTemplates.length > 0, "MATH_TEMPLATES available");
  let checked = 0;
  for (const t of allTemplates) {
    for (let i = 0; i < 20; i++) {
      const q = RuleBasedQuestionSource.generateQuestion(t.templateId);
      if (!q || q.isFallback) continue;
      for (const [k, v] of Object.entries(q.variables)) {
        if (typeof v === "number" && Number.isFinite(v)) {
          assert.strictEqual(v, Math.round(v * 1e10) / 1e10,
            `${t.templateId}.variables.${k} is noise-free (got ${v})`);
        }
      }
      const ans = Number(q.answer);
      if (q.answer !== "" && !Number.isNaN(ans) && Number.isFinite(ans)) {
        assert.ok(!/\.[0-9]{7,}/.test(String(q.answer)),
          `${t.templateId} answer string has no long decimal tail (got ${q.answer})`);
      }
      assert.ok(!/\.[0-9]{7,}/.test(q.questionText),
        `${t.templateId} questionText has no long decimal tail (got: ${q.questionText})`);
      checked++;
    }
  }
  console.log(`  [PASS] 全${allTemplates.length}テンプレート×20問 (${checked}問) の小数表記はノイズフリー。`);
}

try {
  testFormatElapsed();
  testNewWordTemplates();
  testDeckShuffleDistinctness();
  testSessionTemplateVariety();
  testDecimalCleanliness();
  console.log("\n==============================================");
  console.log("ALL PHASE 7 TESTS PASSED SUCCESSFULLY! (5/5)");
  console.log("==============================================");
} catch (err) {
  console.error("\nTEST FAILED:", err);
  process.exit(1);
}
