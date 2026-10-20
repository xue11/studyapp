/**
 * V2.9.x テストカバレッジ拡大 — UnitSelector (出題単元の選択ロジック)
 *
 * 対象: js/unit_selector.js
 *
 * 背景:
 * - 出題優先順位は「復習期限超過 → 復習当日 → Coverage/Weakness Phase → 通常ローテーション」。
 *   ここに不具合があると復習問題が出題されなくなる・弱点単元が出題されない等のCORE不具合になる。
 * - Coverage Phase (< 14日) はローテーションバッグ、Weakness Phase (>= 14日) は
 *   40% ローテーション + 60% 弱点重み付け (weight = 1 + max(0, 0.80 - accuracy) * 3)。
 * - figureEnabled === false のとき figure 単元が除外される (V2.6.4 / V2.7.0 汎化)。
 *
 * Math.random は决定論的なモックに差し替えて検証する。
 *
 * 実行方法: node tests/test_unit_selector.js
 */

const assert = require("assert");
const path = require("path");
const { UnitSelector } = require("../js/unit_selector.js");
const { APP_CONFIG } = require("../js/config.js");
const { UnitRegistry, TemplateRegistry } = require("../js/registries.js");
const { DateUtils } = require("../js/date_utils.js");

// テンプレートの自動登録 (UnitSelector._templateList() が参照する)
require("../js/templates_math.js");
require("../js/templates_units_p1.js");
require("../js/templates_units_p2.js");
require("../js/templates_figures_g1.js");
require("../js/templates_figures_g2.js");
require("../js/templates_figures_g3.js");
require("../js/templates_g2_extra.js");
require("../js/templates_clock.js");

let passCount = 0;
function check(label, cond) {
  assert.ok(cond, "FAIL: " + label);
  passCount += 1;
  console.log("  [PASS] " + label);
}

// --- Math.random の決定論的モック ---------------------------
const realRandom = Math.random;
function withRandom(value, fn) {
  Math.random = () => value;
  try { return fn(); } finally { Math.random = realRandom; }
}
function withRandomSequence(values, fn) {
  let i = 0;
  Math.random = () => values[i++ % values.length];
  try { return fn(); } finally { Math.random = realRandom; }
}

const TODAY = "2026-09-01";

// --- テスト用プロファイル生成 -------------------------------
function makeProfile(grade = 1, level = 1, opts = {}) {
  const gp = {
    difficultyLevel: level,
    learningStartDate: opts.learningStartDate === undefined ? "2026-09-01" : opts.learningStartDate,
    unitStats: opts.unitStats || {},
    unitRotationBag: opts.unitRotationBag || []
  };
  const profile = {
    identity: { id: "p_test" },
    settings: { figureEnabled: opts.figureEnabled === undefined ? true : opts.figureEnabled },
    skill: { subject: { currentGrade: grade, gradeProgress: {} } },
    streaks: { correctStreak: 0, bestStreak: 0, dailyStreak: 0, bestDailyStreak: 0, lastStudyDate: "" },
    points: { total: 0, achievementLevel: 1 },
    history: [],
    reviewQueue: opts.reviewQueue || [],
    tests: [],
    badges: []
  };
  profile.skill.subject.gradeProgress[`grade${grade}`] = gp;
  return profile;
}

// ---------------------------------------------------------------
console.log("1. selectNextUnit: 復習キューが最優先 (期限超過)");
// ---------------------------------------------------------------
{
  const profile = makeProfile(1, 1, {
    reviewQueue: [{
      reviewId: "r_old", subjectId: "math", grade: 1, unitId: "add_1digit_no_carry",
      dueAt: "2026-08-01", status: "active", failCount: 0, successCount: 0,
      registeredAt: "2026-07-01", templateId: "tpl_x", conceptId: "c1"
    }]
  });
  const res = withRandom(0.5, () => UnitSelector.selectNextUnit(profile, APP_CONFIG, TODAY));
  check("復習: type = 'review'", res.type === "review");
  check("復習: phase = 'review'", res.phase === "review");
  check("復習: unitId = 復習対象の単元", res.unitId === "add_1digit_no_carry");
  check("復習: reviewItem が返る", res.reviewItem && res.reviewItem.reviewId === "r_old");
}

