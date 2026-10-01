# 小学生向け算数学習アプリ — 概要仕様書

**バージョン**: V2.9.0  
**スキーマバージョン**: 2.5.6  
**種別**: PWA（Progressive Web App）— サーバー不要・ブラウザのみで動作  
**対象**: 小学1〜6年生

---

## 1. アーキテクチャ概要

```
index.html
├── css/app.css                    ← スタイルシート
└── js/
    ├── config.js                  ← アプリ設定・フィーチャーフラグ
    ├── registries.js              ← 単元/バッジ/テンプレートのマスタ定義
    ├── schema.js                  ← データスキーマ・初期化・バリデーション
    ├── migration.js               ← スキーマバージョンアップ処理
    ├── storage.js                 ← localStorage 読み書き・import/export
    ├── validator.js               ← 問題インスタンスのバリデーション
    ├── templates_math.js          ← 問題テンプレート群（104KB）
    ├── question_source.js         ← ルールベース問題生成エンジン
    ├── learning_score_engine.js   ← 1問あたりの学習スコア算出
    ├── learning_engine.js         ← unitStats・masteryScore・日次ストリーク更新
    ├── unit_selector.js           ← 次の出題単元選択
    ├── diversity_selector.js      ← 問題多様性フィルタ（V2.6.12: ui.js の出題選択に接続済み）
    ├── review_engine.js           ← 復習キュー管理（間隔反復）
    ├── level_engine.js            ← 難易度レベル上下判定
    ├── gamification_engine.js     ← ポイント・バッジ・達成レベル
    ├── test_engine.js             ← テスト生成・採点
    ├── session_coordinator.js     ← 1問完了の原子的処理
    ├── parent_dashboard.js        ← 保護者向けダッシュボード集計
    ├── audio.js                   ← 音響
    └── ui.js                      ← UIコントローラー（63KB）
```

データはすべて `localStorage` に保存される（キー: `math_study_app_v2510_state`）。

---

## 2. 学習コンテンツ

### 学年・難易度構成

各学年に **Lv1（基礎）/ Lv2（標準）/ Lv3（発展）** の3段階がある。

| 学年 | Lv1（基礎） | Lv2（標準） | Lv3（発展） |
|------|------------|------------|------------|
| **1年** | 1桁たし算（繰上なし）、1桁ひき算（繰下なし）、10の合成・分解 | 1桁たし算（繰上あり）、10いくつかのひき算 | 3つの数の計算（10まで・20まで） |
| **2年** | 2桁たし算・ひき算（繰上なし）、長さ（cm・mm）、大きな数（10000まで）、時刻と時間、分数（2年）、はこの形、図形 | 2桁たし算・ひき算（繰上あり）、九九（2〜5のだん）、かさ（L・dL・mL）、計算のくふう、計算の見積もり | 九九（6〜9のだん）、3つの数のたし算・ひき算、2段階計算 |
| **3年** | 九九まとめ、3桁たし算・ひき算 | 2桁×1桁のかけ算、わり算（あまりなし） | わり算（あまりあり）、かけ算・わり算の2段階計算 |
| **4年** | 2桁×2桁のかけ算、小数のしくみ | 3桁÷1桁のわり算、小数のたし算・ひき算 | 四則混合計算（カッコあり）、小数×整数 |
| **5年** | 同分母分数のたし算・ひき算、約分・倍数・約数 | 異分母分数のたし算・ひき算、小数×小数 | 割合・百分率、分数のかけ算 |
| **6年** | 帯分数の計算、分数のわり算 | 分数の四則混合計算、比とその利用 | 割合の文章題・割引・割増、速さ・時間・道のり |

**問題タイプ**: `calculation`（計算問題）、`word_problem`（文章題）

---

## 3. エンジン仕様

### 3-1. 学習スコア（`LearningScoreEngine`）

1問ごとに `learningScore` (0.0〜1.0) を算出する。

| 回答状況 | learningScore |
|---------|--------------|
| 初回正解（ヒントなし） | **1.0** |
| ヒントなし・再回答で正解（2〜3回目） | **0.7** |
| ヒント使用後に正解 | **0.5** |
| 3回回答して不正解 | **0.0** |

### 3-2. 習熟度スコア（`masteryScore`）

- 初回: `masteryScore = learningScore`
- 2回目以降: `masteryScore = old × 0.7 + learningScore × 0.3`（指数移動平均）

### 3-3. 単元選択フロー（`UnitSelector`）

