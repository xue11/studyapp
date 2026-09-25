/**
 * Data Schema & Model Layer
 * V2.5.10 詳細設計書 第29章・第30章 準拠
 * 
 * - schemaVersion: "2.5.6" (永続化スキーマバージョン)
 * - appVersion: "V2.6.7" (アプリケーションバージョン)
 * - learningStartDate: 初回通常学習完了時まで null
 * - accuracy: attempts === 0 時は null
 * - incorrectStreak は保持しない
 * - reviewQueue はプロフィール直下で保持（gradeフィールドを内包）
 */

function createInitialUnitStats() {
  return {
    attempts: 0,       // 完了したquestionInstance数
    correct: 0,        // 最終正解数
    accuracy: null,    // attempts === 0 の場合は必ず null
    masteryScore: 0.0  // unit単位の習熟度スコア
  };
}

function createGradeProgress(grade) {
  return {
    difficultyLevel: 1,      // 1:基礎, 2:標準, 3:発展 (初期値はLv1)
    learningStartDate: null, // 初回通常学習完了時に設定 (初期値はnull)
    unitStats: {},           // unitId -> unitStats
    unitRotationBag: []      // ローテーション出題用のbag
  };
}

function createNewProfile(id, name, grade, character = "cat", taste = "standard", gender = "", nickname = "") {
  const gradeNum = parseInt(grade, 10) || 1;
  const gradeProgress = {};

  // 1〜6年生の進捗スロットを用意
  for (let g = 1; g <= 6; g++) {
    gradeProgress[`grade${g}`] = createGradeProgress(g);
  }

  return {
    identity: {
      id: id || `p_${Date.now()}`,
      name: name || "チャレンジャー",
      nickname: nickname || "", // V2.5.14: ニックネーム (未設定は空文字・表示時はnameにフォールバック)
      character: character,
      gender: gender,
      taste: taste,
      createdAt: new Date().toISOString()
    },
    points: {
      total: 0,
      achievementLevel: 1
    },
    skill: {
      subject: {
        currentGrade: gradeNum,
        gradeProgress: gradeProgress
      }
    },
    streaks: {
      correctStreak: 0,
      bestStreak: 0,
      dailyStreak: 0,       // V2.5.15: 連続学習日数
      bestDailyStreak: 0,   // V2.5.15: 最高連続学習日数
      lastStudyDate: ""     // V2.5.15: 最終学習日 (YYYY-MM-DD)
    },
    history: [],      // 完了したquestionInstanceの履歴
    reviewQueue: [],  // unit単位の復習キュー (一意キー: subjectId + grade + unitId)
    tests: [],        // テスト履歴
    badges: [],       // 獲得バッジID配列
    settings: {
      sound: true,
      fontSize: "medium",
      theme: "default",
      parentPin: "", // V2.5.11: 保護者モード用4桁PIN (未設定は空文字)
      figureEnabled: true // V2.6.4: 図形問題の出題ON/OFF (既定ON)
    }
  };
}

function createInitialAppState() {
  const defaultProfile = createNewProfile("p_default", "チャレンジャー", 1);
  return {
    schemaVersion: "2.5.6",
    profiles: [defaultProfile],
    activeProfileId: defaultProfile.identity.id,
    appMeta: {
      appVersion: "V2.6.7",
      generationMode: "rule_based",
      features: {}
    }
  };
}

/**
 * データ構造の整合性検証（Validator）
 * 第38.23章・第38.25.6章 準拠
 */
function validateAppState(state) {
  if (!state || typeof state !== "object") {
    return { valid: false, error: "State must be a non-null object." };
  }

  if (state.schemaVersion !== "2.5.6") {
    return { valid: false, error: `Invalid schemaVersion: expected '2.5.6', got '${state.schemaVersion}'` };
  }

  if (!Array.isArray(state.profiles)) {
    return { valid: false, error: "profiles must be an array." };
  }

  if (state.profiles.length > 0 && !state.activeProfileId) {
    return { valid: false, error: "activeProfileId is required when profiles exist." };
  }

  for (const profile of state.profiles) {
    if (!profile.identity || !profile.identity.id) {
      return { valid: false, error: "Profile missing identity.id." };
    }
    if (!profile.skill || !profile.skill.subject || !profile.skill.subject.gradeProgress) {
      return { valid: false, error: `Profile ${profile.identity.id} missing gradeProgress.` };
    }
    if (!Array.isArray(profile.reviewQueue)) {
      return { valid: false, error: `Profile ${profile.identity.id} reviewQueue must be an array.` };
    }
    if (!Array.isArray(profile.history)) {
      return { valid: false, error: `Profile ${profile.identity.id} history must be an array.` };
    }
    // incorrectStreak の混入チェック (V2.5.10仕様: 除外必須)
    if (profile.streaks && typeof profile.streaks.incorrectStreak !== "undefined") {
      return { valid: false, error: `Profile ${profile.identity.id} must not contain incorrectStreak.` };
    }
    // reviewQueue一意性検証 (subjectId + grade + unitId の active 重複禁止)
    const activeKeys = new Set();
    for (const item of profile.reviewQueue) {
      if (item.status === "active") {
        const key = `${item.subjectId || "math"}_${item.grade}_${item.unitId}`;
        if (activeKeys.has(key)) {
          return { valid: false, error: `Duplicate active reviewQueue entry found for key: ${key}` };
        }
        activeKeys.add(key);
      }
    }
  }

  return { valid: true };
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    createInitialUnitStats,
    createGradeProgress,
    createNewProfile,
    createInitialAppState,
    validateAppState
  };
} else {
  window.createInitialUnitStats = createInitialUnitStats;
  window.createGradeProgress = createGradeProgress;
  window.createNewProfile = createNewProfile;
  window.createInitialAppState = createInitialAppState;
  window.validateAppState = validateAppState;
}

