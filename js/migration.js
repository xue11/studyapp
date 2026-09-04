/**
 * Schema Migration Layer
 * V2.5.10 詳細設計書 第31章 準拠
 * 
 * - migrateAppState(data)
 * - migrateProfile(profile, fromVersion, toVersion)
 * - 旧形式 -> 2.5.4 -> 2.5.6 への安全なデータ構造移行
 */

function migrateAppState(data) {
  if (!data || typeof data !== "object") {
    throw new Error("Migration: Invalid data format.");
  }

  let currentVersion = data.schemaVersion || "1.0.0";
  let state = JSON.parse(JSON.stringify(data)); // deep clone

  // 1.0.0 / 2.0.x / 2.5.x -> 2.5.4 への移行
  if (compareVersions(currentVersion, "2.5.4") < 0) {
    state = migrateTo254(state);
    currentVersion = "2.5.4";
  }

  // 2.5.4 -> 2.5.6 への移行
  if (compareVersions(currentVersion, "2.5.6") < 0) {
    state = migrateTo256(state);
    currentVersion = "2.5.6";
  }

  state.schemaVersion = "2.5.6";
  if (!state.appMeta) state.appMeta = {};
  state.appMeta.appVersion = "V2.5.14";

  // V2.5.14: 既存プロファイルに nickname が無い場合は空文字で補完 (表示時は name にフォールバック)
  if (Array.isArray(state.profiles)) {
    for (const p of state.profiles) {
      if (!p.identity) p.identity = {};
      if (typeof p.identity.nickname !== "string") p.identity.nickname = "";
    }
  }

  if (!state.activeProfileId && Array.isArray(state.profiles) && state.profiles.length > 0) {
    state.activeProfileId = state.profiles[0].identity?.id || "p_default";
  }

  return state;
}

function migrateTo254(state) {
  if (!Array.isArray(state.profiles)) {
    state.profiles = [];
    return state;
  }

  for (const profile of state.profiles) {
    const currentGrade = profile.skill?.subject?.currentGrade || 1;

    // subject直下の旧進捗を gradeProgress[currentGrade] へ移行
    if (!profile.skill) profile.skill = {};
    if (!profile.skill.subject) profile.skill.subject = { currentGrade: currentGrade, gradeProgress: {} };
    if (!profile.skill.subject.gradeProgress) profile.skill.subject.gradeProgress = {};

    // 1〜6年のスロットを確保
    for (let g = 1; g <= 6; g++) {
      const gKey = `grade${g}`;
      if (!profile.skill.subject.gradeProgress[gKey]) {
        profile.skill.subject.gradeProgress[gKey] = {
          difficultyLevel: (g === currentGrade && profile.skill.subject.difficultyLevel) ? profile.skill.subject.difficultyLevel : 1,
          learningStartDate: (g === currentGrade && profile.skill.subject.learningStartDate) ? profile.skill.subject.learningStartDate : null,
          unitStats: (g === currentGrade && profile.skill.subject.unitStats) ? profile.skill.subject.unitStats : {},
          unitRotationBag: (g === currentGrade && profile.skill.subject.unitRotationBag) ? profile.skill.subject.unitRotationBag : []
        };
      }
    }

    // 不要になった旧直下フィールドを削除
    delete profile.skill.subject.difficultyLevel;
    delete profile.skill.subject.learningStartDate;
    delete profile.skill.subject.unitStats;
    delete profile.skill.subject.unitRotationBag;

    // reviewQueueの補正 (grade付与)
    if (Array.isArray(profile.reviewQueue)) {
      for (const item of profile.reviewQueue) {
        if (!item.grade) {
          item.grade = currentGrade;
        }
        if (!item.subjectId) {
          item.subjectId = "math";
        }
      }
    } else {
      profile.reviewQueue = [];
    }

    // historyの補正 (attemptCountの補完)
    if (Array.isArray(profile.history)) {
      for (const h of profile.history) {
        if (typeof h.attemptCount === "undefined") {
          h.attemptCount = h.attempts || 1;
        }
        delete h.attempts; // historyはattemptCountに統一
      }
    } else {
      profile.history = [];
    }

    // incorrectStreak の除外 (仕様準拠)
    if (profile.streaks && typeof profile.streaks.incorrectStreak !== "undefined") {
      delete profile.streaks.incorrectStreak;
    }
  }

  return state;
}

function migrateTo256(state) {
  if (Array.isArray(state.profiles)) {
    for (const profile of state.profiles) {
      // streaksの確認
      if (profile.streaks && typeof profile.streaks.incorrectStreak !== "undefined") {
        delete profile.streaks.incorrectStreak;
      }
      // unitStatsの accuracy null化確認
      if (profile.skill?.subject?.gradeProgress) {
        for (const gKey in profile.skill.subject.gradeProgress) {
          const prog = profile.skill.subject.gradeProgress[gKey];
          if (prog.unitStats) {
            for (const uId in prog.unitStats) {
              const u = prog.unitStats[uId];
              if (u.attempts === 0) {
                u.accuracy = null;
              }
            }
          }
        }
      }
    }
  }
  return state;
}

function compareVersions(v1, v2) {
  const p1 = (v1 || "0").split(".").map(Number);
  const p2 = (v2 || "0").split(".").map(Number);
  for (let i = 0; i < Math.max(p1.length, p2.length); i++) {
    const num1 = p1[i] || 0;
    const num2 = p2[i] || 0;
    if (num1 > num2) return 1;
    if (num1 < num2) return -1;
  }
  return 0;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    migrateAppState,
    compareVersions
  };
} else {
  window.migrateAppState = migrateAppState;
  window.compareVersions = compareVersions;
}