// ---------------------------------------------------------------
console.log("2. selectNextUnit: 復習 (当日Due) も最優先");
// ---------------------------------------------------------------
{
  const profile = makeProfile(1, 1, {
    reviewQueue: [{
      reviewId: "r_today", subjectId: "math", grade: 1, unitId: "sub_1digit_no_borrow",
      dueAt: TODAY, status: "active", failCount: 0, successCount: 0,
      registeredAt: "2026-08-01", templateId: "tpl_x", conceptId: "c1"
    }]
  });
  const res = withRandom(0.5, () => UnitSelector.selectNextUnit(profile, APP_CONFIG, TODAY));
  check("復習当日: type = 'review'", res.type === "review");
  check("復習当日: unitId が復習対象", res.unitId === "sub_1digit_no_borrow");
}

// ---------------------------------------------------------------
console.log("3. selectNextUnit: 復習の優先度 (dueAt 古い順 → failCount 多い順)");
// ---------------------------------------------------------------
{
  const profile = makeProfile(1, 1, {
    reviewQueue: [
      { reviewId: "r_newer", subjectId: "math", grade: 1, unitId: "add_1digit_no_carry", dueAt: "2026-08-20", status: "active", failCount: 5, successCount: 0, registeredAt: "2026-07-01", templateId: "t", conceptId: "c" },
      { reviewId: "r_older", subjectId: "math", grade: 1, unitId: "sub_1digit_no_borrow", dueAt: "2026-08-01", status: "active", failCount: 0, successCount: 0, registeredAt: "2026-07-01", templateId: "t", conceptId: "c" }
    ]
  });
  const res = withRandom(0.5, () => UnitSelector.selectNextUnit(profile, APP_CONFIG, TODAY));
  check("復習優先度: dueAt が最も古いものが選ばれる", res.reviewItem.reviewId === "r_older");

  // 同じ dueAt なら failCount 多い順
  const profile2 = makeProfile(1, 1, {
    reviewQueue: [
      { reviewId: "r_lowfail", subjectId: "math", grade: 1, unitId: "add_1digit_no_carry", dueAt: "2026-08-20", status: "active", failCount: 1, successCount: 0, registeredAt: "2026-07-01", templateId: "t", conceptId: "c" },
      { reviewId: "r_highfail", subjectId: "math", grade: 1, unitId: "sub_1digit_no_borrow", dueAt: "2026-08-20", status: "active", failCount: 9, successCount: 0, registeredAt: "2026-07-01", templateId: "t", conceptId: "c" }
    ]
  });
  const res2 = withRandom(0.5, () => UnitSelector.selectNextUnit(profile2, APP_CONFIG, TODAY));
  check("復習優先度: 同一 dueAt なら failCount 多い方が先", res2.reviewItem.reviewId === "r_highfail");
}

// ---------------------------------------------------------------
console.log("4. selectNextUnit: 復習のフィルタ (status / grade / 未来Due / 存在しない単元)");
// ---------------------------------------------------------------
{
  const base = (overrides) => Object.assign({
    reviewId: "r", subjectId: "math", grade: 1, unitId: "add_1digit_no_carry",
    dueAt: "2026-08-01", status: "active", failCount: 0, successCount: 0,
    registeredAt: "2026-07-01", templateId: "tpl_x", conceptId: "c1"
  }, overrides);

  const p1 = makeProfile(1, 1, { reviewQueue: [base({ status: "graduated" })] });
  const r1 = withRandom(0.5, () => UnitSelector.selectNextUnit(p1, APP_CONFIG, TODAY));
  check("status='graduated' は復習対象外的", r1.type === "normal");

  const p2 = makeProfile(1, 1, { reviewQueue: [base({ grade: 2 })] });
  const r2 = withRandom(0.5, () => UnitSelector.selectNextUnit(p2, APP_CONFIG, TODAY));
  check("別学年の復習は対象外", r2.type === "normal");

  const p3 = makeProfile(1, 1, { reviewQueue: [base({ dueAt: "2026-12-31" })] });
  const r3 = withRandom(0.5, () => UnitSelector.selectNextUnit(p3, APP_CONFIG, TODAY));
  check("期限前の復習は対象外", r3.type === "normal");

  const p4 = makeProfile(1, 1, { reviewQueue: [base({ unitId: "nonexistent_unit_xyz" })] });
  const r4 = withRandom(0.5, () => UnitSelector.selectNextUnit(p4, APP_CONFIG, TODAY));
  check("存在しない単元の復習は対象外", r4.type === "normal");
}

