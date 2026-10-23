/**
 * Regression tests for theme settings and legacy migration.
 *
 * Run with: node tests/test_dark_mode_v2914.js
 */

const assert = require("assert");
const { migrateAppState } = require("../js/migration.js");

const rootAttributes = {};
const themeMeta = {
  content: "",
  setAttribute(name, value) {
    if (name === "content") this.content = value;
  }
};
const mediaListeners = [];
const colorScheme = {
  matches: false,
  addEventListener(event, listener) {
    if (event === "change") mediaListeners.push(listener);
  }
};

global.window = global;
global.document = {
  documentElement: {
    setAttribute(name, value) { rootAttributes[name] = value; },
    getAttribute(name) { return rootAttributes[name] || null; }
  },
  querySelector(selector) {
    return selector === 'meta[name="theme-color"]' ? themeMeta : null;
  },
  getElementById() { return null; },
  createElement() { return { style: {}, classList: { add() {}, remove() {} } }; },
  addEventListener() {},
  querySelectorAll() { return []; }
};
global.matchMedia = () => colorScheme;
global.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
global.scrollTo = () => {};
global.Sound = {
  playClick() {}, playCorrect() {}, playIncorrect() {},
  playHint() {}, playFanfare() {}, playWrong() {}
};
global.StorageManager = class {
  loadState() { return { state: null, isNew: true }; }
  saveState() { return { success: true }; }
};

require("../js/config.js");
const { AppUI } = require("../js/ui.js");

function profile(settings) {
  return {
    identity: { id: "p1", nickname: "T", name: "T", character: "cat" },
    points: { total: 0 },
    skill: { subject: { currentGrade: 1, gradeProgress: { grade1: { difficultyLevel: 1 } } } },
    settings: settings || {},
    stats: {}
  };
}

function createUI(settings) {
  const ui = new AppUI();
  ui.state = { profiles: [profile(settings)], activeProfileId: "p1" };
  return ui;
}

console.log("1. _applyTheme() applies actual theme settings and OS preference");
{
  const ui = createUI();
  ui._applyTheme();
  assert.strictEqual(rootAttributes["data-theme"], "system", "missing theme defaults to system");
  assert.strictEqual(themeMeta.content, "#4a90d9", "system light uses light browser theme color");

  colorScheme.matches = true;
  mediaListeners[0]();
  assert.strictEqual(themeMeta.content, "#0f172a", "OS dark preference updates browser theme color");

  ui.getActiveProfile().settings.theme = "light";
  ui._applyTheme();
  assert.strictEqual(rootAttributes["data-theme"], "light");
  assert.strictEqual(themeMeta.content, "#4a90d9");

  ui.getActiveProfile().settings.theme = "dark";
  ui._applyTheme();
  assert.strictEqual(rootAttributes["data-theme"], "dark");
  assert.strictEqual(themeMeta.content, "#0f172a");
  colorScheme.matches = false;
}

console.log("2. setTheme() persists and applies themes");
{
  const ui = createUI({ darkMode: "auto" });
  let savedState = null;
  let navigatedTo = null;
  ui.storage = { saveState(state) { savedState = state; return { success: true }; } };
  ui.navigate = screen => { navigatedTo = screen; };

  ui.setTheme("dark");
  assert.strictEqual(ui.getActiveProfile().settings.theme, "dark");
  assert.strictEqual(ui.getActiveProfile().settings.darkMode, undefined);
  assert.strictEqual(savedState, ui.state);
  assert.strictEqual(rootAttributes["data-theme"], "dark");
  assert.strictEqual(navigatedTo, "settings");

  ui.setDarkMode("auto");
  assert.strictEqual(ui.getActiveProfile().settings.theme, "system", "legacy alias maps auto to system");
}

console.log("3. Migration normalizes old and invalid theme settings");
{
  const cases = [
    [{ darkMode: "auto" }, "system"],
    [{ darkMode: "light" }, "light"],
    [{ darkMode: "dark" }, "dark"],
    [{ theme: "auto" }, "system"],
    [{ theme: "default", darkMode: "dark" }, "dark"],
    [{ theme: "invalid", darkMode: "invalid" }, "system"]
  ];
  for (const [settings, expected] of cases) {
    const migrated = migrateAppState({
      schemaVersion: "2.5.6",
      profiles: [profile(settings)],
      activeProfileId: "p1"
    });
    assert.strictEqual(migrated.profiles[0].settings.theme, expected);
    assert.strictEqual(migrated.profiles[0].settings.darkMode, undefined);
  }
}

console.log("4. Invalid theme values are rejected");
{
  const ui = createUI();
  assert.throws(() => ui.setTheme("sepia"), /Invalid theme/);
  ui.state.profiles = [];
  assert.doesNotThrow(() => ui.setTheme("dark"));
}

console.log("  All theme regression assertions passed.");
