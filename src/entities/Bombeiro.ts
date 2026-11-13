import Phaser from 'phaser';
import {
  BALANCE,
  BASE_BOMBEIROS_X,
  BASE_BOMBEIROS_Y,
  CITY_RADIUS,
  COLLISION,
  ISO_Y_RATIO,
  WORLD_CENTER_X,
  WORLD_CENTER_Y,
  getIsoDistance
} from '../config/GameBalance';
import { ActiveFireInstance, FireSmokeSystem } from '../systems/FireSmokeSystem';
import { UnitType } from '../types/GameTypes';
import { BossFortress } from './BossFortress';
import { Unit } from './Unit';

/** Energia mínima: ao chegar aqui o bombeiro fica exausto e volta para a base */
const MIN_STAMINA = 5;
/** Raio (distância isométrica) da base em que o bombeiro recarrega a energia */
const BASE_RECHARGE_RADIUS = COLLISION.BASE_BOMBEIROS_RADIUS + 40;
/** Distância do centro da base até o ponto onde o caminhão para: borda da base + folga */
const BASE_STOP_DIST = COLLISION.BASE_BOMBEIROS_RADIUS + COLLISION.AGENT_CLEARANCE + 8;
/** Ronda preventiva na borda da cidade */
const PATROL_RADIUS = CITY_RADIUS - 100;
/** Distância máxima do foco para o bombeiro conseguir apagar */
const EXTINGUISH_RANGE = 46;

/**
 * Bombeiro com caminhão: o caminhão anda pela cidade e pela floresta.
 * Ao chegar no fogo, o bombeiro desce e apaga com o jato de água.
 * Perde energia sempre que está fora da base e precisa voltar para recarregar.
 */
export class Bombeiro extends Unit {
  private footSprite: Phaser.GameObjects.Sprite;

  constructor(scene: Phaser.Scene, id: string, x: number, y: number) {
    super(scene, id, UnitType.BOMBEIRO, 'caminhao_bombeiros', x, y);
    this.baseSpeed = BALANCE.BOMBEIRO.SPEED;
    this.statusBarOffsetY = 96;
    this.sprite.setScale(0.55).setOrigin(0.5, 0.9);

    this.footSprite = scene.add
      .sprite(x, y, 'bombeiro_spray')
      .setOrigin(0.5, 0.88)
      .setScale(0.5)
      .setDepth(20 + Math.floor(y))
      .setVisible(false);
  }

  public isImmuneToSmoke(): boolean {
    return false;
  }

  public update(
    deltaMs: number,
    fireSystem: FireSmokeSystem,
    boss: BossFortress | null
  ): void {
    const dtSec = deltaMs / 1000;
    const smokeAtPos = fireSystem.getSmokeLevelAtPoint(this.x, this.y);

    // Só recarrega na base; fora dela a energia cai continuamente
    if (this.isNearBase()) {
      if (this.isExhausted()) this.stamina = this.maxStamina;
    } else {
      this.stamina = Math.max(
        MIN_STAMINA,
        this.stamina - BALANCE.BOMBEIRO.STAMINA_DRAIN_PER_SEC * dtSec
      );
    }
    const exhausted = this.isExhausted();

    let targetFire: ActiveFireInstance | null = null;
    let nearestDist = Infinity;
    if (!exhausted) {
      for (const fire of fireSystem.getActiveFires()) {
        const d = getIsoDistance(this.x, this.y, fire.data.x, fire.data.y);
        if (d < nearestDist) {
          nearestDist = d;
          targetFire = fire;
        }
      }
    }

    if (exhausted) {
      this.setBaseStopTarget();
    } else if (targetFire) {
      this.setCommandTarget(targetFire.data.x, targetFire.data.y);
    } else if (boss && boss.isActive()) {
      const angleOffset = this.patrolAngle;
      this.setCommandTarget(
        boss.x + Math.cos(angleOffset) * 36,
        boss.y + Math.sin(angleOffset) * (36 * ISO_Y_RATIO)
      );
    } else if (!this.isMoving()) {
      this.patrolAngle += 0.4;
      this.setCommandTarget(
        WORLD_CENTER_X + Math.cos(this.patrolAngle) * PATROL_RADIUS,
        WORLD_CENTER_Y + Math.sin(this.patrolAngle) * (PATROL_RADIUS * ISO_Y_RATIO)
      );
    }

    this.moveStep(deltaMs, smokeAtPos);

    const isExtinguishing = Boolean(targetFire && nearestDist <= EXTINGUISH_RANGE);
    if (isExtinguishing && targetFire) {
      const fatigueFactor = this.stamina > 18 ? 1.0 : 0.45;
      const boostFactor = this.hasEquipmentBoost() ? 1.55 : 1.0;
      const power = BALANCE.BOMBEIRO.EXTINGUISH_POWER * fatigueFactor * boostFactor * dtSec;
      fireSystem.extinguishFire(targetFire.data.id, power);
    }

    this.updateVisuals(isExtinguishing, targetFire);

    // Fase 6: cercar a Fortaleza do Burguês causa dano contínuo
    if (boss && boss.isActive()) {
      const distBoss = getIsoDistance(this.x, this.y, boss.x, boss.y);
      if (distBoss <= 68) {
        boss.takeDamage(12 * dtSec);
      }
    }

    this.drawOverlays();
  }

  private isExhausted(): boolean {
    return this.stamina <= MIN_STAMINA;
  }

  private isNearBase(): boolean {
    return getIsoDistance(this.x, this.y, BASE_BOMBEIROS_X, BASE_BOMBEIROS_Y) <= BASE_RECHARGE_RADIUS;
  }

  /** Mira o ponto da borda da base do lado por onde o caminhão se aproxima */
  private setBaseStopTarget(): void {
    const dx = this.x - BASE_BOMBEIROS_X;
    const dy = (this.y - BASE_BOMBEIROS_Y) / ISO_Y_RATIO;
    const len = Math.hypot(dx, dy) || 1;
    this.setCommandTarget(
      BASE_BOMBEIROS_X + (dx / len) * BASE_STOP_DIST,
      BASE_BOMBEIROS_Y + ((dy / len) * BASE_STOP_DIST) * ISO_Y_RATIO
    );
  }

  /** Caminhão visível na estrada; ao apagar, o bombeiro desce e aparece com o jato */
  private updateVisuals(isExtinguishing: boolean, targetFire: ActiveFireInstance | null): void {
    this.footSprite.setPosition(this.x, this.y).setDepth(20 + Math.floor(this.y));

    if (isExtinguishing && targetFire) {
      this.sprite.setVisible(false);
      this.footSprite.setVisible(true);
      if (Math.abs(targetFire.data.x - this.x) > 2) {
        this.footSprite.setFlipX(targetFire.data.x < this.x);
      }
      if (this.footSprite.anims.currentAnim?.key !== 'bombeiro_spray') {
        this.footSprite.play('bombeiro_spray', true);
      }
    } else {
      this.sprite.setVisible(true);
      this.footSprite.setVisible(false);
      this.footSprite.stop();
    }
  }

  public destroy(): void {
    this.footSprite.destroy();
    super.destroy();
  }
}
