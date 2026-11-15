import Phaser from 'phaser';
import { BALANCE, getIsoDistance } from '../config/GameBalance';
import { BossFortress } from './BossFortress';
import { FireSmokeSystem } from '../systems/FireSmokeSystem';
import { UnitType } from '../types/GameTypes';
import { Incendiario } from './Incendiario';
import { Unit } from './Unit';

type CurupiraActivity = 'none' | 'fire' | 'boss' | 'capture';

/**
 * Chamado pelas aldeias: age sozinho, não cansa. Prioridades: laçar e capturar incendiários,
 * apagar focos e atacar o Burguês.
 */
export class Curupira extends Unit {
  /** Instante (no GameClock) em que o encantado deixa a partida */
  public readonly expiresAt: number;
  private activity: CurupiraActivity = 'none';

  constructor(scene: Phaser.Scene, id: string, x: number, y: number, expiresAt: number) {
    super(scene, id, UnitType.CURUPIRA, 'curupira', x, y);
    this.expiresAt = expiresAt;
    this.baseSpeed = BALANCE.CURUPIRA.SPEED;
    this.sprite.setScale(0.58);
    this.sprite.setOrigin(0.5, 0.9375);
    this.statusBarOffsetY = 70;
    this.sprite.play('curupira_idle');
  }

  public isImmuneToSmoke(): boolean {
    return false;
  }

  public isWorking(): boolean {
    return this.activity !== 'none';
  }

  public update(
    deltaMs: number,
    fireSystem: FireSmokeSystem,
    boss: BossFortress | null,
    arsonists: Incendiario[],
    onCapture: (arsonist: Incendiario) => void
  ): void {
    const dtSec = deltaMs / 1000;
    const smokeAtPos = fireSystem.getSmokeLevelAtPoint(this.x, this.y);
    const { EXTINGUISH_RANGE, EXTINGUISH_POWER, BOSS_DAMAGE_PER_SEC, LASSO_RANGE } =
      BALANCE.CURUPIRA;

    const fire = fireSystem.findNearestFire(this.x, this.y);
    
    // Incendiários no mapa ordenados por distância
    const availableArsonists = this.getAvailableArsonistsOrderedByDistance(arsonists);
    
    // Verificar se há um incendiário próximo que pode ser capturado com certeza
    const capturableArsonist = this.findCapturableArsonistWhileExtinguishing(
      availableArsonists,
      fire,
      LASSO_RANGE,
      BALANCE.CURUPIRA.SPEED
    );
    
    this.activity = 'none';

    if (capturableArsonist) {
      // Prioridade: laçar e capturar se houver certeza de captura
      this.setCommandTarget(capturableArsonist.x, capturableArsonist.y);
      this.moveStep(deltaMs, smokeAtPos);
      if (getIsoDistance(this.x, this.y, capturableArsonist.x, capturableArsonist.y) <= LASSO_RANGE) {
        this.activity = 'capture';
        this.faceTowards(capturableArsonist.x);
        onCapture(capturableArsonist);
      }
    } else if (fire) {
      // Apagar o foco mais próximo
      this.setCommandTarget(fire.data.x, fire.data.y);
      this.moveStep(deltaMs, smokeAtPos);
      if (getIsoDistance(this.x, this.y, fire.data.x, fire.data.y) <= EXTINGUISH_RANGE) {
        fireSystem.extinguishFire(fire.data.id, EXTINGUISH_POWER * dtSec);
        this.activity = 'fire';
        this.faceTowards(fire.data.x);
      }
    } else if (availableArsonists.length > 0) {
      // Perseguir o incendiário mais próximo (sem fogo prioritário)
      const nearestArsonist = availableArsonists[0];
      this.setCommandTarget(nearestArsonist.x, nearestArsonist.y);
      this.moveStep(deltaMs, smokeAtPos);
      if (getIsoDistance(this.x, this.y, nearestArsonist.x, nearestArsonist.y) <= LASSO_RANGE) {
        this.activity = 'capture';
        this.faceTowards(nearestArsonist.x);
        onCapture(nearestArsonist);
      }
    } else if (boss && boss.isActive()) {
      // Sem focos, ataca a Fortaleza do Burguês
      this.setCommandTarget(boss.x, boss.y);
      this.moveStep(deltaMs, smokeAtPos);
      if (getIsoDistance(this.x, this.y, boss.x, boss.y) <= 72) {
        boss.takeDamage(BOSS_DAMAGE_PER_SEC * dtSec);
        this.activity = 'boss';
        this.faceTowards(boss.x);
      }
    } else {
      // Sem focos, arsonistas nem Burguês, fica parado na aldeia
      this.setCommandTarget(this.x, this.y);
      this.moveStep(deltaMs, smokeAtPos);
    }

    this.updateAnimation();
    this.drawOverlays();
  }

