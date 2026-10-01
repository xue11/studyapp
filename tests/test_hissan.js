/**
 * V2.9.1: 筆算支援 (HissanSVG) テスト
 *
 * 検証する契約:
 *   1. 公開APIの存在
 *   2. 4演算 (add/sub/mul/div) の行構成と記号
 *   3. 繰り上がり・繰り下がりの桁位置（右端が1の位）
 *   4. 乗算の部分積の桁送り
 *   5. 除算の商・あまり、そして「通常表示で答えが漏れない」こと
 *   6. 段階表示 (normal / hint / solution) の出し分け
 *   7. 対象7テンプレへの統合（answerType 不変・SVG生成・NaN なし）
 *   8. 対象7テンプレの生成制約が実際に守られている（Step0 修正の回帰防止）
 *   9. equalsAnswer の正規化
 *  10. 先頭桁に 0 を描画しない（V2.9.1 修正の回帰防止: 2〜5桁 × 4演算）
 */
const path = require("path");
const R = path.join(__dirname, "..", "js");
["templates_math.js", "templates_units_p1.js", "templates_units_p2.js", "templates_g2_extra.js",
  "templates_figures_g1.js", "templates_figures_g2.js", "templates_figures_g3.js"
].forEach(f => require(path.join(R, f)));
const { RuleBasedQuestionSource } = require(path.join(R, "question_source.js"));
const { QuestionValidator } = require(path.join(R, "validator.js"));
const { TemplateRegistry } = require(path.join(R, "registries.js"));
const { HissanSVG } = require(path.join(R, "hissan_svg.js"));

let fail = 0;
const ok = (c, m) => { console.log((c ? "  [PASS] " : "  [FAIL] ") + m); if (!c) fail++; };

// 対象7テンプレ（2〜4年 / 筆算導入単位）
const TARGETS = [
  "g2_basic_add_01", "g2_basic_sub_01", "g2_std_add_carry_01", "g2_std_sub_borrow_01",
  "g3_std_mul21_01", "g4_basic_mul22_01", "g4_std_div31_01"
];

// resolve の行を "type:d1d2d3" 形式の文字列へ
function rowText(m) {
  return m.rows.map(r => r.type + ":" + (r.digits || []).join("")).join(" ");
}

console.log("=== V2.9.1 筆算 (HissanSVG) テスト ===");

// --- 1. 公開API ---
console.log("\n[1] 公開API");
["resolve", "fillSpecVars", "render", "buildDisplay", "answerDigits", "equalsAnswer"]
  .forEach(fn => ok(typeof HissanSVG[fn] === "function", `HissanSVG.${fn} が存在する`));
ok(Array.isArray(HissanSVG.OPS) && HissanSVG.OPS.length === 4, "OPS は4演算を持つ");
ok(HissanSVG.answerDigits(46).join("") === "46", "answerDigits(46) = [4,6]");
ok(HissanSVG.answerDigits(0).join("") === "0", "answerDigits(0) = [0]");

// --- 2. 4演算の行構成 ---
console.log("\n[2] 4演算の行構成");
// 23+7 は表示桁数2（先頭に 0 も空きマスも出ない）
ok(rowText(HissanSVG.resolve({ op: "add", a: 23, b: 7 }, {})).indexOf("operand:23") >= 0, "add: 被加数行");
ok(rowText(HissanSVG.resolve({ op: "add", a: 23, b: 7 }, {})).indexOf("operand:7") >= 0, "add: 加数行");
ok(rowText(HissanSVG.resolve({ op: "sub", a: 40, b: 7 }, {})).indexOf("operand:40") >= 0, "sub: 被減数行");
ok(rowText(HissanSVG.resolve({ op: "mul", a: 23, b: 4 }, {})).indexOf("operand:4") >= 0, "mul: かける数行");
ok(rowText(HissanSVG.resolve({ op: "div", a: 142, b: 7, q: 20, rem: 2 }, {})).indexOf("dividend:142") >= 0, "div: 被除数行");
ok(rowText(HissanSVG.resolve({ op: "div", a: 142, b: 7, q: 20, rem: 2 }, {})).indexOf("quotient") >= 0, "div: 商の行がある");

