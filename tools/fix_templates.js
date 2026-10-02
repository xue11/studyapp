/**
 * 【手動実行専用 / tools】js/templates_math.js の末尾登録コードを整形する過去の一括修正スクリプト。
 *
 * 誤実行によるソース汚染を防ぐため、--apply を明示しない限り何もせず終了する。
 * (tests/ 配下にあった頃、テスト一括実行に巻き込まれて templates_math.js を汚染した事故の再発防止)
 */
if (!process.argv.includes('--apply')) {
  console.error('[中止] このスクリプトは js/templates_math.js を書き換えます。');
  console.error('       実行する場合は  node tools/fix_templates.js --apply  と明示してください。');
  process.exit(1);
}

const fs = require('fs');
const path = require('path');
const TARGET = path.join(__dirname, '..', 'js', 'templates_math.js');
let txt = fs.readFileSync(TARGET, 'utf8');

txt = txt.replace(/if\s*\(typeof module[^]+$/, '');

const endCode = `
function registerAllMathTemplates() {
  const reg = typeof window !== "undefined" ? window.TemplateRegistry : require('./registries.js').TemplateRegistry;
  MATH_TEMPLATES.forEach(t => reg.register(t));
}

// 自動登録の実行
registerAllMathTemplates();

if (typeof module !== "undefined" && module.exports) {
  module.exports = { MATH_TEMPLATES, registerAllMathTemplates };
}
`;

fs.writeFileSync(TARGET, txt + endCode);

