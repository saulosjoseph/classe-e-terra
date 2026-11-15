import Phaser from 'phaser';
import { BALANCE, getIsoDistance } from '../config/GameBalance';
import { BossFortress } from './BossFortress';
import { FireSmokeSystem } from '../systems/FireSmokeSystem';
import { UnitType } from '../types/GameTypes';
import { Unit } from './Unit';

/** Operações de floresta que o Curupira usa para replantar; implementadas pela GameScene */
export interface CurupiraForestOps {
  findNearestBurnedTree(x: number, y: number): { x: number; y: number } | null;
  replantTreeAt(x: number, y: number): boolean;
}

type CurupiraActivity = 'none' | 'fire' | 'replant' | 'boss';

/** Chamado pelas aldeias: age sozinho, apaga mais que os demais, não cansa e replanta a floresta */
export class Curupira extends Unit {
  /** Instante (no GameClock) em que o encantado deixa a partida */
  public readonly expiresAt: number;
  private activity: CurupiraActivity = 'none';
  private replantProgressMs = 0;
  private replantTarget: { x: number; y: number } | null = null;
  private retargetInMs = 0;

  constructor(scene: Phaser.Scene, id: string, x: number, y: number, expiresAt: number) {
    super(scene, id, UnitType.CURUPIRA, 'curupira', x, y);
    this.expiresAt = expiresAt;
    this.baseSpeed = BALANCE.CURUPIRA.SPEED;
    this.sprite.setScale(0.58);
    this.sprite.setOrigin(0.5, 0.9375);
    this.statusBarOffsetY = 70;
    this.sprite.play('curupira_idle');
  }

  public isImmuneToSmoke(): boolean {
    return false;
  }

  public isWorking(): boolean {
    return this.activity !== 'none';
  }

  public update(
    deltaMs: number,
    fireSystem: FireSmokeSystem,
    forest: CurupiraForestOps,
    boss: BossFortress | null
  ): void {
    const dtSec = deltaMs / 1000;
    const smokeAtPos = fireSystem.getSmokeLevelAtPoint(this.x, this.y);
    const { EXTINGUISH_RANGE, EXTINGUISH_POWER, BOSS_DAMAGE_PER_SEC, REPLANT_RANGE, REPLANT_MS } =
      BALANCE.CURUPIRA;

    const fire = fireSystem.findNearestFire(this.x, this.y);
    this.activity = 'none';

    if (fire) {
      // Prioridade: apagar o foco mais próximo
      this.setCommandTarget(fire.data.x, fire.data.y);
      this.moveStep(deltaMs, smokeAtPos);
      this.replantProgressMs = 0;
      if (getIsoDistance(this.x, this.y, fire.data.x, fire.data.y) <= EXTINGUISH_RANGE) {
        fireSystem.extinguishFire(fire.data.id, EXTINGUISH_POWER * dtSec);
        this.activity = 'fire';
        this.faceTowards(fire.data.x);
      }
    } else if (boss && boss.isActive()) {
      // Sem focos, ataca a Fortaleza do Burguês
      this.setCommandTarget(boss.x, boss.y);
      this.moveStep(deltaMs, smokeAtPos);
      if (getIsoDistance(this.x, this.y, boss.x, boss.y) <= 72) {
        boss.takeDamage(BOSS_DAMAGE_PER_SEC * dtSec);
        this.activity = 'boss';
        this.faceTowards(boss.x);
      }
    } else {
      // Sem focos nem Burguês, replanta a árvore queimada mais próxima
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
    let key = 'curupira_idle';
    if (this.activity === 'fire' || this.activity === 'boss') {
      key = 'curupira_extinguish';
    } else if (this.activity === 'replant') {
      key = 'curupira_replant';
    } else if (this.isMoving()) {
      key = 'curupira_walk';
    }
    if (this.sprite.anims.currentAnim?.key !== key) {
      this.sprite.play(key, true);
    }
  }
}
