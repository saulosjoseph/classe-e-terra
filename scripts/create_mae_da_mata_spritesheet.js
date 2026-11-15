import sharp from 'sharp';

const inputPath = process.argv[2];
if (!inputPath) {
  console.error('Uso: node scripts/create_mae_da_mata_spritesheet.js <caminho/da/referencia.jpg>');
  process.exit(1);
}
const outputPath = 'public/assets/mae_da_mata.png';

// Caixas [x0, y0, x1, y1] e pés [x, y] de cada frame na imagem de referência, em ordem:
// linha 1 caminhada (0-5), linha 2 ação (6 espalhando luz, 7 jogando água, 8 plantando)
const frameDefs = [
  { box: [68, 39, 215, 327], feet: [141, 322] },
  { box: [283, 39, 430, 331], feet: [356, 326] },
  { box: [500, 39, 639, 327], feet: [569, 322] },
  { box: [724, 39, 869, 327], feet: [796, 322] },
  { box: [939, 38, 1080, 327], feet: [1009, 322] },
  { box: [1151, 39, 1290, 327], feet: [1220, 322] },
  { box: [121, 438, 472, 734], feet: [230, 655], cellX: 50 },
  { box: [517, 363, 870, 734], feet: [580, 668], cellX: 40 },
  { box: [922, 363, 1243, 733], feet: [990, 652], cellX: 40 }
];

const CELL = 160;
const COLS = 5;
const ROWS = 2;
const SCALE = 0.45;
const FEET_X = 80;
const FEET_Y = 150;
const SHEET_W = COLS * CELL;
const SHEET_H = ROWS * CELL;

function isGreenBg(r, g, b) {
  if (g > 60 && g > r + 16 && g > b + 25 && r < 105 && b < 85) {
    return true;
  }
  // Linhas de chão verde-claras que dividem as fileiras da referência
  if (g > 125 && g > r + 25 && g > b + 40) {
    return true;
  }
  return Math.sqrt((r - 55) ** 2 + (g - 102) ** 2 + (b - 30) ** 2) < 38;
}

async function generateMaeDaMataSpritesheet() {
  const { data, info } = await sharp(inputPath).raw().toBuffer({ resolveWithObject: true });
  const sheetBuf = Buffer.alloc(SHEET_W * SHEET_H * 4, 0);

  for (let idx = 0; idx < frameDefs.length; idx++) {
    const f = frameDefs[idx];
    const [x0, y0, x1, y1] = f.box;
    const w = x1 - x0 + 1;
    const h = y1 - y0 + 1;

    const crop = Buffer.alloc(w * h * 4, 0);
    for (let yy = 0; yy < h; yy++) {
      for (let xx = 0; xx < w; xx++) {
        const srcIdx = ((y0 + yy) * info.width + (x0 + xx)) * 3;
        const r = data[srcIdx];
        const g = data[srcIdx + 1];
        const b = data[srcIdx + 2];
        if (!isGreenBg(r, g, b)) {
          const dstIdx = (yy * w + xx) * 4;
          crop[dstIdx] = r;
          crop[dstIdx + 1] = g;
          crop[dstIdx + 2] = b;
          crop[dstIdx + 3] = 255;
        }
      }
    }

    const scaledW = Math.round(w * SCALE);
    const scaledH = Math.round(h * SCALE);
    const scaled = await sharp(crop, { raw: { width: w, height: h, channels: 4 } })
      .resize(scaledW, scaledH, { kernel: sharp.kernel.lanczos3 })
      .raw()
      .toBuffer();

    // Alinha os pés do frame com a mesma posição na célula, para a animação não tremer
    const cellFeetX = f.cellX ?? FEET_X;
    const offsetX = Math.round(cellFeetX - (f.feet[0] - x0) * SCALE);
    const offsetY = Math.round(FEET_Y - (f.feet[1] - y0) * SCALE);
    const startX = (idx % COLS) * CELL;
    const startY = Math.floor(idx / COLS) * CELL;

    for (let cy = 0; cy < scaledH; cy++) {
      for (let cx = 0; cx < scaledW; cx++) {
        const tx = offsetX + cx;
        const ty = offsetY + cy;
        if (tx < 0 || ty < 0 || tx >= CELL || ty >= CELL) continue;
        const srcI = (cy * scaledW + cx) * 4;
        if (scaled[srcI + 3] === 0) continue;
        const destI = ((startY + ty) * SHEET_W + (startX + tx)) * 4;
        sheetBuf[destI] = scaled[srcI];
        sheetBuf[destI + 1] = scaled[srcI + 1];
        sheetBuf[destI + 2] = scaled[srcI + 2];
        sheetBuf[destI + 3] = scaled[srcI + 3];
      }
    }
  }

  await sharp(sheetBuf, { raw: { width: SHEET_W, height: SHEET_H, channels: 4 } })
    .png({ compressionLevel: 9 })
    .toFile(outputPath);

  console.log(`Spritesheet gerada em ${outputPath}: ${SHEET_W}x${SHEET_H} (células de ${CELL}px)`);
}

generateMaeDaMataSpritesheet().catch((err) => {
  console.error('Erro ao gerar spritesheet:', err);
  process.exit(1);
});
