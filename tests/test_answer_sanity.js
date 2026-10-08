/**
 * 回答の健全性テスト (V2.9.5)
 *
 * 数値テンキー（「−」キーなし）で入力する問題で答えが負になると、
 * 児童は絶対に入力できない → 必ず3回不正解 → 復習キューと弱点単元のデータが汚染される。
 *
 * V2.9.4 時点で g4_word_decimal_add_01（小数の引き算「残り」）が 17.5% の確率で
 * 負の答えを生成していた（a < b の組み合わせ引き直し不足）。
 *
 * 実行方法: npm test  （または node tests/test_answer_sanity.js）
 */

const assert = require("assert");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const { TemplateRegistry } = require(path.join(ROOT, "js/registries.js"));
[
  "templates_math",
  "templates_units_p1",
  "templates_units_p2",
  "templates_g2_extra",
  "templates_figures_g1",
  "templates_figures_g2",
  "templates_figures_g3",
  "templates_clock"
].forEach((m) => require(path.join(ROOT, "js", m + ".js")));

const { RuleBasedQuestionSource } = require(path.join(ROOT, "js/question_source.js"));
const { QuestionValidator } = require(path.join(ROOT, "js/validator.js"));

/** 回答が画面上の数字テンキーになる answerType */
const KEYPAD_TYPES = ["number_input", "figure_display"];

/** 各テンプレートの生成回数（17.5% の異常を十分に検出できるよう 40 回） */
const N = 40;

// 1. 全テンプレートの答えが非負であること
{
  console.log("1. 数値入力問題の答えは非負であること");

  const allIds = Object.keys(TemplateRegistry.templates);
  const keypadIds = allIds.filter((id) => KEYPAD_TYPES.includes(TemplateRegistry.templates[id].answerType));
  const offenders = [];

  for (const id of keypadIds) {
    let negatives = 0;
    let nonNumeric = 0;
    let firstBad = null;

    for (let i = 0; i < N; i++) {
      let q = null;
      try {
        q = RuleBasedQuestionSource.generateQuestion(id, []);
      } catch (e) {
        firstBad = firstBad || ("生成例外: " + e.message);
        break;
      }
      if (!q) {
        firstBad = firstBad || "生成結果が null";
        break;
      }
      const num = Number(q.answer);
      if (Number.isNaN(num)) {
        nonNumeric++;
        firstBad = firstBad || ("答えが数値でない: " + JSON.stringify(q.answer));
      } else if (num < 0) {
        negatives++;
        firstBad = firstBad || ("答えが負: " + q.answer + " / " + q.questionText);
      }
    }

    if (negatives > 0 || nonNumeric > 0) {
      offenders.push(id + " (負:" + negatives + " 数値外:" + nonNumeric + ") " + firstBad);
    }
  }

  assert.strictEqual(offenders.length, 0,
    "数値入力問題の答えが入力不可能（負）になっています:\n    - " + offenders.join("\n    - "));
  console.log("  [PASS] " + keypadIds.length + " テンプレ × " + N + " 問: 負の答え 0 件・数値外の答え 0 件");
}

// 2. Validator が負の答えを検出できること（防御ルールが生きているか）
{
  console.log("2. Validator の非負ルールが負の答えを検出すること");

  const base = {
    questionInstanceId: "qi_sanity",
    templateId: "dummy",
    grade: 4,
    difficultyLevel: 2,
    unitId: "dummy",
    conceptId: "dummy",
    problemType: "calculation",
    answerType: "number_input",
    variables: { a: 1 },
    questionText: "テスト問題",
    answer: "-3",
    hintSteps: ["ヒント1", "ヒント2"],
    explanation: "解説"
  };

  const result = QuestionValidator.validate(base, []);
  assert.ok(!result.valid, "負の答えは invalid になること");
  assert.ok(
    result.errors.some((e) => e.code === "ANSWER_ERROR" && /non-negative/.test(e.message)),
    "ANSWER_ERROR コードで非負違反が報告されること"
  );
  console.log("  [PASS] 負の答えは Validator で ANSWER_ERROR として検出される");

  // 0 は有効（答えが 0 の問題もある）
  const zeroResult = QuestionValidator.validate(
    Object.assign({}, base, { answer: "0" }), []
  );
  const zeroNeg = zeroResult.errors.filter((e) => /non-negative/.test(e.message));
  assert.strictEqual(zeroNeg.length, 0, "答え 0 は非負ルールに引っかからないこと");
  console.log("  [PASS] 答え 0 は 許可される（0 は入力可能）");
}

// 3. 具体的な再発防止: 小数「残り」問題は必ず a > b
{
  console.log("3. g4_word_decimal_add_01（小数の引き算・残り）が常に正の答えであること");

  let checked = 0;
  for (let i = 0; i < 200; i++) {
    const q = RuleBasedQuestionSource.generateQuestion("g4_word_decimal_add_01", []);
    assert.ok(q, "問題が生成されること");
    const a = Number(q.variables.a);
    const b = Number(q.variables.b);
    assert.ok(b < a, "引く量 < もとの量（a=" + a + " b=" + b + "）: " + q.questionText);
    assert.ok(Number(q.answer) > 0, "答えが正: " + q.answer);
    checked++;
  }
  console.log("  [PASS] " + checked + " 問すべて a > b・答え > 0");
}

