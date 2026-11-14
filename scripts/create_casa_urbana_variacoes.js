// Extrai a casa urbana da referência (fundo cinza com grade), recortando-a por flood fill a partir das bordas,
// e gera variações recoloridas por faixas de matiz/saturação/luminosidade.
// Uso: node scripts/create_casa_urbana_variacoes.js [casa.jpg]
import sharp from 'sharp';
import { clamp, recolorRgba } from './lib/cor.js';

const inputPath = process.argv[2] ?? 'casa.jpg';
const outputDir = 'public/assets';
const SCALE = 0.25;
// Largura final igual à do sprite da casa rural, para que as duas tenham escala parecida no jogo
const TARGET_W = 400;
// Tolerância de cor (distância euclidiana RGB) para considerar um pixel como fundo cinza da grade
const BG_TOLERANCE = 45;
const PAD = 2;

const meta = await sharp(inputPath).metadata();
const { data, info } = await sharp(inputPath)
  .resize({ width: Math.round(meta.width * SCALE), kernel: sharp.kernel.lanczos3 })
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

const { width, height } = info;
const pixelAt = (x, y) => (y * width + x) * 4;

const corners = [pixelAt(0, 0), pixelAt(width - 1, 0), pixelAt(0, height - 1), pixelAt(width - 1, height - 1)];
const bg = [0, 1, 2].map((c) => corners.reduce((sum, i) => sum + data[i + c], 0) / corners.length);

const isBackground = (i) =>
  Math.hypot(data[i] - bg[0], data[i + 1] - bg[1], data[i + 2] - bg[2]) <= BG_TOLERANCE;

const visited = new Uint8Array(width * height);
const queue = [];
const enqueue = (x, y) => {
  const p = y * width + x;
  if (visited[p]) return;
  visited[p] = 1;
  if (isBackground(pixelAt(x, y))) queue.push(p);
};
for (let x = 0; x < width; x++) {
  enqueue(x, 0);
  enqueue(x, height - 1);
}
for (let y = 0; y < height; y++) {
  enqueue(0, y);
  enqueue(width - 1, y);
}
while (queue.length) {
  const p = queue.pop();
  data[p * 4 + 3] = 0;
  const x = p % width;
  const y = (p - x) / width;
  if (x > 0) enqueue(x - 1, y);
  if (x < width - 1) enqueue(x + 1, y);
  if (y > 0) enqueue(x, y - 1);
  if (y < height - 1) enqueue(x, y + 1);
}

// Recorte na caixa do conteúdo opaco
let left = width;
let right = -1;
let top = height;
let bottom = -1;
for (let y = 0; y < height; y++) {
  for (let x = 0; x < width; x++) {
    if (data[pixelAt(x, y) + 3] === 0) continue;
    if (x < left) left = x;
    if (x > right) right = x;
    if (y < top) top = y;
    if (y > bottom) bottom = y;
  }
}
left = Math.max(0, left - PAD);
top = Math.max(0, top - PAD);
const cropW = Math.min(width, right + PAD + 1) - left;
const cropH = Math.min(height, bottom + PAD + 1) - top;
const { data: base, info: baseInfo } = await sharp(data, { raw: { width, height, channels: 4 } })
  .extract({ left, top, width: cropW, height: cropH })
  .resize({ width: TARGET_W, kernel: sharp.kernel.lanczos3 })
  .raw()
  .toBuffer({ resolveWithObject: true });
const { width: baseW, height: baseH } = baseInfo;

const basePath = `${outputDir}/casa_urbana.png`;
await sharp(base, { raw: { width: baseW, height: baseH, channels: 4 } }).png().toFile(basePath);
console.log(`${basePath}: ${baseW}x${baseH}`);

// Faixas de cor da casa urbana
const isBlueWall = (c) => c.h >= 190 && c.h <= 235 && c.s > 0.2 && c.l > 0.25 && c.l < 0.8;
const isRoof = (c) => (c.h <= 25 || c.h >= 340) && c.s > 0.4 && c.l > 0.2 && c.l < 0.7;
const isGreen = (c) => c.h >= 70 && c.h <= 170 && c.s > 0.2;

const VARIATIONS = [
  { name: 'parede_branca', recolor: (c) => (isBlueWall(c) ? { h: 40, s: 0.05, l: c.l } : null) },
  { name: 'parede_verde', recolor: (c) => (isBlueWall(c) ? { h: 140, s: 0.35, l: c.l } : null) },
  { name: 'parede_rosa', recolor: (c) => (isBlueWall(c) ? { h: 340, s: 0.4, l: c.l } : null) },
  { name: 'telha_azul', recolor: (c) => (isRoof(c) ? { h: 210, s: 0.45, l: c.l } : null) },
  { name: 'telha_escura', recolor: (c) => (isRoof(c) ? { h: 220, s: 0.1, l: c.l * 0.7 } : null) },
  {
    name: 'queimada',
    recolor: (c) => {
      if (isRoof(c)) return { h: 20, s: 0.08, l: c.l * 0.35 };
      if (isBlueWall(c)) return { h: 25, s: 0.1, l: c.l * 0.5 };
      if (isGreen(c)) return { h: 35, s: 0.45, l: c.l * 0.6 };
      return { h: c.h, s: c.s * 0.6, l: c.l * 0.8 };
    }
  },
  {
    name: 'desbotada',
    recolor: (c) => ({ h: c.h, s: c.s * 0.4, l: clamp(c.l * 0.92 + 0.04, 0, 1) })
  }
];

for (const { name, recolor } of VARIATIONS) {
  const out = recolorRgba(base, baseW, baseH, recolor);
  const outputPath = `${outputDir}/casa_urbana_${name}.png`;
  await sharp(out, { raw: { width: baseW, height: baseH, channels: 4 } }).png().toFile(outputPath);
  console.log(`${outputPath}: ${baseW}x${baseH}`);
}
