/**
 * FigureSVG カタログ検証テスト — V2.7.0
 * Run with: node tests/test_figure_catalog.js
 *           node tests/test_figure_catalog.js --update   (スナップショット更新)
 *
 * 検証項目:
 *  1. 全カタログspecが SVG を生成できる（NaN / undefined / 空 d・points が無い）
 *  2. 図形の描画座標が viewBox 200x200 に収まる（クリップしない）
 *  3. 余白 8% が確保されている（端に貼り付かない）
 *  4. 多角形の面積 > 0（退化した図形が無い）
 *  5. 直角マークが頂点と一致する（固定座標 30,30 のバグの恒久ガード）
 *  6. 等辺マークが辺の中点に描かれる
 *  7. タップ部品IDの一意性と正解IDの整合（figure_tap）
 *  8. SVG のスナップショット（意図しない見た目の変更を検知）
 *  9. レガシー互換 API (toLegacy) の契約
 */
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const { FigureSVG } = require("../js/figure_svg.js");

const VIEW = FigureSVG.VIEW;
const UPDATE = process.argv.indexOf("--update") >= 0;
const SNAP_PATH = path.join(__dirname, "fixtures", "figure_catalog_snapshot.json");

// ------------------------------------------------------------------ 解析ヘルパー

/** "12,34 56,78" 形式の points を数値配列へ */
function pointsAttr(s) {
  return String(s).trim().split(/\s+/).map(function (p) {
    const xy = p.split(",");
    return [Number(xy[0]), Number(xy[1])];
  });
}

/** 数値属性を取り出す（x, y, x1, y1, x2, y2, cx, cy, r, rx, ry） */
function attrNums(svg) {
  const out = [];
  const re = /(?:^|\s)(x|y|x1|y1|x2|y2|cx|cy|r|rx|ry)="([^"]*)"/g;
  let m;
  while ((m = re.exec(svg)) !== null) {
    if (/^-?[\d.]+$/.test(m[2])) out.push(Number(m[2]));
  }
  return out;
}

/** path の d から座標ペアを取り出す（A は最後の2つが座標） */
function pathPoints(d) {
  const pts = [];
  const tokens = String(d).split(/([A-Za-z])/);
  let cmd = "";
  for (const t of tokens) {
    if (/^[A-Za-z]$/.test(t)) { cmd = t; continue; }
    const nums = t.trim().split(/[\s,]+/).filter(function (s) { return s.length > 0; }).map(Number);
    if (nums.length === 0) continue;
    if (nums.some(function (n) { return !isFinite(n); })) { pts.push([NaN, NaN]); continue; }
    if (cmd === "A") { pts.push([nums[nums.length - 2], nums[nums.length - 1]]); continue; }
    for (let i = 0; i + 1 < nums.length; i += 2) pts.push([nums[i], nums[i + 1]]);
  }
  return pts;
}

