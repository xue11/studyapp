/**
 * 【手動実行専用 / tools】word_problem テンプレへ story メタ情報を注入する過去の一括修正スクリプト。
 *
 * 注意: このスクリプトの正規表現は understandingCheck のネストを跨げないため、
 *       誤った位置にメタ情報を挿入する既知の問題がある（使用非推奨）。
 * 誤実行によるソース汚染を防ぐため、--apply を明示しない限り何もせず終了する。
 */
if (!process.argv.includes('--apply')) {
  console.error('[中止] このスクリプトは js/templates_math.js を書き換えます（既知の不具合あり・非推奨）。');
  console.error('       実行する場合は  node tools/inject_metadata.js --apply  と明示してください。');
  process.exit(1);
}

const fs = require('fs');
const path = require('path');
const TARGET = path.join(__dirname, '..', 'js', 'templates_math.js');
let content = fs.readFileSync(TARGET, 'utf8');

// We will use a regex to find each word problem and append story metadata.
const regex = /(templateId:\s*"([^"]+)",[\s\S]*?problemType:\s*"word_problem"[\s\S]*?understandingCheck:\s*\{[\s\S]*?\}\s*\n\s*\})/g;

content = content.replace(regex, (match, p1, id) => {
  if (match.includes("story:")) return match; // Already added

  let structureId = "general";
  let contextId = "general_context";
  let actionId = "general_action";

  if (id.includes("add")) { structureId = "addition"; actionId = "add"; }
  if (id.includes("sub") || id.includes("borrow")) { structureId = "subtraction"; actionId = "remove"; }
  if (id.includes("mul") || id.includes("kuku")) { structureId = "multiplication"; actionId = "multiply"; }
  if (id.includes("div")) { structureId = "division"; actionId = "divide"; }
  if (id.includes("frac")) { structureId = "fraction"; }
  if (id.includes("percent")) { structureId = "percentage"; }
  if (id.includes("ratio")) { structureId = "ratio"; }

  const metadata = `,\n    story: {
      structureId: "${structureId}",
      contextId: "c_${id}",
      entityId: "e_${id}",
      actionId: "${actionId}"
    },
    variationGroupId: "vg_${id}",
    similarityGroupId: "sg_${structureId}"`;

  return match.replace(/\}\s*$/, metadata + "\n  }");
});

fs.writeFileSync(TARGET, content, 'utf8');
console.log("Updated templates_math.js");