// 4. Validator で全生成問題が valid であること（少数サンプルの健全性）
{
  console.log("4. 主要テンプレの生成問題が QuestionValidator を通ること");

  const ids = Object.keys(TemplateRegistry.templates).slice(0, 30);
  const bad = [];
  for (const id of ids) {
    const q = RuleBasedQuestionSource.generateQuestion(id, []);
    if (!q) continue;
    const r = QuestionValidator.validate(q, []);
    if (!r.valid) {
      bad.push(id + ": " + r.errors.map((e) => e.code).join(","));
    }
  }
  assert.strictEqual(bad.length, 0, "Validator に引っかかる問題:\n    - " + bad.join("\n    - "));
  console.log("  [PASS] " + ids.length + " テンプレの生成問題がすべて valid");
}

// 5. 整数として正規化するテンプレートは整数の答えだけを生成すること
{
  console.log("5. 整数回答テンプレートで小数の答えが生成されないこと");

  const offenders = [];
  for (const [id, template] of Object.entries(TemplateRegistry.templates)) {
    if (template.answerType !== "number_input" ||
        !template.answer || template.answer.normalization !== "integer") continue;
    for (let i = 0; i < N; i++) {
      const q = RuleBasedQuestionSource.generateQuestion(id, []);
      const answer = Number(q && q.answer);
      if (!Number.isFinite(answer) || !Number.isInteger(answer)) {
        offenders.push(id + " answer=" + (q && q.answer));
        break;
      }
    }
  }
  assert.deepStrictEqual(offenders, [],
    "整数回答テンプレートが小数または数値外の答えを生成しています:\n    - " + offenders.join("\n    - "));
  console.log("  [PASS] normalization=integer のテンプレートはすべて整数の答えを生成");
}

// 6. ヒントに {answer} が直接含まれないこと（解答前のヒントで答えが漏れる不具合の回帰防止）
{
  console.log("6. hintSteps に {answer} プレースホルダが直接含まれないこと");

  const offenders = [];
  for (const [id, template] of Object.entries(TemplateRegistry.templates)) {
    const steps = Array.isArray(template.hintSteps) ? template.hintSteps : [];
    steps.forEach((step, si) => {
      if (typeof step === "string" && step.includes("{answer}")) {
        offenders.push(id + "[" + si + "]: " + step);
      }
    });
  }
  assert.deepStrictEqual(offenders, [],
    "ヒントに {answer} が直接含まれています（解答前に答えが漏れます）:\n    - " + offenders.join("\n    - "));
  console.log("  [PASS] " + Object.keys(TemplateRegistry.templates).length + " テンプレの hintSteps に {answer} 直接参照なし");
}

// 7. V2.9.8 修正テンプレの answerType と理解確認（3択）
{
  console.log("7. V2.9.8 修正テンプレの answerType=number_input と understandingCheck の3択");
  const targetIds = ["g2_adv_kuku_fill_01", "g4_adv_error_spotting_01"];
  for (const id of targetIds) {
    const template = TemplateRegistry.templates[id];
    assert.ok(template, id + " が登録されていること");
    assert.strictEqual(template.answerType, "number_input",
      id + " の answerType は number_input（choice は UI に未実装）");

    for (let i = 0; i < N; i++) {
      const q = RuleBasedQuestionSource.generateQuestion(id, []);
      assert.ok(q, id + " が生成されること");
      assert.strictEqual(q.answerType, "number_input", id + " の生成問題の answerType");
      const uc = q.understandingCheck;
      assert.ok(uc && uc.enabled && uc.type === "choice",
        id + " に understandingCheck（choice）が付くこと");
      assert.strictEqual(uc.choices.length, 3, id + " の選択肢は3つであること");
      const choicesStr = uc.choices.map(String);
      assert.strictEqual(new Set(choicesStr).size, 3,
        id + " の選択肢は相異なること: " + choicesStr.join(" / "));
      assert.ok(choicesStr.includes(String(uc.answer)),
        id + " の正解が選択肢に含まれること: " + choicesStr.join(" / ") + " answer=" + uc.answer);
    }
    console.log("  [PASS] " + id + " × " + N + " 問: number_input・3択が相異で正解を含む");
  }
}

// 8. g2_basic_bignum_04 の解決後ヒントが答えを含まないこと（V2.9.8 修正の回帰防止）
{
  console.log("8. g2_basic_bignum_04 の解決後ヒントが答えを含まないこと");
  for (let i = 0; i < N; i++) {
    const q = RuleBasedQuestionSource.generateQuestion("g2_basic_bignum_04", []);
    assert.ok(q, "問題が生成されること");
    const ans = String(q.answer);
    q.hintSteps.forEach((step, hi) => {
      assert.ok(!step.includes(ans),
        "ヒント" + hi + " が答え " + ans + " を含む: " + step);
    });
  }
  console.log("  [PASS] " + N + " 問のヒントに答えの数値なし");
}
console.log("\nANSWER SANITY TESTS PASSED");
