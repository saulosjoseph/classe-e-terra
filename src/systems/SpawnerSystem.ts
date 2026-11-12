import Phaser from 'phaser';
import {
  FLORESTA_OUTER_RADIUS,
  ISO_INVERSE_Y_RATIO,
  ISO_Y_RATIO,
  WORLD_CENTER_X,
  WORLD_CENTER_Y,
  getRandomPointInSector
} from '../config/GameBalance';
import { Incendiario } from '../entities/Incendiario';
import { PoliticalPhaseId, SectorType } from '../types/GameTypes';

export class SpawnerSystem extends Phaser.Events.EventEmitter {
  private scene: Phaser.Scene;
  private arsonists: Incendiario[] = [];
  private nextId = 1;
  private spawnTimer = 0;

  constructor(scene: Phaser.Scene) {
    super();
    this.scene = scene;
  }

  public getArsonists(): Incendiario[] {
    this.arsonists = this.arsonists.filter((a) => a.isAlive());
    return this.arsonists;
  }

  public spawnArsonist(targetSector?: SectorType): Incendiario | null {
    if (this.getArsonists().length >= 7) return null;

    // Surgem na borda externa do anel da Floresta e infiltram-se no setor alvo
    const sector =
      targetSector ??
      (Math.random() < 0.72
        ? SectorType.FLORESTA
        : Math.random() < 0.88
          ? SectorType.CAMPO
          : SectorType.CIDADE);

    const targetPt = getRandomPointInSector(sector, 32);
    const angle = Math.atan2(
      (targetPt.y - WORLD_CENTER_Y) * ISO_INVERSE_Y_RATIO,
      targetPt.x - WORLD_CENTER_X
    );
    const spawnX = Math.round(WORLD_CENTER_X + Math.cos(angle) * (FLORESTA_OUTER_RADIUS - 16));
    const spawnY = Math.round(
      WORLD_CENTER_Y + Math.sin(angle) * ((FLORESTA_OUTER_RADIUS - 16) * ISO_Y_RATIO)
    );

    const arsonist = new Incendiario(
      this.scene,
      `arsonist_${this.nextId++}`,
      spawnX,
      spawnY,
      targetPt.x,
      targetPt.y
    );

    arsonist.on('arsonist-tapped', (clicked: Incendiario) => {
      this.emit('arsonist-tapped', clicked);
    });

    this.arsonists.push(arsonist);
    return arsonist;
  }

  public update(deltaMs: number, baseIntervalMs: number, phaseId: PoliticalPhaseId): void {
    this.spawnTimer += deltaMs;

    const phaseFactor = Math.max(0.62, 1 - (phaseId - 1) * 0.06);
    const effectiveInterval = baseIntervalMs * phaseFactor;

    if (this.spawnTimer >= effectiveInterval) {
      this.spawnTimer = 0;
      this.spawnArsonist();
    }
  }
}
