/**
 * Schema Migration Layer
 * V2.5.10 詳細設計書 第31章 準拠
 * 
 * - migrateAppState(data)
 * - migrateProfile(profile, fromVersion, toVersion)
 * - 旧形式 -> 2.5.4 -> 2.5.6 への安全なデータ構造移行
 */

/**
 * 現行アプリバージョンを config.js (APP_META) から取得する。
 * ハードコードするとリリース毎にズレるため、単一情報源として APP_META を参照し、
 * 取得できない環境ではフォールバック値を返す。
 */
function currentAppVersion() {
  // ブラウザ: config.js の top-level const / window.APP_META
  try {
    if (typeof APP_META !== "undefined" && APP_META && APP_META.appVersion) return APP_META.appVersion;
  } catch (e) { /* not defined */ }
  try {
    if (typeof window !== "undefined" && window.APP_META && window.APP_META.appVersion) return window.APP_META.appVersion;
  } catch (e) { /* not defined */ }
  // Node.js
  try {
    if (typeof require !== "undefined") {
      const cfg = require("./config.js");
      if (cfg && cfg.APP_META && cfg.APP_META.appVersion) return cfg.APP_META.appVersion;
    }
  } catch (e) { /* not available */ }
  return "V2.9.7";
}

const GRADE_2_UNIT_ID_MIGRATIONS = {
  add_2digit_no_carry: "addition_2digit",
  add_2digit_carry: "addition_2digit",
  sub_2digit_no_borrow: "subtraction_2digit",
  sub_2digit_borrow: "subtraction_2digit",
  add_sub_inverse: "calc_application",
  calc_idea_basic: "calc_application",
  estimation_basic: "calc_application",
  add_3terms_2digit: "calc_application",
  add_sub_2digit_2step: "calc_application",
  kuku_intro: "multiplication_g2",
  kuku_partial: "multiplication_g2",
  box_shape: "geometry_g2",
  shape_tri_quad: "geometry_g2",
  shape_figure_tap: "geometry_g2",
  shape_figure_measure: "geometry_g2"
};

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
  // V2.6.7: アプリバージョンは config.js (APP_META) を単一情報源とする
  state.appMeta.appVersion = currentAppVersion();

  // V2.5.14: 既存プロファイルに nickname が無い場合は空文字で補完 (表示時は name にフォールバック)
  if (Array.isArray(state.profiles)) {
    for (const p of state.profiles) {
      if (!p.identity) p.identity = {};
      if (typeof p.identity.nickname !== "string") p.identity.nickname = "";

      // V2.5.15: streaks に連続学習日数フィールドが無い場合は補完 (テストなしでは既存日数へ影響しない)
      if (!p.streaks) p.streaks = {};
      if (typeof p.streaks.dailyStreak !== "number") p.streaks.dailyStreak = 0;
      if (typeof p.streaks.bestDailyStreak !== "number") p.streaks.bestDailyStreak = 0;
      if (typeof p.streaks.lastStudyDate !== "string") p.streaks.lastStudyDate = "";

      // V2.6.4: 図形問題ON/OFFが無い既存プロファイルは既定ONで補完
      if (!p.settings) p.settings = {};
      if (typeof p.settings.figureEnabled !== "boolean") p.settings.figureEnabled = true;

      migrateGrade2UnitData(p);
    }
  }

  if (!state.activeProfileId && Array.isArray(state.profiles) && state.profiles.length > 0) {
    state.activeProfileId = state.profiles[0].identity?.id || "p_default";
  }

  return state;
}

function migrateGrade2UnitData(profile) {
  const gradeProgress = profile.skill?.subject?.gradeProgress?.grade2;
  if (gradeProgress) {
    if (gradeProgress.unitStats && typeof gradeProgress.unitStats === "object") {
      const stats = gradeProgress.unitStats;
      for (const [legacyId, canonicalId] of Object.entries(GRADE_2_UNIT_ID_MIGRATIONS)) {
        if (!Object.prototype.hasOwnProperty.call(stats, legacyId)) continue;
        const legacyStats = stats[legacyId] || {};
        const canonicalStats = stats[canonicalId];
        if (!canonicalStats) {
          stats[canonicalId] = { ...legacyStats };
        } else {
          const oldAttempts = Number(legacyStats.attempts) || 0;
          const currentAttempts = Number(canonicalStats.attempts) || 0;
          const attempts = oldAttempts + currentAttempts;
          const oldCorrect = Number(legacyStats.correct) || 0;
          const currentCorrect = Number(canonicalStats.correct) || 0;
          const totalCorrect = oldCorrect + currentCorrect;
          const oldWeight = Math.max(oldAttempts, 1);
          const currentWeight = Math.max(currentAttempts, 1);
          const weight = oldWeight + currentWeight;
          const masteryScore = (
            (Number(legacyStats.masteryScore) || 0) * oldWeight +
            (Number(canonicalStats.masteryScore) || 0) * currentWeight
          ) / weight;
          stats[canonicalId] = {
            ...legacyStats,
            ...canonicalStats,
            attempts,
            correct: totalCorrect,
            accuracy: attempts > 0 ? totalCorrect / attempts : null,
            masteryScore: Math.round(masteryScore * 1000) / 1000
          };
        }
        delete stats[legacyId];
      }
    }

    if (Array.isArray(gradeProgress.unitRotationBag)) {
      const mappedBag = gradeProgress.unitRotationBag.map(unitId =>
        GRADE_2_UNIT_ID_MIGRATIONS[unitId] || unitId
      );
      gradeProgress.unitRotationBag = [...new Set(mappedBag)];
    }
  }

  if (!Array.isArray(profile.reviewQueue)) return;
  const migratedReviews = [];
  const reviewIndexes = new Map();
  for (const item of profile.reviewQueue) {
    if (item.grade !== 2) {
      migratedReviews.push(item);
      continue;
    }

    const canonicalUnitId = GRADE_2_UNIT_ID_MIGRATIONS[item.unitId] || item.unitId;
    const isGroupedUnit = Object.values(GRADE_2_UNIT_ID_MIGRATIONS).includes(canonicalUnitId);
    if (!isGroupedUnit) {
      migratedReviews.push(item);
      continue;
    }
    item.unitId = canonicalUnitId;
    const key = `${item.subjectId || "math"}_${item.grade}_${item.unitId}`;
    const existingIndex = reviewIndexes.get(key);
    if (existingIndex === undefined) {
      reviewIndexes.set(key, migratedReviews.length);
      migratedReviews.push(item);
      continue;
    }

    const existing = migratedReviews[existingIndex];
    const activeEntries = [existing, item].filter(entry => entry.status === "active");
    const preferred = activeEntries.length
      ? activeEntries.reduce((a, b) => (a.dueAt || "").localeCompare(b.dueAt || "") <= 0 ? a : b)
      : existing;
    const dueDates = activeEntries.map(entry => entry.dueAt).filter(Boolean);
    migratedReviews[existingIndex] = {
      ...preferred,
      failCount: Math.max(Number(existing.failCount) || 0, Number(item.failCount) || 0),
      successCount: activeEntries.length
        ? Math.min(...activeEntries.map(entry => Number(entry.successCount) || 0))
        : Math.max(Number(existing.successCount) || 0, Number(item.successCount) || 0),
      intervalDays: activeEntries.length
        ? Math.min(...activeEntries.map(entry => Number(entry.intervalDays) || 1))
        : Math.max(Number(existing.intervalDays) || 1, Number(item.intervalDays) || 1),
      ...(dueDates.length ? { dueAt: dueDates.sort()[0] } : {})
    };
  }
  profile.reviewQueue = migratedReviews;
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
