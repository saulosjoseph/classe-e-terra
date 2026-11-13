import sharp from 'sharp';

// Uso: node scripts/create_aldeia_sprite.js [caminho/da/referencia.jpg]
const inputPath = process.argv[2] ?? 'aldeia.jpg';
const outputPath = 'public/assets/aldeia.png';
const TARGET_W = 500;

// Tolerância de cor (distância euclidiana RGB) para considerar um pixel como fundo verde
const BG_TOLERANCE = 40;

const { data, info } = await sharp(inputPath)
  .resize(TARGET_W, null, { kernel: sharp.kernel.lanczos3 })
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

const { width, height } = info;
const pixelAt = (x, y) => (y * width + x) * 4;

// Cor de fundo estimada a partir dos cantos da imagem
const corners = [pixelAt(0, 0), pixelAt(width - 1, 0), pixelAt(0, height - 1), pixelAt(width - 1, height - 1)];
const bg = [0, 1, 2].map((c) => corners.reduce((sum, i) => sum + data[i + c], 0) / corners.length);

const isBackground = (i) =>
  Math.hypot(data[i] - bg[0], data[i + 1] - bg[1], data[i + 2] - bg[2]) <= BG_TOLERANCE;

// Flood fill a partir das bordas: só remove o fundo conectado ao contorno,
// preservando o chão e as árvores que estão dentro da aldeia
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

await sharp(data, { raw: { width, height, channels: 4 } }).png().toFile(outputPath);

console.log(`${outputPath}: ${width}x${height} (fundo transparente)`);
