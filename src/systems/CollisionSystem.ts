import Phaser from 'phaser';
import {
  COLLISION,
  ISO_INVERSE_Y_RATIO,
  ISO_Y_RATIO,
  WORLD_HEIGHT,
  WORLD_WIDTH,
  getIsoDistance
} from '../config/GameBalance';

export interface Point {
  x: number;
  y: number;
}

/** Rota calculada por A* até um alvo; reaproveitada enquanto o alvo não sair do lugar */
export interface NavRoute {
  goalX: number;
  goalY: number;
  computed: boolean;
  points: Point[];
}

export function createNavRoute(): NavRoute {
  return { goalX: 0, goalY: 0, computed: false, points: [] };
}

const REGISTRY_KEY = 'collision';
const CELL = COLLISION.CELL_SIZE;
const CELLS_X = Math.ceil(WORLD_WIDTH / CELL);
const CELLS_Y = Math.ceil(WORLD_HEIGHT / CELL);
const LINE_SAMPLE_STEP = 2;
const ROUTE_REFRESH_DIST = 12;
const WAYPOINT_REACH_DIST = 4;
const SEARCH_RING_LIMIT = 40;
const MAX_SEARCH_NODES = 20000;
const NEIGHBOURS: [number, number][] = [
  [1, 0], [-1, 0], [0, 1], [0, -1],
  [1, 1], [1, -1], [-1, 1], [-1, -1]
];

interface Obstacle {
  cells: number[];
  active: boolean;
}

/**
 * Colisão no plano do solo isométrico.
 * Obstáculos ocupam células de uma grade (com a folga de AGENT_CLEARANCE já aplicada),
 * e o movimento de personagens e carros consulta essa grade. Quem encontra um obstáculo
 * segue uma rota A* que contorna a área bloqueada.
 */
export class CollisionSystem {
  private counts = new Uint16Array(CELLS_X * CELLS_Y);
  private obstacles = new Map<string, Obstacle>();
  private nextId = 1;

  public addObstacle(x: number, y: number, radius: number): string {
    const id = `obs_${this.nextId++}`;
    const cells = this.rasterize(x, y, radius + COLLISION.AGENT_CLEARANCE);
    this.obstacles.set(id, { cells, active: true });
    this.applyCells(cells, 1);
    return id;
  }

  public setObstacleActive(id: string, active: boolean): void {
    const obstacle = this.obstacles.get(id);
    if (!obstacle || obstacle.active === active) return;
    obstacle.active = active;
    this.applyCells(obstacle.cells, active ? 1 : -1);
  }

  public isBlocked(x: number, y: number): boolean {
    const i = Math.floor(x / CELL);
    const j = Math.floor(y / CELL);
    if (i < 0 || j < 0 || i >= CELLS_X || j >= CELLS_Y) return true;
    return this.counts[j * CELLS_X + i] > 0;
  }

  /** Ponto livre mais próximo de (x, y), ou null se não houver nenhum por perto */
  public nearestFreePoint(x: number, y: number): Point | null {
    if (!this.isBlocked(x, y)) return { x, y };
    const ci = this.clampI(Math.floor(x / CELL));
    const cj = this.clampJ(Math.floor(y / CELL));
    for (let r = 1; r <= SEARCH_RING_LIMIT; r++) {
      let best: Point | null = null;
      let bestDist = Infinity;
      for (let dj = -r; dj <= r; dj++) {
        for (let di = -r; di <= r; di++) {
          if (Math.max(Math.abs(di), Math.abs(dj)) !== r) continue;
          const i = ci + di;
          const j = cj + dj;
          if (i < 0 || j < 0 || i >= CELLS_X || j >= CELLS_Y) continue;
          if (this.counts[j * CELLS_X + i] > 0) continue;
          const p = { x: (i + 0.5) * CELL, y: (j + 0.5) * CELL };
          const d = getIsoDistance(x, y, p.x, p.y);
          if (d < bestDist) {
            bestDist = d;
            best = p;
          }
        }
      }
      if (best) return best;
    }
    return null;
  }

  /** Igual a nearestFreePoint, mas devolve o próprio ponto se nada livre for encontrado */
  public snapToFree(x: number, y: number): Point {
    return this.nearestFreePoint(x, y) ?? { x, y };
  }