/** SVG 文字列から全座標を取り出す */
function allCoords(svg) {
  const pts = [];
  const polyRe = /points="([^"]*)"/g;
  let m;
  while ((m = polyRe.exec(svg)) !== null) pts.push.apply(pts, pointsAttr(m[1]));
  const lineRe = /<line[^>]*>/g;
  while ((m = lineRe.exec(svg)) !== null) {
    const xs = /x1="([-\d.]+)"/.exec(m[0]), ys = /y1="([-\d.]+)"/.exec(m[0]);
    const xe = /x2="([-\d.]+)"/.exec(m[0]), ye = /y2="([-\d.]+)"/.exec(m[0]);
    if (xs && ys && xe && ye) {
      pts.push([Number(xs[1]), Number(ys[1])], [Number(xe[1]), Number(ye[1])]);
    }
  }
  const pathRe = /d="([^"]*)"/g;
  while ((m = pathRe.exec(svg)) !== null) pts.push.apply(pts, pathPoints(m[1]));
  const circleRe = /<circle[^>]*>/g;
  while ((m = circleRe.exec(svg)) !== null) {
    const cx = /cx="([-\d.]+)"/.exec(m[0]), cy = /cy="([-\d.]+)"/.exec(m[0]), r = /r="([-\d.]+)"/.exec(m[0]);
    if (cx && cy && r) {
      const x = Number(cx[1]), y = Number(cy[1]), rr = Number(r[1]);
      pts.push([x - rr, y - rr], [x + rr, y + rr]);
    }
  }
  const elRe = /<ellipse[^>]*>/g;
  while ((m = elRe.exec(svg)) !== null) {
    const cx = /cx="([-\d.]+)"/.exec(m[0]), cy = /cy="([-\d.]+)"/.exec(m[0]);
    const rx = /rx="([-\d.]+)"/.exec(m[0]), ry = /ry="([-\d.]+)"/.exec(m[0]);
    if (cx && cy && rx && ry) {
      const x = Number(cx[1]), y = Number(cy[1]);
      pts.push([x - Number(rx[1]), y - Number(ry[1])], [x + Number(rx[1]), y + Number(ry[1])]);
    }
  }
  const textRe = /<text[^>]*>/g;
  while ((m = textRe.exec(svg)) !== null) {
    const x = /x="([-\d.]+)"/.exec(m[0]), y = /y="([-\d.]+)"/.exec(m[0]);
    if (x && y) pts.push([Number(x[1]), Number(y[1])]);
  }
  return pts;
}

/** 直角マーク（class="fig-mark" の path）の座標 */
function rightAngleMarks(svg) {
  const out = [];
  const re = /<path class="fig-mark" d="([^"]*)"/g;
  let m;
  while ((m = re.exec(svg)) !== null) {
    out.push(pathPoints(m[1]));
  }
  return out;
}

const TOL = 0.6; // 座標の許容誤差(px)

console.log("=== FigureSVG カタログ検証テスト (V2.7.0) ===");
assert.ok(Array.isArray(FigureSVG.CATALOG) && FigureSVG.CATALOG.length >= 30,
  "カタログに 30 件以上の spec がある (" + FigureSVG.CATALOG.length + ")");

// 1. 全specがSVGを生成できる
{
  console.log("1. 全specのSVG生成（NaN・undefined・空タグなし）");
  const bad = [];
  FigureSVG.CATALOG.forEach(function (item) {
    let svg;
    try {
      svg = FigureSVG.svg(item.spec);
    } catch (e) {
      bad.push(item.id + ": throw " + e.message);
      return;
    }
    if (typeof svg !== "string" || svg.indexOf("<svg") !== 0) bad.push(item.id + ": not svg");
    if (svg.indexOf("NaN") >= 0) bad.push(item.id + ": NaN");
    if (svg.indexOf("undefined") >= 0) bad.push(item.id + ": undefined");
    if (svg.indexOf('points=""') >= 0 || svg.indexOf('d=""') >= 0) bad.push(item.id + ": empty attr");
    if (svg.indexOf("</svg>") < 0) bad.push(item.id + ": no closing tag");
  });
  assert.deepStrictEqual(bad, [], "全ての spec が有効な SVG を生成: " + bad.slice(0, 3).join(" / "));
  console.log("  [PASS] " + FigureSVG.CATALOG.length + " spec すべて SVG 生成OK");
}

