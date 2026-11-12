import Phaser from 'phaser';
import {
  BALANCE,
  CAMPO_RADIUS,
  CAMPO_RADIUS_Y,
  WORLD_CENTER_X,
  WORLD_CENTER_Y,
  getRandomPointInSector
} from '../config/GameBalance';
import { SoundManager } from '../audio/SoundManager';
import {
  DifficultyConfig,
  IntegratedActionType,
  LocalActionType,
  SectorType
} from '../types/GameTypes';
import { FireSmokeSystem } from './FireSmokeSystem';
import { PoliticalPhaseSystem } from './PoliticalPhaseSystem';

export class SectorSystem extends Phaser.Events.EventEmitter {
  private scene: Phaser.Scene;
  private difficulty: DifficultyConfig;
  private phaseSystem: PoliticalPhaseSystem;
  private fireSystem: FireSmokeSystem;

  private cooldownEnds: Map<string, number> = new Map();
  private cooldownDurations: Map<string, number> = new Map();
  private capturedArsonistsQueue = 0;
  private urbanStress = 45; // 0 a 100 (Campo -> Cidade zera o estresse urbano conforme GDD)

  constructor(
    scene: Phaser.Scene,
    difficulty: DifficultyConfig,
    phaseSystem: PoliticalPhaseSystem,
    fireSystem: FireSmokeSystem
  ) {
    super();
    this.scene = scene;
    this.difficulty = difficulty;
    this.phaseSystem = phaseSystem;
    this.fireSystem = fireSystem;
  }

  public getDifficulty(): DifficultyConfig {
    return this.difficulty;
  }

  public getCapturedQueue(): number {
    return this.capturedArsonistsQueue;
  }

  public addCapturedArsonist(): void {
    this.capturedArsonistsQueue++;
    this.emit('captures-updated', this.capturedArsonistsQueue);
  }

  public getUrbanStress(): number {
    return this.urbanStress;
  }

  public update(deltaMs: number): void {
    const dtSec = deltaMs / 1000;
    const citySmoke = this.fireSystem.getSectorSmokeLevel(SectorType.CIDADE);
    const ajusteAtivo = this.phaseSystem.isAjusteFiscalActive();

    // Estresse urbano sobe com Ajuste Fiscal e Fumaça na Cidade
    const stressRate = (ajusteAtivo ? 1.1 : 0.35) + citySmoke * 0.65;
    this.urbanStress = Phaser.Math.Clamp(this.urbanStress + stressRate * dtSec, 0, 100);
  }

  public getCooldownRemainingRatio(actionKey: string): number {
    const now = this.scene.time.now;
    const end = this.cooldownEnds.get(actionKey) ?? 0;
    const dur = this.cooldownDurations.get(actionKey) ?? 1;
    if (now >= end) return 0;
    return Phaser.Math.Clamp((end - now) / dur, 0, 1);
  }

  public isActionReady(actionKey: string): boolean {
    if (actionKey === IntegratedActionType.CAPTURA_PARA_CIDADE) {
      return this.capturedArsonistsQueue > 0;
    }
    return this.getCooldownRemainingRatio(actionKey) <= 0;
  }

  /**
   * Calcula o tempo de recarga considerando:
   * 1. Ajuste Fiscal ativo nas Fases 1 e 2 penaliza ações da Cidade
   * 2. Fumaça tóxica no setor de origem dobra o cooldown conforme o GDD!
   */
  private computeEffectiveCooldown(baseMs: number, originSector: SectorType): number {
    let mult = 1.0;

    if (originSector === SectorType.CIDADE && this.phaseSystem.isAjusteFiscalActive()) {
      mult *= BALANCE.AJUSTE_FISCAL_COOLDOWN_MULT;
    }

    const smoke = this.fireSystem.getSectorSmokeLevel(originSector);
    if (smoke >= 2) {
      mult *= BALANCE.SMOKE_COOLDOWN_MULT; // Dobra o cooldown sob fumaça tóxica!
    }

    return Math.round(baseMs * mult);
  }

