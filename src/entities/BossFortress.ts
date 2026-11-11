import Phaser from 'phaser';
import {
  FLORESTA_OUTER_RADIUS,
  WORLD_CENTER_X,
  WORLD_CENTER_Y
} from '../config/GameBalance';

/**
 * O Burguês (O Chefão Final - Fase 6 aos 100% de Consciência Coletiva):
 * Financiador oculto da destruição que se revela na fronteira externa da Floresta quando a união popular atinge 100%.
 */
export class BossFortress extends Phaser.Events.EventEmitter {
  public readonly x: number;
  public readonly y: number;
  private scene: Phaser.Scene;
  private maxHp: number;
  private hp: number;
  private active = false;
  private defeated = false;
  private sprite: Phaser.GameObjects.Sprite;
  private hpGraphics: Phaser.GameObjects.Graphics;
  private titleText: Phaser.GameObjects.Text;
  private hitZone: Phaser.GameObjects.Zone;
  private waveTimer = 0;

  constructor(scene: Phaser.Scene, maxHp: number) {
    super();
    this.scene = scene;
    this.maxHp = maxHp;
    this.hp = maxHp;
    // Posicionado ao Sul no anel externo da Floresta
    this.x = WORLD_CENTER_X;
    this.y = WORLD_CENTER_Y + FLORESTA_OUTER_RADIUS - 90;

    this.sprite = scene.add
      .sprite(this.x, this.y, 'boss_fortress')
      .setDepth(26)
      .setScale(1.25)
      .setVisible(false);

    this.hpGraphics = scene.add.graphics().setDepth(32).setVisible(false);
    this.titleText = scene.add
      .text(this.x, this.y - 40, '🎩 O BURGUÊS', {
        fontFamily: 'Courier New, monospace',
        fontSize: '12px',
        fontStyle: 'bold',
        color: '#fef08a',
        backgroundColor: '#18181b',
        padding: { x: 4, y: 2 }
      })
      .setOrigin(0.5)
      .setDepth(33)
      .setVisible(false);

    this.hitZone = scene.add
      .zone(this.x, this.y, 76, 76)
      .setInteractive({ useHandCursor: true })
      .setDepth(39);

    this.hitZone.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      if (this.active && !this.defeated && pointer.getDistance() < 12) {
        this.emit('boss-tapped', this);
      }
    });
  }

  public reveal(): void {
    if (this.active) return;
    this.active = true;
    this.sprite.setVisible(true);
    this.hpGraphics.setVisible(true);
    this.titleText.setVisible(true);
    this.drawHealthBar();

    this.scene.tweens.add({
      targets: this.sprite,
      scale: { from: 0.3, to: 1.2 },
      duration: 550,
      ease: 'Back.easeOut'
    });
  }

  public isActive(): boolean {
    return this.active && !this.defeated;
  }

  public isDefeated(): boolean {
    return this.defeated;
  }

  public getHpRatio(): number {
    return Phaser.Math.Clamp(this.hp / this.maxHp, 0, 1);
  }

  public takeDamage(amount: number): void {
    if (!this.active || this.defeated) return;
    this.hp = Math.max(0, this.hp - amount);
    this.drawHealthBar();

    if (this.hp <= 0) {
      this.defeated = true;
      this.emit('boss-defeated');
    }
  }

  public update(deltaMs: number, onBossWave: () => void): void {
    if (!this.isActive()) return;
    this.waveTimer += deltaMs;
    if (this.waveTimer >= 5200) {
      this.waveTimer = 0;
      onBossWave();
    }
  }

  private drawHealthBar(): void {
    this.hpGraphics.clear();
    const w = 80;
    const h = 7;
    const bx = this.x - w / 2;
    const by = this.y - 26;

    this.hpGraphics.fillStyle(0x09090b, 0.92);
    this.hpGraphics.fillRect(bx - 1, by - 1, w + 2, h + 2);

    const ratio = this.getHpRatio();
    this.hpGraphics.fillStyle(0xdc2626, 1);
    this.hpGraphics.fillRect(bx, by, w * ratio, h);
  }
}
