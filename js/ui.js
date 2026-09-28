/**
 * UI & Screen Controller Layer
 * V2.5.10 詳細設計書 第3章・第4章 準拠 (全10画面・タッチテンキー・アニメーション)
 * V2.5.13: セッション経過時間表示・テンプレートデッキシャッフル
 */

/**
 * 秒数を "m:ss" 形式の文字列へ変換する (経過時間表示用)
 * @param {number} totalSeconds
 * @returns {string} 例: 0 → "0:00", 75 → "1:15", 725 → "12:05"
 */
function formatElapsed(totalSeconds) {
  const sec = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m + ":" + (s < 10 ? "0" + s : s);
}

class AppUI {
  constructor() {
    this.storage = new StorageManager();
    this.state = null;
    this.currentScreen = "home";
    this.session = null; // 通常学習・テスト進行中のセッション状態
    this.currentInput = "";
    this.parentState = null; // 保護者モードの状態 ({ step: "locked" | "setup1" | "setup2" | "dashboard" })
    this.characterAvatars = {
      cat: "🐱",
      dog: "🐶",
      owl: "🦉",
      robot: "🤖",
      dragon: "🐲"
    };
  }

  init() {
    const loadRes = this.storage.loadState();
    this.state = loadRes.state;

    // 初回起動時またはプロファイル未作成時はオンボーディング画面へ
    if (loadRes.isNew || !this.state.profiles || this.state.profiles.length === 0) {
      this.navigate("onboarding");
    } else {
      this.navigate("home");
    }
  }

  getActiveProfile() {
    return this.state.profiles.find(p => p.identity.id === this.state.activeProfileId) || this.state.profiles[0];
  }

  navigate(screenName, params = {}) {
    this.currentScreen = screenName;
    this.currentInput = "";
    window.scrollTo(0, 0);
    this.render(params);
  }

  render(params = {}) {
    const container = document.getElementById("app-container");
    if (!container) return;

    const profile = this.getActiveProfile();

    let html = "";
    // ヘッダー (オンボーディングとプロフィール画面以外で表示)
    if (this.currentScreen !== "onboarding" && this.currentScreen !== "profile_select") {
      html += this._renderHeader(profile);
    }

    html += `<main class="app-content">`;
    switch (this.currentScreen) {
      case "profile_select":
        html += this._renderProfileSelectScreen();
        break;
      case "onboarding":
        html += this._renderOnboardingScreen(params);
        break;
      case "home":
        html += this._renderHomeScreen(profile);
        break;
      case "learning":
        html += this._renderLearningScreen();
        break;
      case "session_result":
        html += this._renderSessionResultScreen(params);
        break;
      case "test":
        html += this._renderTestScreen();
        break;
      case "test_result":
        html += this._renderTestResultScreen(params);
        break;
      case "review_history":
        html += this._renderReviewHistoryScreen(profile);
        break;
      case "settings":
        html += this._renderSettingsScreen(profile);
        break;
      case "parent_mode":
        html += this._renderParentScreen(profile);
        break;
      default:
        html += `<div class="card">画面が見つかりません</div>`;
    }
    html += `</main>`;

    container.innerHTML = html;
    this._attachEventHandlers();
  }

  // ==========================================
  // 1. ヘッダー
  // ==========================================
  /**
   * 表示用の名前を取得する (V2.5.14)
   * ニックネームが設定されていればそれを、無ければデフォルト名 (identity.name) を返す
   */
  getDisplayName(profile) {
    if (!profile || !profile.identity) return "チャレンジャー";
    return profile.identity.nickname || profile.identity.name || "チャレンジャー";
  }

  _renderHeader(profile) {
    if (!profile) return "";
    const currentGrade = profile.skill.subject.currentGrade;
    const gp = profile.skill.subject.gradeProgress[`grade${currentGrade}`];
    return `
      <header class="app-header">
        <div class="app-title">
          <span>${this.characterAvatars[profile.identity.character] || "🐱"}</span>
          <span>小学${currentGrade}年・算数</span>
        </div>
        <div class="header-badges">
          <span class="header-badge">Lv${gp.difficultyLevel}</span>
          <span class="header-badge">⭐ ${profile.points.total}pt</span>
        </div>
      </header>
    `;
  }

  // ==========================================
  // 2. ホーム画面 (Screen 3)
  // ==========================================
  _renderHomeScreen(profile) {
    const currentGrade = profile.skill.subject.currentGrade;
    const gp = profile.skill.subject.gradeProgress[`grade${currentGrade}`];
    const today = new Date().toISOString().split("T")[0];

    // 復習通知の確認 (控えめな表示: 第4.3章)
    const activeDueReviews = (profile.reviewQueue || []).filter(r => 
      r.status === "active" && r.grade === currentGrade && r.dueAt && r.dueAt <= today
    );

    // Lv3到達時の学年変更導線通知 (第18.1.3章)
    const showMaxLevelNotice = gp.difficultyLevel === 3;

    return `
      <div class="character-section">
        <div class="character-avatar">${this.characterAvatars[profile.identity.character] || "🐱"}</div>
        <div class="speech-bubble">
          こんにちは、${this.getDisplayName(profile)}さん！<br>
          ${activeDueReviews.length > 0 ? "📝 復習できる単元があるよ！" : "きょうも楽しく算数をがんばろう！"}
        </div>
      </div>

      ${activeDueReviews.length > 0 ? `
        <div class="card" style="background: #fffbeb; border-color: #fde68a;">
          <div style="font-weight:bold; color: #92400e; margin-bottom:4px;">⏰ ふくしゅうのじかん</div>
          <div style="font-size:0.9rem; color:#b45309;">${activeDueReviews.length}件の復習問題があります。</div>
        </div>
      ` : ""}

      ${showMaxLevelNotice ? `
        <div class="card" style="background: #f0fdf4; border-color: #bbf7d0;">
          <div style="font-weight:bold; color: #166534; margin-bottom:4px;">🌟 最高レベル到達！</div>
          <div style="font-size:0.85rem; color:#15803d; margin-bottom:8px;">「もっとむずかしい問題に挑戦してみる？」</div>
          <button class="btn btn-outline" style="min-height:36px; padding:6px 12px; font-size:0.85rem;" onclick="app.navigate('settings')">⚙️ 学年・レベル設定へ</button>
        </div>
      ` : ""}

      <div class="card">
        <div class="card-title">🏆 あなたの学習状況</div>
        <div style="display:flex; justify-content:space-between; font-size:0.9rem; margin-bottom:4px;">
          <span>達成レベル: <b>Lv${profile.points.achievementLevel || 1}</b></span>
          <span>連続正解: <b>${profile.streaks?.correctStreak || 0}問</b> (最高 ${profile.streaks?.bestStreak || 0})</span>
        </div>
        <div class="progress-container">
          <div class="progress-bar" style="width: ${Math.min(100, ((profile.points.total % 100) / 100) * 100)}%;"></div>
        </div>
        <!-- V2.5.15: 連続学習日数 & デイリー目標 -->
        <div style="display:flex; justify-content:space-between; font-size:0.9rem; margin-top:6px;">
          <span>🔥 連続学習: <b>${profile.streaks?.dailyStreak || 0}日</b> (最高 ${profile.streaks?.bestDailyStreak || 0})</span>
        </div>
        ${(() => {
          const goal = (typeof APP_CONFIG !== "undefined" && APP_CONFIG.common && APP_CONFIG.common.dailyGoal) || 5;
          const done = Math.min(goal, profile.history?.filter(h => (h.completedAt || "").slice(0, 10) === new Date().toISOString().split("T")[0]).length || 0);
          const pct = goal > 0 ? Math.round((done / goal) * 100) : 0;
          return `
          <div style="display:flex; justify-content:space-between; font-size:0.9rem; margin-top:6px;">
            <span>🎯 今日の目標: <b>${done} / ${goal}問</b></span>
            ${done >= goal ? '<span style="color:var(--success); font-weight:bold;">達成！🎉</span>' : `<span style="color:var(--text-muted);">あと ${goal - done}問</span>`}
          </div>
          <div class="progress-container" style="height:8px;">
            <div class="progress-bar" style="width: ${Math.min(100, pct)}%; background:${done >= goal ? 'var(--success)' : 'linear-gradient(90deg, #3b82f6, #10b981)'};"></div>
          </div>`;
        })()}
      </div>

      <div style="margin-top:auto;">
        <button class="btn btn-primary" onclick="app.startLearningSession()">🚀 学習をはじめる（10問）</button>
        <button class="btn btn-secondary" onclick="app.startTestSession()">📝 テストを受ける（10問）</button>
        <button class="btn btn-purple" onclick="app.navigate('review_history')">📚 ふくしゅう・きろく (${profile.reviewQueue?.filter(r=>r.status==='active').length || 0})</button>
        <button class="btn btn-outline" onclick="app.navigate('settings')">⚙️ せってい・学年変更</button>
        ${(typeof APP_CONFIG !== "undefined" && APP_CONFIG.features && APP_CONFIG.features.parentMode) ? `
        <button class="btn btn-outline" style="min-height:36px; padding:6px 12px; font-size:0.85rem; margin-top:2px;" onclick="app.startParentMode()">🔒 保護者モード</button>
        ` : ""}
      </div>
    `;
  }

