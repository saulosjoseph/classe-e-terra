import Phaser from 'phaser';
import {
  CAMPO_RADIUS,
  FLORESTA_OUTER_RADIUS,
  ISO_Y_RATIO,
  WORLD_CENTER_X,
  WORLD_CENTER_Y,
  getIsoDistance
} from '../config/GameBalance';
import { ActiveFireInstance, FireSmokeSystem } from '../systems/FireSmokeSystem';
import { SectorType, UnitType } from '../types/GameTypes';
import { BossFortress } from './BossFortress';
import { Unit } from './Unit';

/**
 * Brigada Voluntária (Fase 1: isolada na Floresta, cansa rápido)
 * Evolui aos 20% de Consciência para Brigadista Comunitário (atua nos 3 setores).
 * Totalmente autônomo: busca e extingue focos de fogo pelo mapa e cerca a Fortaleza do Burguês na Fase 6!
 */
export class Brigadista extends Unit {
  private extinguishPower = 20;
  private unitIndex: number;

  constructor(
    scene: Phaser.Scene,
    id: string,
    x: number,
    y: number,
    isComunitario: boolean,
    unitIndex = 0
  ) {
    super(
      scene,
      id,
      isComunitario ? UnitType.BRIGADISTA_COMUNITARIO : UnitType.BRIGADA_VOLUNTARIA,
      isComunitario ? 'brigada_comunitaria' : 'brigadista_voluntario',
      x,
      y
    );
    this.unitIndex = unitIndex;
    this.applyRoleStats(isComunitario);
    this.setupVisuals(isComunitario);
  }

  private setupVisuals(isComunitario: boolean): void {
    if (!isComunitario) {
      this.sprite.setScale(0.48);
      this.sprite.setOrigin(0.5, 0.875);
      this.statusBarOffsetY = 38;
      if (this.scene.anims.exists('brigadista_voluntario_idle')) {
        this.sprite.play('brigadista_voluntario_idle');
      }
    } else {
      this.applyComunitarioCarVisuals();
      this.sprite.play('comunitaria_idle');
    }
  }

  // Carro pickup: escala e origem na base das rodas, barra de energia acima do teto
  private applyComunitarioCarVisuals(): void {
    this.sprite.setScale(0.8);
    this.sprite.setOrigin(0.5, 0.9375);
    this.statusBarOffsetY = 98;
  }

  public evolveToComunitario(): void {
    if (this.unitType === UnitType.BRIGADISTA_COMUNITARIO) return;
    this.unitType = UnitType.BRIGADISTA_COMUNITARIO;
    this.sprite.stop();
    this.sprite.setTexture('brigada_comunitaria');
    this.applyComunitarioCarVisuals();
    this.sprite.play('comunitaria_idle');
    this.applyRoleStats(true);
    this.stamina = this.maxStamina;
  }

  private applyRoleStats(isComunitario: boolean): void {
    if (isComunitario) {
      this.baseSpeed = 200;
      this.extinguishPower = 36;
      this.maxStamina = 100;
    } else {
      this.baseSpeed = 98;
      this.extinguishPower = 22;
      this.maxStamina = 100;
    }
  }

  public isImmuneToSmoke(): boolean {
    return false;
  }