// 2. 描画座標が viewBox 内に収まる（クリップしない）
{
  console.log("2. 描画座標が viewBox 200x200 に収まる");
  const over = [];
  FigureSVG.CATALOG.forEach(function (item) {
    const svg = FigureSVG.svg(item.spec);
    const pts = allCoords(svg);
    if (pts.length === 0) {
      over.push(item.id + ": no geometry");
      return;
    }
    pts.forEach(function (p) {
      if (!isFinite(p[0]) || !isFinite(p[1])) { over.push(item.id + ": NaN coord"); return; }
      if (p[0] < -TOL || p[0] > VIEW + TOL || p[1] < -TOL || p[1] > VIEW + TOL) {
        over.push(item.id + " out of viewBox (" + p[0].toFixed(1) + "," + p[1].toFixed(1) + ")");
      }
    });
    attrNums(svg).forEach(function (v) {
      if (!isFinite(v) || v < -TOL || v > VIEW + TOL) over.push(item.id + " attr out of range " + v);
    });
  });
  assert.deepStrictEqual(over.slice(0, 5), [], "全ての図形が viewBox 内: " + over.slice(0, 3).join(" / "));
  console.log("  [PASS] 全図形が viewBox 内（はみ出し・欠けなし）");

  // 図形本体（外形）が必ず描かれている
  const noBody = [];
  FigureSVG.CATALOG.forEach(function (item) {
    const svg = FigureSVG.svg(item.spec);
    const hasBody = item.spec.shape === "circle"
      ? /<(circle|path)\b/.test(svg)
      : /<(polygon|line|path)\b/.test(svg);
    if (!hasBody) noBody.push(item.id);
  });
  assert.deepStrictEqual(noBody, [], "図形本体が描かれている: " + noBody.join(", "));
  console.log("  [PASS] 全 spec で図形本体の要素が出力されている");
}

// 3. 余白の確保（図形本体が端に貼り付かない）
{
  console.log("3. 余白の確保（回転しても 8% の余白を残す）");
  const tight = [];
  FigureSVG.CATALOG.forEach(function (item) {
    // 回転を加えても余白が残ることを確認する（45°の正方形が欠けていた不具合のガード）
    const spec = Object.assign({}, item.spec);
    const rot = typeof spec.rotate === "number" ? spec.rotate : 0;
    spec.rotate = rot + 30;
    const res = FigureSVG.resolve(spec);
    // 図形本体（elems）の座標だけを見る（ラベルは外側に出るため除外）
    let pts = [];
    res.elems.forEach(function (el) {
      if (el.pts) pts = pts.concat(el.pts);
      if (el.a) pts.push(el.a);
      if (el.b) pts.push(el.b);
      if (el.c) {
        const r = el.r || Math.max(el.rx || 0, el.ry || 0);
        pts.push([el.c[0] - r, el.c[1] - r], [el.c[0] + r, el.c[1] + r]);
      }
      if (el.d) pts = pts.concat(pathPoints(el.d));
    });
    if (pts.length === 0) return;
    const xs = pts.map(function (p) { return p[0]; });
    const ys = pts.map(function (p) { return p[1]; });
    const w = Math.max.apply(null, xs) - Math.min.apply(null, xs);
    const h = Math.max.apply(null, ys) - Math.min.apply(null, ys);
    const minMargin = VIEW * FigureSVG.MARGIN_RATIO - 2;
    if (w > VIEW - 2 * minMargin + 2 || h > VIEW - 2 * minMargin + 2) {
      tight.push(item.id + " w=" + w.toFixed(1) + " h=" + h.toFixed(1));
    }
  });
  assert.deepStrictEqual(tight.slice(0, 5), [], "余白が確保されている: " + tight.slice(0, 3).join(" / "));
  console.log("  [PASS] 回転 +30° を加えても余白が残る（欠けなし）");
}

// 4. 多角形が退化していない
{
  console.log("4. 多角形の面積（退化した図形がない）");
  const bad = [];
  FigureSVG.CATALOG.forEach(function (item) {
    const res = FigureSVG.resolve(item.spec);
    const order = res.order;
    if (order.length < 3) return;
    const pts = order.map(function (nm) { return res.points[nm]; });
    let s = 0;
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i], q = pts[(i + 1) % pts.length];
      s += p[0] * q[1] - q[0] * p[1];
    }
    const area = Math.abs(s) / 2;
    if (!(area > 100)) bad.push(item.id + " area=" + area.toFixed(1));
  });
  assert.deepStrictEqual(bad, [], "面積が十分ある: " + bad.join(" / "));
  console.log("  [PASS] 全ての多角形の面積 > 100 (viewBox座標)");
}

