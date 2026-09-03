const fs = require('fs');
let txt = fs.readFileSync('js/templates_math.js', 'utf8');

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

fs.writeFileSync('js/templates_math.js', txt + endCode);

