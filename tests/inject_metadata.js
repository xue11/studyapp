const fs = require('fs');
let content = fs.readFileSync('js/templates_math.js', 'utf8');

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

fs.writeFileSync('js/templates_math.js', content, 'utf8');
console.log("Updated templates_math.js");

