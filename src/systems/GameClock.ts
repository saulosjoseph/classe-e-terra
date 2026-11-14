import Phaser from 'phaser';

/**
 * Tempo de jogo em milissegundos. Avança pelo delta já multiplicado pela velocidade escolhida,
 * então cooldowns e durações acompanham a simulação (e param enquanto o jogo está pausado).
 */
export class GameClock {
  private nowMs = 0;

  public advance(deltaMs: number): void {
    this.nowMs += deltaMs;
  }

  public now(): number {
    return this.nowMs;
  }

  public reset(): void {
    this.nowMs = 0;
  }
}

const REGISTRY_KEY = 'gameClock';

export function registerGameClock(scene: Phaser.Scene, clock: GameClock): void {
  scene.registry.set(REGISTRY_KEY, clock);
}

export function getGameClock(scene: Phaser.Scene): GameClock {
  const clock = scene.registry.get(REGISTRY_KEY) as GameClock | undefined;
  if (!clock) {
    throw new Error('GameClock não registrado na cena');
  }
  return clock;
}
