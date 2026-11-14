import Phaser from 'phaser';
import {
  CAMPO_RADIUS,
  FLORESTA_OUTER_RADIUS,
  ISO_INVERSE_Y_RATIO,
  ISO_Y_RATIO,
  WORLD_CENTER_X,
  WORLD_CENTER_Y,
  WORLD_HEIGHT,
  WORLD_WIDTH,
  getIsoDistance,
  getIsoSquareDist
} from '../config/GameBalance';
import { UnitType } from '../types/GameTypes';
import { createNavRoute, getCollisionSystem, NavRoute } from '../systems/CollisionSystem';

export abstract class Unit extends Phaser.Events.EventEmitter {
  public readonly id: string;
  public unitType: UnitType;
  public x: number;
  public y: number;
  public targetX: number;
  public targetY: number;
  public sprite: Phaser.GameObjects.Sprite;
  public shadowSprite: Phaser.GameObjects.Sprite;
  public selectionRing: Phaser.GameObjects.Graphics;
  public statusBar: Phaser.GameObjects.Graphics;
  public hitZone: Phaser.GameObjects.Zone;
  protected isFollowed = false;
  protected scene: Phaser.Scene;
  protected baseSpeed = 108;
  protected stamina = 100;
  protected maxStamina = 100;
  protected equipmentBoostUntil = 0;
  protected patrolAngle = 0;
  protected statusBarOffsetY = 28;
  private overlayKey = -1;
  protected navRoute: NavRoute = createNavRoute();

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
    this.patrolAngle = Math.atan2((y - WORLD_CENTER_Y) * ISO_INVERSE_Y_RATIO, x - WORLD_CENTER_X);

    // Sombra elíptica projetada no plano do chão isométrico
    this.shadowSprite = scene.add.sprite(x, y, 'unit_shadow').setOrigin(0.5, 0.5).setDepth(18);

    // Anel de seleção em elipse isométrica 2:1
    this.selectionRing = scene.add.graphics().setDepth(19);

    // Sprite com pivô nos pés (0.5, 0.88) e profundidade vinculada ao Y do chão
    this.sprite = scene.add
      .sprite(x, y, textureKey)
      .setOrigin(0.5, 0.88)
      .setDepth(20 + Math.floor(y));

    // Barra de energia flutuando acima da cabeça
    this.statusBar = scene.add.graphics().setDepth(21 + Math.floor(y));

    // Zona de toque/clique interativa calibrada nos pés e corpo da unidade
    this.hitZone = scene.add
      .zone(x, y, 52, 62)
      .setOrigin(0.5, 0.88)
      .setInteractive({ useHandCursor: true })
      .setDepth(35 + Math.floor(y));

    this.hitZone.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      // Tolera até 10px de movimento para não conflitar com arraste panorâmico do mapa
      if (pointer.getDistance() < 10) {
        this.emit('unit-tapped', this);
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
    switch (this.unitType) {
      case UnitType.BRIGADA_VOLUNTARIA:
        return 'Brigadista Voluntário';
      case UnitType.BRIGADISTA_COMUNITARIO:
        return 'Brigadista Comunitário';
      case UnitType.BOMBEIRO:
        return 'Bombeiro';
      case UnitType.GUARDA_FLORESTAL:
        return 'Guarda Florestal';
      case UnitType.TRABALHADOR_RURAL:
        return 'Trabalhador Rural';
      default:
        return 'Unidade Popular';
    }
  }

  public setCommandTarget(tx: number, ty: number): void {
    let clampedX = Phaser.Math.Clamp(tx, 48, WORLD_WIDTH - 48);
    let clampedY = Phaser.Math.Clamp(ty, 48, WORLD_HEIGHT - 48);

    const sqDist = getIsoSquareDist(clampedX, clampedY);

    // Regra do GDD: Brigada Voluntária inicial é restrita ao setor quadrado da Floresta!
    if (this.unitType === UnitType.BRIGADA_VOLUNTARIA && sqDist < CAMPO_RADIUS + 20) {
      const factor = (CAMPO_RADIUS + 28) / Math.max(1, sqDist);
      clampedX = Math.round(WORLD_CENTER_X + (clampedX - WORLD_CENTER_X) * factor);
      clampedY = Math.round(WORLD_CENTER_Y + (clampedY - WORLD_CENTER_Y) * factor);
    } else if (sqDist > FLORESTA_OUTER_RADIUS - 24) {
      const factor = (FLORESTA_OUTER_RADIUS - 30) / Math.max(1, sqDist);
      clampedX = Math.round(WORLD_CENTER_X + (clampedX - WORLD_CENTER_X) * factor);
      clampedY = Math.round(WORLD_CENTER_Y + (clampedY - WORLD_CENTER_Y) * factor);
    }

    const free = getCollisionSystem(this.scene).snapToFree(clampedX, clampedY);
    this.targetX = free.x;
    this.targetY = free.y;
  }

