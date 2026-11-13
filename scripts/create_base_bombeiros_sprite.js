import sharp from 'sharp';

// Uso: node scripts/create_base_bombeiros_sprite.js [caminho-da-imagem]
const inputPath = process.argv[2] ?? 'base-bombeiros.jpg';
const outputPath = 'public/assets/base_bombeiros.png';

const { data, info } = await sharp(inputPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });

function isGreenBg(r, g, b) {
  if (g > 60 && g > r + 16 && g > b + 25 && r < 105 && b < 85) {
    return true;
  }
  const dGreen = Math.sqrt((r - 55) ** 2 + (g - 102) ** 2 + (b - 30) ** 2);
  return dGreen < 38;
}

const { width, height } = info;
let minX = width;
let minY = height;
let maxX = -1;
let maxY = -1;

for (let y = 0; y < height; y++) {
  for (let x = 0; x < width; x++) {
    const i = (y * width + x) * 4;
    if (isGreenBg(data[i], data[i + 1], data[i + 2])) {
      data[i + 3] = 0;
    } else {
      data[i + 3] = 255;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
}

await sharp(data, { raw: { width, height, channels: 4 } })
  .extract({ left: minX, top: minY, width: maxX - minX + 1, height: maxY - minY + 1 })
  .png({ compressionLevel: 9 })
  .toFile(outputPath);

console.log(`Sprite da base dos bombeiros gerado em ${outputPath}: ${maxX - minX + 1}x${maxY - minY + 1}`);
