/**
 * HissanSVG — 筆算（ひっ算）の共通SVG部品 (V2.9.4)
 *
 * 加減乗除の「筆算」を、教科書の書き方に従ってSVGで描画する共通部品。
 * 2〜4年生の 計算/筆算 単元で共通して使う。
 *
 * 仕様 (詳細設計):
 *  - 4演算 (add / sub / mul / div) に対応し、教科書と同じ行構成・記号で描く
 *      add : a / +b / 罫線 / 答え        （繰り上がりは行頭に小さな "1"）
 *      sub : a / −b / 罫線 / 答え        （繰り降りは教科書どおり数字でなく "・"）
 *      mul : a / ×b / 罫線 / 部分積 / 罫線 / 答え
 *      div : 商（上に "_" 罫線つき）/ 被除数 / ÷b / あまり
 *  - 桁は均等割りのセルに配置し、桁送りは「右詰め」で表現する
 *      （例: 23 × 4 の部分積 92 は 1桁右にオフセットして描く）
 *  - 行ごとに桁数が足りない場合は右詰めでそろえ、左側の余りは「空きマス」にする
 *      （0 で埋めると 039 + 030 = 069 のように値と無関係な先頭 0 が表示されるため。
 *        空きマスは BLANK(= "") で表し、digitCell が何も描画しないことで実現する）
 *  - 段階表示: 通常の出題時は「答えの行が空」の図、ヒント時は「繰り上がり/部分積まで出た」図、
 *    解説時は「答えが埋まった完成版」の図を出し分けられる
 *  - V2.9.2: 答え（加減乗の答え行・除算の商とあまり）を描くのは「解説」段階だけに限定する。
 *    通常の出題時は空マス（破線の枠）、ヒント時は途中まで（繰り上がり行／繰り下がり行／
 *    部分積／商の先頭1桁）を出し、答えそのものは見せない。
 *    この段階制御は resolve が一手に担い、render は model をそのまま描くだけにする。
 *  - 答えはSVGへ埋め込まず、正規化可能な値（answerText）として別途保持する
 *  - V2.9.3: 演算記号（+ − × ÷）の左右余白を保証する。
 *    旧実装は記号を `opWidth * 0.45` (= 11.7) に text-anchor=middle で置いており、
 *    グリフ幅が 24px を超えるとインク左端が viewBox の左端 x=0 を越えて欠けていた。
 *    × (U+00D7) と ÷ (U+00F7) は East Asian Ambiguous 幅で、CJK 環境では全角化するため
 *    特に欠けやすい。＋ − も同じ座標を通っているため同等のリスクを持っていた。
 *    演算記号列を1桁幅 (cellW) まで広げ、記号を列の中央 (LAYOUT.signX) に置き、
 *    数字と同じフォント (FONT) で描画することで端末差を吸収する。
 *    加減乗除すべてがこの経路を通るため、4演算が同時に改善する。
 *
 * 公開API:
 *   HissanSVG.OPS                         対応する演算 ["add","sub","mul","div"]
 *   HissanSVG.LAYOUT                      レイアウト寸法（opWidth / signX / signMinMargin を含む）
 *   HissanSVG.resolve(spec, opts)          spec → 行・桁・空マスの構造化モデル
 *   HissanSVG.fillSpecVars(spec, vars)    spec 内の "{a}" を生成変数で置換
 *   HissanSVG.render(spec, opts)           1つの筆算SVG文字列
 *   HissanSVG.buildDisplay(spec, vars)     question_source から呼ぶ組み立て
 *   HissanSVG.answerDigits(value)         数値を桁配列へ（右詰め・先頭0除去）
 *   HissanSVG.equalsAnswer(a, b)          筆算回答の比較
 */
