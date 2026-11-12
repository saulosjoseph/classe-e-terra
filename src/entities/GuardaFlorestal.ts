import Phaser from 'phaser';
import { FireSmokeSystem } from '../systems/FireSmokeSystem';
import {
  CAMPO_RADIUS,
  FLORESTA_OUTER_RADIUS,
  ISO_Y_RATIO,
  WORLD_CENTER_X,
  WORLD_CENTER_Y,
  getIsoDistance
} from '../config/GameBalance';
import { UnitType } from '../types/GameTypes';
import { BossFortress } from './BossFortress';
import { Incendiario } from './Incendiario';
import { Unit } from './Unit';

/**
 * Guarda Florestal Comunitário Armado (Desbloqueado aos 50% de Consciência):
 * - Totalmente autônomo: caça Incendiários em todo o mapa sem precisar de cliques!
 * - Move-se sem lentidão pela fumaça densa, revela áreas escondidas e captura Incendiários em emboscada.
 */
export class GuardaFlorestal extends Unit {
  private visionCircle: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, id: string, x: number, y: number) {
    super(scene, id, UnitType.GUARDA_FLORESTAL, 'unit_guarda', x, y);
    this.baseSpeed = 152;
    this.visionCircle = scene.add.graphics().setDepth(17);
  }

  public isImmuneToSmoke(): boolean {
    return true;
  }

  public update(
    deltaMs: number,
    fireSystem: FireSmokeSystem,
    arsonists: Incendiario[],
    boss: BossFortress | null,
    onArsonistCaptured: (arsonist: Incendiario) => void
  ): void {
    const dtSec = deltaMs / 1000;

    // 1. Caça automaticamente o Incendiário vivo mais próximo em QUALQUER lugar do mapa!
    let nearestEnemy: Incendiario | null = null;
    let nearestEnemyDist = Infinity;

    for (const enemy of arsonists) {
      if (!enemy.isAlive()) continue;
      const d = getIsoDistance(this.x, this.y, enemy.x, enemy.y);
      if (d < nearestEnemyDist) {
        nearestEnemyDist = d;
        nearestEnemy = enemy;
      }
    }

    if (nearestEnemy) {
      this.setCommandTarget(nearestEnemy.x, nearestEnemy.y);
    } else if (boss && boss.isActive()) {
      // 2. Se não há incendiários vivos e o Burguês está ativo, ataca a Fortaleza automaticamente!
      this.setCommandTarget(boss.x, boss.y);
    } else {
      // 3. Caso contrário, ajuda a apagar o foco de fogo mais próximo ou patrulha o anel da Floresta
      const fires = fireSystem.getActiveFires();
      if (fires.length > 0) {
        let closestFire = fires[0];
        let minFireDist = getIsoDistance(
          this.x,
          this.y,
          closestFire.data.x,
          closestFire.data.y
        );
        for (const f of fires) {
          const fd = getIsoDistance(this.x, this.y, f.data.x, f.data.y);
          if (fd < minFireDist) {
            minFireDist = fd;
            closestFire = f;
          }
        }
        this.setCommandTarget(closestFire.data.x, closestFire.data.y);
      } else if (!this.isMoving()) {
        this.patrolAngle += 0.65;
        const r = (CAMPO_RADIUS + FLORESTA_OUTER_RADIUS) / 2;
        this.setCommandTarget(
          WORLD_CENTER_X + Math.cos(this.patrolAngle) * r,
          WORLD_CENTER_Y + Math.sin(this.patrolAngle) * (r * ISO_Y_RATIO)
        );
      }
    }

    this.moveStep(deltaMs, 0);

    // Emboscada instantânea contra Incendiário ao alcançar alcance de captura
    if (nearestEnemy && nearestEnemyDist <= 48) {
      onArsonistCaptured(nearestEnemy);
    }

    // Ajuda a conter fogo próximo
    for (const f of fireSystem.getActiveFires()) {
      if (getIsoDistance(this.x, this.y, f.data.x, f.data.y) <= 42) {
        fireSystem.extinguishFire(f.data.id, 18 * dtSec);
        break;
      }
    }

    // Fase 6: Cerco armado contra a Fortaleza do Burguês
    if (boss && boss.isActive()) {
      const distBoss = getIsoDistance(this.x, this.y, boss.x, boss.y);
      if (distBoss <= 72) {
        boss.takeDamage(22 * dtSec);
      }
    }

    this.visionCircle.clear();
    this.visionCircle.lineStyle(1.5, 0x10b981, 0.35);
    this.visionCircle.strokeEllipse(this.x, this.y, 112, 56, 32);
    this.drawOverlays();
  }

  public override destroy(): void {
    this.visionCircle.destroy();
    super.destroy();
  }
}
