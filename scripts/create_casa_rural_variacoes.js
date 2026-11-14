// Gera variações da casa rural a partir do sprite existente, recolorindo por faixas de matiz/saturação/luminosidade.
// Mantém silhueta, tamanho e transparência do original, para que as variações sejam intercambiáveis no jogo.
// Uso: node scripts/create_casa_rural_variacoes.js [public/assets/casa_rural.png]
import sharp from 'sharp';
import { clamp, recolorRgba } from './lib/cor.js';

const inputPath = process.argv[2] ?? 'public/assets/casa_rural.png';
const outputDir = 'public/assets';

// Faixas de cor do sprite original
const isRoof = (c, y, H) => c.h >= 5 && c.h <= 38 && c.s > 0.35 && c.l < 0.62 && y < H * 0.62;
const isWall = (c) => c.s < 0.14 && c.l > 0.6;
const isBlue = (c) => c.h >= 195 && c.h <= 235 && c.s > 0.45 && c.l < 0.6;
const isVegetation = (c) => c.h >= 70 && c.h <= 170 && c.s > 0.2;

const VARIATIONS = [
  {
    name: 'telha_escura',
    recolor: (c, y, H) => (isRoof(c, y, H) ? { h: 215, s: 0.12, l: c.l * 0.75 } : null)
  },
  {
    name: 'parede_amarela',
    recolor: (c) => (isWall(c) ? { h: 48, s: 0.5, l: c.l * 0.95 } : null)
  },
  {
    name: 'parede_azul',
    recolor: (c) => (isWall(c) ? { h: 200, s: 0.35, l: c.l } : null)
  },
  {
    name: 'telha_verde',
    recolor: (c, y, H) => (isRoof(c, y, H) ? { h: 140, s: 0.4, l: c.l } : null)
  },
  {
    name: 'queimada',
    recolor: (c, y, H) => {
      if (isRoof(c, y, H)) return { h: 20, s: 0.08, l: c.l * 0.35 };
      if (isWall(c)) return { h: 30, s: 0.12, l: c.l * 0.5 };
      if (isBlue(c)) return { h: 20, s: 0.1, l: c.l * 0.3 };
      if (isVegetation(c)) return { h: 35, s: 0.45, l: c.l * 0.6 };
      return { h: c.h, s: c.s * 0.6, l: c.l * 0.7 };
    }
  },
  {
    name: 'desbotada',
    recolor: (c) => ({ h: c.h, s: c.s * 0.4, l: clamp(c.l * 0.92 + 0.04, 0, 1) })
  }
];

const { data, info } = await sharp(inputPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const { width, height } = info;

for (const { name, recolor } of VARIATIONS) {
  const out = recolorRgba(data, width, height, recolor);
  const outputPath = `${outputDir}/casa_rural_${name}.png`;
  await sharp(out, { raw: { width, height, channels: 4 } }).png().toFile(outputPath);
  console.log(`${outputPath}: ${width}x${height}`);
}
