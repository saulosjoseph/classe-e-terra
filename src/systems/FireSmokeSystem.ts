import Phaser from 'phaser';
import {
  CAMPO_RADIUS,
  CAMPO_RADIUS_Y,
  FLORESTA_OUTER_RADIUS,
  ISO_INVERSE_Y_RATIO,
  ISO_Y_RATIO,
  SMOKE_PALETTE,
  WORLD_CENTER_X,
  WORLD_CENTER_Y,
  WORLD_HEIGHT,
  WORLD_WIDTH,
  getIsoDistance,
  getIsoSquareDist,
  getSectorAtPoint
} from '../config/GameBalance';
import { FireNodeData, SectorType } from '../types/GameTypes';
import { SoundManager } from '../audio/SoundManager';

export interface ActiveFireInstance {
  data: FireNodeData;
  fireSprite: Phaser.GameObjects.Sprite;
  smokeSprite: Phaser.GameObjects.Sprite;
  ringGraphics: Phaser.GameObjects.Graphics;
  hitZone: Phaser.GameObjects.Zone;
}

/**
 * Gerencia o Fogo (crescimento em progressão geométrica) e a Fumaça Tóxica
 * (estritamente cinza claro -> preto denso absoluto, sem tons de laranja/vermelho)
 * no mapa concêntrico (Cidade no centro -> Campo no anel médio -> Floresta no anel externo).
 */
export class FireSmokeSystem extends Phaser.Events.EventEmitter {
  private scene: Phaser.Scene;
  private fires: Map<string, ActiveFireInstance> = new Map();
  private firebreaks: Array<{
    ringRadius: number;
    thickness: number;
    graphics: Phaser.GameObjects.Graphics;
    expiresAt: number;
  }> = [];
  private waterShieldUntil = 0;
  private nextId = 1;
  private spreadTimer = 0;

  constructor(scene: Phaser.Scene) {
    super();
    this.scene = scene;
  }

  public getActiveFires(): ActiveFireInstance[] {
    return Array.from(this.fires.values());
  }

