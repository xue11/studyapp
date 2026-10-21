/**
 * バージョン単一ソース生成スクリプト (V2.9.14)
 *
 * package.json の "version" を単一情報源とし、
 * リリース時に関連ファイルのバージョン表記を一括生成する。
 *
 * 実行方法: npm run gen:version  (または node scripts/gen_version.js)
 *
 * 更新対象:
 *   - js/config.js       : APP_META.appVersion
 *   - sw.js              : CACHE_NAME
 *   - index.html         : <title>
 *   - js/schema.js       : appMeta.appVersion
 *   - js/migration.js    : currentAppVersion() フォールバック値
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const PKG = path.join(ROOT, "package.json");

// --- package.json の version を単一ソースとして読む ---
const pkg = JSON.parse(fs.readFileSync(PKG, "utf8"));
const pkgVersion = pkg.version; // 例: "2.9.13"
const appVersion = `V${pkgVersion}`; // 例: "V2.9.13"
const swCacheVersion = pkgVersion; // 例: "2.9.13" (Vなし)

if (!/^\d+\.\d+\.\d+$/.test(pkgVersion)) {
  console.error(`[FAIL] package.json の version が semve 形式ではありません: ${pkgVersion}`);
  process.exit(1);
}

let changed = 0;

function replaceFile(relPath, searchReplacements) {
  const abs = path.join(ROOT, relPath);
  if (!fs.existsSync(abs)) {
    console.log(`  -- スキップ (未存在): ${relPath}`);
    return;
  }
  let content = fs.readFileSync(abs, "utf8");
  let modified = false;
  for (const [name, { regex, replacement }] of Object.entries(searchReplacements)) {
    const newContent = content.replace(regex, replacement);
    if (newContent !== content) {
      content = newContent;
      modified = true;
      console.log(`  [UPDATE] ${relPath}: ${name}`);
    }
  }
  if (modified) {
    fs.writeFileSync(abs, content);
    changed++;
  }
}

// --- 1. js/config.js ---
replaceFile("js/config.js", {
  appVersion: {
    regex: /(appVersion:\s*")V[\d.]+(")/,
    replacement: `$1${appVersion}$2`
  }
});

// --- 2. sw.js ---
replaceFile("sw.js", {
  CACHE_NAME: {
    regex: /(const CACHE_NAME\s*=\s*')arith-study-v[\d.]+(-.*')/,
    replacement: `$1arith-study-v${swCacheVersion}$2`
  }
});

// --- 3. index.html ---
replaceFile("index.html", {
  title: {
    regex: /(<title>[^<]*\()V[\d.]+(\)<\/title>)/,
    replacement: `$1${appVersion}$2`
  }
});

// --- 4. js/schema.js ---
replaceFile("js/schema.js", {
  appMetaAppVersion: {
    regex: /(appVersion:\s*")V[\d.]+(")/,
    replacement: `$1${appVersion}$2`
  }
});

// --- 5. js/migration.js ---
replaceFile("js/migration.js", {
  fallbackVersion: {
    regex: /(return\s*")V[\d.]+(")/,
    replacement: `$1${appVersion}$2`
  }
});

console.log(`\n[gen:version] 単一ソース: package.json version = ${pkgVersion}`);
console.log(`[gen:version] 更新ファイル数: ${changed}`);
console.log("[gen:version] 次に npm run verify でテスト・ビルド・バージョンチェックを実行してください。");