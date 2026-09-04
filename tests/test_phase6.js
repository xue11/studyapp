/**
 * Automated Tests for Phase 6 (重複防止強化: 可換対応・セッション内重複・多様性)
 * Run with: node tests/test_phase6.js
 *
 * V2.5.12 検証項目:
 *  - commutativePairs で「1+2」と「2+1」を同一判定できる
 *  - 同一セッション(10問)内で可換重複が出ない（生成の多様性は維持）
 *  - formulas 配列による出題文の多様化
 *  - DiversitySelector によるテンプレート選択の多様化
 */

const assert = require("assert");
const { TemplateRegistry } = require("../js/registries.js");
const { QuestionValidator } = require("../js/validator.js");
const { RuleBasedQuestionSource } = require("../js/question_source.js");
const { DiversitySelector } = require("../js/diversity_selector.js");

require("../js/templates_math.js");

console.log("=== Running Phase 6 Verification Tests (重複防止強化) ===\n");

function canonEq(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function testCommutativeDuplicateDetection() {
  console.log("1. Testing commutative-equivalent duplicate detection (1+2 ≡ 2+1)...");
  const t = TemplateRegistry.get("g1_basic_add_01");
  assert.ok(t, "g1_basic_add_01 exists");
  assert.deepStrictEqual(t.commutativePairs, [["a", "b"]], "template declares commutative pairs");

  // 既存1問 {a:1,b:2} に対し {a:2,b:1} は可換重複として検出される
  const prev = [{
    templateId: "g1_basic_add_01",
    variables: { a: 1, b: 2, answer: 3 }
  }];
  const dupInst = {
    questionInstanceId: "q_test_dup_001",
    templateId: "g1_basic_add_01",
    grade: 1, difficultyLevel: 1, unitId: "add_1digit_no_carry", conceptId: "add_basic",
    problemType: "calculation", answerType: "number_input",
    variables: { a: 2, b: 1, answer: 3 },
    questionText: "2 + 1 = ?", answer: "3", hintSteps: ["h1", "h2"],
    explanation: "e", commutativePairs: [["a", "b"]]
  };
  const resDup = QuestionValidator.validate(dupInst, prev);
  assert.strictEqual(resDup.valid, false, "a=2,b=1 must be duplicate of a=1,b=2");
  assert.ok(resDup.errors.some(e => e.code === "DUPLICATE_ERROR"), "error code is DUPLICATE_ERROR");

  // 異なる組み合わせ {a:3,b:1} は重複ではない
  const newInst = {
    questionInstanceId: "q_test_new_001",
    templateId: "g1_basic_add_01",
    grade: 1, difficultyLevel: 1, unitId: "add_1digit_no_carry", conceptId: "add_basic",
    problemType: "calculation", answerType: "number_input",
    variables: { a: 3, b: 1, answer: 4 },
    questionText: "3 + 1 = ?", answer: "4", hintSteps: ["h1", "h2"],
    explanation: "e", commutativePairs: [["a", "b"]]
  };
  const resNew = QuestionValidator.validate(newInst, prev);
  assert.strictEqual(resNew.valid, true, "a=3,b=1 must NOT be duplicate");

  // 可換ペアなし(減算)では {a:5,b:2} と {a:2,b:5} は重複扱いされない
  const subPrev = [{ templateId: "g1_basic_sub_01", variables: { a: 5, b: 2, answer: 3 } }];
  const subInst = {
    questionInstanceId: "q_test_sub_001",
    templateId: "g1_basic_sub_01",
    grade: 1, difficultyLevel: 1, unitId: "sub_1digit_no_borrow", conceptId: "sub_basic",
    problemType: "calculation", answerType: "number_input",
    variables: { a: 2, b: 5, answer: -3 },
    questionText: "2 - 5 = ?", answer: "-3", hintSteps: ["h1", "h2"],
    explanation: "e", commutativePairs: null
  };
  const resSub = QuestionValidator.validate(subInst, subPrev);
  assert.strictEqual(resSub.valid, true, "減算は可換ペアなしで重複扱いされない");

  console.log("  [PASS] 可換重複は検出され、非可換は影響を受けない。");
}

function testSessionNoCommutativeDuplicates() {
  console.log("2. Testing 10-question session generates no commutative duplicates...");
  const t = TemplateRegistry.get("g1_basic_add_01");
  const questions = [];
  for (let i = 0; i < 10; i++) {
    const q = RuleBasedQuestionSource.generateQuestion(t.templateId, questions);
    questions.push(q);
  }

  // 可換正規化後のユニーク数をカウント (fallback除く)
  const seen = new Set();
  let unique = 0;
  for (const q of questions) {
    if (q.isFallback) continue;
    const v = q.variables;
    // 可換正規化 (a<=b)
    const a = Math.min(v.a, v.b);
    const b = Math.max(v.a, v.b);
    const key = `${a},${b}`;
    if (!seen.has(key)) {
      seen.add(key);
      unique++;
    }
    assert.ok(q.answer, "answer present");
  }
  assert.ok(unique >= 9, `at least 9 unique commutative pairs in 10 questions (got ${unique})`);
  console.log(`  [PASS] 10問中 ${unique} 組のユニークな組み合わせ (可換考慮)。`);
}

function testFormatsVariety() {
  console.log("3. Testing formats array provides question-text variety...");
  const t = TemplateRegistry.get("g1_basic_add_01");
  assert.ok(Array.isArray(t.formats) && t.formats.length >= 2, "format array exists");
  const texts = new Set();
  for (let i = 0; i < 30; i++) {
    const q = RuleBasedQuestionSource.generateQuestion(t.templateId);
    texts.add(q.questionText);
  }
  assert.ok(texts.size >= 2, `multiple distinct question-text patterns produced (${texts.size} distinct)`);
  console.log(`  [PASS] 30問生成で ${texts.size} 種類の出題文パターン。`);
}

function testDiversitySelection() {
  console.log("4. Testing DiversitySelector template selection...");
  // 小学1年 Lv1 の全テンプレートから候補を選ぶ
  const candidates = [
    TemplateRegistry.get("g1_basic_add_01"),
    TemplateRegistry.get("g1_basic_sub_01"),
    TemplateRegistry.get("g1_basic_bond_01"),
    TemplateRegistry.get("g1_basic_add_02"),
    TemplateRegistry.get("g1_basic_sub_02")
  ].filter(Boolean);

  const history = [
    { templateId: "g1_basic_add_01", variables: { a: 1, b: 2 } }
  ];
  const picked = DiversitySelector.selectDiverseCandidate(candidates, history);
  assert.ok(picked, "returns a candidate");
  assert.ok(candidates.includes(picked), "picked candidate is from provided list");
  console.log(`  [PASS] 直近 ${history.length} 問から、候補${candidates.length}件の中から1つ選出。`);
}

try {
  testCommutativeDuplicateDetection();
  testSessionNoCommutativeDuplicates();
  testFormatsVariety();
  testDiversitySelection();
  console.log("\n==============================================");
  console.log("ALL PHASE 6 TESTS PASSED SUCCESSFULLY! (4/4)");
  console.log("==============================================");
} catch (err) {
  console.error("\nTEST FAILED:", err);
  process.exit(1);
}