  public spawnFire(x: number, y: number, initialIntensity = 18): ActiveFireInstance | null {
    if (this.fires.size >= 18) return null;

    // Mantém o foco dentro da zona quadrada isométrica do território da Floresta
    let clampedX = Phaser.Math.Clamp(x, 60, WORLD_WIDTH - 60);
    let clampedY = Phaser.Math.Clamp(y, 60, WORLD_HEIGHT - 60);
    const sqDist = getIsoSquareDist(clampedX, clampedY);

    if (sqDist > FLORESTA_OUTER_RADIUS - 30) {
      const factor = (FLORESTA_OUTER_RADIUS - 36) / Math.max(1, sqDist);
      clampedX = Math.round(WORLD_CENTER_X + (clampedX - WORLD_CENTER_X) * factor);
      clampedY = Math.round(WORLD_CENTER_Y + (clampedY - WORLD_CENTER_Y) * factor);
    }

    if (this.isProtectedByFirebreak(clampedX, clampedY)) {
      return null;
    }

    for (const existing of this.fires.values()) {
      if (getIsoDistance(clampedX, clampedY, existing.data.x, existing.data.y) < 42) {
        existing.data.intensity = Math.min(100, existing.data.intensity + 15);
        return existing;
      }
    }

    const sector = getSectorAtPoint(clampedX, clampedY);
    const id = `fire_${this.nextId++}`;
    const yDepth = 20 + Math.floor(clampedY);

    const smokeSprite = this.scene.add
      .sprite(clampedX, clampedY - 22, 'smoke_1')
      .setOrigin(0.5, 0.8)
      .setDepth(yDepth + 5)
      .setScale(1.3)
      .setAlpha(SMOKE_PALETTE[1].alpha);

    const fireSprite = this.scene.add
      .sprite(clampedX, clampedY, 'fire_node')
      .setOrigin(0.5, 0.9)
      .setDepth(yDepth)
      .setScale(0.95);

    const ringGraphics = this.scene.add.graphics().setDepth(16 + Math.floor(clampedY));

    const hitZone = this.scene.add
      .zone(clampedX, clampedY, 56, 56)
      .setInteractive({ useHandCursor: true })
      .setDepth(35);

    const data: FireNodeData = {
      id,
      x: clampedX,
      y: clampedY,
      sector,
      intensity: initialIntensity,
      smokeLevel: 1,
      hasFirebreak: false
    };

    const instance: ActiveFireInstance = {
      data,
      fireSprite,
      smokeSprite,
      ringGraphics,
      hitZone
    };

    hitZone.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      if (pointer.getDistance() < 12) {
        this.emit('fire-tapped', instance);
      }
    });

    this.fires.set(id, instance);
    SoundManager.playFireStart();
    this.updateFireVisuals(instance);
    return instance;
  }

  public extinguishFire(id: string, amount: number): boolean {
    const inst = this.fires.get(id);
    if (!inst) return false;

    inst.data.intensity -= amount;
    if (inst.data.intensity <= 0) {
      inst.fireSprite.destroy();
      inst.smokeSprite.destroy();
      inst.ringGraphics.destroy();
      inst.hitZone.destroy();
      this.fires.delete(id);
      SoundManager.playExtinguish();
      this.emit('fire-extinguished', inst.data);
      return true;
    }

    this.updateFireVisuals(inst);
    return false;
  }

  public clearSmokeInSector(sector: SectorType): number {
    let affected = 0;
    for (const inst of this.fires.values()) {
      if (inst.data.sector === sector || inst.data.smokeLevel >= 2) {
        inst.data.intensity = Math.max(10, inst.data.intensity * 0.65);
        inst.data.smokeLevel = 1;
        this.updateFireVisuals(inst);
        affected++;
      }
    }
    return affected;
  }

  /**
   * Cria um Aceiro Quadrado Isométrico (trincheira agrícola protetora entre a Floresta e o Campo)
   */
  public addFirebreakRing(ringRadius = CAMPO_RADIUS, durationMs = 18000): void {
    const ry = ringRadius * ISO_Y_RATIO;
    const g = this.scene.add.graphics().setDepth(12);

    const drawDiamond = (radX: number, radY: number) => {
      g.beginPath();
      g.moveTo(WORLD_CENTER_X, WORLD_CENTER_Y - radY);
      g.lineTo(WORLD_CENTER_X + radX, WORLD_CENTER_Y);
      g.lineTo(WORLD_CENTER_X, WORLD_CENTER_Y + radY);
      g.lineTo(WORLD_CENTER_X - radX, WORLD_CENTER_Y);
      g.closePath();
      g.strokePath();
    };

    g.lineStyle(18, 0x78350f, 0.65);
    drawDiamond(ringRadius, ry);
    g.lineStyle(2, 0xfacc15, 0.85);
    drawDiamond(ringRadius - 9, (ringRadius - 9) * ISO_Y_RATIO);
    drawDiamond(ringRadius + 9, (ringRadius + 9) * ISO_Y_RATIO);

    this.firebreaks.push({
      ringRadius,
      thickness: 28,
      graphics: g,
      expiresAt: this.scene.time.now + durationMs
    });
  }

  public activateWaterShield(durationMs = 15000): void {
    this.waterShieldUntil = this.scene.time.now + durationMs;
  }

  public isWaterShieldActive(): boolean {
    return this.scene.time.now < this.waterShieldUntil;
  }

  public isProtectedByFirebreak(x: number, y: number): boolean {
    const dist = getIsoSquareDist(x, y);
    for (const fb of this.firebreaks) {
      if (Math.abs(dist - fb.ringRadius) <= fb.thickness) {
        return true;
      }
    }
    if (this.isWaterShieldActive() && getSectorAtPoint(x, y) === SectorType.CAMPO) {
      return true;
    }
    return false;
  }

  public getSectorSmokeLevel(sector: SectorType): number {
    let maxSmoke = 0;
    for (const inst of this.fires.values()) {
      if (inst.data.sector === sector) {
        maxSmoke = Math.max(maxSmoke, inst.data.smokeLevel);
      } else if (inst.data.smokeLevel >= 3) {
        maxSmoke = Math.max(maxSmoke, inst.data.smokeLevel - 1);
      }
    }
    return maxSmoke;
  }

  public getSmokeLevelAtPoint(x: number, y: number): number {
    let highest = 0;
    for (const inst of this.fires.values()) {
      const dist = getIsoDistance(x, y, inst.data.x, inst.data.y);
      const smokeRadius = 35 + inst.data.smokeLevel * 18;
      if (dist <= smokeRadius) {
        highest = Math.max(highest, inst.data.smokeLevel);
      }
    }
    return highest;
  }

  public update(
    deltaMs: number,
    fireGrowthMultiplier: number,
    indigenousDemarcationActive: boolean
  ): { forestDamage: number } {
    const now = this.scene.time.now;

    this.firebreaks = this.firebreaks.filter((fb) => {
      if (now >= fb.expiresAt) {
        fb.graphics.destroy();
        return false;
      }
      return true;
    });

    const dtSec = deltaMs / 1000;
    let totalForestDamage = 0;

    for (const inst of this.fires.values()) {
      let sectorMult = 1.0;
      if (inst.data.sector === SectorType.FLORESTA && indigenousDemarcationActive) {
        sectorMult = 0.5;
      }
      if (inst.data.sector === SectorType.CAMPO && this.isWaterShieldActive()) {
        sectorMult *= 0.45;
      }

      const geometricRate = (0.042 * inst.data.intensity + 1.4) * fireGrowthMultiplier * sectorMult;
      inst.data.intensity = Math.min(100, inst.data.intensity + geometricRate * dtSec);

      if (inst.data.intensity < 32) {
        inst.data.smokeLevel = 1;
      } else if (inst.data.intensity < 58) {
        inst.data.smokeLevel = 2;
      } else if (inst.data.intensity < 82) {
        inst.data.smokeLevel = 3;
      } else {
        inst.data.smokeLevel = 4;
      }

      this.updateFireVisuals(inst);

      const sectorWeight =
        inst.data.sector === SectorType.FLORESTA
          ? 1.0
          : inst.data.sector === SectorType.CAMPO
            ? 0.65
            : 0.35;
      totalForestDamage += (inst.data.intensity / 100) * 0.85 * sectorWeight * sectorMult * dtSec;
    }

    // Propagação geométrica no plano do solo isométrico (avança em direção à Cidade no centro)
    this.spreadTimer += deltaMs;
    if (this.spreadTimer >= 3800) {
      this.spreadTimer = 0;
      const currentFires = Array.from(this.fires.values());
      for (const inst of currentFires) {
        if (inst.data.intensity >= 74 && this.fires.size < 16) {
          const chance =
            inst.data.sector === SectorType.FLORESTA && indigenousDemarcationActive ? 0.22 : 0.42;
          if (Math.random() < chance) {
            const groundAngleToCity = Math.atan2(
              (WORLD_CENTER_Y - inst.data.y) * ISO_INVERSE_Y_RATIO,
              WORLD_CENTER_X - inst.data.x
            );
            const spreadAngle = groundAngleToCity + Phaser.Math.FloatBetween(-0.95, 0.95);
            const dist = Phaser.Math.Between(55, 92);
            this.spawnFire(
              inst.data.x + Math.cos(spreadAngle) * dist,
              inst.data.y + Math.sin(spreadAngle) * (dist * ISO_Y_RATIO),
              22
            );
          }
        }
      }
    }

    return { forestDamage: totalForestDamage };
  }

  private updateFireVisuals(inst: ActiveFireInstance): void {
    const norm = inst.data.intensity / 100;
    const yDepth = 20 + Math.floor(inst.data.y);

    inst.fireSprite.setScale(0.8 + norm * 0.75).setDepth(yDepth);

    const smokeKey = `smoke_${inst.data.smokeLevel}`;
    if (inst.smokeSprite.texture.key !== smokeKey) {
      inst.smokeSprite.setTexture(smokeKey);
    }
    const smokeCfg = SMOKE_PALETTE[inst.data.smokeLevel];
    inst.smokeSprite.setAlpha(smokeCfg.alpha);
    inst.smokeSprite.setScale(1.2 + inst.data.smokeLevel * 0.52);
    inst.smokeSprite.setPosition(inst.data.x, inst.data.y - 22).setDepth(yDepth + 5);

    inst.ringGraphics.clear();
    inst.ringGraphics.setDepth(16 + Math.floor(inst.data.y));
    const smokeRadius = 24 + inst.data.smokeLevel * 14;
    inst.ringGraphics.fillStyle(smokeCfg.color, smokeCfg.alpha * 0.42);
    inst.ringGraphics.fillEllipse(inst.data.x, inst.data.y, smokeRadius * 2, smokeRadius, 24);

    const barW = 28;
    const barH = 4;
    inst.ringGraphics.fillStyle(0x09090b, 0.85);
    inst.ringGraphics.fillRect(inst.data.x - barW / 2, inst.data.y + 6, barW, barH);
    inst.ringGraphics.fillStyle(0xef4444, 1);
    inst.ringGraphics.fillRect(
      inst.data.x - barW / 2,
      inst.data.y + 6,
      (barW * inst.data.intensity) / 100,
      barH
    );
  }
}
