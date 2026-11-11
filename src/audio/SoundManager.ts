/**
 * Gerenciador de Áudio 8-bit procedural via Web Audio API.
 * Otimizado para dispositivos móveis: desbloqueia automaticamente no primeiro toque.
 */
class SoundManagerImpl {
  private ctx: AudioContext | null = null;
  private muted = false;
  private bgmInterval: number | null = null;
  private step = 0;

  public unlock(): void {
    try {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioCtx) {
          this.ctx = new AudioCtx();
        }
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
    } catch {
      // Ignora caso o navegador bloqueie áudio
    }
  }

  public toggleMute(): boolean {
    this.muted = !this.muted;
    if (this.muted) {
      this.stopMusic();
    }
    return this.muted;
  }

  public isMuted(): boolean {
    return this.muted;
  }

  private playTone(
    freq: number,
    durationSec: number,
    type: OscillatorType = 'square',
    volume = 0.08,
    slideToFreq?: number
  ): void {
    if (this.muted) return;
    this.unlock();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, now);
      if (slideToFreq) {
        osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideToFreq), now + durationSec);
      }

      gain.gain.setValueAtTime(volume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + durationSec);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + durationSec);
    } catch {
      // Ignore audio errors
    }
  }

  public playSelect(): void {
    this.playTone(520, 0.07, 'square', 0.06, 680);
  }

  public playCommandMove(): void {
    this.playTone(440, 0.08, 'triangle', 0.07, 580);
  }

  public playExtinguish(): void {
    this.playTone(300, 0.14, 'sawtooth', 0.06, 140);
  }

  public playFireStart(): void {
    this.playTone(190, 0.22, 'sawtooth', 0.08, 95);
  }

  public playCapture(): void {
    this.playTone(480, 0.08, 'square', 0.08, 760);
    setTimeout(() => this.playTone(760, 0.14, 'square', 0.08, 980), 80);
  }

  public playIntegratedAction(): void {
    const notes = [330, 440, 554, 659];
    notes.forEach((n, idx) => {
      setTimeout(() => this.playTone(n, 0.1, 'square', 0.07), idx * 65);
    });
  }

  public playPhaseUp(): void {
    const notes = [261.6, 329.6, 392.0, 523.2, 659.2];
    notes.forEach((n, idx) => {
      setTimeout(() => this.playTone(n, 0.14, 'square', 0.09), idx * 80);
    });
  }

  public playBossAlert(): void {
    const notes = [146.8, 138.6, 130.8, 110.0];
    notes.forEach((n, idx) => {
      setTimeout(() => this.playTone(n, 0.22, 'sawtooth', 0.11), idx * 160);
    });
  }

  public playVictory(): void {
    const notes = [392, 493.8, 587.3, 784, 987.7];
    notes.forEach((n, idx) => {
      setTimeout(() => this.playTone(n, 0.18, 'square', 0.09), idx * 110);
    });
  }

  public playDefeat(): void {
    const notes = [300, 260, 220, 165];
    notes.forEach((n, idx) => {
      setTimeout(() => this.playTone(n, 0.22, 'sawtooth', 0.09), idx * 140);
    });
  }

  public startMusic(): void {
    this.stopMusic();
    if (this.muted) return;
    this.step = 0;
    const bassLine = [110, 110, 130.8, 146.8, 110, 110, 164.8, 146.8];
    this.bgmInterval = window.setInterval(() => {
      if (this.muted) return;
      const freq = bassLine[this.step % bassLine.length];
      this.playTone(freq, 0.16, 'triangle', 0.025);
      this.step++;
    }, 420);
  }

  public stopMusic(): void {
    if (this.bgmInterval !== null) {
      clearInterval(this.bgmInterval);
      this.bgmInterval = null;
    }
  }
}

export const SoundManager = new SoundManagerImpl();