const addSign = HissanSVG.resolve({ op: "add", a: 23, b: 7 }, {}).rows.find(r => r.sign);
ok(addSign && addSign.sign === "+", "加算の記号は +");
const subSign = HissanSVG.resolve({ op: "sub", a: 40, b: 7 }, {}).rows.find(r => r.sign);
ok(subSign && subSign.sign === "−", "減算の記号は −（教科書の全角マイナス）");
const mulSign = HissanSVG.resolve({ op: "mul", a: 23, b: 4 }, {}).rows.find(r => r.sign);
ok(mulSign && mulSign.sign === "×", "乗算の記号は ×");
const divSign = HissanSVG.resolve({ op: "div", a: 142, b: 7, q: 20, rem: 2 }, {}).rows.find(r => r.sign);
ok(divSign && divSign.sign === "÷", "除算の記号は ÷");

// --- 3. 繰り上がり・繰り下がりの桁位置 ---
console.log("\n[3] 繰り上がり・繰り下がりの桁位置（右端が1の位）");
ok(HissanSVG.addCarry(27, 5).indexOf(1) === 1, "addCarry(27,5) の繰り上がりは十の位(index 1)");
// 99+1 は十の位と百の位の両方で繰り上がる（9+1=10、9+0+1=10）
ok(HissanSVG.addCarry(99, 1).filter(x => x === 1).length === 2, "addCarry(99,1) は十の位と百の位で繰り上がる");
ok(HissanSVG.addCarry(20, 3).indexOf(1) < 0, "addCarry(20,3) は繰り上がりなし");
ok(HissanSVG.borrowDown(30, 7).indexOf(1) === 1, "borrowDown(30,7) の繰り下げは十の位(index 1)");
ok(HissanSVG.borrowDown(305, 47).filter(x => x === 1).length === 2, "borrowDown(305,47) は2箇所で繰り下がり");

// 繰り下がりは中黒 "・" で描かれる（教科書表記）
const borrowHTML = HissanSVG.render({ op: "sub", a: 30, b: 7 }, { stage: "hint" });
ok(borrowHTML.indexOf("・") >= 0, "繰り下がりは中黒「・」で描画される");
const carryHTML = HissanSVG.render({ op: "add", a: 27, b: 5 }, { stage: "hint" });
ok(carryHTML.indexOf(">1<") >= 0, "繰り上がりは数字「1」で描画される");

// --- 4. 乗算の部分積 ---
console.log("\n[4] 乗算の部分積と桁送り");
const parts = HissanSVG.mulParts(23, 14);
ok(parts.length === 2, "23 x 14 の部分積は2つ");
ok(parts[0].value === 92 && parts[0].shift === 0, "部分積0: 23x4=92（シフトなし）");
ok(parts[1].value === 23 && parts[1].shift === 1, "部分積1: 23x1=23（1桁シフト）");
ok(rowText(HissanSVG.resolve({ op: "mul", a: 23, b: 14 }, { stage: "normal" })).indexOf("part") < 0,
  "通常表示では部分積を出さない");
ok(rowText(HissanSVG.resolve({ op: "mul", a: 23, b: 14 }, { stage: "hint" })).indexOf("part") >= 0,
  "ヒント表示では部分積が出る");

// 部分積は下位桁から順に並ぶので、"+" は「最後に書く行」＝最上位桁の部分積にだけ付く
const partRows = HissanSVG.resolve({ op: "mul", a: 23, b: 14 }, { stage: "hint" }).rows.filter(r => r.type === "part");
ok(partRows.length === 2 && partRows[0].sign === "" && partRows[1].sign === "+",
  "部分積の + は下の行（最上位桁の部分積）に付く（23x14）");
const partRows1 = HissanSVG.resolve({ op: "mul", a: 23, b: 4 }, { stage: "hint" }).rows.filter(r => r.type === "part");
ok(partRows1.length === 1 && partRows1[0].sign === "", "部分積が1つ（1桁をかける）なら + を付けない");

