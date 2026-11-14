// Extrai as árvores saudáveis e queimadas das folhas de referência: remove o fundo (verde ou azul) por cor,
// separa cada árvore pelo vão de menor densidade entre os centros e recorta as duas folhas com a mesma caixa,
// para que a árvore saudável e a queimada de cada posição tenham o mesmo tamanho e a mesma âncora.
// Uso: node scripts/create_arvores_sprites.js <arvores.jpg> <arvores-queimadas.jpg> [mangueira.jpg mangueira-queimada.jpg]
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const [HEALTHY_SRC, BURNED_SRC, MANGUEIRA_HEALTHY_SRC, MANGUEIRA_BURNED_SRC] = process.argv.slice(2);
const ASSETS = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public', 'assets');
const BG_DISTANCE = 48;
const BLUE_SHADE_MARGIN = 60;
const SPLIT_SEARCH = 150;
const MIN_COMPONENT_RATIO = 0.03;
const CENTERS = [0.185, 0.43, 0.635, 0.855];
const PAD = 4;
const SCALE = 0.25;

async function loadSheet(src, removeEnclosedBg) {
  const { data, info } = await sharp(src).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: W, height: H } = info;
  const bgR = data[0];
  const bgG = data[1];
  const bgB = data[2];
  // Sombras azul-escuras das árvores (fundo azul) não são da cor do fundo, mas também são fundo
  const isBlueShade = (p) => {
    const i = p * 3;
    return data[i + 2] - Math.max(data[i], data[i + 1]) > BLUE_SHADE_MARGIN;
  };
  const isBg = (p) => {
    if (isBlueShade(p)) return true;
    const i = p * 3;
    return Math.abs(data[i] - bgR) + Math.abs(data[i + 1] - bgG) + Math.abs(data[i + 2] - bgB) < BG_DISTANCE;
  };

  // Copas claras da folha saudável têm cor parecida com o fundo: só o fundo ligado às bordas é removido.
  // Na folha queimada não há copas claras, então frestas verdes entre galhos também são removidas.
  const isBgConnected = new Uint8Array(W * H);
  const queue = new Int32Array(W * H);
  let head = 0;
  let tail = 0;
  const push = (p) => {
    if (!isBgConnected[p] && isBg(p)) {
      isBgConnected[p] = 1;
      queue[tail++] = p;
    }
  };
  if (removeEnclosedBg) {
    for (let p = 0; p < W * H; p++) push(p);
  } else {
    for (let x = 0; x < W; x++) {
      push(x);
      push((H - 1) * W + x);
    }
    for (let y = 0; y < H; y++) {
      push(y * W);
      push(y * W + W - 1);
    }
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

  // Azul-escuro isolado dentro da copa ou entre tronco e folhas também é fundo: nenhuma árvore tem essa cor
  for (let p = 0; p < W * H; p++) {
    if (isBlueShade(p)) isBgConnected[p] = 1;
  }

  const rgba = Buffer.alloc(W * H * 4);
  const colCount = new Uint32Array(W);
  for (let p = 0; p < W * H; p++) {
    const o = p * 4;
    const fg = !isBgConnected[p];
    rgba[o] = data[p * 3];
    rgba[o + 1] = data[p * 3 + 1];
    rgba[o + 2] = data[p * 3 + 2];
    rgba[o + 3] = fg ? 255 : 0;
    if (fg) colCount[p % W]++;
  }
  return { rgba, W, H, colCount };
}

// Remove fragmentos de árvores vizinhas que sobram na borda da posição (componentes pequenos dentro do recorte)
function pruneSlot({ rgba, W, H }, { x0, x1 }) {
  const visited = new Uint8Array(W * H);
  const stack = new Int32Array(W * H);
  const components = [];
  for (let y = 0; y < H; y++) {
    for (let x = x0; x < x1; x++) {
      const start = y * W + x;
      if (visited[start] || rgba[start * 4 + 3] === 0) continue;
      let size = 0;
      const pixels = [];
      let top = 0;
      stack[top++] = start;
      visited[start] = 1;
      while (top > 0) {
        const p = stack[--top];
        pixels.push(p);
        size++;
        const px = p % W;
        const py = (p - px) / W;
        const neighbours = [];
        if (px > x0) neighbours.push(p - 1);
        if (px < x1 - 1) neighbours.push(p + 1);
        if (py > 0) neighbours.push(p - W);
        if (py < H - 1) neighbours.push(p + W);
        for (const q of neighbours) {
          if (visited[q] || rgba[q * 4 + 3] === 0) continue;
          visited[q] = 1;
          stack[top++] = q;
        }
      }
      components.push({ size, pixels });
    }
  }
  const largest = Math.max(0, ...components.map((c) => c.size));
  for (const c of components) {
    if (c.size >= largest * MIN_COMPONENT_RATIO) continue;
    for (const p of c.pixels) rgba[p * 4 + 3] = 0;
  }
}