// 5. 直角マークが頂点と一致する（旧: 固定座標 30,30 で不一致だった）
{
  console.log("5. 直角マークの頂点一致");
  // 直角マークは "M a1 L corner L a2" の3点。頂点 v = a1 + a2 - corner で復元できる
  function markVertex(m) {
    return [m[0][0] + m[2][0] - m[1][0], m[0][1] + m[2][1] - m[1][1]];
  }
  ["quad_square", "quad_rectangle"].forEach(function (id) {
    const spec = FigureSVG.spec(id);
    const svg = FigureSVG.svg(spec);
    const res = FigureSVG.resolve(spec);
    const marks = rightAngleMarks(svg);
    assert.strictEqual(marks.length, 4, id + " に 4 つの直角マーク");

    const verts = res.order.map(function (nm) { return res.points[nm]; });
    const used = [];
    marks.forEach(function (m) {
      const s1 = FigureSVG.dist(m[0], m[1]);
      const s2 = FigureSVG.dist(m[1], m[2]);
      const diag = FigureSVG.dist(m[0], m[2]);
      assert.ok(Math.abs(s1 - s2) < 0.05, id + " 直角マークの2辺の長さが等しい");
      assert.ok(Math.abs(diag - s1 * Math.SQRT2) < 0.3, id + " 直角マークが直角二等辺をなす");
      const v = markVertex(m);
      const near = verts
        .map(function (p, i) { return { i: i, d: FigureSVG.dist(p, v) }; })
        .sort(function (a, b) { return a.d - b.d; })[0];
      assert.ok(near.d < 0.6, id + " 直角マークが実際の頂点と一致する (min=" + near.d.toFixed(2) + "px)");
      used.push(near.i);
    });
    // 4 つの頂点すべてに 1 つずつマークが付く
    assert.deepStrictEqual(used.slice().sort(), [0, 1, 2, 3], id + " 4 頂点すべてにマークがある");
    console.log("  [PASS] " + id + ": 4 つの直角マークが全て頂点と一致");
  });

  // レガシー（旧 createFigureSVG 経由）でも頂点と一致する
  const legacy = FigureSVG.toLegacy("quadrilateral", { size: 92, variant: "rectangle_wide", rotation: 0, rightAngle: true });
  const lmarks = rightAngleMarks(legacy);
  assert.strictEqual(lmarks.length, 1, "レガシー互換: 直角マークは1つ");
  const lres = FigureSVG.resolve({ shape: "quadrilateral", variant: "rectangle_wide", size: 92 * (200 / 120) });
  const lv = lres.points["A"];
  const lmV = markVertex(lmarks[0]);
  const minL = FigureSVG.dist(lmV, lv);
  assert.ok(minL < 0.6, "レガシー互換: 直角マークが左上の頂点 A と一致 (min=" + minL.toFixed(2) + "px)");
  console.log("  [PASS] レガシー互換（旧 fixed 座標 30,30 の不一致を解消）");
}

// 6. 等辺マークが辺の中点に描かれる
{
  console.log("6. 等辺マークの位置（辺の中点）");
  const spec = FigureSVG.spec("tri_isosceles");
  const svg = FigureSVG.svg(spec);
  const res = FigureSVG.resolve(spec);
  const marks = FigureSVG.effectiveMarks(spec);
  assert.ok(marks.equalSides.length >= 2, "二等辺三角形に等辺マークが2本以上");

  const lines = [];
  const re = /<line x1="([-\d.]+)" y1="([-\d.]+)" x2="([-\d.]+)" y2="([-\d.]+)"/g;
  let m;
  while ((m = re.exec(svg)) !== null) {
    const a = [Number(m[1]), Number(m[2])], b = [Number(m[3]), Number(m[4])];
    lines.push({ a: a, b: b, mid: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], len: FigureSVG.dist(a, b) });
  }
  marks.equalSides.forEach(function (pair) {
    const A = res.points[pair[0]], B = res.points[pair[1]];
    const target = [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2];
    const found = lines.some(function (l) {
      return Math.abs(l.len - 12) < 0.6 && FigureSVG.dist(l.mid, target) < 0.6;
    });
    assert.ok(found, "辺 " + pair[0] + pair[1] + " の中点に等辺ティックがある");
  });
  console.log("  [PASS] 等辺ティックが対象の辺の中点に描かれる");
}

