# 小学生向け算数学習アプリ — 概要仕様書

**バージョン**: V2.9.17
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
| **2年** | 2桁たし算・ひき算（繰上・繰下なし）、かけ算の意味・まとまり、図形・はこの形、長さ（cm・mm）、大きな数（10000まで）、時刻と時間、分数（2年） | 2桁たし算・ひき算（繰上・繰下あり）、九九の基礎、図形（頂点の数）、計算の活用（逆算・計算のくふう・見積もり）、長さ・時間・分数の活用、かさ（L・dL・mL） | 九九の応用・逆算、計算の活用（3数計算・2段階文章題）、図形から数や長さを読み取る（文章題も含む） |
| **3年** | 九九（計算・逆算・文章題）、3桁たし算・ひき算（くり下がりなし） | かけ算（2桁×1桁）、わり算（あまりなし）、計算の活用（かけ算・わり算の選択）、長さ・重さの単位 | 3桁たし算・ひき算（くり上がり・くり下がり・文章題）、かけ算の応用、わり算（あまりあり）、計算の活用（2段階文章題） |
| **4年** | 2桁×2桁のかけ算、小数のしくみ | 3桁÷1桁のわり算、小数のたし算・ひき算 | 四則混合計算（カッコあり）、小数×整数 |
| **5年** | 同分母分数のたし算・ひき算、約分・倍数・約数 | 異分母分数のたし算・ひき算、小数×小数 | 割合・百分率、分数のかけ算 |
| **6年** | 帯分数の計算、分数のわり算 | 分数の四則混合計算、比とその利用 | 割合の文章題・割引・割増、速さ・時間・道のり |

**問題タイプ**: `calculation`（計算問題）、`word_problem`（文章題）

問題数の偏りを補う追加として、2年生はひき算Lv1・かけ算Lv1、長さ・時刻と時間・分数Lv2を中心に20型を追加し、図形Lv2/Lv3には図形表示を使わない問題も加えた。3年生は3けたのたし算・ひき算をLv1〜Lv3へ展開し、かけ算の各レベル、わり算、計算の活用Lv2/Lv3、長さ・重さLv2に計30型を追加した。

2年生の図形問題では、図形の選択肢に正誤を示す文字を表示せず、図形データから辺の数を判定する。箱の展開図は6面をSVGで表示し、折り目を点線で示す。

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
単元選択練習画面では、単元ごとに問題が登録されているLvを選んで5問または10問を練習できる。
複数Lvに問題がある単元は、従来どおり全Lvから出題する10問練習も選べる。復習・弱点単元からの練習は従来どおり全Lv対象。
2年生の単元選択では、たし算、ひき算、かけ算・九九、図形、計算の活用をそれぞれ一つのunitIdでレベル横断に扱う。たし算・ひき算はLv1が繰上・繰下なし、Lv2があり。九九はLv1がかけ算の意味、Lv2が九九の基礎、Lv3が応用。図形はLv1が基本図形とはこの形、Lv2が図を使った辺・頂点、Lv3が図からの数・長さの読み取り。計算の活用はLv2が逆算・計算のくふう・見積もり、Lv3が3数計算・2段階文章題を扱う。旧unitIdの進捗・復習データは新IDへ移行し、既存の問題履歴は書き換えず互換表示する。

3年生では、九九まとめと2けた×1けたを「かけ算」、あまりなし・あまりあり・逆向き問題を「わり算」、かけ算・わり算の2段階計算を「計算の活用」として系列IDを統合する。3けたのたし算・ひき算は既存の同一単元IDを維持し、系列として表示する。各問題の現在のレベルは変えず、進捗・復習・ローテーション情報のみ新IDへ移行する。既存の問題履歴は書き換えず、旧IDから単元名を引けるようにする。

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
| `kuku_master` | かけ算マスター | かけ算で正答率90%以上（20問以上） |

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

## 10. 筆算支援（`HissanSVG`）— V2.9.0 導入 / V2.9.1 表示修正 / V2.9.2 答えの段階表示修正 / V2.9.3 演算記号の余白修正 / V2.9.4 部分積1件のヒント漏洩修正

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
| `tests/test_hissan.js` | 新規。13セクション（先頭0・答え漏洩・演算記号余白・部分積1件漏洩の回帰検証を含む） |
| `test_hissan.html` | 新規。ブラウザでの目視確認ページ |

### 10.3 公開API

