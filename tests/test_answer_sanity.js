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
const { TemplateRegistry, UnitRegistry } = require(path.join(ROOT, "js/registries.js"));
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

// 9. 固定答え・図の単調性の回帰防止（V2.9.9 修正の検収）
{
  const M = 120;
  console.log("9. 全テンプレートが " + M + " 回生成で多様な答え・多様な図を出すこと");

  // V2.9.9 で是正した6件（数値固定5件 + 正解カード位置固定1件）を明示的に確認
  const FIXED_IN_V299 = [
    "g6_basic_mixed_frac_01",
    "g6_basic_frac_div_01",
    "g6_std_frac_mix_01",
    "g2_std_geometry_edges_word_01",
    "g2_adv_geometry_box_faces_01",
    "g1_shape_compare"
  ];

  const allIds = Object.keys(TemplateRegistry.templates);
  const sameAnswer = [];
  const sameFigure = [];
  const missingRegressionTarget = [];

  for (const id of allIds) {
    const tpl = TemplateRegistry.templates[id];
    const answers = new Set();
    const figures = new Set();

    for (let i = 0; i < M; i++) {
      let q = null;
      try {
        q = RuleBasedQuestionSource.generateQuestion(id, []);
      } catch (e) {
        assert.fail(id + " が生成例外: " + e.message);
      }
      assert.ok(q, id + " が null を返す");
      answers.add(String(q.answer));
      // 図を伴う問題は図そのものが変わること（位置を覚えるだけで正答できないこと）
      if (typeof q.figureHTML === "string" && q.figureHTML.length > 0) {
        figures.add(q.figureHTML);
      }
    }

    if (tpl.answerType !== "figure_tap" && answers.size < 2) {
      sameAnswer.push(id + "=" + answers.size);
    }
    if (tpl.answerType === "figure_tap" && figures.size < 2) {
      sameFigure.push(id + "=" + figures.size);
    }
    if (FIXED_IN_V299.includes(id) && answers.size < 2) {
      missingRegressionTarget.push(id);
    }
  }

  assert.deepStrictEqual(missingRegressionTarget, [],
    "V2.9.9 で是正したテンプレが固定答えに戻っている: " + missingRegressionTarget.join(", "));
  assert.deepStrictEqual(sameAnswer, [],
    "毎回同じ答えしか出さないテンプレがある（暗記で正答できてしまう）: " + sameAnswer.join(", "));
  assert.deepStrictEqual(sameFigure, [],
    "図が毎回同一で位置暗記が可能な figure_tap がある: " + sameFigure.join(", "));

  console.log("  [PASS] " + allIds.length + " テンプレ × " + M + " 問: 答え・図ともに多様");
  console.log("  [PASS] V2.9.9 是正6件（固定答え）の回帰なし");
}

