const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const sw = fs.readFileSync(path.join(root, "sw.js"), "utf8");
const index = fs.readFileSync(path.join(root, "index.html"), "utf8");
const firebase = JSON.parse(fs.readFileSync(path.join(root, "firebase.json"), "utf8"));
const overview = fs.readFileSync(path.join(root, "app_overview.md"), "utf8");

const cacheName = (sw.match(/const CACHE_NAME\s*=\s*'([^']+)'/) || [])[1];
assert.ok(cacheName, "Service Worker cache name must be defined");
assert.notStrictEqual(cacheName, "arith-study-v2.9.7-jst-history-cap", "Cache version must change to trigger an update");
assert.ok(cacheName.startsWith("arith-study-v2.9.7-"), "Cache version must remain aligned with the app version");
assert.ok(overview.includes(cacheName), "App overview must document the active cache name");

const installStart = sw.indexOf("self.addEventListener('install'");
const activateStart = sw.indexOf("self.addEventListener('activate'", installStart);
assert.ok(installStart >= 0 && activateStart > installStart, "Install and activate handlers must exist");
const installHandler = sw.slice(installStart, activateStart);
assert.ok(!installHandler.includes("self.skipWaiting()"), "New worker must wait for the user's update action");
assert.ok(sw.includes("e.data.type === 'SKIP_WAITING'"), "Waiting worker must support an explicit update action");
assert.ok(sw.includes("keys.filter(key => key !== CACHE_NAME)"), "Activation must remove stale caches");

assert.ok(index.includes("if (reg.waiting) showUpdateBar(reg.waiting)"), "Existing waiting workers must show the update banner");
assert.ok(index.includes("nw.state === 'installed' && navigator.serviceWorker.controller"), "Installed updates must show the banner");
assert.ok(index.includes("waiting.postMessage({ type: 'SKIP_WAITING' })"), "Update button must activate the waiting worker");
assert.ok(index.includes("document.addEventListener('visibilitychange'"), "Returning to the app must trigger an update check");
assert.ok(index.includes("function checkForUpdate()"), "PWA update checks must share one explicit implementation");

const htmlHeaders = firebase.hosting.headers.find(header => header.source === "**/*.html");
assert.ok(htmlHeaders, "Firebase Hosting must define HTML cache headers");
const htmlCacheControl = htmlHeaders.headers.find(header => header.key.toLowerCase() === "cache-control");
assert.ok(htmlCacheControl, "HTML cache-control header must be present");
assert.ok(/no-cache/.test(htmlCacheControl.value), "HTML must be revalidated so the newest update logic is loaded");
const rootHeaders = firebase.hosting.headers.find(header => header.source === "/");
assert.ok(rootHeaders, "Firebase Hosting must explicitly set cache headers for the app root");
const rootCacheControl = rootHeaders.headers.find(header => header.key.toLowerCase() === "cache-control");
assert.ok(rootCacheControl && /no-cache/.test(rootCacheControl.value), "The app root must be revalidated");
assert.ok(installHandler.includes("throw err"), "A failed precache must fail installation instead of succeeding partially");
assert.ok(sw.includes("console.error('[SW] フェッチ失敗:'") && sw.includes("throw err"), "Fetch failures must remain explicit");

console.log("[PASS] Service Worker cache version triggers a fresh installation");
console.log("[PASS] Updated worker waits until the user accepts the update");
console.log("[PASS] Update banner and button are wired to the waiting worker");
console.log("[PASS] Hosting revalidates HTML to avoid stale PWA update logic");
