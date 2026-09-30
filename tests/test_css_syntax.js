/**
 * CSS 構文・構造テスト — V2.7.0
 * Run with: node tests/test_css_syntax.js
 *
 * 背景:
 *   V2.6.12 時点の css/app.css は .shape-card-text ブロックが閉じられておらず、
 *   末尾の余分な「}」がそれを閉じていた。その結果 .clock-stage 以下
 *   (V2.6.7〜V2.6.11 の時計レイアウト/入力欄 CSS 11 ルール) が
 *   宣言リストの内側に飲み込まれて **一切適用されていなかった**。
 *   本テストはこの手の「括弧の閉じ忘れ・余分な閉じ括弧」を恒久的に検出する。
 *
 * 検証項目:
 *  1. 波括弧の深さが負にならない / 最終深さが 0（閉じ忘れ・余分な閉じ括弧なし）
 *  2. 入れ子ブロックは at-rule (@media 等) の内側のみ（セレクタの飲み込み検出）
 *  3. 各ルール本体が「宣言」として解釈できる（コロンの無い断片を検出）
 *  4. アプリが実際に使う代表セレクタが「有効な位置」に存在する
 */
const fs = require("fs");
const path = require("path");
const assert = require("assert");

// 引数で対象ファイルを差し替え可能（回帰確認用: node tests/test_css_syntax.js path/to/old.css）
const CSS_PATH = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.join(__dirname, "..", "css", "app.css");

/** セレクタ文字列からコメントを除き、整形する */
function normalizeSelector(raw) {
  return raw.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/\s+/g, " ").trim();
}

/**
 * CSS を走査してブロック構造を取り出す（コメント・文字列は無視）
 * @returns {{ rules: Array<{selector:string, atRule:boolean, depth:number, line:number, body:string}>, minDepth:number, finalDepth:number, negativeLine:number|null }}
 */
function analyze(css) {
  const rules = [];
  const stack = [];
  let depth = 0;
  let minDepth = 0;
  let negativeLine = null;
  let line = 1;
  let selectorStart = 0; // 現在のセレクタ文字列の開始位置
  let bodyStart = 0;
  let i = 0;

  while (i < css.length) {
    const ch = css[i];
    if (ch === "\n") { line++; i++; continue; }

    // コメント
    if (ch === "/" && css[i + 1] === "*") {
      const end = css.indexOf("*/", i + 2);
      const stop = end === -1 ? css.length : end + 2;
      for (let k = i; k < stop; k++) if (css[k] === "\n") line++;
      i = stop;
      continue;
    }
    // 文字列
    if (ch === '"' || ch === "'") {
      const quote = ch;
      i++;
      while (i < css.length && css[i] !== quote) {
        if (css[i] === "\\") i++;
        if (css[i] === "\n") line++;
        i++;
      }
      i++;
      continue;
    }
    // ブロック開始
    if (ch === "{") {
      const selector = normalizeSelector(css.slice(selectorStart, i));
      const startLine = line;
      depth++;
      stack.push({ selector, atRule: selector.indexOf("@") === 0, depth, line: startLine, bodyStart: i + 1 });
      bodyStart = i + 1;
      i++;
      continue;
    }
    // ブロック終了
    if (ch === "}") {
      const open = stack.pop();
      if (!open) {
        if (negativeLine === null) negativeLine = line;
        depth = 0;
        i++;
        continue;
      }
      depth--;
      if (depth < minDepth) minDepth = depth;
      rules.push({
        selector: open.selector,
        atRule: open.atRule,
        depth: open.depth - 1,
        line: open.line,
        body: css.slice(open.bodyStart, i)
      });
      selectorStart = i + 1;
      i++;
      continue;
    }
    if (ch === ";") { selectorStart = i + 1; }
    i++;
  }

  return { rules, minDepth, finalDepth: depth, negativeLine };
}