優先順位は以下のとおり。

```
① 復習キューに期限超過の項目がある → 復習問題を出題
② 復習キューに当日期限の項目がある → 復習問題を出題
③ 学習開始から14日未満（Coverageフェーズ）
   → ローテーションバッグから均等に出題
④ 学習開始から14日以降（Weaknessフェーズ）
   → 40% ローテーション + 60% 弱点重み付け出題
      （弱点 weight = 1 + max(0, 0.80 - accuracy) × 3）
```

### 3-4. レベルアップ・ダウン（`LevelEngine`）

**前提条件**: 現レベルの全単元の60%以上に各5回以上取り組んでいること

| 条件 | 判定 |
|------|------|
| mastery平均 ≥ 0.75 **かつ** 直近5問 learningScore平均 ≥ 0.70 | **レベルアップ**（Lv3上限） |
| mastery平均 < 0.35 **かつ** 直近5問 learningScore平均 < 0.40 | **レベルダウン**（Lv1下限） |
| Lv3でアップ条件達成 | **学年変更促進通知** |

レベル変更時はローテーションバッグをリセットする。

### 3-5. 復習キュー（`ReviewEngine`）

**登録トリガー**

| トリガー | 条件 |
|---------|------|
| A | 3回目不正解 |
| B | attempts ≥ 5 かつ masteryScore < 0.50 |
| C | テストで不正解だった単元（自動登録） |

**間隔スケジュール（間隔反復）**

```
1日 → 3日 → 7日 → 14日
```

**卒業条件**: `successCount ≥ 3` かつ `intervalDays = 14`  
**復帰**: 卒業済み単元が再トリガーされた場合は `active` に戻して再利用

**V2.6.12 導線追加**: 復習・履歴画面の復習待ち単元、および保護者ダッシュボードの弱点単元から
「⚡ 5問とっくん / 🚀 10問とっくん」でその単元の集中特訓（`startUnitPracticeSession`）へ直結できる。

### 3-6. 問題多様性（`DiversitySelector`）

- 直近1問と同一パターン（Level 3）は禁止
- 直近3問で同一パターン（Level 3）は禁止・Level 2 は回避
- 直近5問で同一コンテキストを可能な限り回避

**V2.6.12 接続仕様**

- `RuleBasedQuestionSource` は生成した問題インスタンスに `story` / `variationGroupId` / `similarityGroupId` を伝搬する（判定の前提データ）
- `ui.js` の `startLearningSession` / `startUnitPracticeSession` は `_pickDiverseTemplate()` を経由し、
  デッキ先頭の最大4候補から `DiversitySelector.selectDiverseCandidate()` で最も多様な問題を選択する
- 候補が枯渇する場合は `DiversitySelector` 内部の緩和ルール → 直近3問のテンプレート回避 → ランダム の順にフォールバックする（問題数は常に確保）
- `DiversitySelector` 未ロード環境では従来のテンプレート重複回避ロジックで動作する

### 3-7. バージョン整合チェック（`scripts/check_version.js`）

`npm run check:version` でバージョン表記のズレを検出する（リリース手順の一部）。

- 突合対象: `js/config.js`（`appVersion` / `schemaVersion`）、`js/migration.js`（フォールバック値）、
  `sw.js`（`CACHE_NAME`）、`index.html` / `dist/index.html`（`<title>`）、`tests/test_phase1.js`、
  `test_phase1.html`、`app_overview.md`
- 不一致がある場合は内容を一覧表示し、終了コード 1 で失敗する

---

## 4. テスト機能（`TestEngine`）

- **問題数**: 10問固定
- **出題配分**: 直近学習単元 60%（6問）+ 弱点単元 40%（4問）
- **回答**: 1問1回のみ（再回答・ヒントなし）
- **合格基準**: 正答率 80% 以上
- **ポイント**: `(basePoint + difficultyBonus) × 2.0倍`（ストリークボーナスなし）
- **テスト不正解単元**は自動で復習キューに登録（トリガーC）
- テスト完了は通常学習のunitStats・masteryScore・ストリークには影響しない

---

## 5. ゲーミフィケーション（`GamificationEngine`）

### ポイント計算（通常学習）

```
獲得ポイント = basePoint(10) + difficultyBonus + streakBonus

difficultyBonus: Lv1=0pt / Lv2=5pt / Lv3=10pt
streakBonus: 3連続正解=+5pt / 5連続以上=+10pt（重複加算なし）
※ 不正解・ヒント使用でも正解なら満額取得
```

