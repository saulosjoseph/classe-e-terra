import sharp from 'sharp';

// Uso: node scripts/create_brigada_comunitaria_spritesheet.js [caminho/da/referencia.jpg]
const inputPath = process.argv[2] ?? 'brigada-comunitaria.jpg';
const outputPath = 'public/assets/brigada_comunitaria.png';

function isGreenBg(r, g, b) {
  if (g > 60 && g > r + 16 && g > b + 25 && r < 105 && b < 85) {
    return true;
  }
  const dGreen = Math.sqrt((r - 55) ** 2 + (g - 102) ** 2 + (b - 30) ** 2);
  return dGreen < 38;
}

// Recortes [x0, y0, x1, y1] na imagem de referência de 1376x768
const frameDefs = [
  // Frame 0: Idle, carro parado com o motorista na janela
  { name: 'idle', box: [1020, 525, 1335, 745] },

  // Frames 1-6: Deslocamento, carro em movimento com poeira (vistas laterais)
  { name: 'drive_0', box: [975, 50, 1330, 170] },
  { name: 'drive_1', box: [975, 195, 1330, 310] },
  { name: 'drive_2', box: [975, 50, 1330, 170] },
  { name: 'drive_3', box: [975, 195, 1330, 310] },
  { name: 'drive_4', box: [975, 50, 1330, 170] },
  { name: 'drive_5', box: [975, 195, 1330, 310] },

  // Frames 7-11: Combate, motorista descendo para apagar o fogo
  { name: 'fight_0', box: [55, 525, 375, 745] },
  { name: 'fight_1', box: [400, 525, 710, 745] },
  { name: 'fight_2', box: [710, 525, 1020, 745] },
  { name: 'fight_3', box: [400, 525, 710, 745] },
  { name: 'fight_4', box: [55, 525, 375, 745] }
];

const TARGET_CELL = 128;
const COLS = 6;
const ROWS = 2;
const SHEET_W = COLS * TARGET_CELL;
const SHEET_H = ROWS * TARGET_CELL;
// Área máxima do veículo dentro da célula, com a base centralizada na parte inferior
const MAX_W = 124;
const MAX_H = 112;
const BASE_Y = 120;

async function extractFrame(box) {
  const [x0, y0, x1, y1] = box;
  const { data, info } = await sharp(inputPath)
    .extract({ left: x0, top: y0, width: x1 - x0, height: y1 - y0 })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  for (let i = 0; i < data.length; i += 4) {
    if (isGreenBg(data[i], data[i + 1], data[i + 2])) {
      data[i + 3] = 0;
    }
  }

  return sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
    .trim()
    .toBuffer({ resolveWithObject: true });
}

async function generateBrigadaComunitariaSpritesheet() {
  const sheetBuf = Buffer.alloc(SHEET_W * SHEET_H * 4, 0);

  for (let idx = 0; idx < frameDefs.length; idx++) {
    const f = frameDefs[idx];
    const { data, info } = await extractFrame(f.box);

    const scale = Math.min(MAX_W / info.width, MAX_H / info.height);
    const w = Math.max(1, Math.round(info.width * scale));
    const h = Math.max(1, Math.round(info.height * scale));

    const resized = await sharp(data, {
      raw: { width: info.width, height: info.height, channels: 4 }
    })
      .resize(w, h, { kernel: sharp.kernel.lanczos3 })
      .raw()
      .toBuffer({ resolveWithObject: true });

    const cellX = (idx % COLS) * TARGET_CELL;
    const cellY = Math.floor(idx / COLS) * TARGET_CELL;
    const offsetX = cellX + Math.floor((TARGET_CELL - w) / 2);
    const offsetY = cellY + BASE_Y - h;

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const srcI = (y * w + x) * 4;
        if (resized.data[srcI + 3] === 0) continue;
        const destI = ((offsetY + y) * SHEET_W + (offsetX + x)) * 4;
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

  console.log(`Spritesheet gerada em ${outputPath}: ${SHEET_W}x${SHEET_H}`);
}

generateBrigadaComunitariaSpritesheet().catch((err) => {
  console.error('Erro ao gerar spritesheet:', err);
  process.exit(1);
});
