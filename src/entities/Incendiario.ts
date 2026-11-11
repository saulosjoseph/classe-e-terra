import Phaser from 'phaser';
import {
  FLORESTA_OUTER_RADIUS,
  WORLD_CENTER_X,
  WORLD_CENTER_Y
} from '../config/GameBalance';
import { FireSmokeSystem } from '../systems/FireSmokeSystem';

/**
 * Os Incendiários (Agentes do Caos):
 * Surgem nas bordas externas e pontos cegos da mata, entram para atear fogo e tentam fugir de volta para a borda externa.
 */
export class Incendiario extends Phaser.Events.EventEmitter {
  public readonly id: string;
  public x: number;
  public y: number;
  public sprite: Phaser.GameObjects.Sprite;
  public alertBadge: Phaser.GameObjects.Text;
  public hitZone: Phaser.GameObjects.Zone;

  private scene: Phaser.Scene;
  private targetX: number;
  private targetY: number;
  private escapeX: number;
  private escapeY: number;
  private speed = 64;
  private hasIgnited = false;
  private igniteWarmupMs = 1500;
  private alive = true;

  constructor(
    scene: Phaser.Scene,
    id: string,
    spawnX: number,
    spawnY: number,
    targetX: number,
    targetY: number
  ) {
    super();
    this.scene = scene;
    this.id = id;
    this.x = spawnX;
    this.y = spawnY;
    this.targetX = targetX;
    this.targetY = targetY;

    const escapeAngle = Math.atan2(spawnY - WORLD_CENTER_Y, spawnX - WORLD_CENTER_X);
    this.escapeX = WORLD_CENTER_X + Math.cos(escapeAngle) * (FLORESTA_OUTER_RADIUS + 40);
    this.escapeY = WORLD_CENTER_Y + Math.sin(escapeAngle) * (FLORESTA_OUTER_RADIUS + 40);

    this.sprite = scene.add.sprite(spawnX, spawnY, 'enemy_incendiario').setDepth(24);
    this.alertBadge = scene.add
      .text(spawnX, spawnY - 20, '!', {
        fontFamily: 'Courier New, monospace',
        fontSize: '13px',
        fontStyle: 'bold',
        color: '#fef08a',
        backgroundColor: '#dc2626',
        padding: { x: 3, y: 1 }
      })
      .setOrigin(0.5)
      .setDepth(30);

    this.hitZone = scene.add
      .zone(spawnX, spawnY, 54, 54)
      .setInteractive({ useHandCursor: true })
      .setDepth(37);

    this.hitZone.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      if (this.alive && pointer.getDistance() < 12) {
        this.emit('arsonist-tapped', this);
      }
    });
  }

  public isAlive(): boolean {
    return this.alive;
  }

  public update(deltaMs: number, fireSystem: FireSmokeSystem): void {
    if (!this.alive) return;
    const dtSec = deltaMs / 1000;

    if (!this.hasIgnited) {
      const dist = Phaser.Math.Distance.Between(this.x, this.y, this.targetX, this.targetY);
      if (dist > 6) {
        const angle = Phaser.Math.Angle.Between(this.x, this.y, this.targetX, this.targetY);
        this.x += Math.cos(angle) * this.speed * dtSec;
        this.y += Math.sin(angle) * this.speed * dtSec;
      } else {
        // Ateando fogo no ponto cego
        this.igniteWarmupMs -= deltaMs;
        this.alertBadge.setText('🔥');
        if (this.igniteWarmupMs <= 0) {
          this.hasIgnited = true;
          fireSystem.spawnFire(this.x, this.y, 24);
          this.alertBadge.setText('➔');
        }
      }
    } else {
      // Tenta fugir pelas bordas após atear fogo
      const distEscape = Phaser.Math.Distance.Between(this.x, this.y, this.escapeX, this.escapeY);
      if (distEscape <= 10) {
        this.destroy();
        return;
      }
      const angle = Phaser.Math.Angle.Between(this.x, this.y, this.escapeX, this.escapeY);
      this.x += Math.cos(angle) * (this.speed * 1.18) * dtSec;
      this.y += Math.sin(angle) * (this.speed * 1.18) * dtSec;
    }

    this.sprite.setPosition(this.x, this.y);
    this.alertBadge.setPosition(this.x, this.y - 20);
    this.hitZone.setPosition(this.x, this.y);
  }

  public destroy(): void {
    if (!this.alive) return;
    this.alive = false;
    this.sprite.destroy();
    this.alertBadge.destroy();
    this.hitZone.destroy();
  }
}