### 達成レベル（キャラクター成長）

| 累計ポイント | 達成レベル |
|------------|-----------|
| 0〜79 pt | Lv1 |
| 80〜149 pt | Lv2 |
| 150〜249 pt | Lv3 |
| 250〜399 pt | Lv4 |
| 400 pt 以上 | Lv5 |

### バッジ一覧

| バッジID | 名称 | 条件 |
|---------|------|------|
| `first_step` | はじめの一歩 | 初めて1問クリア |
| `streak_5` | 集中マスター | 5問連続正解 |
| `points_100` | ポイント100突破 | 累計100pt到達 |
| `test_pass` | テスト合格者 | テストで80%以上正解して合格 |
| `kuku_master` | 九九マスター | 九九まとめで正答率90%以上（20問以上） |

---

## 6. 1問完了の原子的処理（`SessionCoordinator`）

1問の回答完了時に以下14ステップを原子的に実行し、**1回のsaveStateで保存**する。

```
1.  回答結果・attemptCount の確定
2.  learningScore の算出（LearningScoreEngine）
3.  unitStats の更新（attempts, correct, accuracy, masteryScore）
4.  learningStartDate の初回設定
5.  復習キューの更新（登録トリガー判定 or 復習結果反映）
6.  correctStreak・bestStreak の更新
7.  dailyStreak（連続学習日数）の更新
8.  ポイントの計算・加算
9.  履歴レコードの追加
10. 達成レベルの再計算
11. バッジ判定・付与
12. レベルアップ/ダウン判定
13. バリデーション
14. localStorage への原子的保存
```

---

## 7. データ構造（プロフィール）

```json
{
  "identity": { "id", "name", "nickname", "character", "gender", "taste", "createdAt" },
  "points": { "total", "achievementLevel" },
  "skill": {
    "subject": {
      "currentGrade": 1,
      "gradeProgress": {
        "grade1": {
          "difficultyLevel": 1,
          "learningStartDate": null,
          "unitStats": { "unitId": { "attempts", "correct", "accuracy", "masteryScore" } },
          "unitRotationBag": []
        }
        // grade2 〜 grade6 も同様
      }
    }
  },
  "streaks": { "correctStreak", "bestStreak", "dailyStreak", "bestDailyStreak", "lastStudyDate" },
  "history": [],       // 完了した問題インスタンスの履歴
  "reviewQueue": [],   // 復習キュー（一意キー: subjectId + grade + unitId）
  "tests": [],         // テスト履歴
  "badges": [],        // 獲得バッジID配列
  "settings": { "sound", "fontSize", "theme", "parentPin" }
}
```

---

## 8. 保護者ダッシュボード（`ParentDashboard`）

- **認証**: 4桁数字PIN（未設定の場合は空文字）
- **単元ステータス分類**: `not_started` / `learning` / `weak` (accuracy < 0.80) / `achieved`
- **学習推移グラフ**: 直近14日分・3モード（通常学習のみ / テストのみ / 全体合算）
- **表示内容**: 単元別進捗、弱点単元一覧、学年別サマリー、直近10件履歴、直近3回テスト、バッジ一覧
- **デイリー目標**: 1日5問（通常学習のみカウント）

---

## 9. フィーチャーフラグ（`config.js`）

| フラグ | 状態 |
|--------|------|
| `tests` | ✅ 有効 |
| `parentMode` | ✅ 有効 |
| `wordProblems` | ✅ 有効 |
| `figureProblems` | ❌ 無効 |
| `claudeApi` | ❌ 無効 |

---

## 10. V2.9.0 筆算支援（`HissanSVG`）

### 10.1 概要

加減乗除の**筆算（ひっ算）**を教科書の書き方に従ってSVGで描画する共通部品。
2〜4年生の計算単元（加算・減算・乗算・除算）に段階導入する。

### 10.2 ファイル構成

| ファイル | 役割 |
|----------|------|
| `js/hissan_svg.js` | 新規。筆算レイアウト計算とSVG描画（`ClockSVG` と同じ責務分離） |
| `js/templates_math.js` | 対象7テンプレに `hissanSpec` を1行付与 |
| `js/question_source.js` | `hissanSpec` を持つテンプレに筆算HTMLを付与 |
| `js/ui.js` | 学習/テスト画面・ヒント/解説モーダルに表示 |
| `css/app.css` | `.hissan-stage` スタイル |
| `tests/test_hissan.js` | 新規。9セクション83アサーション |
| `test_hissan.html` | 新規。ブラウザでの目視確認ページ |

