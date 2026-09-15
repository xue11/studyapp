// 最小クラッシュ回帰チェック: 2年生学習開始時に「復習キューに別レベル/欠落unitが残っている」ケース
// 修正後でも t.templateId で落ちないこと、また欠落unitはスキップされることを確認する
globalThis.StorageManager = class { constructor() {} };

const { UnitRegistry, TemplateRegistry } = require("./js/registries.js");
const { UnitSelector } = require("./js/unit_selector.js");
const { AppUI } = require("./js/ui.js");
require("./js/templates_math.js");
require("./js/templates_units_p1.js");
require("./js/templates_units_p2.js");
const { RuleBasedQuestionSource } = require("./js/question_source.js");

const assert = require("assert");

const todayFix = "2026-09-15";
const mkProfile = (lv, queue) => ({
  skill: {
    subject: {
      currentGrade: 2,
      gradeProgress: {
        grade2: {
          difficultyLevel: lv,
          learningStartDate: "2026-08-01",
          unitStats: {},
          unitRotationBag: []
        }
      }
    }
  },
  reviewQueue: queue
});

const crossLevelQueue = [{
  reviewId: "rev_crash_check",
  subjectId: "math",
  grade: 2,
  unitId: "add_2digit_carry",
  conceptId: "add_2digit_carry",
  templateId: "g2_std_add_carry_01",
  failCount: 1,
  successCount: 0,
  intervalDays: 1,
  dueAt: "2026-09-14",
  registeredAt: "2026-09-10",
  status: "active"
}];

// 1) 2年生 Lv1 + 復習キューに Lv2所属 unit(add_2digit_carry) が期限切れで残っているケース
{
  const sel = UnitSelector.selectNextUnit(mkProfile(1, crossLevelQueue), undefined, todayFix);
  assert.strictEqual(sel.type, "review", "別レベルunitの復習が復習として選択されること");
  assert.strictEqual(sel.unitId, "add_2digit_carry");
  const templates = AppUI.prototype._getTemplatesForSelection.call(
    { _shuffleArray: (arr) => [...arr].sort(() => Math.random() - 0.5) },
    TemplateRegistry,
    2,
    1,
    sel
  );
  assert.ok(templates.length > 0, "テンプレートが取得できること");
  const t = templates[Math.floor(Math.random() * templates.length)];
  assert.ok(t && typeof t.templateId === "string", "t.templateId で落ちず templateId が取得できること");
  const q = RuleBasedQuestionSource.generateQuestion(t.templateId, []);
  assert.ok(q && typeof q.questionText === "string" && typeof q.templateId === "string",
    "選択されたテンプレートで問題が生成できること");
  console.log("[PASS] 再現回避: 2年生 Lv1 + 別レベル復習unit で学習開始相当の処理がクラッシュしない");
}

// 2) 復習キューに欠落unit(nonexistent_unit_y) が残っているケースではスキップされること
{
  const deadQueue = [Object.assign({}, crossLevelQueue[0], {
    unitId: "nonexistent_unit_y",
    templateId: ""
  })];
  const selDead = UnitSelector.selectNextUnit(mkProfile(1, deadQueue), undefined, todayFix);
  assert.notStrictEqual(selDead.unitId, "nonexistent_unit_y",
    "欠落unitの復習はスキップされること");
  assert.notStrictEqual(selDead.phase, "review",
    "スキップ後は通常学習として選択されること");
  console.log("[PASS] スキップ: 欠落unitを含む復習キューでも学習開始が継続できること");
}

console.log("\nCRASH REGRESSION CHECK PASSED");
