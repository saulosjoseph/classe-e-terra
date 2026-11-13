import Phaser from 'phaser';
import { getIsoDistance } from '../config/GameBalance';
import { createNavRoute, getCollisionSystem, NavRoute, Point } from '../systems/CollisionSystem';

export const CARRO_POPULAR_TEXTURES = [
  'carro_popular_vermelho',
  'carro_popular_amarelo',
  'carro_popular_preto',
  'carro_popular_prata'
] as const;

const SPEED = 140;
const DELIVERY_DWELL_MS = 600;
const ARRIVE_DIST = 6;
const SPRITE_SCALE = 0.7;

type CarroPhase = 'to-base' | 'delivering' | 'returning';

/**
 * Carro popular que leva a doação de uma casa até a base dos brigadistas e volta para a casa de origem.
 * Apenas animação: o efeito da doação é aplicado imediatamente pelo GameScene.
 * É conduzido pelo update() da cena, por isso pausa junto com o jogo.
 */
export class CarroPopular {
  private scene: Phaser.Scene;
  private sprite: Phaser.GameObjects.Sprite;
  private shadowSprite: Phaser.GameObjects.Sprite;
  private x: number;
  private y: number;
  private homeX: number;
  private homeY: number;
  private destination: Point;
  private phase: CarroPhase = 'to-base';
  private dwellMs = 0;
  private alive = true;
  private navRoute: NavRoute = createNavRoute();
  /** Obstáculo da casa de origem: fica inativo enquanto o carro está fora, para ele poder sair */
  private homeObstacleId: string;

  constructor(scene: Phaser.Scene, homeX: number, homeY: number, destination: Point, homeObstacleId: string) {
    this.scene = scene;
    this.x = homeX;
    this.y = homeY;
    this.homeX = homeX;
    this.homeY = homeY;
    this.destination = destination;
    this.homeObstacleId = homeObstacleId;
    getCollisionSystem(scene).setObstacleActive(homeObstacleId, false);

    const color = Phaser.Utils.Array.GetRandom([...CARRO_POPULAR_TEXTURES]);

    this.shadowSprite = scene.add
      .sprite(homeX, homeY, 'unit_shadow')
      .setOrigin(0.5, 0.5)
      .setScale(1.1, 0.8)
      .setDepth(18);

    this.sprite = scene.add
      .sprite(homeX, homeY, color)
      .setOrigin(0.5, 0.94)
      .setScale(SPRITE_SCALE)
      .setDepth(20 + Math.floor(homeY));
  }

  public isAlive(): boolean {
    return this.alive;
  }

  public update(deltaMs: number): void {
    if (!this.alive) return;

    if (this.phase === 'delivering') {
      this.dwellMs -= deltaMs;
      if (this.dwellMs <= 0) this.phase = 'returning';
      this.render();
      return;
    }

    const dest = this.phase === 'to-base'
      ? this.destination
      : { x: this.homeX, y: this.homeY };

    if (getIsoDistance(this.x, this.y, dest.x, dest.y) <= ARRIVE_DIST) {
      if (this.phase === 'to-base') {
        this.phase = 'delivering';
        this.dwellMs = DELIVERY_DWELL_MS;
      } else {
        this.destroy();
        return;
      }
      this.render();
      return;
    }

    const dtSec = deltaMs / 1000;
    const prevX = this.x;
    const next = getCollisionSystem(this.scene).navigate(
      this.x,
      this.y,
      dest.x,
      dest.y,
      this.navRoute,
      SPEED * dtSec
    );
    this.x = next.x;
    this.y = next.y;
    if (Math.abs(this.x - prevX) > 0.05) {
      this.sprite.setFlipX(this.x < prevX);
    }
    this.render();
  }

  private render(): void {
    const yDepth = 20 + Math.floor(this.y);
    this.sprite.setPosition(this.x, this.y).setDepth(yDepth);
    this.shadowSprite.setPosition(this.x, this.y);
  }

  public destroy(): void {
    if (!this.alive) return;
    this.alive = false;
    getCollisionSystem(this.scene).setObstacleActive(this.homeObstacleId, true);
    this.sprite.destroy();
    this.shadowSprite.destroy();
  }
}
