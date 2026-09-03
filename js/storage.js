// Node.js 環境での依存解決
let schemaModule = typeof window !== "undefined" ? window : {};
let migrationModule = typeof window !== "undefined" ? window : {};

if (typeof require !== "undefined") {
  try {
    schemaModule = require("./schema.js");
  } catch (e) {}
  try {
    migrationModule = require("./migration.js");
  } catch (e) {}
}

const getCreateInitialAppState = () => typeof createInitialAppState !== "undefined" ? createInitialAppState : schemaModule.createInitialAppState;
const getValidateAppState = () => typeof validateAppState !== "undefined" ? validateAppState : schemaModule.validateAppState;
const getMigrateAppState = () => typeof migrateAppState !== "undefined" ? migrateAppState : migrationModule.migrateAppState;

const STORAGE_KEY = "math_study_app_v2510_state";

class StorageManager {
  constructor(storage = null) {
    // ブラウザの localStorage またはモック/カスタムストレージ
    this.storage = storage || (typeof window !== "undefined" && window.localStorage ? window.localStorage : new MemoryStorage());
  }

  /**
   * 状態を検証して安全に localStorage へ保存する
   * (第34.1章: 保存失敗時は完了確定扱いにせず、中間状態を保存しない)
   */
  saveState(state) {
    try {
      // 1. スキーマ整合性検証
      const validation = getValidateAppState()(state);
      if (!validation.valid) {
        console.error("StorageManager.saveState validation failed:", validation.error);
        return { success: false, error: validation.error };
      }

      // 2. 単一のJSON文字列として原子的に保存
      const serialized = JSON.stringify(state);
      this.storage.setItem(STORAGE_KEY, serialized);
      return { success: true };
    } catch (err) {
      console.error("StorageManager.saveState error (e.g. QuotaExceeded):", err);
      return { success: false, error: err.message || "LocalStorage write error" };
    }
  }

  /**
   * localStorage から状態を読み込み、マイグレーションと検証を行う
   */
  loadState() {
    try {
      const raw = this.storage.getItem(STORAGE_KEY);
      if (!raw) {
        // 初期状態を生成して保存
        const initial = getCreateInitialAppState()();
        this.saveState(initial);
        return { success: true, state: initial, isNew: true };
      }

      // JSON パース
      let parsed = JSON.parse(raw);

      // マイグレーション実行
      parsed = getMigrateAppState()(parsed);

      // 整合性検証
      const validation = getValidateAppState()(parsed);
      if (!validation.valid) {
        console.warn("StorageManager.loadState validation failed on existing data. Falling back to fresh state.", validation.error);
        const fallback = getCreateInitialAppState()();
        return { success: false, state: fallback, error: validation.error };
      }

      return { success: true, state: parsed, isNew: false };
    } catch (err) {
      console.error("StorageManager.loadState parse error. Returning initial state.", err);
      const fallback = getCreateInitialAppState()();
      return { success: false, state: fallback, error: "Corrupted state JSON" };
    }
  }

  /**
   * JSON文字列としてエクスポート
   */
  exportStateJSON(state) {
    const targetState = state || this.loadState().state;
    return JSON.stringify(targetState, null, 2);
  }

  /**
   * JSONインポート（第38.23章の厳格な順序で処理）
   * 1. JSON parse
   * 2. schemaVersion確認
   * 3. 構造Validator
   * 4. Migration
   * 5. 整合性Validator
   * 6. 保存
   */
  importStateJSON(jsonString) {
    try {
      // 1. JSON parse
      if (!jsonString || typeof jsonString !== "string") {
        return { success: false, error: "Invalid JSON input: empty or not a string." };
      }
      let parsed = JSON.parse(jsonString);

      // 2 & 3. 構造基本確認
      if (!parsed || typeof parsed !== "object") {
        return { success: false, error: "Invalid JSON structure: root must be an object." };
      }

      // 4. Migration
      parsed = getMigrateAppState()(parsed);

      // 5. 整合性Validator
      const validation = getValidateAppState()(parsed);
      if (!validation.valid) {
        return { success: false, error: `Validation failed: ${validation.error}` };
      }

      // 6. 保存
      const saveRes = this.saveState(parsed);
      if (!saveRes.success) {
        return { success: false, error: `Failed to persist imported state: ${saveRes.error}` };
      }

      return { success: true, state: parsed };
    } catch (err) {
      return { success: false, error: `Import failed: ${err.message}` };
    }
  }

  clear() {
    this.storage.removeItem(STORAGE_KEY);
  }
}

/**
 * Node.js やテスト用のインメモリストレージ
 */
class MemoryStorage {
  constructor() {
    this.store = {};
  }
  getItem(key) {
    return Object.prototype.hasOwnProperty.call(this.store, key) ? this.store[key] : null;
  }
  setItem(key, value) {
    this.store[key] = String(value);
  }
  removeItem(key) {
    delete this.store[key];
  }
  clear() {
    this.store = {};
  }
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    STORAGE_KEY,
    StorageManager,
    MemoryStorage
  };
} else {
  window.STORAGE_KEY = STORAGE_KEY;
  window.StorageManager = StorageManager;
  window.MemoryStorage = MemoryStorage;
}