  private faceTowards(targetX: number): void {
    if (Math.abs(targetX - this.x) > 2) {
      this.sprite.setFlipX(targetX < this.x);
    }
  }

  /** Retorna incendiários vivos que ainda estão no mapa, ordenados por distância */
  private getAvailableArsonistsOrderedByDistance(arsonists: Incendiario[]): Incendiario[] {
    const available = arsonists.filter(arsonist => arsonist.isAlive());
    available.sort((a, b) => {
      const distA = getIsoDistance(this.x, this.y, a.x, a.y);
      const distB = getIsoDistance(this.x, this.y, b.x, b.y);
      return distA - distB;
    });
    return available;
  }

  /**
   * Encontra um incendiário que pode ser capturado com certeza enquanto apaga fogo.
   * Retorna o incendiário se:
   * 1. Estiver próximo o suficiente (distância < LASSO_RANGE + margem de segurança)
   * 2. Seu tempo de escape é insuficiente para sair do mapa antes da captura
   * 3. Estiver mais próximo que o fogo atual (se houver)
   */
  private findCapturableArsonistWhileExtinguishing(
    arsonists: Incendiario[],
    currentFire: any, // ActiveFireInstance | null
    lassoRange: number,
    curupiraSpeed: number
  ): Incendiario | null {
    if (arsonists.length === 0) return null;

    const CAPTURE_MARGIN = 50; // Margem de segurança em pixels
    const CAPTURE_CONFIDENCE_DIST = lassoRange + CAPTURE_MARGIN;

    for (const arsonist of arsonists) {
      const distToArsonist = getIsoDistance(this.x, this.y, arsonist.x, arsonist.y);

      // Não está próximo o suficiente
      if (distToArsonist > CAPTURE_CONFIDENCE_DIST) continue;

      // Se há fogo prioritário, apenas interrompe se o incendiário for bem mais próximo
      if (currentFire) {
        const distToFire = getIsoDistance(this.x, this.y, currentFire.data.x, currentFire.data.y);
        // Só interrompe se o incendiário está significativamente mais próximo
        if (distToArsonist > distToFire * 0.7) continue;
      }

      // Se o incendiário já saiu ou está muito próximo da borda, pode ser capturado
      // (Simplificamos: se está próximo, é bom capturar)
      if (distToArsonist < CAPTURE_CONFIDENCE_DIST) {
        return arsonist;
      }
    }

    return null;
  }

  private nearestArsonist(arsonists: Incendiario[]): Incendiario | null {
    let nearest: Incendiario | null = null;
    let nearestDist = Infinity;
    for (const arsonist of arsonists) {
      if (!arsonist.isAlive()) continue;
      const d = getIsoDistance(this.x, this.y, arsonist.x, arsonist.y);
      if (d < nearestDist) {
        nearestDist = d;
        nearest = arsonist;
      }
    }
    return nearest;
  }

  private updateAnimation(): void {
    let key = 'curupira_idle';
    if (this.activity === 'fire' || this.activity === 'boss') {
      key = 'curupira_extinguish';
    } else if (this.activity === 'capture') {
      key = 'curupira_capture';
    } else if (this.isMoving()) {
      key = 'curupira_walk';
    }
    if (this.sprite.anims.currentAnim?.key !== key) {
      this.sprite.play(key, true);
    }
  }
}
