import Phaser from 'phaser';
import { POLITICAL_PHASES } from '../config/GameBalance';
import { PoliticalPhaseDefinition, PoliticalPhaseId } from '../types/GameTypes';
import { SoundManager } from '../audio/SoundManager';

export class PoliticalPhaseSystem extends Phaser.Events.EventEmitter {
  private consciousness = 0;
  private currentPhase: PoliticalPhaseDefinition = POLITICAL_PHASES[0];

  constructor(initialConsciousness = 0) {
    super();
    this.consciousness = initialConsciousness;
    this.currentPhase = this.resolvePhase(this.consciousness);
  }

  public getConsciousness(): number {
    return this.consciousness;
  }

  public getCurrentPhase(): PoliticalPhaseDefinition {
    return this.currentPhase;
  }

  public addConsciousness(amount: number, reasonLabel?: string): void {
    const prev = this.consciousness;
    this.consciousness = Phaser.Math.Clamp(
      Math.round((this.consciousness + amount) * 10) / 10,
      0,
      100
    );

    if (this.consciousness !== prev) {
      this.emit('consciousness-changed', this.consciousness, amount, reasonLabel);
    }

    const nextPhase = this.resolvePhase(this.consciousness);
    if (nextPhase.id !== this.currentPhase.id) {
      const oldPhase = this.currentPhase;
      this.currentPhase = nextPhase;
      if (nextPhase.id === PoliticalPhaseId.FASE_6_CONFRONTO_FINAL) {
        SoundManager.playBossAlert();
      } else {
        SoundManager.playPhaseUp();
      }
      this.emit('phase-changed', nextPhase, oldPhase);
    }
  }

  public isAjusteFiscalActive(): boolean {
    return this.currentPhase.id < PoliticalPhaseId.FASE_3_VITORIA_URBANA;
  }

  public isBrigadaComunitariaUnlocked(): boolean {
    return this.currentPhase.id >= PoliticalPhaseId.FASE_2_SEMENTE_ORGANIZACAO;
  }

  public isGuardaFlorestalUnlocked(): boolean {
    return this.currentPhase.id >= PoliticalPhaseId.FASE_4_AUTODEFESA_ARMADA;
  }

  public isIndigenousDemarcationActive(): boolean {
    return this.currentPhase.id >= PoliticalPhaseId.FASE_5_ESCUDO_TERRITORIAL;
  }

  public isBossRevealed(): boolean {
    return this.currentPhase.id === PoliticalPhaseId.FASE_6_CONFRONTO_FINAL;
  }

  private resolvePhase(value: number): PoliticalPhaseDefinition {
    for (let i = POLITICAL_PHASES.length - 1; i >= 0; i--) {
      if (value >= POLITICAL_PHASES[i].minConsciousness) {
        return POLITICAL_PHASES[i];
      }
    }
    return POLITICAL_PHASES[0];
  }
}
