/**
 * FigureSVG — 図形図の共通SVG部品 (V2.7.0)
 *
 * 小学校1〜4年生の「図形」領域（平面図形・角・面積・立体・展開図）で
 * 共通して使える図形図コンポーネント。ClockSVG (V2.6.7) と同じ思想で、
 * 「spec（宣言）→ 共通の描画部品」に統一する。
 *
 * V2.7.0 で解決した従来の不具合:
 *   - 直角マークが固定座標 (30,30) に描かれ、正方形・長方形の頂点と一致しなかった
 *   - 45°回転した正方形が viewBox からはみ出して欠けていた (自動フィットで解消)
 *   - 図形ごとの描画コードが散在し、立体・展開図・角を追加できなかった
 *
 * 仕様:
 *   - 座標系は「実寸（cm など）」で指定し、pxPerUnit / size で px へ変換する
 *   - 図形は viewBox 200x200 に 8% の余白を確保して自動フィットする
 *   - 頂点・辺・角を「タップできる部品 (parts)」として列挙できる (figure_tap 用)
 *   - 直角・等辺・平行のマークは頂点/辺の座標から算出する（固定座標を使わない）
 *
 * 公開API:
 *   FigureSVG.VIEW / COLORS / MARGIN_RATIO
 *   FigureSVG.CATALOG                        検証ページ用の全spec一覧
 *   FigureSVG.spec(id)                       IDからspecを取得
 *   FigureSVG.resolve(spec)                  spec → 描画用の解決済みジオメトリ
 *   FigureSVG.fit(spec)                      スケール・配置・回転の決定
 *   FigureSVG.svg(spec, opts)                1つの図形のSVG文字列
 *   FigureSVG.render(spec, opts)             <figure> ラッパ付きHTML
 *   FigureSVG.renderTappable(spec, ids, opts) タップ可能な図 (figure_tap 用)
 *   FigureSVG.parts(spec)                    タップ部品の一覧 [{id,kind,label}]
 *   FigureSVG.selectParts(spec, select)      条件に合う部品IDの決定（正解の算出）
 *   FigureSVG.buildDisplay(spec, vars)       question_source から呼ぶ組み立て
 *   FigureSVG.toLegacy(type, params)         旧 createFigureSVG(type, params) 互換
 *   FigureSVG.esc(s)                         HTMLエスケープ
 */