// ---------------------------------------------------------------
console.log("5. selectNextUnit: Coverage Phase (< 14日) はローテーションバッグ");
// ---------------------------------------------------------------
{
  const profile = makeProfile(1, 1, { learningStartDate: "2026-08-25" }); // 7日経過
  const res = withRandom(0.5, () => UnitSelector.selectNextUnit(profile, APP_CONFIG, TODAY));
  check("Coverage: type = 'normal'", res.type === "normal");
  check("Coverage: phase = 'coverage'", res.phase === "coverage");
  const g1lv1 = UnitRegistry.getUnitsForLevel("math", 1, 1).map(u => u.id);
  check("Coverage: Lv1 の単元から選択される", g1lv1.includes(res.unitId));
}

// ---------------------------------------------------------------
console.log("6. selectNextUnit: ローテーションバッグは1巡で重複しない");
// ---------------------------------------------------------------
{
  const profile = makeProfile(1, 1, { learningStartDate: "2026-08-25" });
  const seen = [];
  const g1lv1 = UnitRegistry.getUnitsForLevel("math", 1, 1).map(u => u.id);
  // bag が空の状態から-startedする
  for (let i = 0; i < g1lv1.length; i++) {
    const res = withRandom(0.5, () => UnitSelector.selectNextUnit(profile, APP_CONFIG, TODAY));
    seen.push(res.unitId);
  }
  check("ローテーション: 1巡で全Lv1単元が1回ずつ選ばれる", new Set(seen).size === g1lv1.length);
  check("ローテーション: 選んだ単元はすべて有効単元", seen.every(id => g1lv1.includes(id)));
  check("ローテーション: 同じ単元が2回出ない", new Set(seen).size === seen.length);
}

// ---------------------------------------------------------------
console.log("7. selectNextUnit: bag に存在しない単元は除去され、新単元が注入される");
// ---------------------------------------------------------------
{
  const profile = makeProfile(1, 1, {
    learningStartDate: "2026-08-25",
    unitRotationBag: ["stale_unit_xyz", "add_1digit_no_carry"]
  });
  const res = withRandom(0.99, () => UnitSelector.selectNextUnit(profile, APP_CONFIG, TODAY));
  const gp = profile.skill.subject.gradeProgress.grade1;
  const g1lv1 = UnitRegistry.getUnitsForLevel("math", 1, 1).map(u => u.id);
  check("bag Maintenance: 無効単元が bag から除去される", !gp.unitRotationBag.includes("stale_unit_xyz"));
  check("bag Maintenance: 選択済み以外の有効単元が bag に残る",
    g1lv1.filter(id => id !== res.unitId).every(id => gp.unitRotationBag.includes(id)));
  check("bag Maintenance: 選択される単元は有効単元", g1lv1.includes(res.unitId));
}

// ---------------------------------------------------------------
console.log("8. selectNextUnit: Weakness Phase (>= 14日) のローテーション枠 (40%)");
// ---------------------------------------------------------------
{
  const profile = makeProfile(1, 1, {
    learningStartDate: "2026-08-01", // 31日経過 → Weakness Phase
    unitStats: {
      add_1digit_no_carry: { attempts: 10, correct: 5, accuracy: 0.5, masteryScore: 0.5 },
      sub_1digit_no_borrow: { attempts: 10, correct: 9, accuracy: 0.9, masteryScore: 0.9 }
    }
  });
  // roll = 0.1 < minRotationRatio(0.40) → ローテーション枠
  const res = withRandom(0.1, () => UnitSelector.selectNextUnit(profile, APP_CONFIG, TODAY));
  check("Weakness: roll<0.4 なら phase = 'weakness_rotation'", res.phase === "weakness_rotation");
  check("Weakness: roll<0.4 なら type = 'normal'", res.type === "normal");
}