  public update(
    deltaMs: number,
    fireSystem: FireSmokeSystem,
    boss: BossFortress | null
  ): void {
    const dtSec = deltaMs / 1000;
    const smokeAtPos = fireSystem.getSmokeLevelAtPoint(this.x, this.y);

    // 1. Busca automaticamente qualquer foco de incêndio compatível em todo o mapa!
    const activeFires = fireSystem.getActiveFires().filter((f) => {
      // Na Fase 1, Brigada Voluntária só atua no anel da Floresta
      if (this.unitType === UnitType.BRIGADA_VOLUNTARIA) {
        return f.data.sector === SectorType.FLORESTA;
      }
      return true;
    });

    let targetFire: ActiveFireInstance | null = null;
    let nearestDist = Infinity;

    if (activeFires.length > 0) {
      // Escolhe o foco mais próximo (ou distribui entre brigadistas quando há múltiplos focos)
      for (const fire of activeFires) {
        const d = getIsoDistance(this.x, this.y, fire.data.x, fire.data.y);
        if (d < nearestDist) {
          nearestDist = d;
          targetFire = fire;
        }
      }
    }

    if (targetFire) {
      this.setCommandTarget(targetFire.data.x, targetFire.data.y);
    } else if (boss && boss.isActive()) {
      // 2. Se não há incêndios ativos e o Burguês se revelou, marcha automaticamente para cercar a Fortaleza!
      const angleOffset = (this.unitIndex * 0.9) % (Math.PI * 2);
      this.setCommandTarget(
        boss.x + Math.cos(angleOffset) * 36,
        boss.y + Math.sin(angleOffset) * (36 * ISO_Y_RATIO)
      );
    } else if (!this.isMoving()) {
      // 3. Se não há fogo e o Burguês não está ativo, realiza ronda preventiva contínua pelo setor
      this.patrolAngle += 0.55;
      const patrolRadius =
        this.unitType === UnitType.BRIGADA_VOLUNTARIA
          ? (CAMPO_RADIUS + FLORESTA_OUTER_RADIUS) / 2
          : this.unitIndex % 3 === 0
            ? CAMPO_RADIUS + 110
            : this.unitIndex % 3 === 1
              ? CAMPO_RADIUS - 110
              : 140;
      this.setCommandTarget(
        WORLD_CENTER_X + Math.cos(this.patrolAngle) * patrolRadius,
        WORLD_CENTER_Y + Math.sin(this.patrolAngle) * (patrolRadius * ISO_Y_RATIO)
      );
    }

    this.moveStep(deltaMs, smokeAtPos);

    // Combate automático ao fogo quando encosta no foco
    const isExtinguishing = Boolean(targetFire && nearestDist <= 46);
    if (isExtinguishing && targetFire) {
      const fatigueFactor = this.stamina > 18 ? 1.0 : 0.45;
      const boostFactor = this.hasEquipmentBoost() ? 1.55 : 1.0;
      const power = this.extinguishPower * fatigueFactor * boostFactor * dtSec;
      fireSystem.extinguishFire(targetFire.data.id, power);

      const drainRate = this.unitType === UnitType.BRIGADA_VOLUNTARIA ? 5 : 2;
      this.stamina = Math.max(5, this.stamina - drainRate * dtSec);
    } else {
      const regenRate = smokeAtPos >= 3 ? 0.5 : 1;
      this.stamina = Math.min(this.maxStamina, this.stamina + regenRate * dtSec);
    }

    // Gerencia animações do Brigadista Voluntário (idle, caminhada e combate ao fogo)
    this.updateAnimation(isExtinguishing, targetFire);

    // Fase 6: Se estiver cercando a Fortaleza do Burguês, causa dano contínuo
    if (boss && boss.isActive()) {
      const distBoss = getIsoDistance(this.x, this.y, boss.x, boss.y);
      if (distBoss <= 68) {
        boss.takeDamage(12 * dtSec);
      }
    }

    this.drawOverlays();
  }

  private updateAnimation(isExtinguishing: boolean, targetFire: ActiveFireInstance | null): void {
    const isComunitario = this.unitType === UnitType.BRIGADISTA_COMUNITARIO;
    const prefix = isComunitario ? 'comunitaria' : 'brigadista_voluntario';

    if (isExtinguishing && targetFire) {
      // Direciona o soprador para o foco de incêndio
      if (Math.abs(targetFire.data.x - this.x) > 2) {
        this.sprite.setFlipX(targetFire.data.x < this.x);
      }
      if (this.sprite.anims.currentAnim?.key !== `${prefix}_extinguish`) {
        this.sprite.play(`${prefix}_extinguish`, true);
      }
    } else if (this.isMoving()) {
      if (this.sprite.anims.currentAnim?.key !== `${prefix}_walk`) {
        this.sprite.play(`${prefix}_walk`, true);
      }
    } else {
      if (this.sprite.anims.currentAnim?.key !== `${prefix}_idle`) {
        this.sprite.play(`${prefix}_idle`, true);
      }
    }
  }
}
