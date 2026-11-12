import sharp from 'sharp';

// Uso: node scripts/create_trabalhador_rural_spritesheet.js [caminho/da/referencia.jpg]
const inputPath = process.argv[2] ?? 'trabalhador-zona-rural.jpg';
const REF_W = 1376;
const REF_H = 768;

function isGreenBg(r, g, b) {
  if (g > 60 && g > r + 16 && g > b + 25 && r < 105 && b < 85) {
    return true;
  }
  const dGreen = Math.sqrt((r - 55) ** 2 + (g - 102) ** 2 + (b - 30) ** 2);
  return dGreen < 38;
}

// Recortes [x0, y0, x1, y1] na imagem de referência de 1376x768.
// Ordem dos frames = ordem na spritesheet (idle, caminhada, combate).
const characters = [
  {
    output: 'public/assets/trabalhador_rural_a.png',
    frames: [
      // 0: Idle, em pé com a enxada no ombro
      [40, 25, 190, 245],
      // 1-5: Caminhada com a enxada na mão
      [35, 275, 190, 495],
      [205, 275, 350, 495],
      [360, 275, 505, 495],
      [530, 275, 670, 495],
      [700, 275, 835, 495],
      // 6-8: Combate, batendo no foco com a enxada
      [50, 515, 255, 745],
      [285, 515, 495, 745],
      [525, 515, 705, 745]
    ]
  },
  {
    output: 'public/assets/trabalhador_rural_b.png',
    frames: [
      // 0: Idle, de costas com a enxada
      [1040, 25, 1180, 245],
      // 1-3: Caminhada com a enxada no ombro
      [860, 275, 975, 495],
      [1035, 275, 1145, 495],
      [1195, 275, 1335, 495],
      // 4-5: Combate, batendo no foco com a enxada
      [915, 515, 1085, 745],
      [1115, 515, 1335, 745]
    ]
  }
];

const TARGET_CELL = 128;
const COLS = 5;
// Área máxima do trabalhador dentro da célula, com os pés alinhados na base
const MAX_W = 124;
const MAX_H = 112;
const BASE_Y = 120;

async function loadReference() {
  return sharp(inputPath)
    .resize(REF_W, REF_H, { fit: 'fill' })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
}

async function extractFrame(reference, box) {
  const [x0, y0, x1, y1] = box;
  const { data, info } = await sharp(reference.data, {
    raw: { width: reference.info.width, height: reference.info.height, channels: 4 }
  })
    .extract({ left: x0, top: y0, width: x1 - x0, height: y1 - y0 })
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

async function generateCharacterSpritesheet(reference, character) {
  const rows = Math.ceil(character.frames.length / COLS);
  const sheetW = COLS * TARGET_CELL;
  const sheetH = rows * TARGET_CELL;
  const sheetBuf = Buffer.alloc(sheetW * sheetH * 4, 0);

  for (let idx = 0; idx < character.frames.length; idx++) {
    const { data, info } = await extractFrame(reference, character.frames[idx]);

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
        const destI = ((offsetY + y) * sheetW + (offsetX + x)) * 4;
        sheetBuf[destI] = resized.data[srcI];
        sheetBuf[destI + 1] = resized.data[srcI + 1];
        sheetBuf[destI + 2] = resized.data[srcI + 2];
        sheetBuf[destI + 3] = resized.data[srcI + 3];
      }
    }
  }

  await sharp(sheetBuf, {
    raw: { width: sheetW, height: sheetH, channels: 4 }
  })
    .png({ compressionLevel: 9 })
    .toFile(character.output);

  console.log(`Spritesheet gerada em ${character.output}: ${sheetW}x${sheetH}`);
}

async function main() {
  const reference = await loadReference();
  for (const character of characters) {
    await generateCharacterSpritesheet(reference, character);
  }
}

main().catch((err) => {
  console.error('Erro ao gerar spritesheets:', err);
  process.exit(1);
});
