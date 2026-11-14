import sharp from 'sharp';

/**
 * Extrai o foco de fogo e os quatro níveis de fumaça das folhas fumaça-clara.jpg e fumaça-escura.jpg.
 * Cada recorte é anexado ao fundo verde (removido por distância de cor) e reduzido para o tamanho
 * das texturas procedurais anteriores (fire_node 36px, smoke_N 44px), preservando escalas e balanceamento.
 */

const FIRE_CELL = 36;
const SMOKE_CELL = 44;
const PAD = 6;
const BG_DISTANCE = 45;

const outputs = [
  // Foco de fogo: fogueira média com toras (linha 1 da folha clara)
  { name: 'fire_node', source: 'fumaça-clara.jpg', box: [1112, 216, 1348, 444], cell: FIRE_CELL },

  // Níveis de fumaça: clara (1-2) -> escura (3-4)
  { name: 'smoke_1', source: 'fumaça-clara.jpg', box: [604, 692, 816, 952], cell: SMOKE_CELL },
  { name: 'smoke_2', source: 'fumaça-clara.jpg', box: [1252, 592, 1752, 952], cell: SMOKE_CELL },
  { name: 'smoke_3', source: 'fumaça-escura.jpg', box: [1252, 592, 1752, 952], cell: SMOKE_CELL },
  { name: 'smoke_4', source: 'fumaça-escura.jpg', box: [1837, 500, 2662, 956], cell: SMOKE_CELL }
];

async function extractSprite({ name, source, box, cell }) {
  const { data, info } = await sharp(source)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const W = info.width;
  const H = info.height;

  const bgIdx = (5 * W + 5) * 3;
  const bgR = data[bgIdx];
  const bgG = data[bgIdx + 1];
  const bgB = data[bgIdx + 2];

  const x0 = Math.max(0, box[0] - PAD);
  const y0 = Math.max(0, box[1] - PAD);
  const x1 = Math.min(W, box[2] + PAD);
  const y1 = Math.min(H, box[3] + PAD);
  const cw = x1 - x0;
  const ch = y1 - y0;

  const rgba = Buffer.alloc(cw * ch * 4, 0);
  let minX = cw;
  let minY = ch;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < ch; y++) {
    for (let x = 0; x < cw; x++) {
      const si = ((y0 + y) * W + (x0 + x)) * 3;
      const r = data[si];
      const g = data[si + 1];
      const b = data[si + 2];
      const dist = Math.abs(r - bgR) + Math.abs(g - bgG) + Math.abs(b - bgB);
      if (dist < BG_DISTANCE) continue;

      const di = (y * cw + x) * 4;
      rgba[di] = r;
      rgba[di + 1] = g;
      rgba[di + 2] = b;
      rgba[di + 3] = 255;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }

  if (maxX < 0) throw new Error(`Nenhum pixel de sprite em ${name}`);

  const tw = maxX - minX + 1;
  const th = maxY - minY + 1;
  const trimmed = Buffer.alloc(tw * th * 4);
  for (let y = 0; y < th; y++) {
    rgba.copy(trimmed, y * tw * 4, ((y + minY) * cw + minX) * 4, ((y + minY) * cw + minX + tw) * 4);
  }

  await sharp(trimmed, { raw: { width: tw, height: th, channels: 4 } })
    .resize(cell, cell, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
      kernel: 'lanczos3'
    })
    .png()
    .toFile(`public/assets/${name}.png`);

  console.log(`${name}: ${tw}x${th} -> ${cell}x${cell} (public/assets/${name}.png)`);
}

for (const sprite of outputs) {
  await extractSprite(sprite);
}
