/**
 * Web Audio Sound Effects Synthesizer
 * 外部通信・外部音声ファイル不要のスタンドアロン音響エンジン
 */

class SoundSynthesizer {
  constructor() {
    this.ctx = null;
    this.enabled = true;
  }

  _initContext() {
    if (!this.ctx && typeof window !== "undefined") {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  setEnabled(enabled) {
    this.enabled = !!enabled;
  }

  /**
   * ボタンタップ音（軽いクリック）
   */
  playClick() {
    if (!this.enabled) return;
    this._initContext();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(600, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(300, this.ctx.currentTime + 0.05);

    gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.05);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.05);
  }

  /**
   * 正解音（ピンポン♫）
   */
  playCorrect() {
    if (!this.enabled) return;
    this._initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    // 1音目 (High E: 659.25Hz)
    const osc1 = this.ctx.createOscillator();
    const gain1 = this.ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(659.25, now);
    gain1.gain.setValueAtTime(0.2, now);
    gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
    osc1.connect(gain1);
    gain1.connect(this.ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.25);

    // 2音目 (High G#: 830.61Hz)
    const osc2 = this.ctx.createOscillator();
    const gain2 = this.ctx.createGain();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(830.61, now + 0.15);
    gain2.gain.setValueAtTime(0.25, now + 0.15);
    gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.45);
    osc2.connect(gain2);
    gain2.connect(this.ctx.destination);
    osc2.start(now + 0.15);
    osc2.stop(now + 0.45);
  }

  /**
   * 不正解・もう一度音（やさしいブブッ）
   */
  playIncorrect() {
    if (!this.enabled) return;
    this._initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.setValueAtTime(180, now + 0.1);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.3);
  }

  /**
   * ヒント音（ポロン♫）
   */
  playHint() {
    if (!this.enabled) return;
    this._initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const freqs = [523.25, 659.25, 783.99]; // C5, E5, G5
    freqs.forEach((f, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(f, now + i * 0.08);
      gain.gain.setValueAtTime(0.15, now + i * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.08 + 0.2);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now + i * 0.08);
      osc.stop(now + i * 0.08 + 0.2);
    });
  }

  /**
   * ファンファーレ（合格・レベルアップ）
   */
  playFanfare() {
    if (!this.enabled) return;
    this._initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const melody = [
      { f: 523.25, t: 0.0, d: 0.12 }, // C
      { f: 659.25, t: 0.12, d: 0.12 }, // E
      { f: 783.99, t: 0.24, d: 0.12 }, // G
      { f: 1046.50, t: 0.36, d: 0.45 } // High C
    ];

    melody.forEach(m => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(m.f, now + m.t);
      gain.gain.setValueAtTime(0.25, now + m.t);
      gain.gain.exponentialRampToValueAtTime(0.01, now + m.t + m.d);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now + m.t);
      osc.stop(now + m.t + m.d);
    });
  }
}

const Sound = new SoundSynthesizer();

if (typeof module !== "undefined" && module.exports) {
  module.exports = { SoundSynthesizer, Sound };
} else {
  window.SoundSynthesizer = SoundSynthesizer;
  window.Sound = Sound;
}

