import Phaser from 'phaser';
import {
  BALANCE,
  BASE_BOMBEIROS_X,
  BASE_BOMBEIROS_Y,
  CAMPO_RADIUS,
  CITY_RADIUS,
  COLLISION,
  ISO_Y_RATIO,
  WORLD_CENTER_X,
  WORLD_CENTER_Y,
  getIsoDistance,
  getIsoSquareDist
} from '../config/GameBalance';
import { ActiveFireInstance, FireSmokeSystem } from '../systems/FireSmokeSystem';
import { UnitType } from '../types/GameTypes';
import { BossFortress } from './BossFortress';
import { Unit } from './Unit';

type Point = { x: number; y: number };

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
/** Folga para dentro da zona rural: o caminhão estaciona um pouco antes da borda da floresta */
const FOREST_PARK_MARGIN = 24;
/** Distância isométrica para considerar que o veículo ou o bombeiro chegou ao destino */
const ARRIVE_DIST = 6;

/** Fica na floresta quando a distância quadrada ao centro ultrapassa o raio do Campo */
function isInForest(x: number, y: number): boolean {
  return getIsoSquareDist(x, y) > CAMPO_RADIUS;
}

/** Ponto na borda da floresta (lado da zona rural), na direção do destino, onde o caminhão para */
function getForestParkPoint(x: number, y: number): Point {
  const factor = (CAMPO_RADIUS - FOREST_PARK_MARGIN) / Math.max(1, getIsoSquareDist(x, y));
  return {
    x: WORLD_CENTER_X + (x - WORLD_CENTER_X) * factor,
    y: WORLD_CENTER_Y + (y - WORLD_CENTER_Y) * factor
  };
}

/**
 * Bombeiro com caminhão: o caminhão anda pela cidade e pelo campo, mas não entra na floresta.
 * Para apagar fogo na floresta, o caminhão estaciona na borda e o bombeiro desce e anda até o foco.
 * Ao chegar no fogo, o bombeiro apaga com o jato de água.
 * Perde energia sempre que está fora da base e precisa voltar para recarregar.
 */
export class Bombeiro extends Unit {
  private footSprite: Phaser.GameObjects.Sprite;
  /** Verdadeiro quando o bombeiro desceu do caminhão e anda a pé */
  private onFoot = false;
  /** Onde o caminhão está estacionado enquanto o bombeiro anda a pé */
  private parkX: number;
  private parkY: number;

  constructor(scene: Phaser.Scene, id: string, x: number, y: number) {
    super(scene, id, UnitType.BOMBEIRO, 'caminhao_bombeiros', x, y);
    this.baseSpeed = BALANCE.BOMBEIRO.SPEED;
    this.parkX = x;
    this.parkY = y;
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

    // Destino atual; null mantém o trajeto de patrulha que já está em andamento
    let goal: Point | null = null;
    if (exhausted) {
      goal = this.getBaseStopPoint();
    } else if (targetFire) {
      goal = { x: targetFire.data.x, y: targetFire.data.y };
    } else if (boss && boss.isActive()) {
      const angleOffset = this.patrolAngle;
      goal = {
        x: boss.x + Math.cos(angleOffset) * 36,
        y: boss.y + Math.sin(angleOffset) * (36 * ISO_Y_RATIO)
      };
    } else if (this.onFoot) {
      goal = { x: this.parkX, y: this.parkY };
    } else if (!this.isMoving()) {
      this.patrolAngle += 0.4;
      goal = {
        x: WORLD_CENTER_X + Math.cos(this.patrolAngle) * PATROL_RADIUS,
        y: WORLD_CENTER_Y + Math.sin(this.patrolAngle) * (PATROL_RADIUS * ISO_Y_RATIO)
      };
    }

    if (goal) this.steer(goal);
    this.baseSpeed = this.onFoot ? BALANCE.BOMBEIRO.WALK_SPEED : BALANCE.BOMBEIRO.SPEED;

    // moveStep vira o sprite conforme o deslocamento; o caminhão estacionado não deve virar
    const truckFlip = this.sprite.flipX;
    this.moveStep(deltaMs, smokeAtPos);
    if (this.onFoot) this.sprite.setFlipX(truckFlip);

    const isExtinguishing = Boolean(
      targetFire &&
        nearestDist <= EXTINGUISH_RANGE &&
        (this.onFoot || !isInForest(targetFire.data.x, targetFire.data.y))
    );
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

  /** Ponto onde o caminhão para na borda da base, do lado por onde se aproxima */
  private getBaseStopPoint(): Point {
    const dx = this.x - BASE_BOMBEIROS_X;
    const dy = (this.y - BASE_BOMBEIROS_Y) / ISO_Y_RATIO;
    const len = Math.hypot(dx, dy) || 1;
    return {
      x: BASE_BOMBEIROS_X + (dx / len) * BASE_STOP_DIST,
      y: BASE_BOMBEIROS_Y + ((dy / len) * BASE_STOP_DIST) * ISO_Y_RATIO
    };
  }

  /**
   * Dirige o bombeiro até o destino. Na floresta, o caminhão para na borda e o bombeiro desce;
   * fora dela, quem está a pé volta ao caminhão antes de dirigir.
   */
  private steer(goal: Point): void {
    if (isInForest(goal.x, goal.y)) {
      if (!this.onFoot) {
        const park = getForestParkPoint(goal.x, goal.y);
        if (getIsoDistance(this.x, this.y, park.x, park.y) > ARRIVE_DIST) {
          this.setCommandTarget(park.x, park.y);
          return;
        }
        this.dismount();
      }
      this.setCommandTarget(goal.x, goal.y);
      return;
    }

    if (this.onFoot) {
      if (getIsoDistance(this.x, this.y, this.parkX, this.parkY) > ARRIVE_DIST) {
        this.setCommandTarget(this.parkX, this.parkY);
        return;
      }
      this.onFoot = false;
    }
    this.setCommandTarget(goal.x, goal.y);
  }

  private dismount(): void {
    this.onFoot = true;
    this.parkX = this.x;
    this.parkY = this.y;
  }

  /** Caminhão visível na estrada; ao apagar, o bombeiro desce e aparece com o jato */
  private updateVisuals(isExtinguishing: boolean, targetFire: ActiveFireInstance | null): void {
    this.footSprite.setPosition(this.x, this.y).setDepth(20 + Math.floor(this.y));

    if (this.onFoot) {
      this.sprite.setPosition(this.parkX, this.parkY).setDepth(20 + Math.floor(this.parkY));
      this.shadowSprite.setPosition(this.parkX, this.parkY);
    }

    // Caminhão estacionado segue visível; em movimento, some ao apagar fogo fora da floresta
    this.sprite.setVisible(this.onFoot || !isExtinguishing);
    this.footSprite.setVisible(this.onFoot || isExtinguishing);

    if (isExtinguishing && targetFire) {
      if (Math.abs(targetFire.data.x - this.x) > 2) {
        this.footSprite.setFlipX(targetFire.data.x < this.x);
      }
      if (this.footSprite.anims.currentAnim?.key !== 'bombeiro_spray') {
        this.footSprite.play('bombeiro_spray', true);
      }
    } else if (this.onFoot) {
      if (Math.abs(this.targetX - this.x) > 2) {
        this.footSprite.setFlipX(this.targetX < this.x);
      }
      this.footSprite.stop().setFrame(0);
    } else {
      this.footSprite.stop();
    }
  }

  public destroy(): void {
    this.footSprite.destroy();
    super.destroy();
  }
}
