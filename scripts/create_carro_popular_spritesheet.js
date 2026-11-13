import sharp from 'sharp';

// Uso: node scripts/create_carro_popular_spritesheet.js [caminho/da/referencia.jpg]
const inputPath = process.argv[2] ?? 'carro-popular.jpg';
const outputDir = 'public/assets';

// Vista lateral do carro (voltado para a direita) na referência de 2752x1536
const SIDE_BOX = [172, 1150, 925, 1480];

const TARGET_CELL = 128;
const MAX_W = 124;
const MAX_H = 112;
const BASE_Y = 120;

// Cores da pintura. A luminosidade original da pintura vermelha é preservada como sombreamento.
const PALETTES = {
  vermelho: null,
  amarelo: [240, 190, 20],
  preto: [40, 40, 46],
  prata: [196, 200, 208]
};

function isGreenBg(r, g, b) {
  if (g > 60 && g > r + 16 && g > b + 25 && r < 105 && b < 85) {
    return true;
  }
  const dGreen = Math.sqrt((r - 55) ** 2 + (g - 102) ** 2 + (b - 30) ** 2);
  return dGreen < 38;
}

// Pintura vermelha: vermelho dominante, sem confundir com faróis laranja ou vidros
function isRedPaint(r, g, b) {
  return r >= 45 && r > 2 * g && r > 2 * b;
}

function luminance(r, g, b) {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

async function extractSide() {
  const [x0, y0, x1, y1] = SIDE_BOX;
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

  return { data, width: info.width, height: info.height };
}

function medianRedLuminance(data) {
  const values = [];
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] === 0) continue;
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    if (isRedPaint(r, g, b)) values.push(luminance(r, g, b));
  }
  values.sort((a, b) => a - b);
  return values[Math.floor(values.length / 2)];
}

function recolor(data, target, refLum) {
  const out = Buffer.from(data);
  if (!target) return out;

  for (let i = 0; i < out.length; i += 4) {
    if (out[i + 3] === 0) continue;
    const r = out[i];
    const g = out[i + 1];
    const b = out[i + 2];
    if (!isRedPaint(r, g, b)) continue;

    const shade = luminance(r, g, b) / refLum;
    out[i] = Math.min(255, Math.round(target[0] * shade));
    out[i + 1] = Math.min(255, Math.round(target[1] * shade));
    out[i + 2] = Math.min(255, Math.round(target[2] * shade));
  }
  return out;
}

async function fitToCell(data, width, height) {
  const trimmed = await sharp(data, { raw: { width, height, channels: 4 } })
    .trim()
    .toBuffer({ resolveWithObject: true });

  const { width: tw, height: th } = trimmed.info;
  const scale = Math.min(MAX_W / tw, MAX_H / th);
  const w = Math.max(1, Math.round(tw * scale));
  const h = Math.max(1, Math.round(th * scale));

  const resized = await sharp(trimmed.data, { raw: { width: tw, height: th, channels: 4 } })
    .resize(w, h, { kernel: sharp.kernel.lanczos3 })
    .raw()
    .toBuffer();

  const cell = Buffer.alloc(TARGET_CELL * TARGET_CELL * 4, 0);
  const offsetX = Math.floor((TARGET_CELL - w) / 2);
  const offsetY = BASE_Y - h;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const srcI = (y * w + x) * 4;
      if (resized[srcI + 3] === 0) continue;
      const destI = ((offsetY + y) * TARGET_CELL + (offsetX + x)) * 4;
      cell[destI] = resized[srcI];
      cell[destI + 1] = resized[srcI + 1];
      cell[destI + 2] = resized[srcI + 2];
      cell[destI + 3] = resized[srcI + 3];
    }
  }

  return cell;
}

async function generateCarroPopularSpritesheets() {
  const side = await extractSide();
  const refLum = medianRedLuminance(side.data);

  for (const [name, target] of Object.entries(PALETTES)) {
    const recolored = recolor(side.data, target, refLum);
    const cell = await fitToCell(recolored, side.width, side.height);
    const outputPath = `${outputDir}/carro_popular_${name}.png`;

    await sharp(cell, { raw: { width: TARGET_CELL, height: TARGET_CELL, channels: 4 } })
      .png({ compressionLevel: 9 })
      .toFile(outputPath);

    console.log(`Sprite gerada em ${outputPath}: ${TARGET_CELL}x${TARGET_CELL}`);
  }
}

generateCarroPopularSpritesheets().catch((err) => {
  console.error('Erro ao gerar sprites do carro popular:', err);
  process.exit(1);
});
