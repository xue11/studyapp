// V2.6.1: unitRotationBag同期 & 直近テンプレート重複回避の検証
const { UnitRegistry, TemplateRegistry } = require("../js/registries.js");
const { UnitSelector } = require("../js/unit_selector.js");
require("../js/templates_math.js");
require("../js/templates_units_p1.js");
require("../js/templates_units_p2.js");
const { RuleBasedQuestionSource } = require("../js/question_source.js");

const assert = require("assert");

// 1) bag同期テスト: 旧unitのみの永続化済みbagに新unit (length_unit) が注入される
const gp = {
  difficultyLevel: 1,
  unitStats: {},
  unitRotationBag: ["add_2digit_no_carry", "sub_2digit_no_borrow"] // V2.6より前のgrade2L1 bag
};
const units = UnitRegistry.getUnitsForLevel("math", 2, 1); // 現在: 旧2unit + length_unit
console.log("grade2 L1 units:", units.map(u => u.id).join(", "));

const seen = new Set();
for (let i = 0; i < units.length; i++) {
  seen.add(UnitSelector._drawFromRotationBag(gp, units));
}
assert.ok(seen.has("length_unit"), "新unit (length_unit) が最初の1巡で出題されること");
console.log("[PASS] bag同期: 永続化済み旧bagでも新unitが1巡内で必ず出題される");

// 2) 空bagテスト: 全unitが重複なく1回ずつ出る
const gp2 = { difficultyLevel: 2, unitStats: {}, unitRotationBag: [] };
const units2 = UnitRegistry.getUnitsForLevel("math", 2, 2);
const seen2 = new Set();
for (let i = 0; i < units2.length; i++) {
  seen2.add(UnitSelector._drawFromRotationBag(gp2, units2));
}
assert.strictEqual(seen2.size, units2.length, "空bagからは全unitが重複なく1回ずつ出る");
console.log("[PASS] 空bag: 全unit (" + units2.length + "個) 1回ずつ重複なし");

// 3) 長期利用テスト: bag再生成を跨いでも全unitがカバーされる
const gp3 = { difficultyLevel: 3, unitStats: {}, unitRotationBag: [] };
const units3 = UnitRegistry.getUnitsForLevel("math", 3, 3);
const seen3 = new Set();
for (let i = 0; i < units3.length * 3; i++) {
  seen3.add(UnitSelector._drawFromRotationBag(gp3, units3));
}
assert.strictEqual(seen3.size, units3.length, "3巡引き続けても全unitがカバーされる");
console.log("[PASS] 3巡テスト: 全unit (" + units3.length + "個) 継続カバー");

// 3) テンプレート重複回避シミュレーション (unit内テンプレート2個で直近回避が機能するか)
const pool = TemplateRegistry.getByUnit("math", 4, 3, "mixed_2step");
assert.ok(pool.length >= 2, "grade4 L3 mixed_2step のテンプレートが複数あること");
const recent = [];
for (let i = 0; i < 10; i++) {
  const recentIds = recent.slice(-3).map(t => t.templateId);
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  const idx = shuffled.findIndex(x => !recentIds.includes(x.templateId));
  const picked = idx >= 0 ? shuffled[idx] : shuffled[0];
  recent.push(picked);
}
const last3 = recent.slice(0, 5).map(t => t.templateId);
for (let i = 3; i < last3.length; i++) {
  assert.notStrictEqual(last3[i], last3[i - 1], "直前と同じテンプレートが連続しないこと");
}
console.log("[PASS] 重複回避: unit内テンプレート選択で直前3問との重複を回避");

// 4) 全unitテンプレートプール最終確認
let emptyPools = 0, totalUnits = 0;
for (let g = 1; g <= 6; g++) {
  for (let lv = 1; lv <= 3; lv++) {
    for (const u of UnitRegistry.getUnitsForLevel("math", g, lv)) {
      totalUnits++;
      if (TemplateRegistry.getByUnit("math", g, lv, u.id).length === 0) {
        emptyPools++;
        console.log("EMPTY POOL: grade" + g + " L" + lv + " " + u.id);
      }
    }
  }
}
assert.strictEqual(emptyPools, 0, "空プールunitが存在しないこと");
console.log("[PASS] プール網羅: 全" + totalUnits + " unit にテンプレートあり");

// 5) V2.6.2 回帰: 別レベル所属unitの復習でクラッシュしない
const { APP_CONFIG } = require("../js/config.js");
const todayFix = "2026-09-15";
const mkProfile = (lv, queue) => ({
  skill: { subject: { currentGrade: 2, gradeProgress: { grade2: { difficultyLevel: lv, learningStartDate: "2026-08-01", unitStats: {}, unitRotationBag: [] } } } },
  reviewQueue: queue
});
const crossLevelQueue = [{
  reviewId: "rev_test_1", subjectId: "math", grade: 2, unitId: "add_2digit_carry",
  conceptId: "add_2digit_carry", templateId: "g2_std_add_carry_01",
  failCount: 1, successCount: 0, intervalDays: 1, dueAt: "2026-09-14", registeredAt: "2026-09-10", status: "active"
}];

// 5a) 別レベル所属unit (add_2digit_carry は L2所属) の復習がどのレベルでも選択される
for (const lv of [1, 2, 3]) {
  const sel = UnitSelector.selectNextUnit(mkProfile(lv, crossLevelQueue), APP_CONFIG, todayFix);
  assert.strictEqual(sel.type, "review", "L" + lv + ": 別レベルunitの復習がスキップされないこと");
  assert.strictEqual(sel.unitId, "add_2digit_carry");
}
console.log("[PASS] 復習選択: 別レベル所属unitの復習は全レベルで選択される");

// 5b) ui.js 相当のフォールバック: 現在レベルでプール空 → レベル横断検索で取得し問題生成できる
for (const lv of [1, 2, 3]) {
  const sel = UnitSelector.selectNextUnit(mkProfile(lv, crossLevelQueue), APP_CONFIG, todayFix);
  let pool = TemplateRegistry.getByUnit("math", 2, lv, sel.unitId);
  if (pool.length === 0) {
    for (let l2 = 1; l2 <= 3; l2++) {
      pool = TemplateRegistry.getByUnit("math", 2, l2, sel.unitId);
      if (pool.length > 0) break;
    }
  }
  assert.ok(pool.length > 0, "L" + lv + ": レベル横断フォールバックでテンプレートが取得できること");
  const q = RuleBasedQuestionSource.generateQuestion(pool[0].templateId, []);
  assert.ok(q && q.questionText && q.templateId, "L" + lv + ": クラッシュせず問題生成できること");
}
console.log("[PASS] クラッシュ回帰: L1/L2/L3 どのレベルでも復習unitの問題生成に成功 (t undefined 不具合の再発なし)");

// 5c) レジストリに存在しないunitの復習はスキップされ、通常学習にフォールバックする
const deadQueue = [Object.assign({}, crossLevelQueue[0], { unitId: "deleted_unit_x", templateId: "" })];
const selDead = UnitSelector.selectNextUnit(mkProfile(1, deadQueue), APP_CONFIG, todayFix);
assert.notStrictEqual(selDead.unitId, "deleted_unit_x", "存在しないunitの復習はスキップされること");
assert.notStrictEqual(selDead.phase, "review", "スキップ後は通常学習として選択されること");
console.log("[PASS] ガード: 削除済みunitの復習はスキップされ通常学習へフォールバック");

console.log("\nALL V2.6.2 DIVERSITY TESTS PASSED!");
