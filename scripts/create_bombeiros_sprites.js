import sharp from 'sharp';

// Uso: node scripts/create_bombeiros_sprites.js "<caminho da imagem de referência>"
const inputPath = process.argv[2];
if (!inputPath) {
  console.error('Uso: node scripts/create_bombeiros_sprites.js "<imagem de referência>"');
  process.exit(1);
}

const TRUCK_OUT = 'public/assets/caminhao_bombeiros.png';
const SPRAY_OUT = 'public/assets/bombeiro_spray.png';

// Regiões [x0, y0, x1, y1] na imagem de referência (1061×404)
const TRUCK_BOX = [28, 8, 246, 178];
const SPRAY_BOXES = [
  [508, 205, 626, 372],
  [622, 205, 790, 372],
  [762, 205, 930, 372]
];

const CELL = 128;
const FEET_MARGIN = 4;

function isGreenBg(r, g, b) {
  if (g > 60 && g > r + 16 && g > b + 25 && r < 105 && b < 85) {
    return true;
  }
  const dGreen = Math.sqrt((r - 55) ** 2 + (g - 102) ** 2 + (b - 30) ** 2);
  return dGreen < 38;
}

const { data, info } = await sharp(inputPath)
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });
const W = info.width;

// Copia a região, zera o fundo verde e devolve o recorte já ajustado à caixa do desenho
function cropKeyed([x0, y0, x1, y1]) {
  const w = x1 - x0 + 1;
  const h = y1 - y0 + 1;
  const out = Buffer.alloc(w * h * 4, 0);
  let minX = w;
  let minY = h;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const si = ((y0 + y) * W + (x0 + x)) * 4;
      const r = data[si];
      const g = data[si + 1];
      const b = data[si + 2];
      if (isGreenBg(r, g, b)) continue;
      const di = (y * w + x) * 4;
      out[di] = r;
      out[di + 1] = g;
      out[di + 2] = b;
      out[di + 3] = 255;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }

  const bw = maxX - minX + 1;
  const bh = maxY - minY + 1;
  const trimmed = Buffer.alloc(bw * bh * 4, 0);
  for (let y = 0; y < bh; y++) {
    const srcStart = ((y + minY) * w + minX) * 4;
    out.copy(trimmed, y * bw * 4, srcStart, srcStart + bw * 4);
  }
  return { buffer: trimmed, width: bw, height: bh };
}

// Caminhão: recorte limpo, sem escala (a escala é aplicada no jogo)
const truck = cropKeyed(TRUCK_BOX);
await sharp(truck.buffer, { raw: { width: truck.width, height: truck.height, channels: 4 } })
  .png()
  .toFile(TRUCK_OUT);

// Bombeiro de jato: todos os frames na mesma escala, pés alinhados na base da célula
const sprayFrames = SPRAY_BOXES.map(cropKeyed);
const tallest = Math.max(...sprayFrames.map((f) => f.height));
const scale = (CELL - FEET_MARGIN - 6) / tallest;

const composites = [];
for (let idx = 0; idx < sprayFrames.length; idx++) {
  const f = sprayFrames[idx];
  const newW = Math.max(1, Math.round(f.width * scale));
  const newH = Math.max(1, Math.round(f.height * scale));
  const resized = await sharp(f.buffer, { raw: { width: f.width, height: f.height, channels: 4 } })
    .resize(newW, newH, { kernel: 'nearest' })
    .png()
    .toBuffer();
  composites.push({
    input: resized,
    left: idx * CELL + Math.round((CELL - newW) / 2),
    top: CELL - FEET_MARGIN - newH
  });
}

await sharp({
  create: {
    width: CELL * sprayFrames.length,
    height: CELL,
    channels: 4,
    background: { r: 0, g: 0, b: 0, alpha: 0 }
  }
})
  .composite(composites)
  .png()
  .toFile(SPRAY_OUT);

console.log(`Caminhão: ${truck.width}×${truck.height} → ${TRUCK_OUT}`);
console.log(`Bombeiro: ${sprayFrames.length} frames de ${CELL}px → ${SPRAY_OUT}`);