console.log("=== CSS 構文・構造テスト (V2.7.0) ===");
assert.ok(fs.existsSync(CSS_PATH), "css/app.css が存在する");
const css = fs.readFileSync(CSS_PATH, "utf8");
const res = analyze(css);

// 1. 括弧のバランス
{
  console.log("1. 波括弧のバランス");
  assert.strictEqual(res.negativeLine, null,
    "閉じ括弧が余分に存在しない (line " + res.negativeLine + ")");
  assert.strictEqual(res.finalDepth, 0, "すべてのブロックが閉じられている (final depth " + res.finalDepth + ")");
  console.log("  [PASS] 括弧は過不足なく閉じられている（ルール " + res.rules.length + " 件）");
}

// 2. 入れ子は at-rule の内側のみ
{
  console.log("2. 入れ子ブロックの許可範囲（セレクタ飲み込みの検出）");
  const nestedAfterSelector = [];
  const byDepth = res.rules.filter(r => r.depth > 0);
  // depth>0 のルールは「直近の親が at-rule のブロック」であることだけを許可する
  for (const r of byDepth) {
    // 親（1つ上の階層）を近似判定: 同じファイル内で depth が 1 少なく、かつ line が手前にある最も近いもの
    const parent = res.rules
      .filter(p => p.depth === r.depth - 1 && p.line < r.line)
      .sort((a, b) => b.line - a.line)[0];
    if (!parent || !parent.atRule) {
      nestedAfterSelector.push({ selector: r.selector, line: r.line, parent: parent ? parent.selector : null });
    }
  }
  assert.deepStrictEqual(nestedAfterSelector, [],
    "at-rule (@media 等) 以外でブロックが入れ子になっていない: " +
    JSON.stringify(nestedAfterSelector.slice(0, 3)));
  console.log("  [PASS] 入れ子 " + byDepth.length + " 件はすべて @media 等の内側");
}

// 3. ルール本体が宣言として解釈できる（セレクタが飲み込まれていない）
{
  console.log("3. 各ルール本体の宣言チェック");
  const bad = [];
  for (const r of res.rules) {
    if (r.atRule) continue;                            // at-rule は本体がルール列
    if (r.depth > 0) continue;                         // @media 内は宣言のみ
    const body = r.body;
    if (body.indexOf("{") >= 0) { bad.push({ selector: r.selector, line: r.line, reason: "nested-brace" }); continue; }
    for (const chunk of body.split(";")) {
      const t = chunk.trim();
      if (t.length === 0) continue;
      if (!/^[-a-zA-Z]+[a-zA-Z0-9-]*\s*:/.test(t)) {
        bad.push({ selector: r.selector, line: r.line, reason: "invalid-declaration:" + t.slice(0, 30) });
        break;
      }
    }
  }
  assert.deepStrictEqual(bad, [], "全ての宣言が「プロパティ: 値」形式: " + JSON.stringify(bad.slice(0, 3)));
  console.log("  [PASS] 全ルール本体が宣言のみで構成されている");
}

// 4. 代表セレクタが有効位置に存在する
{
  console.log("4. 必須セレクタの存在（時計・図形・テンキー）");
  const all = new Set(res.rules.map(r => r.selector));
  const required = [
    ".shape-card", ".shape-card-text", ".shape-grid", ".shape-list",
    ".clock-stage", ".clock-figure", ".clock-large svg", ".clock-small svg",
    ".clock-field", ".clock-field-label", ".clock-pad-grid", ".clock-pad-btn",
    ".figure-stage", ".fig-part", ".fig-large svg", ".fig-label", ".fig-catalog"
  ];
  const missing = required.filter(sel => !all.has(sel));
  assert.deepStrictEqual(missing, [], "必須セレクタが存在: " + missing.join(", "));
  console.log("  [PASS] 必須セレクタ " + required.length + " 件すべて存在");
}

console.log("\n=== CSS 構文・構造テスト: 全合格 ===");
