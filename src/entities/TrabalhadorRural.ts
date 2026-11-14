import Phaser from 'phaser';
import { BALANCE, getIsoDistance } from '../config/GameBalance';
import { ActiveFireInstance, FireSmokeSystem } from '../systems/FireSmokeSystem';
import { UnitType } from '../types/GameTypes';
import { Unit } from './Unit';

export type TrabalhadorRuralVariant = 'a' | 'b' | 'c';

/**
 * Trabalhador Rural da zona rural: apaga focos de fogo em todo o mapa,
 * mas bem mais devagar que o Brigadista. Sua quantidade acompanha os focos ativos.
 */
export class TrabalhadorRural extends Unit {
  public readonly variant: TrabalhadorRuralVariant;
  private readonly restX: number;
  private readonly restY: number;
  private working = false;

  constructor(
    scene: Phaser.Scene,
    id: string,
    x: number,
    y: number,
    variant: TrabalhadorRuralVariant
  ) {
    super(scene, id, UnitType.TRABALHADOR_RURAL, `trabalhador_rural_${variant}`, x, y);
    this.variant = variant;
    this.restX = x;
    this.restY = y;
    this.baseSpeed = BALANCE.TRABALHADOR_RURAL.SPEED;
    this.sprite.setScale(variant === 'c' ? 0.48 * 0.7 : 0.48);
    this.sprite.setOrigin(0.5, 0.9375);
    this.statusBarOffsetY = 62;
    this.sprite.play(`${this.animPrefix()}_idle`);
  }

  public isImmuneToSmoke(): boolean {
    return false;
  }

  public isWorking(): boolean {
    return this.working;
  }

  private animPrefix(): string {
    return `trabalhador_rural_${this.variant}`;
  }

  public update(deltaMs: number, fireSystem: FireSmokeSystem): void {
    const dtSec = deltaMs / 1000;
    const smokeAtPos = fireSystem.getSmokeLevelAtPoint(this.x, this.y);

    const targetFire: ActiveFireInstance | null = fireSystem.findNearestFire(this.x, this.y);
    const nearestDist = targetFire
      ? getIsoDistance(this.x, this.y, targetFire.data.x, targetFire.data.y)
      : Infinity;

    // Sem fogo para apagar, fica parado no ponto onde foi recrutado (na zona rural)
    if (targetFire) {
      this.setCommandTarget(targetFire.data.x, targetFire.data.y);
    } else {
      this.setCommandTarget(this.restX, this.restY);
    }

    this.moveStep(deltaMs, smokeAtPos);

    const isExtinguishing = Boolean(targetFire && nearestDist <= 46);
    this.working = isExtinguishing;
    if (isExtinguishing && targetFire) {
      const fatigueFactor = this.stamina > 18 ? 1.0 : 0.45;
      const power = BALANCE.TRABALHADOR_RURAL.EXTINGUISH_POWER * fatigueFactor * dtSec;
      fireSystem.extinguishFire(targetFire.data.id, power);
      this.stamina = Math.max(
        5,
        this.stamina - BALANCE.TRABALHADOR_RURAL.STAMINA_DRAIN_PER_SEC * dtSec
      );
    } else {
      this.stamina = Math.min(
        this.maxStamina,
        this.stamina + BALANCE.TRABALHADOR_RURAL.STAMINA_REGEN_PER_SEC * dtSec
      );
    }

    this.updateAnimation(isExtinguishing, targetFire);
    this.drawOverlays();
  }

  private updateAnimation(isExtinguishing: boolean, targetFire: ActiveFireInstance | null): void {
    const prefix = this.animPrefix();

    if (isExtinguishing && targetFire) {
      if (Math.abs(targetFire.data.x - this.x) > 2) {
        this.sprite.setFlipX(targetFire.data.x < this.x);
      }
      if (this.sprite.anims.currentAnim?.key !== `${prefix}_extinguish`) {
        this.sprite.play(`${prefix}_extinguish`, true);
      }
    } else if (this.isMoving()) {
      if (this.sprite.anims.currentAnim?.key !== `${prefix}_walk`) {
        this.sprite.play(`${prefix}_walk`, true);
      }
    } else if (this.sprite.anims.currentAnim?.key !== `${prefix}_idle`) {
      this.sprite.play(`${prefix}_idle`, true);
    }
  }
}