function findSlots(colCount, W) {
  const mids = [];
  for (let k = 0; k < CENTERS.length - 1; k++) {
    const mid = Math.round(((CENTERS[k] + CENTERS[k + 1]) / 2) * W);
    let best = mid;
    for (let x = mid - SPLIT_SEARCH; x <= mid + SPLIT_SEARCH; x++) {
      if (colCount[x] < colCount[best]) best = x;
    }
    mids.push(best);
  }
  const edges = [0, ...mids, W];
  return edges.slice(0, -1).map((x0, k) => ({ x0, x1: edges[k + 1] }));
}

function contentBox({ rgba, W, H }, { x0, x1 }) {
  let left = x1;
  let right = x0 - 1;
  let top = H;
  let bottom = -1;
  for (let y = 0; y < H; y++) {
    for (let x = x0; x < x1; x++) {
      if (rgba[(y * W + x) * 4 + 3] === 0) continue;
      if (x < left) left = x;
      if (x > right) right = x;
      if (y < top) top = y;
      if (y > bottom) bottom = y;
    }
  }
  return { left, top, right, bottom };
}

function unionBox(a, b) {
  return {
    left: Math.min(a.left, b.left),
    top: Math.min(a.top, b.top),
    right: Math.max(a.right, b.right),
    bottom: Math.max(a.bottom, b.bottom)
  };
}

async function writeCrop(sheet, box, outPath) {
  const { rgba, W, H } = sheet;
  const left = Math.max(0, box.left - PAD);
  const top = Math.max(0, box.top - PAD);
  const width = Math.min(W, box.right + PAD + 1) - left;
  const height = Math.min(H, box.bottom + PAD + 1) - top;
  const outWidth = Math.round(width * SCALE);
  const info = await sharp(rgba, { raw: { width: W, height: H, channels: 4 } })
    .extract({ left, top, width, height })
    .resize({ width: outWidth })
    .png()
    .toFile(outPath);
  return info;
}

(async () => {
  if (!HEALTHY_SRC || !BURNED_SRC) {
    throw new Error('Uso: node scripts/create_arvores_sprites.js <arvores.jpg> <arvores-queimadas.jpg> [mangueira.jpg mangueira-queimada.jpg]');
  }
  const healthy = await loadSheet(HEALTHY_SRC, false);
  const burned = await loadSheet(BURNED_SRC, true);
  const healthySlots = findSlots(healthy.colCount, healthy.W);
  const burnedSlots = findSlots(burned.colCount, burned.W);

  for (let k = 0; k < CENTERS.length; k++) {
    pruneSlot(healthy, healthySlots[k]);
    pruneSlot(burned, burnedSlots[k]);
    const hBox = contentBox(healthy, healthySlots[k]);
    const bBox = contentBox(burned, burnedSlots[k]);
    const box = unionBox(hBox, bBox);
    const hInfo = await writeCrop(healthy, box, path.join(ASSETS, `arvore_${k + 1}.png`));
    const bInfo = await writeCrop(burned, box, path.join(ASSETS, `arvore_queimada_${k + 1}.png`));
    console.log(`arvore_${k + 1}.png ${hInfo.width}x${hInfo.height} | arvore_queimada_${k + 1}.png ${bInfo.width}x${bInfo.height}`);
  }

  if (MANGUEIRA_HEALTHY_SRC && MANGUEIRA_BURNED_SRC) {
    const mHealthy = await loadSheet(MANGUEIRA_HEALTHY_SRC, false);
    const mBurned = await loadSheet(MANGUEIRA_BURNED_SRC, true);
    const mSlot = { x0: 0, x1: mHealthy.W };
    const mBurnedSlot = { x0: 0, x1: mBurned.W };
    pruneSlot(mHealthy, mSlot);
    pruneSlot(mBurned, mBurnedSlot);
    const box = unionBox(contentBox(mHealthy, mSlot), contentBox(mBurned, mBurnedSlot));
    const hInfo = await writeCrop(mHealthy, box, path.join(ASSETS, 'arvore_5.png'));
    const bInfo = await writeCrop(mBurned, box, path.join(ASSETS, 'arvore_queimada_5.png'));
    console.log(`arvore_5.png (mangueira) ${hInfo.width}x${hInfo.height} | arvore_queimada_5.png ${bInfo.width}x${bInfo.height}`);
  }
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
