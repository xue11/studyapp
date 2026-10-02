/**
 * テスト一括実行スクリプト (V2.9.5)
 *
 * tests/test_*.js だけを実行する。
 * tests/ には過去に「ソースを書き換える補助スクリプト」(fix_templates.js / inject_metadata.js) が
 * 混在しており、tests/*.js を無差別に実行すると js/templates_math.js が汚染される事故が起きた。
 * そのため実行対象を test_*.js に限定し、tools/ 配下の補助スクリプトは絶対に実行しない。
 *
 * 実行方法: npm test
 *
 * 空のテストファイル（実質ノーアサーション＝常に成功）も失敗として扱う。
 */

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const TESTS_DIR = path.join(ROOT, "tests");

const files = fs
  .readdirSync(TESTS_DIR)
  .filter((f) => /^test_.*\.js$/.test(f))
  .sort();

if (files.length === 0) {
  console.error("[FAIL] tests/test_*.js が見つかりません。");
  process.exit(1);
}

const results = [];

for (const file of files) {
  const abs = path.join(TESTS_DIR, file);
  const size = fs.statSync(abs).size;
  if (size === 0) {
    results.push({ file, ok: false, note: "0バイト（アサーションなし）" });
    console.log("[FAIL] " + file + "  (0バイト)");
    continue;
  }

  const res = spawnSync(process.execPath, [abs], { cwd: ROOT, encoding: "utf8" });
  const ok = res.status === 0;
  results.push({ file, ok, note: ok ? "" : "exit=" + res.status });
  console.log((ok ? "[PASS] " : "[FAIL] ") + file + (ok ? "" : "  (exit " + res.status + ")"));

  if (!ok) {
    // 失敗時のみ詳細を出す（全体ログは長いため）
    const out = ((res.stdout || "") + (res.stderr || "")).trim();
    const lines = out.split(/\r?\n/).filter((l) => !/^\s*$/.test(l));
    console.log(lines.slice(-25).map((l) => "    | " + l).join("\n"));
  }
}

const failed = results.filter((r) => !r.ok);
console.log("");
console.log("=========================================");
console.log(" 実行: " + results.length + " ファイル / 失敗: " + failed.length);
if (failed.length > 0) {
  failed.forEach((f) => console.log("  - " + f.file + " " + f.note));
  console.log("=========================================");
  process.exit(1);
}
console.log(" 全テスト PASS");
console.log("=========================================");
