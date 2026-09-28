/**
 * ClockSVG — 時計図の共通SVG部品 (V2.6.7)
 *
 * 2年生「時こくと時間」だけでなく、3年生以降の「時間の単位（時・分・秒）」でも
 * 共通して使える時計図コンポーネント。
 *
 * 仕様 (詳細設計):
 *  - 文字盤の数字は 1〜12 のみ（24時間表示時に内側へ 13〜24 を薄く補助表示）
 *  - 秒針は常に表示（秒を使わない問題では 0 秒 = 12 の位置で固定）
 *  - 大きさは 2 段階 (large / small)
 *  - 時計を 2 つ出すときの並びは 自動判定:
 *      大きい時計 → 縦並び (vertical) / 小さい時計 → 横並び (horizontal)
 *  - 「時」「分」「秒」は分けて入力させるため、入力欄の定義を提供する
 *
 * 公開API:
 *   ClockSVG.SIZES / FACE / layoutForSize(size) / handAngles(h, m, s)
 *   ClockSVG.render(opts)              1つの時計SVG
 *   ClockSVG.renderPair(clocks, opts)  複数時計のレイアウト込みHTML
 *   ClockSVG.resolveClocks(spec, vars) clockSpec → 実際の時計配列
 *   ClockSVG.buildDisplay(spec, vars)  question_source から呼ぶ組み立て
 *   ClockSVG.fieldsForFormat(format)   入力欄の定義 (時/分/秒を分離)
 *   ClockSVG.formatHMS(h, m, s, fmt)   回答文字列の生成
 *   ClockSVG.equalsAnswer(a, b)        時こく回答の比較
 */