  /**
   * Avança até stepLen no plano do solo em direção ao alvo, sem atravessar obstáculos.
   * Mantém a rota em route; quem já está dentro de um obstáculo pode sair dele.
   */
  public navigate(
    x: number,
    y: number,
    goalX: number,
    goalY: number,
    route: NavRoute,
    stepLen: number
  ): Point {
    let wx = goalX;
    let wy = goalY;

    if (this.hasLineOfSight(x, y, goalX, goalY)) {
      route.points.length = 0;
      route.computed = false;
    } else {
      const goalMoved =
        !route.computed ||
        getIsoDistance(route.goalX, route.goalY, goalX, goalY) > ROUTE_REFRESH_DIST;
      if (goalMoved) {
        route.points = this.findPath(x, y, goalX, goalY) ?? [];
        route.goalX = goalX;
        route.goalY = goalY;
        route.computed = true;
      }
      while (
        route.points.length > 0 &&
        getIsoDistance(x, y, route.points[0].x, route.points[0].y) <= WAYPOINT_REACH_DIST
      ) {
        route.points.shift();
      }
      if (route.points.length > 0) {
        wx = route.points[0].x;
        wy = route.points[0].y;
      }
    }

    const dist = getIsoDistance(x, y, wx, wy);
    if (dist <= 0) return { x, y };
    const s = Math.min(stepLen, dist);
    const angle = Math.atan2((wy - y) * ISO_INVERSE_Y_RATIO, wx - x);
    const nx = x + Math.cos(angle) * s;
    const ny = y + Math.sin(angle) * s * ISO_Y_RATIO;

    if (this.isBlocked(nx, ny) && !this.isBlocked(x, y)) {
      // Passo caiu num obstáculo não previsto pela rota: descarta esse waypoint e tenta o próximo quadro
      if (route.points.length > 0) route.points.shift();
      return { x, y };
    }
    return { x: nx, y: ny };
  }

  private hasLineOfSight(x1: number, y1: number, x2: number, y2: number): boolean {
    const n = Math.max(1, Math.ceil(getIsoDistance(x1, y1, x2, y2) / LINE_SAMPLE_STEP));
    for (let k = 0; k <= n; k++) {
      const t = k / n;
      if (this.isBlocked(x1 + (x2 - x1) * t, y1 + (y2 - y1) * t)) return false;
    }
    return true;
  }

  private findPath(sx: number, sy: number, gx: number, gy: number): Point[] | null {
    const start = this.nearestFreePoint(sx, sy);
    const goal = this.nearestFreePoint(gx, gy);
    if (!start || !goal) return null;

    const goalI = this.clampI(Math.floor(goal.x / CELL));
    const goalJ = this.clampJ(Math.floor(goal.y / CELL));
    const startI = this.clampI(Math.floor(start.x / CELL));
    const startJ = this.clampJ(Math.floor(start.y / CELL));
    const startIdx = startJ * CELLS_X + startI;
    const goalIdx = goalJ * CELLS_X + goalI;

    const heuristic = (i: number, j: number): number => {
      const dx = Math.abs(i - goalI);
      const dy = Math.abs(j - goalJ);
      return Math.max(dx, dy) + (SQRT2_MINUS_ONE * Math.min(dx, dy));
    };

    const gScore = new Map<number, number>([[startIdx, 0]]);
    const parent = new Map<number, number>();
    const closed = new Set<number>();
    const open = new MinHeap();
    open.push(startIdx, heuristic(startI, startJ));

    let expanded = 0;
    while (open.size > 0) {
      const current = open.pop();
      if (current === goalIdx) {
        return this.buildPath(current, startIdx, parent, goal);
      }
      if (closed.has(current)) continue;
      closed.add(current);
      if (++expanded > MAX_SEARCH_NODES) return null;

      const ci = current % CELLS_X;
      const cj = Math.floor(current / CELLS_X);
      const g = gScore.get(current) ?? 0;

      for (const [di, dj] of NEIGHBOURS) {
        const ni = ci + di;
        const nj = cj + dj;
        if (ni < 0 || nj < 0 || ni >= CELLS_X || nj >= CELLS_Y) continue;
        const nIdx = nj * CELLS_X + ni;
        if (this.counts[nIdx] > 0 || closed.has(nIdx)) continue;
        // Não cortar a quina de dois obstáculos na diagonal
        if (di !== 0 && dj !== 0) {
          if (this.counts[cj * CELLS_X + ni] > 0 || this.counts[nj * CELLS_X + ci] > 0) continue;
        }
        const tentative = g + (di !== 0 && dj !== 0 ? Math.SQRT2 : 1);
        if (tentative < (gScore.get(nIdx) ?? Infinity)) {
          gScore.set(nIdx, tentative);
          parent.set(nIdx, current);
          open.push(nIdx, tentative + heuristic(ni, nj));
        }
      }
    }
    return null;
  }

