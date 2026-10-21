/**
 * V2.9.x PWA / Service Worker 動作検証テスト (強化版)
 *
 * 対象: sw.js, index.html, firebase.json
 *
 * 背景:
 * - 既存の test_service_worker_update.js は静的解析のみ。
 * - PWA としてのオフライン動作・キャッシュ更新・新版反映を
 *   より包括的に検証するため、追加の検証項目を追加する。
 *
 * 実行方法: node tests/test_service_worker_dynamic.js
 */

const assert = require("assert");
const fs = require("fs");
const path = require("path");

let passCount = 0;
function check(label, cond) {
  assert.ok(cond, "FAIL: " + label);
  passCount += 1;
  console.log("  [PASS] " + label);
}

const root = path.resolve(__dirname, "..");
const sw = fs.readFileSync(path.join(root, "sw.js"), "utf8");
const index = fs.readFileSync(path.join(root, "index.html"), "utf8");
const firebase = JSON.parse(fs.readFileSync(path.join(root, "firebase.json"), "utf8"));

// ---------------------------------------------------------------
console.log("1. Service Worker キャッシュ名とバージョン整合");
// ---------------------------------------------------------------
{
  const cacheName = (sw.match(/const CACHE_NAME\s*=\s*'([^']+)'/) || [])[1];
  check("CACHE_NAME が定義されている", !!cacheName);
  check("CACHE_NAME が arith-study-v プレフィクスを含む", cacheName.startsWith("arith-study-v"));
  check("CACHE_NAME が現行バージョン (2.9.15) を含む", cacheName.includes("2.9.15"));
  check("古いキャッシュ名 (v2.9.7) とは異なる", cacheName !== "arith-study-v2.9.7-math-quality-pwa-fix");
}