```
HissanSVG.OPS                    対応演算 ["add","sub","mul","div"]
HissanSVG.LAYOUT / COLORS        レイアウト寸法・配色（LAYOUT は opWidth / signX / signMinMargin を持つ）
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
| `mul` | a / ×b / 罫線 / 部分積 / 罫線 / 答え | 部分積は1桁右寄せ（桁送り）／`+` は最後の部分積の左。**部分積が1つだけのときは部分積行を作らない**（桁送り込みの表示値が答えそのものになるため。例: 23×10→23(1桁送り)=230） |
| `div` | 商（`_` 罫線つき）/ 被除数 / ÷b / あまり | 商・あまりは**解説表示でのみ**数値を描く |

### 10.5 段階表示（V2.9.2）

**答え（加減乗の答え・除算の商とあまり）の数字を描くのは「解説」だけ。**
出題時に答えが見えてしまう不具合を解消するため、段階ごとに見せる範囲を次のように固定する。

| 段階 | 変数 | 加減乗 | 除算 |
|------|------|--------|------|
| 通常（出題時） | `hissanHTML` | 被加数/被減数・加数/減数 ＋ **答えの行は空マス（破線の枠）** | 被除数・÷b ＋ **商のマスは空マス／あまり行なし** |
| ヒント（2回目の誤答） | `hissanHintHTML` | ＋ 繰り上がり行 / 繰り下がり行 / 部分積（**答えの行は空マスのまま**）。部分積が1つだけの乗算（23×4 / 23×10 / 45×20 等）は部分積＝答え（桁送り込みの表示値）になるため部分積行も無い | ＋ **商の先頭1桁だけ**（例 `142 ÷ 7` → `2 _`）／あまり行なし |
| 解説（正解 or 3回目の誤答） | `hissanSolutionHTML` | ＋ **答えが埋まった完成版**（赤太字） | ＋ **商の全桁**（赤太字）＋ あまり行 |

- 答えを数値で描くのは `solution` 段階のみ（`answerRowDigits` / `firstDigitOnly` が段階を判定する）。
- 空マスは `null` で表し、`digitCell` が薄い破線の枠だけを描く（＝書く場所は示すが数字は出さない）。
- わり算のヒントで商を全桁出すと**答えそのもの**になるため、先頭（最上位）の1桁だけに留める。
- ヒントを出しても答えは分からないので、「ヒント → 解説」で答えが新たに判明する段階設計が機能する
  （ヒント使用後の正解は `LearningScoreEngine` により 0.5 のまま）。

**答えの文字列はSVGへ埋め込まず**、`answerText` として questionInstance に保持する（採点の比較用）。

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

### 10.8 V2.9.1 先頭0が表示される不具合の修正

筆算の全テンプレで、値と無関係な**先頭の `0`** が表示されていた（例: `39 + 30` が `039 + 030 = 069`）。
原因は2つあり、桁数によって効き方が異なっていた。

| 原因 | 内容 | 影響する桁数 |
|------|------|--------------|
| ① 表示桁数の底上げ | `w = Math.max(..., 3)` で最低3桁を強制 | 2桁のみ（3桁以上は元から3桁以上になるため無関係） |
| ② `0` による右詰め | `padDigits` が桁数不足を `0` で埋めていた | **2〜5桁すべて** |

修正前の実測（ランダム200ケース / 先頭0が出た割合）:

| 桁数 | add | sub | mul | div |
|------|-----|-----|-----|-----|
| 2桁 | 100% | 100% | 100% | 100% |
| 3桁 | 57% | 23% | 100% | 100% |
| 4桁 | 62% | 20% | 100% | 100% |
| 5桁 | 65% | 24% | 100% | 100% |

修正内容:

1. `padDigits` の埋め草を `0` → `BLANK (= "")` に変更し、`digitCell` は `BLANK` を何も描画しない
2. 表示桁数の底上げ `Math.max(..., 3)` を撤廃（`39 + 30` は2桁幅で描画される）
3. 桁位置は配列長 `w` を維持したまま埋め草の文字だけを変えるため、**右端の桁位置はずれない**
4. 値の途中・末尾の `0` はそのまま描画する（`105` の `0`、答え `0` そのものを消さない）

併せて、乗算の部分積に付く `+` の位置を修正（教科書どおり**下の行**＝最上位桁の部分積の左に付ける。従来は上下が逆だった）。

回帰防止として `tests/test_hissan.js` のセクション10に「2〜5桁 × 4演算をランダム生成して先頭0が出ないこと」を追加。

### 10.9 V2.9.2 答えが問題画面に表示される不具合の修正

**症状**: 筆算の問題を表示した時点（1回目の回答前）で、答えの数字が問題の一部として見えていた。

**原因**: `resolve` が「答え行」の桁配列に、段階に関係なく**実際の答えの数字**を渡し、
`filled`（色・太さ）だけを `stage` で切り替えていた。`digitCell` は数字を受け取れば必ず描画するため、
通常表示でも答えが濃紺で描かれていた（空マスにしていたのはわり算の商だけだった）。

実測（V2.9.1 の `hissanHTML` に含まれる数字の並び）:

| 問題 | 表示されていた数字 | 漏洩していた答え |
|------|--------------------|------------------|
| `38 + 25` | `3 8 + 2 5 6 3` | 63 |
| `52 − 27` | `5 2 − 2 7 2 5` | 25 |
| `23 × 14` | `2 3 × 1 4 3 2 2` | 322 |
| `142 ÷ 7` | `1 4 2 ÷ 7 あまり 2` | あまり 2（商は空マスで正しかった） |

**修正**:

1. 答え行の桁を `answerRowDigits(value, w, stage)` で作り、**`solution` 以外はすべて `null`（空マス）**にする
2. わり算の商は `hint` では `firstDigitOnly`（先頭1桁だけ）、`solution` で全桁
3. わり算の「あまり」行は `solution` のみ（`rem > 0` でもヒントでは出さない）
4. 繰り上がり行／繰り下がり行は従来どおり `hint` 以上で表示（＝ヒントは「考え方」まで）
5. **部分積が1つだけの乗算では部分積が答えそのものになる**（`23 × 4` の部分積 = `92`、
   `45 × 20` の部分積 `90` を1桁送りで描いた表示値 = `900` = 答え）ため、
   部分積が1つだけのときは部分積行を作らない
   （ヒントで答えを見せてしまうのを防ぐ／解説で同じ数字が2行に並ぶのを避ける。
   V2.9.2 では桁送り無しの1件のみ除外し `23 × 10` の部分積 `23` は表示していたが、
   V2.9.4 で桁送り込みの表示値が答えに一致することに気付き1件は一律除外に変更）

回帰防止として `tests/test_hissan.js` のセクション11に、
「4演算 × 3段階について、SVGに**実際に描かれた数字の並び**」を検証するテストを追加した
（通常・ヒントでは答えの数字が1つも描かれず、解説では答えが描かれることを確認する）。
対象7テンプレの生成問題20問ずつで「出題時に答えが出ない」「ヒントの部分積が答えそのものではない」ことも検証する。

### 10.10 V2.9.3 演算記号（× ÷）の左端が欠けていた不具合の修正

**症状**: ヒント画面の乗算・除算で、演算記号 `×` / `÷` の**左側が切れて見えず**、環境によって見え方が違った。

**原因**: 演算記号を `LAYOUT.opWidth * 0.45`（＝`26 × 0.45` = **11.7**）に `text-anchor="middle"` で配置していた。
viewBox の左端は `x=0` なので、グリフ実幅が **24px を超えるとインク左端が負になり SVG に clip される**。
`×` (U+00D7) と `÷` (U+00F7) は East Asian Ambiguous 幅で、CJK 環境では全角（＝1em = 22px以上）になるため特に欠けやすい。

| グリフ幅 | 左余白（旧） | 右余白（旧） | 判定 |
|---|---|---|---|
| 12px（`＋` の十字部分） | 5.7px | 14.3px | OK |
| 22px（全角 `×`） | **0.7px** | 14.3px | ギリギリ |
| 24px | **−0.3px** | 14.3px | **欠ける** |

補助要因として、記号だけ `font-family="sans-serif"`（数字は `FONT = "'Hiragino Sans','Noto Sans JP',sans-serif"`）で
描画していたため、端末の既定フォントによって記号幅が変わり「場合による」挙動になっていた。

**加算・減算も同様にリスクがあった**: 4演算すべてが `render` 内の同一分岐を通るため同じ座標を共有している。
`＋` / `−` はインクが狭く（12〜16px程度）実害が出ていなかっただけで、
全角 `＋` (U+FF0B) に fallback する端末なら同じく欠け得た。したがって**まとめて修正**する。

**修正内容**:

1. `LAYOUT.opWidth` を `26` → **`34`**（＝1桁幅 `cellW` と同じ。記号が1桁ぶんの欄を持つ教科書どおりの体裁）
2. 新規 `LAYOUT.signX = opWidth / 2`（＝**17**）を記号の中心として `render` で使用。
   左 17px / 右 17px が**対称**になり、最悪グリフ幅（1.25em = 27.5px）でも左右に **3.3px** の余白が残る
3. 新規 `LAYOUT.signMinMargin = 3`（保証する最低余白。テストの判定基準）
4. 記号の `font-family` を `sans-serif` → 数字と同じ **`FONT`** に統一（端末差で幅が変わらないように）
5. 罫線（加算/乗算の算式線・除算の商の `_`）の始点を `opWidth * 0.35` (= 9.1) → **`opWidth`** (= 34) に変更。
   演算記号の列に食い込ませると `×` `÷` のインクと重なるため、必ず数字列の左端から引く
6. `css/app.css`: `.hissan-stage` に `padding: 0 4px`、`transform: scale(1.15)` → **`1.08`**
   （図が 8px 幅広くなったため、細長い端末での横スクロール 억制。余白は SVG 側で担保している）

回帰防止として `tests/test_hissan.js` のセクション12に、
**4演算 × 3段階 = 12通り**（加算 `+` / 減算 `−` / 乗算 `×` / 部分積 `+` / 除算 `÷` / 1桁商の除算 `÷`）について、
記号のインクが最悪グリフ幅（1.25em）でも viewBox 左端・数字列之间に `signMinMargin` 以上残ることを検証するテストを追加。
罫線始点が `opWidth` と一致すること、記号と数字の `font-family` が一致することも併せて検証する。

### 10.11 V2.9.4 部分積が1つだけの乗算がヒントで答えを漏らしていた不具合の修正

**症状**: かける数が `10` の倍数（例: `23 × 10`、`45 × 20`）のとき、
ヒント画面の部分積が**答えそのもの**になっていた。

**原因**: V2.9.2 の除外条件 `parts.length === 1 && parts[0].shift === 0` は
桁送り無しの1件（`23 × 4` → 部分積 `92` = 答え `92`）しか除外していなかった。
しかし部分積は桁送り込みで描かれるため、`23 × 10` の部分積 `23`（1桁送り）は
表示値 `230` = 答え `230`、`45 × 20` の部分積 `90`（1桁送り）は表示値 `900` = 答え `900` と
**一致する**（「桁送りを 0 として評価した表示値」＝ `digits + "0" × shift` が答えに等しい）。
桁送りで右端が空くため見た目は「23_」と異なるが、数字としては答えが判明してしまう。

**修正**: `js/hissan_svg.js` の `showParts` を `parts.length === 1` で一律除外に変更
（桁送りの有無にかかわらず、部分積が1つだけならヒント・解説とも部分積行を作らない）。
部分積が2つ以上（例: `23 × 14` → `92` / `23`）は中間の値なので従来どおり表示する。

回帰防止として `tests/test_hissan.js` のセクション [4] の `23×10` 期待値を更新し、
新規セクション [12b] に `23×10 / 45×20 / 45×30 / 23×4 / 100×10` の1件除外と
`23×14` の2件表示（対照ケース）を追加。

### 10.12 V2.9.5 入力不可能な答え（負の数値）と配信物の不整合の修正

本リリースは筆算とは独立した、内容の欠陥の発見に基づく修正である。

#### (1) 答えが負になる問題（入力不能＝必ず不正解）

**症状**: 小4 図形以外の単元 `decimal_add_sub` の `g4_word_decimal_add_01`
（小数の引き算「残り」）が **17.5%** の確率で**負の答え**を生成していた。

```
ジュースが 2.3L あります。4.3L 飲みました。残りは なんL？   → 答え -2.0
```

**原因**: `generate` の `a_int/a_dec`（もとの量 2.1〜9.9）と
`b_int/b_dec`（使う量 1.1〜4.9）が独立ランダムで、`a > b` を保証する制約が
無かった。`answer = a - b` がそのまま採用されていた。

**影響**: 学習画面の回答は画面上の数字テンキー（「−」キーなし）で行うため、
負の答えは**絶対に入力できない**。結果として必ず3回不正解となり、
復習キューに該当問題が入り、弱点単元として記録され、
学習スコアも低下する。児童にとっては「永久に解けない問題」になる。

**修正**:
1. `js/templates_math.js`: `answer` の generate ルールに `constraints: ["answer > 0"]` を追加。
   既存の制約リトライ機構（V2.9.0 導入）が機能し、違反する組み合わせは引き直される。
   併せて `normalization` を実態に合わせて `"integer"` → `"decimal"` に修正。
2. `js/validator.js`: `number_input` / `figure_display`（= テンキー入力になる形式）に対し、
   答えが負なら `ANSWER_ERROR` を返す防御ルールを追加。
   テンプレ側の制約漏れを自動検出できる。

**回帰防止**: `tests/test_answer_sanity.js` を新規追加。
全テンプレ（115個）× 40問を走査して負・数値外の答えが 0 件であることを保証し、
Validator の防御ルールが機能していることも検証する。

#### (2) dist/ がソースと不一致のままデプロイされていた

**症状**: Firebase Hosting は `dist/` を配信するが、`dist/` は手作業コピーで
更新されていた。V2.9.4 の修正（部分積ヒントの答え漏洩）が
`dist/js/hissan_svg.js` に入っておらず、**テストを通した修正が利用者に届いていない**
状態だった。`check:version` は `dist/index.html` の `<title>` しか見ていなかったため
この不整合を検出できていなかった。

**修正**:
- `scripts/build_dist.js` を新設（`npm run build`）。`dist/` をソースから再生成し、
  テスト用ページ・設計書・`memo.txt`・`package.json` は配信対象から除外する。
- `scripts/check_version.js` に「dist/ とソースのハッシュ一致」と
  「dist/ に配信不要なファイルが混ざっていないこと」の検証を追加。
- `firebase.json` の `ignore` にもテストページ・`tests/`・`tools/`・`*.md` を追加（多層防御）。

#### (3) 開発基盤の事故防止

- `scripts/run_tests.js` を新設（`npm test`）。`tests/test_*.js` **のみ**を実行する。
  過去に `tests/` にソース書き換えスクリプトが混在し、テスト一括実行で
  `js/templates_math.js` が汚染された事故の再発を防止する。
  0バイトのテストファイルは失敗として扱う。
- `tests/fix_templates.js` / `inject_metadata.js` / `verify_diversity.js` を `tools/` へ退避し、
  誤実行防止に `--apply` ガードを追加。
- ルート直下のクラッシュ回帰チェックを `tests/test_crash_regress.js` に昇格（テストランナーで実行）。

#### (4) 確認ページが学習データを全消去していた

**症状**: `test_phase1.html` を `window.onload` で `regenerateProfile()` が呼ばれ、
その中で本番と同じ localStorage キー（`math_study_app_v2510_state`）へ
初期状態をそのまま `saveState` していた。**ページを開くだけで**
学習履歴・ポイント・バッジ・復習キューが消えていた。

**修正**: 書き込みを完全に廃止（このページの目的は構造の表示のみ）。
Storage テストも「保存 → 読み込み → 保存前の生データを復元」という
往復形式に変更し、保存機能を検証しつつ既存データを守るようにした。

### 10.13 V2.9.6 時計問題で前の設問の答えが残って見えた不具合の修正

時計問題（`answerType: clock_input` 全8テンプレ）で、前の設問の時計回答（例: Q1 `3:40`）が
次の設問（Q2）の回答欄にそのまま表示され、場合によっては未修正のまま送信されてしまう不具合を修正。
筆算の答え漏れ（V2.9.2）とは別系統の残留回答問題で、学習画面・テスト画面の両方に存在していた。

**原因**: 時計問題の回答値は JS 状態ではなく DOM の `<input id="clock-field-*">` に保持される。
`render()` は HTML 文字列を組み立ててから最後に `container.innerHTML` で DOM を差し替えるため、
組み立て中の `_clockSelectionDisplay()` -> `_readClockAnswer()` が前の設問の入力欄を読んでしまっていた。
数値入力（`this.currentInput`）と図形選択（`session.selectedFigureChoices`）は JS 状態なので各遷移でクリア済みであり、
描画中に DOM を読むのは `_readClockAnswer()` のみであることも確認済み（時計以外は構造的に安全）。

**修正**（`js/ui.js` のみ、テンプレ無変更）:
1. `render()` の先頭で `_clearClockInputs()` を呼び、時計4欄（h/m/s/count）を空にしてから HTML を組み立てる。
2. `nextLearningQuestion()` / `submitTestAnswer()` で `session.clockFocusQ = null;` を追加し、
   どの設問にフォーカスを当てていたかの記録もリセットする。

回帰防止として `tests/test_clock.js` にセクション [8] を追加（バグ再現・4欄クリア・クリア後の
プレースホルダー表示と `null` 返却・現在の設問の値が読めること・`render()` がクリアを呼ぶこと）。

**確認済みの残課題**（P3・機能は壊れていないが文言が不整合）→ V2.9.8 で是正:
設問文が「どれ？」と聞いているのに選択肢が出ないテンプレは `answerType: "choice"` の2件
（`g2_adv_kuku_fill_01` / `g4_adv_error_spotting_01`）だった。numpad で数値を入力すれば正解になる
ため解答不能ではないが、V2.9.8 で `number_input` に統一し「いくつ？」に修正した（→ 10.15）。

### 10.14 V2.9.7 保存失敗の通知・JST日付統一・履歴上限（外部レビュー P1 対応）

別モデル（Gemini）のコードレビューで挙がった P1 指摘 3 件をまとめて修正した。

**P1-1: `saveState()` の戻り値が無視されていた**
`storage.saveState()` は Quota 超過・プライベートモード等で `{ success: false }` を返すが、
`ui.js` の 7 箇所（オンボーディング完了・ニックネーム保存・学年変更・図形問題 ON/OFF・
プロフィール選択・PIN 設定・PIN リセット）が戻り値を無視しており、保存失敗を
ユーザーが知らずにデータ損失する可能性があった。

- 修正: `ui.js` に `_saveOrAlert()` ヘルパーを追加し、7 箇所をこのヘルパー経由に統一。
  失敗時は誤操作音＋モーダルで「ほぞんに しっぱいしました」と通知（`session_coordinator.js`
  の `saveRes.success` チェックと同じパターン）。
- `test_engine.js:283` と `ui.js` の `submitTestAnswer()` 完了分岐は前回コミットで対応済み。

**P1-2: 日付キーが UTC 基準だった（`toISOString().split("T")[0]`）**
JST 0〜9 時に学習すると UTC では「昨日」になり、連続学習日数（dailyStreak）が
リセットされる・今日の目標カウントが合わない等の不具合が起きていた。

- 修正: 新規 `js/date_utils.js`（`DateUtils.localDateKey / addDays / diffDays / datePartOf`、
  JST 固定・Node/ブラウザ両対応）を作成し、`index.html` で最上流に読込登録、
  `sw.js` の `urlsToCache` に追加。
- 置換対象: `learning_engine` / `session_coordinator` / `test_engine` / `review_engine` /
  `unit_selector` / `parent_dashboard` / `ui.js` の当日判定・日付加算を全て
  `DateUtils.localDateKey()` / `addDays()` に統一（環境が読めない場合のみ従来 UTC にフォールバック）。

**P1-3: `profile.history` が無制限で増加（放置で P0 昇格リスク）**
1問完了ごとに履歴 1 レコードが積み上がるだけで切り詰めがなく、長期利用で
localStorage の QuotaExceeded → 保存失敗 → 学習データ損失に直結していた。

- 修正: `config.common.historyLimit = 1000` を新設。
  - `session_coordinator.js`: push 後に上限超過分を古い順に破棄
  - `storage.js`: `loadState()` と `importStateJSON()` の両方で `capProfileHistory()` を適用
    （既存ユーザーの過大データもロード時に丸める）

バージョン表記は `config.js` / `migration.js` / `schema.js` / `sw.js`（CACHE_NAME =
`arith-study-v2.9.7-math-quality-pwa-fix`）/ `index.html` title / `test_phase1.js` /
`test_phase1.html` / 本ドキュメントを V2.9.7 に統一。


### 10.15 V2.9.8 P3文言の是正・ヒントの答え漏洔防止・図形ヒント整合（V2.9.8）

外部レビューで P3 として保留していた指摘と、独自精査で見つかった不具合3件を修正した。

**1. `answerType: "choice"` の文言不整合（2件）**
`g2_adv_kuku_fill_01`（九九の空欄）と `g4_adv_error_spotting_01`（計算の誤り探し）は
`answerType: "choice"` になっていたが、汎用の選択肢 UI は存在せず numpad へフォールスルーしていた。
- 両テンプレを `number_input` に是正し、設問文を「どれ？」→「いくつ？」に修正。
- 理解確認（3択・`generateWrong`）を有効化し、解答後の定着確認を可能にした。

**2. ヒントでの答え漏洔（1件）**
`g2_basic_bignum_04` の `hintSteps` 2つ目が `{answer}` を直接含み、2回目誤答時に解答前に
答えが表示されていた（`hintSteps` は解決済み変数で組み立てられるため）。「{left} から 100 ふえた
数は？」という誘導文に変更し、答えの数値を出さずに足し算へ導くようにした。

**3. `g2_rect_square` のヒント・解説と設問のずれ（1件）**
`buildProblem` は `target_idx` で「横長の長方形」（1枚）と「4つの角がすべて直角の四角形」（3枚）
を切り替えるのに、ヒント・解説は常に後者前提の固定文だった。`{target_idx === 1 ? … : …}` の
三項演算子（`_resolvePlaceholders` が式評価する既存仕組み）で設問分岐に追従する文面に修正。

**バージョン統一**: `config.js` / `migration.js` / `schema.js` / `sw.js`（CACHE_NAME =
`arith-study-v2.9.8-content-hint-fix`）/ `index.html` title / `test_phase1.js` /
`test_phase1.html` / `scripts/check_version.js` / 本ドキュメントを V2.9.8 に統一。
`schemaVersion` 2.5.6 は変更なし（マイグレーション不要）。

### 10.16 V2.9.9 固定答え・図の単調性の解消（出題多様性の質的改善）

全214テンプレを各200問（計42,800問）走査し、「毎回同じ答えしか出ない」テンプレを
機械的に検出して是正した。是正後は**数値系・選択系の固定答え0件**、
**figure_tap 13件すべてが図のバリエーションを持つ**ことを確認している。

**1. 数値テンプレの答え固定（5件）**
変数を宣言しながら `generate.answer` が定数式になっている、あるいは問題文が完全固定だった。
- `g6_basic_mixed_frac_01`: `1と{a}/{denom} + 2と{b}/{denom}` → 整数部分が常に3。
  整数部を `{w1}`/`{w2}`（1〜4 / 2〜5）で変数化し答えを 3〜9 に拡大。
- `g6_basic_frac_div_01`: わる数が常に `2/3` で答えが常に3。`{b}/{c}` で変数化。
- `g6_std_frac_mix_01`: 問題文 `1/2 × 2/3 ÷ 1/3 = ?` が**変数ゼロの完全固定**。
  `{a}/{b} × {b}/{c} ÷ 1/{c}` に変更し答えを 2〜7 に。
- `g2_std_geometry_edges_word_01`: 「三角形3 + 長方形4 = 7」が常に7。
  第2の図形を `{shape}`（長方形/五角形/六角形）で変数化し答えを 7/8/9 に。
- `g2_adv_geometry_box_faces_01`: はこの数が `choice: [2]` の1値固定。
  `range: [2, 5]` に変更し答えを 12/18/24/30 に（面6まいは立体の事実なので固定が正しい）。

**2. 選択位置の固定（1件）**
- `g1_shape_compare`: 正解カードが `var answerId = "c2"` で**常に2枚目**。
  未使用だった `figure_seed` を使い、大きい/向きが違うカードの位置を1〜4枚目で分散。
  答えは `c1`〜`c4` の4通りに。

**3. figure_tap の図が毎回同一（12件）**
部品IDは回転しても不変（`varySpec` の設計）だが、**描画される図自体が同一**だと
位置を覚えるだけで正答できてしまう。以下を追加。
- 回転ゆらぎ `vary: ["rotate"]` を長方形・三角形系へ追加:
  `g2_tap_right_vertex` / `g2_tap_all_edges` / `g2_tap_equal_sides` /
  `g3_angle_right_vertex` / `g3_angle_rect_right_all` / `g3_tri_longest_side`。
- 方眼図は回転すると方眼が斜めになるため、**寸法変化**で対応:
  `g3_area_square_sides` / `g3_area_rect_sides` / `g3_area_square_equal_sides`。
- 立体・展開図も等角投影が崩れるため寸法変化で対応:
  `g3_solid_cube_faces` / `g3_solid_cuboid_top_face` / `g3_net_cuboid_fold_lines`。

### 10.23 リリースチェックリスト

リリース時は以下の手順を順に実施し、すべて OK を確認してからデプロイする。

| 項目 | コマンド / 確認内容 | 合格基準 |
|------|-------------------|---------|
| 1. テスト実行 | `npm run verify` | 全テストファイル PASS / dist/ とソース一致 / バージョン表記一致 |
| 2. カバレッジ測定 | `npm run coverage` | ステートメントカバレッジ 90% 以上（目標値） |
| 3. バージョン単一ソース | `package.json` の `version` を更新 | `npm run gen:version` で各ファイル（config.js / sw.js / index.html / schema.js / migration.js）が自動更新される |
| 4. バージョン整合チェック | `npm run check:version` | すべてのファイルで表記が一致 |
| 5. dist/ ビルド | `npm run build` | dist/ がソースから再生成される（手動コピー禁止） |
| 6. Firebase デプロイ | `npx firebase deploy --only hosting` | デプロイ成功。ライブ配信（https://exciting-study.web.app/）と dist/ がバイト単位で一致することを確認 |
| 7. PWA 動作確認 | ブラウザでサイトを開き、オフライン時もアプリが動作すること | Service Worker がキャッシュからリソースを返す |
| 8. 新版反映確認 | バージョンアップ後、ブラウザで更新バーが表示され、更新ボタンで新版が適用される | SKIP_WAITING フローが正常動作 |
| 9. コミット | `git commit` + `git push origin main` | 作業ツリーが clean。CI（GitHub Actions）で `npm run verify` が PASS |

**製品コード（`js/`）を変更しない場合:**
- Firebase デプロイは不要（dist/ への影響なし）。
- `npm run verify` のみ実施し、コミット・push で完了。

**製品コードを変更する場合:**
- 上記チェックリストをすべて実施し、Firebase デプロイまで完了させる。

**Rollback 手順（緊急時）:**
- `git revert <コミットハッシュ>` または直前のタグ（例: `V2.9.13`）へのデプロイで前バージョンに戻す。
- Firebase Hosting は「リリース」機能でロールバック可能。


**4. `figure_tap` 経路での `{変数}` 置換の有効化（仕組みの拡張）**
`FigureSVG.buildDisplay` は従来 `varySpec` のみで `fillSpecVars` を呼んでおらず、
figure_tap では `w: "{n}"` のような指定が効かなかった。`buildDisplay` 内で
`fillSpecVars` を呼ぶよう変更し、置換後の文字列を数値へ戻す変換を追加した
（`x0 + w` が文字列結合になるのを防ぐ）。置換対象が無ければ従来と同一挙動。

**検証**: 固定答えスキャン（214×200問）で数値・選択系 FIXED=0、
figure_tap 13件の `figureHTML` バリエーション=全件VARIED、例外0。
`npm run verify` 全27テストPASS。

**バージョン統一**: `config.js` / `migration.js` / `schema.js` / `sw.js`（CACHE_NAME =
`arith-study-v2.9.9-question-variety-fix`）/ `index.html` title / `test_phase1.js` /
`test_phase1.html` / `scripts/check_version.js` / 本ドキュメントを V2.9.9 に統一。
`schemaVersion` 2.5.6 は変更なし（マイグレーション不要）。

### 10.17 V2.9.10 3年「分数の意味と表し方」の追加（学習指導要領3年 A(6) 対応）

3年生の分数が**完全な空白**だった（2年で図による 1/2・1/4 の識別に触れた後、5年の同分母
加減まで1.5年何も出題されない）ため、学習指導要領（解説 平成29年告示）3年 A(6)
「単位分数及びそれを幾つか集えた分数について，その意味と表し方について理解し，簡単な
場合について，分数の加法・減法の計算ができるようにする」に該当する3問を追加した。

**1. 新規単元 `fraction_meaning`（3年 Lv2）**

`registries.js` の 3年 Lv2 に `fraction_meaning`（分数の意味と表し方）を登録。
concept は `fraction_num_den_meaning` / `unit_fraction_count` /
`fraction_add_same_denom_intro` の3つ。

**2. 追加3テンプレ（`templates_units_p1.js`）**

| templateId | 問う内容 | 答えの例 |
|------------|----------|----------|
| `g3_basic_fraction_01` | 分子・分母が何を表すか（「n/d の n と d は何か」） | 上の数 / 下の数 |
| `g3_basic_fraction_02` | 単位分数を幾つ集めたか（「1/4 を3つ = 3/4」の合成） | あつめた数 / 分母 |
| `g3_basic_fraction_03` | 同分母の簡単な加減の「こたえの上の数」 | 分子の和・差 |

**3. 設計上の判断**

- `answerType: "number_input"` + `normalization: "integer"`。答えは「上の数（分子）」
  または「下の数（分母）」という**整数**に限定した。タッチテンキーに `/` キーは存在するが
  採点 `_checkAnswer` は `parseFloat` による数値比較のため、`3/4` のような分数表記を
  文字列一致させる採点は成立しない。5年 `g5_basic_frac_add_01` と同じ規約に揃えた
  （新規の `normalization: "fraction"` 実装は不要）。
- `answerType: "single_choice"`（テキスト選択肢）は使用していない。既存の
  `single_choice` は `problemType: "figure"`（`figureChoices`）専用で、テキスト選択肢では
  `_renderFigureChoices` → `_renderNumpad` にフォールバックして選択肢が表示されないため。
- **既約分数のみを出題**。3年 A(6) は約分を扱わないため、`2/6` や `6/9 − 3/9 = 3/9`
  のような約分可能な分数は教育的に不適切。`constraints` にインライン IIFE による
  最大公約数判定（`((x,y)=>{...})(a,denom)===1`）を入れ、分子・分母・計算結果の
  すべてが互いに素であることを保証している。制約式は完成後の `vars` で評価されるため、
  `formula` 依存の条件も正しく判定できる（`question_source.js` の
  `_constraintsSatisfied`）。
- 仮分数（分子 ≧ 分母）と答え 0（`a === b` による `x/y − x/y`）も制約で除外。
- `understandingCheck` は3問とも `enabled: true`。誤答は「分子と分母を取り違える」
  （`wrong1`）と「±1」（`wrong2`）で、児童が実際に犯しやすい誤解に対応。

**4. 検証**

- 追加した回帰テスト `test_answer_sanity.js` §10（120問×3テンプレ）で、
  答えが正の整数・未置換プレースホルダなし・仮分数0・約分可能分数0・
  understandingCheck の3択が相異かつ正解を含み問題の答えと一致することを確認。
- 個別に1000問×3テンプレを走査し、既約性違反0・答え0件を確認。
  出題多様性は `g3_basic_fraction_01` が問題文48種/答え8種、
  `g3_basic_fraction_02` が27種/7種、`g3_basic_fraction_03` が88種/10種。
- `npm run verify` 全28テストPASS。テンプレ総数は 214 → **217**。

**副作用**: 3年 Lv2 の必要単元数が 4 → 5 に増えるため、既存の3年 Lv2 到達児童は
Lv3 までにあと1単元必要になる。テンプレ追加と同時に単元を登録したため、
`test_phase3.js` / `test_diversity.js` の「全単元×全Lv に最低1テンプレ」保証は満たす。

**バージョン統一**: `config.js` / `migration.js` / `schema.js` / `sw.js`（CACHE_NAME =
`arith-study-v2.9.10-grade3-fraction-meaning`）/ `index.html` title /
`test_phase1.js` / `test_phase1.html` / `scripts/check_version.js` /
`tests/test_service_worker_update.js` / 本ドキュメントを V2.9.10 に統一。

`schemaVersion` 2.5.6 は変更なし（マイグレーション不要）。

### 10.18 V2.9.11 理解確認クイズ（understandingCheck）の一括有効化

問題に正解した直後に出る「💡 理解確認ミニクイズ」（3択・学習スコアに影響しない）が
**全217テンプレ中59件で無効**だった。児童は「たしかに正解したが、なぜそうなるか理解
していない」まま次へ進める状態で、理解の定着を確認する仕組みが3分の1の問題で
サイレントにスキップされていた。

有効化の対象は **答えが数値の87テンプレ**（`number_input` / `figure_display`）。
既存の有効107件と合わせて **enabled 197件 / disabled 20件** となった。

**1. 残る20件を対象外とした理由**

`figure_tap` 13件・`single_choice` 3件・`multi_choice` 4件は、答えが図形の特定パーツを
指すID（`v-A`, `c2`, `e-AB,e-CD` 等）である。誤答を「正解から機械的に導出」できず、
例えるなら「この三角形の直角はどこ？」の誤答を自動生成するには**どの辺を提示するかの
教材設計**が必要になる。無関係な部品IDを並べると「明らかに違う」3択になり学習効果が
無いため、人手での誤答設計まで本リリースの対象外とした。

**2. 誤答の自動生成 `_buildWrongChoices`（新設）**

`js/question_source.js` に正解から誤答2件を導出するヘルパを追加した。児童が実際に
犯しやすい誤りを**優先度順**に候補化し、「正解と異なり・互いに異なり・非負」の2件を
常に返す。

| 優先度 | 誤りの種類 | 例（正解 12） |
|--------|-----------|--------------|
| 1 | 位の入れ違い（2桁以上） | `21` |
| 2 | ±1 / ±2（計算の最終桁の誤り） | `13`, `11` |
| 3 | 桁ずれ（×10 / ÷10。候補不足時のみ） | `120`, `1` |
| 4 | 予備（小さな答え・0・小数で候補不足時） | `22`, `23` |

**桁数帯の制約**が要点である。当初は桁ずれを最優先にしたが、正解 12 に対し `120` を
並べると**桁が飛びすぎて明らかな誤答**になり、児童が考えなくても消せるため学習効果が
薄かった。そのため `digits ± 1` の帯域から外れる候補は、候補が足りない場合のみ採用する
よう変更し、`12 → [21, 13]`（位入れ違い＋±1）のように**自然な誤答**を出すようにした。

負値は候補から除外している。数値テンキーに「−」キーが無いため、
誤答が負だと児童は**物理的に選択不能**な選択肢を目にすることになる。

**3. `questionTemplate` 未定義時のフォールバック**

87件の多くは `understandingCheck` の `questionTemplate` を持たなかった
（持つのは誤答指定のある既存107件のみ）。`questionTemplate` が空の場合は
「つぎの問題の答え（こたえ）は どれ？<br>（問題文）」という**問題文を引用する汎用文**で
補完するようにした。問題文を引用することで、「どちらが多いか」等の設問でも
何を問われているか明確になる。

**4. 従来のフォールバック不具合の修正**

従来は `generateWrong` 未指定時に `wrong1 = answer + 1` / `wrong2 = answer - 1` を
フォールバック生成していたが、**`wrong2` が `wrong1` と衝突した場合の処理が無く**、
3択にならない（事実上2択になる）ケースがあった。候補を巡回して相異な2件を選ぶ
`_buildWrongChoices` に置き換え、この不具合を解消した。

**検証**: 全数値テンプレの11,820インスタンスを生成し、
3択が相異・正解を含む・誤答が非負・質問文に未置換プレースホルダがないことを確認
（不備0件）。`_buildWrongChoices` の単体検証として、正解 0 / 1 / 12 / 21 / 58 / 100 /
1000 / 12.5 等の境界値を含む18ケースで「相異・非負・正解不一致」を確認。
`npm run verify` 全27テストPASS。

**バージョン統一**: `config.js` / `migration.js` / `schema.js` / `sw.js`（CACHE_NAME =
`arith-study-v2.9.11-understandingcheck-enable`）/ `index.html` title /
`test_phase1.js` / `test_phase1.html` / `test_service_worker_update.js` /
`scripts/check_version.js` / 本ドキュメントを V2.9.11 に統一。
`schemaVersion` 2.5.6 は変更なし（マイグレーション不要）。

### 10.19 V2.9.12 単元選択画面の学習状態色分け表示

単元選択画面（`_renderUnitSelectScreen`）の各単元カードに、学習状態を
「左ボーダー色 + 状態バッジ」で一目表示できるようにした。

- 判定優先順位: ふくしゅう（期限到来）🔁（赤） > ふくしゅう予定📅（橙） >
  未学習✨（灰）> にがて💪（黄・正解率60%未満） >
  だいたいOK👍（青・60〜79%） > バッチリ⭐（緑・80%以上）
- 既存エンジン（`unitStats` / `reviewQueue` の `dueAt`）のみ参照し、
  出題ロジック・保存形式の変更はなし。
- `test_unit_practice.js` に6状態の回帰テストを追加（期限到来・よてい・
  未学習・にがて・だいたいOK・バッチリ）。
-凡例バー（6状態）を単元カード一覧の上部に表示。
- バージョン統一: `config.js` / `migration.js` / `schema.js` /
  `sw.js`（CACHE_NAME = `arith-study-v2.9.12-unit-status`）/
  `index.html` title / `test_phase1.js` / `test_phase1.html` /
  `test_service_worker_update.js` / `scripts/check_version.js` /
  本ドキュメントを V2.9.12 に統一。`schemaVersion` 2.5.6 は変更なし。

### 10.20 V2.9.13 回答処理のガードとモバイル表示の修正

P1 修正要件 3 件（回答処理のガード・空白画面の修正・モバイル表示のピンチズーム許可）を行った。

**P1-1: 回答処理のガード**
- `submitLearningAnswer()` はセッション未開始・不正な状態（`session` が null / `questions` が無い / `currentIndex` が null）のときは処理を受け付けず、即座に return する。
- 誤タップや画面遷移直前のタップで `currentAttemptCount` が増えたり、採点・保存が発生したりするのを防ぐ。
- 副作用（attemptCount の加算・採点・保存）を一切発生させない。
- テスト: `tests/test_p1_guard_v2913.js`（17 チェック PASS）。

**P1-2: 空白画面の修正（render() の再入）**
- `render()` の中で `_renderLearningScreen()` などが `navigate()` を呼ぶと `render()` が入れ子で呼ばれ、内側の描画が外側の `container.innerHTML = html` で上書きされる。
- その結果 `<main>` が空の空白画面になり、ホームへ遷移したのに画面が真っ白になる不具合があった。
- `render()` に再入ガード（`_rendering` フラグ）を入れ、描画中に画面が切り替わっていた場合は新しい画面を描き直すようにした。

**P1-3: モバイル表示のピンチズーム許可**
- `index.html` の viewport meta から `maximum-scale=1.0, user-scalable=no` を削除し、スマートフォンでのピンチズーム（拡大縮小）を許可した。
- 児童が問題文を拡大して読みやすいようにする。

**バージョン統一**
- `config.js` / `migration.js` / `schema.js` / `sw.js`（CACHE_NAME = `arith-study-v2.9.13-unit-status`）/ `index.html` title / `test_phase1.js` / `test_phase1.html` / `test_service_worker_update.js` / `scripts/check_version.js` / 本ドキュメントを V2.9.13 に統一。
- `schemaVersion` 2.5.6 は変更なし（マイグレーション不要）。

### 10.21 コアエンジンの単体テスト追加（テスト強化・製品コード変更なし）

既存フェーズテスト（`test_phase1`〜`test_phase8`）では到達しにくかった
コアエンジンの仕様を、エンジン単位の単体テストで固定した。

| テスト | 対象 | 検証内容 |
|--------|------|---------|
| `tests/test_date_utils.js` | `DateUtils` | JST 固定・月末/年末/うるう年の境界、日付演算、不正入力 |
| `tests/test_learning_engine.js` | `LearningEngine` | `unitStats` 更新、`masteryScore` 算出、入力非破壊性、デイリーストリーク |
| `tests/test_review_engine.js` | `ReviewEngine` | 登録/重複維持/卒業再活性化、一意キー、間隔（1→3→7→14日）、失敗リセット |
| `tests/test_unit_selector.js` | `UnitSelector` | 復習優先、Coverage/Weakness フェーズ、弱点重み付け、ローテーションバッグ、figure 切替 |
| `tests/test_session_coordinator.js` | `SessionCoordinator` | 正解/不正解の両経路、原子性（`appState` 不変）、保存失敗・例外時のロールバック |

- 計 343 アサーション（49 / 53 / 82 / 66 / 93）。
  いずれも Node 標準の `assert` と単独の `check()` カウンタで実装し、
  外部テストフレームワークへの依存は追加していない。
- `UnitSelector` のみ `Math.random` を決定論的なモックに差し替え、検証後は必ず復元する。
- 製品コード（`js/`）・配信物（`dist/`）・バージョン表記・`schemaVersion` は**変更なし**。
  したがってマイグレーションは不要で、Service Worker のキャッシュ名も据え置き。
- `npm run verify` 全33テストPASS（既存28 + 新規5）。

### 10.22 今後の予定

| リリース | 内容 |
|----------|------|
| V2.10.0 | `hissan_input`：桁マス専用入力（最終答え行のみ採点） |
| V2.11.0 | 繰り上がりマス・途中積まで入力を拡張 |

### 10.23 V2.9.14 ダークモード / テーマ設定

設定画面でライト・ダーク・OS連携の3モードを選べる。現行実装では共通の色トークンを使い、通常画面・動的に生成する案内やグラフ・図形／時計／筆算のSVGまでテーマに追従させる。

**仕様**
- 保存先: `profile.settings.theme`（`"system"` / `"light"` / `"dark"`、デフォルト `"system"`）
- 旧 `profile.settings.darkMode` の `"auto"` / `"light"` / `"dark"` は読み込み時に移行し、旧キーは削除する。`theme: "auto"` は `"system"` に正規化する
- `data-theme` 属性を `<html>` 要素に設定し、CSS変数を切り替える
- `prefers-color-scheme` メディアクエリにより、OS/ブラウザの配色設定と自動連携（`system` モード時）。OS配色変更時はブラウザの `theme-color` も更新する
- 設定画面の「🌙 画面のテーマ」カードから「じどう / ライト / ダーク」を選択

**変更ファイル**
- `css/app.css`: ライト／ダーク／OS連動の意味色トークンを定義し、部品・状態表示・入力欄・図形選択・教材表示に適用
- `js/ui.js`: 起動・プロフィール切替・インポート時のテーマ適用、設定保存、OS配色変更への追従を実装。旧呼び出し向けに `setDarkMode(mode)` を互換ラッパーとして維持
- `js/figure_svg.js` / `js/clock_svg.js` / `js/hissan_svg.js` / `js/templates_figures_g2.js`: SVGの線・文字・面・折り目の色をCSSテーマ変数から取得
- `manifest.json`: PWA起動時の背景色をアプリのライトテーマ背景に合わせる（Manifestの色は静的）
- `tests/test_dark_mode_v2914.js` / `tests/test_css_syntax.js`: テーマ適用・旧設定移行・CSS変数参照を回帰テスト

**バージョン統一**
- `config.js` / `migration.js` / `schema.js` / `sw.js`（`CACHE_NAME = arith-study-v2.9.14-dark-mode`）/ `index.html` title / `test_phase1.js` / `test_phase1.html` / `test_service_worker_update.js` / `scripts/check_version.js` / 本ドキュメントを V2.9.14 に統一。
- `schemaVersion` 2.5.6 は変更なし（マイグレーション不要）。

### 10.24 V2.9.15 オンライン/オフライン表示・プロファイル削除 UI

オンライン/オフライン表示バッジとプロファイル削除機能を追加した。

**仕様**
- オンライン/オフライン表示:
  - ヘッダーに `status-badge` を表示（オンライン：緑、オフライン：赤/オレンジ）
  - `navigator.onLine` と `online`/`offline` イベントでリアルタイム更新
  - `profile.settings` には保存しない（単純なUI状態のため）
- プロファイル削除:
  - プロフィール選択画面に「🗑️」削除ボタンを追加（`event.stopPropagation` で選択と衝突しない）
  - 削除前に確認モーダルを表示（「学習データもすべて消えます」と明記）
  - アクティブプロファイル削除時は残りのプロファイルに自動切替
  - プロファイルが0件になったらオンボーディング画面へ
  - `activeProfileId` は**保存前に確定**させる（0件時の `null` も確実に永続化）

**変更ファイル**
- `css/app.css`: `.status-badge` クラス（オンライン/オフライン用、ダークモード対応）を追加
- `js/ui.js`: `_isOnline` プロパティ、`_updateOnlineStatus()` を追加。`init()` で `online`/`offline` イベントリスナ登録。`_renderHeader()` にステータスバッジを追加。`_renderProfileSelectScreen()` に削除ボタンを追加。`deleteProfile()`、`confirmDeleteProfile()` を追加
- `tests/test_online_offline_v2915.js`: 新規。5 アサーション
- `tests/test_profile_delete_v2915.js`: 新規。17 アサーション

**バージョン統一**
- `config.js` / `migration.js` / `schema.js` / `sw.js`（`CACHE_NAME = arith-study-v2.9.15-online-offline`）/ `index.html` title / `test_phase1.js` / `test_phase1.html` / `test_service_worker_update.js` / `test_service_worker_dynamic.js` / `scripts/check_version.js` / `scripts/gen_version.js` / 本ドキュメントを V2.9.15 に統一。
- `schemaVersion` 2.5.6 は変更なし（マイグレーション不要）。

### 10.25 V2.9.16 PWA の HTML / CSS キャッシュ更新安定化

同じCSS URLをキャッシュ優先で返すと、サーバーに更新があっても端末内のService Workerキャッシュが残る可能性がある。HTMLの画面遷移と同一オリジンCSSをネットワーク優先とし、成功時にService Workerキャッシュを更新、通信失敗時はキャッシュを使う。

**仕様**
- HTMLナビゲーションとCSS取得は `fetch(..., { cache: "no-store" })` でブラウザーHTTPキャッシュも迂回し、応答成功後に現在のService Workerキャッシュへ保存
- ネットワークが失敗した場合は既存キャッシュへフォールバックし、キャッシュ更新失敗はコンソールに明示
- Firebase HostingのCSSレスポンスに `Cache-Control: no-cache, no-store, must-revalidate` を指定
- `CACHE_NAME` を `arith-study-v2.9.17-theme-cache-v2` に更新し、既存PWAへ新しいService Workerをインストールさせる
- Service Workerの更新通知・ユーザーによる適用操作は従来どおり維持

**確認**
- `test_service_worker_dynamic.js` / `test_service_worker_update.js` でネットワーク優先・オフラインフォールバック・CSSキャッシュヘッダーを検証する。

### 10.26 V2.9.17 発展問題の追加と内容修正

- 1〜3年生向けの発展問題6型を単元登録し、単元選択から出題できるようにする
- 曜日問題の曜日名と回答ルール、お金問題の硬貨額面・設問・解説、回文数問題の解説を整合させる
- テンプレートの問題文・ヒントで答えを直接参照しないことを検証する
