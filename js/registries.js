/**
 * Registries Layer
 * V2.5.10 詳細設計書 第5章・第6章・第21章・第25章 準拠
 * 
 * - SubjectRegistry
 * - UnitRegistry (Grade 1~6 unit & concept mappings)
 * - ProblemTypeRegistry (calculation, word_problem)
 * - BadgeRegistry
 * - TemplateRegistry
 */

class SubjectRegistry {
  static subjects = {
    math: {
      id: "math",
      name: "算数",
      grades: [1, 2, 3, 4, 5, 6]
    }
  };

  static get(subjectId) {
    return this.subjects[subjectId] || null;
  }
}

class UnitRegistry {
  // grade -> difficultyLevel (1:基礎, 2:標準, 3:発展) -> unit definitions
  static units = {
    math: {
      1: {
        1: [
          { id: "add_1digit_no_carry", name: "1けたのたし算（くり上がりなし）", concepts: ["add_basic", "combine_numbers"] },
          { id: "sub_1digit_no_borrow", name: "1けたのひき算（くり下がりなし）", concepts: ["sub_basic", "take_away"] },
          { id: "number_bond_10", name: "10の合成・分解", concepts: ["number_bond_10"] },
          { id: "shape_basic", name: "図形（かたちをみつけよう）", concepts: ["shape_identify_basic", "shape_select_all", "shape_compare_size"] }
        ],
        2: [
          { id: "add_1digit_carry", name: "1けたのたし算（くり上がりあり）", concepts: ["add_carry_10"] },
          { id: "sub_teen_borrow", name: "10いくつかのひき算（くり下がりあり）", concepts: ["sub_borrow_10"] }
        ],
        3: [
          { id: "add_sub_3terms_10", name: "3つのかずのけいさん（10まで）", concepts: ["three_terms_add_sub"] },
          { id: "add_sub_3terms_20", name: "3つのかずのけいさん（20まで）", concepts: ["three_terms_add_sub_20"] }
        ]
      },
      2: {
        1: [
          { id: "add_2digit_no_carry", name: "2けたのたし算（くり上がりなし）", concepts: ["add_2digit_basic"] },
          { id: "sub_2digit_no_borrow", name: "2けたのひき算（くり下がりなし）", concepts: ["sub_2digit_basic"] },
          { id: "length_unit", name: "長さの単位（cm・mm）", concepts: ["length_convert_basic"] }
        ],
        2: [
          { id: "add_2digit_carry", name: "2けたのたし算（くり上がりあり）", concepts: ["add_2digit_carry"] },
          { id: "sub_2digit_borrow", name: "2けたのひき算（くり下がりあり）", concepts: ["sub_2digit_borrow"] },
          { id: "kuku_intro", name: "かけ算のいみと九九（2〜5のだん）", concepts: ["kuku_basic_groups"] },
          { id: "volume_unit", name: "かさの単位（L・dL・mL）", concepts: ["volume_convert_basic"] }
        ],
        3: [
          { id: "kuku_partial", name: "九九（6〜9のだん）", concepts: ["kuku_advanced_groups"] },
          { id: "add_3terms_2digit", name: "3つの数のたし算・ひき算", concepts: ["three_terms_2digit"] },
          { id: "add_sub_2digit_2step", name: "2けたの2段階計算", concepts: ["two_step_2digit", "working_backwards"] }
        ]
      },
      3: {
        1: [
          { id: "kuku_all", name: "九九のまとめ", concepts: ["kuku_mastery"] },
          { id: "add_sub_3digit", name: "3けたのたし算・ひき算", concepts: ["add_sub_3digit_basic"] }
        ],
        2: [
          { id: "mul_2digit_1digit", name: "2けた×1けたのかけ算", concepts: ["mul_2digit_algorithm"] },
          { id: "div_no_remainder", name: "わり算（あまりなし）", concepts: ["division_equal_share", "division_by_multiplication"] },
          { id: "length_unit", name: "長さの単位（m・cm・km）", concepts: ["length_convert_m_km"] },
          { id: "weight_unit", name: "重さの単位（kg・g）", concepts: ["weight_convert_basic"] },
          { id: "time_unit", name: "時間の単位（時・分・秒）", concepts: ["time_convert_calc"] }
        ],
        3: [
          { id: "div_with_remainder", name: "わり算（あまりあり）", concepts: ["division_with_remainder"] },
          { id: "mixed_mul_div_2step", name: "かけ算・わり算の2段階計算", concepts: ["mixed_mul_div"] },
          { id: "div_no_remainder", name: "わり算の逆向き問題（総数を求める）", concepts: ["division_equal_share"] },
          { id: "kuku_all", name: "九九の応用パズル", concepts: ["kuku_mastery", "cryptarithmetic"] }
        ]
      },
      4: {
        1: [
          { id: "mul_2digit_2digit", name: "2けた×2けたのかけ算", concepts: ["mul_2digit_2digit_basic"] },
          { id: "decimal_read_write", name: "小数のしくみ・大小", concepts: ["decimal_basic_place_value"] }
        ],
        2: [
          { id: "div_3digit_1digit_remainder", name: "3けた÷1けたのわり算", concepts: ["div_3digit_algorithm"] },
          { id: "decimal_add_sub", name: "小数のたし算・ひき算", concepts: ["decimal_add_sub_basic"] },
          { id: "area_basic", name: "面積（長方形・正方形）", concepts: ["area_rectangle_square"] }
        ],
        3: [
          { id: "mixed_2step", name: "四則混合の計算（カッコあり）", concepts: ["order_of_operations", "pattern_recognition", "logical_deduction", "cryptarithmetic"] },
          { id: "decimal_mul_basic", name: "小数×整数の計算", concepts: ["decimal_mul_integer"] }
        ]
      },
      5: {
        1: [
          { id: "fraction_add_sub_same_denom", name: "同分母分数のたし算・ひき算", concepts: ["fraction_same_denom"] },
          { id: "fraction_simplify", name: "約分と倍数・約数", concepts: ["fraction_reduction", "gcd_lcm"] }
        ],
        2: [
          { id: "fraction_add_sub_diff_denom", name: "異分母分数のたし算・ひき算（通分）", concepts: ["fraction_diff_denom_common"] },
          { id: "decimal_mul", name: "小数×小数の計算", concepts: ["decimal_mul_algorithm", "fraction_decimal_compare"] },
          { id: "volume_basic", name: "体積（直方体・立方体）", concepts: ["volume_cuboid"] }
        ],
        3: [
          { id: "percentage_basic", name: "割合と百分率（パーセント）", concepts: ["percentage_ratio_concept"] },
          { id: "fraction_mul_integer", name: "分数のかけ算（基本）", concepts: ["fraction_mul_basic"] }
        ]
      },
      6: {
        1: [
          { id: "fraction_mixed_same_denom", name: "帯分数の計算", concepts: ["mixed_fraction_calc"] },
          { id: "fraction_div_basic", name: "分数のわり算（逆数のかけ算）", concepts: ["fraction_div_inverse"] }
        ],
        2: [
          { id: "fraction_mixed_diff_denom", name: "分数の四則混合計算", concepts: ["fraction_mixed_all"] },
          { id: "ratio_basic", name: "比とその利用", concepts: ["ratio_proportion_concept"] },
          { id: "circle_basic", name: "円の円周と面積（円周率3.14）", concepts: ["circle_circumference_area"] }
        ],
        3: [
          { id: "percentage_word", name: "割合の文章題・割引・割増", concepts: ["percentage_word_problems"] },
          { id: "ratio_speed_basic", name: "速さ・時間・道のり", concepts: ["speed_time_distance"] },
          { id: "ratio_basic", name: "比の応用・挑戦問題", concepts: ["ratio_proportion_concept"] }
        ]
      }
    }
  };

