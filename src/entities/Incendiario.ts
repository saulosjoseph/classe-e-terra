import Phaser from 'phaser';
import {
  FLORESTA_OUTER_RADIUS,
  ISO_INVERSE_Y_RATIO,
  ISO_Y_RATIO,
  WORLD_CENTER_X,
  WORLD_CENTER_Y,
  getIsoDistance
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
  public shadowSprite: Phaser.GameObjects.Sprite;
  public selectionRing: Phaser.GameObjects.Graphics;
  public alertBadge: Phaser.GameObjects.Text;
  public hitZone: Phaser.GameObjects.Zone;

  private scene: Phaser.Scene;
  private targetX: number;
  private targetY: number;
  private escapeX: number;
  private escapeY: number;
  private speed = 100;
  private escapeSpeed = 150;
  private hasIgnited = false;
  private igniteWarmupMs = 1500;
  private alive = true;
  private isFollowed = false;

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

    const escapeAngle = Math.atan2((spawnY - WORLD_CENTER_Y) * ISO_INVERSE_Y_RATIO, spawnX - WORLD_CENTER_X);
    this.escapeX = WORLD_CENTER_X + Math.cos(escapeAngle) * (FLORESTA_OUTER_RADIUS + 50);
    this.escapeY = WORLD_CENTER_Y + Math.sin(escapeAngle) * ((FLORESTA_OUTER_RADIUS + 50) * ISO_Y_RATIO);

    this.shadowSprite = scene.add.sprite(spawnX, spawnY, 'unit_shadow').setOrigin(0.5, 0.5).setDepth(18);

    // Anel de rastreamento no solo
    this.selectionRing = scene.add.graphics().setDepth(19);

    this.sprite = scene.add
      .sprite(spawnX, spawnY, 'enemy_incendiario')
      .setOrigin(0.5, 0.88)
      .setDepth(20 + Math.floor(spawnY));

    this.alertBadge = scene.add
      .text(spawnX, spawnY - 26, '!', {
        fontFamily: 'Courier New, monospace',
        fontSize: '13px',
        fontStyle: 'bold',
        color: '#fef08a',
        backgroundColor: '#dc2626',
        padding: { x: 3, y: 1 }
      })
      .setOrigin(0.5)
      .setDepth(30 + Math.floor(spawnY));

    this.hitZone = scene.add
      .zone(spawnX, spawnY, 54, 54)
      .setInteractive({ useHandCursor: true })
      .setDepth(37);

    this.hitZone.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      if (this.alive && pointer.getDistance() < 12) {
        this.emit('arsonist-tapped', this);
      }
    });

    this.drawOverlays();
  }

  public setFollowed(followed: boolean): void {
    if (this.isFollowed === followed) return;
    this.isFollowed = followed;
    this.drawOverlays();
  }

  public getIsFollowed(): boolean {
    return this.isFollowed;
  }

  public getLabel(): string {
    return 'Incendiário';
  }

  protected drawOverlays(): void {
    this.selectionRing.clear();
    if (this.isFollowed && this.alive) {
      this.selectionRing.lineStyle(2.5, 0xef4444, 1.0);
      this.selectionRing.strokeEllipse(this.x, this.y, 34, 17, 24);
      this.selectionRing.lineStyle(1.5, 0xfacc15, 0.9);
      this.selectionRing.strokeEllipse(this.x, this.y, 40, 20, 24);
    }
  }

  public isAlive(): boolean {
    return this.alive;
  }

  public update(deltaMs: number, fireSystem: FireSmokeSystem): void {
    if (!this.alive) return;
    const dtSec = deltaMs / 1000;

    if (!this.hasIgnited) {
      const dist = getIsoDistance(this.x, this.y, this.targetX, this.targetY);
      if (dist > 6) {
        const groundAngle = Math.atan2(
          (this.targetY - this.y) * ISO_INVERSE_Y_RATIO,
          this.targetX - this.x
        );
        this.x += Math.cos(groundAngle) * this.speed * dtSec;
        this.y += Math.sin(groundAngle) * this.speed * dtSec * ISO_Y_RATIO;
        this.sprite.setFlipX(Math.cos(groundAngle) < 0);
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
      const distEscape = getIsoDistance(this.x, this.y, this.escapeX, this.escapeY);
      if (distEscape <= 12) {
        this.destroy();
        return;
      }
      const groundAngle = Math.atan2(
        (this.escapeY - this.y) * ISO_INVERSE_Y_RATIO,
        this.escapeX - this.x
      );
      this.x += Math.cos(groundAngle) * this.escapeSpeed * dtSec;
      this.y += Math.sin(groundAngle) * this.escapeSpeed * dtSec * ISO_Y_RATIO;
      this.sprite.setFlipX(Math.cos(groundAngle) < 0);
    }

    const yDepth = 20 + Math.floor(this.y);
    this.sprite.setPosition(this.x, this.y).setDepth(yDepth);
    this.shadowSprite.setPosition(this.x, this.y);
    this.alertBadge.setPosition(this.x, this.y - 28).setDepth(yDepth + 1);
    this.hitZone.setPosition(this.x, this.y);
    this.drawOverlays();
  }

  public destroy(): void {
    if (!this.alive) return;
    this.alive = false;
    this.selectionRing.destroy();
    this.sprite.destroy();
    this.shadowSprite.destroy();
    this.alertBadge.destroy();
    this.hitZone.destroy();
  }
}
