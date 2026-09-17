/**
 * Automated Tests for Phase 3 (Template Generation & Validation)
 * Run with: node tests/test_phase3.js
 */

const assert = require("assert");
const { TemplateRegistry, UnitRegistry } = require("../js/registries.js");
const { MATH_TEMPLATES } = require("../js/templates_math.js");
const { QuestionValidator } = require("../js/validator.js");
const { RuleBasedQuestionSource } = require("../js/question_source.js");
require("../js/templates_figures_g1.js"); // V2.6.3: shape_basic (図形) テンプレート登録

console.log("=== Running Phase 3 Verification Tests ===\n");

function testTemplateRegistration() {
  console.log("1. Testing TemplateRegistry Registration...");
  assert.ok(MATH_TEMPLATES.length >= 21, `Total templates must cover all units, got ${MATH_TEMPLATES.length}`);

  // 各学年ごとのテンプレート存在確認
  for (let g = 1; g <= 6; g++) {
    for (let lv = 1; lv <= 3; lv++) {
      const units = UnitRegistry.getUnitsForLevel("math", g, lv);
      for (const u of units) {
        const templates = TemplateRegistry.getByUnit("math", g, lv, u.id);
        assert.ok(templates.length > 0, `Grade ${g} Lv${lv} Unit '${u.id}' must have at least one template.`);
      }
    }
  }
  console.log("  [PASS] All 21 units across Grades 1-6 have registered templates.");
}

function testMassQuestionGeneration() {
  console.log("2. Testing Mass Question Generation & Validation across all templates...");
  let totalGenerated = 0;

  for (const t of MATH_TEMPLATES) {
    const previousInstances = [];

    // 各テンプレートにつき 10問 連続生成
    for (let i = 0; i < 10; i++) {
      const instance = RuleBasedQuestionSource.generateQuestion(t.templateId, previousInstances);
      totalGenerated++;

      // QuestionValidator による完全検証
      const valRes = QuestionValidator.validate(instance, previousInstances);
      if (!valRes.valid) {
        console.error(`Validation failed on template '${t.templateId}':`, valRes.errors, instance);
      }
      assert.strictEqual(valRes.valid, true, `Generated question for '${t.templateId}' must be valid.`);
      assert.ok(instance.questionText.length > 3);
      assert.ok(instance.answer !== "");
      assert.ok(instance.hintSteps.length >= 2);
      assert.ok(instance.explanation.length > 3);

      if (instance.understandingCheck && instance.understandingCheck.enabled) {
        const uc = instance.understandingCheck;
        assert.strictEqual(new Set(uc.choices).size, 3, "understandingCheck must have 3 unique choices");
        assert.ok(uc.choices.includes(uc.answer), "Choices must include correct answer");
      }

      previousInstances.push(instance);
    }
  }

  console.log(`  [PASS] Successfully generated and validated ${totalGenerated} questions across all templates with 100% pass rate.`);
}

function testSimilarQuestionGeneration() {
  console.log("3. Testing generateSimilarQuestion for ReviewQueue...");
  const tId = "g3_std_div_no_remainder_01";
  const q1 = RuleBasedQuestionSource.generateQuestion(tId);
  const q2 = RuleBasedQuestionSource.generateSimilarQuestion(tId, q1.variables);

  assert.strictEqual(q2.isReview, true, "isReview flag should be true");
  assert.strictEqual(q2.templateId, tId);
  assert.ok(q2.questionInstanceId !== q1.questionInstanceId, "New questionInstanceId must be assigned");

  const valRes = QuestionValidator.validate(q2);
  assert.strictEqual(valRes.valid, true, "Similar question must pass validation");
  console.log("  [PASS] Similar question generation for review verified.");
}

function testWordProblemGeneration() {
  console.log("4. Testing Word Problem (文章題) formatting & placeholders...");
  const wordTemplates = MATH_TEMPLATES.filter(t => t.problemType === "word_problem");
  assert.ok(wordTemplates.length >= 2, "Word problem templates must exist");

  for (const wt of wordTemplates) {
    const q = RuleBasedQuestionSource.generateQuestion(wt.templateId);
    assert.strictEqual(q.problemType, "word_problem");
    assert.strictEqual(/\{[a-zA-Z0-9_]+\}/.test(q.questionText), false, "No unreplaced placeholders in word problem");
  }
  console.log("  [PASS] Word problem generation verified.");
}

try {
  testTemplateRegistration();
  testMassQuestionGeneration();
  testSimilarQuestionGeneration();
  testWordProblemGeneration();
  console.log("\n==========================================");
  console.log("ALL PHASE 3 TESTS PASSED SUCCESSFULLY! (4/4)");
  console.log("==========================================");
} catch (err) {
  console.error("\nTEST FAILED:", err);
  process.exit(1);
}