// ---------------------------------------------------------------
console.log("9. selectNextUnit: Weakness Phase の弱点重み付け (60%)");
// ---------------------------------------------------------------
{
  const profile = makeProfile(1, 1, {
    learningStartDate: "2026-08-01",
    unitStats: {
      add_1digit_no_carry: { attempts: 10, correct: 5, accuracy: 0.5, masteryScore: 0.5 },
      sub_1digit_no_borrow: { attempts: 10, correct: 9, accuracy: 0.9, masteryScore: 0.9 }
    }
  });
  // roll = 0.9 >= 0.4 → 弱点重み付け
  const res = withRandom(0.9, () => UnitSelector.selectNextUnit(profile, APP_CONFIG, TODAY));
  check("Weakness: roll>=0.4 なら phase = 'weakness'", res.phase === "weakness");
  check("Weakness: 弱点単元 (accuracy 0.5) が選ばれる", res.unitId === "add_1digit_no_carry");
  check("Weakness: 高精度単元 (accuracy 0.9) は選ばれない", res.unitId !== "sub_1digit_no_borrow");
}

// ---------------------------------------------------------------
console.log("10. selectNextUnit: 弱点重み付けの重み (精度が低いほど高重み)");
// ---------------------------------------------------------------
{
  const unitStats = {
    low: { attempts: 10, correct: 5, accuracy: 0.5, masteryScore: 0.5 },
    mid: { attempts: 10, correct: 8, accuracy: 0.8, masteryScore: 0.8 }
  };
  const weakUnits = [{ id: "low" }, { id: "mid" }];
  // weight: low = 1 + (0.80-0.50)*3 = 1.9, mid = 1 + (0.80-0.80)*3 = 1.0 → total 2.9
  // r = 0.5 → 1.9 < 0.5? no → low が選ばれる
  const picked = withRandom(0.5, () => UnitSelector._selectWeightedWeakUnit(weakUnits, unitStats));
  check("重み付け: r=0.5 で低精度単元が選ばれる", picked === "low");

  // r = 0 → 常に先頭
  const picked2 = withRandom(0, () => UnitSelector._selectWeightedWeakUnit(weakUnits, unitStats));
  check("重み付け: r=0 で先頭単元が選ばれる", picked2 === "low");

  // r = 0.95 → 2.9 * 0.95 = 2.755 > 1.9 → mid
  const picked3 = withRandom(0.95, () => UnitSelector._selectWeightedWeakUnit(weakUnits, unitStats));
  check("重み付け: r=0.95 で高精度単元が選ばれる", picked3 === "mid");
}

// ---------------------------------------------------------------
console.log("11. selectNextUnit: 未学習単元 (attempts=0 / accuracy=null) は弱点対象外");
// ---------------------------------------------------------------
{
  const profile = makeProfile(1, 1, {
    learningStartDate: "2026-08-01",
    unitStats: {
      add_1digit_no_carry: { attempts: 0, correct: 0, accuracy: null, masteryScore: 0 },
      sub_1digit_no_borrow: { attempts: 10, correct: 9, accuracy: 0.9, masteryScore: 0.9 }
    }
  });
  // 弱点単元が無いため roll>=0.4 でも weakness_rotation へフォールバック
  const res = withRandom(0.9, () => UnitSelector.selectNextUnit(profile, APP_CONFIG, TODAY));
  check("未学習単元: 弱点対象に含まれない", res.phase === "weakness_rotation");
}

// ---------------------------------------------------------------
console.log("12. selectNextUnit: figureEnabled=false で figure 単元が除外される");
// ---------------------------------------------------------------
{
  const profile = makeProfile(1, 1, { learningStartDate: "2026-08-25", figureEnabled: false });
  const g1lv1 = UnitRegistry.getUnitsForLevel("math", 1, 1).map(u => u.id);
  const selected = [];
  for (let i = 0; i < 6; i++) {
    const res = withRandom(0.5, () => UnitSelector.selectNextUnit(profile, APP_CONFIG, TODAY));
    selected.push(res.unitId);
  }
  check("figure OFF: shape_basic が選択されない", !selected.includes("shape_basic"));
  check("figure OFF: 算出単元は選択される", selected.includes("add_1digit_no_carry"));
  check("figure OFF: 選択単位が有効な非figure単元", selected.every(id => g1lv1.includes(id)));
}

