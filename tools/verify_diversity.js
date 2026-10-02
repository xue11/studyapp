const { DiversitySelector } = require('../js/diversity_selector.js');

const q1 = {
  templateId: 'g1_word_add_01',
  problemType: 'word_problem',
  story: {
    structureId: 'addition',
    contextId: 'school',
    entityId: 'apple',
    actionId: 'add',
    sentencePatternId: 'sp_01',
    questionPatternId: 'qp_01'
  },
  similarityGroupId: 'sg_addition'
};

const q2_only_numbers_differ = {
  templateId: 'g1_word_add_01',
  problemType: 'word_problem',
  story: {
    structureId: 'addition',
    contextId: 'school',
    entityId: 'apple',
    actionId: 'add',
    sentencePatternId: 'sp_01',
    questionPatternId: 'qp_01'
  },
  similarityGroupId: 'sg_addition'
};

const q3_only_noun_differs = {
  templateId: 'g1_word_add_01',
  problemType: 'word_problem',
  story: {
    structureId: 'addition',
    contextId: 'school',
    entityId: 'orange', // Different noun
    actionId: 'add',
    sentencePatternId: 'sp_01',
    questionPatternId: 'qp_01'
  },
  similarityGroupId: 'sg_addition'
};

const q4_diverse = {
  templateId: 'g1_word_add_02',
  problemType: 'word_problem',
  story: {
    structureId: 'addition',
    contextId: 'park',
    entityId: 'dog',
    actionId: 'join',
    sentencePatternId: 'sp_02',
    questionPatternId: 'qp_02'
  },
  similarityGroupId: 'sg_addition'
};

const sig1 = DiversitySelector.buildProblemSignature(q1);
const sig2 = DiversitySelector.buildProblemSignature(q2_only_numbers_differ);
const sig3 = DiversitySelector.buildProblemSignature(q3_only_noun_differs);
const sig4 = DiversitySelector.buildProblemSignature(q4_diverse);

console.log("Level 3 similarity (numbers differ):", DiversitySelector.classifySimilarity(sig2, sig1) === 3 ? "OK" : "FAIL");
console.log("Level 3 similarity (noun differs):", DiversitySelector.classifySimilarity(sig3, sig1) === 3 ? "OK" : "FAIL");

const candidates = [q2_only_numbers_differ, q3_only_noun_differs, q4_diverse];
const best = DiversitySelector.selectDiverseCandidate(candidates, [q1]);

console.log("Diverse Candidate Selected:", best === q4_diverse ? "OK" : "FAIL");