(function () {
  "use strict";

  // viewBox は常に 200x200。CSS 側 (.fig-large / .fig-small) で表示サイズを変える
  var VIEW = 200;
  // 図が viewBox の端に貼り付かないための余白（辺の長さに対する比率）
  var MARGIN_RATIO = 0.08;
  // 旧 createFigureSVG は viewBox 120 基準だった。レガシー互換のための換算係数
  var LEGACY_BOX = 120;
  var LEGACY_TO_VIEW = VIEW / LEGACY_BOX;

  var COLORS = {
    line: "#1e293b",
    vertex: "#1e293b",
    mark: "#1e293b",
    grid: "#cbd5e1",
    guide: "#94a3b8",
    dashed: "#64748b",
    fill: "none",
    label: "#1e293b",
    labelSmall: "#475569"
  };

  // ---------------------------------------------------------------- 数学ヘルパー

  function esc(s) {
    return String(s === null || s === undefined ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function n2(v) {
    var x = Math.round(Number(v) * 100) / 100;
    return String(x);
  }

  function deg2rad(d) { return d * Math.PI / 180; }

  function rotatePoint(p, c, deg) {
    if (!deg) return [p[0], p[1]];
    var r = deg2rad(deg);
    var cos = Math.cos(r), sin = Math.sin(r);
    var dx = p[0] - c[0], dy = p[1] - c[1];
    return [c[0] + dx * cos - dy * sin, c[1] + dx * sin + dy * cos];
  }

  function dist(a, b) {
    var dx = a[0] - b[0], dy = a[1] - b[1];
    return Math.sqrt(dx * dx + dy * dy);
  }

  function mid(a, b) { return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]; }

  function centroid(pts) {
    if (!pts || pts.length === 0) return [0, 0];
    var x = 0, y = 0;
    for (var i = 0; i < pts.length; i++) { x += pts[i][0]; y += pts[i][1]; }
    return [x / pts.length, y / pts.length];
  }

  function unitVec(v) {
    var L = Math.sqrt(v[0] * v[0] + v[1] * v[1]) || 1;
    return [v[0] / L, v[1] / L];
  }

  /** 頂点 p における角の二等分線方向（inside 側へ向かう単位ベクトル） */
  function bisectorDir(prev, p, next, inside) {
    var u1 = unitVec([prev[0] - p[0], prev[1] - p[1]]);
    var u2 = unitVec([next[0] - p[0], next[1] - p[1]]);
    var d = unitVec([u1[0] + u2[0], u1[1] + u2[1]]);
    if (inside) {
      var toC = unitVec([inside[0] - p[0], inside[1] - p[1]]);
      if (d[0] * toC[0] + d[1] * toC[1] < 0) return [-d[0], -d[1]];
    }
    return d;
  }

  /** 直線 p1-p2 の法線（inside と反対側を向く単位ベクトル） */
  function outwardNormal(p1, p2, inside) {
    var dx = p2[0] - p1[0], dy = p2[1] - p1[1];
    var L = Math.sqrt(dx * dx + dy * dy) || 1;
    var n = [-dy / L, dx / L];
    var m = mid(p1, p2);
    if (inside) {
      var toC = [inside[0] - m[0], inside[1] - m[1]];
      if (n[0] * toC[0] + n[1] * toC[1] > 0) return [-n[0], -n[1]];
    }
    return n;
  }

  /** 正n角形の頂点（r は外接円半径、-90度で頂点が真上） */
  function regularPolygon(n, r, rotDeg) {
    var out = [];
    for (var i = 0; i < n; i++) {
      var a = deg2rad(-90 + (rotDeg || 0) + i * 360 / n);
      out.push([r * Math.cos(a), r * Math.sin(a)]);
    }
    return out;
  }

  /** 名前付き頂点オブジェクトのコピー */
  function clonePoints(pts) {
    var o = {};
    Object.keys(pts || {}).forEach(function (k) { o[k] = [pts[k][0], pts[k][1]]; });
    return o;
  }

  /** 配列 → 名前付き頂点 */
  function namedPoly(pts, names) {
    var o = {};
    names.forEach(function (nm, i) { o[nm] = pts[i]; });
    return o;
  }

  /** 辺の名前（"AB"）は常に昇順にそろえる */
  function edgeKey(a, b) { return a < b ? a + b : b + a; }

  var ALPHA = "ABCDEFGHIJKL".split("");

  // ------------------------------------------------------- 図形カタログ（単位座標）

  var TRI = {
    equilateral:     { A: [2, 0], B: [0, 3.4641], C: [4, 3.4641] },
    isosceles:       { A: [2, 0], B: [0, 3.6], C: [4, 3.6] },
    right:           { A: [0, 0], B: [4, 0], C: [0, 3] },
    isosceles_right: { A: [0, 0], B: [4, 0], C: [0, 4] },
    obtuse:          { A: [0, 0], B: [4, 0], C: [0.5, 1.2] },
    acute:           { A: [0, 0], B: [4, 0], C: [2, 2.4] },
    general:         { A: [0, 0], B: [4.4, 0], C: [1.6, 2.6] }
  };

  var QUAD = {
    square:              { A: [0, 0], B: [4, 0], C: [4, 4], D: [0, 4] },
    rectangle:           { A: [0, 0], B: [5, 0], C: [5, 3], D: [0, 3] },
    rectangle_wide:      { A: [0, 0], B: [5, 0], C: [5, 3.5], D: [0, 3.5] },
    parallelogram:       { A: [0.9, 0], B: [5.1, 0], C: [4.2, 2.8], D: [0, 2.8] },
    rhombus:             { A: [2, 0], B: [4, 1.6], C: [2, 3.2], D: [0, 1.6] },
    trapezoid:           { A: [0, 0], B: [4.4, 0], C: [3.4, 2.6], D: [1, 2.6] },
    isosceles_trapezoid: { A: [0, 0], B: [4, 0], C: [3.1, 2.4], D: [0.9, 2.4] },
    general:             { A: [0, 0.4], B: [4.2, 0], C: [3.6, 2.8], D: [0.4, 2.4] }
  };

  var POLY_SIDES = { pentagon: 5, hexagon: 6, octagon: 8 };

  /**
   * 形状のユニット座標ジオメトリを返す
   * @param {string} shape "triangle"|"quadrilateral"|"polygon"|"circle"|"angle"|"solid"|"net"|"lines"
   * @param {string} variant 形状ごとの派生
   * @param {Object} spec 図形spec
   * @returns {{points:Object|null, circle:Object|null, elems:Array|null, open:boolean}}
   */
  function unitShape(shape, variant, spec) {
    spec = spec || {};
    variant = variant || "";

    if (shape === "triangle") {
      return { points: clonePoints(TRI[variant] || TRI.equilateral), circle: null, elems: null, open: false };
    }
    if (shape === "quadrilateral") {
      return { points: clonePoints(QUAD[variant] || QUAD.square), circle: null, elems: null, open: false };
    }
    if (shape === "polygon") {
      var n = parseInt(spec.sides, 10);
      if (!(n >= 3 && n <= 12)) n = POLY_SIDES[variant] || 5;
      var pts = regularPolygon(n, spec.radius || 2.3, spec.turn || 0);
      return { points: namedPoly(pts, ALPHA.slice(0, n)), circle: null, elems: null, open: false };
    }
    if (shape === "circle") {
      var r = typeof spec.radius === "number" ? spec.radius : 2.2;
      if (variant === "semicircle") {
        return {
          points: null, circle: null, open: false,
          elems: [{
            kind: "path",
            d: "M " + n2(-r) + " 0 A " + n2(r) + " " + n2(r) + " 0 0 1 " + n2(r) + " 0 Z",
            style: "solid"
          }]
        };
      }
      return { points: null, circle: { c: [0, 0], r: r }, elems: null, open: false };
    }
    if (shape === "angle") {
      // 角: 頂点 O から 2 本の半直線 (rays)。角度は variant か angleDeg で指定
      var byVariant = { right: 90, acute: 45, obtuse: 130, straight: 180 };
      var deg = (typeof spec.angleDeg === "number") ? spec.angleDeg
        : (byVariant[variant] != null ? byVariant[variant] : 90);
      var len = spec.rayLength || 3.2;
      var a1 = deg2rad(-90 - deg / 2);
      var a2 = deg2rad(-90 + deg / 2);
      var A = [len * Math.cos(a1), len * Math.sin(a1)];
      var B = [len * Math.cos(a2), len * Math.sin(a2)];
      return {
        points: { O: [0, 0], A: A, B: B }, circle: null, open: true,
        elems: [
          { kind: "line", a: [0, 0], b: A, style: "solid" },
          { kind: "line", a: [0, 0], b: B, style: "solid" }
        ]
      };
    }
    if (shape === "solid") {
      return { points: null, circle: null, elems: solidElems(variant, spec), open: false };
    }
    if (shape === "net") {
      return { points: null, circle: null, elems: netElems(variant, spec), open: false };
    }
    if (shape === "lines") {
      return { points: null, circle: null, elems: lineElems(variant, spec), open: false };
    }
    return { points: clonePoints(QUAD.square), circle: null, elems: null, open: false };
  }

  /** 立体（直方体・立方体・三角柱・円柱・球）。かくれ線は破線で描く */
  function solidElems(variant, spec) {
    spec = spec || {};
    var e = [];
    var w = spec.w || (variant === "cube" ? 3 : 3.4);
    var h = spec.h || (variant === "cube" ? 3 : 2.4);
    var d = spec.d || (variant === "cube" ? 3 : 1.3);
    if (variant === "cube") { d = w; }

    if (variant === "cylinder") {
      var r = spec.radius || 1.4;
      var ry = r * 0.34;
      var hh = spec.h || 3;
      e.push({ kind: "path", d: "M " + n2(-r) + " 0 A " + n2(r) + " " + n2(ry) + " 0 0 0 " + n2(r) + " 0", style: "solid" });
      e.push({ kind: "path", d: "M " + n2(-r) + " 0 A " + n2(r) + " " + n2(ry) + " 0 0 1 " + n2(r) + " 0", style: "dashed" });
      e.push({ kind: "line", a: [-r, 0], b: [-r, hh], style: "solid" });
      e.push({ kind: "line", a: [r, 0], b: [r, hh], style: "solid" });
      e.push({ kind: "path", d: "M " + n2(-r) + " " + n2(hh) + " A " + n2(r) + " " + n2(ry) + " 0 0 0 " + n2(r) + " " + n2(hh), style: "solid" });
      return e;
    }
    if (variant === "sphere") {
      var rs = spec.radius || 1.9;
      var rys = rs * 0.34;
      e.push({ kind: "path", d: "M " + n2(-rs) + " 0 A " + n2(rs) + " " + n2(rys) + " 0 0 0 " + n2(rs) + " 0", style: "dashed" });
      e.push({ kind: "circle", c: [0, 0], r: rs, style: "solid" });
      return e;
    }
    if (variant === "prism") {
      var k = w / 4;
      var f = [
        [TRI.equilateral.A[0] * k, TRI.equilateral.A[1] * k - h / 2],
        [TRI.equilateral.B[0] * k, TRI.equilateral.B[1] * k - h / 2],
        [TRI.equilateral.C[0] * k, TRI.equilateral.C[1] * k - h / 2]
      ];
      e.push({ kind: "polygon", pts: f, style: "solid" });
      e.push({ kind: "polygon", pts: [f[0], [f[0][0] + d, f[0][1] - d], [f[2][0] + d, f[2][1] - d], f[2]], style: "solid" });
      e.push({ kind: "polygon", pts: [f[1], [f[1][0] + d, f[1][1] - d], [f[2][0] + d, f[2][1] - d], f[2]], style: "solid" });
      e.push({ kind: "line", a: f[0], b: [f[0][0] + d, f[0][1] - d], style: "solid" });
      return e;
    }
    // cuboid / cube
    var x0 = -w / 2, y0 = -h / 2;
    var fr = [[x0, y0], [x0 + w, y0], [x0 + w, y0 + h], [x0, y0 + h]];
    e.push({ kind: "polygon", pts: fr, style: "solid" });
    e.push({ kind: "polygon", pts: [fr[0], [fr[0][0] + d, fr[0][1] - d], [fr[1][0] + d, fr[1][1] - d], fr[1]], style: "solid" });
    e.push({ kind: "polygon", pts: [fr[1], [fr[1][0] + d, fr[1][1] - d], [fr[2][0] + d, fr[2][1] - d], fr[2]], style: "solid" });
    e.push({ kind: "line", a: fr[3], b: [fr[3][0] + d, fr[3][1] - d], style: "dashed" });
    e.push({ kind: "line", a: [fr[3][0] + d, fr[3][1] - d], b: [fr[0][0] + d, fr[0][1] - d], style: "dashed" });
    e.push({ kind: "line", a: [fr[0][0] + d, fr[0][1] - d], b: [fr[1][0] + d, fr[1][1] - d], style: "solid" });
    if (variant !== "cube") {
      e.push({ kind: "line", a: [fr[2][0] + d, fr[2][1] - d], b: [fr[3][0] + d, fr[3][1] - d], style: "solid" });
    }
    return e;
  }

  /** 展開図（直方体・立方体）。折り線は破線で描く */
  function netElems(variant, spec) {
    spec = spec || {};
    var e = [];
    var a = variant === "cube_net" ? 2.4 : (spec.w || 3.2);
    var b = variant === "cube_net" ? 2.4 : (spec.h || 2.2);
    var c = variant === "cube_net" ? 2.4 : (spec.d || 1.4);
    function rect(x, y, w, h) {
      e.push({ kind: "polygon", pts: [[x, y], [x + w, y], [x + w, y + h], [x, y + h]], style: "solid" });
    }
    function fold(x1, y1, x2, y2) {
      e.push({ kind: "line", a: [x1, y1], b: [x2, y2], style: "dashed" });
    }
    // 十字型: 横4面 + 上下1面ずつ
    rect(-a, 0, a, b);
    rect(0, 0, c, b);
    rect(c, 0, a, b);
    rect(c + a, 0, c, b);
    rect(0, -c, c, c);
    rect(0, b, c, c);
    // のりしろ/折り目（面の境界）を破線で示す
    fold(-a, 0, c + a + c, 0);
    fold(-a, b, c + a + c, b);
    fold(0, -c, 0, b + c);
    fold(c, -c, c, b + c);
    fold(c + a, 0, c + a, b);
    return e;
  }

  /** 直線の関係（平行・垂直・交わる） */
  function lineElems(variant, spec) {
    spec = spec || {};
    var L = spec.len || 2.4;
    if (variant === "perpendicular") {
      return [
        { kind: "line", a: [0, -L], b: [0, L], style: "solid" },
        { kind: "line", a: [-L, 0], b: [L, 0], style: "solid" }
      ];
    }
    if (variant === "parallel") {
      return [
        { kind: "line", a: [-L, -L * 0.5], b: [L, -L * 0.5], style: "solid" },
        { kind: "line", a: [-L, L * 0.5], b: [L, L * 0.5], style: "solid" }
      ];
    }
    return [
      { kind: "line", a: [-L, -L * 0.6], b: [L, L * 0.6], style: "solid" },
      { kind: "line", a: [-L, L * 0.6], b: [L, -L * 0.6], style: "solid" }
    ];
  }

  /** 複合図形（立体・展開図・線の関係・半円）のユニット座標 bbox [minX,minY,maxX,maxY] */
  function shapeBox(shape, variant, spec) {
    spec = spec || {};
    if (shape === "solid") {
      var w = spec.w || (variant === "cube" ? 3 : 3.4);
      var h = spec.h || (variant === "cube" ? 3 : 2.4);
      var d = spec.d || (variant === "cube" ? 3 : 1.3);
      if (variant === "cube") d = w;
      if (variant === "cylinder") {
        var r = spec.radius || 1.4;
        var hh = spec.h || 3;
        return [-r, -r * 0.34, r, hh + r * 0.34];
      }
      if (variant === "sphere") {
        var rs = spec.radius || 1.9;
        return [-rs, -rs, rs, rs];
      }
      if (variant === "prism") {
        var k = w / 4;
        var ys = [TRI.equilateral.A[1] * k, TRI.equilateral.B[1] * k, TRI.equilateral.C[1] * k];
        return [0, Math.min.apply(null, ys) - h / 2 - d, 4 * k + d, Math.max.apply(null, ys) - h / 2];
      }
      return [-w / 2, -h / 2 - d, w / 2 + d, h / 2];
    }
    if (shape === "net") {
      var a = variant === "cube_net" ? 2.4 : (spec.w || 3.2);
      var b = variant === "cube_net" ? 2.4 : (spec.h || 2.2);
      var c = variant === "cube_net" ? 2.4 : (spec.d || 1.4);
      return [-a, -c, c + a + c, b + c];
    }
    if (shape === "lines") {
      var L = spec.len || 2.4;
      return [-L, -L, L, L];
    }
    if (shape === "circle" && variant === "semicircle") {
      var rs2 = typeof spec.radius === "number" ? spec.radius : 2.2;
      return [-rs2, -rs2, rs2, 0];
    }
    return null;
  }

  /** 頂点・円からユニット座標 bbox を作る */
  function pointBox(geo) {
    var xs = [], ys = [];
    var pts = geo.points || {};
    Object.keys(pts).forEach(function (k) { xs.push(pts[k][0]); ys.push(pts[k][1]); });
    if (geo.circle) {
      xs.push(geo.circle.c[0] - geo.circle.r, geo.circle.c[0] + geo.circle.r);
      ys.push(geo.circle.c[1] - geo.circle.r, geo.circle.c[1] + geo.circle.r);
    }
    if (xs.length === 0) return [-1, -1, 1, 1];
    return [Math.min.apply(null, xs), Math.min.apply(null, ys), Math.max.apply(null, xs), Math.max.apply(null, ys)];
  }

  function boxOfPoints(list) {
    var xs = [], ys = [];
    list.forEach(function (p) { xs.push(p[0]); ys.push(p[1]); });
    return [Math.min.apply(null, xs), Math.min.apply(null, ys), Math.max.apply(null, xs), Math.max.apply(null, ys)];
  }

  // ------------------------------------------------------------ スケールと配置

  /**
   * スケール・回転・配置を決める。
   * size 指定でも、回転で viewBox からはみ出す場合は自動的に縮小する（欠け防止）。
   * @returns {{geo, box, deg, scale, stroke, viewBox, c, toPx}}
   */
  function fit(spec) {
    spec = spec || {};
    var shape = spec.shape || "quadrilateral";
    var variant = spec.variant || "";
    var geo = unitShape(shape, variant, spec);
    var box = spec.box || shapeBox(shape, variant, spec) || pointBox(geo);
    var deg = typeof spec.rotate === "number" ? spec.rotate : 0;
    var c = [(box[0] + box[2]) / 2, (box[1] + box[3]) / 2];
    var corners = [[box[0], box[1]], [box[2], box[1]], [box[2], box[3]], [box[0], box[3]]];
    var rBox = boxOfPoints(corners.map(function (p) { return rotatePoint(p, c, deg); }));
    var rw = rBox[2] - rBox[0], rh = rBox[3] - rBox[1];
    var maxDim = Math.max(rw, rh) || 1;
    var limit = VIEW * (1 - 2 * MARGIN_RATIO);
    var scale;
    if (typeof spec.pxPerUnit === "number" && spec.pxPerUnit > 0) {
      scale = spec.pxPerUnit;
    } else if (typeof spec.size === "number" && spec.size > 0) {
      scale = spec.size / maxDim;
    } else {
      scale = limit / maxDim;
    }
    // 回転を含めた実寸が viewBox を超える場合は縮小する（従来のクリップ不具合を防ぐ）
    if (scale * maxDim > limit) scale = limit / maxDim;

    var ratio = spec.strokeRatio || 0.031;
    var stroke = (typeof spec.strokeWidth === "number") ? spec.strokeWidth
      : Math.max(1.1, Math.min(5.2, scale * maxDim * ratio));
    return {
      geo: geo, box: box, deg: deg, scale: scale, viewBox: VIEW,
      stroke: stroke, c: c,
      toPx: function (p) {
        var r = rotatePoint(p, c, deg);
        return [(r[0] - c[0]) * scale + VIEW / 2, (r[1] - c[1]) * scale + VIEW / 2];
      }
    };
  }

  /**
   * spec を「px座標に変換済みの図」へ解決する
   * @returns {{points:Object, order:Array<string>, elems:Array, ctx:Object}}
   */
  function resolve(spec) {
    var ctx = fit(spec);
    var geo = ctx.geo;
    var points = {};
    var order = Object.keys(geo.points || {}).sort();
    order.forEach(function (k) { points[k] = ctx.toPx(geo.points[k]); });
    var elems = [];
    (geo.elems || []).forEach(function (el) {
      var cp = {};
      Object.keys(el).forEach(function (k) { cp[k] = el[k]; });
      if (el.pts) cp.pts = el.pts.map(function (p) { return ctx.toPx(p); });
      if (el.a) cp.a = ctx.toPx(el.a);
      if (el.b) cp.b = ctx.toPx(el.b);
      if (el.c) cp.c = ctx.toPx(el.c);
      if (el.d) cp.d = transformPath(el.d, ctx);
      if (typeof el.rx === "number") cp.rx = el.rx * ctx.scale;
      if (typeof el.ry === "number") cp.ry = el.ry * ctx.scale;
      if (typeof el.r === "number") cp.r = el.r * ctx.scale;
      elems.push(cp);
    });
    if (geo.circle) {
      elems.push({ kind: "circle", c: ctx.toPx(geo.circle.c), r: geo.circle.r * ctx.scale, style: "solid" });
    } else if (elems.length === 0 && order.length >= 2) {
      // 多角形の外形（elems を持たない通常の図形）
      elems.push({
        kind: "polygon",
        pts: order.map(function (nm) { return points[nm]; }),
        style: "solid",
        open: !!geo.open
      });
    }
    return { points: points, order: order, elems: elems, ctx: ctx };
  }

  /**
   * パス文字列中の座標を toPx で変換する（M / L / A / Z のみを使う前提）。
   * A コマンドは rx,ry,rot,large-arc,sweep,x,y のため、座標は最後の2つだけ変換する。
   */
  function transformPath(d, ctx) {
    var tokens = String(d).split(/([A-Za-z])/);
    var out = [];
    for (var i = 0; i < tokens.length; i++) {
      var t = tokens[i];
      if (/^[A-Za-z]$/.test(t)) { out.push(t); continue; }
      var nums = t.trim().split(/[\s,]+/).filter(function (s) { return s.length > 0; });
      if (nums.length === 0) continue;
      var cmd = "";
      for (var j = out.length - 1; j >= 0; j--) {
        if (/^[A-Za-z]$/.test(out[j])) { cmd = out[j]; break; }
      }
      var numsOut = [];
      if (cmd === "A" && nums.length >= 7) {
        var rx = Number(nums[0]) * ctx.scale, ry = Number(nums[1]) * ctx.scale;
        var last = ctx.toPx([Number(nums[5]), Number(nums[6])]);
        numsOut = [n2(rx), n2(ry), nums[2], nums[3], nums[4], n2(last[0]), n2(last[1])];
      } else {
        for (var k = 0; k + 1 < nums.length; k += 2) {
          var p = ctx.toPx([Number(nums[k]), Number(nums[k + 1])]);
          numsOut.push(n2(p[0]), n2(p[1]));
        }
        if (nums.length % 2 === 1) numsOut.push(nums[nums.length - 1]);
      }
      out.push(numsOut.join(" "));
    }
    return out.join(" ");
  }

  // ------------------------------------------------------------------ マーク

  /** 直角・等辺・平行マークの既定値（形の種類から自動判定）＋ spec.marks の上書き */
  function effectiveMarks(spec) {
    var m = { rightAngle: [], equalSides: [], parallel: [] };
    var shape = spec.shape, variant = spec.variant || "";
    var names = Object.keys(unitShape(shape, variant, spec).points || {}).sort();

    if (spec.autoMarks !== false) {
      if (shape === "quadrilateral" &&
          (variant === "square" || variant === "rectangle" || variant === "rectangle_wide")) {
        m.rightAngle = names.slice();
      }
      if (variant === "rhombus" || variant === "square") {
        for (var i = 0; i < names.length; i++) {
          m.equalSides.push([names[i], names[(i + 1) % names.length]]);
        }
      }
      if (shape === "triangle" && (variant === "isosceles" || variant === "equilateral")) {
        m.equalSides.push([names[1], names[0]], [names[0], names[2]]);
      }
      if (shape === "triangle" && variant === "isosceles_right") {
        m.rightAngle = [names[0]];
        m.equalSides.push([names[0], names[1]], [names[0], names[2]]);
      }
      if (shape === "triangle" && variant === "right") m.rightAngle = [names[0]];
      if (variant === "parallelogram") {
        m.parallel.push([names[0], names[1]], [names[2], names[3]]);
        m.parallel.push([names[1], names[2]], [names[3], names[0]]);
      }
      if (variant === "trapezoid") m.parallel.push([names[0], names[1]], [names[2], names[3]]);
      if (variant === "isosceles_trapezoid") {
        m.parallel.push([names[0], names[1]], [names[2], names[3]]);
        m.equalSides.push([names[1], names[2]], [names[3], names[0]]);
      }
    }
    var given = spec.marks || {};
    ["rightAngle", "equalSides", "parallel"].forEach(function (k) {
      if (!Array.isArray(given[k]) || given[k].length === 0) return;
      if (k === "rightAngle") m.rightAngle = given[k].slice();
      else {
        // 辺は ["A","B"] / "AB" のどちらでも受け付ける
        m[k] = given[k].map(function (pair) {
          if (Array.isArray(pair)) return [pair[0], pair[1]];
          var s = String(pair);
          return [s.charAt(0), s.charAt(1)];
        });
      }
    });
    return m;
  }

  /** 頂点順序から辺の一覧を作る */
  function edgesOf(order, open) {
    var out = [];
    var n = order.length;
    var last = open ? n - 1 : n;
    for (var i = 0; i < last; i++) {
      var a = order[i], b = order[(i + 1) % n];
      out.push({ id: "e-" + edgeKey(a, b), a: a, b: b, key: edgeKey(a, b) });
    }
    return out;
  }

  // ------------------------------------------------------------ タップ部品 (parts)

  /**
   * タップできる部品（頂点・辺・角・半径…）を列挙する
   * @param {Object} spec
   * @returns {Array<{id:string, kind:string, label:string, short:string, hit:Object}>}
   */
  function parts(spec) {
    spec = spec || {};
    var res = resolve(spec);
    var order = res.order;
    var out = [];
    var marks = effectiveMarks(spec);

    if (order.length >= 2 && !res.ctx.geo.circle) {
      // 頂点
      order.forEach(function (nm) {
        out.push({
          id: "v-" + nm, kind: "vertex", label: "頂点" + nm, short: nm,
          hit: { type: "circle", c: res.points[nm], r: 14 }
        });
      });
      // 辺
      edgesOf(order, !!res.ctx.geo.open).forEach(function (e) {
        out.push({
          id: e.id, kind: "edge", label: "辺" + e.key, short: e.key,
          a: e.a, b: e.b,
          hit: { type: "line", a: res.points[e.a], b: res.points[e.b] }
        });
      });
      // 角（2本の辺で囲まれる頂点のみ）
      if (!res.ctx.geo.open) {
        order.forEach(function (nm, i) {
          var n = order.length;
          var prev = res.points[order[(i - 1 + n) % n]];
          var p = res.points[nm];
          var next = res.points[order[(i + 1) % n]];
          var r = Math.min(dist(p, prev), dist(p, next)) * 0.32;
          r = Math.max(14, Math.min(30, r));
          out.push({
            id: "a-" + nm, kind: "angle", label: "角" + nm, short: "角" + nm,
            vertex: nm,
            hit: { type: "wedge", v: p, p1: prev, p2: next, r: r }
          });
        });
      } else {
        // 角の図形: 頂点 O の角のみ
        var o = order[0];
        var others = order.slice(1);
        var r2 = Math.min(dist(res.points[o], res.points[others[0]]), dist(res.points[o], res.points[others[1]])) * 0.32;
        out.push({
          id: "a-" + o, kind: "angle", label: "角O", short: "角O", vertex: o,
          hit: {
            type: "wedge", v: res.points[o],
            p1: res.points[others[0]], p2: res.points[others[1]],
            r: Math.max(14, Math.min(30, r2))
          }
        });
      }
    }

    if (res.ctx.geo.circle || (spec.shape === "circle")) {
      var circleEl = null;
      for (var ci = 0; ci < res.elems.length; ci++) {
        if (res.elems[ci].kind === "circle") { circleEl = res.elems[ci]; break; }
      }
      // 半円など円要素が無い場合は半径から復元する
      var c = circleEl ? circleEl.c : [VIEW / 2, VIEW / 2];
      var rpx = circleEl ? circleEl.r
        : (typeof spec.radius === "number" ? spec.radius : 2.2) * res.ctx.scale;
      out.push({
        id: "p-center", kind: "center", label: "中心", short: "中心",
        hit: { type: "circle", c: c, r: 14 }
      });
      (spec.radii || []).forEach(function (deg) {
        var a = deg2rad(deg);
        var rim = [c[0] + rpx * Math.cos(a), c[1] + rpx * Math.sin(a)];
        out.push({
          id: "r-" + deg, kind: "radius", label: "半径", short: "半径",
          hit: { type: "line", a: c, b: rim }
        });
      });
      (spec.diameters || []).forEach(function (deg) {
        var a = deg2rad(deg);
        var p1 = [c[0] - rpx * Math.cos(a), c[1] - rpx * Math.sin(a)];
        var p2 = [c[0] + rpx * Math.cos(a), c[1] + rpx * Math.sin(a)];
        out.push({
          id: "d-" + deg, kind: "diameter", label: "直径", short: "直径",
          hit: { type: "line", a: p1, b: p2 }
        });
      });
    }

    // V2.7.0: 立体(solid) / 展開図(net) / 直線(lines) は points を持たないため、
    // 上記の「頂点・辺・角」ベースではなく「構成要素そのもの」をタップ部品にする。
    //   polygon -> 面 (face) / line -> 辺 (edge)
    if (out.length === 0 && Array.isArray(res.elems) && res.elems.length > 0) {
      var faces = [];
      res.elems.forEach(function (e, i) {
        if (e && e.kind === "polygon" && Array.isArray(e.pts) && e.pts.length >= 3) {
          faces.push({ id: "f-" + (i + 1), pts: e.pts });
        }
      });
      // 面のラベルは「重心の高低」で決める（最小＝上の面 / それ以外＝横の面）
      var faceInfo = faces.map(function (f) {
        var cx = 0, cy = 0;
        f.pts.forEach(function (q) { cx += q[0]; cy += q[1]; });
        return { id: f.id, pts: f.pts, cy: cy / f.pts.length };
      });
      var byHeight = faceInfo.slice().sort(function (a, b) { return a.cy - b.cy; });
      var labelById = {};
      byHeight.forEach(function (o, rank) {
        labelById[o.id] = (rank === 0) ? "上の面" : "横の面" + rank;
      });

      faceInfo.forEach(function (f) {
        out.push({ id: f.id, kind: "face", label: labelById[f.id], short: labelById[f.id], hit: { type: "polygon", pts: f.pts } });
      });
      res.elems.forEach(function (e, i) {
        if (e && e.kind === "line" && Array.isArray(e.a) && Array.isArray(e.b)) {
          out.push({
            id: "l-" + (i + 1), kind: "edge", label: "辺" + (i + 1), short: "辺" + (i + 1),
            hit: { type: "line", a: e.a, b: e.b }
          });
        }
      });
    }
    return out;
  }

  // ------------------------------------------------------------------ 描画

  function styleAttrs(style, stroke) {
    if (style === "dashed") {
      return ' fill="none" stroke="' + COLORS.dashed + '" stroke-width="' + n2(Math.max(1, stroke * 0.8)) +
        '" stroke-dasharray="' + n2(Math.max(3, stroke * 2.4)) + ' ' + n2(Math.max(2.5, stroke * 1.7)) + '"';
    }
    if (style === "grid") return ' fill="none" stroke="' + COLORS.grid + '" stroke-width="0.8"';
    if (style === "guide") return ' fill="none" stroke="' + COLORS.guide + '" stroke-width="1" stroke-dasharray="4 3"';
    if (style === "thin") return ' fill="none" stroke="' + COLORS.line + '" stroke-width="' + n2(Math.max(1, stroke * 0.6)) + '"';
    return ' fill="none" stroke="' + COLORS.line + '" stroke-width="' + n2(stroke) +
      '" stroke-linejoin="round" stroke-linecap="round"';
  }

  function elemsMarkup(res, spec) {
    var stroke = res.ctx.stroke;
    var out = [];
    res.elems.forEach(function (el) {
      var at = styleAttrs(el.style, stroke);
      if (el.kind === "polygon") {
        out.push('<polygon points="' + el.pts.map(function (p) { return n2(p[0]) + "," + n2(p[1]); }).join(" ") + '"' + at + '/>');
      } else if (el.kind === "line") {
        out.push('<line x1="' + n2(el.a[0]) + '" y1="' + n2(el.a[1]) + '" x2="' + n2(el.b[0]) + '" y2="' + n2(el.b[1]) + '"' + at + '/>');
      } else if (el.kind === "circle") {
        out.push('<circle cx="' + n2(el.c[0]) + '" cy="' + n2(el.c[1]) + '" r="' + n2(el.r) + '"' + at + '/>');
      } else if (el.kind === "ellipse") {
        out.push('<ellipse cx="' + n2(el.c[0]) + '" cy="' + n2(el.c[1]) + '" rx="' + n2(el.rx) + '" ry="' + n2(el.ry) + '"' + at + '/>');
      } else if (el.kind === "path") {
        out.push('<path d="' + el.d + '"' + at + '/>');
      }
    });
    return out.join("");
  }

  /** 方眼（spec.grid を指定したときだけ描く） */
  function gridMarkup(res, spec) {
    if (!spec.grid) return "";
    var step = (spec.grid === true) ? 1 : Number(spec.grid);
    if (!(step > 0)) return "";
    var stepPx = step * res.ctx.scale;
    if (!(stepPx > 4)) return "";
    var origin = res.ctx.toPx([0, 0]);
    var out = [];
    var k, x, y;
    for (k = -40; k <= 40; k++) {
      x = origin[0] + k * stepPx;
      if (x >= 0 && x <= VIEW) {
        out.push('<line x1="' + n2(x) + '" y1="0" x2="' + n2(x) + '" y2="' + VIEW + '" stroke="' + COLORS.grid + '" stroke-width="0.8"/>');
      }
      y = origin[1] + k * stepPx;
      if (y >= 0 && y <= VIEW) {
        out.push('<line x1="0" y1="' + n2(y) + '" x2="' + VIEW + '" y2="' + n2(y) + '" stroke="' + COLORS.grid + '" stroke-width="0.8"/>');
      }
    }
    return '<g class="fig-grid">' + out.join("") + "</g>";
  }

  /** 半径・直径の補助線（円の問題用） */
  function radiiMarkup(res, spec) {
    var circleEl = null;
    for (var i = 0; i < res.elems.length; i++) {
      if (res.elems[i].kind === "circle") { circleEl = res.elems[i]; break; }
    }
    if (!circleEl) return "";
    var out = [];
    var stroke = res.ctx.stroke;
    (spec.radii || []).forEach(function (deg) {
      var a = deg2rad(deg);
      var rim = [circleEl.c[0] + circleEl.r * Math.cos(a), circleEl.c[1] + circleEl.r * Math.sin(a)];
      out.push('<line x1="' + n2(circleEl.c[0]) + '" y1="' + n2(circleEl.c[1]) + '" x2="' + n2(rim[0]) + '" y2="' + n2(rim[1]) +
        '" stroke="' + COLORS.line + '" stroke-width="' + n2(Math.max(1, stroke * 0.7)) + '"' +
        (spec.radiiDashed ? ' stroke-dasharray="5 4"' : "") + '/>');
    });
    (spec.diameters || []).forEach(function (deg) {
      var a = deg2rad(deg);
      var p1 = [circleEl.c[0] - circleEl.r * Math.cos(a), circleEl.c[1] - circleEl.r * Math.sin(a)];
      var p2 = [circleEl.c[0] + circleEl.r * Math.cos(a), circleEl.c[1] + circleEl.r * Math.sin(a)];
      out.push('<line x1="' + n2(p1[0]) + '" y1="' + n2(p1[1]) + '" x2="' + n2(p2[0]) + '" y2="' + n2(p2[1]) +
        '" stroke="' + COLORS.line + '" stroke-width="' + n2(Math.max(1, stroke * 0.7)) + '"/>');
    });
    if ((spec.radii || []).length > 0 || (spec.diameters || []).length > 0) {
      out.push('<circle cx="' + n2(circleEl.c[0]) + '" cy="' + n2(circleEl.c[1]) + '" r="2.6" fill="' + COLORS.line + '"/>');
    }
    return out.join("");
  }

  /** 頂点の点（レガシー互換: 既定ON） */
  function vertexMarkup(res, spec) {
    if (spec.vertexMark === false) return "";
    var out = [];
    var r = (typeof spec.vertexR === "number") ? spec.vertexR : Math.max(2.2, res.ctx.stroke * 0.75);
    res.order.forEach(function (nm) {
      var p = res.points[nm];
      out.push('<circle cx="' + n2(p[0]) + '" cy="' + n2(p[1]) + '" r="' + n2(r) + '" fill="' + COLORS.vertex + '"/>');
    });
    return out.join("");
  }

  /** 直角・等辺・平行のマーク（座標から算出するので図形と必ず一致する） */
  function marksMarkup(res, spec) {
    var marks = effectiveMarks(spec);
    var order = res.order;
    var stroke = res.ctx.stroke;
    var mw = Math.max(1.4, stroke * 0.6);
    var out = [];

    // 直角マーク（頂点の2辺に沿った小さな正方形）
    marks.rightAngle.forEach(function (nm) {
      var i = order.indexOf(nm);
      if (i < 0 || order.length < 3) return;
      var n = order.length;
      var p = res.points[nm];
      var p1 = res.points[order[(i - 1 + n) % n]];
      var p2 = res.points[order[(i + 1) % n]];
      var s = Math.min(dist(p, p1), dist(p, p2)) * 0.2;
      s = Math.max(7, Math.min(16, s));
      var u1 = unitVec([p1[0] - p[0], p1[1] - p[1]]);
      var u2 = unitVec([p2[0] - p[0], p2[1] - p[1]]);
      var a1 = [p[0] + u1[0] * s, p[1] + u1[1] * s];
      var a2 = [p[0] + u2[0] * s, p[1] + u2[1] * s];
      var corner = [a1[0] + u2[0] * s, a1[1] + u2[1] * s];
      out.push('<path class="fig-mark" d="M ' + n2(a1[0]) + ' ' + n2(a1[1]) +
        ' L ' + n2(corner[0]) + ' ' + n2(corner[1]) +
        ' L ' + n2(a2[0]) + ' ' + n2(a2[1]) + '" fill="none" stroke="' + COLORS.mark +
        '" stroke-width="' + n2(mw) + '"/>');
    });

    // 等辺マーク（同じ長さの辺の組ごとにティックを増やす）
    var groups = groupEdgesByLength(res, marks.equalSides);
    groups.forEach(function (g, gi) {
      g.forEach(function (e) {
        var A = res.points[e[0]], B = res.points[e[1]];
        var m = mid(A, B);
        var u = unitVec([B[0] - A[0], B[1] - A[1]]);
        var nor = [-u[1], u[0]];
        var ticks = Math.min(3, gi + 1);
        var half = 6;
        for (var t = 0; t < ticks; t++) {
          var off = (t - (ticks - 1) / 2) * 5;
          var c = [m[0] + u[0] * off, m[1] + u[1] * off];
          out.push('<line x1="' + n2(c[0] - nor[0] * half) + '" y1="' + n2(c[1] - nor[1] * half) +
            '" x2="' + n2(c[0] + nor[0] * half) + '" y2="' + n2(c[1] + nor[1] * half) +
            '" stroke="' + COLORS.mark + '" stroke-width="' + n2(mw) + '"/>');
        }
      });
    });

    // 平行マーク（同じ向きの組ごとに山型を増やす）
    var pgroups = groupEdges(marks.parallel);
    pgroups.forEach(function (g, gi) {
      g.forEach(function (e) {
        var A = res.points[e[0]], B = res.points[e[1]];
        if (!A || !B) return;
        var m = mid(A, B);
        var u = unitVec([B[0] - A[0], B[1] - A[1]]);
        var nor = [-u[1], u[0]];
        var tip = [m[0] - u[0] * gi * 8, m[1] - u[1] * gi * 8];
        var tail = [tip[0] - u[0] * 6, tip[1] - u[1] * 6];
        out.push('<path d="M ' + n2(tail[0] - nor[0] * 5) + ' ' + n2(tail[1] - nor[1] * 5) +
          ' L ' + n2(tip[0]) + ' ' + n2(tip[1]) +
          ' L ' + n2(tail[0] + nor[0] * 5) + ' ' + n2(tail[1] + nor[1] * 5) +
          '" fill="none" stroke="' + COLORS.mark + '" stroke-width="' + n2(mw) + '"/>');
      });
    });
    return out.join("");
  }

  /** 同じ長さの辺をまとめる（等辺マークの本数を決めるため） */
  function groupEdgesByLength(res, pairs) {
    var groups = [];
    (pairs || []).forEach(function (pair) {
      var A = res.points[pair[0]], B = res.points[pair[1]];
      if (!A || !B) return;
      var len = Math.round(dist(A, B) * 10) / 10;
      var found = null;
      for (var i = 0; i < groups.length; i++) {
        if (groups[i].len === len) { found = groups[i]; break; }
      }
      if (!found) { found = { len: len, edges: [] }; groups.push(found); }
      found.edges.push(pair);
    });
    return groups.map(function (g) { return g.edges; });
  }

  /** 平行マークのまとめ（同じ組を1グループにする） */
  function groupEdges(pairs) {
    var src = pairs || [];
    if (src.length === 0) return [];
    // [["A","B"],["C","D"]] のような並びを 2本ずつ 1グループにする
    var groups = [];
    for (var i = 0; i < src.length; i += 2) {
      groups.push(src.slice(i, i + 2));
    }
    return groups;
  }

  /** ラベル（頂点・辺・角・中心・半径・任意） */
  function labelsMarkup(res, spec) {
    var labels = spec.labels || {};
    var order = res.order;
    var pts = res.points;
    var out = [];

    function text(p, s, small) {
      out.push('<text x="' + n2(p[0]) + '" y="' + n2(p[1]) + '" class="' +
        (small ? "fig-label fig-label--small" : "fig-label") + '" text-anchor="middle" ' +
        'dominant-baseline="middle" font-size="' + (small ? 11 : 13) + '" font-weight="700" fill="' +
        (small ? COLORS.labelSmall : COLORS.label) + '" style="pointer-events:none">' + esc(s) + "</text>");
    }

    if (Array.isArray(labels.vertices) && order.length > 0) {
      var cen = centroid(order.map(function (nm) { return pts[nm]; }));
      labels.vertices.forEach(function (nm) {
        if (!pts[nm]) return;
        var p = pts[nm];
        var d = unitVec([p[0] - cen[0], p[1] - cen[1]]);
        text([p[0] + d[0] * 17, p[1] + d[1] * 17], nm);
      });
    }

    if (labels.edges && order.length > 0) {
      var cen2 = centroid(order.map(function (nm) { return pts[nm]; }));
      Object.keys(labels.edges).forEach(function (key) {
        var A = pts[key.charAt(0)], B = pts[key.charAt(1)];
        if (!A || !B) {
          var rk = edgeKey(key.charAt(0), key.charAt(1));
          order.forEach(function (nm, i) {
            var other = order[(i + 1) % order.length];
            if (edgeKey(nm, other) === rk) { A = pts[nm]; B = pts[other]; }
          });
        }
        if (!A || !B) return;
        var m = mid(A, B);
        var nor = outwardNormal(A, B, cen2);
        text([m[0] + nor[0] * 18, m[1] + nor[1] * 18], labels.edges[key], true);
      });
    }

    if (labels.angles && order.length >= 3) {
      var cen3 = centroid(order.map(function (nm) { return pts[nm]; }));
      Object.keys(labels.angles).forEach(function (nm) {
        var i = order.indexOf(nm);
        if (i < 0) return;
        var n = order.length;
        var p = pts[nm];
        var d = bisectorDir(pts[order[(i - 1 + n) % n]], p, pts[order[(i + 1) % n]], cen3);
        text([p[0] + d[0] * 26, p[1] + d[1] * 26], labels.angles[nm], true);
      });
    }

    // 円の中心・半径ラベル
    var circleEl = null;
    for (var ci = 0; ci < res.elems.length; ci++) {
      if (res.elems[ci].kind === "circle") { circleEl = res.elems[ci]; break; }
    }
    if (circleEl && labels.center) {
      text([circleEl.c[0] - 16, circleEl.c[1] - 14], labels.center, true);
    }
    if (circleEl && labels.radius && (spec.radii || []).length > 0) {
      var a0 = deg2rad(spec.radii[0]);
      var rim = [circleEl.c[0] + circleEl.r * Math.cos(a0) * 0.55, circleEl.c[1] + circleEl.r * Math.sin(a0) * 0.55];
      text([rim[0] - 12, rim[1] - 10], labels.radius, true);
    }

    if (Array.isArray(labels.custom)) {
      labels.custom.forEach(function (c) {
        if (!c || !c.at) return;
        text(res.ctx.toPx(c.at), c.text || "", !!c.small);
      });
    }
    return out.join("");
  }

  // ------------------------------------------------------------ タップ部品の描画

  function wedgePath(h) {
    var v = h.v, r = h.r;
    var u1 = unitVec([h.p1[0] - v[0], h.p1[1] - v[1]]);
    var u2 = unitVec([h.p2[0] - v[0], h.p2[1] - v[1]]);
    var a1 = Math.atan2(u1[1], u1[0]);
    var a2 = Math.atan2(u2[1], u2[0]);
    var d = a2 - a1;
    while (d > Math.PI) d -= 2 * Math.PI;
    while (d < -Math.PI) d += 2 * Math.PI;
    var pts = [[v[0], v[1]]];
    var steps = 10;
    for (var k = 0; k <= steps; k++) {
      var a = a1 + d * k / steps;
      pts.push([v[0] + r * Math.cos(a), v[1] + r * Math.sin(a)]);
    }
    return "M " + pts.map(function (p) { return n2(p[0]) + " " + n2(p[1]); }).join(" L ") + " Z";
  }

  /**
   * 部品1つ分のヒット領域マークアップ
   * @param {Object} part parts() の要素
   * @param {string} state "" | "selected" | "correct" | "wrong"
   * @param {boolean} interactive クリック可能か
   */
  function partMarkup(part, state, interactive) {
    var cls = "fig-part fig-part--" + part.kind + (state ? " fig-part--" + state : "");
    var attr = ' class="' + cls + '" data-part-id="' + esc(part.id) + '"' +
      (interactive ? ' onclick="app.toggleFigurePart(\'' + esc(part.id) + '\')"' : "");
    var h = part.hit;
    if (!h) return "";
    if (h.type === "circle") {
      return '<circle cx="' + n2(h.c[0]) + '" cy="' + n2(h.c[1]) + '" r="' + n2(h.r) + '"' + attr + "/>";
    }
    if (h.type === "line") {
      return '<line x1="' + n2(h.a[0]) + '" y1="' + n2(h.a[1]) + '" x2="' + n2(h.b[0]) + '" y2="' + n2(h.b[1]) + '"' + attr + "/>";
    }
    if (h.type === "wedge") {
      return '<path d="' + wedgePath(h) + '"' + attr + "/>";
    }
    if (h.type === "polygon") {
      var ptsAttr = h.pts.map(function (p) { return n2(p[0]) + "," + n2(p[1]); }).join(" ");
      return '<polygon points="' + ptsAttr + '"' + attr + "/>";
    }
    return "";
  }

  /**
   * 条件に合う部品ID（＝正解）を求める
   * @param {Object} spec
   * @param {Object} select {kind, ids, all, equalSides, group, rightAngle, parallel, longest, shortest}
   * @returns {Array<string>} ソート済みの部品ID
   */
  function selectParts(spec, select) {
    var ps = parts(spec);
    select = select || {};
    var kind = select.kind || null;
    var ids = [];
    var res = resolve(spec);
    var marks = effectiveMarks(spec);

    if (Array.isArray(select.ids)) {
      ids = select.ids.slice();
    } else if (select.all) {
      ids = ps.filter(function (p) { return !kind || p.kind === kind; }).map(function (p) { return p.id; });
    } else if (select.equalSides) {
      var groups = groupEdgesByLength(res, marks.equalSides);
      var gi = (typeof select.group === "number") ? select.group : -1;
      groups.forEach(function (g, i) {
        if (gi >= 0 && i !== gi) return;
        g.forEach(function (e) { ids.push("e-" + edgeKey(e[0], e[1])); });
      });
    } else if (select.rightAngle) {
      marks.rightAngle.forEach(function (nm) {
        ids.push(kind === "angle" ? "a-" + nm : "v-" + nm);
      });
    } else if (select.parallel) {
      marks.parallel.forEach(function (e) { ids.push("e-" + edgeKey(e[0], e[1])); });
    } else if (select.topFace) {
      // 立体・展開図の「上の面」= 面の重心が最も高い（y が最も小さい）もの
      // parts() のラベル付けと同じ規則なので、ラベルと必ず一致する。
      var minCy = null, topId = null;
      ps.forEach(function (p) {
        if (p.kind !== "face" || !p.hit || p.hit.type !== "polygon") return;
        var cy = 0;
        p.hit.pts.forEach(function (q) { cy += q[1]; });
        cy /= p.hit.pts.length;
        if (minCy === null || cy < minCy - 0.01) { minCy = cy; topId = p.id; }
      });
      if (topId) ids.push(topId);
    } else if (select.longest || select.shortest) {
      var edges = edgesOf(res.order, !!res.ctx.geo.open).map(function (e) {
        return { id: e.id, len: dist(res.points[e.a], res.points[e.b]) };
      });
      edges.sort(function (a, b) { return select.longest ? b.len - a.len : a.len - b.len; });
      var best = edges.length ? edges[0].len : 0;
      ids = edges.filter(function (e) { return Math.abs(e.len - best) < 0.6; }).map(function (e) { return e.id; });
    }

    // kind フィルタ + 重複除去 + 実在チェック
    var seen = {};
    var out = [];
    ids.forEach(function (id) {
      if (seen[id]) return;
      var p = null;
      for (var i = 0; i < ps.length; i++) { if (ps[i].id === id) { p = ps[i]; break; } }
      if (!p) return;
      if (kind && p.kind !== kind) return;
      seen[id] = true;
      out.push(id);
    });
    return out.sort();
  }

  // ---------------------------------------------------------------------- 出力

  /**
   * 図形1つのSVG文字列を返す
   * @param {Object} spec 図形spec
   * @param {Object} [opts] {width, height, className, partsMarkup}
   */
  function svg(spec, opts) {
    opts = opts || {};
    var res = resolve(spec);
    var inner = [
      gridMarkup(res, spec),
      elemsMarkup(res, spec),
      radiiMarkup(res, spec),
      vertexMarkup(res, spec),
      marksMarkup(res, spec),
      labelsMarkup(res, spec),
      opts.partsMarkup || ""
    ].join("");
    var h = (opts.height === undefined) ? 96 : opts.height;
    return '<svg viewBox="0 0 ' + VIEW + " " + VIEW + '" width="' + (opts.width || "100%") +
      '" height="' + h + '" role="img" aria-hidden="true"' +
      (opts.className ? ' class="' + opts.className + '"' : "") + ">" + inner + "</svg>";
  }

  /**
   * <figure> ラッパ付きの図形HTML
   * @param {Object} spec
   * @param {Object} [opts] {size:"small"|"medium"|"large", caption}
   */
  function render(spec, opts) {
    opts = opts || {};
    var size = opts.size || "medium";
    var caption = opts.caption ? '<figcaption class="fig-caption">' + esc(opts.caption) + "</figcaption>" : "";
    return '<figure class="fig fig-' + size + '">' + svg(spec, opts) + caption + "</figure>";
  }

  /**
   * タップで答えられる図（figure_tap 用）
   * @param {Object} spec
   * @param {Array<string>} selectedIds 選択中の部品ID
   * @param {Object} [opts] {interactive, stateById, size, height}
   */
  function renderTappable(spec, selectedIds, opts) {
    opts = opts || {};
    var res = resolve(spec);
    var ps = parts(spec);
    var sel = selectedIds || [];
    var stateById = opts.stateById || null;
    var interactive = opts.interactive !== false;
    var markup = ps.map(function (p) {
      var state = "";
      if (stateById && stateById[p.id]) state = stateById[p.id];
      else if (sel.indexOf(p.id) >= 0) state = "selected";
      return partMarkup(p, state, interactive);
    }).join("");
    var size = opts.size || "large";
    var figure = '<figure class="fig fig-' + size + '">' +
      svg(spec, {
        partsMarkup: '<g class="fig-parts">' + markup + "</g>",
        height: opts.height === undefined ? 260 : opts.height
      }) + "</figure>";
    return '<div id="figure-tap" class="figure-stage">' + figure + "</div>";
  }

  /**
   * 出題時のゆらぎ（回転など）を spec へ適用する。
   * 部品IDは変わらないので「向きが変わっても同じ辺が正解」を出題できる。
   */
  function varySpec(spec, vars) {
    var vary = spec.vary || [];
    if (!Array.isArray(vary) || vary.length === 0) return spec;
    var seed = 0;
    Object.keys(vars || {}).forEach(function (k) { seed += Number(vars[k]) || 0; });
    vary.forEach(function (v) {
      if (v === "rotate") {
        var options = spec.rotateOptions || [0, 0, 90, 180, 270];
        spec.rotate = options[Math.abs(seed) % options.length];
      } else if (v === "flip") {
        if (Math.abs(seed) % 2 === 1) spec.rotate = (spec.rotate || 0) + 180;
      }
    });
    return spec;
  }

  /**
   * question_source から呼ぶ組み立て（figure_tap 用）
   * @param {Object} spec figureSpec（tap: {kind, select, mode} を含む）
   * @param {Object} vars 生成変数
   * @returns {Object|null} {figureHTML, figureParts, correctPartIds, answer, partLabels}
   */
  function buildDisplay(spec, vars) {
    if (!spec) return null;
    var s = JSON.parse(JSON.stringify(spec));
    varySpec(s, vars);
    var tap = s.tap || {};
    // tap.kind は「どの種類の部品をタップさせるか」の指定なので、
    // select.kind と同じ「種別フィルタ」として selectParts へ渡す。
    // tap.select.kind が明示されている場合はそちらを優先する。
    var sel = {};
    Object.keys(tap.select || {}).forEach(function (k) { sel[k] = tap.select[k]; });
    if (tap.kind && !sel.kind) sel.kind = tap.kind;
    var correct = selectParts(s, sel);
    if (correct.length === 0) return null;
    var ps = parts(s);
    // QuestionValidator は figureParts を2つ以上要求する。満たせない spec は出題しない。
    if (ps.length < 2) return null;
    var partLabels = {};
    ps.forEach(function (p) { partLabels[p.id] = p.label; });
    var figureParts = ps.map(function (p) {
      return { id: p.id, kind: p.kind, label: p.label, short: p.short };
    });
    return {
      figureHTML: renderTappable(s, [], { size: s.sizeName || "large" }),
      figureSpec: s,
      figureParts: figureParts,
      correctPartIds: correct,
      partLabels: partLabels,
      answer: correct.join(",")
    };
  }

  // ------------------------------------------------------------- 全specカタログ

  var CATALOG_DEFS = [
    ["tri_equilateral", "正三角形", { shape: "triangle", variant: "equilateral", labels: { vertices: ["A", "B", "C"] } }],
    ["tri_isosceles", "二等辺三角形", { shape: "triangle", variant: "isosceles", labels: { vertices: ["A", "B", "C"] } }],
    ["tri_right", "直角三角形", { shape: "triangle", variant: "right", labels: { vertices: ["A", "B", "C"], angles: { A: "90°" } } }],
    ["tri_isosceles_right", "直角二等辺三角形", { shape: "triangle", variant: "isosceles_right" }],
    ["tri_obtuse", "鈍角三角形", { shape: "triangle", variant: "obtuse", labels: { angles: { C: "120°" } } }],
    ["tri_acute", "鋭角三角形", { shape: "triangle", variant: "acute" }],
    ["tri_general", "三角形（一般）", { shape: "triangle", variant: "general", labels: { vertices: ["A", "B", "C"] } }],
    ["quad_square", "正方形", { shape: "quadrilateral", variant: "square", labels: { vertices: ["A", "B", "C", "D"] } }],
    ["quad_rectangle", "長方形", { shape: "quadrilateral", variant: "rectangle", labels: { vertices: ["A", "B", "C", "D"] } }],
    ["quad_parallelogram", "平行四辺形", { shape: "quadrilateral", variant: "parallelogram" }],
    ["quad_rhombus", "ひし形", { shape: "quadrilateral", variant: "rhombus" }],
    ["quad_trapezoid", "台形", { shape: "quadrilateral", variant: "trapezoid" }],
    ["quad_isosceles_trapezoid", "等脚台形", { shape: "quadrilateral", variant: "isosceles_trapezoid" }],
    ["quad_general", "四角形（一般）", { shape: "quadrilateral", variant: "general" }],
    ["poly_pentagon", "五角形", { shape: "polygon", variant: "pentagon" }],
    ["poly_hexagon", "六角形", { shape: "polygon", variant: "hexagon" }],
    ["poly_octagon", "八角形", { shape: "polygon", variant: "octagon" }],
    ["circle_basic", "円", { shape: "circle", radius: 2.2 }],
    ["circle_radius", "円（半径・中心）", { shape: "circle", radius: 2.2, radii: [200, 340], labels: { center: "O", radius: "半径" } }],
    ["circle_diameter", "円（直径）", { shape: "circle", radius: 2.2, diameters: [0], labels: { center: "O" } }],
    ["circle_semicircle", "半円", { shape: "circle", variant: "semicircle", radius: 2.2 }],
    ["angle_right", "直角", { shape: "angle", variant: "right", labels: { angles: { O: "90°" }, vertices: ["O", "A", "B"] } }],
    ["angle_acute", "鋭角", { shape: "angle", variant: "acute", labels: { angles: { O: "45°" } } }],
    ["angle_obtuse", "鈍角", { shape: "angle", variant: "obtuse" }],
    ["area_square_grid", "方眼の正方形（面積）", { shape: "quadrilateral", variant: "square", pxPerUnit: 26, grid: 1, labels: { edges: { AB: "4cm" } } }],
    ["area_rectangle_grid", "方眼の長方形（面積）", { shape: "quadrilateral", variant: "rectangle", pxPerUnit: 24, grid: 1 }],
    ["lines_parallel", "平行な直線", { shape: "lines", variant: "parallel" }],
    ["lines_perpendicular", "垂直な直線", { shape: "lines", variant: "perpendicular" }],
    ["lines_crossing", "交わる直線", { shape: "lines", variant: "crossing" }],
    ["solid_cuboid", "直方体", { shape: "solid", variant: "cuboid" }],
    ["solid_cube", "立方体", { shape: "solid", variant: "cube" }],
    ["solid_cylinder", "円柱", { shape: "solid", variant: "cylinder" }],
    ["solid_sphere", "球", { shape: "solid", variant: "sphere" }],
    ["solid_prism", "三角柱", { shape: "solid", variant: "prism" }],
    ["net_cuboid", "直方体の展開図", { shape: "net", variant: "cuboid_net" }],
    ["net_cube", "立方体の展開図", { shape: "net", variant: "cube_net" }],
    ["demo_rotate45", "回転45°（欠けなし確認）", { shape: "quadrilateral", variant: "square", rotate: 45 }],
    ["demo_tap", "タップ部品（二等辺三角形）", { shape: "triangle", variant: "isosceles", labels: { vertices: ["A", "B", "C"] }, tap: { kind: "edge", select: { equalSides: true } } }]
  ];

  var CATALOG = CATALOG_DEFS.map(function (d) { return { id: d[0], name: d[1], spec: d[2] }; });

  function spec(id) {
    for (var i = 0; i < CATALOG.length; i++) {
      if (CATALOG[i].id === id) return CATALOG[i].spec;
    }
    return null;
  }

  // ----------------------------------------------------------- レガシー互換API

  /**
   * 旧 createFigureSVG(type, params) 互換。
   * viewBox 120 基準の見た目を保ちつつ、以下を修正している:
   *   - 直角マークが頂点と一致する（固定座標 30,30 をやめた）
   *   - 回転しても viewBox からはみ出さない（自動縮小）
   */
  function toLegacy(type, params) {
    params = params || {};
    var sizeView = (typeof params.size === "number" ? params.size : 96) * LEGACY_TO_VIEW;
    var rotate = typeof params.rotation === "number" ? params.rotation : 0;
    var specObj;

    if (type === "circle") {
      specObj = {
        shape: "circle", radius: 1, box: [-1, -1, 1, 1],
        size: sizeView, rotate: rotate, autoMarks: false, vertexMark: false
      };
    } else if (type === "triangle") {
      specObj = {
        shape: "triangle", variant: "equilateral",
        size: sizeView, rotate: rotate, autoMarks: false,
        vertexMark: params.vertexMark !== false
      };
    } else {
      if (params.width && params.height) {
        sizeView = Math.max(params.width, params.height) * LEGACY_TO_VIEW;
      }
      specObj = {
        shape: "quadrilateral", variant: params.variant || "square",
        size: sizeView, rotate: rotate, autoMarks: false,
        vertexMark: params.vertexMark !== false
      };
    }
    if (params.rightAngle) {
      // 直角マークは左上の頂点に描く（正方形・長方形の頂点と必ず一致する）
      specObj.marks = { rightAngle: ["A"] };
    }
    // 旧実装は size によらず stroke-width=3 (viewBox 120) 固定だった。見た目を完全に保つ
    specObj.strokeWidth = (typeof params.strokeWidth === "number" ? params.strokeWidth : 3) * LEGACY_TO_VIEW;
    specObj.vertexR = 3.2 * LEGACY_TO_VIEW;
    return svg(specObj, { height: 96 });
  }

  var FigureSVG = {
    VIEW: VIEW,
    MARGIN_RATIO: MARGIN_RATIO,
    COLORS: COLORS,
    CATALOG: CATALOG,
    spec: spec,
    unitShape: unitShape,
    resolve: resolve,
    fit: fit,
    svg: svg,
    render: render,
    renderTappable: renderTappable,
    parts: parts,
    selectParts: selectParts,
    effectiveMarks: effectiveMarks,
    buildDisplay: buildDisplay,
    toLegacy: toLegacy,
    esc: esc,
    dist: dist,
    regularPolygon: regularPolygon
  };

  if (typeof globalThis !== "undefined") globalThis.FigureSVG = FigureSVG;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { FigureSVG: FigureSVG };
  } else if (typeof window !== "undefined") {
    window.FigureSVG = FigureSVG;
  }
})();