  private buildPath(
    goalIdx: number,
    startIdx: number,
    parent: Map<number, number>,
    goal: Point
  ): Point[] {
    const points: Point[] = [];
    let idx = goalIdx;
    while (idx !== startIdx) {
      const i = idx % CELLS_X;
      const j = Math.floor(idx / CELLS_X);
      points.push({ x: (i + 0.5) * CELL, y: (j + 0.5) * CELL });
      const prev = parent.get(idx);
      if (prev === undefined) break;
      idx = prev;
    }
    points.reverse();
    if (points.length > 0) points[points.length - 1] = { x: goal.x, y: goal.y };
    return points;
  }

  private rasterize(x: number, y: number, radius: number): number[] {
    const cells: number[] = [];
    const minI = this.clampI(Math.floor((x - radius) / CELL));
    const maxI = this.clampI(Math.floor((x + radius) / CELL));
    const ry = radius * ISO_Y_RATIO;
    const minJ = this.clampJ(Math.floor((y - ry) / CELL));
    const maxJ = this.clampJ(Math.floor((y + ry) / CELL));
    for (let j = minJ; j <= maxJ; j++) {
      for (let i = minI; i <= maxI; i++) {
        const cx = (i + 0.5) * CELL;
        const cy = (j + 0.5) * CELL;
        if (getIsoDistance(cx, cy, x, y) <= radius) {
          cells.push(j * CELLS_X + i);
        }
      }
    }
    return cells;
  }

  private applyCells(cells: number[], delta: number): void {
    for (const idx of cells) {
      this.counts[idx] += delta;
    }
  }

  private clampI(i: number): number {
    return Math.min(CELLS_X - 1, Math.max(0, i));
  }

  private clampJ(j: number): number {
    return Math.min(CELLS_Y - 1, Math.max(0, j));
  }
}

const SQRT2_MINUS_ONE = Math.SQRT2 - 1;

/** Heap mínimo simples para a fila de prioridade do A* */
class MinHeap {
  private keys: number[] = [];
  private values: number[] = [];

  public get size(): number {
    return this.values.length;
  }

  public push(value: number, key: number): void {
    this.keys.push(key);
    this.values.push(value);
    let i = this.values.length - 1;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (this.keys[parent] <= this.keys[i]) break;
      this.swap(i, parent);
      i = parent;
    }
  }

  public pop(): number {
    const top = this.values[0];
    const lastKey = this.keys.pop() as number;
    const lastValue = this.values.pop() as number;
    if (this.values.length > 0) {
      this.keys[0] = lastKey;
      this.values[0] = lastValue;
      let i = 0;
      const n = this.values.length;
      for (;;) {
        const l = 2 * i + 1;
        const r = l + 1;
        let smallest = i;
        if (l < n && this.keys[l] < this.keys[smallest]) smallest = l;
        if (r < n && this.keys[r] < this.keys[smallest]) smallest = r;
        if (smallest === i) break;
        this.swap(i, smallest);
        i = smallest;
      }
    }
    return top;
  }

  private swap(a: number, b: number): void {
    [this.keys[a], this.keys[b]] = [this.keys[b], this.keys[a]];
    [this.values[a], this.values[b]] = [this.values[b], this.values[a]];
  }
}

export function registerCollisionSystem(scene: Phaser.Scene, system: CollisionSystem): void {
  scene.registry.set(REGISTRY_KEY, system);
}

export function getCollisionSystem(scene: Phaser.Scene): CollisionSystem {
  const system = scene.registry.get(REGISTRY_KEY) as CollisionSystem | undefined;
  if (!system) {
    throw new Error('CollisionSystem não registrado na cena');
  }
  return system;
}
