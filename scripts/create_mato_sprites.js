// Extrai as variações de mato da folha de referência (4 linhas de plantas sobre fundo cinza-arroxeado):
// remove o fundo ligado às bordas, agrupa as folhas de cada planta em componentes conectados e
// recorta cada planta com a própria caixa, sem escala (o tamanho é ajustado no jogo).
// Uso: node scripts/create_mato_sprites.js <folha-mato.png>
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const [SRC] = process.argv.slice(2);
const ASSETS = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public', 'assets');
// Cor do fundo da folha e tolerância por canal
const BG_COLOR = [85, 75, 84];
const BG_TOLERANCE = 22;
// Folhas a até esta distância (px) pertencem à mesma planta
const MERGE_RADIUS = 4;
const MIN_COMPONENT_RATIO = 0.02;
const ROW_COUNT = 4;
const PLANT_COUNT = 25;
const PAD = 2;
// Região da sombra projetada (canto inferior direito da última linha da folha)
const SHADOW_BOX = { x0: 700, y0: 640 };
const SHADOW_MAX_LUMA = 65;
const SHADOW_MIN_BLUE_GAP = 8;

(async () => {
  if (!SRC) {
    throw new Error('Uso: node scripts/create_mato_sprites.js <folha-mato.png>');
  }
  const { data, info } = await sharp(SRC).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: W, height: H } = info;
  const isBgColor = (p) => {
    const i = p * 4;
    return (
      Math.abs(data[i] - BG_COLOR[0]) <= BG_TOLERANCE &&
      Math.abs(data[i + 1] - BG_COLOR[1]) <= BG_TOLERANCE &&
      Math.abs(data[i + 2] - BG_COLOR[2]) <= BG_TOLERANCE
    );
  };

  // Fundo conectado às bordas; tons parecidos dentro das plantas são preservados
  const isBg = new Uint8Array(W * H);
  const queue = new Int32Array(W * H);
  let head = 0;
  let tail = 0;
  const push = (p) => {
    if (!isBg[p] && isBgColor(p)) {
      isBg[p] = 1;
      queue[tail++] = p;
    }
  };
  for (let x = 0; x < W; x++) {
    push(x);
    push((H - 1) * W + x);
  }
  for (let y = 0; y < H; y++) {
    push(y * W);
    push(y * W + W - 1);
  }
  while (head < tail) {
    const p = queue[head++];
    const x = p % W;
    const y = (p - x) / W;
    if (x > 0) push(p - 1);
    if (x < W - 1) push(p + 1);
    if (y > 0) push(p - W);
    if (y < H - 1) push(p + W);
  }

  // Sombra projetada da última linha: escura e roxo-azulada, fora das plantas
  const isShadow = (p) => {
    const x = p % W;
    const y = (p - x) / W;
    if (x < SHADOW_BOX.x0 || y < SHADOW_BOX.y0) return false;
    const i = p * 4;
    const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
    return avg < SHADOW_MAX_LUMA && data[i + 2] - data[i + 1] >= SHADOW_MIN_BLUE_GAP;
  };
  const isFg = (p) => !isBg[p] && !isShadow(p);

  // Dilatação para unir folhas da mesma planta, depois rotula componentes conectados
  const near = new Uint8Array(W * H);
  for (let p = 0; p < W * H; p++) {
    if (!isFg(p)) continue;
    const x = p % W;
    const y = (p - x) / W;
    for (let dy = -MERGE_RADIUS; dy <= MERGE_RADIUS; dy++) {
      const ny = y + dy;
      if (ny < 0 || ny >= H) continue;
      for (let dx = -MERGE_RADIUS; dx <= MERGE_RADIUS; dx++) {
        const nx = x + dx;
        if (nx < 0 || nx >= W) continue;
        near[ny * W + nx] = 1;
      }
    }
  }

  const label = new Int32Array(W * H).fill(-1);
  const components = [];
  for (let start = 0; start < W * H; start++) {
    if (!near[start] || label[start] !== -1) continue;
    const id = components.length;
    const pixels = [];
    let top = 0;
    queue[top++] = start;
    label[start] = id;
    while (top > 0) {
      const p = queue[--top];
      if (isFg(p)) pixels.push(p);
      const x = p % W;
      const y = (p - x) / W;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
          const q = ny * W + nx;
          if (!near[q] || label[q] !== -1) continue;
          label[q] = id;
          queue[top++] = q;
        }
      }
    }
    components.push({ id, pixels });
  }

  const largest = Math.max(...components.map((c) => c.pixels.length));
  // A faixa de terra é marrom (vermelho > verde); as plantas são predominantemente verdes
  const isSoil = (c) => {
    let r = 0;
    let g = 0;
    for (const p of c.pixels) {
      r += data[p * 4];
      g += data[p * 4 + 1];
    }
    return r > g;
  };
  const widthOf = (c) => {
    let left = W;
    let right = -1;
    for (const p of c.pixels) {
      const x = p % W;
      if (x < left) left = x;
      if (x > right) right = x;
    }
    return { left, width: right - left + 1 };
  };
  // Plantas que se encostam formam um só componente: divide no vale de menor densidade do meio
  const splitAtValley = (c, newId) => {
    const { left, width } = widthOf(c);
    const counts = new Uint32Array(width);
    for (const p of c.pixels) counts[(p % W) - left]++;
    let cut = Math.floor(width / 2);
    for (let i = Math.floor(width * 0.3); i <= Math.ceil(width * 0.7); i++) {
      if (counts[i] < counts[cut]) cut = i;
    }
    const cutX = left + cut;
    const right = { id: newId, pixels: [] };
    c.pixels = c.pixels.filter((p) => {
      if (p % W < cutX) return true;
      label[p] = newId;
      right.pixels.push(p);
      return false;
    });
    return right;
  };

  let candidates = components.filter((c) => c.pixels.length >= largest * MIN_COMPONENT_RATIO && !isSoil(c));
  while (candidates.length < PLANT_COUNT) {
    candidates.sort((a, b) => widthOf(b).width - widthOf(a).width);
    const widest = candidates[0];
    const rest = splitAtValley(widest, components.length);
    components.push(rest);
    candidates.push(rest);
  }
  const plants = candidates
    .map((c) => {
      let left = W;
      let right = -1;
      let top = H;
      let bottom = -1;
      let sumY = 0;
      let sumX = 0;
      for (const p of c.pixels) {
        const x = p % W;
        const y = (p - x) / W;
        sumX += x;
        sumY += y;
        if (x < left) left = x;
        if (x > right) right = x;
        if (y < top) top = y;
        if (y > bottom) bottom = y;
      }
      return {
        id: c.id,
        pixels: c.pixels.length,
        cx: sumX / c.pixels.length,
        cy: sumY / c.pixels.length,
        box: { left, top, right, bottom }
      };
    });

  if (plants.length !== PLANT_COUNT) {
    throw new Error(`Esperadas ${PLANT_COUNT} plantas, encontradas ${plants.length}`);
  }

  // Linhas: corta a sequência ordenada por altura nos ROW_COUNT - 1 maiores vãos verticais
  plants.sort((a, b) => a.cy - b.cy);
  const cuts = plants
    .slice(0, -1)
    .map((p, i) => ({ at: i + 1, gap: plants[i + 1].cy - p.cy }))
    .sort((a, b) => b.gap - a.gap)
    .slice(0, ROW_COUNT - 1)
    .map((c) => c.at)
    .sort((a, b) => a - b);
  const bounds = [0, ...cuts, plants.length];
  const rows = [];
  for (let r = 0; r < ROW_COUNT; r++) {
    rows.push(plants.slice(bounds[r], bounds[r + 1]));
  }
  const ordered = rows.flatMap((row) => row.sort((a, b) => a.cx - b.cx));

  for (let k = 0; k < ordered.length; k++) {
    const plant = ordered[k];
    const { left, top, right, bottom } = plant.box;
    const x0 = Math.max(0, left - PAD);
    const y0 = Math.max(0, top - PAD);
    const width = Math.min(W - 1, right + PAD) - x0 + 1;
    const height = Math.min(H - 1, bottom + PAD) - y0 + 1;
    const out = Buffer.alloc(width * height * 4);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const p = (y0 + y) * W + (x0 + x);
        const o = (y * width + x) * 4;
        if (!isFg(p) || label[p] !== plant.id) continue;
        out[o] = data[p * 4];
        out[o + 1] = data[p * 4 + 1];
        out[o + 2] = data[p * 4 + 2];
        out[o + 3] = 255;
      }
    }
    const file = path.join(ASSETS, `mato_${k + 1}.png`);
    await sharp(out, { raw: { width, height, channels: 4 } }).png().toFile(file);
    console.log(`mato_${k + 1}.png ${width}x${height} (folhas: ${plant.pixels})`);
  }
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
