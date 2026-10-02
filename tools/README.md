/**
 * 開発用ツール（手動実行専用）
 *
 * tools/ 配下のスクリプトは js/ を直接書き換えるものがある。
 * tests/ に置くと `node tests/*.js` のような一括実行で誤ってソースを汚染するため、
 * ここへ退避した。実行は必ず明示的に `node tools/<name>.js` で行うこと。
 *
 * - fix_templates.js   : templates_math.js の末尾の登録コードを整形（過去の一括修正用）
 * - inject_metadata.js : word_problem テンプレへ story メタを注入（過去の一括修正用）
 * - verify_diversity.js: 多様性ロジックの確認（読み取りのみ・ソース不変）
 */
