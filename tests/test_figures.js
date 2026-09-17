/**
 * 図形問題（g1_shape_*）統合テスト
 * - テンプレート登録の確認
 * - generateQuestion による生成（single_choice / multi_choice）
 * - QuestionValidator の合格
 * - 完全一致判定ロジック（select_all は正解すべて＋誤答なしのみ正解）
 * - グリッド固定配置 / 回答保存用スナップショット
 *
 * V2.6.3: 方針B（共通カード + 配置モード分け）に基づく図形テンプレートの検証
 */
const assert = require("assert");

const { TemplateRegistry } = require("../js/registries.js");
const FigureShapeUI = require("../js/templates_figures_g1.js");
const { RuleBasedQuestionSource } = require("../js/question_source.js");
const { QuestionValidator } = require("../js/validator.js");

const FIGURE_IDS = ["g1_shape_identification", "g1_shape_select_all", "g1_shape_compare"];

function testRegistered() {
  console.log("1. 図形テンプレートの登録確認");
  for (const id of FIGURE_IDS) {
    const t = TemplateRegistry.templates[id];
    assert.ok(t, `${id} が TemplateRegistry に登録されている`);
    assert.strictEqual(t.problemType, "figure", `${id} problemType=figure`);
    assert.strictEqual(t.unitId, "shape_basic", `${id} unitId=shape_basic`);
    assert.strictEqual(t.grade, 1, `${id} grade=1`);
    assert.ok(["single_choice", "multi_choice"].includes(t.answerType),
      `${id} answerType が選択式 (${t.answerType})`);
  }
  // 方針: 1-A/1-C は単一選択、1-B は複数選択
  assert.strictEqual(TemplateRegistry.templates["g1_shape_identification"].answerType, "single_choice",
    "1-A は単一選択");
  assert.strictEqual(TemplateRegistry.templates["g1_shape_select_all"].answerType, "multi_choice",
    "1-B は複数選択");
  assert.strictEqual(TemplateRegistry.templates["g1_shape_compare"].answerType, "single_choice",
    "1-C は単一選択");
  console.log("  [PASS] 3種すべて登録済み");
}

function testFigureUIHelpers() {
  console.log("2. 共通UI部品の確認（SVG生成 + 図+文カード）");
  assert.strictEqual(typeof FigureShapeUI.createFigureSVG, "function", "createFigureSVG");
  assert.strictEqual(typeof FigureShapeUI.shapeCardHTML, "function", "shapeCardHTML");
  assert.strictEqual(typeof FigureShapeUI.buildProblem, "function", "buildProblem");
  assert.strictEqual(typeof FigureShapeUI.isSingleCorrect, "function", "isSingleCorrect");
  assert.strictEqual(typeof FigureShapeUI.isMultiCorrect, "function", "isMultiCorrect");
  assert.strictEqual(typeof FigureShapeUI.choicesSnapshot, "function", "choicesSnapshot");

  for (const type of ["triangle", "quadrilateral", "circle"]) {
    const svg = FigureShapeUI.createFigureSVG(type, { size: 90, rotation: 15 });
    assert.ok(svg.indexOf("<svg") === 0, `${type} のSVG生成（開始タグ）`);
    assert.ok(svg.indexOf("</svg>") > 0, `${type} のSVG生成（終了タグ）`);
  }

  const html = FigureShapeUI.shapeCardHTML(
    { id: "c1", figure: { type: "triangle", params: {} }, text: "かどが3つの かたち" }, false);
  assert.ok(html.indexOf("shape-card") >= 0, "カードクラス");
  assert.ok(html.indexOf("<svg") >= 0, "カード内にSVG");
  assert.ok(html.indexOf("かどが3つの かたち") >= 0, "カード文");
  assert.ok(html.indexOf('data-choice-id="c1"') >= 0, "カードID属性");

  const selHtml = FigureShapeUI.shapeCardHTML(
    { id: "c2", figure: { type: "circle", params: {} }, text: "まるい かたち" }, true);
  assert.ok(selHtml.indexOf("shape-card--selected") >= 0, "選択状態クラス");

  // 長い文でもレイアウトが崩れないよう、文は専用要素（折り返し可能）に収める
  const longText = "とても ながい せつめい ぶんしょう でも レイアウト を くずさない";
  const longHtml = FigureShapeUI.shapeCardHTML(
    { id: "c3", figure: { type: "triangle", params: {} }, text: longText }, false);
  assert.ok(longHtml.indexOf('class="shape-card-text"') >= 0, "文は専用要素に格納");
  assert.ok(longHtml.indexOf(longText) >= 0, "20文字超の文もそのまま保持");
  console.log("  [PASS] SVG生成 / カードHTML 生成OK（選択状態・長文対応含む）");
}

function testGeneration() {
  console.log("3. 問題生成と検証");
  for (const id of FIGURE_IDS) {
    const t = TemplateRegistry.templates[id];
    for (let i = 0; i < 10; i++) {
      const q = RuleBasedQuestionSource.generateQuestion(id, []);
      assert.ok(q.questionText && q.questionText.length > 0, `${id} questionText`);
      assert.strictEqual(q.answerType, t.answerType, `${id} answerType 継承`);
      assert.ok(Array.isArray(q.figureChoices) && q.figureChoices.length >= 3,
        `${id} figureChoices >= 3`);
      assert.ok(Array.isArray(q.correctChoiceIds) && q.correctChoiceIds.length >= 1,
        `${id} correctChoiceIds >= 1`);
      for (const c of q.figureChoices) {
        assert.ok(c.figure && typeof c.figure.type === "string", `${id} choice ${c.id} figure.type`);
        assert.ok(typeof c.text === "string" && c.text.length > 0, `${id} choice ${c.id} text`);
      }
      for (const cid of q.correctChoiceIds) {
        assert.ok(q.figureChoices.some(c => c.id === cid), `${id} 正解 ${cid} が choices に存在`);
      }
      if (t.answerType === "multi_choice") {
        assert.ok(q.correctChoiceIds.length >= 2, `${id} multi_choice は正解2件以上`);
      } else {
        assert.strictEqual(q.correctChoiceIds.length, 1, `${id} single_choice は正解1件`);
      }
      const v = QuestionValidator.validate(q, []);
      assert.ok(v.valid, `${id} validator valid (errors: ${JSON.stringify(v.errors)})`);
    }
  }
  console.log("  [PASS] 3種 x 10回 生成・検証OK");
}

