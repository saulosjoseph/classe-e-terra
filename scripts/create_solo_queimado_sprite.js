// Extrai o sprite de solo queimado da imagem de referência: remove o fundo verde e recorta ao conteúdo
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const SRC = process.argv[2];
const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public', 'assets', 'solo_queimado.png');
const BG_DISTANCE = 45;
const PAD = 2;

(async () => {
  const { data, info } = await sharp(SRC).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: W, height: H } = info;
  const bg = [data[0], data[1], data[2]];

  const rgba = Buffer.alloc(W * H * 4);
  let x0 = W, y0 = H, x1 = -1, y1 = -1;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 3;
      const d = Math.abs(data[i] - bg[0]) + Math.abs(data[i + 1] - bg[1]) + Math.abs(data[i + 2] - bg[2]);
      const o = (y * W + x) * 4;
      if (d < BG_DISTANCE) continue;
      rgba[o] = data[i];
      rgba[o + 1] = data[i + 1];
      rgba[o + 2] = data[i + 2];
      rgba[o + 3] = 255;
      if (x < x0) x0 = x;
      if (y < y0) y0 = y;
      if (x > x1) x1 = x;
      if (y > y1) y1 = y;
    }
  }

  const left = Math.max(0, x0 - PAD);
  const top = Math.max(0, y0 - PAD);
  const width = Math.min(W, x1 + PAD + 1) - left;
  const height = Math.min(H, y1 + PAD + 1) - top;

  await sharp(rgba, { raw: { width: W, height: H, channels: 4 } })
    .extract({ left, top, width, height })
    .png()
    .toFile(OUT);

  console.log(`solo_queimado.png ${width}x${height} -> ${OUT}`);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