(function () {
  "use strict";

  // 対応する演算
  var OPS = ["add", "sub", "mul", "div"];

  // 演算ごとの記号（教科書表記）
  var OP_SIGN = { add: "+", sub: "−", mul: "×", div: "÷" };

  // レイアウト寸法 (viewBox 座標)。1桁 = cellW、高さ = rowH
  var LAYOUT = {
    cellW: 34,     // 1桁分の幅
    rowH: 36,      // 1行の高さ
    // 演算記号（+ − × ÷）を収める列の幅。1桁分の幅 (cellW) と同じにして、
    // 記号が数字列の左隣に「1桁ぶんの欄」を持つ教科書どおりの体裁にする。
    // V2.9.3: 26 → 34（旧値は記号のインク左端に 0.7px しか余白がなく、
    // × ÷ が全角幅で描かれる端末では viewBox の左端を突き抜けて左側が欠けていた）
    opWidth: 34,
    fontSize: 24,  // 数字のフォントサイズ
    smallFont: 15, // 繰り上がり・あまりなど小さい文字
    signFont: 22,  // 演算記号のフォントサイズ
    padTop: 6,
    padRight: 10,
    // 演算記号のインクが「数字列の左端(opWidth)」から必ず残す最低余白 (viewBox 座標)。
    // 記号グリフの実幅は環境依存（× ÷ は East Asian Ambiguous 幅で全角化することがある）のため、
    // 最低でもこの分だけ空けておく。tests/test_hissan.js [12] が検証する。
    signMinMargin: 3
  };

  // 演算記号の中心 X。記号は演算記号列の中央に置き、左右に均等に余白を作る。
  // 旧実装の `opWidth * 0.45` (= 11.7) は左 0.7px / 右 14.3px と極端に非対称だった。
  LAYOUT.signX = LAYOUT.opWidth / 2;

  var COLORS = {
    digit: "#1e293b",
    sign: "#334155",
    carry: "#2563eb",
    rule: "#334155",    // 罫線
    subRule: "#94a3b8", // 補助罫線
    mark: "#dc2626"     // 解答済みの強調
  };

  var FONT = "'Hiragino Sans','Noto Sans JP',sans-serif";

  // 上位桁の「空きマス」（その桁に数字を書かない）を表す番兵値。
  // 0 は実際に描画される桁なので、区別するために空文字を使う。
  // digitCell は この値を受け取ると何も描画しない。
  var BLANK = "";

  // ------------------------------------------------------------------
  // ユーティリティ
  // ------------------------------------------------------------------

  /**
   * 数値（または数字文字列）を安全に変換する。NaN や非数値は 0 扱い。
   */
  function toNum(v) {
    var n = Number(v);
    return (isFinite(n)) ? n : 0;
  }

  /**
   * 数値の桁配列を返す（右詰め）。例: 8 → [8] / 46 → [4,6] / 0 → [0]
   * @param {number|string} value
   * @returns {Array<number>}
   */
  function answerDigits(value) {
    var n = Math.abs(toNum(value));
    var s = String(Math.round(n));
    if (s === "0") return [0];
    return s.split("").map(function (c) { return parseInt(c, 10); });
  }

  /**
   * 桁数（0 は1桁扱い）
   */
  function digitCount(value) {
    return answerDigits(value).length;
  }

  /**
   * 桁配列を指定桁数に揃える（右詰め）。
   *
   * 不足する左側は「数字のないマス」を表す BLANK (= "") で埋める。0 で埋めると
   * 039 + 030 = 069 のように値と無関係な先頭 0 が表示されてしまうため、
   * 「実際に書かれている桁」と「まだ書かれていない桁」を区別する。
   * 描画側 (digitCell) は BLANK を何も描かないことで実現する。
   *
   * 例: padDigits([3, 9], 4) → ["", "", 3, 9]
   *
   * @param {Array<number>} digits 右詰めする桁配列
   * @param {number} width 表示桁数
   * @returns {Array<number|string>} 長さ width の配列（右端が1の位）
   */
  function padDigits(digits, width) {
    var out = new Array(Math.max(0, width)).fill(BLANK);
    for (var i = 0; i < digits.length && i < out.length; i++) {
      out[out.length - 1 - i] = digits[digits.length - 1 - i];
    }
    return out;
  }

  /**
   * 答え行（加減乗の答え／除算の商）の桁配列を、段階に応じて作る。 (V2.9.2)
   *
   * - solution: 実際の答えの桁を返す（render が強調色で描く）
   * - normal / hint: すべて null（空マス）を返す。digitCell は null を
   *   「薄い破線の枠」として描くため、答えの数字は画面に出ない。
   *
   * 0 や BLANK ではなく null を使うのは、答え行は桁数が確定していて
   * 「ここに書く」という場所を示す必要があるため（BLANK だと何も描かれない）。
   *
   * @param {number} value 答えの数値
   * @param {number} w 表示桁数
   * @param {string} stage "normal" | "hint" | "solution"
   * @returns {Array<number|null>} 長さ w の桁配列
   */
  function answerRowDigits(value, w, stage) {
    if (stage === "solution") return padDigits(answerDigits(value), w);
    return new Array(Math.max(0, w)).fill(null);
  }

  /**
   * 先頭（最上位）の1桁だけを残し、それより下の桁を空マス (null) にする。 (V2.9.2)
   *
   * わり算のヒントで商を全桁見せると、商＝答えそのものになってしまうため、
   * 「どの位から商が立ち始めるか」だけを示す。先頭の BLANK（桁が無いマス）は
   * そのまま残し、数字が現れた桁より下だけを空マスにする。
   *
   * 例: ["", 2, 0] → ["", 2, null]   （142 ÷ 7 の商 20 → 「2 _」）
   *
   * @param {Array<number|string>} digits 表示桁数にそろえた桁配列
   * @returns {Array<number|null>} 同じ長さの桁配列
   */
  function firstDigitOnly(digits) {
    var out = [];
    var shown = false;
    for (var i = 0; i < digits.length; i++) {
      var d = digits[i];
      var hasDigit = (d !== BLANK && d !== null && typeof d !== "undefined");
      if (!shown && hasDigit) {
        out.push(d);   // 最上位の1桁はそのまま見せる
        shown = true;
      } else if (shown) {
        out.push(null); // 2桁目以降は空マス
      } else {
        out.push(d);    // 先頭の「桁が無いマス」はそのまま
      }
    }
    return out;
  }

  /**
   * spec 内の "{name}" 形式を vars の値で置換する（数値化も行う）。
   * 例: {op:"add", a:"{a}", b:"{b}"} + vars{a:23,b:7} → {op:"add", a:23, b:7}
   * @param {Object} spec
   * @param {Object} vars
   * @returns {Object} 解決済みの spec（不正値は 0 に落ちる）
   */
  function fillSpecVars(spec, vars) {
    spec = spec || {};
    vars = vars || {};
    var out = {};
    for (var k in spec) {
      if (!Object.prototype.hasOwnProperty.call(spec, k)) continue;
      var v = spec[k];
      if (typeof v === "string") {
        var replaced = v.replace(/\{([A-Za-z0-9_]+)\}/g, function (_, name) {
          var raw = vars[name];
          return (typeof raw === "undefined" || raw === null) ? "0" : String(raw);
        });
        // 数値展位（a/b/q/quotient/rem など）は数値に落とす
        if (k === "a" || k === "b" || k === "q" || k === "quotient" || k === "rem") {
          out[k] = toNum(replaced);
        } else {
          out[k] = replaced;
        }
      } else {
        out[k] = v;
      }
    }
    return out;
  }

  // ------------------------------------------------------------------
  // 筆算の構造モデル（描画の唯一の情報源）
  // ------------------------------------------------------------------

  /**
   * 加算の繰り上がりを「表示用の桁配列（左=上位・右=1の位）」で求める。
   * 例: addCarry(27, 5) → [0, 1, 0]（十の位のマスに 1 が立つ）
   *
   * 内部計算を1の位から行うため、内部配列 carry[i] は i=0 が1の位。
   * 返り値も同じ順序（i=0 が1の位＝右端）で返し、padDigits / alignMarkRow と揃える。
   *
   * @param {number} a
   * @param {number} b
   * @returns {Array<number>} i=0 が1の位（右端）
   */
  function addCarry(a, b) {
    a = Math.abs(toNum(a));
    b = Math.abs(toNum(b));
    var len = String(Math.max(1, a, b) * 2).length + 1;
    var carry = new Array(len).fill(0);
    var ja = a, jb = b, c = 0, i = 0;
    while (ja > 0 || jb > 0 || c > 0) {
      var t = (ja % 10) + (jb % 10) + c;
      c = (t >= 10) ? 1 : 0;
      // 教科書では「繰り上がり先（次の桁）」のマスに 1 を書く。
      // 最終桁で繰り上がった場合は、その上の桁（i+1）に書く。
      if (c === 1) carry[i + 1] = 1;
      ja = Math.floor(ja / 10);
      jb = Math.floor(jb / 10);
      i++;
      if (i >= len) break;
    }
    return carry;
  }

  /**
   * 減算の繰り下がり。教科書では数字でなく中黒で表すため、ここでは 1 を保持し、
   * 描画側で "・" に変換する。
   * 例: borrowDown(30, 7) → [0, 1, 0]（十の位のマスに中黒）
   *
   * addCarry と同じく i=0 が1の位（右端）の順序で返す。
   * @param {number} a
   * @param {number} b
   * @returns {Array<number>} i=0 が1の位（右端）
   */
  function borrowDown(a, b) {
    a = Math.abs(toNum(a));
    b = Math.abs(toNum(b));
    var len = String(Math.max(a, b)).length + 1;
    var br = new Array(len).fill(0);
    var ja = a, jb = b, c = 0, i = 0;
    while (ja > 0 || jb > 0 || c > 0) {
      var t = (ja % 10) - (jb % 10) - c;
      if (t < 0) {
        c = 1;
        // 教科書では「繰り下がりをした桁（元の数の上）」に中黒を書く。
        br[i + 1] = 1;
      } else { c = 0; }
      ja = Math.floor(ja / 10);
      jb = Math.floor(jb / 10);
      i++;
      if (i >= len) break;
    }
    return br;
  }

  /**
   * 乗算の部分積（b を桁ごとに掛けて、桁シフト付きで返す）
   * 例: mulParts(23, 4) → [{value: 92, shift: 0}]
   *     mulParts(23, 14) → [{value: 46, shift: 0}, {value: 23, shift: 1}]
   * @param {number} a
   * @param {number} b
   * @returns {Array<{value:number,shift:number,factorDigit:number}>}
   */
  function mulParts(a, b) {
    a = Math.abs(toNum(a));
    b = Math.abs(toNum(b));
    var parts = [];
    var jb = b, shift = 0;
    while (jb > 0) {
      var digit = jb % 10;
      if (digit !== 0) {
        parts.push({ value: a * digit, shift: shift, factorDigit: digit });
      }
      jb = Math.floor(jb / 10);
      shift++;
    }
    if (parts.length === 0) parts.push({ value: 0, shift: 0, factorDigit: 0 });
    return parts;
  }

  /**
   * 繰り上がり/繰り下がり行を、表示桁数 w に正確にそろえる。
   *
   * addCarry / borrowDown は i=0 が1の位（右端）の配列を返す。
   * 右端が必ず1の位に一致するため、w より短い場合は左側を0で埋めるだけでよい。
   * （padDigits を使うと、繰り上がりで桁数が1つ増えた配列を丸めて位置がずれる）
   * ここでの 0 は「マークを付けない桁」を意味し、描画側 (render) が
   * 1 のマスだけを描くため 0 が画面に出ることはない。
   *
   * @param {Array<number>} arr i=0 が1の位の繰り上がり配列
   * @param {number} w 表示桁数
   * @returns {Array<number>} 長さ w の配列（右端が1の位）
   */
  function alignMarkRow(arr, w) {
    var out = new Array(Math.max(0, w)).fill(0);
    var n = Math.min(arr.length, w);
    for (var i = 0; i < n; i++) {
      out[w - 1 - i] = arr[i];
    }
    return out;
  }

  /**
   * 筆算の行・桁をすべて解決した構造化モデルを作る。
   * 描画（render）はこのモデルだけを見て出力するため、
   * 「通常表示 / ヒント表示 / 解説表示」の差分は opts.stage だけで決まる。
   *
   * stage ごとの出し分け (V2.9.2):
   *
   * | 段階 | 加減乗 | 除算 |
   * |------|--------|------|
   * | normal   | 答え行は空マス / 繰り上がり・部分積なし | 商は空マス / あまり行なし |
   * | hint     | 答え行は空マス / 繰り上がり・繰り下がり・部分積を表示 | 商は先頭1桁だけ / あまり行なし |
   * | solution | 答え行に数値（強調色） | 商の全桁（強調色）＋ あまり行 |
   *
   * 答え（加減乗の答え・除算の商とあまり）を数値で描くのは solution だけ。
   * これにより、出題時・ヒント時に答えそのものが画面へ漏れない。
   *
   * @param {Object} spec { op, a, b, q/quotient, rem }
   * @param {Object} [opts] { vars, stage: "normal"|"hint"|"solution" }
   * @returns {{op:string, rows:Array, cols:number, width:number, height:number,
   *            stage:string, answer:number, a:number, b:number, rem:number}}
   */
  function resolve(spec, opts) {
    opts = opts || {};
    spec = fillSpecVars(spec, opts.vars);
    var op = OPS.indexOf(spec.op) >= 0 ? spec.op : "add";
    var stage = opts.stage || spec.stage || "normal"; // normal | hint | solution
    var a = toNum(spec.a);
    var b = toNum(spec.b);
    var sign = OP_SIGN[op];

    var rows = [];
    var answer = 0;
    var rem = 0;
    var w = 0;

    if (op === "add") {
      answer = a + b;
      // 表示桁数は「実際に現れる最大の桁」で決める（最低桁数の底上げはしない）。
      // 底上げすると 39 + 30 が 039 + 030 = 069 のように先頭 0 が並んでしまう。
      w = Math.max(digitCount(a), digitCount(b), digitCount(answer));
      if (stage !== "normal") {
        rows.push({ type: "carry", digits: alignMarkRow(addCarry(a, b), w) });
      }
      rows.push({ type: "operand", digits: padDigits(answerDigits(a), w), sign: "" });
      rows.push({ type: "operand", digits: padDigits(answerDigits(b), w), sign: sign });
      rows.push({ type: "rule" });
      // V2.9.2: 答えの数字は解説表示でのみ描く（通常の出題時は空マス）
      rows.push({ type: "answer", digits: answerRowDigits(answer, w, stage), filled: stage === "solution" });

    } else if (op === "sub") {
      answer = a - b;
      w = Math.max(digitCount(a), digitCount(b), digitCount(Math.abs(answer)));
      if (stage !== "normal") {
        rows.push({ type: "borrow", digits: alignMarkRow(borrowDown(a, b), w) });
      }
      rows.push({ type: "operand", digits: padDigits(answerDigits(a), w), sign: "" });
      rows.push({ type: "operand", digits: padDigits(answerDigits(b), w), sign: sign });
      rows.push({ type: "rule" });
      // V2.9.2: 答えの数字は解説表示でのみ描く（通常の出題時は空マス）
      rows.push({ type: "answer", digits: answerRowDigits(answer, w, stage), filled: stage === "solution" });

    } else if (op === "mul") {
      answer = a * b;
      var parts = mulParts(a, b);
      var maxPartW = 0;
      parts.forEach(function (p) {
        var pw = digitCount(p.value) + p.shift;
        if (pw > maxPartW) maxPartW = pw;
      });
      // maxPartW は「部分積 + 桁送り」の最大幅。これを w に含めることで、
      // w - p.shift が部分積の桁数以上になり、左の桁が切り落とされない。
      w = Math.max(digitCount(a), digitCount(b), digitCount(answer), maxPartW);
      rows.push({ type: "operand", digits: padDigits(answerDigits(a), w), sign: "" });
      rows.push({ type: "operand", digits: padDigits(answerDigits(b), w), sign: sign });
      rows.push({ type: "rule" });
      // 部分積（ヒント以上で表示。最終桁以外は桁送りする）
      // V2.9.2: かける数が1桁で桁送りも無い場合、部分積は答えそのものになる
      //   （例: 23 × 4 の 92、20 × 6 の 120）。そのまま出すとヒントで答えを見せてしまい、
      //   解説でも同じ数字が2行に並ぶため、この場合は部分積行を作らない。
      // V2.9.4: 部分積が1つだけの場合は桁送りの有無にかかわらず表示しない。
      //   （例: 23 × 10 → 部分積 23 を1桁送りで描くと「23_」、
      //     45 × 20 → 部分積 90 を1桁送りで描くと「90_」= 答え 900 そのもの。
      //     桁送りを 0 として評価した表示値が答えと一致するため、ヒント漏洩になる）
      //   部分積が2つ以上ある場合（例: 23 × 14 → 92 / 23）は中間の値なので表示する。
      var showParts = (stage !== "normal") && !(parts.length === 1);
      if (showParts) {
        parts.forEach(function (p, idx) {
          rows.push({
            type: "part",
            digits: padDigits(answerDigits(p.value), w - p.shift),
            shift: p.shift,
            // 部分積は下位桁 (idx=0) から上位桁（最後の要素）へ並ぶ。
            // 教科書では「後から書く行」＝最後の部分積の左に "+" を付けるため、
            // 最上位桁の部分積（idx === parts.length - 1）だけに "+" を描く。
            // 部分積が1つだけ（かける数が1桁）のときは "+" を付けない。
            sign: (parts.length > 1 && idx === parts.length - 1) ? "+" : ""
          });
        });
        rows.push({ type: "rule" });
      }
      // V2.9.2: 答えの数字は解説表示でのみ描く（通常・ヒントでは空マス）
      rows.push({ type: "answer", digits: answerRowDigits(answer, w, stage), filled: stage === "solution" });

    } else {
      // div: 商は上に "_" 罫線つき。残りの行は 被除数 / ÷b / あまり
      var q = toNum((typeof spec.q !== "undefined")
        ? spec.q
        : ((typeof spec.quotient !== "undefined") ? spec.quotient : (b !== 0 ? Math.floor(a / b) : 0)));
      rem = toNum((typeof spec.rem !== "undefined")
        ? spec.rem
        : (b !== 0 ? a - b * Math.floor(a / b) : 0));
      answer = q;
      w = Math.max(digitCount(a), digitCount(q), digitCount(b));
      // V2.9.2: 商は答えそのものなので、段階に応じて見せ方を変える。
      //   通常   : 空マス（罫線だけ）
      //   ヒント : 先頭（最上位）の1桁だけ。例) 142÷7 → 商「2 _」（残りは自分で求める）
      //   解説   : 全桁を強調表示
      var quotientDigits;
      if (stage === "solution") {
        quotientDigits = padDigits(answerDigits(q), w);
      } else if (stage === "hint") {
        quotientDigits = firstDigitOnly(padDigits(answerDigits(q), w));
      } else {
        quotientDigits = new Array(w).fill(null);
      }
      rows.push({
        type: "quotient",
        digits: quotientDigits,
        rule: true,
        filled: stage === "solution"
      });
      rows.push({ type: "dividend", digits: padDigits(answerDigits(a), w) });
      rows.push({ type: "divisor", digits: padDigits(answerDigits(b), w), sign: sign });
      // V2.9.2: あまりも答えの一部なので、数値を出すのは解説表示だけにする
      if (stage === "solution") {
        rows.push({ type: "remainder", digits: [Math.abs(rem)], label: "あまり" });
      }
    }

    // 全体の幅から SVG 寸法を決める
    var cols = 0;
    rows.forEach(function (r) {
      if (r.digits && r.digits.length > cols) cols = r.digits.length;
    });
    if (cols === 0) cols = 1;

    return {
      op: op,
      rows: rows,
      cols: cols,
      width: LAYOUT.opWidth + cols * LAYOUT.cellW + LAYOUT.padRight,
      height: LAYOUT.padTop + rows.length * LAYOUT.rowH,
      stage: stage,
      answer: answer,
      a: a,
      b: b,
      rem: rem
    };
  }



  // ------------------------------------------------------------------
  // 描画
  // ------------------------------------------------------------------

  /**
   * 1つの桁セルを描画（数字）
   */
  function digitCell(x, y, digit, filled) {
    // "" = 上位桁の空き（その桁に数字が無い）。何も描かない。
    //      0 と区別することで 034 のような先頭 0 を描画しない。
    if (digit === BLANK) return "";
    // null = 空マス（÷の商など、未入力の桁）。薄い破線だけ引いて枠を示す。
    if (digit === null || typeof digit === "undefined") {
      return '<line x1="' + (x + 2) + '" y1="' + (y + LAYOUT.rowH - 7) +
        '" x2="' + (x + LAYOUT.cellW - 4) + '" y2="' + (y + LAYOUT.rowH - 7) +
        '" stroke="' + COLORS.subRule + '" stroke-width="1.5" stroke-dasharray="3 3"/>';
    }
    var fontSize = LAYOUT.fontSize;
    var color = filled ? COLORS.mark : COLORS.digit;
    var cx = x + LAYOUT.cellW / 2 - 2;
    var baseline = y + LAYOUT.rowH / 2 + fontSize * 0.35;
    return '<text x="' + cx + '" y="' + baseline + '" font-size="' + fontSize +
      '" fill="' + color + '" text-anchor="middle" font-family="' + FONT +
      '" font-weight="' + (filled ? 700 : 500) + '">' + String(digit) + '</text>';
  }

  /**
   * 筆算を1つの <svg> として描画する。
   * @param {Object} spec
   * @param {Object} [opts] { stage: "normal"|"hint"|"solution", vars }
   * @returns {string} SVG文字列
   */
  function render(spec, opts) {
    opts = opts || {};
    var m = resolve(spec, opts);
    var L = LAYOUT;
    var out = [];
    out.push('<svg class="hissan-svg hissan-' + m.op + '" viewBox="0 0 ' + m.width + ' ' + m.height +
      '" width="' + m.width + '" height="' + m.height +
      '" role="img" aria-label="筆算" xmlns="http://www.w3.org/2000/svg">');

    var y = L.padTop;
    for (var i = 0; i < m.rows.length; i++) {
      var row = m.rows[i];

      if (row.type === "rule") {
        var ry = y + L.rowH * 0.74;
        // 罫線は「数字列の左端 (opWidth)」から引く。演算記号の列に食い込ませると
        // × ÷ のインクと重なるため、必ず opWidth を始点にする。
        out.push('<line x1="' + L.opWidth + '" y1="' + ry + '" x2="' + (m.width - L.padRight) + '" y2="' + ry +
          '" stroke="' + COLORS.rule + '" stroke-width="2.5" stroke-linecap="round"/>');
        y += L.rowH;
        continue;
      }

      if (row.type === "carry" || row.type === "borrow") {
        // 繰り上がり行 / 繰り下がり行。繰り降りは教科書どおり数字でなく中黒 "・"。
        for (var ci = 0; ci < row.digits.length; ci++) {
          if (row.digits[ci] !== 1) continue;
          var cx = L.opWidth + ci * L.cellW + L.cellW / 2 - 2;
          var label = (row.type === "borrow") ? "・" : "1";
          var c = (row.type === "borrow") ? COLORS.digit : COLORS.carry;
          out.push('<text x="' + cx + '" y="' + (y + L.rowH - 9) + '" font-size="' + L.smallFont +
            '" fill="' + c + '" text-anchor="middle" font-family="' + FONT + '">' + label + '</text>');
        }
        y += L.rowH;
        continue;
      }

      if (row.type === "remainder") {
        out.push('<text x="' + L.opWidth + '" y="' + (y + L.rowH * 0.7) + '" font-size="' + L.smallFont +
          '" fill="' + COLORS.digit + '" text-anchor="start" font-family="' + FONT +
          '">あまり ' + row.digits[0] + '</text>');
        y += L.rowH;
        continue;
      }

      // 商行の "_" 罫線（÷の筆算では商の下に線を引くのが教科書表記）
      if (row.rule) {
        var qy = y + L.rowH * 0.8;
        // 商の下の "_" 罫線も、上の算式の罫線と同じく数字列の左端から引く
        out.push('<line x1="' + L.opWidth + '" y1="' + qy + '" x2="' + (m.width - L.padRight) + '" y2="' + qy +
          '" stroke="' + COLORS.rule + '" stroke-width="2"/>');
      }

      if (row.sign) {
        // 演算記号は演算記号列の中央 (L.signX) に置く。
        // 旧実装は `opWidth * 0.45` (= 11.7) に text-anchor=middle で置いていたため、
        // 全角幅で描かれる × ÷ のインク左端が viewBox の左端 (x=0) を越えて欠けていた。
        // また数字とフォント指定が異なっていた（数字 = FONT / 記号 = sans-serif）のため、
        // 端末の既定フォントによって記号幅が変わり「場合によって欠けていた」。
        // ここでは数字と同じ FONT を使い、幅のばらつきで欠けないよう中央寄せする。
        out.push('<text x="' + L.signX + '" y="' + (y + L.rowH * 0.72) + '" font-size="' + L.signFont +
          '" fill="' + COLORS.sign + '" text-anchor="middle" font-family="' + FONT + '">' + row.sign + '</text>');
      }

      for (var di = 0; di < row.digits.length; di++) {
        out.push(digitCell(L.opWidth + di * L.cellW, y, row.digits[di], !!row.filled));
      }

      y += L.rowH;
    }

    out.push('</svg>');
    return out.join("");
  }

  // ------------------------------------------------------------------
  // question_source 組み立て
  // ------------------------------------------------------------------

  /**
   * 出題に必要な表示一式を組み立てる（question_source から呼ぶ）
   * @param {Object} spec hissanSpec
   * @param {Object} vars 生成変数
   * @returns {{hissanHTML:string, hissanHintHTML:string, hissanSolutionHTML:string,
   *            op:string, answerText:string, model:Object}}
   */
  function buildDisplay(spec, vars) {
    spec = spec || {};
    vars = vars || {};
    var m = resolve(spec, { vars: vars, stage: "normal" });
    return {
      hissanHTML: render(spec, { vars: vars, stage: "normal" }),
      hissanHintHTML: render(spec, { vars: vars, stage: "hint" }),
      hissanSolutionHTML: render(spec, { vars: vars, stage: "solution" }),
      op: m.op,
      // 答えはSVGに埋め込まず、正規化可能なテキストとして保持する
      answerText: String(m.answer),
      model: m
    };
  }

  // ------------------------------------------------------------------
  // 回答の比較
  // ------------------------------------------------------------------

  /**
   * 筆算回答の比較。桁数ゆれ(07/7)・全角数字を吸収する。
   * Step1（読み取り専用）では回答しないが、Step2（入力）で使うために用意しておく。
   * @param {string|number} userValue
   * @param {string|number} correctValue
   * @returns {boolean}
   */
  function equalsAnswer(userValue, correctValue) {
    function norm(v) {
      var s = String((v === null || v === undefined) ? "" : v);
      s = s.replace(/[０-９]/g, function (c) {
        return String.fromCharCode(c.charCodeAt(0) - 0xFEE0);
      });
      s = s.replace(/[^0-9\-]/g, "");
      var neg = (s.charAt(0) === "-");
      if (neg) s = s.slice(1);
      s = s.replace(/^0+/, "");
      if (s === "") s = "0";
      return (neg ? "-" : "") + s;
    }
    return norm(userValue) === norm(correctValue);
  }

  var HissanSVG = {
    OPS: OPS,
    LAYOUT: LAYOUT,
    COLORS: COLORS,
    resolve: resolve,
    fillSpecVars: fillSpecVars,
    render: render,
    buildDisplay: buildDisplay,
    answerDigits: answerDigits,
    addCarry: addCarry,
    borrowDown: borrowDown,
    mulParts: mulParts,
    equalsAnswer: equalsAnswer
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = { HissanSVG: HissanSVG };
  } else {
    window.HissanSVG = HissanSVG;
  }
})();

