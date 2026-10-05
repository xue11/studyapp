/**
 * バージョン整合チェックスクリプト (V2.9.7)
 *
 * リリース時に「バージョン表記のズレ」と「dist/ の未更新」を検出する。
 * 実行方法: npm run check:version  (または node scripts/check_version.js)
 * 不一致がある場合は内容を表示して終了コード 1 で終了する。
 *
 * 検証内容:
 *   1. 各ファイルのバージョン表記が js/config.js の APP_META と一致するか
 *   2. dist/ の内容がソースと一致しているか（古いままデプロイされる事故の防止）
 *   3. dist/ に配信不要なファイル（テスト用ページ・設計書など）が混ざっていないか
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const ROOT = path.resolve(__dirname, "..");

function read(relPath) {
  const abs = path.join(ROOT, relPath);
  if (!fs.existsSync(abs)) return null;
  return fs.readFileSync(abs, "utf8");
}

function matchOrNull(text, regex) {
  if (text === null) return null;
  const m = text.match(regex);
  return m ? m[1] : null;
}

const errors = [];
const report = [];

function expect(label, actual, expected, fileLabel) {
  if (actual === null) {
    errors.push(`  - ${label}: 抽出できませんでした (${fileLabel})`);
    return;
  }
  if (actual !== expected) {
    errors.push(`  - ${label}: ${actual} (期待値 ${expected}) [${fileLabel}]`);
    return;
  }
  report.push(`  OK ${label}: ${actual}`);
}

// --- 1. 基準バージョンの決定 (js/config.js の APP_META) ---
const configSrc = read("js/config.js");
if (configSrc === null) {
  console.error("[FAIL] js/config.js が見つかりません。");
  process.exit(1);
}
const appVersion = matchOrNull(configSrc, /appVersion:\s*"([^"]+)"/);
const schemaVersion = matchOrNull(configSrc, /schemaVersion:\s*"([^"]+)"/);
if (!appVersion || !schemaVersion) {
  console.error("[FAIL] js/config.js から appVersion / schemaVersion を抽出できませんでした。");
  process.exit(1);
}
console.log(`基準バージョン: appVersion=${appVersion} / schemaVersion=${schemaVersion}\n`);

// --- 2. 各ファイルとの突合 ---
const migrationSrc = read("js/migration.js");
expect("js/migration.js フォールバック", matchOrNull(migrationSrc, /return\s+"(V[\d.]+)";/), appVersion, "js/migration.js");

const swSrc = read("sw.js");
const swCache = matchOrNull(swSrc, /const CACHE_NAME\s*=\s*'([^']+)'/);
const swExpectedPrefix = `arith-study-v${appVersion.replace(/^V/, "")}-`;
if (swCache === null) {
  errors.push(`  - sw.js CACHE_NAME: 抽出できませんでした (sw.js)`);
} else if (!swCache.startsWith(swExpectedPrefix)) {
  errors.push(`  - sw.js CACHE_NAME: ${swCache} (期待値は ${swExpectedPrefix} で始まる文字列) [sw.js]`);
} else {
  report.push(`  OK sw.js CACHE_NAME: ${swCache}`);
}

const indexSrc = read("index.html");
expect("index.html <title>", matchOrNull(indexSrc, /<title>[^<]*\((V[\d.]+)\)<\/title>/), appVersion, "index.html");

const distIndexSrc = read("dist/index.html");
if (distIndexSrc === null) {
  console.log("  -- dist/index.html は未ビルドのためスキップ");
} else {
  expect("dist/index.html <title>", matchOrNull(distIndexSrc, /<title>[^<]*\((V[\d.]+)\)<\/title>/), appVersion, "dist/index.html");
}

const testJsSrc = read("tests/test_phase1.js");
expect("tests/test_phase1.js 期待値", matchOrNull(testJsSrc, /appVersion,\s*"(V[\d.]+)"/), appVersion, "tests/test_phase1.js");
expect("tests/test_phase1.js 移行後値", matchOrNull(testJsSrc, /appMeta\.appVersion,\s*"(V[\d.]+)"/), appVersion, "tests/test_phase1.js");

const testHtmlSrc = read("test_phase1.html");
expect("test_phase1.html 期待値", matchOrNull(testHtmlSrc, /APP_META\.appVersion\s*!==\s*"(V[\d.]+)"/), appVersion, "test_phase1.html");

const overviewSrc = read("app_overview.md");
expect("app_overview.md バージョン", matchOrNull(overviewSrc, /\*\*バージョン\*\*:\s*(V[\d.]+)/), appVersion, "app_overview.md");
expect("app_overview.md スキーマ", matchOrNull(overviewSrc, /\*\*スキーマバージョン\*\*:\s*([\d.]+)/), schemaVersion, "app_overview.md");

const schemaJsSrc = read("js/schema.js");
const schemaJsVersion = matchOrNull(schemaJsSrc, /schemaVersion:\s*"([\d.]+)"/);
if (schemaJsVersion !== null) {
  expect("js/schema.js schemaVersion", schemaJsVersion, schemaVersion, "js/schema.js");
} else {
  console.log("  -- js/schema.js に schemaVersion 定数がないためスキップ");
}

// V2.9.5 追加: js/schema.js の appMeta.appVersion も単一情報源と一致させる。
// 実際は V2.7.0 のまま陳腐化していた（check:version が appVersion を見ていなかったため）。
// appMeta は `appMeta = {` または `appMeta: {` のどちらの書き方でも現れる。
const schemaJsAppVersion = matchOrNull(
  schemaJsSrc,
  /appMeta\s*[:=]\s*\{[\s\S]*?appVersion:\s*"(V[\d.]+)"/
);
if (schemaJsAppVersion !== null) {
  expect("js/schema.js appMeta.appVersion", schemaJsAppVersion, appVersion, "js/schema.js");
} else {
  console.log("  -- js/schema.js に appMeta.appVersion がないためスキップ");
}

const testHtmlSchema = matchOrNull(testHtmlSrc, /APP_META\.schemaVersion\s*!==\s*"([\d.]+)"/);
expect("test_phase1.html schemaVersion", testHtmlSchema, schemaVersion, "test_phase1.html");

// --- 3. dist/ とソースの一致確認 (V2.9.5 追加) ---
// dist/ は Firebase Hosting が配信する実体。ここが古いままデプロイされると
// 「テストを通したコード」ではなく「古いコード」が利用者に届く。
// (V2.9.4 で dist/js/hissan_svg.js が V2.9.3 のまま配信されていた事故の再発防止)
const DIST_DIR = path.join(ROOT, "dist");
const sha = (buf) => crypto.createHash("sha256").update(buf).digest("hex").slice(0, 16);

function listRelativeFiles(dir, base) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    const rel = path.posix.join(base, entry.name);
    if (entry.isDirectory()) out.push(...listRelativeFiles(abs, rel));
    else out.push(rel);
  }
  return out;
}

if (!fs.existsSync(DIST_DIR)) {
  console.log("  -- dist/ が未ビルドのため、dist 整合チェックはスキップ（npm run build で生成）");
} else {
  const distFiles = listRelativeFiles(DIST_DIR, "");
  let checked = 0;
  const mismatches = [];
  const notSource = [];

  for (const rel of distFiles) {
    const srcAbs = path.join(ROOT, rel);
    const distAbs = path.join(DIST_DIR, rel);
    if (!fs.existsSync(srcAbs)) {
      notSource.push(rel);
      continue;
    }
    checked++;
    if (sha(fs.readFileSync(srcAbs)) !== sha(fs.readFileSync(distAbs))) mismatches.push(rel);
  }

  if (mismatches.length > 0) {
    errors.push(`  - dist/ がソースと一致しません（npm run build で再生成してください）: ${mismatches.join(", ")}`);
  } else {
    report.push(`  OK dist/ とソースの内容一致: ${checked} ファイル`);
  }
  if (notSource.length > 0) {
    errors.push(`  - dist/ にソースへ存在しないファイルがあります: ${notSource.join(", ")}`);
  }

  // 配信不要なものが dist に混ざっていないか（テスト用ページ・設計書など）
  const leak = distFiles.filter((rel) => /(^|\/)(test_.*\.html|app_overview\.md|memo\.txt|package(-lock)?\.json)$/.test(rel));
  if (leak.length > 0) {
    errors.push(`  - dist/ に配信不要なファイルが含まれています: ${leak.join(", ")}`);
  }
}

// --- 4. 結果出力 ---
console.log(report.join("\n"));
if (errors.length > 0) {
  console.error(`\n[FAIL] バージョン不一致 ${errors.length} 件:`);
  console.error(errors.join("\n"));
  console.error("\n上記ファイルのバージョン表記を揃えてから再実行してください。");
  process.exit(1);
}
console.log("\n[PASS] バージョン整合チェック完了: すべてのファイルで表記が一致しています。");
