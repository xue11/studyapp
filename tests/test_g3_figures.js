const path = require('path');
const R = path.join(__dirname, '..', 'js');
['templates_math.js', 'templates_units_p1.js', 'templates_units_p2.js',
  'templates_g2_extra.js', 'templates_figures_g1.js', 'templates_figures_g2.js'
].forEach(f => require(path.join(R, f)));
const { RuleBasedQuestionSource } = require(path.join(R, 'question_source.js'));
const { QuestionValidator } = require(path.join(R, 'validator.js'));
const { TemplateRegistry, UnitRegistry } = require(path.join(R, 'registries.js'));

let fail = 0;
const ok = (c, m) => { console.log((c ? 'PASS' : 'FAIL') + ' ' + m); if (!c) fail++; };

// --- 単元が登録されていること
['angle_figure', 'area_grid_figure', 'solid_net_figure'].forEach(id => {
  const u = UnitRegistry.getUnitsForLevel('math', 3, 3).find(x => x.id === id);
  ok(!!u, '単元 ' + id + ' が 3年Lv3 に登録されている (' + (u ? u.name : '-') + ')');
});

// --- テンプレートが登録されていること
// V2.8.0: G2 にも figure_tap が加わったため、grade 3 で絞る
const g3 = Object.values(TemplateRegistry.templates).filter(t => t.answerType === 'figure_tap' && t.grade === 3);
ok(g3.length === 9, 'G3 図形テンプレート 9件が登録されている (count=' + g3.length + ')');
ok(g3.every(t => t.grade === 3 && t.difficultyLevel === 3), 'すべて 3年生 Lv3');

// --- 各テンプレートが10問ずつ生成でき、Validator を通ること
g3.forEach(t => {
  let good = 0, issues = [];
  for (let i = 0; i < 10; i++) {
    const q = RuleBasedQuestionSource.generateQuestion(t.templateId, []);
    const res = QuestionValidator.validate(q, []);
    if (res.valid && Array.isArray(q.figureParts) && q.figureParts.length >= 2
      && Array.isArray(q.correctPartIds) && q.correctPartIds.length > 0
      && typeof q.figureHTML === 'string' && q.figureHTML.indexOf('<svg') >= 0
      && q.figureHTML.indexOf('NaN') < 0) {
      good++;
    } else {
      issues.push('i' + i + ':' + (res.errors || []).map(e => e.code).join('|'));
    }
  }
  ok(good === 10, t.templateId + ' [' + t.unitId + '] 10問生成 ' + good + '/10'
    + (issues.length ? ' NG=' + issues.slice(0, 2).join(',') : ''));
});

// --- 単元選択 specialize: 各単元で figure_tap が_COVER される
['angle_figure', 'area_grid_figure', 'solid_net_figure'].forEach(uid => {
  const pool = TemplateRegistry.getByUnit('math', 3, 3, uid);
  ok(pool.length === 3 && pool.every(t => t.answerType === 'figure_tap'),
    uid + ' のプールは3件すべて figure_tap (n=' + pool.length + ')');
});

// --- 図形OFF設定で新単元が除外されること（UnitSelector 汎化の確認）
const { UnitSelector } = require(path.join(R, 'unit_selector.js'));
const units = UnitRegistry.getUnitsForLevel('math', 3, 3);
const off = UnitSelector._filterFigureUnits(units, { settings: { figureEnabled: false } }).map(u => u.id);
const on = UnitSelector._filterFigureUnits(units, { settings: { figureEnabled: true } }).map(u => u.id);
ok(!off.includes('angle_figure') && !off.includes('area_grid_figure') && !off.includes('solid_net_figure'),
  'figureEnabled=false で G3図形3単元が除外される (残=' + JSON.stringify(off) + ')');
ok(on.includes('angle_figure') && on.includes('area_grid_figure') && on.includes('solid_net_figure'),
  'figureEnabled=true で G3図形3単元が選択される (n=' + on.length + ')');
ok(off.includes('division_g3'), '非図形単元は figureEnabled=false でも残る');

// --- V2.8.0 回帰: figure_tap の設問文がカード問題に潰されないこと
// 此前は question_source が problemType だけで buildProblem を呼んでいたため、
// G3の figure_tap すべてが G1の「おおきいほうをえらびましょう」+ 正方形カードになっていた。
{
  let polluted = 0, wrongText = 0;
  g3.forEach(t => {
    const q = RuleBasedQuestionSource.generateQuestion(t.templateId, []);
    if (q.figureChoices && q.figureChoices.length > 0) polluted++;
    if (q.questionText !== t.format) wrongText++;
  });
  ok(polluted === 0, 'figure_tap に figureChoices が混ざらない (混入=' + polluted + ')');
  ok(wrongText === 0, 'figure_tap の設問文が format と一致 (不一致=' + wrongText + ')');
  const sample = RuleBasedQuestionSource.generateQuestion('g3_angle_right_vertex', []);
  ok(/タップ/.test(sample.questionText), 'g3_angle_right_vertex: ' + sample.questionText);
}
console.log('\n--- ' + (fail === 0 ? 'ALL PASS' : 'FAIL ' + fail) + ' ---');
process.exit(fail === 0 ? 0 : 1);