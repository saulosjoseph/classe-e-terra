import sharp from 'sharp';

// Uso: node scripts/create_incendiario_spritesheet.js [caminho-da-imagem]
const inputPath = process.argv[2] ?? 'incendiario.jpg';
const outputPath = 'public/assets/incendiario.png';

const image = sharp(inputPath);
const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });

function isGreenBg(r, g, b) {
  if (g > 60 && g > r + 16 && g > b + 25 && r < 105 && b < 85) {
    return true;
  }
  const dGreen = Math.sqrt((r - 55) ** 2 + (g - 102) ** 2 + (b - 30) ** 2);
  return dGreen < 38;
}

// Caixas [x0, y0, x1, y1] em coordenadas da imagem original (1376x768)
// Frame 0: parado de frente. Frames 1-5: ciclo de caminhada (frame 1 da linha 2 descartado por sobreposição da tocha)
const frameDefs = [
  { name: 'idle', box: [45, 20, 198, 250] },
  { name: 'walk_0', box: [40, 265, 200, 500] },
  { name: 'walk_2', box: [362, 265, 525, 500] },
  { name: 'walk_3', box: [525, 265, 637, 500] },
  { name: 'walk_4', box: [685, 265, 835, 500] },
  { name: 'walk_5', box: [850, 265, 1005, 500] }
];

// Os pés (centro-inferior da silhueta) são alinhados ao mesmo ponto em todos os frames
const HI_SIZE = 512;
const HI_FEET_X = 256;
const HI_FEET_Y = 448;

const TARGET_CELL = 128;
const COLS = frameDefs.length;
const ROWS = 1;
const SHEET_W = COLS * TARGET_CELL;
const SHEET_H = ROWS * TARGET_CELL;

const sheetBuf = Buffer.alloc(SHEET_W * SHEET_H * 4, 0);

for (let idx = 0; idx < frameDefs.length; idx++) {
  const [x0, y0, x1, y1] = frameDefs[idx].box;

  let minX = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (let sy = y0; sy <= y1; sy++) {
    for (let sx = x0; sx <= x1; sx++) {
      const i = (sy * info.width + sx) * 3;
      if (!isGreenBg(data[i], data[i + 1], data[i + 2])) {
        if (sx < minX) minX = sx;
        if (sx > maxX) maxX = sx;
        if (sy > maxY) maxY = sy;
      }
    }
  }
  const anchorX = (minX + maxX) / 2;
  const anchorY = maxY;

  const hiFrame = Buffer.alloc(HI_SIZE * HI_SIZE * 4, 0);
  for (let sy = y0; sy <= y1; sy++) {
    const targetY = Math.round(HI_FEET_Y + (sy - anchorY));
    if (targetY < 0 || targetY >= HI_SIZE) continue;

    for (let sx = x0; sx <= x1; sx++) {
      const targetX = Math.round(HI_FEET_X + (sx - anchorX));
      if (targetX < 0 || targetX >= HI_SIZE) continue;

      const srcIdx = (sy * info.width + sx) * 3;
      const r = data[srcIdx];
      const g = data[srcIdx + 1];
      const b = data[srcIdx + 2];

      if (!isGreenBg(r, g, b)) {
        const destIdx = (targetY * HI_SIZE + targetX) * 4;
        hiFrame[destIdx] = r;
        hiFrame[destIdx + 1] = g;
        hiFrame[destIdx + 2] = b;
        hiFrame[destIdx + 3] = 255;
      }
    }
  }

  // Remove a franja esverdeada que sobra nas bordas
  for (let py = 1; py < HI_SIZE - 1; py++) {
    for (let px = 1; px < HI_SIZE - 1; px++) {
      const destIdx = (py * HI_SIZE + px) * 4;
      if (hiFrame[destIdx + 3] === 255) {
        const r = hiFrame[destIdx];
        const g = hiFrame[destIdx + 1];
        const b = hiFrame[destIdx + 2];
        if (g > r + 15 && g > b + 20) {
          hiFrame[destIdx + 1] = Math.min(g, Math.max(r, b) + 5);
        }
      }
    }
  }

  const resized = await sharp(hiFrame, {
    raw: { width: HI_SIZE, height: HI_SIZE, channels: 4 }
  })
    .resize(TARGET_CELL, TARGET_CELL, {
      kernel: sharp.kernel.lanczos3
    })
    .raw()
    .toBuffer({ resolveWithObject: true });

  const startX = (idx % COLS) * TARGET_CELL;
  const startY = Math.floor(idx / COLS) * TARGET_CELL;

  for (let cy = 0; cy < TARGET_CELL; cy++) {
    for (let cx = 0; cx < TARGET_CELL; cx++) {
      const srcI = (cy * TARGET_CELL + cx) * 4;
      const destI = ((startY + cy) * SHEET_W + (startX + cx)) * 4;
      sheetBuf[destI] = resized.data[srcI];
      sheetBuf[destI + 1] = resized.data[srcI + 1];
      sheetBuf[destI + 2] = resized.data[srcI + 2];
      sheetBuf[destI + 3] = resized.data[srcI + 3];
    }
  }
}

await sharp(sheetBuf, {
  raw: { width: SHEET_W, height: SHEET_H, channels: 4 }
})
  .png({ compressionLevel: 9 })
  .toFile(outputPath);

console.log(`Spritesheet gerado em ${outputPath}: ${SHEET_W}x${SHEET_H}`);