// ---------------------------------------------------------------
console.log("2. urlsToCache に必須リソースがすべて含まれている");
// ---------------------------------------------------------------
{
  const urlsMatch = sw.match(/const urlsToCache\s*=\s*\[([\s\S]*?)\];/);
  assert.ok(urlsMatch, "urlsToCache 配列が抽出できる");
  const urlsContent = urlsMatch[1];
  const requiredUrls = [
    "/", "/index.html", "/css/app.css", "/manifest.json",
    "/js/config.js", "/js/storage.js", "/js/session_coordinator.js",
    "/js/learning_engine.js", "/js/review_engine.js", "/js/unit_selector.js",
    "/icon-192.png", "/icon-512.png"
  ];
  for (const url of requiredUrls) {
    check(`urlsToCache に ${url} が含まれている`, urlsContent.includes(`'${url}'`));
  }
  const urlCount = (urlsContent.match(/'\/[^']+'/g) || []).length;
  check("キャッシュ対象 URL が 20 件以上", urlCount >= 20);
}

// ---------------------------------------------------------------
console.log("3. Service Worker イベントハンドラ");
// ---------------------------------------------------------------
{
  check("install イベントハンドラが存在する", sw.includes("self.addEventListener('install'"));
  check("activate イベントハンドラが存在する", sw.includes("self.addEventListener('activate'"));
  check("fetch イベントハンドラが存在する", sw.includes("self.addEventListener('fetch'"));
  check("message イベントハンドラが存在する", sw.includes("self.addEventListener('message'"));

  const installStart = sw.indexOf("self.addEventListener('install'");
  const activateStart = sw.indexOf("self.addEventListener('activate'", installStart);
  const installHandler = sw.slice(installStart, activateStart);

  check("install ハンドラ内で skipWaiting() を呼ばない", !installHandler.includes("self.skipWaiting()"));
  check("message ハンドラで SKIP_WAITING を処理する", sw.includes("e.data.type === 'SKIP_WAITING'"));
}

// ---------------------------------------------------------------
console.log("4. キャッシュ更新と古いキャッシュ削除");
// ---------------------------------------------------------------
{
  check("activate で古いキャッシュを削除する", sw.includes("keys.filter(key => key !== CACHE_NAME)"));
  check("activate で caches.delete を呼ぶ", sw.includes("caches.delete(key)"));
  check("activate で clients.claim() を呼ぶ", sw.includes("self.clients.claim()"));
  check("install で caches.open(CACHE_NAME) を呼ぶ", sw.includes("caches.open(CACHE_NAME)"));
  check("install で cache.addAll(urlsToCache) を呼ぶ", sw.includes("cache.addAll(urlsToCache)"));
}

// ---------------------------------------------------------------
console.log("5. インストール失敗時のハンドリング (原子的インストール)");
// ---------------------------------------------------------------
{
  const installStart = sw.indexOf("self.addEventListener('install'");
  const activateStart = sw.indexOf("self.addEventListener('activate'", installStart);
  const installHandler = sw.slice(installStart, activateStart);

  check("install 失敗時に throw err する (不完全インストールを防ぐ)", installHandler.includes("throw err"));
  check("install 失敗時に console.error を出力する", installHandler.includes("console.error"));
}

// ---------------------------------------------------------------
console.log("6. fetch ハンドラのキャッシュ優先ロジック");
// ---------------------------------------------------------------
{
  const fetchStart = sw.indexOf("self.addEventListener('fetch'");
  const messageStart = sw.indexOf("self.addEventListener('message'", fetchStart);
  const fetchHandler = sw.slice(fetchStart, messageStart > fetchStart ? messageStart : sw.length);

  check("fetch で caches.match を使う", fetchHandler.includes("caches.match(e.request)"));
  check("fetch で fetch(e.request) にフォールバックする", fetchHandler.includes("fetch(e.request)"));
}

// ---------------------------------------------------------------
console.log("7. index.html の更新通知 UI と Service Worker 登録");
// ---------------------------------------------------------------
{
  check("index.html で Service Worker を登録する", index.includes("navigator.serviceWorker.register"));
  check("index.html で waiting ワーカーを検出する", index.includes("reg.waiting"));
  check("index.html で更新バーを表示する", index.includes("showUpdateBar"));
  check("index.html で SKIP_WAITING メッセージを送信する", index.includes("waiting.postMessage({ type: 'SKIP_WAITING' }"));
  check("index.html で visibilitychange イベントを監視する", index.includes("document.addEventListener('visibilitychange'"));
  check("index.html で checkForUpdate 関数を定義する", index.includes("function checkForUpdate()"));
}

// ---------------------------------------------------------------
console.log("8. Firebase Hosting キャッシュヘッダー");
// ---------------------------------------------------------------
{
  const headers = firebase.hosting.headers || [];
  const htmlHeader = headers.find(h => h.source === "**/*.html");
  const rootHeader = headers.find(h => h.source === "/");
  const swHeader = headers.find(h => h.source === "**/sw.js");

  check("HTML にキャッシュヘッダーが設定されている", !!htmlHeader);
  if (htmlHeader) {
    const cc = htmlHeader.headers.find(h => h.key.toLowerCase() === "cache-control");
    check("HTML の Cache-Control に no-cache を含む", cc && /no-cache/.test(cc.value));
  }
  check("ルートにキャッシュヘッダーが設定されている", !!rootHeader);
  if (rootHeader) {
    const cc = rootHeader.headers.find(h => h.key.toLowerCase() === "cache-control");
    check("ルートの Cache-Control に no-cache を含む", cc && /no-cache/.test(cc.value));
  }
  check("sw.js にキャッシュヘッダーが設定されている", !!swHeader);
  if (swHeader) {
    const cc = swHeader.headers.find(h => h.key.toLowerCase() === "cache-control");
    check("sw.js の Cache-Control に no-cache を含む", cc && /no-cache/.test(cc.value));
  }
}

// ---------------------------------------------------------------
console.log("\n==========================================");
console.log(`Service Worker dynamic tests: ${passCount} assertions passed.`);
console.log("==========================================");