(function () {
  "use strict";

  // 大きさ (px)。large/small の 2 段階
  var SIZES = { large: 260, small: 156 };
  var VIEW = 200; // viewBox は常に 200x200

  // 文字盤の寸法 (viewBox 座標)
  var C = {
    cx: 100, cy: 100,
    faceR: 92,
    tickOuter: 92, tickInnerLong: 79, tickInnerShort: 85,
    numberR: 72,
    number24R: 58,
    number24Font: 13,
    numberFont: 19,
    hourHandLen: 44, hourHandW: 8,
    minuteHandLen: 68, minuteHandW: 5,
    secondHandLen: 80, secondHandW: 2, secondTail: 18,
    centerR: 4
  };

  var COLORS = {
    face: "#ffffff",
    rim: "#334155",
    tick: "#cbd5e1",
    tickStrong: "#64748b",
    number: "#1e293b",
    number24: "#94a3b8",
    hourHand: "#1e293b",
    minuteHand: "#2563eb",
    secondHand: "#dc2626",
    center: "#0f172a"
  };

  // 秒針を含めた「時・分・秒」の回答形式。答えの書き方は学年で分けず、常に分離入力。
  var FORMATS = {
    "H:M":   [{ key: "h", label: "時", max: 2 }, { key: "m", label: "分", max: 2 }],
    "H:M:S": [{ key: "h", label: "時", max: 2 }, { key: "m", label: "分", max: 2 }, { key: "s", label: "秒", max: 2 }],
    // V2.6.8: 時間差（何時間何分）用。「時」ではなく「時間」と読ませる
    "HhM":   [{ key: "h", label: "時間", max: 2 }, { key: "m", label: "分", max: 2 }],
    "M":     [{ key: "m", label: "分", max: 3 }],
    "M:S":   [{ key: "m", label: "分", max: 2 }, { key: "s", label: "秒", max: 2 }],
    "COUNT": [{ key: "count", label: "こ", max: 3 }]
  };

  function pad2(n) {
    var v = Math.round(Number(n) || 0);
    return (v < 10 ? "0" : "") + v;
  }

  function toHalfWidth(s) {
    return String(s === null || s === undefined ? "" : s).replace(/[０-９]/g, function (c) {
      return String.fromCharCode(c.charCodeAt(0) - 0xFEE0);
    });
  }

  /**
   * 2つの時計を出すときの並び。大きい時計は縦並び、小さい時計は横並び。
   * @param {string} size "large" | "small"
   * @returns {string} "vertical" | "horizontal"
   */
  function layoutForSize(size) {
    return (size === "small") ? "horizontal" : "vertical";
  }

  /**
   * 時計の針の角度(度)。12時方向を 0 度とし時計回りが正。
   * 短針は「分」の進みに応じて少しずつ動く。
   */
  function handAngles(h, m, s) {
    var H = Math.round(Number(h) || 0);
    var M = Math.round(Number(m) || 0);
    var S = Math.round(Number(s) || 0);
    var hh = ((H % 12) + 12) % 12;
    return {
      hour: hh * 30 + M * 0.5 + S / 120,
      minute: M * 6 + S * 0.1,
      second: S * 6
    };
  }

  // 文字盤（目盛り・数字1〜12・24時間表示時の補助数字）を組み立てる
  function faceMarkup(show24) {
    var out = [];
    out.push('<circle cx="' + C.cx + '" cy="' + C.cy + '" r="' + C.faceR + '" fill="' + COLORS.face +
      '" stroke="' + COLORS.rim + '" stroke-width="3"/>');

    for (var i = 0; i < 60; i++) {
      var isLong = (i % 5 === 0);
      var inner = isLong ? C.tickInnerLong : C.tickInnerShort;
      out.push('<line x1="' + C.cx + '" y1="' + (C.cy - C.tickOuter) + '" x2="' + C.cx + '" y2="' + (C.cy - inner) +
        '" stroke="' + (isLong ? COLORS.tickStrong : COLORS.tick) + '" stroke-width="' + (isLong ? 2.5 : 1.5) +
        '" stroke-linecap="round" transform="rotate(' + (i * 6) + ' ' + C.cx + ' ' + C.cy + ')"/>');
    }

    for (var n = 1; n <= 12; n++) {
      var rad = n * 30 * Math.PI / 180;
      var x = C.cx + C.numberR * Math.sin(rad);
      var y = C.cy - C.numberR * Math.cos(rad);
      out.push('<text x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" font-size="' + C.numberFont +
        '" font-weight="700" fill="' + COLORS.number +
        '" text-anchor="middle" dominant-baseline="central">' + n + '</text>');
    }

    if (show24) {
      for (var k = 1; k <= 12; k++) {
        var rad24 = k * 30 * Math.PI / 180;
        var x24 = C.cx + C.number24R * Math.sin(rad24);
        var y24 = C.cy - C.number24R * Math.cos(rad24);
        var v24 = (k === 12) ? 0 : k + 12;
        out.push('<text x="' + x24.toFixed(1) + '" y="' + y24.toFixed(1) + '" font-size="' + C.number24Font +
          '" fill="' + COLORS.number24 +
          '" text-anchor="middle" dominant-baseline="central">' + v24 + '</text>');
      }
    }
    return out.join("");
  }

  /**
   * 時計1つ分の SVG を生成する
   * @param {Object} opts
   *   hour, minute, second : 表示する時刻
   *   size      : "large" | "small"
   *   show24    : 24時間表示の補助数字(0,13〜23)を内側に出すか
   *   showSeconds : 秒針を表示するか (既定 true)
   *   label     : 時計の下に出す見出し (例:「はじめ」「おわり」)
   *   aria      : 読み上げ用の説明
   */
  function renderClock(opts) {
    opts = opts || {};
    var sizeName = (opts.size === "small") ? "small" : "large";
    var px = SIZES[sizeName];
    var h = Number(opts.hour) || 0;
    var m = Number(opts.minute) || 0;
    var s = Number(opts.second) || 0;
    var show24 = !!opts.show24;
    var showSeconds = (opts.showSeconds !== false);
    var ang = handAngles(h, m, s);

    var svg = [];
    svg.push('<svg viewBox="0 0 200 200" width="' + px + '" height="' + px +
      '" role="img" aria-label="' + (opts.aria || "とけい") + '">');
    svg.push(faceMarkup(show24));

    // 短針 → 長針 → 秒針 の順に重ねる
    svg.push('<line class="clock-hand clock-hand-hour" x1="' + C.cx + '" y1="' + C.cy + '" x2="' + C.cx + '" y2="' + (C.cy - C.hourHandLen) +
      '" stroke="' + COLORS.hourHand + '" stroke-width="' + C.hourHandW + '" stroke-linecap="round" transform="rotate(' +
      ang.hour.toFixed(2) + ' ' + C.cx + ' ' + C.cy + ')"/>');
    svg.push('<line class="clock-hand clock-hand-minute" x1="' + C.cx + '" y1="' + C.cy + '" x2="' + C.cx + '" y2="' + (C.cy - C.minuteHandLen) +
      '" stroke="' + COLORS.minuteHand + '" stroke-width="' + C.minuteHandW + '" stroke-linecap="round" transform="rotate(' +
      ang.minute.toFixed(2) + ' ' + C.cx + ' ' + C.cy + ')"/>');
    if (showSeconds) {
      svg.push('<line class="clock-hand clock-hand-second" x1="' + C.cx + '" y1="' + (C.cy + C.secondTail) + '" x2="' + C.cx + '" y2="' + (C.cy - C.secondHandLen) +
        '" stroke="' + COLORS.secondHand + '" stroke-width="' + C.secondHandW + '" stroke-linecap="round" transform="rotate(' +
        ang.second.toFixed(2) + ' ' + C.cx + ' ' + C.cy + ')"/>');
    }
    svg.push('<circle class="clock-center" cx="' + C.cx + '" cy="' + C.cy + '" r="' + C.centerR + '" fill="' + COLORS.center + '"/>');
    svg.push('</svg>');

    var caption = opts.label
      ? '<figcaption class="clock-caption">' + opts.label + '</figcaption>'
      : "";

    return '<figure class="clock-figure clock-' + sizeName + '">' + svg.join("") + caption + '</figure>';
  }

  /**
   * 複数の時計を 1 つのまとまりとして描画する。
   * 並びは size から自動決定する（大きい時計 → 縦並び / 小さい時計 → 横並び）。
   * @param {Array<Object>} clocks renderClock に渡すオプションの配列
   * @param {Object} [opts] { layout: "vertical" | "horizontal" } 明示指定
   * @returns {string} HTML
   */
  function renderPair(clocks, opts) {
    opts = opts || {};
    var list = Array.isArray(clocks) ? clocks : [];
    if (list.length === 0) return "";
    if (list.length === 1) return renderClock(list[0]);
    var sizeName = (list[0].size === "small") ? "small" : "large";
    var layout = opts.layout || layoutForSize(sizeName);
    var inner = list.map(function (c) {
      var o = { size: sizeName, showSeconds: (c.showSeconds !== false) };
      for (var k in c) {
        if (Object.prototype.hasOwnProperty.call(c, k)) o[k] = c[k];
      }
      return renderClock(o);
    }).join("");
    return '<div class="clock-pair clock-layout-' + layout + '">' + inner + '</div>';
  }

  // 時計1つ分の「時/分/秒」を、数値または変数名(hourVar 等)のどちらでも指定できるように解決する
  function pickNumber(c, name, vars) {
    var varKey = name + "Var";
    if (typeof c[varKey] === "string" && typeof vars[c[varKey]] !== "undefined") {
      return Math.round(Number(vars[c[varKey]]) || 0);
    }
    if (typeof c[name] !== "undefined") return Math.round(Number(c[name]) || 0);
    return 0;
  }

  function buildAria(c, vars) {
    var h = pickNumber(c, "hour", vars);
    var m = pickNumber(c, "minute", vars);
    var s = pickNumber(c, "second", vars);
    return h + "時" + pad2(m) + "分" + pad2(s) + "秒のとけい";
  }

  /**
   * clockSpec（テンプレート定義）とテンプレート変数から、実際に表示する時計配列を作る
   * @param {Object} spec { size, showSeconds, layout, clocks: [{ hourVar, minuteVar, secondVar, label }] }
   * @param {Object} vars テンプレート変数
   * @returns {Array<Object>} renderPair に渡せる時計オプション配列
   */
  function resolveClocks(spec, vars) {
    spec = spec || {};
    vars = vars || {};
    var list = Array.isArray(spec.clocks) ? spec.clocks : [];
    return list.map(function (c) {
      var sizeName = (c.size || spec.size) === "small" ? "small" : "large";
      var showSeconds = !(c.showSeconds === false || spec.showSeconds === false);
      return {
        hour: pickNumber(c, "hour", vars),
        minute: pickNumber(c, "minute", vars),
        second: pickNumber(c, "second", vars),
        label: c.label || "",
        aria: c.aria || buildAria(c, vars),
        size: sizeName,
        showSeconds: showSeconds,
        show24: !!(c.show24 || spec.show24)
      };
    });
  }

  /**
   * 出題に必要な表示一式を組み立てる（question_source から呼ぶ）
   * @returns {{clockHTML:string, clocks:Array, format:string, fields:Array, answer:string}}
   */
  function buildDisplay(spec, vars) {
    spec = spec || {};
    vars = vars || {};
    var fmt = spec.format || "H:M";
    var clocks = resolveClocks(spec, vars);
    var clockHTML = renderPair(clocks, { layout: spec.layout });
    var answerValue = (typeof vars.answer !== "undefined") ? vars.answer : "";
    return {
      clockHTML: clockHTML,
      clocks: clocks,
      format: fmt,
      fields: fieldsForFormat(fmt, spec.unitLabel),
      answer: answerValue
    };
  }

  /**
   * 回答形式に対応する入力欄の定義を返す（「時」「分」「秒」は分けて入力させる）
   * @param {string} format "H:M" | "H:M:S" | "HhM" | "M:S" | "M" | "COUNT"
   * @param {string} [unitLabel] COUNT 形式のときに使う単位ラベル
   * @returns {Array<{key:string,label:string,max:number}>}
   */
  function fieldsForFormat(format, unitLabel) {
    var f = FORMATS[format] || FORMATS["H:M"];
    return f.map(function (x) {
      return {
        key: x.key,
        label: (x.key === "count" && unitLabel) ? unitLabel : x.label,
        max: x.max
      };
    });
  }

  /**
   * 時・分・秒を回答形式の文字列へ変換する（例: "3:05" / "3:05:20"）
   */
  function formatHMS(h, m, s, format) {
    var fmt = format || "H:M";
    var H = Math.round(Number(h) || 0);
    var M = Math.round(Number(m) || 0);
    var S = Math.round(Number(s) || 0);
    if (fmt === "H:M:S") return H + ":" + pad2(M) + ":" + pad2(S);
    if (fmt === "HhM") return H + ":" + pad2(M);
    if (fmt === "M:S") return M + ":" + pad2(S);
    if (fmt === "M") return String(M);
    if (fmt === "COUNT") return String(H);
    return H + ":" + pad2(M);
  }

  /**
   * "3:05" / "3時5分" / "３：０５" などの回答文字列を数値配列へ分解する
   * @returns {Array<number>} 例: "3:05" → [3, 5]
   */
  function parseHMS(str) {
    var s = toHalfWidth(str).replace(/[^0-9]+/g, " ");
    return s.split(/\s+/)
      .filter(function (x) { return x.length > 0; })
      .map(function (x) { return parseInt(x, 10); });
  }

  /**
   * 時こく回答の比較。桁数ゆれ(3:5 / 03:05)・全角数字・単位付き表記を吸収する。
   * @param {string} userValue 学習者が入力した回答
   * @param {string} correctValue 正解
   * @returns {boolean}
   */
  function equalsAnswer(userValue, correctValue) {
    var u = parseHMS(userValue);
    var c = parseHMS(correctValue);
    if (u.length === 0 || c.length === 0) return false;
    if (u.length !== c.length) return false;
    for (var i = 0; i < c.length; i++) {
      if (isNaN(u[i]) || u[i] !== c[i]) return false;
    }
    return true;
  }

  /**
   * "3:05" を「3時5分」のような表示用ラベルに変換する（結果画面・解説表示用）
   */
  function answerLabel(str, format) {
    var fmt = format || "H:M";
    if (str === null || str === undefined || str === "") return "";
    var p = parseHMS(str);
    if (fmt === "H:M:S" && p.length >= 3) return p[0] + "時" + p[1] + "分" + p[2] + "秒";
    if (fmt === "HhM" && p.length >= 2) return p[0] + "時間" + p[1] + "分";
    if (fmt === "H:M" && p.length >= 2) return p[0] + "時" + p[1] + "分";
    if (fmt === "M:S" && p.length >= 2) return p[0] + "分" + p[1] + "秒";
    if (fmt === "M" && p.length >= 1) return p[0] + "分";
    return String(str);
  }

  var ClockSVG = {
    SIZES: SIZES,
    VIEW: VIEW,
    FACE: C,
    COLORS: COLORS,
    FORMATS: FORMATS,
    layoutForSize: layoutForSize,
    handAngles: handAngles,
    render: renderClock,
    renderClock: renderClock,
    renderPair: renderPair,
    resolveClocks: resolveClocks,
    buildDisplay: buildDisplay,
    fieldsForFormat: fieldsForFormat,
    formatHMS: formatHMS,
    parseHMS: parseHMS,
    equalsAnswer: equalsAnswer,
    answerLabel: answerLabel
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = { ClockSVG: ClockSVG };
  } else {
    window.ClockSVG = ClockSVG;
  }
})();