function testJudge() {
  console.log("4. 正解判定（単一 / multi_choice 完全一致）");
  assert.ok(FigureShapeUI.isSingleCorrect("c2", ["c2"]), "単一: 正解IDを選ぶ");
  assert.ok(!FigureShapeUI.isSingleCorrect("c1", ["c2"]), "単一: 不正解IDは不正解");

  const correct = ["p2", "p4", "p6"];
  assert.ok(FigureShapeUI.isMultiCorrect(["p6", "p2", "p4"], correct), "全部選べば正解（順不同）");
  assert.ok(!FigureShapeUI.isMultiCorrect(["p2", "p4"], correct), "不足は不正解");
  assert.ok(!FigureShapeUI.isMultiCorrect(["p2", "p4", "p6", "p1"], correct), "余計に選ぶと不正解");
  assert.ok(!FigureShapeUI.isMultiCorrect(["p1"], correct), "誤答のみは不正解");
  assert.ok(!FigureShapeUI.isMultiCorrect([], correct), "未選択は不正解");
  console.log("  [PASS] 完全一致判定（部分正解なし）");
}

function testVariety() {
  console.log("5. 生成バリエーション（対象図形・パターンの入れ替わり）");
  const idTargets = new Set();
  for (let i = 0; i < 30; i++) {
    const q = RuleBasedQuestionSource.generateQuestion("g1_shape_identification", []);
    const choice = q.figureChoices.find(c => c.id === q.correctChoiceIds[0]);
    if (choice) idTargets.add(choice.figure.type);
  }
  assert.ok(idTargets.size >= 2, `識別: 対象図形種が複数出る (${[...idTargets].join(",")})`);

  const allTargets = new Set();
  for (let i = 0; i < 30; i++) {
    const q = RuleBasedQuestionSource.generateQuestion("g1_shape_select_all", []);
    q.correctChoiceIds
      .map(id => (q.figureChoices.find(c => c.id === id) || {}).figure)
      .filter(Boolean)
      .forEach(f => allTargets.add(f.type));
  }
  assert.ok(allTargets.size >= 2, `すべて選ぶ: 対象図形種が複数出る (${[...allTargets].join(",")})`);

  const compareTexts = new Set();
  for (let i = 0; i < 20; i++) {
    const q = RuleBasedQuestionSource.generateQuestion("g1_shape_compare", []);
    compareTexts.add(q.questionText);
  }
  assert.ok(compareTexts.size >= 2, `比較: 問題文が複数出る (${compareTexts.size}種)`);

  console.log(`  [PASS] 識別対象: ${[...idTargets].join(", ")} / 全選択対象: ${[...allTargets].join(", ")} / 比較文: ${compareTexts.size}種`);
}

function testGridPositions() {
  console.log("6. 1-B のグリッド固定配置");
  for (let i = 0; i < 10; i++) {
    const q = RuleBasedQuestionSource.generateQuestion("g1_shape_select_all", []);
    const seen = new Set();
    for (const c of q.figureChoices) {
      assert.ok(c.position && typeof c.position.col === "number" && typeof c.position.row === "number",
        `choice ${c.id} に position{col,row} がある（グリッド固定）`);
      assert.ok(c.position.col >= 0 && c.position.col <= 2, `choice ${c.id} col が 0..2`);
      assert.ok(c.position.row >= 0 && c.position.row <= 1, `choice ${c.id} row が 0..1`);
      // 重複配置なし（allowOverlap: false 相当）
      const key = c.position.col + ":" + c.position.row;
      assert.ok(!seen.has(key), `choice ${c.id} の配置 ${key} が重複しない`);
      seen.add(key);
    }
    assert.ok(seen.size >= 5, `カード配置が 5 箇所以上に分かれる (${seen.size})`);
  }
  console.log("  [PASS] グリッド固定配置（重複なし・範囲内）");
}

function testSnapshot() {
  console.log("7. 回答保存用スナップショット");
  const q = RuleBasedQuestionSource.generateQuestion("g1_shape_select_all", []);
  const snap = FigureShapeUI.choicesSnapshot(q.figureChoices);
  assert.strictEqual(snap.length, q.figureChoices.length, "スナップショット件数一致");
  assert.ok(snap[0].figure && typeof snap[0].figure.type === "string", "figure を保持");
  assert.ok(typeof snap[0].text === "string", "text を保持");
  // 復習/結果表示で再表示できるよう、正解IDがスナップショット内に存在する
  for (const cid of q.correctChoiceIds) {
    assert.ok(snap.some(s => s.id === cid), `正解 ${cid} がスナップショット内に存在`);
  }
  console.log("  [PASS] choicesSnapshot 生成OK（復習/結果表示で再表示可能）");
}

testRegistered();
testFigureUIHelpers();
testGeneration();
testJudge();
testVariety();
testGridPositions();
testSnapshot();
console.log("\n=== 図形問題 統合テスト: 全合格 ===");