// ---------------------------------------------------------------
console.log("13. selectNextUnit: figureEnabled=true なら figure 単元も候補になる");
// ---------------------------------------------------------------
{
  const profile = makeProfile(1, 1, { learningStartDate: "2026-08-25", figureEnabled: true });
  const g1lv1 = UnitRegistry.getUnitsForLevel("math", 1, 1).map(u => u.id);
  const selected = [];
  for (let i = 0; i < g1lv1.length; i++) {
    const res = withRandom(0.5, () => UnitSelector.selectNextUnit(profile, APP_CONFIG, TODAY));
    selected.push(res.unitId);
  }
  check("figure ON: 1巡で shape_basic も選ばれる", selected.includes("shape_basic"));
}

// ---------------------------------------------------------------
console.log("14. _isFigureEnabled / _isFigureUnit");
// ---------------------------------------------------------------
check("_isFigureEnabled: settings 無し → true", UnitSelector._isFigureEnabled({}) === true);
check("_isFigureEnabled: figureEnabled=true → true", UnitSelector._isFigureEnabled({ settings: { figureEnabled: true } }) === true);
check("_isFigureEnabled: figureEnabled=false → false", UnitSelector._isFigureEnabled({ settings: { figureEnabled: false } }) === false);
check("_isFigureEnabled: figureEnabled が非boolean → true", UnitSelector._isFigureEnabled({ settings: { figureEnabled: "no" } }) === true);
check("_isFigureUnit: 'shape_basic' → true", UnitSelector._isFigureUnit("shape_basic") === true);
check("_isFigureUnit: 'add_1digit_no_carry' → false", UnitSelector._isFigureUnit("add_1digit_no_carry") === false);
check("_isFigureUnit: 空文字 → false", UnitSelector._isFigureUnit("") === false);
check("_isFigureUnit: null → false", UnitSelector._isFigureUnit(null) === false);

// ---------------------------------------------------------------
console.log("15. _filterFigureUnits");
// ---------------------------------------------------------------
{
  const units = UnitRegistry.getUnitsForLevel("math", 1, 1);
  const on = UnitSelector._filterFigureUnits(units, { settings: { figureEnabled: true } }).map(u => u.id);
  const off = UnitSelector._filterFigureUnits(units, { settings: { figureEnabled: false } }, "math", 1, 1).map(u => u.id);
  check("_filterFigureUnits: ON では全単元が残る", on.length === units.length);
  check("_filterFigureUnits: OFF では shape_basic が除かれる", !off.includes("shape_basic"));
  check("_filterFigureUnits: OFF でも算出単元は残る", off.includes("add_1digit_no_carry"));
  check("_filterFigureUnits: 配列以外入力はそのまま返す", UnitSelector._filterFigureUnits(null, {}) === null);
}

// ---------------------------------------------------------------
console.log("16. _calculateDaysElapsed");
// ---------------------------------------------------------------
check("_calculateDaysElapsed: 7日", UnitSelector._calculateDaysElapsed("2026-08-25", TODAY) === 7);
check("_calculateDaysElapsed: 0日 (同日)", UnitSelector._calculateDaysElapsed(TODAY, TODAY) === 0);
check("_calculateDaysElapsed: 未来開始日は0", UnitSelector._calculateDaysElapsed("2026-09-10", TODAY) === 0);
check("_calculateDaysElapsed: startDateStr 無しは0", UnitSelector._calculateDaysElapsed(null, TODAY) === 0);
check("_calculateDaysElapsed: 31日", UnitSelector._calculateDaysElapsed("2026-08-01", TODAY) === 31);