// 10. 3年「分数の意味と表し方」3テンプレの健全性（V2.9.10 追加分の検収）
// 学習指導要領（解説 平成29年告示）3年 A(6) 対応。答えは「上の数/下の数」の整数に限定し、
// 約分・異分母・帯分数は扱わない（3年範囲外）。2年の fraction_intro（図による識別）との
// 差別化として、分子・分母が何を表すか／単位分数の幾つ分／同分母加減の分子を問う。
{
  const M = 120;
  console.log("10. 3年 分数の意味と表し方3テンプレが " + M + " 問で健全であること");

  const FRACTION_MEANING_IDS = [
    "g3_basic_fraction_01",
    "g3_basic_fraction_02",
    "g3_basic_fraction_03"
  ];

  for (const id of FRACTION_MEANING_IDS) {
    const template = TemplateRegistry.templates[id];
    assert.ok(template, id + " が登録されていること");
    assert.strictEqual(template.unitId, "fraction_meaning",
      id + " の unitId は fraction_meaning");
    assert.strictEqual(template.grade, 3, id + " は3年");
    assert.strictEqual(template.answerType, "number_input",
      id + " の answerType は number_input（分子・分母の整数を答える）");

    // 単元がレジストリに登録され、このテンプレで空プールになっていないこと
    const units = UnitRegistry.getUnitsForLevel("math", 3, 2);
    assert.ok(units.some(u => u.id === "fraction_meaning"),
      "3年 Lv2 に fraction_meaning 単元が登録されていること");
    assert.ok(TemplateRegistry.getByUnit("math", 3, 2, "fraction_meaning").length > 0,
      "fraction_meaning のプールが空でないこと");

    const answers = new Set();
    for (let i = 0; i < M; i++) {
      const q = RuleBasedQuestionSource.generateQuestion(id, []);
      assert.ok(q, id + " が生成されること");

      // 答えは正の整数（numpad で入力可能）
      const num = Number(q.answer);
      assert.ok(Number.isInteger(num) && num > 0,
        id + " の答えは正の整数: " + q.answer + " / " + q.questionText);

      answers.add(String(q.answer));

      // 問題文に「なん分のいくつ」の分数表記が含まれ、未置換プレースホルダがないこと
      assert.ok(/\d+\/\d+/.test(q.questionText) || q.variables.type_idx !== undefined,
        id + " の問題文に分数表記があること: " + q.questionText);
      assert.strictEqual(/\{[a-zA-Z0-9_]+\}/.test(q.questionText), false,
        id + " の問題文に未置換プレースホルダがないこと: " + q.questionText);
      assert.strictEqual(q.questionText.includes("NaN"), false,
        id + " の問題文に NaN がないこと");
      assert.strictEqual(q.questionText.includes("undefined"), false,
        id + " の問題文に undefined がないこと");

      // 約分が必要な分数（分子と分母が1以外の公約数を持つ）を出していないこと
      // 3年 A(6) は約分を扱わないため、既約でない分数は教育上不適切
      const denom = Number(q.variables.denom);
      if (denom && /(\d+)\/(\d+)/.test(q.questionText)) {
        const fracs = q.questionText.match(/(\d+)\/(\d+)/g) || [];
        for (const f of fracs) {
          const [fn, fd] = f.split("/").map(Number);
          assert.ok(fn < fd, id + " は仮分数（分子≧分母）を出さない: " + f + " / " + q.questionText);
          for (let d = 2; d < fd; d++) {
            if (fd % d === 0) {
              assert.ok(fn % d !== 0,
                id + " は約分可能な分数を出さない: " + f + "（" + d + " で約分できる）/ " + q.questionText);
            }
          }
        }
      }

      // understandingCheck は3択で相異・正解を含む
      const uc = q.understandingCheck;
      assert.ok(uc && uc.enabled && uc.type === "choice",
        id + " に understandingCheck（choice）が付くこと");
      assert.strictEqual(uc.choices.length, 3, id + " の選択肢は3つ");
      const choicesStr = uc.choices.map(String);
      assert.strictEqual(new Set(choicesStr).size, 3,
        id + " の選択肢は相異なる: " + choicesStr.join(" / "));
      assert.ok(choicesStr.includes(String(uc.answer)),
        id + " の正解が選択肢に含まれる: " + choicesStr.join(" / "));
      // 誤答が正解と異なること（誤答=正解 だと事実上2択になる）
      // 選択肢はシャッフルされるため、正解以外の2件が誤答であることを検証する
      const wrongChoices = choicesStr.filter((c) => c !== String(uc.answer));
      assert.strictEqual(wrongChoices.length, 2,
        id + " の誤答は2件（誤答=正解 だと事実上2択になる）: " + choicesStr.join(" / "));
    }

    assert.ok(answers.size >= 4,
      id + " は " + M + " 問で4種類以上の答えを出す（暗記不可）: " + answers.size + " 種");
    console.log("  [PASS] " + id + " × " + M + " 問: 答え " + answers.size + " 種・約分可能分数0・3択整合");
  }
}
// 11. 数値問題の understandingCheck が全件有効で3択整合（V2.9.11 一括有効化の検収）
// 数値答え（number_input / figure_display）の問題は児童が「たまたま当たった」まま
// 進まないよう、理解確認クイズを必ず提示する。誤答は _buildWrongChoices が
// 正解から自動生成する（位の入れ違い・±1・±2 など児童が犯しやすい誤りを優先）。
// 図形の特定パーツを指す答え（figure_tap / single_choice / multi_choice）は
// 誤答を数値から導出できないため対象外（誤答設計は人手で行う）。
{
  const N = 60;
  console.log("11. 数値問題の understandingCheck が全件有効で3択が整合すること");

  let enabledCount = 0;
  const disabled = [];
  let checked = 0;
  const offenders = [];

  for (const [id, template] of Object.entries(TemplateRegistry.templates)) {
    const isNumeric = template.answerType === "number_input" || template.answerType === "figure_display";
    const en = template.understandingCheck && template.understandingCheck.enabled;
    if (en) enabledCount++; else disabled.push(id + " [" + template.answerType + "]");

    if (isNumeric) {
      assert.ok(en, id + " は数値問題なのに understandingCheck が無効: " + id);
    }

    if (!en) continue;
    if (template.answerType !== "number_input" && template.answerType !== "figure_display") continue;

    for (let i = 0; i < N; i++) {
      const q = RuleBasedQuestionSource.generateQuestion(id, []);
      assert.ok(q, id + " が生成されること");

      const uc = q.understandingCheck;
      assert.ok(uc && uc.enabled, id + " に understandingCheck が付くこと");
      assert.strictEqual(uc.type, "choice", id + " の type は choice");
      assert.strictEqual(uc.choices.length, 3, id + " の選択肢は3つ");

      const s = uc.choices.map(String);
      const uniq = new Set(s);
      if (uniq.size !== 3) { offenders.push(id + " 選択肢重複: " + s.join("/")); break; }
      if (!s.includes(String(uc.answer))) { offenders.push(id + " 正解不在: " + s.join("/") + " ans=" + uc.answer); break; }
      // 誤答は正解と異なる（同じ数字を選ばせない）
      const wrongs = s.filter(c => c !== String(uc.answer));
      if (wrongs.some(w => w === String(uc.answer))) { offenders.push(id + " 誤答=正解"); break; }
      // 誤答は負値にしない（数値テンキーに入力・選択不可能な値を避ける）
      if (wrongs.some(w => !Number.isNaN(Number(w)) && Number(w) < 0)) {
        offenders.push(id + " 誤答が負: " + wrongs.join("/")); break;
      }
      // 質問文が空・未置換でないこと
      if (!uc.question || uc.question.length === 0) { offenders.push(id + " 質問文が空"); break; }
      if (/\{[a-zA-Z0-9_]+\}/.test(uc.question)) { offenders.push(id + " 質問文に未置換: " + uc.question); break; }
      // 質問文・選択肢が問題の答えと一致していること（数値問題は答えを問う）
      // 例外: questionTemplate を明示して「別の問い」（例: 本問が「兄の分」で確認が
      // 「弟の分」）を設計しているテンプレは、あえて正解をずらしている。
      const hasCustomQ = !!(template.understandingCheck.questionTemplate || "").trim();
      if (!hasCustomQ && uc.answer !== q.answer && String(uc.answer) !== String(q.answer)) {
        offenders.push(id + " クイズ正解≠問題答え: uc=" + uc.answer + " q=" + q.answer); break;
      }
      checked++;
    }
  }

  assert.deepStrictEqual(offenders, [],
    "understandingCheck の3択に不整合があります:\n    - " + offenders.join("\n    - "));
  console.log("  [PASS] " + checked + " インスタンス検証: 3択が相異・正解を含む・誤答は非負");

  const allIds = Object.keys(TemplateRegistry.templates);
  console.log("  [INFO] 全 " + allIds.length + " テンプレ中 enabled=" + enabledCount +
    " / disabled=" + disabled.length);
  // disabled は図形パーツ特定系（非数値答え）のみであること
  const badDisabled = disabled.filter(s => {
    const m = s.match(/\[([a-zA-Z_]+)\]$/);
    return m && (m[1] === "number_input" || m[1] === "figure_display");
  });
  assert.deepStrictEqual(badDisabled, [],
    "数値問題で understandingCheck が無効なものが残っています:\n    - " + badDisabled.join("\n    - "));
  console.log("  [PASS] disabled は非数値答え（figure_tap/single_choice/multi_choice）のみ");
}
// 12. 誤答候補生成ヘルパ _buildWrongChoices の単体検証（V2.9.11）
// 「正解と異なり・互いに異なり・非負」な2件を常に返すことを確認する。
// 桁が飛びすぎる誤答（ans=12 → 120）を出さず、位の入れ違いや ±1 を優先することも検証する。
{
  console.log("12. 誤答候補生成 _buildWrongChoices の健全性");

  const cases = [0, 1, 2, 3, 5, 9, 10, 12, 21, 25, 50, 58, 99, 100, 250, 300, 999, 1000, 12.5, 0.5];
  const offenders = [];

  for (const a of cases) {
    const w = RuleBasedQuestionSource._buildWrongChoices(a);
    if (!Array.isArray(w) || w.length !== 2) {
      offenders.push("ans=" + a + ": 2件返らない " + JSON.stringify(w));
      continue;
    }
    const w1 = String(w[0]);
    const w2 = String(w[1]);
    if (w1 === w2) offenders.push("ans=" + a + ": 誤答が同一 [" + w1 + "," + w2 + "]");
    if (w1 === String(a) || w2 === String(a)) offenders.push("ans=" + a + ": 正解と一致 [" + w1 + "," + w2 + "]");
    if (Number(w[0]) < 0 || Number(w[1]) < 0) offenders.push("ans=" + a + ": 負値 [" + w1 + "," + w2 + "]（テンキーで入力不可）");
    if (w1 === "undefined" || w2 === "undefined") offenders.push("ans=" + a + ": undefined");
  }

  // 教育的妥当性: 12 に対して 120 のような桁が飛んだ誤答を出さない
  const w12 = RuleBasedQuestionSource._buildWrongChoices(12).map(String);
  assert.ok(w12.indexOf("120") < 0,
    "ans=12 の誤答に 120 を含めない（桁が飛びすぎ）: " + w12.join(","));
  // 12 → 位入れ違いの 21 が候補に含まれること
  assert.ok(w12.indexOf("21") >= 0,
    "ans=12 の誤答に位入れ違い 21 を含むこと: " + w12.join(","));

  assert.deepStrictEqual(offenders, [],
    "_buildWrongChoices の不備:\n    - " + offenders.join("\n    - "));
  console.log("  [PASS] " + cases.length + " パターン: 相異・非負・正解非一致、位入れ違い優先・桁飛びなし");
}