// --- 5. 除算の答え漏洩防止 ---
console.log("\n[5] 除算の商・あまりと答えの漏洩防止");
const divNormal = HissanSVG.resolve({ op: "div", a: 142, b: 7, q: 20, rem: 2 }, { stage: "normal" });
ok(divNormal.rows[0].digits.every(d => d === null), "通常表示では商のマスが空（答えを漏らさない）");
const divHint = HissanSVG.resolve({ op: "div", a: 142, b: 7, q: 20, rem: 2 }, { stage: "hint" });
ok(divHint.rows[0].digits.filter(d => d !== null).join("") === "20", "ヒント表示では商が 20（3桁幅に右詰め）");
const divSol = HissanSVG.resolve({ op: "div", a: 142, b: 7, q: 20, rem: 2 }, { stage: "solution" });
ok(divSol.rows[0].filled === true, "解説表示では商が強調される");
ok(divHint.rows.some(r => r.type === "remainder" && r.digits[0] === 2), "あまり 2 が表示される");

// --- 6. 段階表示 ---
console.log("\n[6] 段階表示 (normal / hint / solution)");
["add", "sub", "mul", "div"].forEach(op => {
  const spec = op === "div" ? { op, a: 142, b: 7, q: 20, rem: 2 } : { op, a: 23, b: 14 };
  const d = HissanSVG.buildDisplay(spec, {});
  ok(d.hissanHTML.indexOf("<svg") >= 0, `${op}: 通常表示は SVG`);
  ok(d.hissanHintHTML.indexOf("<svg") >= 0, `${op}: ヒント表示は SVG`);
  ok(d.hissanSolutionHTML.indexOf("<svg") >= 0, `${op}: 解説表示は SVG`);
  ok(d.hissanHTML.indexOf("NaN") < 0 && d.hissanHintHTML.indexOf("NaN") < 0, `${op}: NaN を含まない`);
});
const bd = HissanSVG.buildDisplay({ op: "add", a: "{a}", b: "{b}" }, { a: 38, b: 25 });
ok(bd.answerText === "63", "答えは answerText として保持（SVG埋め込みではない）");
ok(HissanSVG.resolve({ op: "add", a: 38, b: 25 }, { stage: "normal" }).rows.find(r => r.type === "answer").filled === false,
  "通常表示の答え行は未入力");

// --- 7. 対象7テンプレへの統合 ---
console.log("\n[7] 対象7テンプレへの統合");
TARGETS.forEach(id => {
  const tpl = TemplateRegistry.get(id);
  ok(!!tpl && !!tpl.hissanSpec, `${id} に hissanSpec がある`);
  const q = RuleBasedQuestionSource.generateQuestion(id, []);
  ok(!!q.hissanHTML && q.hissanHTML.indexOf("<svg") >= 0, `${id} が筆算SVGを生成する`);
  ok(q.hissanHTML.indexOf("NaN") < 0, `${id} のSVGに NaN がない`);
  ok(q.answerType === "number_input", `${id} は answerType を変えない（既存フロー維持）`);
  ok(QuestionValidator.validate(q, []).valid, `${id} は QuestionValidator を通る`);
});
const filled = HissanSVG.fillSpecVars({ op: "add", a: "{a}", b: "{b}" }, { a: 23, b: 7 });
ok(filled.a === 23 && filled.b === 7, "fillSpecVars が {a}/{b} を数値解決する");

// --- 8. 生成制約の回帰防止（Step0 修正の検証）---
console.log("\n[8] 生成制約が守られている（Step0 修正の回帰防止）");
function checkConstraint(id, test, label) {
  let bad = 0;
  for (let i = 0; i < 500; i++) {
    const v = RuleBasedQuestionSource._generateVariables(TemplateRegistry.get(id).generate);
    if (!test(v)) bad++;
  }
  ok(bad === 0, `${label}（${id}）500問すべて制約を満たす（違反 ${bad}）`);
}
checkConstraint("g2_basic_add_01", v => (v.a % 10) + (v.b % 10) <= 9, "繰り上がりなし加算");
checkConstraint("g2_basic_sub_01", v => (v.a % 10) >= (v.b % 10), "繰り下がりなし減算");
checkConstraint("g2_std_add_carry_01", v => (v.a % 10) + (v.b % 10) >= 10, "繰り上がり加算");
checkConstraint("g2_std_sub_borrow_01", v => (v.a % 10) < (v.b % 10), "繰り下がり減算");
checkConstraint("g4_std_div31_01", v => v.rem < v.b, "3けた除算のあまり条件");