### 10.3 公開API

```
HissanSVG.OPS                    対応演算 ["add","sub","mul","div"]
HissanSVG.LAYOUT / COLORS        レイアウト寸法・配色
HissanSVG.fillSpecVars(spec, vars)  spec 内の "{a}" を生成変数で置換
HissanSVG.resolve(spec, opts)      行・桁の構造化モデル（描画の唯一の情報源）
HissanSVG.render(spec, opts)       筆算SVG文字列
HissanSVG.buildDisplay(spec, vars) question_source から呼ぶ組み立て
HissanSVG.answerDigits(value)      数値→桁配列
HissanSVG.addCarry / borrowDown / mulParts  繰り上がり・繰り下がり・部分積
HissanSVG.equalsAnswer(a, b)       回答比較（先頭0/全角を吸収）
```

### 10.4 4演算の行構成

| op | 行 | 特殊表記 |
|----|-----|----------|
| `add` | a / +b / 罫線 / 答え | 繰り上がりは行頭に小さな `1`（青） |
| `sub` | a / −b / 罫線 / 答え | 繰り下がりは**数字でなく中黒 `・`**（教科書表記） |
| `mul` | a / ×b / 罫線 / 部分積 / 罫線 / 答え | 部分積は1桁右寄せ（桁送り） |
| `div` | 商（`_` 罫線つき）/ 被除数 / ÷b / あまり | 通常表示では商のマスは空 |

### 10.5 段階表示

| タイミング | 変数 | 内容 |
|------------|------|------|
| 通常（出題時） | `hissanHTML` | 被加数/被減数 ＋ **答えの行が空** |
| ヒント（2回目誤答） | `hissanHintHTML` | ＋ 繰り上がり行 / 繰り下がり行 / 部分積 |
| 解説（正解 or 3回目誤答） | `hissanSolutionHTML` | ＋ 答えが埋まった完成版（強調色） |

**答えはSVGへ埋め込まず**、`answerText` として questionInstance に保持する。

### 10.6 導入テンプレ（7本）

| templateId | 学年 | 演算 | 単元 |
|-------------|------|------|------|
| `g2_basic_add_01` | 2 | add | add_2digit_no_carry |
| `g2_basic_sub_01` | 2 | sub | sub_2digit_no_borrow |
| `g2_std_add_carry_01` | 2 | add | add_2digit_carry |
| `g2_std_sub_borrow_01` | 2 | sub | sub_2digit_borrow |
| `g3_std_mul21_01` | 3 | mul | mul_2digit_1digit |
| `g4_basic_mul22_01` | 4 | mul | mul_2digit_2digit |
| `g4_std_div31_01` | 4 | div | div_3digit_1digit_remainder |

**`answerType` は変更しない**（`number_input` のまま）。筆算の有無は `template.hissanSpec` の有無で判定するため、
既存の数値入力フローに影響しない（回答は `_renderNumpad` にフォールスルーする）。

### 10.7 併せて修正した既存バグ（変数生成の制約違反）

`RuleBasedQuestionSource._generateVariables` の「変数ごとに最大20回リトライ」は、
制約が**原理的に不可能**な組み合わせ（例: `(a%10)+(b%10)>=10` のとき `a%10==0` が出ると
`b%10` の最大値が9なので何を引き直しても成立しない）では必ず失敗し、
**違反値をそのまま採用していた**。

実測では `add_2digit_carry` 単元で **11.7%**、`sub_2digit_borrow` 単元で **8.7%** の問題が
「繰り上がりあり/繰り下がりあり」の単元なのに、繰り上がりの無い問題になっていた。

修正は**2段構え**（既存146テンプレの生成分布を一切変えない）:

1. まず従来ロジックで1回生成する（従来成功していたテンプレは 100% ここで成功し分布も同一）
2. 制約違反時のみ**ルール全体をまとめて引き直す**（最大50回）→ 不可能な組み合わせが自然に見除かれる
3. 50回でも満たせない場合は従来と同じ「最後の値を返す」でフォールバック

**修正後**: 41件の制約テンプレすべて **0違反**、既存21テスト green。

### 10.8 今後の予定

| リリース | 内容 |
|----------|------|
| V2.10.0 | `hissan_input`：桁マス専用入力（最終答え行のみ採点） |
| V2.11.0 | 繰り上がりマス・途中積まで入力を拡張 |

