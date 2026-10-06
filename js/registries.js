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
  static learningGroups = {
    math: {
      2: {
        addition_subtraction: "たし算・ひき算",
        multiplication: "かけ算・九九",
        geometry: "図形",
        calculation_application: "計算の活用"
      }
    }
  };

  static legacyUnitIdMap = {
    math: {
      2: {
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
      }
    }
  };

  static legacyUnitDisplayNames = {
    math: {
      2: {
        add_2digit_no_carry: "2けたのたし算（くり上がりなし）",
        add_2digit_carry: "2けたのたし算（くり上がりあり）",
        sub_2digit_no_borrow: "2けたのひき算（くり下がりなし）",
        sub_2digit_borrow: "2けたのひき算（くり下がりあり）",
        add_sub_inverse: "たし算・ひき算の逆算",
        calc_idea_basic: "計算のくふう（まとめて計算）",
        estimation_basic: "計算の見積もり（およその数）",
        add_3terms_2digit: "3つの数のたし算・ひき算",
        add_sub_2digit_2step: "2けたの2段階計算",
        kuku_intro: "かけ算のいみと九九（2〜5のだん）",
        kuku_partial: "九九の応用・発展",
        box_shape: "はこの形（面・辺・ちょう点）",
        shape_tri_quad: "図形（三角形と四角形）",
        shape_figure_tap: "図形（辺・頂点を さがそう）",
        shape_figure_measure: "図形（図から 長さや 数を みよう）"
      }
    }
  };

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
          { id: "addition_2digit", name: "2けたのたし算", concepts: ["add_2digit_basic", "add_2digit_carry"], learningGroupId: "addition_subtraction" },
          { id: "subtraction_2digit", name: "2けたのひき算", concepts: ["sub_2digit_basic", "sub_2digit_borrow"], learningGroupId: "addition_subtraction" },
          { id: "length_unit", name: "長さの単位（cm・mm）", concepts: ["length_convert_basic", "length_convert_m_cm"] },
          { id: "big_number_10000", name: "大きな数（3けた・10000まで）", concepts: ["place_value_1000", "big_number_read_write", "big_number_compare"] },
          { id: "time_clock_basic", name: "時こくと時間", concepts: ["time_minute_convert_g2", "time_duration_forward", "time_duration_between"] },
          { id: "fraction_intro", name: "分数（2年）", concepts: ["fraction_denominator", "fraction_compare_basic"] },
          { id: "geometry_g2", name: "図形", concepts: ["box_faces_edges_vertices", "box_face_shape", "box_net_basic", "tri_quad_identify", "rect_square_identify"], learningGroupId: "geometry" },
          { id: "multiplication_g2", name: "かけ算・九九", concepts: ["kuku_basic_groups", "kuku_groups_intro"], learningGroupId: "multiplication" }
        ],
        2: [
          { id: "addition_2digit", name: "2けたのたし算", concepts: ["add_2digit_basic", "add_2digit_carry"], learningGroupId: "addition_subtraction" },
          { id: "subtraction_2digit", name: "2けたのひき算", concepts: ["sub_2digit_basic", "sub_2digit_borrow"], learningGroupId: "addition_subtraction" },
          { id: "length_unit", name: "長さの単位（cm・mm）", concepts: ["length_add_sub_mixed"] },
          { id: "time_clock_basic", name: "時こくと時間", concepts: ["time_duration_across_hour"] },
          { id: "fraction_intro", name: "分数（2年）", concepts: ["fraction_compare_pictures"] },
          { id: "multiplication_g2", name: "かけ算・九九", concepts: ["kuku_basic_groups", "kuku_groups_intro"], learningGroupId: "multiplication" },
          { id: "volume_unit", name: "かさの単位（L・dL・mL）", concepts: ["volume_convert_basic", "volume_compare_basic"] },
          { id: "calc_application", name: "計算の活用", concepts: ["add_sub_missing_number", "calc_idea_make_10", "calc_idea_make_100", "calc_idea_sub_together", "estimation_round10_add", "estimation_round100_mul"], learningGroupId: "calculation_application" },
          { id: "geometry_g2", name: "図形", concepts: ["box_faces_edges_vertices", "box_face_shape", "box_net_basic", "tri_quad_identify", "rect_square_identify", "tri_quad_tap_vertex", "tri_quad_tap_edge"], learningGroupId: "geometry" }
        ],
        3: [
          { id: "multiplication_g2", name: "九九の応用・発展", concepts: ["kuku_advanced_groups", "kuku_mastery"], learningGroupId: "multiplication" },
          { id: "calc_application", name: "計算の活用", concepts: ["three_terms_2digit", "two_step_2digit", "working_backwards"], learningGroupId: "calculation_application" },
          { id: "geometry_g2", name: "図形", concepts: ["tri_quad_count_parts", "tri_quad_grid_length"], learningGroupId: "geometry" }
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
          { id: "time_unit", name: "時間の単位（時・分・秒）", concepts: ["time_convert_calc", "clock_read_24h", "clock_time_after_h", "clock_duration_hm", "clock_to_minutes"] }
        ],
        3: [
          { id: "div_with_remainder", name: "わり算（あまりあり）", concepts: ["division_with_remainder"] },
          { id: "mixed_mul_div_2step", name: "かけ算・わり算の2段階計算", concepts: ["mixed_mul_div"] },
          { id: "div_no_remainder", name: "わり算の逆向き問題（総数を求める）", concepts: ["division_equal_share"] },
          { id: "kuku_all", name: "九九の応用パズル", concepts: ["kuku_mastery", "cryptarithmetic"] },
          // V2.7.0: 図形タップ問題 (answerType: "figure_tap") の3年生向け単元
          { id: "angle_figure", name: "角と三角形（図形タップ）", concepts: ["angle_right_vertex", "angle_right_all", "tri_longest_side"] },
          { id: "area_grid_figure", name: "面積と方眼（図形タップ）", concepts: ["area_square_sides", "area_rect_sides", "area_square_equal_sides"] },
          { id: "solid_net_figure", name: "立体と展開図（図形タップ）", concepts: ["solid_visible_faces", "solid_top_face", "net_fold_lines"] }
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

  static getLearningGroupLabel(subjectId, grade, groupId) {
    return this.learningGroups[subjectId]?.[grade]?.[groupId] || null;
  }

  static getCanonicalUnitId(subjectId, grade, unitId) {
    return this.legacyUnitIdMap[subjectId]?.[grade]?.[unitId] || unitId;
  }

  static findUnit(subjectId, grade, unitId) {
    if (!this.units[subjectId] || !this.units[subjectId][grade]) return null;
    const canonicalId = this.getCanonicalUnitId(subjectId, grade, unitId);
    for (const level of [1, 2, 3]) {
      const list = this.units[subjectId][grade][level] || [];
      const found = list.find(u => u.id === canonicalId);
      if (found) {
        return {
          ...found,
          name: this.legacyUnitDisplayNames[subjectId]?.[grade]?.[unitId] || found.name,
          difficultyLevel: level,
          grade
        };
      }
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