// 7. タップ部品（figure_tap）のID整合
{
  console.log("7. タップ部品のID・正解の整合");
  const tapCatalog = FigureSVG.CATALOG.filter(function (x) {
    return x.spec.tap || (x.spec.shape === "circle");
  });
  assert.ok(tapCatalog.length >= 5, "タップ対象 spec が 5 件以上 (" + tapCatalog.length + ")");
  tapCatalog.forEach(function (item) {
    const ps = FigureSVG.parts(item.spec);
    const ids = ps.map(function (p) { return p.id; });
    assert.strictEqual(new Set(ids).size, ids.length, item.id + " 部品IDが一意");
    ps.forEach(function (p) {
      assert.ok(typeof p.id === "string" && p.id.length > 0, item.id + " 部品IDが文字列");
      assert.ok(["vertex", "edge", "angle", "center", "radius", "diameter"].indexOf(p.kind) >= 0,
        item.id + " 部品種別が既知 (" + p.kind + ")");
      assert.ok(typeof p.label === "string" && p.label.length > 0, item.id + " ラベルあり");
      assert.ok(p.hit && typeof p.hit.type === "string", item.id + " ヒット領域あり");
    });
    // 円は中心＋半径のタップ部品を持つ
    if (item.spec.shape === "circle" && item.spec.variant !== "semicircle") {
      assert.ok(ids.indexOf("p-center") >= 0, item.id + " に中心パーツがある");
    }
    if (Array.isArray(item.spec.radii) && item.spec.radii.length > 0) {
      assert.ok(ids.some(function (id) { return id.indexOf("r-") === 0; }), item.id + " に半径パーツがある");
    }
  });
  console.log("  [PASS] " + tapCatalog.length + " spec の部品ID・種別・ラベルが有効");

  // demo_tap（二等辺三角形の等しい2辺）の正解が「脚2本」になること
  const tapSpec = FigureSVG.spec("demo_tap");
  const correct = FigureSVG.selectParts(tapSpec, tapSpec.tap.select);
  assert.deepStrictEqual(correct, ["e-AB", "e-AC"],
    "二等辺三角形の等辺は 辺AB と 辺AC: " + JSON.stringify(correct));

  const disp = FigureSVG.buildDisplay(tapSpec, {});
  assert.ok(disp, "buildDisplay が結果を返す");
  assert.strictEqual(disp.answer, correct.join(","), "answer は正解IDのカンマ区切り");
  assert.ok(disp.figureHTML.indexOf('id="figure-tap"') >= 0, "figure_tap 用のコンテナ");
  disp.figureParts.forEach(function (p) {
    assert.ok(disp.figureHTML.indexOf('data-part-id="' + p.id + '"') >= 0,
      "図に " + p.id + " のヒット領域がある");
    assert.strictEqual(disp.partLabels[p.id], p.label, p.id + " のラベルが一致");
  });
  assert.ok(disp.figureHTML.indexOf("app.toggleFigurePart(") >= 0, "タップで回答できる（onclick）");
  assert.ok(disp.figureHTML.indexOf('onclick="app.toggleFigurePart(\'e-AB\')"') >= 0,
    "正解の辺 AB がタップ可能");
  console.log("  [PASS] demo_tap: 正解 " + disp.answer + " / 部品 " + disp.figureParts.length + " 件");

  // 選択状態の反映
  const html2 = FigureSVG.renderTappable(tapSpec, ["e-AB"]);
  assert.ok(html2.indexOf("fig-part--selected") >= 0, "選択中は --selected が付く");
  const html3 = FigureSVG.renderTappable(tapSpec, [], { stateById: { "e-AB": "correct", "e-AC": "wrong" } });
  assert.ok(html3.indexOf("fig-part--correct") >= 0 && html3.indexOf("fig-part--wrong") >= 0,
    "復習表示用に correct/wrong を指定できる");
  // 回転しても部品IDは変わらない（向きの問題に使える）
  const rotated = Object.assign({}, tapSpec, { rotate: 90, vary: [] });
  assert.deepStrictEqual(FigureSVG.selectParts(rotated, tapSpec.tap.select), correct,
    "90° 回転しても正解IDは同じ");
  console.log("  [PASS] 選択状態・復習表示・回転に対して ID が安定");
}