  private triggerCooldown(actionKey: string, baseMs: number, originSector: SectorType): void {
    const duration = this.computeEffectiveCooldown(baseMs, originSector);
    this.cooldownDurations.set(actionKey, duration);
    this.cooldownEnds.set(actionKey, this.scene.time.now + duration);
  }

  /**
   * Executa uma das 4 Ações Integradas (O Coração Estratégico do GDD).
   * O ganho de Consciência Coletiva escala com a Dificuldade escolhida!
   */
  public executeIntegratedAction(
    type: IntegratedActionType,
    onEquipUnits: () => void,
    onDamageBoss: (dmg: number) => void
  ): boolean {
    if (!this.isActionReady(type)) return false;

    const sectorGain = this.difficulty.integratedSectorGain;
    const captureGain = this.difficulty.captureExposeGain;

    switch (type) {
      case IntegratedActionType.CIDADE_PARA_FLORESTA: {
        // Cidade -> Floresta: Envio de equipamentos (+Consciência escalada por dificuldade)
        this.triggerCooldown(
          type,
          BALANCE.COOLDOWNS.INTEGRATED_CIDADE_FLORESTA,
          SectorType.CIDADE
        );
        onEquipUnits();
        onDamageBoss(26);
        this.spawnRouteEffect(SectorType.CIDADE, SectorType.FLORESTA, 0x38bdf8, `🔧 +${sectorGain}%`);
        this.phaseSystem.addConsciousness(sectorGain, 'Cidade ➔ Floresta: Equipamentos');
        break;
      }

      case IntegratedActionType.CAMPO_PARA_CIDADE: {
        // Campo -> Cidade: Envio de alimentos para zerar estresse urbano (+Consciência escalada)
        this.triggerCooldown(
          type,
          BALANCE.COOLDOWNS.INTEGRATED_CAMPO_CIDADE,
          SectorType.CAMPO
        );
        this.urbanStress = 0;
        // Reduz recargas urbanas ativas graças ao mutirão de alimentos
        const cityEnd = this.cooldownEnds.get(IntegratedActionType.CIDADE_PARA_FLORESTA);
        if (cityEnd) {
          this.cooldownEnds.set(IntegratedActionType.CIDADE_PARA_FLORESTA, cityEnd - 2500);
        }
        onDamageBoss(26);
        this.spawnRouteEffect(SectorType.CAMPO, SectorType.CIDADE, 0xfacc15, `🌽 +${sectorGain}%`);
        this.phaseSystem.addConsciousness(sectorGain, 'Campo ➔ Cidade: Alimentos');
        break;
      }

      case IntegratedActionType.FLORESTA_PARA_CAMPO: {
        // Floresta -> Campo: Proteção das nascentes (+Consciência escalada)
        this.triggerCooldown(
          type,
          BALANCE.COOLDOWNS.INTEGRATED_FLORESTA_CAMPO,
          SectorType.FLORESTA
        );
        this.fireSystem.activateWaterShield(14000);
        onDamageBoss(26);
        this.spawnRouteEffect(SectorType.FLORESTA, SectorType.CAMPO, 0x22c55e, `💧 +${sectorGain}%`);
        this.phaseSystem.addConsciousness(sectorGain, 'Floresta ➔ Campo: Nascentes');
        break;
      }

      case IntegratedActionType.CAPTURA_PARA_CIDADE: {
        // Captura -> Cidade: Expor incendiários capturados (+Consciência imediata escalada)
        if (this.capturedArsonistsQueue <= 0) return false;
        this.capturedArsonistsQueue--;
        this.emit('captures-updated', this.capturedArsonistsQueue);
        onDamageBoss(42);
        this.spawnRouteEffect(SectorType.FLORESTA, SectorType.CIDADE, 0xf43f5e, `📢 +${captureGain}%`);
        this.phaseSystem.addConsciousness(captureGain, 'Captura ➔ Cidade: Denúncia Pública!');
        break;
      }
    }

    SoundManager.playIntegratedAction();
    this.emit('integrated-action-executed', type);
    return true;
  }

