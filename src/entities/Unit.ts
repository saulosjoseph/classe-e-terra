import Phaser from 'phaser';
import {
  CAMPO_RADIUS,
  FLORESTA_OUTER_RADIUS,
  WORLD_CENTER_X,
  WORLD_CENTER_Y,
  WORLD_HEIGHT,
  WORLD_WIDTH
} from '../config/GameBalance';
import { UnitType } from '../types/GameTypes';

export abstract class Unit extends Phaser.Events.EventEmitter {
  public readonly id: string;
  public unitType: UnitType;
  public x: number;
  public y: number;
  public targetX: number;
  public targetY: number;
  public sprite: Phaser.GameObjects.Sprite;
  public selectionRing: Phaser.GameObjects.Graphics;
  public statusBar: Phaser.GameObjects.Graphics;
  protected scene: Phaser.Scene;
  protected baseSpeed = 108;
  protected stamina = 100;
  protected maxStamina = 100;
  protected equipmentBoostUntil = 0;
  protected patrolAngle = 0;

  constructor(
    scene: Phaser.Scene,
    id: string,
    unitType: UnitType,
    textureKey: string,
    x: number,
    y: number
  ) {
    super();
    this.scene = scene;
    this.id = id;
    this.unitType = unitType;
    this.x = x;
    this.y = y;
    this.targetX = x;
    this.targetY = y;
    this.patrolAngle = Math.atan2(y - WORLD_CENTER_Y, x - WORLD_CENTER_X);

    this.selectionRing = scene.add.graphics().setDepth(24);
    this.sprite = scene.add.sprite(x, y, textureKey).setDepth(25);
    this.statusBar = scene.add.graphics().setDepth(26);

    this.drawOverlays();
  }

  public setCommandTarget(tx: number, ty: number): void {
    let clampedX = Phaser.Math.Clamp(tx, 48, WORLD_WIDTH - 48);
    let clampedY = Phaser.Math.Clamp(ty, 48, WORLD_HEIGHT - 48);

    const dx = clampedX - WORLD_CENTER_X;
    const dy = clampedY - WORLD_CENTER_Y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx);

    // Regra do GDD: Brigada Voluntária inicial é restrita ao anel da Floresta!
    if (this.unitType === UnitType.BRIGADA_VOLUNTARIA && dist < CAMPO_RADIUS + 18) {
      clampedX = WORLD_CENTER_X + Math.cos(angle) * (CAMPO_RADIUS + 26);
      clampedY = WORLD_CENTER_Y + Math.sin(angle) * (CAMPO_RADIUS + 26);
    } else if (dist > FLORESTA_OUTER_RADIUS - 20) {
      clampedX = WORLD_CENTER_X + Math.cos(angle) * (FLORESTA_OUTER_RADIUS - 24);
      clampedY = WORLD_CENTER_Y + Math.sin(angle) * (FLORESTA_OUTER_RADIUS - 24);
    }

    this.targetX = clampedX;
    this.targetY = clampedY;
  }

  public applyEquipmentBoost(durationMs = 15000): void {
    this.equipmentBoostUntil = this.scene.time.now + durationMs;
    this.stamina = this.maxStamina;
  }

  public hasEquipmentBoost(): boolean {
    return this.scene.time.now < this.equipmentBoostUntil;
  }

  public isMoving(): boolean {
    return Phaser.Math.Distance.Between(this.x, this.y, this.targetX, this.targetY) > 6;
  }

  public abstract isImmuneToSmoke(): boolean;

  protected moveStep(deltaMs: number, smokeLevelAtPos: number): void {
    const dist = Phaser.Math.Distance.Between(this.x, this.y, this.targetX, this.targetY);
    if (dist <= 4) return;

    const dtSec = deltaMs / 1000;
    let speed = this.baseSpeed;

    if (this.hasEquipmentBoost()) {
      speed *= 1.35;
    }

    if (!this.isImmuneToSmoke() && smokeLevelAtPos >= 2) {
      speed *= smokeLevelAtPos >= 3 ? 0.55 : 0.75;
    }

    if (this.unitType === UnitType.BRIGADA_VOLUNTARIA && this.stamina < 25) {
      speed *= 0.58;
    }

    const angle = Phaser.Math.Angle.Between(this.x, this.y, this.targetX, this.targetY);
    const step = Math.min(dist, speed * dtSec);
    this.x += Math.cos(angle) * step;
    this.y += Math.sin(angle) * step;

    this.sprite.setPosition(this.x, this.y);
  }

  protected drawOverlays(): void {
    this.selectionRing.clear();
    if (this.hasEquipmentBoost()) {
      this.selectionRing.lineStyle(2, 0xfacc15, 0.9);
      this.selectionRing.strokeCircle(this.x, this.y + 2, 16);
    } else {
      this.selectionRing.lineStyle(
        1.5,
        this.unitType === UnitType.GUARDA_FLORESTAL ? 0x10b981 : 0x38bdf8,
        0.55
      );
      this.selectionRing.strokeCircle(this.x, this.y + 2, 14);
    }

    this.statusBar.clear();
    const w = 24;
    const h = 3;
    this.statusBar.fillStyle(0x090d0a, 0.85);
    this.statusBar.fillRect(this.x - w / 2, this.y - 18, w, h);
    const ratio = Phaser.Math.Clamp(this.stamina / this.maxStamina, 0, 1);
    const color =
      this.unitType === UnitType.GUARDA_FLORESTAL
        ? 0x10b981
        : ratio > 0.35
          ? 0x38bdf8
          : 0xf59e0b;
    this.statusBar.fillStyle(color, 1);
    this.statusBar.fillRect(this.x - w / 2, this.y - 18, w * ratio, h);
  }

  public destroy(): void {
    this.sprite.destroy();
    this.selectionRing.destroy();
    this.statusBar.destroy();
  }
}
