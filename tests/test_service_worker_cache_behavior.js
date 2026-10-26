const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const source = fs.readFileSync(path.join(__dirname, "..", "sw.js"), "utf8");
const listeners = {};
const entries = new Map();
const logs = [];
const cacheKey = request => request.url;
const caches = {
  async match(request) {
    return entries.get(cacheKey(request)) || null;
  },
  async open() {
    return {
      async put(request, response) {
        entries.set(cacheKey(request), response);
      }
    };
  }
};
const self = {
  location: { origin: "https://app.example" },
  addEventListener(type, listener) {
    listeners[type] = listener;
  },
  clients: { claim: async () => {} }
};

let fetchHandler = async () => {
  throw new Error("Unexpected network request");
};
vm.runInNewContext(source, {
  self,
  caches,
  URL,
  fetch: (...args) => fetchHandler(...args),
  console: {
    error(...args) { logs.push(args); },
    log() {}
  }
});

async function request(url, mode) {
  const event = {
    request: { url, method: "GET", mode },
    respondWith(response) { this.response = response; }
  };
  listeners.fetch(event);
  return event.response;
}

function response(body) {
  return { ok: true, body, clone() { return this; } };
}

(async () => {
  let fetchOptions = null;
  const latestCss = response("new-css");
  fetchHandler = async (req, options) => {
    fetchOptions = options;
    return latestCss;
  };

  const cssResponse = await request("https://app.example/css/app.css", "no-cors");
  assert.strictEqual(cssResponse.body, "new-css");
  assert.strictEqual(fetchOptions.cache, "no-store");
  assert.strictEqual(entries.get("https://app.example/css/app.css").body, "new-css",
    "network CSS must replace the cached stylesheet");

  const latestHtml = response("new-html");
  fetchHandler = async (req, options) => {
    fetchOptions = options;
    return latestHtml;
  };
  const htmlResponse = await request("https://app.example/", "navigate");
  assert.strictEqual(htmlResponse.body, "new-html");
  assert.strictEqual(fetchOptions.cache, "no-store");
  assert.strictEqual(entries.get("https://app.example/").body, "new-html",
    "network navigation must refresh the cached document");

  entries.set("https://app.example/css/app.css", response("offline-css"));
  fetchHandler = async () => { throw new Error("offline"); };
  const offlineCss = await request("https://app.example/css/app.css", "no-cors");
  assert.strictEqual(offlineCss.body, "offline-css",
    "cached CSS must be used when the network is unavailable");

  entries.set("https://app.example/js/app.js", response("cached-js"));
  let unexpectedFetch = false;
  fetchHandler = async () => {
    unexpectedFetch = true;
    throw new Error("Cache-first asset should not reach network");
  };
  const cachedJs = await request("https://app.example/js/app.js", "no-cors");
  assert.strictEqual(cachedJs.body, "cached-js");
  assert.strictEqual(unexpectedFetch, false, "other static assets remain cache-first");

  console.log("[PASS] HTML / CSS use fresh network responses and update the cache");
  console.log("[PASS] Offline HTML / CSS can fall back to cached responses");
  console.log("[PASS] Other static assets retain cache-first behavior");
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
