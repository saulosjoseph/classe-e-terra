import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

// Uso: node scripts/create_trabalhador_rural_c_spritesheet.js <folha.png>
// Recorta os 10 frames da folha de referência (544x594) e monta uma spritesheet horizontal sem fundo verde.
const [SRC] = process.argv.slice(2);
const ASSETS = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public', 'assets');
const OUTPUT = path.join(ASSETS, 'trabalhador_rural_c.png');
const CELL_W = 130;
const CELL_H = 185;

// Centros [x, y0] de cada frame na folha: linha 1 enxada parado, linha 2 caminhada, linha 3 cavar
const FRAMES = [
  [85, 10], [210, 10], [335, 10],
  [82, 205], [205, 205], [333, 205], [455, 205],
  [90, 400], [265, 400], [440, 400]
];

function isGreenBg(r, g, b) {
  return g > 70 && g > r + 25 && g > b + 25;
}

async function main() {
  const { data, info } = await sharp(SRC).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: W, height: H } = info;

  const cells = [];
  for (const [cx, y0] of FRAMES) {
    const left = Math.max(0, cx - CELL_W / 2);
    const top = y0;
    const cell = Buffer.alloc(CELL_W * CELL_H * 4);
    for (let y = 0; y < CELL_H; y++) {
      for (let x = 0; x < CELL_W; x++) {
        const sx = Math.min(W - 1, Math.round(left + x));
        const sy = Math.min(H - 1, top + y);
        const si = (sy * W + sx) * 3;
        const di = (y * CELL_W + x) * 4;
        const r = data[si];
        const g = data[si + 1];
        const b = data[si + 2];
        cell[di] = r;
        cell[di + 1] = g;
        cell[di + 2] = b;
        cell[di + 3] = isGreenBg(r, g, b) ? 0 : 255;
      }
    }
    cells.push(cell);
  }

  const sheetW = CELL_W * FRAMES.length;
  const sheet = Buffer.alloc(sheetW * CELL_H * 4);
  cells.forEach((cell, f) => {
    for (let y = 0; y < CELL_H; y++) {
      cell.copy(sheet, (y * sheetW + f * CELL_W) * 4, y * CELL_W * 4, (y + 1) * CELL_W * 4);
    }
  });

  await sharp(sheet, { raw: { width: sheetW, height: CELL_H, channels: 4 } }).png().toFile(OUTPUT);
  console.log(`Gerado ${OUTPUT} (${sheetW}x${CELL_H}, ${FRAMES.length} frames)`);
}

main();
