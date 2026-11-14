export const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

export function rgbToHsl(r, g, b) {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  let h = 0;
  let s = 0;
  if (d !== 0) {
    s = d / (1 - Math.abs(2 * l - 1));
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return { h, s, l };
}

export function hslToRgb(h, s, l) {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hp = (((h % 360) + 360) % 360) / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  const sector = [
    [c, x, 0],
    [x, c, 0],
    [0, c, x],
    [0, x, c],
    [x, 0, c],
    [c, 0, x]
  ][Math.floor(hp)];
  const m = l - c / 2;
  return sector.map((v) => Math.round(clamp(v + m, 0, 1) * 255));
}

// Aplica uma regra de recolorização (em HSL) a cada pixel opaco de um buffer RGBA; a regra devolve null para manter o pixel
export function recolorRgba(src, width, height, recolor) {
  const out = Buffer.from(src);
  for (let p = 0; p < width * height; p++) {
    const o = p * 4;
    if (out[o + 3] === 0) continue;
    const y = Math.floor(p / width);
    const next = recolor(rgbToHsl(out[o], out[o + 1], out[o + 2]), y, height);
    if (!next) continue;
    const [r, g, b] = hslToRgb(next.h, next.s, next.l);
    out[o] = r;
    out[o + 1] = g;
    out[o + 2] = b;
  }
  return out;
}