// 13. 出題画面・ヒント画面に {answer} が直接含まれていないこと（答え漏洩防止）
{
  console.log("13. 出題画面・ヒント画面に {answer} の直接記述がないこと");

  const answerPlaceholderRegex = /\{answer\}/;
  const offenders = [];

  const allIds = Object.keys(TemplateRegistry.templates);
  for (const id of allIds) {
    const t = TemplateRegistry.templates[id];
    if (!t) continue;

    // 出題・ヒント画面で表示される文字列フィールドを全検査
    const fields = [
      t.questionText,
      t.format,
      ...(t.formats || []),
      ...(t.hintSteps || []),
    ];

    for (const field of fields) {
      if (typeof field === "string" && answerPlaceholderRegex.test(field)) {
        offenders.push(`${id}: "${field}"`);
      }
    }
  }

  // explanationTemplate は解答後の解説画面で表示されるため、
  // 答え漏洩とは見なさず、INFO として出力のみ行う
  const explanationOffenders = [];
  for (const id of allIds) {
    const t = TemplateRegistry.templates[id];
    if (!t || typeof t.explanationTemplate !== "string") continue;
    if (answerPlaceholderRegex.test(t.explanationTemplate)) {
      explanationOffenders.push(`${id}: "${t.explanationTemplate}"`);
    }
  }

  assert.deepStrictEqual(offenders, [],
    "出題画面・ヒント画面に {answer} が直接含まれています:\n    - " + offenders.join("\n    - "));
  console.log("  [PASS] 全 " + allIds.length + " テンプレート: 出題・ヒント画面の {answer} 直接記述 0 件");
  if (explanationOffenders.length > 0) {
    console.log("  [INFO] explanationTemplate に {answer} を含むテンプレート: " + explanationOffenders.length + " 件");
    for (const o of explanationOffenders) {
      console.log("    - " + o);
    }
  }
}

console.log("\nANSWER SANITY TESTS PASSED");