  public setStamina(value: number): void {
    this.stamina = Phaser.Math.Clamp(value, 0, this.maxStamina);
  }

  public getStaminaRatio(): number {
    return this.stamina / this.maxStamina;
  }

  public boostStaminaPercent(percent: number): void {
    this.stamina = Math.min(this.maxStamina, this.stamina + (this.maxStamina * percent) / 100);
  }

  public applyEquipmentBoost(durationMs = 15000): void {
    this.equipmentBoostUntil = this.scene.time.now + durationMs;
    this.stamina = this.maxStamina;
  }

  public hasEquipmentBoost(): boolean {
    return this.scene.time.now < this.equipmentBoostUntil;
  }

  public isMoving(): boolean {
    return getIsoDistance(this.x, this.y, this.targetX, this.targetY) > 6;
  }

  public abstract isImmuneToSmoke(): boolean;

  protected moveStep(deltaMs: number, smokeLevelAtPos: number): void {
    const dist = getIsoDistance(this.x, this.y, this.targetX, this.targetY);
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

    // Movimento no plano do solo, contornando obstáculos (casas, prefeitura, árvores e roçados)
    const prevX = this.x;
    const next = getCollisionSystem(this.scene).navigate(
      this.x,
      this.y,
      this.targetX,
      this.targetY,
      this.navRoute,
      speed * dtSec
    );
    this.x = next.x;
    this.y = next.y;

    // Flip horizontal em 3/4 conforme direção do deslocamento
    if (Math.abs(this.x - prevX) > 0.05) {
      this.sprite.setFlipX(this.x < prevX);
    }

    const yDepth = 20 + Math.floor(this.y);
    this.sprite.setPosition(this.x, this.y).setDepth(yDepth);
    this.shadowSprite.setPosition(this.x, this.y);
    this.statusBar.setDepth(yDepth + 1);
    this.hitZone.setPosition(this.x, this.y).setDepth(yDepth + 15);
  }

  protected drawOverlays(): void {
    // Os Graphics seguem a posição da unidade; só são redesenhados quando a aparência muda
    this.selectionRing.setPosition(this.x, this.y);
    this.statusBar.setPosition(this.x, this.y);

    const w = 24;
    const h = 3;
    const ratio = Phaser.Math.Clamp(this.stamina / this.maxStamina, 0, 1);
    const barPx = Math.round(w * ratio);
    const ringMode = this.isFollowed ? 0 : this.hasEquipmentBoost() ? 1 : 2;
    const barColorMode = ratio > 0.35 ? 0 : 1;
    const key = ((ringMode * 2 + barColorMode) * 100 + barPx) * 2 + (this.unitType === UnitType.GUARDA_FLORESTAL ? 1 : 0);
    if (key === this.overlayKey) return;
    this.overlayKey = key;

    this.selectionRing.clear();
    if (this.isFollowed) {
      // Destaque dourado e branco pulsante indicando que a câmera está acompanhando esta unidade
      this.selectionRing.lineStyle(2.5, 0xfacc15, 1.0);
      this.selectionRing.strokeEllipse(0, 0, 34, 17, 24);
      this.selectionRing.lineStyle(1.5, 0xffffff, 0.9);
      this.selectionRing.strokeEllipse(0, 0, 40, 20, 24);
    } else if (this.hasEquipmentBoost()) {
      this.selectionRing.lineStyle(2, 0xfacc15, 0.9);
      this.selectionRing.strokeEllipse(0, 0, 30, 15, 24);
    } else {
      this.selectionRing.lineStyle(
        1.5,
        this.unitType === UnitType.GUARDA_FLORESTAL ? 0x10b981 : 0x38bdf8,
        0.55
      );
      this.selectionRing.strokeEllipse(0, 0, 26, 13, 24);
    }

    this.statusBar.clear();
    const barY = -this.statusBarOffsetY;
    this.statusBar.fillStyle(0x090d0a, 0.85);
    this.statusBar.fillRect(-w / 2, barY, w, h);
    const color = ratio > 0.35 ? 0x38bdf8 : 0xf59e0b;
    this.statusBar.fillStyle(color, 1);
    this.statusBar.fillRect(-w / 2, barY, w * ratio, h);
  }


  public destroy(): void {
    this.hitZone.destroy();
    this.sprite.destroy();
    this.shadowSprite.destroy();
    this.selectionRing.destroy();
    this.statusBar.destroy();
  }
}
