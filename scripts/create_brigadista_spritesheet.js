import sharp from 'sharp';

async function generateBrigadistaSpritesheet() {
  const inputPath = 'brigadista-voluntario.jpg';
  const outputPath = 'public/assets/brigadista_voluntario.png';

  const image = sharp(inputPath);
  const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });

  function isGreenBg(r, g, b) {
    if (g > 60 && g > r + 16 && g > b + 25 && r < 105 && b < 85) {
      return true;
    }
    const dGreen = Math.sqrt((r - 55) ** 2 + (g - 102) ** 2 + (b - 30) ** 2);
    if (dGreen < 38) {
      return true;
    }
    return false;
  }

  const frameDefs = [
    // Frame 0: Idle (Row 1, Frame 1)
    { name: 'idle_0', box: [102, 56, 353, 493], feetX: 195, feetY: 483 },

    // Frames 1-6: Walk cycle (Row 2, Frames 0-5)
    { name: 'walk_0', box: [102, 547, 341, 989], feetX: 245, feetY: 983 },
    { name: 'walk_1', box: [411, 553, 649, 989], feetX: 550, feetY: 966 },
    { name: 'walk_2', box: [710, 547, 961, 988], feetX: 909, feetY: 978 },
    { name: 'walk_3', box: [1034, 553, 1273, 989], feetX: 1230, feetY: 983 },
    { name: 'walk_4', box: [1375, 548, 1579, 988], feetX: 1479, feetY: 966 },
    { name: 'walk_5', box: [1710, 548, 1905, 988], feetX: 1815, feetY: 966 },

    // Frames 7-11: Extinguish / Fight fire (Row 3)
    { name: 'ext_0', box: [85, 1043, 481, 1475], feetX: 141, feetY: 1463 },
    { name: 'ext_1', box: [548, 1043, 937, 1475], feetX: 608, feetY: 1475 },
    { name: 'ext_2', box: [969, 1043, 1357, 1475], feetX: 1038, feetY: 1475 },
    { name: 'ext_3', box: [1430, 1037, 1785, 1473], feetX: 1498, feetY: 1463 },
    { name: 'ext_4', box: [2032, 1037, 2390, 1473], feetX: 2107, feetY: 1463 }
  ];

  const HI_SIZE = 512;
  const HI_FEET_X = 256;
  const HI_FEET_Y = 448; // 448 / 512 = 0.875

  const TARGET_CELL = 128;
  const COLS = 6;
  const ROWS = 2; // 12 frames: 2 rows of 6
  const SHEET_W = COLS * TARGET_CELL; // 768
  const SHEET_H = ROWS * TARGET_CELL; // 256

  const sheetBuf = Buffer.alloc(SHEET_W * SHEET_H * 4, 0);

  for (let idx = 0; idx < frameDefs.length; idx++) {
    const f = frameDefs[idx];
    const [x0, y0, x1, y1] = f.box;

    const hiFrame = Buffer.alloc(HI_SIZE * HI_SIZE * 4, 0);

    for (let sy = y0; sy <= y1; sy++) {
      const targetY = HI_FEET_Y - (f.feetY - sy);
      if (targetY < 0 || targetY >= HI_SIZE) continue;

      for (let sx = x0; sx <= x1; sx++) {
        const targetX = HI_FEET_X + (sx - f.feetX);
        if (targetX < 0 || targetX >= HI_SIZE) continue;

        const srcIdx = (sy * info.width + sx) * 3;
        const r = data[srcIdx];
        const g = data[srcIdx + 1];
        const b = data[srcIdx + 2];

        if (!isGreenBg(r, g, b)) {
          const destIdx = (targetY * HI_SIZE + targetX) * 4;
          hiFrame[destIdx] = r;
          hiFrame[destIdx + 1] = g;
          hiFrame[destIdx + 2] = b;
          hiFrame[destIdx + 3] = 255;
        }
      }
    }

    for (let py = 1; py < HI_SIZE - 1; py++) {
      for (let px = 1; px < HI_SIZE - 1; px++) {
        const destIdx = (py * HI_SIZE + px) * 4;
        if (hiFrame[destIdx + 3] === 255) {
          const r = hiFrame[destIdx];
          const g = hiFrame[destIdx + 1];
          const b = hiFrame[destIdx + 2];
          if (g > r + 15 && g > b + 20) {
            hiFrame[destIdx + 1] = Math.min(g, Math.max(r, b) + 5);
          }
        }
      }
    }

    const resized = await sharp(hiFrame, {
      raw: { width: HI_SIZE, height: HI_SIZE, channels: 4 }
    })
      .resize(TARGET_CELL, TARGET_CELL, {
        kernel: sharp.kernel.lanczos3
      })
      .raw()
      .toBuffer({ resolveWithObject: true });

    const col = idx % COLS;
    const row = Math.floor(idx / COLS);
    const startX = col * TARGET_CELL;
    const startY = row * TARGET_CELL;

    for (let cy = 0; cy < TARGET_CELL; cy++) {
      for (let cx = 0; cx < TARGET_CELL; cx++) {
        const srcI = (cy * TARGET_CELL + cx) * 4;
        const destI = ((startY + cy) * SHEET_W + (startX + cx)) * 4;

        sheetBuf[destI] = resized.data[srcI];
        sheetBuf[destI + 1] = resized.data[srcI + 1];
        sheetBuf[destI + 2] = resized.data[srcI + 2];
        sheetBuf[destI + 3] = resized.data[srcI + 3];
      }
    }
  }

  await sharp(sheetBuf, {
    raw: { width: SHEET_W, height: SHEET_H, channels: 4 }
  })
    .png({ compressionLevel: 9 })
    .toFile(outputPath);

  console.log(`Spritesheet successfully generated at ${outputPath}: ${SHEET_W}x${SHEET_H}`);
}

generateBrigadistaSpritesheet().catch(err => {
  console.error('Error generating spritesheet:', err);
  process.exit(1);
});
