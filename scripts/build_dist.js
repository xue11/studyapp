/**
 * dist/ ビルドスクリプト (V2.9.5)
 *
 * Firebase Hosting が配信する dist/ を、ソースから一括生成する。
 * 手作業コピーによる同期漏れ（V2.9.4 で dist/js/hissan_svg.js が旧版のまま配信されていた事故）
 * を防ぐのが目的。ビルド後は `npm run check:version` が dist とソースの一致を検証する。
 *
 * 実行方法: npm run build   (または node scripts/build_dist.js)
 *
 * 配信対象:
 *   index.html / sw.js / manifest.json / icon-192.png / icon-512.png
 *   css/  js/  配下の全ファイル
 * 配信しない:
 *   app_overview.md（設計書）, test_*.html（動作確認用ページ）,
 *   tests/ tools/ scripts/ package*.json, memo.txt, 配布用 zip など
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const DIST = path.join(ROOT, "dist");

/** dist 直下に配置するファイル */
const ROOT_FILES = ["index.html", "sw.js", "manifest.json", "icon-192.png", "icon-512.png"];

/** 中身をコピーするディレクトリ */
const DIRS = ["css", "js"];

/**
 * コピー対象外のファイル名パターン。
 * 将来 test_*.html がサブディレクトリに増えても配信されないようにする。
 */
const EXCLUDE_RE = /^(test_.*\.html|app_overview\.md|memo\.txt|package\.json|package-lock\.json)$/;

function ensureEmptyDir(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
}

function copyFile(relPath) {
  const src = path.join(ROOT, relPath);
  const dest = path.join(DIST, relPath);
  if (!fs.existsSync(src)) {
    throw new Error("配信対象のファイルが見つかりません: " + relPath);
  }
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
  return fs.statSync(dest).size;
}

function copyDir(relDir) {
  const absSrc = path.join(ROOT, relDir);
  if (!fs.existsSync(absSrc)) throw new Error("配信対象のディレクトリが見つかりません: " + relDir);

  let count = 0;
  for (const entry of fs.readdirSync(absSrc, { withFileTypes: true })) {
    const rel = path.posix.join(relDir, entry.name);
    if (EXCLUDE_RE.test(entry.name)) continue;
    if (entry.isDirectory()) {
      count += copyDir(rel);
    } else {
      copyFile(rel);
      count++;
    }
  }
  return count;
}

function main() {
  ensureEmptyDir(DIST);

  let fileCount = 0;
  let totalBytes = 0;

  for (const rel of ROOT_FILES) {
    totalBytes += copyFile(rel);
    fileCount++;
  }
  for (const dir of DIRS) {
    fileCount += copyDir(dir);
  }

  console.log("[build] dist/ を再生成しました");
  console.log("  ファイル数: " + fileCount);
  console.log("  合計サイズ: " + totalBytes + " bytes");
  console.log("  出力先: " + DIST);
  console.log("  ※ 検証は npm run check:version（dist とソースの一致確認つき）");
}

main();