// 8. スナップショット（意図しない見た目の変更を検知）
{
  console.log("8. SVG スナップショット");
  const hashes = {};
  FigureSVG.CATALOG.forEach(function (item) {
    const svg = FigureSVG.svg(item.spec);
    hashes[item.id] = crypto.createHash("sha256").update(svg).digest("hex").slice(0, 16);
  });

  if (UPDATE || !fs.existsSync(SNAP_PATH)) {
    fs.mkdirSync(path.dirname(SNAP_PATH), { recursive: true });
    fs.writeFileSync(SNAP_PATH, JSON.stringify({ updatedAt: "V2.7.0", hashes: hashes }, null, 2) + "\n", "utf8");
    console.log("  [INFO] スナップショットを" + (UPDATE ? "更新" : "新規作成") + ": " + SNAP_PATH);
  } else {
    const prev = JSON.parse(fs.readFileSync(SNAP_PATH, "utf8")).hashes || {};
    const diffs = [];
    Object.keys(hashes).forEach(function (id) {
      if (!prev[id]) diffs.push(id + " (new)");
      else if (prev[id] !== hashes[id]) diffs.push(id + " (changed)");
    });
    Object.keys(prev).forEach(function (id) {
      if (!hashes[id]) diffs.push(id + " (removed)");
    });
    assert.deepStrictEqual(diffs, [],
      "図形の見た目が変わっていない（意図的な変更なら --update）: " + diffs.slice(0, 5).join(", "));
    console.log("  [PASS] " + Object.keys(hashes).length + " spec の SVG がスナップショットと一致");
  }
}

// 9. レガシー互換 API
{
  console.log("9. レガシー互換 API (toLegacy)");
  ["triangle", "quadrilateral", "circle"].forEach(function (type) {
    const svg = FigureSVG.toLegacy(type, { size: 90, rotation: 15 });
    assert.ok(svg.indexOf("<svg") === 0, type + ": <svg で始まる");
    assert.ok(svg.indexOf("</svg>") > 0, type + ": </svg> で閉じる");
    assert.ok(svg.indexOf("NaN") < 0, type + ": NaN なし");
  });
  // 円には直角マーク（path）が無い / rightAngle 指定時のみ path が出る
  const circle = FigureSVG.toLegacy("circle", { size: 80 });
  assert.ok(circle.indexOf("<path") < 0, "円に直角マークは付かない");
  const rect = FigureSVG.toLegacy("quadrilateral", { size: 92, variant: "rectangle_wide", rightAngle: true });
  assert.ok(rect.indexOf("<path") >= 0, "rightAngle:true で直角マーク(path)が出る");
  // 45° 回転しても viewBox(200) からはみ出さない（旧: 120 を超えて欠けていた）
  const rot = FigureSVG.toLegacy("quadrilateral", { size: 88, rotation: 45 });
  allCoords(rot).forEach(function (p) {
    assert.ok(p[0] >= -TOL && p[0] <= VIEW + TOL && p[1] >= -TOL && p[1] <= VIEW + TOL,
      "45°回転した正方形が viewBox 内 (" + p[0].toFixed(1) + "," + p[1].toFixed(1) + ")");
  });
  // 線の太さは旧 3(viewBox120) 相当に維持される（図形本体 = <polygon> の値を見る）
  const poly = /<polygon[^>]*stroke-width="([\d.]+)"/.exec(rect);
  assert.ok(poly, "図形本体の stroke-width がある");
  const sw = Number(poly[1]);
  assert.ok(Math.abs(sw - 3 * (200 / 120)) < 0.2, "線の太さが旧互換 (" + sw + " ≒ 5)");
  console.log("  [PASS] レガシー互換の契約を満たす（見た目維持 + 欠け解消）");
}

console.log("\n=== FigureSVG カタログ検証テスト: 全合格 ===");