let carryMissing = 0;
for (let i = 0; i < 200; i++) {
  const q = RuleBasedQuestionSource.generateQuestion("g2_std_add_carry_01", []);
  const hint = HissanSVG.resolve({ op: "add", a: q.variables.a, b: q.variables.b }, { stage: "hint" });
  const carryRow = hint.rows.find(r => r.type === "carry");
  if (!carryRow || !carryRow.digits.includes(1)) carryMissing++;
}
ok(carryMissing === 0, `繰り上がり単元の筆算に必ず繰り上がりが入る（欠落 ${carryMissing}）`);

// --- 9. equalsAnswer の正規化 ---
console.log("\n[9] equalsAnswer の正規化");
ok(HissanSVG.equalsAnswer("63", "63") === true, "63 vs 63");
ok(HissanSVG.equalsAnswer("063", "63") === true, "先頭0を吸収");
ok(HissanSVG.equalsAnswer("６３", "63") === true, "全角数字を吸収");
ok(HissanSVG.equalsAnswer(" 63 ", "63") === true, "空白を吸収");
ok(HissanSVG.equalsAnswer("64", "63") === false, "64 vs 63 は不一致");
ok(HissanSVG.equalsAnswer("", "63") === false, "空回答は不一致");
ok(HissanSVG.equalsAnswer("0", "00") === true, "0 と 00 は一致");

// --- 10. 先頭0を描画しない（V2.9.1 修正の回帰防止）---
console.log("\n[10] 先頭桁に 0 を描画しない（2〜5桁 × 4演算）");

// 数字行のうち、先頭桁が 0 のまま残っている行を返す。
// carry/borrow は「マークなし」を 0 で表すが 1 のマスしか描かないため対象外。
// rule は桁を持たず、remainder は「あまり N」として別に描くため対象外。
function leadZeroRows(m) {
  return m.rows.filter(r => {
    if (r.type === "carry" || r.type === "borrow" || r.type === "rule" || r.type === "remainder") return false;
    const d = r.digits || [];
    if (d.length === 0) return false;
    if (d.every(x => x === 0)) return false; // 答えが 0 そのものは正しい表示
    return d[0] === 0;
  });
}

// 桁数が足りない行は 0 ではなく「空きマス ("")」で右詰めする
// （normal 段階では carry/borrow 行が無いので、operand 行は type で引く）
const operandA = spec => HissanSVG.resolve(spec, {}).rows.find(r => r.type === "operand");
ok(operandA({ op: "add", a: 39, b: 30 }).digits.join("|") === "3|9",
  "39+30 の 39 は [3,9]（桁数が合うので空きマスなし）");
ok(operandA({ op: "add", a: 456, b: 789 }).digits.join("|") === "|4|5|6",
  "456+789 の 456 は 空きマス+[4,5,6]（0 ではなく空きマスで右詰め）");
ok(HissanSVG.resolve({ op: "div", a: 306, b: 6, q: 51, rem: 0 }, { stage: "hint" }).rows[0].digits.join("|") === "|5|1",
  "306÷6 の商 51 は 空きマス+[5,1]");
// 消すのは「無い桁」だけ。値の途中・末尾の 0 は残す
ok(operandA({ op: "add", a: 105, b: 20 }).digits.join("") === "105",
  "105 の内部の 0 は残す（消すのは先頭の無い桁だけ）");
ok(HissanSVG.resolve({ op: "sub", a: 100, b: 100 }, {}).rows.find(r => r.type === "answer").digits.join("") === "0",
  "答えが 0 のときは 0 を描く（消しすぎない）");