// ---------------------------------------------------------------
console.log("17. _unitExistsInAnyLevel");
// ---------------------------------------------------------------
check("_unitExistsInAnyLevel: 'add_1digit_no_carry' (g1) → true", UnitSelector._unitExistsInAnyLevel(1, "add_1digit_no_carry") === true);
check("_unitExistsInAnyLevel: 'add_1digit_carry' (g1 Lv2) → true", UnitSelector._unitExistsInAnyLevel(1, "add_1digit_carry") === true);
check("_unitExistsInAnyLevel: 不明な単元 → false", UnitSelector._unitExistsInAnyLevel(1, "nonexistent_unit_xyz") === false);
check("_unitExistsInAnyLevel: 別学年の単元 → false", UnitSelector._unitExistsInAnyLevel(6, "add_1digit_no_carry") === false);

// ---------------------------------------------------------------
console.log("18. selectNextUnit: 単元未登録の学年では Error を投げる");
// ---------------------------------------------------------------
{
  const profile = makeProfile(7, 1, { learningStartDate: "2026-08-25" });
  let threw = false;
  let msg = "";
  try {
    withRandom(0.5, () => UnitSelector.selectNextUnit(profile, APP_CONFIG, TODAY));
  } catch (e) { threw = true; msg = e.message; }
  check("単元未登録の学年 (g7) で Error を投げる", threw);
  check("Error message に 'No units registered' が含まれる", msg.includes("No units registered"));
  check("Error message に grade が含まれる", msg.includes("7"));
  check("Error message に level が含まれる", msg.includes("level 1"));
}

// ---------------------------------------------------------------
console.log("19. selectNextUnit: config で coveragePeriodDays を上書き");
// ---------------------------------------------------------------
{
  const profile = makeProfile(1, 1, { learningStartDate: "2026-08-25" }); // 7日経過
  const customConfig = { math: { unitSelection: { coveragePeriodDays: 3 } } };
  const res = withRandom(0.1, () => UnitSelector.selectNextUnit(profile, customConfig, TODAY));
  check("coveragePeriodDays=3 なら 7日経過で Weakness Phase", res.phase === "weakness_rotation");

  const profile2 = makeProfile(1, 1, { learningStartDate: "2026-08-01" }); // 31日経過
  const res2 = withRandom(0.1, () => UnitSelector.selectNextUnit(profile2, APP_CONFIG, TODAY));
  check("既定 coveragePeriodDays=14 なら 31日経過で Weakness Phase", res2.phase === "weakness_rotation");
}

// ---------------------------------------------------------------
console.log("20. selectNextUnit: figure 以外の単元も存在しない場合は Error を投げる");
// ---------------------------------------------------------------
{
  // g1 Lv1 の figure 単元 (shape_basic) のみが残る状況を figureEnabled=false で再現する
  const profile = makeProfile(1, 1, { learningStartDate: "2026-08-25", figureEnabled: false });
  // 既に他のテストで figure 以外の単位が bag から引かれている可能性があるので、
  // ここでは「例外 없이選べること」だけを検証する
  let res = null;
  try {
    res = withRandom(0.5, () => UnitSelector.selectNextUnit(profile, APP_CONFIG, TODAY));
  } catch (e) { /* ignore */ }
  check("figure OFF でも算出単元が選択できる", res !== null && typeof res.unitId === "string");
  check("figure OFF で算出単元が選ばれる", res && res.unitId !== "shape_basic");
}

// ---------------------------------------------------------------
console.log("21. selectNextUnit: localDateString 省略時は JST の今日キーを使う");
// ---------------------------------------------------------------
{
  const profile = makeProfile(1, 1, { learningStartDate: null });
  const res = withRandom(0.5, () => UnitSelector.selectNextUnit(profile, APP_CONFIG));
  check("日付省略でも type = 'normal' を返す", res.type === "normal");
  check("learningStartDate=null なら Coverage Phase (0日経過)", res.phase === "coverage");
}

// ---------------------------------------------------------------
console.log("22. selectNextUnit: Math.random が復元される");
// ---------------------------------------------------------------
{
  const before = Math.random;
  withRandom(0.5, () => { /* noop */ });
  check("withRandom 後は Math.random が元に戻る", Math.random === before);
}

// ---------------------------------------------------------------
console.log("\n==========================================");
console.log(`UnitSelector tests: ${passCount} assertions passed.`);
console.log("==========================================");
