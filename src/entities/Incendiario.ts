import Phaser from 'phaser';
import {
  FLORESTA_OUTER_RADIUS,
  ISO_INVERSE_Y_RATIO,
  ISO_Y_RATIO,
  WORLD_CENTER_X,
  WORLD_CENTER_Y,
  WORLD_HEIGHT,
  WORLD_WIDTH,
  getIsoDistance
} from '../config/GameBalance';
import { FireSmokeSystem } from '../systems/FireSmokeSystem';
import { createNavRoute, getCollisionSystem, NavRoute } from '../systems/CollisionSystem';

/**
 * Os Incendiários (Agentes do Caos):
 * Surgem nas bordas externas e pontos cegos da mata, entram para atear fogo e tentam fugir de volta para a borda externa.
 * Ao chegar à borda, seguem para fora do mapa e são removidos.
 */
export class Incendiario extends Phaser.Events.EventEmitter {
  public readonly id: string;
  public x: number;
  public y: number;
  public sprite: Phaser.GameObjects.Sprite;
  public shadowSprite: Phaser.GameObjects.Sprite;
  public selectionRing: Phaser.GameObjects.Graphics;
  public hitZone: Phaser.GameObjects.Zone;

  private scene: Phaser.Scene;
  private targetX: number;
  private targetY: number;
  private escapeX: number;
  private escapeY: number;
  private escapeAngle: number;
  private speed = 100;
  private escapeSpeed = 150;
  private hasIgnited = false;
  private igniteWarmupMs = 1500;
  private exiting = false;
  private alive = true;
  private isFollowed = false;
  private navRoute: NavRoute = createNavRoute();

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
    const collision = getCollisionSystem(scene);
    const blindSpot = collision.snapToFree(targetX, targetY);
    this.targetX = blindSpot.x;
    this.targetY = blindSpot.y;

    this.escapeAngle = Math.atan2((spawnY - WORLD_CENTER_Y) * ISO_INVERSE_Y_RATIO, spawnX - WORLD_CENTER_X);
    const escapeRawX = WORLD_CENTER_X + Math.cos(this.escapeAngle) * (FLORESTA_OUTER_RADIUS + 50);
    const escapeRawY = WORLD_CENTER_Y + Math.sin(this.escapeAngle) * ((FLORESTA_OUTER_RADIUS + 50) * ISO_Y_RATIO);
    const escape = collision.snapToFree(escapeRawX, escapeRawY);
    this.escapeX = escape.x;
    this.escapeY = escape.y;

    this.shadowSprite = scene.add.sprite(spawnX, spawnY, 'unit_shadow').setOrigin(0.5, 0.5).setDepth(18);

    // Anel de rastreamento no solo
    this.selectionRing = scene.add.graphics().setDepth(19);

    this.sprite = scene.add
      .sprite(spawnX, spawnY, 'incendiario', 0)
      .setOrigin(0.5, 0.88)
      .setScale(0.75)
      .setDepth(20 + Math.floor(spawnY));

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

  /** Move-se em direção ao objetivo sem atravessar obstáculos */
  private advance(goalX: number, goalY: number, stepLen: number): void {
    const prevX = this.x;
    const next = getCollisionSystem(this.scene).navigate(
      this.x,
      this.y,
      goalX,
      goalY,
      this.navRoute,
      stepLen
    );
    this.x = next.x;
    this.y = next.y;
    if (Math.abs(this.x - prevX) > 0.05) {
      this.sprite.setFlipX(this.x < prevX);
    }
    this.sprite.play('incendiario_walk', true);
  }

  /** Anda na direção radial da fuga, sem navegação, até sair do mapa */
  private stepOutward(stepLen: number): void {
    const prevX = this.x;
    this.x += Math.cos(this.escapeAngle) * stepLen;
    this.y += Math.sin(this.escapeAngle) * stepLen * ISO_Y_RATIO;
    if (Math.abs(this.x - prevX) > 0.05) {
      this.sprite.setFlipX(this.x < prevX);
    }
    this.sprite.play('incendiario_walk', true);
  }

  private isOutsideMap(): boolean {
    return this.x < 0 || this.x > WORLD_WIDTH || this.y < 0 || this.y > WORLD_HEIGHT;
  }

  public update(deltaMs: number, fireSystem: FireSmokeSystem): void {
    if (!this.alive) return;
    const dtSec = deltaMs / 1000;

    if (!this.hasIgnited) {
      const dist = getIsoDistance(this.x, this.y, this.targetX, this.targetY);
      if (dist > 6) {
        this.advance(this.targetX, this.targetY, this.speed * dtSec);
      } else {
        // Ateando fogo no ponto cego
        this.sprite.play('incendiario_idle', true);
        this.igniteWarmupMs -= deltaMs;
        if (this.igniteWarmupMs <= 0) {
          this.hasIgnited = true;
          fireSystem.spawnFire(this.x, this.y, 24);
        }
      }
    } else if (this.exiting) {
      this.stepOutward(this.escapeSpeed * dtSec);
      if (this.isOutsideMap()) {
        this.destroy();
        return;
      }
    } else {
      // Tenta fugir pelas bordas após atear fogo; ao chegar à borda, segue para fora do mapa
      const distEscape = getIsoDistance(this.x, this.y, this.escapeX, this.escapeY);
      if (distEscape <= 12) {
        this.exiting = true;
      } else {
        this.advance(this.escapeX, this.escapeY, this.escapeSpeed * dtSec);
      }
    }

    const yDepth = 20 + Math.floor(this.y);
    this.sprite.setPosition(this.x, this.y).setDepth(yDepth);
    this.shadowSprite.setPosition(this.x, this.y);
    this.hitZone.setPosition(this.x, this.y);
    this.drawOverlays();
  }

  public destroy(): void {
    this.alive = false;
    this.sprite.destroy();
    this.shadowSprite.destroy();
    this.hitZone.destroy();
    this.selectionRing.destroy();
  }
}