  static getUnitsForLevel(subjectId, grade, level) {
    if (!this.units[subjectId] || !this.units[subjectId][grade] || !this.units[subjectId][grade][level]) {
      return [];
    }
    return this.units[subjectId][grade][level];
  }

  static findUnit(subjectId, grade, unitId) {
    if (!this.units[subjectId] || !this.units[subjectId][grade]) return null;
    for (const level of [1, 2, 3]) {
      const list = this.units[subjectId][grade][level] || [];
      const found = list.find(u => u.id === unitId);
      if (found) return { ...found, difficultyLevel: level, grade };
    }
    return null;
  }
}

class ProblemTypeRegistry {
  static types = {
    calculation: { id: "calculation", label: "計算問題" },
    word_problem: { id: "word_problem", label: "文章題" }
  };

  static isValid(type) {
    return !!this.types[type];
  }
}

class BadgeRegistry {
  static badges = [
    {
      id: "first_step",
      label: "はじめの一歩",
      description: "はじめて問題を1問クリアした",
      condition: { type: "total_attempts", count: 1 }
    },
    {
      id: "streak_5",
      label: "集中マスター",
      description: "連続で5問正解した",
      condition: { type: "streak", count: 5 }
    },
    {
      id: "points_100",
      label: "ポイント100突破",
      description: "累計ポイントが100ptに到達した",
      condition: { type: "total_points", points: 100 }
    },
    {
      id: "test_pass",
      label: "テスト合格者",
      description: "テストで80%以上正解して合格した",
      condition: { type: "test_passed", count: 1 }
    },
    {
      id: "kuku_master",
      label: "九九マスター",
      description: "九九のまとめで正答率90%以上（20問以上）",
      condition: { type: "unit_accuracy", unit: "kuku_all", minAttempts: 20, minAccuracy: 0.9 }
    }
  ];

  static getAll() {
    return this.badges;
  }

  static get(badgeId) {
    return this.badges.find(b => b.id === badgeId) || null;
  }
}

class TemplateRegistry {
  static templates = {};

  static register(template) {
    if (!template || !template.templateId) {
      throw new Error("TemplateRegistry: templateId is required.");
    }
    this.templates[template.templateId] = template;
  }

  static get(templateId) {
    return this.templates[templateId] || null;
  }

  static getByUnit(subjectId, grade, difficultyLevel, unitId) {
    return Object.values(this.templates).filter(t => 
      t.grade === grade &&
      t.difficultyLevel === difficultyLevel &&
      t.unitId === unitId
    );
  }

  static clear() {
    this.templates = {};
  }
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    SubjectRegistry,
    UnitRegistry,
    ProblemTypeRegistry,
    BadgeRegistry,
    TemplateRegistry
  };
} else {
  window.SubjectRegistry = SubjectRegistry;
  window.UnitRegistry = UnitRegistry;
  window.ProblemTypeRegistry = ProblemTypeRegistry;
  window.BadgeRegistry = BadgeRegistry;
  window.TemplateRegistry = TemplateRegistry;
}