  // ==========================================
  // 3. オンボーディング画面 (Screen 2)
  // ==========================================
  _renderOnboardingScreen(params) {
    const step = params.step || 1;

    if (step === 1) {
      return `
        <div class="card" style="text-align:center; margin-top:20px;">
          <div style="font-size:2.5rem; margin-bottom:10px;">🎒</div>
          <h2>何年生ですか？</h2>
          <p style="color:var(--text-muted); font-size:0.9rem; margin-bottom:18px;">学年に合わせた問題が出題されます</p>
          <div style="display:grid; grid-template-columns: repeat(2, 1fr); gap:10px;">
            ${[1, 2, 3, 4, 5, 6].map(g => `
              <button class="btn btn-outline" onclick="app.navigate('onboarding', { step: 2, grade: ${g} })">小学${g}年生</button>
            `).join("")}
          </div>
        </div>
      `;
    }

    if (step === 2) {
      return `
        <div class="card" style="text-align:center; margin-top:20px;">
          <div style="font-size:2.5rem; margin-bottom:10px;">✨</div>
          <h2>ニックネームをえらぼう</h2>
          <p style="color:var(--text-muted); font-size:0.85rem; margin-bottom:8px;">なまえを入れてね（12もじまで・あとで かえられるよ）</p>
          <input type="text" id="onboarding-nickname" maxlength="12" placeholder="例: はなちゃん"
            style="width:80%; max-width:280px; padding:10px 12px; font-size:1rem; border:2px solid var(--primary, #6366f1); border-radius:var(--radius-md, 12px); text-align:center; margin-bottom:16px;">
          <h2 style="margin-top:8px;">パートナーキャラクターをえらぼう</h2>
          <div style="display:grid; grid-template-columns: repeat(2, 1fr); gap:12px; margin-top:14px;">
            ${Object.entries(this.characterAvatars).map(([key, emoji]) => `
              <button class="btn btn-outline" style="flex-direction:column; padding:16px;" onclick="app.completeOnboarding(${params.grade}, '${key}')">
                <span style="font-size:2.5rem; margin-bottom:6px;">${emoji}</span>
                <span>${key === 'cat' ? 'ネコ' : key === 'dog' ? 'イヌ' : key === 'owl' ? 'フクロウ' : key === 'robot' ? 'ロボット' : 'ドラゴン'}</span>
              </button>
            `).join("")}
          </div>
          <p style="color:var(--text-muted); font-size:0.8rem; margin-top:10px;">※ ニックネームを入れない場合は「チャレンジャー」になります</p>
        </div>
      `;
    }
  }

  completeOnboarding(grade, character) {
    // V2.5.14: オンボーディングで入力したニックネームを取得 (空ならデフォルト名にフォールバック)
    let nickname = "";
    const nickEl = document.getElementById("onboarding-nickname");
    if (nickEl && nickEl.value) nickname = nickEl.value.trim().slice(0, 12);
    const newProf = createNewProfile(null, "チャレンジャー", grade, character, "standard", "", nickname);
    if (!this.state.profiles) this.state.profiles = [];
    this.state.profiles.push(newProf);
    this.state.activeProfileId = newProf.identity.id;
    this.storage.saveState(this.state);
    Sound.playFanfare();
    this.navigate("home");
  }

  // ==========================================
  // 4. 学習セッション画面 (Screen 4)
  // ==========================================
  startLearningSession() {
    const profile = this.getActiveProfile();
    const currentGrade = profile.skill.subject.currentGrade;
    const gp = profile.skill.subject.gradeProgress[`grade${currentGrade}`];

    // 10問のセッションを準備
    this.session = {
      type: "learning",
      currentIndex: 0,
      totalCount: 10,
      correctCount: 0,
      earnedPointsTotal: 0,
      questions: [],
      currentAttemptCount: 0,
      currentHintUsed: false,
      historySummary: [],
      startedAt: Date.now() // V2.5.13: セッション経過時間の計測開始
    };

    // V2.5.13: 単元ごとのテンプレートデッキを事前シャッフル (同一単元でも毎回別テンプレートを出題)
    const tReg = TemplateRegistry;
    const currentUnits = (typeof UnitRegistry !== "undefined")
      ? UnitRegistry.getUnitsForLevel("math", currentGrade, gp.difficultyLevel)
      : [];
    const decks = {};
    for (const u of currentUnits) {
      const tmpls = tReg.getByUnit("math", currentGrade, gp.difficultyLevel, u.id);
      decks[u.id] = this._shuffleArray([...tmpls]);
    }

    // 10問生成
    for (let i = 0; i < 10; i++) {
      const sel = UnitSelector.selectNextUnit(profile, APP_CONFIG);
      // V2.6.2: 多段フォールバック (別レベル所属unitの復習でも空プールでクラッシュしない)
      const templates = this._getTemplatesForSelection(tReg, currentGrade, gp.difficultyLevel, sel);
      // デッキから順番に引く (尽きたら再シャッフル)
      let t = null;
      if (!decks[sel.unitId] || decks[sel.unitId].length === 0) {
        decks[sel.unitId] = this._shuffleArray([...templates]);
      }
      // V2.6.1: 直近3問で使用したテンプレートを優先的に回避 (同一unit連続時の単調さを軽減)
      const recentTemplateIds = this.session.questions.slice(-3).map(q => q.templateId);
      const deck = decks[sel.unitId];
      const freshIdx = deck.findIndex(x => !recentTemplateIds.includes(x.templateId));
      if (freshIdx >= 0) {
        t = deck.splice(freshIdx, 1)[0];
      } else {
        t = deck.pop();
      }
      if (!t) t = templates[Math.floor(Math.random() * templates.length)];
      const qInstance = RuleBasedQuestionSource.generateQuestion(t.templateId, this.session.questions, {
        isReview: sel.type === "review"
      });
      this.session.questions.push(qInstance);
    }

    this._startSessionTimer();
    Sound.playClick();
    this.navigate("learning");
  }

