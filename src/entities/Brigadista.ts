import Phaser from 'phaser';
import {
  CAMPO_RADIUS,
  FLORESTA_OUTER_RADIUS,
  WORLD_CENTER_X,
  WORLD_CENTER_Y
} from '../config/GameBalance';
import { ActiveFireInstance, FireSmokeSystem } from '../systems/FireSmokeSystem';
import { SectorType, UnitType } from '../types/GameTypes';
import { BossFortress } from './BossFortress';
import { Incendiario } from './Incendiario';
import { Unit } from './Unit';

/**
 * Brigada Voluntária (Fase 1: isolada na Floresta, cansa rápido)
 * Evolui aos 20% de Consciência para Brigadista Comunitário (atua nos 3 setores).
 * Totalmente autônomo: busca focos de fogo, incendiários ou a Fortaleza do Burguês por conta própria!
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
      isComunitario ? 'unit_brigadista' : 'unit_voluntario',
      x,
      y
    );
    this.unitIndex = unitIndex;
    this.applyRoleStats(isComunitario);
  }

  public evolveToComunitario(): void {
    if (this.unitType === UnitType.BRIGADISTA_COMUNITARIO) return;
    this.unitType = UnitType.BRIGADISTA_COMUNITARIO;
    this.sprite.setTexture('unit_brigadista');
    this.applyRoleStats(true);
    this.stamina = this.maxStamina;
  }

  private applyRoleStats(isComunitario: boolean): void {
    if (isComunitario) {
      this.baseSpeed = 132;
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
    arsonists: Incendiario[],
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
        const d = Phaser.Math.Distance.Between(this.x, this.y, fire.data.x, fire.data.y);
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
        boss.x + Math.cos(angleOffset) * 32,
        boss.y + Math.sin(angleOffset) * 32
      );
    } else {
      // 3. Se não há fogo, verifica se há algum incendiário próximo para interceptar ou faz ronda preventiva
      let closestArsonist: Incendiario | null = null;
      let minArsonistDist = Infinity;
      for (const a of arsonists) {
        if (!a.isAlive()) continue;
        const distCenter = Phaser.Math.Distance.Between(a.x, a.y, WORLD_CENTER_X, WORLD_CENTER_Y);
        if (this.unitType === UnitType.BRIGADA_VOLUNTARIA && distCenter < CAMPO_RADIUS) {
          continue;
        }
        const d = Phaser.Math.Distance.Between(this.x, this.y, a.x, a.y);
        if (d < minArsonistDist) {
          minArsonistDist = d;
          closestArsonist = a;
        }
      }

      if (closestArsonist) {
        this.setCommandTarget(closestArsonist.x, closestArsonist.y);
      } else if (!this.isMoving()) {
        // Ronda circular automática pelo setor
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
          WORLD_CENTER_Y + Math.sin(this.patrolAngle) * patrolRadius
        );
      }
    }

    this.moveStep(deltaMs, smokeAtPos);

    // Combate automático ao fogo quando encosta no foco
    if (targetFire && nearestDist <= 42) {
      const fatigueFactor = this.stamina > 18 ? 1.0 : 0.45;
      const boostFactor = this.hasEquipmentBoost() ? 1.55 : 1.0;
      const power = this.extinguishPower * fatigueFactor * boostFactor * dtSec;
      fireSystem.extinguishFire(targetFire.data.id, power);

      const drainRate = this.unitType === UnitType.BRIGADA_VOLUNTARIA ? 13 : 5;
      this.stamina = Math.max(5, this.stamina - drainRate * dtSec);
    } else {
      const regenRate = smokeAtPos >= 3 ? 5 : 18;
      this.stamina = Math.min(this.maxStamina, this.stamina + regenRate * dtSec);
    }

    // Fase 6: Se estiver cercando a Fortaleza do Burguês, causa dano contínuo
    if (boss && boss.isActive()) {
      const distBoss = Phaser.Math.Distance.Between(this.x, this.y, boss.x, boss.y);
      if (distBoss <= 62) {
        boss.takeDamage(12 * dtSec);
      }
    }

    this.drawOverlays();
  }
}
