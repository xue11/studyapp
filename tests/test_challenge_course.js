const assert = require("assert");
const { UnitRegistry, TemplateRegistry } = require("../js/registries.js");
global.UnitRegistry = UnitRegistry;
global.TemplateRegistry = TemplateRegistry;
global.window = global;

require("../js/templates_math.js");

const challenge = require("../js/challenge_engine.js");
Object.assign(global, challenge);
const { createNewProfile } = require("../js/schema.js");
const { RuleBasedQuestionSource } = require("../js/question_source.js");
global.RuleBasedQuestionSource = RuleBasedQuestionSource;
global.Sound = { playClick() {}, playFanfare() {} };
global.StorageManager = class { saveState() { return { success: true }; } };
const { AppUI } = require("../js/ui.js");

let checks = 0;
function check(name, condition) {
  assert.ok(condition, name);
  checks++;
  console.log("  [PASS] " + name);
}

console.log("=== Challenge Course Verification ===");
{
  const expectedDistribution = {
    1: [2, 2, 1],
    2: [5, 5, 4],
    3: [4, 4, 3]
  };
  for (let grade = 1; grade <= 3; grade++) {
    const distribution = [1, 2, 3].map(stage =>
      ChallengeEngine.getTemplates(grade, stage).length
    );
    check(`grade ${grade} has the expected stage template distribution`,
      JSON.stringify(distribution) === JSON.stringify(expectedDistribution[grade]));
  }
}

{
  const profile = createNewProfile("challenge_test", "チャレンジテスト", 1);
  const ui = Object.create(AppUI.prototype);
  ui.state = { activeProfileId: profile.identity.id, profiles: [profile] };
  ui.getActiveProfile = () => profile;
  ui._saveOrAlert = () => true;
  ui._startSessionTimer = () => {};
  ui.navigate = screen => { ui.navigatedTo = screen; };
  ui._showModal = (title, body) => { ui.lastModal = { title, body }; };

  const courseHtml = ui._renderChallengeCourseScreen(profile);
  check("course screen shows three stages and the 4/5 pass condition",
    courseHtml.includes("1. ひらめきの土台") &&
    courseHtml.includes("3. 入試型に挑戦") &&
    courseHtml.includes("4問以上正解"));
  check("course screen shows stage 1 as available and stage 2 as locked",
    courseHtml.includes("5問に挑戦する") &&
    courseHtml.includes("前の段階をクリアすると挑戦できます"));

  ui.session = {
    mode: "challenge",
    currentIndex: 0,
    questions: [{ hintSteps: ["最初のヒント", "次のヒント"] }],
    challengeHintIndex: 0
  };
  ui.showNextChallengeHint();
  check("challenge hint reveals only the first hint",
    ui.lastModal.body.includes("最初のヒント") && !ui.lastModal.body.includes("次のヒント"));
  ui.showNextChallengeHint();
  check("next action reveals the second hint",
    ui.lastModal.body.includes("次のヒント") && !ui.lastModal.body.includes("最初のヒント"));

  ui.session = null;
  ui.startChallengeStage(2);
  check("locked stage cannot start", !ui.session && ui.lastModal.title === "まだ挑戦できません");

  ui.startChallengeStage(1);
  check("starting a stage creates exactly five questions",
    ui.session.mode === "challenge" && ui.session.questions.length === CHALLENGE_STAGE_COUNT);
  check("all generated questions belong to the requested grade and stage",
    ui.session.questions.every(question =>
      question.grade === 1 && question.challenge && question.challenge.stage === 1
    ));
  check("challenge session navigates to learning", ui.navigatedTo === "learning");

  const originalDocument = global.document;
  const methodFeedback = { textContent: "", style: {} };
  global.document = { getElementById: () => methodFeedback };
  ui.session = {
    mode: "challenge",
    currentIndex: 0,
    questions: [{ challenge: { category: "number_reasoning", method: "organize" } }],
    challengeMethodResults: [null]
  };
  ui.selectChallengeMethod("organize");
  check("method reflection records whether the chosen method matches",
    ui.session.challengeMethodResults[0].correct === true &&
    ui.session.challengeMethodResults[0].category === "number_reasoning");
  if (originalDocument === undefined) delete global.document;
  else global.document = originalDocument;

  const failed = ChallengeEngine.recordStageResult(profile, 1, 1, 3);
  check("3/5 does not pass or unlock the next stage",
    !failed.passed && failed.unlockedStage === 1);
  const passed = ChallengeEngine.recordStageResult(profile, 1, 1, 4, [
    { category: "number_reasoning", correct: true }
  ]);
  check("4/5 passes and unlocks the next stage",
    passed.passed && passed.unlockedStage === 2);
  check("progress tracks attempts, best score, and method statistics",
    passed.stageProgress.attempts === 2 &&
    passed.stageProgress.bestScore === 4 &&
    profile.challengeProgress.grade1.categoryStats.number_reasoning.correct === 1);
}

{
  const profile = createNewProfile("challenge_result_test", "結果テスト", 2);
  const ui = Object.create(AppUI.prototype);
  ui.state = { activeProfileId: profile.identity.id, profiles: [profile] };
  ui.getActiveProfile = () => profile;
  ui._stopSessionTimer = () => {};
  let saveAttempts = 0;
  ui._saveOrAlert = () => ++saveAttempts > 1;
  ui.closeModal = () => {};
  ui.navigate = (screen, params) => { ui.navigatedTo = screen; ui.resultParams = params; };
  ui.session = {
    mode: "challenge",
    challengeGrade: 2,
    challengeStage: 1,
    currentIndex: CHALLENGE_STAGE_COUNT - 1,
    totalCount: CHALLENGE_STAGE_COUNT,
    correctCount: 4,
    challengeMethodResults: [],
    startedAt: Date.now() - 1000
  };
  ui.nextLearningQuestion();
  check("failed progress save keeps the challenge result available for retry",
    !ui.navigatedTo && ui.session.challengeResultRecorded);
  ui.retryChallengeStageSave();
  check("challenge completion saves pass status and opens the result screen",
    ui.navigatedTo === "session_result" &&
    ui.resultParams.challengePassed === true &&
    ui.resultParams.challengeUnlockedStage === 2 &&
    saveAttempts === 2);
}

console.log(`All ${checks} challenge-course checks passed.`);
