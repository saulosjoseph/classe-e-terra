import Phaser from 'phaser';
import { BALANCE, getIsoDistance } from '../config/GameBalance';
import { BossFortress } from './BossFortress';
import { FireSmokeSystem } from '../systems/FireSmokeSystem';
import { UnitType } from '../types/GameTypes';
import { Incendiario } from './Incendiario';
import { Unit } from './Unit';

type CurupiraActivity = 'none' | 'fire' | 'boss' | 'capture';

/**
 * Chamado pelas aldeias: age sozinho, não cansa. Prioridades: laçar e capturar incendiários,
 * apagar focos e atacar o Burguês.
 */
export class Curupira extends Unit {
  /** Instante (no GameClock) em que o encantado deixa a partida */
  public readonly expiresAt: number;
  private activity: CurupiraActivity = 'none';

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
    boss: BossFortress | null,
    arsonists: Incendiario[],
    onCapture: (arsonist: Incendiario) => void
  ): void {
    const dtSec = deltaMs / 1000;
    const smokeAtPos = fireSystem.getSmokeLevelAtPoint(this.x, this.y);
    const { EXTINGUISH_RANGE, EXTINGUISH_POWER, BOSS_DAMAGE_PER_SEC, LASSO_RANGE } =
      BALANCE.CURUPIRA;

    const fire = fireSystem.findNearestFire(this.x, this.y);
    const arsonist = this.nearestArsonist(arsonists);
    this.activity = 'none';

    if (arsonist) {
      // Prioridade: laçar e capturar o incendiário mais próximo
      this.setCommandTarget(arsonist.x, arsonist.y);
      this.moveStep(deltaMs, smokeAtPos);
      if (getIsoDistance(this.x, this.y, arsonist.x, arsonist.y) <= LASSO_RANGE) {
        this.activity = 'capture';
        this.faceTowards(arsonist.x);
        onCapture(arsonist);
      }
    } else if (fire) {
      // Apagar o foco mais próximo
      this.setCommandTarget(fire.data.x, fire.data.y);
      this.moveStep(deltaMs, smokeAtPos);
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
      // Sem focos, arsonistas nem Burguês, fica parado na aldeia
      this.setCommandTarget(this.x, this.y);
      this.moveStep(deltaMs, smokeAtPos);
    }

    this.updateAnimation();
    this.drawOverlays();
  }

  private faceTowards(targetX: number): void {
    if (Math.abs(targetX - this.x) > 2) {
      this.sprite.setFlipX(targetX < this.x);
    }
  }

  private nearestArsonist(arsonists: Incendiario[]): Incendiario | null {
    let nearest: Incendiario | null = null;
    let nearestDist = Infinity;
    for (const arsonist of arsonists) {
      if (!arsonist.isAlive()) continue;
      const d = getIsoDistance(this.x, this.y, arsonist.x, arsonist.y);
      if (d < nearestDist) {
        nearestDist = d;
        nearest = arsonist;
      }
    }
    return nearest;
  }

  private updateAnimation(): void {
    let key = 'curupira_idle';
    if (this.activity === 'fire' || this.activity === 'boss') {
      key = 'curupira_extinguish';
    } else if (this.activity === 'capture') {
      key = 'curupira_capture';
    } else if (this.isMoving()) {
      key = 'curupira_walk';
    }
    if (this.sprite.anims.currentAnim?.key !== key) {
      this.sprite.play(key, true);
    }
  }
}
