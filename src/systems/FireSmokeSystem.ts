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

/** Profundidade única das barras de intensidade: uma só camada para todos os focos */
const FIRE_BARS_DEPTH = 9000;
/** Lado de cada bloco de marcas de queimada, em px do mundo */
const SCORCH_TILE_SIZE = 1024;
/** Margem extra na decisão de visibilidade, cobrindo o atraso de um quadro da câmera */
const SCORCH_CULL_MARGIN = 256;

/** Escalas aplicadas às texturas de marca de queimada (assadas no Blitter, pois bobs não têm escala) */
const SCORCH_GROUND_SCALE = 0.45;
const SCORCH_SMOKE_SCALE = 0.9;

/** Marca de queimada individual (bob de Blitter); destruí-la remove o desenho */
export interface ScorchMark {
  destroy(): void;
}

/** Blitters de marcas de queimada de um bloco do mapa; cada bloco é escondido quando está fora da câmera */
interface ScorchTile {
  ground: Phaser.GameObjects.Blitter;
  smoke: Phaser.GameObjects.Blitter;
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export interface ActiveFireInstance {
  data: FireNodeData;
  fireSprite: Phaser.GameObjects.Sprite;
  smokeSprite: Phaser.GameObjects.Sprite;
  /** Halo de fumaça pré-renderizado por nível (textura fixa, sem triangulação por frame) */
  haloSprite: Phaser.GameObjects.Image;
  hitZone: Phaser.GameObjects.Zone;
  /** Último estado visível das barras (nível de fumaça + intensidade inteira) */
  ringStateKey: number;
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
  private scorchGroundKey: string | null = null;
  private scorchSmokeKey: string | null = null;
  private scorchGroundSize = { w: 0, h: 0 };
  private scorchSmokeSize = { w: 0, h: 0 };
  private scorchTiles: Map<string, ScorchTile> = new Map();
  private barsGraphics: Phaser.GameObjects.Graphics | null = null;
  private barsDirty = false;

  constructor(scene: Phaser.Scene) {
    super();
    this.scene = scene;
  }

  public getActiveFires(): ActiveFireInstance[] {
    return Array.from(this.fires.values());
  }

  /** Foco ativo mais próximo de (x, y), sem alocar lista intermediária */
  public findNearestFire(x: number, y: number): ActiveFireInstance | null {
    let nearest: ActiveFireInstance | null = null;
    let nearestDist = Infinity;
    for (const fire of this.fires.values()) {
      const d = getIsoDistance(x, y, fire.data.x, fire.data.y);
      if (d < nearestDist) {
        nearestDist = d;
        nearest = fire;
      }
    }
    return nearest;
  }

  public spawnFire(x: number, y: number, initialIntensity = 18): ActiveFireInstance | null {
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

    this.ensureHaloTextures();
    const haloSprite = this.scene.add
      .image(clampedX, clampedY, 'fire_halo_1')
      .setDepth(16 + Math.floor(clampedY));

    const hitZone = this.scene.add
      .zone(clampedX, clampedY, 56, 56)
      .setInteractive({ useHandCursor: true })
      .setDepth(35);

    // Persistente: permanece no solo mesmo após o fogo ser apagado
    this.createScorchMark(clampedX, clampedY);

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
      haloSprite,
      hitZone,
      ringStateKey: -1
    };

    hitZone.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      if (pointer.getDistance() < 12) {
        this.emit('fire-tapped', instance);
      }
    });

    this.fires.set(id, instance);
    this.barsDirty = true;
    SoundManager.playFireStart();
    this.updateFireVisuals(instance);
    return instance;
  }

  /** Solo preto e fumaça preta que marcam um ponto queimado; quem chama decide quando destruí-los */
  public createScorchMark(x: number, y: number): ScorchMark[] {
    this.ensureScorchTextures();
    const tile = this.getScorchTile(x, y);

    // Posições do Blitter são o canto superior esquerdo da textura
    const ground = tile.ground.create(
      x - this.scorchGroundSize.w / 2,
      y - this.scorchGroundSize.h / 2
    );

    const smoke = tile.smoke.create(
      x - this.scorchSmokeSize.w / 2,
      y - 30 - this.scorchSmokeSize.h * 0.8
    );
    smoke.setAlpha(0.55);

    return [ground, smoke];
  }

  /**
   * Cria as texturas de marca com a escala já aplicada, uma única vez.
   * Um Blitter desenha todos os seus bobs em uma só chamada.
   */
  private ensureScorchTextures(): void {
    if (this.scorchGroundKey) return;

    this.scorchGroundKey = this.bakeScaledTexture('solo_queimado', SCORCH_GROUND_SCALE, 'scorch_ground');
    this.scorchSmokeKey = this.bakeScaledTexture('smoke_4', SCORCH_SMOKE_SCALE, 'scorch_smoke');
    this.scorchGroundSize = this.textureSize(this.scorchGroundKey);
    this.scorchSmokeSize = this.textureSize(this.scorchSmokeKey);
  }

  /**
   * Blitters são agrupados em blocos. Um Blitter desenha todos os bobs, mesmo fora da tela,
   * então separar em blocos permite esconder os que estão longe da câmera.
   */
  private getScorchTile(x: number, y: number): ScorchTile {
    const i = Math.floor(x / SCORCH_TILE_SIZE);
    const j = Math.floor(y / SCORCH_TILE_SIZE);
    const key = `${i},${j}`;
    const existing = this.scorchTiles.get(key);
    if (existing) return existing;

    const tile: ScorchTile = {
      ground: this.scene.add.blitter(0, 0, this.scorchGroundKey!).setDepth(3),
      smoke: this.scene.add.blitter(0, 0, this.scorchSmokeKey!).setDepth(3.1),
      minX: i * SCORCH_TILE_SIZE,
      minY: j * SCORCH_TILE_SIZE,
      maxX: (i + 1) * SCORCH_TILE_SIZE,
      maxY: (j + 1) * SCORCH_TILE_SIZE
    };
    this.scorchTiles.set(key, tile);
    return tile;
  }

  private cullScorchTiles(): void {
    const view = this.scene.cameras.main.worldView;
    const left = view.x - SCORCH_CULL_MARGIN;
    const top = view.y - SCORCH_CULL_MARGIN;
    const right = view.x + view.width + SCORCH_CULL_MARGIN;
    const bottom = view.y + view.height + SCORCH_CULL_MARGIN;

    for (const tile of this.scorchTiles.values()) {
      const visible = tile.maxX >= left && tile.minX <= right && tile.maxY >= top && tile.minY <= bottom;
      if (tile.ground.visible !== visible) {
        tile.ground.setVisible(visible);
        tile.smoke.setVisible(visible);
      }
    }
  }

  private textureSize(key: string): { w: number; h: number } {
    const img = this.scene.textures.get(key).getSourceImage();
    return { w: img.width, h: img.height };
  }

  private bakeScaledTexture(srcKey: string, scale: number, outKey: string): string {
    const textures = this.scene.textures;
    if (textures.exists(outKey)) return outKey;

    const src = textures.get(srcKey).getSourceImage();
    const w = Math.round(src.width * scale);
    const h = Math.round(src.height * scale);
    const dt = textures.addDynamicTexture(outKey, w, h);
    if (!dt) throw new Error(`Falha ao criar textura de marca: ${outKey}`);
    dt.stamp(srcKey, undefined, 0, 0, { originX: 0, originY: 0, scale });
    dt.render();
    return outKey;
  }


  public extinguishFire(id: string, amount: number): boolean {
    const inst = this.fires.get(id);
    if (!inst) return false;

    inst.data.intensity -= amount;
    if (inst.data.intensity <= 0) {
      inst.fireSprite.destroy();
      inst.smokeSprite.destroy();
      inst.haloSprite.destroy();
      inst.hitZone.destroy();
      this.fires.delete(id);
      this.barsDirty = true;
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
    this.cullScorchTiles();
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
        if (inst.data.intensity >= 74) {
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

    if (this.barsDirty) {
      this.drawBars();
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

    const haloKey = `fire_halo_${inst.data.smokeLevel}`;
    if (inst.haloSprite.texture.key !== haloKey) {
      inst.haloSprite.setTexture(haloKey);
    }

    const ringStateKey = inst.data.smokeLevel * 1000 + Math.round(inst.data.intensity);
    if (ringStateKey !== inst.ringStateKey) {
      inst.ringStateKey = ringStateKey;
      this.barsDirty = true;
    }
  }

  /** Halos de fumaça prontos, um por nível, com a cor e a opacidade do nível já aplicadas */
  private ensureHaloTextures(): void {
    for (const level of [1, 2, 3, 4] as const) {
      const key = `fire_halo_${level}`;
      if (this.scene.textures.exists(key)) continue;

      const cfg = SMOKE_PALETTE[level];
      const radius = 24 + level * 14;
      const w = radius * 2 + 4;
      const h = radius + 4;
      const g = this.scene.make.graphics({}, false);
      g.fillStyle(cfg.color, cfg.alpha * 0.42);
      g.fillEllipse(w / 2, h / 2, radius * 2, radius, 24);
      g.generateTexture(key, w, h);
      g.destroy();
    }
  }

  /**
   * Redesenha as barras de intensidade de todos os focos numa única camada.
   * Um Graphics por foco custaria um objeto renderizado a cada frame por foco.
   */
  private drawBars(): void {
    this.barsDirty = false;
    if (!this.barsGraphics) {
      this.barsGraphics = this.scene.add.graphics().setDepth(FIRE_BARS_DEPTH);
    }
    const g = this.barsGraphics;
    g.clear();

    const barW = 28;
    const barH = 4;
    for (const inst of this.fires.values()) {
      const x = inst.data.x - barW / 2;
      const y = inst.data.y + 6;
      g.fillStyle(0x09090b, 0.85);
      g.fillRect(x, y, barW, barH);
      g.fillStyle(0xef4444, 1);
      g.fillRect(x, y, (barW * inst.data.intensity) / 100, barH);
    }
  }
}