  _shuffleArray(array) {
    const a = [...array];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  /**
   * V2.6.2: 単元選択結果からテンプレートプールを多段フォールバックで取得する
   * 復習unitが現在レベル外に所属する場合もクラッシュさせない
   * @param {Object} tReg TemplateRegistry
   * @param {number} currentGrade
   * @param {number} currentLevel
   * @param {Object} sel UnitSelector.selectNextUnit の結果
   * @returns {Array<Object>} テンプレート配列 (必ず1件以上)
   */
  _getTemplatesForSelection(tReg, currentGrade, currentLevel, sel) {
    // 1) 現在レベルのプール
    let templates = tReg.getByUnit("math", currentGrade, currentLevel, sel.unitId);
    if (!templates || typeof templates.length !== "number") templates = [];

    // 2) 同unitを全レベル横断で検索 (別レベル所属unitの復習)
    if (templates.length === 0) {
      for (let lv = 1; lv <= 3; lv++) {
        templates = tReg.getByUnit("math", currentGrade, lv, sel.unitId);
        if (templates && templates.length > 0) break;
      }
    }

    // 3) 復習アイテムが保持する templateId を直接使用
    if (templates.length === 0 && sel.reviewItem?.templateId) {
      const direct = tReg.get(sel.reviewItem.templateId);
      if (direct) templates = [direct];
    }

    // 4) 同学年の全テンプレート
    if (!templates || templates.length === 0) {
      templates = Object.values(tReg.templates || {}).filter(t => t.grade === currentGrade);
    }

    // 5) 最終フォールバック: 全テンプレート (理論上到達しない保険)
    if (!templates || templates.length === 0) {
      templates = Object.values(tReg.templates || {});
    }

    return templates || [];
  }

  _startSessionTimer() {
    if (this._sessionTimerInterval) {
      clearInterval(this._sessionTimerInterval);
      this._sessionTimerInterval = null;
    }
    this._sessionTimerInterval = setInterval(() => {
      const el = document.getElementById("session-timer");
      if (!el || !this.session || !this.session.startedAt) return;
      const sec = Math.floor((Date.now() - this.session.startedAt) / 1000);
      el.textContent = "⏱ " + formatElapsed(sec);
    }, 1000);
  }

  _stopSessionTimer() {
    if (this._sessionTimerInterval) {
      clearInterval(this._sessionTimerInterval);
      this._sessionTimerInterval = null;
    }
  }

  _renderLearningScreen() {
    if (!this.session || !this.session.questions[this.session.currentIndex]) {
      this.navigate("home");
      return "";
    }

    const q = this.session.questions[this.session.currentIndex];
    const progress = `${this.session.currentIndex + 1} / ${this.session.totalCount}`;
    // V2.6.1: 出題中のunit名を表示 (新単元の出題可視化)
    let unitName = "";
    try {
      if (typeof UnitRegistry !== "undefined" && UnitRegistry.findUnit) {
        const u = UnitRegistry.findUnit("math", q.grade, q.unitId);
        unitName = (u && u.name) || q.unitId;
      }
    } catch (e) {
      unitName = q.unitId || "";
    }

    return `
      <div class="question-meta">
        <span><b>第 ${progress} 問</b> <span id="session-timer" style="color:var(--text-muted); font-weight:normal;">⏱ ${formatElapsed(0)}</span></span>
        <span><span class="badge" style="background:var(--primary-light); color:var(--primary); font-size:0.75rem;">${unitName}</span> <span class="badge success">${q.problemType === 'word_problem' ? '文章題' : '計算'}</span> Lv${q.difficultyLevel}</span>
      </div>

      <div class="progress-container">
        <div class="progress-bar" style="width: ${((this.session.currentIndex) / this.session.totalCount) * 100}%;"></div>
      </div>

      <div class="question-display">
        <div class="question-text">${q.questionText}</div>
        ${q.clockHTML ? `<div class="clock-stage">${q.clockHTML}</div>` : ""}
        <div class="answer-input-display" id="answer-display">
          ${q.clockHTML
            ? this._clockSelectionDisplay(q)
            : (q.figureChoices
              ? this._figureSelectionDisplay(q)
              : (this.currentInput ? this.currentInput : '<span class="answer-placeholder">？</span>'))}
        </div>
      </div>

      ${q.clockHTML
        ? this._renderClockInputs(q, "app.submitLearningAnswer()", "こたえる ➔")
        : (q.figureChoices
          ? this._renderFigureChoices(q, "app.submitLearningAnswer()", "こたえる ➔")
          : this._renderNumpad("app.submitLearningAnswer()", "こたえる ➔"))}

      <div id="modal-container"></div>
    `;
  }

  _renderNumpad(submitAction, submitLabel) {
    return `
      <!-- タッチテンキー (0..9, ., /, Del, 決定) -->
      <div class="numpad-grid">
        <button class="numpad-btn" onclick="app.pressKey('7')">7</button>
        <button class="numpad-btn" onclick="app.pressKey('8')">8</button>
        <button class="numpad-btn" onclick="app.pressKey('9')">9</button>
        <button class="numpad-btn" onclick="app.pressKey('4')">4</button>
        <button class="numpad-btn" onclick="app.pressKey('5')">5</button>
        <button class="numpad-btn" onclick="app.pressKey('6')">6</button>
        <button class="numpad-btn" onclick="app.pressKey('1')">1</button>
        <button class="numpad-btn" onclick="app.pressKey('2')">2</button>
        <button class="numpad-btn" onclick="app.pressKey('3')">3</button>
        <button class="numpad-btn action-btn" onclick="app.pressKey('.')">.</button>
        <button class="numpad-btn" onclick="app.pressKey('0')">0</button>
        <button class="numpad-btn action-btn" onclick="app.pressKey('backspace')">⌫ けす</button>
        <button class="numpad-btn action-btn" style="grid-column: span 1;" onclick="app.pressKey('/')">/</button>
        <button class="numpad-btn ok-btn" style="grid-column: span 2;" onclick="${submitAction}">${submitLabel}</button>
      </div>
    `;
  }

  // V2.6.3: 図形選択問題のカード描画 (list: 単一選択 / grid: 複数選択)
  // V2.6.4: g2_shape_* は FigureShapeUI_G2 で描画 (直角マーク付き)
  _renderFigureChoices(q, submitAction, submitLabel) {
    const g = (typeof window !== "undefined") ? window : null;
    const isG2 = q && typeof q.templateId === "string" && q.templateId.indexOf("g2_") === 0;
    const FigUI = (isG2 && g && g.FigureShapeUI_G2 && typeof g.FigureShapeUI_G2.shapeCardHTML2 === "function")
      ? { shapeCardHTML: g.FigureShapeUI_G2.shapeCardHTML2.bind(g.FigureShapeUI_G2) }
      : ((typeof FigureShapeUI !== "undefined") ? FigureShapeUI : (g ? g.FigureShapeUI : null));
    if (!FigUI || !Array.isArray(q.figureChoices)) return this._renderNumpad(submitAction, submitLabel);
    const selected = (this.session && this.session.selectedFigureChoices) || [];
    const isGrid = q.answerType === "multi_choice";
    const items = q.figureChoices
      .map(c => FigUI.shapeCardHTML(c, selected.includes(c.id)))
      .join("");
    return `
      <div id="figure-choices" class="${isGrid ? "shape-grid" : "shape-list"}">${items}</div>
            <button class="numpad-btn ok-btn" style="width:100%; margin-top:10px;" onclick="${submitAction}">${submitLabel}</button>
    `;
  }

  // V2.6.3: 図形選択問題の回答表示 (選択中カードの状態を表示)
  // V2.6.7: 時計問題 (clock_input) の「時」「分」「秒」分離入力
  // 時計図は ClockSVG が生成した q.clockHTML をそのまま表示する
  _renderClockInputs(q, submitAction, submitLabel) {
    const fields = (Array.isArray(q.clockFields) && q.clockFields.length > 0)
      ? q.clockFields
      : [{ key: "h", label: "時", max: 2 }, { key: "m", label: "分", max: 2 }];
    const boxes = fields.map(f => `
        <span class="clock-field">
          <input type="text" inputmode="numeric" id="clock-field-${f.key}" maxlength="${f.max || 2}"
                 oninput="app.syncClockDisplay()" aria-label="${f.label}">
          <span class="clock-field-label">${f.label}</span>
        </span>`).join("");
    return `
      <div class="clock-answer-row">${boxes}</div>
      <button class="numpad-btn ok-btn" style="width:100%; margin-top:10px;" onclick="${submitAction}">${submitLabel}</button>
    `;
  }

  /**
   * 入力欄から回答文字列を組み立てる (例: "3:40")
   * @returns {{answer:string, values:Object}|null} 未入力がある場合は null
   */
  _readClockAnswer(q) {
    const fields = Array.isArray(q.clockFields) ? q.clockFields : [];
    if (fields.length === 0) return null;
    const vals = {};
    let empty = false;
    fields.forEach(f => {
      const node = document.getElementById("clock-field-" + f.key);
      // 全角数字 → 半角に直してから、数字以外を除去（単位付き入力・スマホIME対策）
      const raw = node ? String(node.value || "") : "";
      const v = raw
        .replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xFEE0))
        .replace(/[^0-9]/g, "");
      if (v === "") empty = true;
      vals[f.key] = v;
    });
    if (empty) return null;
    const CS = (typeof window !== "undefined" && window.ClockSVG) ? window.ClockSVG : null;
    const fmt = q.clockFormat || "H:M";
    let ans;
    if (CS && typeof CS.formatHMS === "function") {
      let h = vals.h, m = vals.m, s = vals.s;
      if (fmt === "COUNT") h = vals.count;
      ans = CS.formatHMS(h, m, s, fmt);
    } else {
      ans = fields.map(f => vals[f.key]).join(":");
    }
    return { answer: String(ans), values: vals };
  }

  /** 入力中の「時こく」を回答表示エリアへ反映する */
  _clockSelectionDisplay(q) {
    const read = this._readClockAnswer(q);
    if (!read) return '<span class="answer-placeholder">時こくを いれてね</span>';
    const CS = (typeof window !== "undefined" && window.ClockSVG) ? window.ClockSVG : null;
    const label = (CS && typeof CS.answerLabel === "function")
      ? (CS.answerLabel(read.answer, q.clockFormat || "H:M") || read.answer)
      : read.answer;
    return `<span>${label}</span>`;
  }

  /** 入力欄の変更時に回答表示エリアを更新する (oninput から呼ぶ) */
  syncClockDisplay() {
    if (!this.session || !Array.isArray(this.session.questions)) return;
    const q = this.session.questions[this.session.currentIndex];
    if (!q || !q.clockHTML) return;
    const display = document.getElementById("answer-display");
    if (display) display.innerHTML = this._clockSelectionDisplay(q);
  }

  _figureSelectionDisplay(q) {
    const sel = (this.session && this.session.selectedFigureChoices) || [];
    if (!sel.length) return '<span class="answer-placeholder">？</span>';
    if (q.answerType === "multi_choice") {
      return `${sel.length}こ えらんだ`;
    }
    const c = (Array.isArray(q.figureChoices) ? q.figureChoices : []).find(x => x.id === sel[0]);
    return (c && c.text) ? c.text : sel[0];
  }

  toggleFigureChoice(id) {
    Sound.playClick();
    const q = this.session && this.session.questions ? this.session.questions[this.session.currentIndex] : null;
    if (!q || !Array.isArray(q.figureChoices)) return;
    if (!this.session.selectedFigureChoices) this.session.selectedFigureChoices = [];
    const sel = this.session.selectedFigureChoices;
    const idx = sel.indexOf(id);
    if (q.answerType === "multi_choice") {
      if (idx >= 0) sel.splice(idx, 1); else sel.push(id);
    } else {
      sel.length = 0;
      sel.push(id);
    }
    // V2.6.4: G2カード再描画も対応
    const g2 = (typeof window !== "undefined") ? window : null;
    const isG2q = q && typeof q.templateId === "string" && q.templateId.indexOf("g2_") === 0;
    const FigUI = (isG2q && g2 && g2.FigureShapeUI_G2 && typeof g2.FigureShapeUI_G2.shapeCardHTML2 === "function")
      ? { shapeCardHTML: g2.FigureShapeUI_G2.shapeCardHTML2 }
      : ((typeof FigureShapeUI !== "undefined") ? FigureShapeUI : (g2 ? g2.FigureShapeUI : null));
    const container = document.getElementById("figure-choices");
    if (container && FigUI) {
      container.innerHTML = q.figureChoices.map(c => FigUI.shapeCardHTML(c, sel.includes(c.id))).join("");
    }
  }

  pressKey(key) {
    Sound.playClick();
    if (key === "backspace") {
      this.currentInput = this.currentInput.slice(0, -1);
    } else {
      if (this.currentInput.length < 8) {
        this.currentInput += key;
      }
    }
    const display = document.getElementById("answer-display");
    if (display) {
      const isPinEntry = this.currentScreen === "parent_mode" && this.parentState && this.parentState.step !== "dashboard";
      if (isPinEntry) {
        display.innerHTML = this.currentInput ? this.currentInput.replace(/./g, "●") : '<span class="pin-empty">●</span><span class="pin-empty">●</span><span class="pin-empty">●</span><span class="pin-empty">●</span>';
      } else {
        display.innerHTML = this.currentInput ? this.currentInput : '<span class="answer-placeholder">？</span>';
      }
    }
  }

  // 通常学習の回答処理フロー (第4.4章)
  submitLearningAnswer() {
    const q = this.session.questions[this.session.currentIndex];
    // V2.6.3: 図形選択問題 (figureChoices) は選択済みカードIDを回答として扱う
    let rawAns = this.currentInput.trim();
    // V2.6.7: 時計問題は「時」「分」「秒」の入力欄から回答を組み立てる
    if (q && q.clockHTML) {
      const clockRead = this._readClockAnswer(q);
      if (!clockRead) {
        this._showModal("こたえを いれてね", "「時」「分」の らんに すうじを いれてね。", [
          { text: "OK", action: "app.closeModal()" }
        ]);
        return;
      }
      rawAns = clockRead.answer;
    } else if (q && q.figureChoices) {
      const sel = this.session.selectedFigureChoices || [];
      if (sel.length === 0) return;
      rawAns = sel.join(",");
    }
    if (!rawAns) return;

    this.session.currentAttemptCount++;
    const isCorrect = this._checkAnswer(rawAns, q.answer);

    if (isCorrect) {
      // 正解処理
      Sound.playCorrect();
      this._handleLearningQuestionCompletion(true, this.session.currentAttemptCount, this.session.currentHintUsed, rawAns);
    } else {
      // 不正解処理
      Sound.playIncorrect();
      if (this.session.currentAttemptCount === 1) {
        // 1回目不正解: 「もういちど考えてみよう」
        this._showModal("もういちど考えてみよう！", "おしい！もう一度計算を見直してみよう。", [
          { text: "もう一度挑戦する", action: "app.closeModal()" }
        ]);
        this.currentInput = "";
        const display = document.getElementById("answer-display");
        if (display) display.innerHTML = '<span class="answer-placeholder">？</span>';
      } else if (this.session.currentAttemptCount === 2) {
        // 2回目不正解: ヒント表示
        this.session.currentHintUsed = true;
        Sound.playHint();
        this._showModal("💡 ヒント", `
          <div style="text-align:left; font-size:0.95rem;">
            ${q.hintSteps.map((h, i) => `<div style="background:#fffbeb; padding:8px; border-radius:6px; margin-bottom:6px;"><b>ヒント${i+1}:</b> ${h}</div>`).join("")}
          </div>
        `, [
          { text: "ヒントを使って答える", action: "app.closeModal()" }
        ]);
        this.currentInput = "";
        const display = document.getElementById("answer-display");
        if (display) display.innerHTML = '<span class="answer-placeholder">？</span>';
      } else {
        // 3回目不正解: 終了・正解表示・復習登録
        this._handleLearningQuestionCompletion(false, 3, this.session.currentHintUsed);
      }
    }
  }

  _handleLearningQuestionCompletion(isCorrect, attemptCount, hintUsed, userAnswer) {
    const q = this.session.questions[this.session.currentIndex];
    // V2.6.3: 結果画面表示用の回答文字列 (図形選択問題はカードIDのカンマ区切り)
    const rawAnswerForHistory = (userAnswer === null || userAnswer === undefined) ? "" : String(userAnswer);

    // SessionCoordinator による原子的一括更新 (第34章)
    const coordRes = SessionCoordinator.completeQuestionAtomic({
      appState: this.state,
      questionInstance: q,
      answerResult: {
        correct: isCorrect,
        attemptCount: attemptCount,
        hintUsed: hintUsed,
        completed: true
      },
      config: APP_CONFIG,
      storageManager: this.storage
    });

    if (coordRes.success) {
      this.state = coordRes.nextState;
      if (isCorrect) {
        this.session.correctCount++;
      }
      this.session.earnedPointsTotal += coordRes.summary.pointsEarned;
      this.session.historySummary.push({
        qText: q.questionText,
        isCorrect: isCorrect,
        score: coordRes.summary.learningScore,
        pts: coordRes.summary.pointsEarned,
        // V2.6.3: 図形選択問題は結果画面でカード文ラベル表示できるよう回答とカード情報を保持
        userAnswer: rawAnswerForHistory,
        correctAnswer: q.answer,
        figureChoices: Array.isArray(q.figureChoices)
          ? q.figureChoices.map(c => ({ id: c.id, text: c.text || "" }))
          : null
      });

      // 正解または3回目不正解時のモーダル表示
      const title = isCorrect ? "🎉 せいかい！" : "惜しかったね！";
      const ptsBadge = coordRes.summary.pointsEarned > 0 ? `<span class="badge success">+${coordRes.summary.pointsEarned} pt</span>` : "";

      let bodyHtml = `
        <div style="font-size:1.1rem; font-weight:bold; margin-bottom:8px;">正解: ${q.clockAnswerLabel || q.answer} ${ptsBadge}</div>
        <div style="background:#eff6ff; padding:10px; border-radius:8px; text-align:left; font-size:0.9rem; margin-bottom:12px;">
          <b>📖 解説:</b><br>${q.explanation}
        </div>
      `;

      // 理解確認 (understandingCheck) のミニクイズ
      if (isCorrect && q.understandingCheck && q.understandingCheck.enabled) {
        const uc = q.understandingCheck;
        bodyHtml += `
          <div style="background:#fdf4ff; border:1px solid #e9d5ff; padding:10px; border-radius:8px; text-align:left; margin-bottom:12px;">
            <div style="font-weight:bold; color:#7e22ce; font-size:0.9rem; margin-bottom:6px;">💡 理解確認ミニクイズ</div>
            <div style="font-size:0.85rem; margin-bottom:8px;">${uc.question}</div>
            <div>
              ${uc.choices.map(c => `
                <button class="choice-btn" onclick="app.checkMiniQuizAnswer('${c}', '${uc.answer}')">${c}</button>
              `).join("")}
            </div>
            <div id="ucheck-feedback" style="font-size:0.85rem; font-weight:bold; margin-top:6px;"></div>
          </div>
        `;
      }

      this._showModal(title, bodyHtml, [
        { text: this.session.currentIndex + 1 >= this.session.totalCount ? "結果を見る ➔" : "つぎの問題へ ➔", action: "app.nextLearningQuestion()" }
      ]);
    }
  }

  checkMiniQuizAnswer(selected, correct) {
    const fb = document.getElementById("ucheck-feedback");
    if (!fb) return;
    if (selected === correct) {
      Sound.playCorrect();
      fb.innerHTML = "<span style='color:#16a34a;'>🎉 その通り！バッチリ理解できてるね！</span>";
    } else {
      Sound.playIncorrect();
      fb.innerHTML = `<span style='color:#dc2626;'>もう一歩！正解は ${correct} だよ。</span>`;
    }
  }

  nextLearningQuestion() {
    this.closeModal();
    this.session.currentIndex++;
    this.session.currentAttemptCount = 0;
    this.session.currentHintUsed = false;
    this.currentInput = "";
    this.session.selectedFigureChoices = [];

    if (this.session.currentIndex >= this.session.totalCount) {
      // 10問完了 -> 結果画面へ
      this._stopSessionTimer();
      const elapsedSeconds = (this.session.startedAt)
        ? Math.floor((Date.now() - this.session.startedAt) / 1000)
        : 0;
      Sound.playFanfare();
      this.navigate("session_result", {
        correctCount: this.session.correctCount,
        totalCount: this.session.totalCount,
        earnedPoints: this.session.earnedPointsTotal,
        elapsedSeconds: elapsedSeconds
      });
    } else {
      this.render();
    }
  }

  // ==========================================
  // 5. セッション結果画面 (Screen 5)
  // ==========================================
  _renderSessionResultScreen(params) {
    const accuracyPct = Math.round((params.correctCount / params.totalCount) * 100);
    return `
      <div class="card" style="text-align:center; padding:24px 16px;">
        <div style="font-size:3rem; margin-bottom:8px;">🏆</div>
        <h2>学習セッション完了！</h2>
        <p style="color:var(--text-muted); font-size:0.95rem; margin-bottom:18px;">よくがんばりました！</p>

        <div style="display:grid; grid-template-columns: repeat(2, 1fr); gap:10px; margin-bottom:16px;">
          <div style="background:var(--primary-light); padding:12px; border-radius:var(--radius-md);">
            <div style="font-size:0.85rem; color:var(--text-muted);">正答数</div>
            <div style="font-size:1.6rem; font-weight:bold; color:var(--primary);">${params.correctCount} / ${params.totalCount}</div>
          </div>
          <div style="background:var(--success-light); padding:12px; border-radius:var(--radius-md);">
            <div style="font-size:0.85rem; color:var(--text-muted);">獲得ポイント</div>
            <div style="font-size:1.6rem; font-weight:bold; color:var(--success);">+${params.earnedPoints} pt</div>
          </div>
        </div>

        <div class="progress-container" style="height:12px;">
          <div class="progress-bar" style="width: ${accuracyPct}%;"></div>
        </div>
        <div style="font-size:0.9rem; font-weight:bold; margin-top:4px; margin-bottom:8px;">正答率: ${accuracyPct}%</div>
        <div style="font-size:0.85rem; color:var(--text-muted); margin-bottom:20px;">⏱ かかった時間: ${formatElapsed(params.elapsedSeconds || 0)}</div>

        <button class="btn btn-primary" onclick="app.navigate('home')">🏠 ホームへもどる</button>
      </div>
    `;
  }

  // ==========================================
  // 6. テスト画面 (Screen 6) & テスト結果 (Screen 7)
  // ==========================================
  startTestSession() {
    const profile = this.getActiveProfile();
    try {
      const testQuestions = TestEngine.generateTestQuestions(profile, APP_CONFIG);
      this.session = {
        type: "test",
        currentIndex: 0,
        totalCount: testQuestions.length,
        questions: testQuestions,
        userAnswers: []
      };
      Sound.playClick();
      this.navigate("test");
    } catch (err) {
      alert("テスト問題の生成に失敗しました: " + err.message);
    }
  }

  _renderTestScreen() {
    if (!this.session || !this.session.questions[this.session.currentIndex]) {
      this.navigate("home");
      return "";
    }

    const q = this.session.questions[this.session.currentIndex];
    const progress = `${this.session.currentIndex + 1} / ${this.session.totalCount}`;

    return `
      <div class="question-meta">
        <span><b>📝 テスト 第 ${progress} 問</b></span>
        <span class="badge warn">テストモード（1回解答）</span>
      </div>

      <div class="progress-container">
        <div class="progress-bar" style="width: ${((this.session.currentIndex) / this.session.totalCount) * 100}%;"></div>
      </div>

      <div class="question-display">
        <div class="question-text">${q.questionText}</div>
        ${q.clockHTML ? `<div class="clock-stage">${q.clockHTML}</div>` : ""}
        <div class="answer-input-display" id="answer-display">
          ${q.clockHTML
            ? this._clockSelectionDisplay(q)
            : (q.figureChoices
              ? this._figureSelectionDisplay(q)
              : (this.currentInput ? this.currentInput : '<span class="answer-placeholder">？</span>'))}
        </div>
      </div>

      ${q.clockHTML
        ? this._renderClockInputs(q, "app.submitTestAnswer()", "回答を確定 ➔")
        : (q.figureChoices
          ? this._renderFigureChoices(q, "app.submitTestAnswer()", "回答を確定 ➔")
          : this._renderNumpad("app.submitTestAnswer()", "回答を確定 ➔"))}
    `;
  }

  submitTestAnswer() {
    const q = this.session.questions[this.session.currentIndex];
    // V2.6.3: 図形選択問題 (figureChoices) は選択済みカードIDを回答として扱う
    let rawAns = this.currentInput.trim();
    // V2.6.7: 時計問題は「時」「分」「秒」の入力欄から回答を組み立てる
    if (q && q.clockHTML) {
      const clockRead = this._readClockAnswer(q);
      if (!clockRead) return;
      rawAns = clockRead.answer;
    } else if (q && q.figureChoices) {
      const sel = this.session.selectedFigureChoices || [];
      if (sel.length === 0) return;
      rawAns = sel.join(",");
    }
    if (!rawAns) return;
    this.session.userAnswers.push(rawAns);
    this.currentInput = "";
    this.session.selectedFigureChoices = [];
    this.session.currentIndex++;

    if (this.session.currentIndex >= this.session.totalCount) {
      // テスト完了・採点
      const evalRes = TestEngine.completeTestSession({
        appState: this.state,
        testQuestions: this.session.questions,
        userAnswers: this.session.userAnswers,
        config: APP_CONFIG,
        storageManager: this.storage
      });

      this.state = evalRes.nextState;
      if (evalRes.testRecord.passed) {
        Sound.playFanfare();
      } else {
        Sound.playIncorrect();
      }

      this.navigate("test_result", { testRecord: evalRes.testRecord });
    } else {
      Sound.playClick();
      this.render();
    }
  }

  _renderTestResultScreen(params) {
    const record = params.testRecord;
    const accuracyPct = Math.round(record.accuracy * 100);

    return `
      <div class="card" style="text-align:center;">
        <div style="font-size:3rem; margin-bottom:8px;">${record.passed ? '🎉' : '📖'}</div>
        <h2>${record.passed ? 'テスト合格！おめでとう！' : 'テスト終了'}</h2>
        <p style="color:var(--text-muted); font-size:0.9rem; margin-bottom:14px;">合格ライン: 80%以上 (8問正解)</p>

        <div style="display:flex; justify-content:center; gap:12px; margin-bottom:16px;">
          <div class="card" style="margin:0; padding:10px 16px; background:${record.passed ? 'var(--success-light)' : 'var(--bg)'}">
            <div style="font-size:0.8rem;">得点</div>
            <div style="font-size:1.6rem; font-weight:bold; color:${record.passed ? 'var(--success)' : 'var(--text-main)'};">${record.correctCount} / ${record.questionCount}</div>
          </div>
          <div class="card" style="margin:0; padding:10px 16px; background:var(--primary-light);">
            <div style="font-size:0.8rem;">獲得ポイント (2倍)</div>
            <div style="font-size:1.6rem; font-weight:bold; color:var(--primary);">+${record.pointsEarned} pt</div>
          </div>
        </div>

        <div style="text-align:left; font-size:0.9rem; font-weight:bold; margin-bottom:6px;">📋 問題別正誤一覧:</div>
        <div style="max-height:220px; overflow-y:auto; border:1px solid var(--border); border-radius:var(--radius-sm); margin-bottom:16px;">
          <table style="width:100%; font-size:0.85rem; border-collapse:collapse;">
            ${record.details.map((d, i) => `
              <tr style="border-bottom:1px solid var(--border); background:${d.isCorrect ? '#f0fdf4' : '#fef2f2'};">
                <td style="padding:6px 8px;">${d.isCorrect ? '⭕' : '❌'} 問${i+1}</td>
                <td style="padding:6px 8px;">${d.questionText}</td>
                <td style="padding:6px 8px; text-align:right;">${d.isCorrect ? this._formatAnswerLabel(d.userAnswer, d.figureChoices, d.clockFormat) : `${this._formatAnswerLabel(d.userAnswer, d.figureChoices, d.clockFormat)} (正: ${this._formatAnswerLabel(d.correctAnswer, d.figureChoices, d.clockFormat)})`}</td>
              </tr>
            `).join("")}
          </table>
        </div>

        <button class="btn btn-primary" onclick="app.navigate('home')">🏠 ホームへもどる</button>
      </div>
    `;
  }

  // V2.6.3: 復習キュー表示用に unitId から単元名を解決する
  _getUnitLabel(unitId, grade) {
    if (!unitId) return "";
    try {
      if (typeof UnitRegistry !== "undefined" && UnitRegistry.findUnit) {
        const g = grade || this.state?.profiles?.find(p => p.identity.id === this.state.activeProfileId)?.skill?.subject?.currentGrade;
        const u = UnitRegistry.findUnit("math", g, unitId);
        return (u && u.name) || unitId;
      }
    } catch (e) {
      // フォールバック
    }
    return unitId;
  }

  // ==========================================
  // 7. 復習・履歴画面 (Screen 8)
  // ==========================================
  _renderReviewHistoryScreen(profile) {
    const reviews = profile.reviewQueue || [];
    const active = reviews.filter(r => r.status === "active");
    const graduated = reviews.filter(r => r.status === "graduated");

    return `
      <div class="card">
        <div class="card-title">📚 復習キュー (${active.length} 件)</div>
        <p style="font-size:0.85rem; color:var(--text-muted); margin-bottom:10px;">間違えた問題は、忘れた頃（1日後・3日後・7日後・14日後）に再出題されます。</p>

        ${active.length === 0 ? '<div style="color:var(--text-muted); font-size:0.9rem; padding:12px 0;">現在、復習待ちの単元はありません。完璧です！✨</div>' : `
          <div style="max-height:240px; overflow-y:auto;">
            ${active.map(r => `
              <div style="background:var(--bg); padding:10px; border-radius:var(--radius-sm); margin-bottom:8px; display:flex; justify-content:space-between; align-items:center;">
                <div>
                  <div style="font-weight:bold; font-size:0.9rem;">${this._getUnitLabel(r.unitId, r.grade)}</div>
                  <div style="font-size:0.8rem; color:var(--text-muted);">次回復習: ${r.dueAt} (間隔: ${r.intervalDays}日) / 成功: ${r.successCount}回</div>
                </div>
                <span class="badge warn">復習中</span>
              </div>
            `).join("")}
          </div>
        `}
      </div>

      ${graduated.length > 0 ? `
        <div class="card">
          <div class="card-title">🎓 復習クリア済み単元 (${graduated.length} 件)</div>
          <div style="max-height:140px; overflow-y:auto; font-size:0.85rem;">
            ${graduated.map(g => `
              <div style="padding:4px 0; color:var(--text-muted);">✔ ${this._getUnitLabel(g.unitId, g.grade)} (14日間隔クリア)</div>
            `).join("")}
          </div>
        </div>
      ` : ""}

      <button class="btn btn-outline" onclick="app.navigate('home')">🏠 ホームへもどる</button>
    `;
  }

  // ==========================================
  // 8. 設定画面 (Screen 9)
  // ==========================================
  _renderSettingsScreen(profile) {
    const currentGrade = profile.skill.subject.currentGrade;
    const displayName = this.getDisplayName(profile);

    return `
      <div class="card">
        <div class="card-title">✏️ ニックネーム</div>
        <label style="font-size:0.9rem; font-weight:bold; display:block; margin-bottom:6px;">いまのなまえ: <span style="color:var(--primary);">${displayName}</span> さん</label>
        <div style="display:flex; gap:8px; margin-bottom:6px;">
          <input type="text" id="settings-nickname" maxlength="12" placeholder="あたらしいニックネーム (12もじまで)"
            style="flex:1; padding:10px 12px; font-size:0.95rem; border:2px solid var(--border-color, #e5e7eb); border-radius:var(--radius-md, 12px);">
          <button class="btn btn-primary" style="min-width:80px;" onclick="app.saveNickname()">保存</button>
        </div>
        <p style="font-size:0.8rem; color:var(--text-muted);">※ 空のまま保存すると、デフォルトのなまえに戻ります。</p>
      </div>

      <div class="card">
        <div class="card-title">⚙️ 学年・レベル設定</div>
        <label style="font-size:0.9rem; font-weight:bold; display:block; margin-bottom:6px;">学年を変更する:</label>
        <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:8px; margin-bottom:14px;">
          ${[1, 2, 3, 4, 5, 6].map(g => `
            <button class="btn ${g === currentGrade ? 'btn-primary' : 'btn-outline'}" style="min-height:40px; padding:6px;" onclick="app.changeGrade(${g})">
              小学${g}年 ${g === currentGrade ? '✔' : ''}
            </button>
          `).join("")}
        </div>
        <p style="font-size:0.8rem; color:var(--text-muted);">※ 学年を変更しても、これまでのポイントや過去の学年の進捗はすべて保全されます。</p>
      </div>

      <div class="card">
        <div class="card-title">💾 データバックアップ・引継ぎ</div>
        <button class="btn btn-outline" onclick="app.exportData()">📤 JSON データを保存（エクスポート）</button>
        <button class="btn btn-outline" onclick="document.getElementById('import-file').click()">📥 JSON データを読込（インポート）</button>
        <input type="file" id="import-file" style="display:none;" accept=".json" onchange="app.importData(event)">
      </div>

      <div class="card">
        <div class="card-title">🔷 図形問題</div>
        <label style="font-size:0.9rem; font-weight:bold; display:block; margin-bottom:6px;">図形（かたち）の問題を出す:</label>
        <div style="display:flex; gap:8px; margin-bottom:6px;">
          <button class="btn ${(profile.settings && profile.settings.figureEnabled === false) ? 'btn-outline' : 'btn-primary'}" style="flex:1; min-height:40px;" onclick="app.toggleFigureEnabled(true)">出す ✔</button>
          <button class="btn ${(profile.settings && profile.settings.figureEnabled === false) ? 'btn-primary' : 'btn-outline'}" style="flex:1; min-height:40px;" onclick="app.toggleFigureEnabled(false)">出さない</button>
        </div>
        <p style="font-size:0.8rem; color:var(--text-muted);">※ OFFにすると学習・テストに図形問題が出なくなります。いつでも戻せます。</p>
      </div>

      <div class="card">
        <div class="card-title">👥 プロフィール切り替え・管理</div>
        <button class="btn btn-outline" onclick="app.navigate('profile_select')">👤 別のプロフィールを選ぶ・新規作成</button>
      </div>

      ${(typeof APP_CONFIG !== "undefined" && APP_CONFIG.features && APP_CONFIG.features.parentMode) ? `
      <div class="card">
        <div class="card-title">🔒 保護者モード</div>
        <button class="btn btn-outline" onclick="app.startParentMode()">🔑 保護者ダッシュボードを開く</button>
      </div>
      ` : ""}

      <button class="btn btn-primary" onclick="app.navigate('home')">🏠 ホームへもどる</button>
    `;
  }

  /**
   * ニックネームを保存する (V2.5.14)
   * 設定画面の入力欄から取得し、12文字に制限。空ならデフォルト名へフォールバック。
   */
  saveNickname() {
    const profile = this.getActiveProfile();
    const el = document.getElementById("settings-nickname");
    if (!profile || !el) return;
    const nick = (el.value || "").trim().slice(0, 12);
    profile.identity.nickname = nick;
    this.storage.saveState(this.state);
    Sound.playClick();
    alert(nick ? `ニックネームを「${nick}」に変更しました！` : "ニックネームをやめたよ。デフォルトのなまえに戻ります。");
    this.navigate("settings");
  }

  changeGrade(newGrade) {
    const profile = this.getActiveProfile();
    if (profile.skill.subject.currentGrade === newGrade) return;

    // 学年変更処理 (第18.1.3章)
    profile.skill.subject.currentGrade = newGrade;
    const gKey = `grade${newGrade}`;
    if (!profile.skill.subject.gradeProgress[gKey]) {
      profile.skill.subject.gradeProgress[gKey] = createGradeProgress(newGrade);
    }

    this.storage.saveState(this.state);
    Sound.playClick();
    alert(`学年を「小学${newGrade}年生」に変更しました！`);
    this.navigate("home");
  }

  // V2.6.4: 図形問題の出題ON/OFF切替 (Phase 0, plan A/A-1)
  toggleFigureEnabled(enabled) {
    const profile = this.getActiveProfile();
    if (!profile) return;
    if (!profile.settings) profile.settings = {};
    profile.settings.figureEnabled = !!enabled;
    this.storage.saveState(this.state);
    Sound.playClick();
    this.navigate("settings");
  }

  exportData() {
    const jsonStr = this.storage.exportStateJSON(this.state);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `math_app_backup_${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  importData(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const res = this.storage.importStateJSON(e.target.result);
      if (res.success) {
        this.state = res.state;
        Sound.playFanfare();
        alert("データの読み込みが完了しました！");
        this.navigate("home");
      } else {
        alert("インポート失敗: " + res.error);
      }
    };
    reader.readAsText(file);
  }

  // ==========================================
  // 9. プロフィール選択画面 (Screen 1)
  // ==========================================
  _renderProfileSelectScreen() {
    const profiles = this.state.profiles || [];
    return `
      <div class="card" style="text-align:center;">
        <div style="font-size:2.5rem; margin-bottom:8px;">👥</div>
        <h2>プロフィール選択</h2>
        <div style="margin-top:14px;">
          ${profiles.map(p => `
            <div class="card" style="display:flex; justify-content:space-between; align-items:center; cursor:pointer;" onclick="app.selectProfile('${p.identity.id}')">
              <div style="display:flex; align-items:center; gap:10px;">
                <span style="font-size:2rem;">${this.characterAvatars[p.identity.character] || "🐱"}</span>
                <div style="text-align:left;">
                  <div style="font-weight:bold;">${p.identity.nickname || p.identity.name}${p.identity.nickname ? '<span style="font-size:0.75rem; font-weight:normal; color:var(--text-muted);"> (' + p.identity.name + ')</span>' : ''}</div>
                  <div style="font-size:0.8rem; color:var(--text-muted);">小学${p.skill.subject.currentGrade}年 (⭐ ${p.points.total}pt)</div>
                </div>
              </div>
              <span class="badge ${p.identity.id === this.state.activeProfileId ? 'success' : ''}">${p.identity.id === this.state.activeProfileId ? '選択中' : '選ぶ'}</span>
            </div>
          `).join("")}
        </div>
        <button class="btn btn-primary" onclick="app.navigate('onboarding', { step: 1 })">➕ 新しいプロフィールを作る</button>
        <button class="btn btn-outline" onclick="app.navigate('home')">🏠 もどる</button>
      </div>
    `;
  }

  selectProfile(id) {
    this.state.activeProfileId = id;
    this.storage.saveState(this.state);
    Sound.playClick();
    this.navigate("home");
  }

  // ==========================================
  // 10. 保護者画面 (Screen 10: PINロック + 保護者ダッシュボード)
  // ==========================================
  startParentMode() {
    const profile = this.getActiveProfile();
    const hasPin = !!(profile.settings && profile.settings.parentPin);
    this.parentState = { step: hasPin ? "locked" : "setup1", setupPin: "" };
    this.currentInput = "";
    this.navigate("parent_mode");
  }

  _renderParentScreen(profile) {
    if (!this.parentState || !this.parentState.step) {
      this.parentState = { step: "locked", setupPin: "" };
    }
    if (this.parentState.step === "dashboard") {
      return this._renderParentDashboard(profile);
    }
    return this._renderParentPinScreen(profile);
  }

  // 保護者PIN入力画面 (初回設定 / 確認 / ロック解除 を共通で描画)
  _renderParentPinScreen(profile) {
    const step = this.parentState.step;
    const isSetup = step === "setup1" || step === "setup2";
    const title = step === "setup1" ? "🔒 保護者PINの設定" : (step === "setup2" ? "🔒 もう一度入力" : "🔒 保護者モード");
    const subtitle = step === "setup1"
      ? "4桁のPINを決めてください"
      : (step === "setup2" ? "確認のため、もう一度4桁のPINを入力してください" : "4桁のPINを入力してください");
    const actionLabel = isSetup ? "設定する" : "開く";

    const pinDots = [0, 1, 2, 3].map(() => `<span class="pin-empty">●</span>`).join("");

    return `
      <div class="card" style="text-align:center;">
        <div style="font-size:2.5rem; margin-bottom:8px;">${isSetup ? "🔑" : "🔒"}</div>
        <div class="card-title" style="justify-content:center;">${title}</div>
        <p style="color:var(--text-muted); font-size:0.9rem; margin-bottom:14px;">${subtitle}</p>

        <div class="pin-slot" id="answer-display">${pinDots}</div>

        <div class="numpad-grid" style="margin-top:14px;">
          <button class="numpad-btn" onclick="app.pressKey('7')">7</button>
          <button class="numpad-btn" onclick="app.pressKey('8')">8</button>
          <button class="numpad-btn" onclick="app.pressKey('9')">9</button>
          <button class="numpad-btn" onclick="app.pressKey('4')">4</button>
          <button class="numpad-btn" onclick="app.pressKey('5')">5</button>
          <button class="numpad-btn" onclick="app.pressKey('6')">6</button>
          <button class="numpad-btn" onclick="app.pressKey('1')">1</button>
          <button class="numpad-btn" onclick="app.pressKey('2')">2</button>
          <button class="numpad-btn" onclick="app.pressKey('3')">3</button>
          <button class="numpad-btn action-btn" onclick="app.pressKey('backspace')">⌫ けす</button>
          <button class="numpad-btn" onclick="app.pressKey('0')">0</button>
          <button class="numpad-btn ok-btn" onclick="app.submitParentPin()">${actionLabel} ➔</button>
        </div>

        ${!isSetup ? `<button class="btn btn-outline" style="margin-top:12px; font-size:0.85rem;" onclick="app.resetParentPin()">🔓 PINが分からない</button>` : ""}
        <button class="btn btn-outline" onclick="app.navigate('home')">🏠 ホームへもどる</button>
      </div>
      <div id="modal-container"></div>
    `;
  }

  // PIN送信: ロック解除 / 初回設定(2段階) を状態遷移で処理
  submitParentPin() {
    const profile = this.getActiveProfile();
    const pin = this.currentInput;
    const step = this.parentState.step;

    if (step === "locked") {
      if (profile.settings && pin === profile.settings.parentPin) {
        Sound.playCorrect();
        this.parentState.step = "dashboard";
        this.currentInput = "";
        this.render();
      } else {
        Sound.playIncorrect();
        this.currentInput = "";
        this.render();
        this._showModal("PINがちがいます", "もう一度入力してください。", [{ text: "OK", action: "app.closeModal()" }]);
      }
      return;
    }

    if (step === "setup1") {
      if (!ParentDashboard.validatePin(pin)) {
        this.currentInput = "";
        this.render();
        this._showModal("入力エラー", "4桁の数字で入力してください。", [{ text: "OK", action: "app.closeModal()" }]);
        return;
      }
      this.parentState.setupPin = pin;
      this.parentState.step = "setup2";
      this.currentInput = "";
      this.render();
      return;
    }

    if (step === "setup2") {
      if (pin === this.parentState.setupPin && ParentDashboard.validatePin(pin)) {
        if (!profile.settings) profile.settings = {};
        profile.settings.parentPin = pin;
        this.storage.saveState(this.state);
        Sound.playFanfare();
        this.parentState.step = "dashboard";
        this.currentInput = "";
        this.render();
      } else {
        Sound.playIncorrect();
        this.parentState.step = "setup1";
        this.parentState.setupPin = "";
        this.currentInput = "";
        this.render();
        this._showModal("PINが一致しません", "最初から設定し直してください。", [{ text: "OK", action: "app.closeModal()" }]);
      }
      return;
    }
  }

  // PINを変更 (ダッシュボードから)
  changeParentPin() {
    this.parentState = { step: "setup1", setupPin: "" };
    this.currentInput = "";
    this.render();
  }

  // PINリセット (設定画面 or PIN入力画面から)
  resetParentPin() {
    this._showModal("PINをリセット", "保護者PINを削除してロックを解除しますか？", [
      { text: "削除する", action: "app.confirmResetParentPin()" },
      { text: "やめる", action: "app.closeModal()" }
    ]);
  }

  confirmResetParentPin() {
    const profile = this.getActiveProfile();
    if (profile.settings) profile.settings.parentPin = "";
    this.storage.saveState(this.state);
    this.closeModal();
    this.parentState = { step: "setup1", setupPin: "" };
    this.currentInput = "";
    this.render();
  }

// 保護者ダッシュボード本体 (ParentDashboard が集計)
  _renderParentDashboard(profile) {
    if (typeof ParentDashboard === "undefined") {
      return `<div class="card">ダッシュボードを読み込めませんでした。</div>`;
    }
    const s = ParentDashboard.buildSummary(profile, APP_CONFIG);
    const statusLabel = { achieved: "達成", weak: "弱点", learning: "学習中", not_started: "未学習" };
    const fmtPct = (v) => (v === null || typeof v === "undefined") ? "—" : Math.round(v * 100) + "%";

    const unitRows = s.currentUnitRows.map(r => `
      <div class="unit-progress-row">
        <div class="unit-name">${r.name}</div>
        <div class="unit-meter">
          <div class="progress-bar mastery-bar"><div style="width:${Math.min(100, Math.round(r.mastery * 100))}%"></div></div>
          <div style="font-size:0.7rem; color:var(--text-muted);">${r.attempts}問 / 正答率 ${fmtPct(r.accuracy)}</div>
        </div>
        <span class="status-badge status-${r.status}">${statusLabel[r.status] || r.status}</span>
      </div>`).join("");

    const weakRows = s.weakUnits.length
      ? s.weakUnits.map(w => `
          <div class="unit-progress-row">
            <div class="unit-name">${w.name} <span style="color:var(--text-muted); font-weight:normal;">（小学${w.grade}年）</span></div>
            <div style="font-size:0.8rem; color:#991b1b; font-weight:bold;">正答率 ${fmtPct(w.accuracy)}</div>
          </div>`).join("")
      : `<div style="color:var(--text-muted); font-size:0.85rem; padding:8px 0;">弱点単元はありません 🎉</div>`;

    const testRows = s.recentTests.length
      ? s.recentTests.map(t => `
          <div style="display:flex; justify-content:space-between; font-size:0.85rem; padding:6px 0; border-bottom:1px solid var(--border);">
            <span>${t.passed ? "🎉 合格" : "📖 不合格"}（小学${t.grade}年）</span>
            <span>${t.correctCount}/${t.questionCount} 問 / 正答率 ${fmtPct(t.accuracy)}</span>
          </div>`).join("")
      : `<div style="color:var(--text-muted); font-size:0.85rem; padding:8px 0;">テストはまだ未受験です。</div>`;

    const historyRows = s.recentHistory.length
      ? s.recentHistory.slice(0, 5).map(h => `
          <div style="display:flex; justify-content:space-between; font-size:0.85rem; padding:5px 0; border-bottom:1px solid var(--border);">
            <span>${h.correct ? "⭕ せいかい" : "❌ まちがい"}（小学${h.grade}年）</span>
            <span style="color:var(--text-muted); font-size:0.75rem;">${(h.completedAt || "").slice(0, 10)}</span>
          </div>`).join("")
      : `<div style="color:var(--text-muted); font-size:0.85rem; padding:8px 0;">学習履歴はまだありません。</div>`;

    const gradeRows = s.gradeSummaries.map(g => `
      <div style="display:flex; justify-content:space-between; font-size:0.85rem; padding:5px 0; border-bottom:1px solid var(--border);">
        <span>小学${g.grade}年（Lv${g.level}）</span>
        <span>${g.attempts}問 / 正答率 ${fmtPct(g.accuracy)}</span>
      </div>`).join("");

    const badgeHtml = s.badges.map(b => `
      <div class="badge-item ${b.unlocked ? 'unlocked' : ''}">
        <span style="font-size:1.2rem;">${b.unlocked ? "🏅" : "🔒"}</span>
        <div>
          <div style="font-weight:bold; font-size:0.8rem;">${b.label}</div>
          <div style="font-size:0.7rem; color:var(--text-muted);">${b.description}</div>
        </div>
      </div>`).join("");

    // V2.5.15: 学習推移グラフ (SVG) を3モード分生成
    const graphHtml = this._renderDailyGraph(s);

    return this._assembleParentDashboardHtml(s, { unitRows, weakRows, testRows, historyRows, gradeRows, badgeHtml, fmtPct, graphHtml });
  }

  /**
   * 学習推移グラフ (SVG バー + 正答率折線) を生成する (V2.5.15)
   * フィルター (all / learning / test) はセグメントボタンで切替 → ブラウザ側の JS で SVG を差し替える
   */
  _renderDailyGraph(s) {
    const seriesMap = {
      all: s.dailyStats.all,
      learning: s.dailyStats.learning,
      test: s.dailyStats.test
    };
    const seriesNames = { all: "すべて", learning: "通常学習", test: "テスト" };

    // 各モードのSVGを生成
    const svgHtml = {};
    for (const mode of ["all", "learning", "test"]) {
      const rows = seriesMap[mode] || [];
      svgHtml[mode] = this._buildGraphSvg(rows);
    }

    const buttons = ["all", "learning", "test"].map(mode =>
      `<button class="btn btn-outline" style="flex:1; min-height:34px; padding:6px; font-size:0.8rem; margin:0;" onclick="app.switchGraphMode('${mode}')" data-graph-mode="${mode}">${seriesNames[mode]}</button>`
    ).join("");

    // サマリー: 全モード合算の合計・平均
    const totalAttempts = seriesMap.all.reduce((s2, d) => s2 + d.attempts, 0);
    const totalCorrect = seriesMap.all.reduce((s2, d) => s2 + d.correct, 0);
    const avgAcc = totalAttempts > 0 ? Math.round((totalCorrect / totalAttempts) * 1000) / 1000 : null;

    return `
      <div class="card">
        <div class="dash-section-title">📈 学習推移（直近${s.dailyStats.all.length}日）</div>
        <div style="display:flex; gap:6px; margin-bottom:10px;">
          ${buttons}
        </div>
        <!-- 全モードのSVGソース (非表示・切替え時も消えないようコンテナの外に保持) -->
        <div id="daily-graph-holder" style="display:none;">
          <div data-graph-svg="all">${svgHtml.all}</div>
          <div data-graph-svg="learning">${svgHtml.learning}</div>
          <div data-graph-svg="test">${svgHtml.test}</div>
        </div>
        <div id="daily-graph-container">
          ${svgHtml.all}
        </div>
        <div id="daily-graph-summary" style="font-size:0.8rem; color:var(--text-muted); margin-top:8px; text-align:center;">
          合計 ${totalAttempts}問 / 平均正答率 ${totalAttempts > 0 ? Math.round((totalCorrect / totalAttempts) * 100) : 0}%
          <span style="margin-left:10px;">🔥 連続学習 ${s.dailyStreak}日（最高 ${s.bestDailyStreak}日）</span>
          <span style="margin-left:10px;">🎯 今日 ${s.todayCount}/${s.dailyGoal}問</span>
        </div>
      </div>`;
  }

  /**
   * 日別データから SVG グラフ（バー = 問題数 / 折線 = 正答率）を生成する (V2.5.15)
   * バーの色は正答率で変化: 🟢80%以上 / 🟡50%以上 / 🔴50%未満 / ⚪学習なし
   */
  _buildGraphSvg(rows) {
    const width = 500;
    const height = 160;
    const padL = 24;
    const padR = 8;
    const padT = 14;
    const padB = 22;
    const chartW = width - padL - padR;
    const chartH = height - padT - padB;

    const maxAttempts = Math.max(1, ...rows.map(r => r.attempts));
    const n = rows.length;
    const slot = n > 0 ? chartW / n : chartW;
    const barW = Math.max(3, slot * 0.55);

    const bars = rows.map((r, i) => {
      const x = padL + slot * i + (slot - barW) / 2;
      const h = r.attempts > 0 ? Math.max(2, (r.attempts / maxAttempts) * chartH) : 1;
      const y = padT + chartH - h;
      const color = r.attempts === 0 ? "#e2e8f0"
        : (r.accuracy !== null && r.accuracy >= 0.8 ? "#10b981"
          : (r.accuracy !== null && r.accuracy >= 0.5 ? "#f59e0b" : "#ef4444"));
      const label = n <= 14 ? r.date.slice(5) : ""; // MM-DD を表示 (多い時は省略)
      return `
        <rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barW.toFixed(1)}" height="${h.toFixed(1)}" rx="2" fill="${color}" opacity="0.85">
          <title>${r.date}: ${r.attempts}問 / 正答率 ${r.accuracy !== null ? Math.round(r.accuracy * 100) : "-"}%</title>
        </rect>
        ${label ? `<text x="${(x + barW / 2).toFixed(1)}" y="${height - 6}" font-size="8" fill="#64748b" text-anchor="middle">${label}</text>` : ""}`;
    }).join("");

    // 正答率の折線 (学習ありの日のみプロット)
    let linePoints = [];
    rows.forEach((r, i) => {
      if (r.attempts > 0 && r.accuracy !== null) {
        const x = padL + slot * i + slot / 2;
        const y = padT + chartH - r.accuracy * chartH;
        linePoints.push({ x, y });
      }
    });
    const linePath = linePoints.length >= 2
      ? linePoints.map((p, i) => (i === 0 ? `M ${p.x.toFixed(1)} ${p.y.toFixed(1)}` : `L ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)).join(" ")
      : "";

    return `
      <svg viewBox="0 0 ${width} ${height}" style="width:100%; height:auto;" role="img" aria-label="学習推移グラフ">
        <text x="${padL}" y="${padT - 4}" font-size="9" fill="#94a3b8">問題数</text>
        ${bars}
        ${linePath ? `<path d="${linePath}" fill="none" stroke="#3b82f6" stroke-width="2" opacity="0.8"/>` : ""}
        ${linePath ? linePoints.map(p => `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="2.5" fill="#3b82f6"/>`).join("") : ""}
      </svg>
      <div style="display:flex; gap:10px; font-size:0.7rem; color:var(--text-muted); margin-top:4px;">
        <span>■ <span style="color:#10b981;">正答率80%〜</span></span>
        <span>■ <span style="color:#f59e0b;">50%〜</span></span>
        <span>■ <span style="color:#ef4444;">50%未満</span></span>
        <span>■ <span style="color:#e2e8f0;">学習なし</span></span>
        <span style="margin-left:auto;">— 正答率(青)</span>
      </div>`;
  }

  /**
   * 学習推移グラフの表示モードを切り替える (V2.5.15)
   * 非表示の holder (コンテナの外) から対象モードのSVGを取り出してコンテナを差し替える
   * @param {string} mode "all" | "learning" | "test"
   */
  switchGraphMode(mode) {
    const container = document.getElementById("daily-graph-container");
    if (!container) return;
    const holder = document.getElementById("daily-graph-holder");
    const source = holder ? holder.querySelector(`[data-graph-svg="${mode}"]`) : null;
    if (source) {
      container.innerHTML = source.innerHTML;
    }
    // ボタンのアクティブ表示
    const buttons = document.querySelectorAll("[data-graph-mode]");
    buttons.forEach(btn => {
      const isActive = btn.getAttribute("data-graph-mode") === mode;
      btn.style.background = isActive ? "#3b82f6" : "";
      btn.style.color = isActive ? "#fff" : "";
    });
  }

  _assembleParentDashboardHtml(s, parts) {
    const { unitRows, weakRows, testRows, historyRows, gradeRows, badgeHtml, fmtPct, graphHtml } = parts;
    return `
      <div class="card">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
          <div class="card-title" style="margin:0;">🔒 保護者ダッシュボード</div>
          <span class="badge success">小学${s.currentGrade}年・Lv${s.currentLevel}</span>
        </div>
        <p style="font-size:0.85rem; color:var(--text-muted); margin-bottom:12px;">${s.profileName}さんの学習状況です。</p>

        <div class="dash-stats">
          <div class="dash-stat-card"><div class="stat-label">達成レベル</div><div class="stat-value">Lv${s.achievementLevel}</div></div>
          <div class="dash-stat-card"><div class="stat-label">累計ポイント</div><div class="stat-value">${s.totalPoints} pt</div></div>
          <div class="dash-stat-card"><div class="stat-label">累計学習問数</div><div class="stat-value">${s.totalAttempts} 問</div></div>
          <div class="dash-stat-card"><div class="stat-label">総合正答率</div><div class="stat-value">${fmtPct(s.totalAccuracy)}</div></div>
          <div class="dash-stat-card"><div class="stat-label">最高連続正解</div><div class="stat-value">${s.bestStreak} 問</div></div>
          <div class="dash-stat-card"><div class="stat-label">現在の連続正解</div><div class="stat-value">${s.currentStreak} 問</div></div>
        </div>
      </div>

      <div class="card">
        <div class="dash-section-title">📚 現在の単元別習熟度（小学${s.currentGrade}年・Lv${s.currentLevel}）</div>
        ${unitRows || '<div style="color:var(--text-muted); font-size:0.85rem;">単元がありません。</div>'}
      </div>

      <div class="card">
        <div class="dash-section-title">⚠️ 弱点単元（要フォロー）</div>
        ${weakRows}
      </div>

      <div class="card">
        <div class="dash-section-title">🗓復習状況</div>
        <div style="display:flex; gap:10px;">
          <div class="dash-stat-card" style="flex:1;"><div class="stat-label">復習待ち</div><div class="stat-value">${s.reviewInfo.active}件</div></div>
          <div class="dash-stat-card" style="flex:1;"><div class="stat-label">復習クリア</div><div class="stat-value">${s.reviewInfo.graduated}件</div></div>
        </div>
      </div>

      <!-- V2.5.15: 学習推移グラフ -->
      ${graphHtml || ""}

      <div class="card">
        <div class="dash-section-title">📝 直近のテスト成績</div>
        ${testRows}
      </div>

      <div class="card">
        <div class="dash-section-title">🕐 直近の学習履歴</div>
        ${historyRows}
      </div>

      <div class="card">
        <div class="dash-section-title">🎖バッジ一覧</div>
        <div class="badge-grid">${badgeHtml}</div>
      </div>

      <div class="card">
        <div class="dash-section-title">📈 学年別サマリー</div>
        ${gradeRows}
      </div>

      <button class="btn btn-outline" onclick="app.changeParentPin()">🔑 PINを変更する</button>
      <button class="btn btn-primary" onclick="app.navigate('home')">🏠 ホームへもどる</button>
    `;
  }

  // ==========================================
  // ユーティリティ
  // ==========================================
  _showModal(title, bodyHtml, buttons = []) {
    const modalContainer = document.getElementById("modal-container");
    if (!modalContainer) return;
    modalContainer.innerHTML = `
      <div class="modal-overlay">
        <div class="modal-card">
          <h3 style="font-size:1.3rem; margin-bottom:10px;">${title}</h3>
          <div style="margin-bottom:16px;">${bodyHtml}</div>
          <div>
            ${buttons.map(b => `<button class="btn btn-primary" onclick="${b.action}">${b.text}</button>`).join("")}
          </div>
        </div>
      </div>
    `;
  }

  closeModal() {
    const modalContainer = document.getElementById("modal-container");
    if (modalContainer) modalContainer.innerHTML = "";
  }

  /**
   * V2.6.3: 図形選択問題の回答 (カンマ区切りカードID) をカード文ラベルへ変換する
   * figureChoices が無い通常問題では、そのまま回答文字列を返す
   * V2.6.8: clockFormat を指定すると時計回答の表示ラベル精度が上がる (HhM → 「2時間30分」)
   * @param {string} answerStr 回答または正解の文字列 (例: "c1" / "p2,p4,p6" / "3:40")
   * @param {Array<{id:string, text:string}>} figureChoices 出題時のカード情報
   * @param {string} [clockFormat] 時計回答の形式 ("H:M" / "H:M:S" / "HhM" / "M")
   * @returns {string} 表示用ラベル
   */
  _formatAnswerLabel(answerStr, figureChoices, clockFormat) {
    const raw = (answerStr === null || answerStr === undefined) ? "" : String(answerStr);
    // V2.6.7: 時こく回答 ("3:40" 等) は「3時40分」の表示用ラベルへ変換する
    const clockSVG = (typeof window !== "undefined" && window.ClockSVG) ? window.ClockSVG : null;
    if (clockSVG && typeof clockSVG.answerLabel === "function") {
      if (clockFormat) {
        const label = clockSVG.answerLabel(raw, clockFormat);
        if (label) return label;
      } else if (raw.indexOf(":") >= 0) {
        const fmt = (raw.split(":").length >= 3) ? "H:M:S" : "H:M";
        return clockSVG.answerLabel(raw, fmt) || raw;
      }
    }
    if (!Array.isArray(figureChoices) || figureChoices.length === 0) return raw;
    const map = {};
    figureChoices.forEach(c => { if (c && c.id) map[c.id] = c.text || c.id; });
    const ids = raw.split(",").map(s => s.trim()).filter(s => s.length > 0);
    if (ids.length === 0) return raw;
    return ids.map(id => (map[id] !== undefined ? map[id] : id)).join("・");
  }

  _checkAnswer(userInput, correctAnswer) {
    const cleanU = (userInput || "").replace(/\s+/g, "");
    const cleanA = (correctAnswer || "").replace(/\s+/g, "");
    if (cleanU === cleanA) return true;
    // V2.6.7: 時こく回答 ("3:40" 等) は ClockSVG で比較（桁数ゆれ・全角数字・単位表記を吸収）
    const clockSVG = (typeof window !== "undefined" && window.ClockSVG) ? window.ClockSVG : null;
    if (clockSVG && typeof clockSVG.equalsAnswer === "function" &&
        (cleanU.indexOf(":") >= 0 || cleanA.indexOf(":") >= 0)) {
      return clockSVG.equalsAnswer(cleanU, cleanA);
    }
    // V2.6.3: 複数選択問題 (multi_choice) はカンマ区切りID集合の完全一致で判定 (順序不問)
    const uSet = cleanU.split(",");
    const aSet = cleanA.split(",");
    if (uSet.length > 1 || aSet.length > 1) {
      if (uSet.length !== aSet.length) return false;
      const aSorted = aSet.slice().sort();
      return uSet.slice().sort().every((v, i) => v === aSorted[i]);
    }
    const numU = parseFloat(cleanU);
    const numA = parseFloat(cleanA);
    return !isNaN(numU) && !isNaN(numA) && numU === numA;
  }

  _attachEventHandlers() {
    // 必要に応じたキーボード・リスナー
  }
}

const app = new AppUI();

if (typeof module !== "undefined" && module.exports) {
  module.exports = { AppUI, app, formatElapsed };
} else {
  window.AppUI = AppUI;
  window.app = app;
  window.formatElapsed = formatElapsed;
}