  /**
   * Executa Ações Setoriais Locais (Cidade: Exaustão | Campo: Aceiros | Floresta: Reflorestamento/Encantados)
   */
  public executeLocalAction(
    type: LocalActionType,
    onHealForest: (amount: number) => void
  ): boolean {
    if (!this.isActionReady(type)) return false;

    switch (type) {
      case LocalActionType.CIDADE_BARREIRA_EXAUSTAO: {
        this.triggerCooldown(type, BALANCE.COOLDOWNS.LOCAL_CIDADE_EXAUSTAO, SectorType.CIDADE);
        this.fireSystem.clearSmokeInSector(SectorType.CIDADE);
        this.fireSystem.clearSmokeInSector(SectorType.CAMPO);
        this.spawnFloatingText(
          WORLD_CENTER_X,
          WORLD_CENTER_Y - 24,
          '💨 Exaustão Contra Fumaça!',
          '#38bdf8'
        );
        break;
      }

      case LocalActionType.CAMPO_ACEIRO: {
        this.triggerCooldown(type, BALANCE.COOLDOWNS.LOCAL_CAMPO_ACEIRO, SectorType.CAMPO);
        this.fireSystem.addFirebreakRing(CAMPO_RADIUS, 16000);
        this.spawnFloatingText(
          WORLD_CENTER_X,
          WORLD_CENTER_Y + CAMPO_RADIUS_Y - 15,
          '🛡️ Anel de Aceiro Construído!',
          '#facc15'
        );
        break;
      }

      case LocalActionType.FLORESTA_REFLORESTAMENTO: {
        this.triggerCooldown(type, BALANCE.COOLDOWNS.LOCAL_FLORESTA_REFLORESTAR, SectorType.FLORESTA);
        onHealForest(12);
        const pt = getRandomPointInSector(SectorType.FLORESTA, 60);
        this.spawnFloatingText(pt.x, pt.y, '🌱 Reflorestamento +12% Mata!', '#4ade80');
        break;
      }
    }

    SoundManager.playSelect();
    return true;
  }

  private spawnRouteEffect(from: SectorType, to: SectorType, colorHex: number, badgeText: string): void {
    const startPt =
      from === SectorType.CIDADE
        ? { x: WORLD_CENTER_X, y: WORLD_CENTER_Y }
        : getRandomPointInSector(from, 40);
    const endPt =
      to === SectorType.CIDADE
        ? { x: WORLD_CENTER_X, y: WORLD_CENTER_Y }
        : getRandomPointInSector(to, 40);

    const orb = this.scene.add.circle(startPt.x, startPt.y, 8, colorHex, 1).setDepth(42);
    const label = this.scene.add
      .text(startPt.x, startPt.y - 14, badgeText, {
        fontFamily: 'Courier New, monospace',
        fontSize: '12px',
        fontStyle: 'bold',
        color: '#ffffff',
        backgroundColor: '#090d0a',
        padding: { x: 4, y: 2 }
      })
      .setOrigin(0.5)
      .setDepth(43);

    this.scene.tweens.add({
      targets: [orb, label],
      x: endPt.x,
      y: (target: Phaser.GameObjects.GameObject) => (target === orb ? endPt.y : endPt.y - 14),
      duration: 820,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        orb.destroy();
        this.scene.tweens.add({
          targets: label,
          y: endPt.y - 34,
          alpha: 0,
          duration: 500,
          onComplete: () => label.destroy()
        });
      }
    });
  }

  private spawnFloatingText(x: number, y: number, message: string, color: string): void {
    const txt = this.scene.add
      .text(x, y, message, {
        fontFamily: 'Courier New, monospace',
        fontSize: '12px',
        fontStyle: 'bold',
        color,
        backgroundColor: '#090d0a',
        padding: { x: 5, y: 2 }
      })
      .setOrigin(0.5)
      .setDepth(45);

    this.scene.tweens.add({
      targets: txt,
      y: y - 28,
      alpha: 0,
      duration: 1100,
      onComplete: () => txt.destroy()
    });
  }
}
