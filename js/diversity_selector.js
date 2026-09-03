/**
 * DiversitySelector Layer
 * V2.5.11 仕様準拠
 */

class DiversitySelector {
  static buildProblemSignature(qInstance) {
    if (!qInstance.story) {
      return {
        isStory: false,
        templateId: qInstance.templateId,
        variationGroupId: qInstance.variationGroupId || qInstance.templateId,
        similarityGroupId: qInstance.similarityGroupId || qInstance.templateId
      };
    }
    
    return {
      isStory: true,
      templateId: qInstance.templateId,
      variationGroupId: qInstance.variationGroupId || qInstance.templateId,
      similarityGroupId: qInstance.similarityGroupId || qInstance.templateId,
      structureId: qInstance.story.structureId || "",
      contextId: qInstance.story.contextId || "",
      entityId: qInstance.story.entityId || "",
      actionId: qInstance.story.actionId || "",
      sentencePatternId: qInstance.story.sentencePatternId || "",
      questionPatternId: qInstance.story.questionPatternId || ""
    };
  }

  static classifySimilarity(candSig, histSig) {
    if (!candSig.isStory || !histSig.isStory) {
      // 既存の計算問題などは templateId や similarityGroupId が同じなら Level 3 とみなす
      if (candSig.similarityGroupId === histSig.similarityGroupId) return 3;
      if (candSig.templateId === histSig.templateId) return 2;
      return 0;
    }

    // Level 3判定: similarityGroupId, structureId, contextId, actionId, sentencePatternId, questionPatternId が同一
    if (candSig.similarityGroupId === histSig.similarityGroupId &&
        candSig.structureId === histSig.structureId &&
        candSig.contextId === histSig.contextId &&
        candSig.actionId === histSig.actionId &&
        candSig.sentencePatternId === histSig.sentencePatternId &&
        candSig.questionPatternId === histSig.questionPatternId) {
      return 3;
    }

    // Level 2判定: 意味構造・場面・行動 が同一 (大部分が同一)
    if (candSig.similarityGroupId === histSig.similarityGroupId &&
        candSig.structureId === histSig.structureId &&
        candSig.contextId === histSig.contextId &&
        candSig.actionId === histSig.actionId) {
      return 2;
    }

    // Level 1判定: 意味構造(structureId)は同じだが場面などが異なる
    if (candSig.structureId === histSig.structureId) {
      return 1;
    }

    return 0;
  }

  static calculateDiversityScore(candidate, recentHistory) {
    let score = 0;
    const candSig = this.buildProblemSignature(candidate);

    if (!candSig.isStory) {
      // 計算問題の場合は templateId の新規性で判定
      let isTemplateNew = true;
      for (const h of recentHistory) {
        if (h.templateId === candSig.templateId) {
          isTemplateNew = false;
          break;
        }
      }
      return isTemplateNew ? 10 : 0;
    }

    // 履歴からの新規性スコア
    let contextNewness = 10;
    let actionNewness = 5;
    let sentenceNewness = 3;
    let questionNewness = 2;
    let templateNewness = 5;

    for (const h of recentHistory) {
      const histSig = this.buildProblemSignature(h);
      if (!histSig.isStory) continue;
      
      if (histSig.contextId === candSig.contextId) contextNewness = 0;
      if (histSig.actionId === candSig.actionId) actionNewness = 0;
      if (histSig.sentencePatternId === candSig.sentencePatternId) sentenceNewness = 0;
      if (histSig.questionPatternId === candSig.questionPatternId) questionNewness = 0;
      if (histSig.templateId === candSig.templateId) templateNewness = 0;
    }

    score = contextNewness + actionNewness + sentenceNewness + questionNewness + templateNewness;
    return score;
  }

  static filterByDiversity(candidates, recentHistory) {
    if (!candidates || candidates.length === 0) return [];

    let filtered = candidates.filter(cand => {
      const candSig = this.buildProblemSignature(cand);

      // 直近1問: Level 3 禁止
      if (recentHistory.length > 0) {
        const hist1Sig = this.buildProblemSignature(recentHistory[recentHistory.length - 1]);
        if (this.classifySimilarity(candSig, hist1Sig) === 3) return false;
      }

      // 直近3問: Level 3 禁止、Level 2 回避
      const recent3 = recentHistory.slice(-3);
      for (const h of recent3) {
        const hSig = this.buildProblemSignature(h);
        if (this.classifySimilarity(candSig, hSig) === 3) return false;
      }

      return true;
    });

    // 候補0件なら緩和して全候補を戻す (緩和1: Level 3を除外できなかった場合)
    if (filtered.length === 0) return candidates;

    // さらに直近3問のLevel 2を回避するフィルタ
    let strictFiltered = filtered.filter(cand => {
      const candSig = this.buildProblemSignature(cand);
      const recent3 = recentHistory.slice(-3);
      for (const h of recent3) {
        if (this.classifySimilarity(candSig, this.buildProblemSignature(h)) >= 2) return false;
      }
      return true;
    });

    if (strictFiltered.length > 0) {
      filtered = strictFiltered;
    }

    // 直近5問: 同一contextを可能な限り回避
    let contextFiltered = filtered.filter(cand => {
      const candSig = this.buildProblemSignature(cand);
      const recent5 = recentHistory.slice(-5);
      for (const h of recent5) {
        const hSig = this.buildProblemSignature(h);
        if (candSig.isStory && hSig.isStory && candSig.contextId === hSig.contextId) return false;
      }
      return true;
    });
    
    if (contextFiltered.length > 0) {
      filtered = contextFiltered;
    }

    return filtered;
  }

  static selectDiverseCandidate(candidates, recentHistory) {
    if (!candidates || candidates.length === 0) return null;
    
    if (candidates.length === 1) return candidates[0];

    // 1. フィルタリング (禁止ルールの適用と可能な限りの回避)
    let validCandidates = this.filterByDiversity(candidates, recentHistory);

    // 2. スコアリングと最良候補の選択
    let bestCandidate = null;
    let bestScore = -1;

    for (const cand of validCandidates) {
      const score = this.calculateDiversityScore(cand, recentHistory);
      if (score > bestScore) {
        bestScore = score;
        bestCandidate = cand;
      } else if (score === bestScore) {
        // スコア同点の場合はランダム
        if (Math.random() < 0.5) {
          bestCandidate = cand;
        }
      }
    }

    return bestCandidate || validCandidates[0];
  }
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { DiversitySelector };
} else {
  window.DiversitySelector = DiversitySelector;
}

