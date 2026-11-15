import Phaser from 'phaser';
import { BALANCE, getIsoDistance } from '../config/GameBalance';
import { FireSmokeSystem } from '../systems/FireSmokeSystem';
import { UnitType } from '../types/GameTypes';
import { Unit } from './Unit';

/** Operações de floresta que a Mãe da Mata usa para replantar; implementadas pela GameScene */
export interface MaeDaMataForestOps {
  findNearestBurnedTree(x: number, y: number): { x: number; y: number } | null;
  replantTreeAt(x: number, y: number): boolean;
}

type MaeDaMataActivity = 'none' | 'water' | 'replant';

/** Encantado invocado pelas aldeias: apaga focos com água e replanta a floresta. Não cansa. */
export class MaeDaMata extends Unit {
  /** Instante (no GameClock) em que o encantado deixa a partida */
  public readonly expiresAt: number;
  private activity: MaeDaMataActivity = 'none';
  private replantProgressMs = 0;
  private replantTarget: { x: number; y: number } | null = null;
  private retargetInMs = 0;

  constructor(scene: Phaser.Scene, id: string, x: number, y: number, expiresAt: number) {
    super(scene, id, UnitType.MAE_DA_MATA, 'mae_da_mata', x, y);
    this.expiresAt = expiresAt;
    this.baseSpeed = BALANCE.MAE_DA_MATA.SPEED;
    this.sprite.setScale(0.5);
    this.sprite.setOrigin(0.5, 0.9375);
    this.statusBarOffsetY = 66;
    this.sprite.play('mae_da_mata_idle');
  }

  public isImmuneToSmoke(): boolean {
    return false;
  }

  public isWorking(): boolean {
    return this.activity !== 'none';
  }

  public update(deltaMs: number, fireSystem: FireSmokeSystem, forest: MaeDaMataForestOps): void {
    const dtSec = deltaMs / 1000;
    const smokeAtPos = fireSystem.getSmokeLevelAtPoint(this.x, this.y);
    const { EXTINGUISH_RANGE, EXTINGUISH_POWER, REPLANT_RANGE, REPLANT_MS } = BALANCE.MAE_DA_MATA;

    const fire = fireSystem.findNearestFire(this.x, this.y);
    this.activity = 'none';

    if (fire) {
      // Prioridade: apagar o foco mais próximo com água
      this.setCommandTarget(fire.data.x, fire.data.y);
      this.moveStep(deltaMs, smokeAtPos);
      this.replantProgressMs = 0;
      if (getIsoDistance(this.x, this.y, fire.data.x, fire.data.y) <= EXTINGUISH_RANGE) {
        fireSystem.extinguishFire(fire.data.id, EXTINGUISH_POWER * dtSec);
        this.activity = 'water';
        this.faceTowards(fire.data.x);
      }
    } else {
      // Sem focos, replanta a árvore queimada mais próxima
      this.retargetInMs -= deltaMs;
      if (!this.replantTarget || this.retargetInMs <= 0) {
        this.replantTarget = forest.findNearestBurnedTree(this.x, this.y);
        this.retargetInMs = 1000;
      }
      if (this.replantTarget) {
        const tree = this.replantTarget;
        this.setCommandTarget(tree.x, tree.y);
        this.moveStep(deltaMs, smokeAtPos);
        if (getIsoDistance(this.x, this.y, tree.x, tree.y) <= REPLANT_RANGE) {
          this.activity = 'replant';
          this.faceTowards(tree.x);
          this.replantProgressMs += deltaMs;
          if (this.replantProgressMs >= REPLANT_MS) {
            this.replantProgressMs = 0;
            forest.replantTreeAt(tree.x, tree.y);
            this.replantTarget = null;
            this.retargetInMs = 0;
          }
        } else {
          this.replantProgressMs = 0;
        }
      } else {
        this.replantProgressMs = 0;
        this.setCommandTarget(this.x, this.y);
        this.moveStep(deltaMs, smokeAtPos);
      }
    }

    this.updateAnimation();
    this.drawOverlays();
  }

  private faceTowards(targetX: number): void {
    if (Math.abs(targetX - this.x) > 2) {
      this.sprite.setFlipX(targetX < this.x);
    }
  }

  private updateAnimation(): void {
    let key = 'mae_da_mata_idle';
    if (this.activity === 'water') {
      key = 'mae_da_mata_water';
    } else if (this.activity === 'replant') {
      key = 'mae_da_mata_replant';
    } else if (this.isMoving()) {
      key = 'mae_da_mata_walk';
    }
    if (this.sprite.anims.currentAnim?.key !== key) {
      this.sprite.play(key, true);
    }
  }
}