// 桁数クラス別のランダム検証（200問 × 4演算）
const DIGIT_CLASSES = [
  { name: "2桁", lo: 10, hi: 99 },
  { name: "3桁", lo: 100, hi: 999 },
  { name: "4桁", lo: 1000, hi: 9999 },
  { name: "5桁", lo: 10000, hi: 99999 }
];
DIGIT_CLASSES.forEach(cls => {
  let bad = 0;
  const N = 200;
  for (let i = 0; i < N; i++) {
    const x = cls.lo + Math.floor(Math.random() * (cls.hi - cls.lo + 1));
    const y = cls.lo + Math.floor(Math.random() * (cls.hi - cls.lo + 1));
    const a = Math.max(x, y), b = Math.min(x, y);
    const models = [
      HissanSVG.resolve({ op: "add", a, b }, { stage: "solution" }),
      HissanSVG.resolve({ op: "sub", a, b }, { stage: "solution" }),
      HissanSVG.resolve({ op: "mul", a, b }, { stage: "solution" }),
      HissanSVG.resolve({ op: "div", a, b, q: Math.floor(a / b), rem: a % b }, { stage: "solution" })
    ];
    models.forEach(m => { if (leadZeroRows(m).length > 0) bad++; });
  }
  ok(bad === 0, `${cls.name}: 先頭0を描画しない（${N}問 × 4演算 / 違反 ${bad}）`);
});

// 代表ケース（桁上がり・桁下がり・1桁をかける/わる・部分積）
const LEAD0_CASES = [
  { label: "2桁 繰り上がり加算", spec: { op: "add", a: 19, b: 16 }, want: ["operand:19", "operand:16", "answer:35"] },
  { label: "3桁 4桁化する加算", spec: { op: "add", a: 456, b: 789 }, want: ["operand:456", "operand:789", "answer:1245"] },
  { label: "2桁 繰り下がり減算", spec: { op: "sub", a: 78, b: 28 }, want: ["operand:78", "operand:28", "answer:50"] },
  { label: "4桁 桁下がり減算", spec: { op: "sub", a: 1000, b: 1 }, want: ["operand:1000", "operand:1", "answer:999"] },
  { label: "5桁 桁下がり減算", spec: { op: "sub", a: 10000, b: 1 }, want: ["operand:10000", "operand:1", "answer:9999"] },
  { label: "2桁 1桁をかける乗算", spec: { op: "mul", a: 23, b: 4 }, want: ["operand:23", "operand:4", "answer:92"] },
  { label: "2桁 2桁をかける乗算", spec: { op: "mul", a: 23, b: 14 }, want: ["operand:23", "operand:14", "answer:322"] },
  { label: "2桁×4桁 の乗算", spec: { op: "mul", a: 12, b: 3456 }, want: ["operand:12", "operand:3456", "answer:41472"] },
  { label: "2桁 1桁でわる除算", spec: { op: "div", a: 84, b: 7, q: 12, rem: 0 }, want: ["quotient:12", "dividend:84", "divisor:7"] },
  { label: "3桁 1桁でわる除算", spec: { op: "div", a: 306, b: 6, q: 51, rem: 0 }, want: ["quotient:51", "dividend:306", "divisor:6"] },
  { label: "5桁 3桁でわる除算", spec: { op: "div", a: 12345, b: 678, q: 18, rem: 141 }, want: ["quotient:18", "dividend:12345", "divisor:678"] }
];
LEAD0_CASES.forEach(c => {
  const m = HissanSVG.resolve(c.spec, { stage: "solution" });
  const txt = rowText(m);
  const missing = c.want.filter(w => txt.indexOf(w) < 0);
  const bad = leadZeroRows(m);
  ok(missing.length === 0 && bad.length === 0,
    `${c.label}: ${c.want.join(" / ")} を含み先頭0なし（不足 ${missing.length} / 先頭0 ${bad.length}）`);
});

// 描画結果（SVG）にも先頭0が残っていないこと
ok(HissanSVG.render({ op: "add", a: 456, b: 789 }, { stage: "solution" }).indexOf(">0<") < 0,
  "SVG に先頭0を描画しない（456+789）");
ok(HissanSVG.render({ op: "add", a: 105, b: 20 }, { stage: "solution" }).indexOf(">0<") >= 0,
  "SVG は値の途中の 0 を描画する（105+20）");
ok(HissanSVG.render({ op: "add", a: 456, b: 789 }, { stage: "solution" }).indexOf("NaN") < 0,
  "先頭0対応後も SVG に NaN がない");

// --- 結果 ---
console.log(fail === 0 ? "\n[PASS] 筆算テスト 全て成功" : `\n[FAIL] ${fail} 件の失敗`);
process.exit(fail === 0 ? 0 : 1);
