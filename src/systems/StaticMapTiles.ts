import Phaser from 'phaser';

/** Lado de cada bloco do mapa estático, em px do mundo */
const STATIC_TILE_SIZE = 1024;
/** Margem extra ao decidir a visibilidade, cobrindo o atraso de um quadro da câmera */
const CULL_MARGIN = 256;

interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

interface StaticShape {
  bounds: Bounds;
  replay(g: Phaser.GameObjects.Graphics): void;
}

function boundsOfPoints(points: number[], pad: number): Bounds {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (let i = 0; i < points.length; i += 2) {
    minX = Math.min(minX, points[i]);
    maxX = Math.max(maxX, points[i]);
    minY = Math.min(minY, points[i + 1]);
    maxY = Math.max(maxY, points[i + 1]);
  }
  return { minX: minX - pad, minY: minY - pad, maxX: maxX + pad, maxY: maxY + pad };
}

function replayPath(g: Phaser.GameObjects.Graphics, points: number[], closed: boolean): void {
  g.beginPath();
  g.moveTo(points[0], points[1]);
  for (let i = 2; i < points.length; i += 2) {
    g.lineTo(points[i], points[i + 1]);
  }
  if (closed) g.closePath();
}

/**
 * Grava chamadas de desenho com a mesma API de Phaser.GameObjects.Graphics (subconjunto usado
 * no mapa estático), sem renderizar nada. Depois, bakeStaticMapLayers as reproduz em blocos.
 */
export class StaticLayerRecorder {
  private fillColor = 0;
  private fillAlpha = 1;
  private lineWidth = 1;
  private lineColor = 0;
  private lineAlpha = 1;
  private path: number[] = [];
  private closed = false;
  private shapes: StaticShape[] = [];

  public fillStyle(color: number, alpha = 1): void {
    this.fillColor = color;
    this.fillAlpha = alpha;
  }

  public lineStyle(width: number, color: number, alpha = 1): void {
    this.lineWidth = width;
    this.lineColor = color;
    this.lineAlpha = alpha;
  }

  public beginPath(): void {
    this.path = [];
    this.closed = false;
  }

  public moveTo(x: number, y: number): void {
    this.path.push(x, y);
  }

  public lineTo(x: number, y: number): void {
    this.path.push(x, y);
  }

  public closePath(): void {
    this.closed = true;
  }

  public fillPath(): void {
    const points = this.path;
    const closed = this.closed;
    const color = this.fillColor;
    const alpha = this.fillAlpha;
    this.shapes.push({
      bounds: boundsOfPoints(points, 0),
      replay: (g) => {
        g.fillStyle(color, alpha);
        replayPath(g, points, closed);
        g.fillPath();
      }
    });
  }

  public strokePath(): void {
    const points = this.path;
    const closed = this.closed;
    const width = this.lineWidth;
    const color = this.lineColor;
    const alpha = this.lineAlpha;
    this.shapes.push({
      bounds: boundsOfPoints(points, width / 2),
      replay: (g) => {
        g.lineStyle(width, color, alpha);
        replayPath(g, points, closed);
        g.strokePath();
      }
    });
  }

  public fillRect(x: number, y: number, width: number, height: number): void {
    const color = this.fillColor;
    const alpha = this.fillAlpha;
    this.shapes.push({
      bounds: { minX: x, minY: y, maxX: x + width, maxY: y + height },
      replay: (g) => {
        g.fillStyle(color, alpha);
        g.fillRect(x, y, width, height);
      }
    });
  }

  public lineBetween(x1: number, y1: number, x2: number, y2: number): void {
    const width = this.lineWidth;
    const color = this.lineColor;
    const alpha = this.lineAlpha;
    this.shapes.push({
      bounds: boundsOfPoints([x1, y1, x2, y2], width / 2),
      replay: (g) => {
        g.lineStyle(width, color, alpha);
        g.lineBetween(x1, y1, x2, y2);
      }
    });
  }

  public getShapes(): StaticShape[] {
    return this.shapes;
  }
}

interface StaticTile {
  graphics: Phaser.GameObjects.Graphics;
  bounds: Bounds;
}

/** Blocos de Graphics do mapa estático; só os que estão perto da câmera são renderizados */
export class StaticMapTiles {
  private tiles: StaticTile[];

  constructor(tiles: StaticTile[]) {
    this.tiles = tiles;
  }

  public updateVisibility(camera: Phaser.Cameras.Scene2D.Camera): void {
    const view = camera.worldView;
    const left = view.x - CULL_MARGIN;
    const top = view.y - CULL_MARGIN;
    const right = view.x + view.width + CULL_MARGIN;
    const bottom = view.y + view.height + CULL_MARGIN;

    for (const tile of this.tiles) {
      const b = tile.bounds;
      const visible = b.maxX >= left && b.minX <= right && b.maxY >= top && b.minY <= bottom;
      if (tile.graphics.visible !== visible) {
        tile.graphics.setVisible(visible);
      }
    }
  }
}

/**
 * Converte as camadas gravadas em Graphics por bloco. Cada forma vai para um único bloco
 * (pelo centro), então não é desenhada duas vezes; a ordem de criação segue a ordem das camadas.
 */
export function bakeStaticMapLayers(
  scene: Phaser.Scene,
  layers: Array<{ recorder: StaticLayerRecorder; depth: number }>
): StaticMapTiles {
  const tiles: StaticTile[] = [];

  for (const { recorder, depth } of layers) {
    const buckets = new Map<string, { shapes: StaticShape[]; bounds: Bounds }>();

    for (const shape of recorder.getShapes()) {
      const b = shape.bounds;
      const cx = (b.minX + b.maxX) / 2;
      const cy = (b.minY + b.maxY) / 2;
      const key = `${Math.floor(cx / STATIC_TILE_SIZE)},${Math.floor(cy / STATIC_TILE_SIZE)}`;

      let bucket = buckets.get(key);
      if (!bucket) {
        bucket = {
          shapes: [],
          bounds: { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity }
        };
        buckets.set(key, bucket);
      }
      bucket.shapes.push(shape);
      bucket.bounds = {
        minX: Math.min(bucket.bounds.minX, b.minX),
        minY: Math.min(bucket.bounds.minY, b.minY),
        maxX: Math.max(bucket.bounds.maxX, b.maxX),
        maxY: Math.max(bucket.bounds.maxY, b.maxY)
      };
    }

    for (const bucket of buckets.values()) {
      const graphics = scene.add.graphics().setDepth(depth);
      for (const shape of bucket.shapes) {
        shape.replay(graphics);
      }
      tiles.push({ graphics, bounds: bucket.bounds });
    }
  }

  return new StaticMapTiles(tiles);
}
