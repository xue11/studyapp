/**
 * DateUtils — 日付キー操作の共通部品 (V2.9.7)
 *
 * 背景:
 * - 従来 `new Date().toISOString().split("T")[0]` (UTC基準) が19箇所に分散していた。
 *   日本時間(JST) 0〜9時に学習するとUTCでは「昨日」扱いになり、
 *   連続学習日数 (dailyStreak) がリセットされる等の不具合があった。
 * - 本モジュールは日本時間(JST)基準の YYYY-MM-DD を返す。
 *   サーバーを持たない本アプリの利用者は日本在住の小学生が前提のため、
 *   端末タイムゾーンに依存せずJST固定で判定する。
 *
 * 使い方:
 *   const today = DateUtils.localDateKey();           // 今日 (YYYY-MM-DD, JST)
 *   const tomorrow = DateUtils.addDays(today, 1);     // 日付加算 (JST日付ベース)
 */

// JST は UTC+9 (サマータイムなしのため固定オフセットで安全)
const JST_OFFSET_MS = 9 * 60 * 60 * 1000;

class DateUtils {
  /**
   * 日本時間(JST)の YYYY-MM-DD を返す
   * @param {Date} [d] 基準日時 (省略時は現在時刻)
   * @returns {string} YYYY-MM-DD
   */
  static localDateKey(d = null) {
    const t = (d instanceof Date ? d : new Date()).getTime() + JST_OFFSET_MS;
    const jst = new Date(t);
    const y = jst.getUTCFullYear();
    const m = String(jst.getUTCMonth() + 1).padStart(2, "0");
    const day = String(jst.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  /**
   * YYYY-MM-DD の日付キーを日数分ずらす (JST日付ベース)
   * カレンダー日付の加減算のためDSTの影響を受けない。
   * @param {string} dateKey (YYYY-MM-DD)
   * @param {number} offsetDays
   * @returns {string} (YYYY-MM-DD)
   */
  static addDays(dateKey, offsetDays) {
    const parts = String(dateKey || "").split("-").map(Number);
    if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) {
      // 不正な入力は今日の日付キーを返す（クラッシュ防止）
      return DateUtils.localDateKey();
    }
    // JST正午基準で計算し、UTC日付への逆変換誤差を防ぐ
    const t = Date.UTC(parts[0], parts[1] - 1, parts[2], 12, 0, 0, 0) - JST_OFFSET_MS + (offsetDays || 0) * 86400000;
    const jst = new Date(t + JST_OFFSET_MS);
    const y = jst.getUTCFullYear();
    const m = String(jst.getUTCMonth() + 1).padStart(2, "0");
    const day = String(jst.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  /**
   * 2つの日付キー (YYYY-MM-DD) の差を日数で返す
   * @param {string} fromKey
   * @param {string} toKey
   * @returns {number} toKey - fromKey の日数 (整数)
   */
  static diffDays(fromKey, toKey) {
    const fp = String(fromKey || "").split("-").map(Number);
    const tp = String(toKey || "").split("-").map(Number);
    if (fp.length !== 3 || tp.length !== 3) return 0;
    const f = Date.UTC(fp[0], fp[1] - 1, fp[2]);
    const t = Date.UTC(tp[0], tp[1] - 1, tp[2]);
    return Math.round((t - f) / 86400000);
  }

  /**
   * ISO日時文字列から日付部分 (YYYY-MM-DD) を取り出す
   * 保存済み completedAt ("2026-09-01T00:00:00Z" 等) との比較用。
   * ※ completedAt はUTCで保存されているため、厳密なJST変換ではなく
   * 　日付キーの前方一致で比較する（既存の slice(0,10) 互換）。
   * @param {string} isoString
   * @returns {string} YYYY-MM-DD (不正時は "")
   */
  static datePartOf(isoString) {
    if (typeof isoString !== "string" || isoString.length < 10) return "";
    return isoString.slice(0, 10);
  }
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { DateUtils };
} else {
  window.DateUtils = DateUtils;
}
