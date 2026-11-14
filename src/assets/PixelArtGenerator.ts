import Phaser from 'phaser';

/**
 * Gera todas as texturas em Alta Densidade de Pixels (HD Pixel Art nativo) diretamente via Canvas no BootScene.
 * Respeita rigorosamente a regra visual do GDD:
 * - Cores vivas na resistência (verde da mata, tons quentes da cidade viva)
 * - Fogo e fumaça tóxica vêm das folhas fumaça-clara/fumaça-escura (carregadas no BootScene), não daqui.
 */
export class PixelArtGenerator {
  public static generateAll(scene: Phaser.Scene): void {
    this.generateHDShadow(scene);
    this.generateHDVoluntario(scene);
    this.generateHDGuarda(scene);
    this.generateHDFarm(scene);
    this.generateHDCityHouse(scene);
    this.generateHDBoss(scene);
  }

  // Helper para criar ou recriar canvas com filtro NEAREST nítido
  private static initCanvas(scene: Phaser.Scene, key: string, w: number, h: number): CanvasRenderingContext2D | null {
    if (scene.textures.exists(key)) {
      scene.textures.remove(key);
    }
    const canvasTex = scene.textures.createCanvas(key, w, h);
    if (!canvasTex) return null;
    const ctx = canvasTex.getContext();
    ctx.clearRect(0, 0, w, h);
    return ctx;
  }

  private static finalizeCanvas(scene: Phaser.Scene, key: string): void {
    const tex = scene.textures.get(key) as Phaser.Textures.CanvasTexture;
    if (tex && typeof tex.refresh === 'function') {
      tex.refresh();
      tex.setFilter(Phaser.Textures.FilterMode.NEAREST);
    }
  }

  // Helpers de desenho pixel-perfect
  private static px(ctx: CanvasRenderingContext2D, x: number, y: number, color: string): void {
    ctx.fillStyle = color;
    ctx.fillRect(Math.floor(x), Math.floor(y), 1, 1);
  }

  private static rect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string): void {
    ctx.fillStyle = color;
    ctx.fillRect(Math.floor(x), Math.floor(y), Math.floor(w), Math.floor(h));
  }

  private static line(ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, color: string): void {
    ctx.fillStyle = color;
    let dx = Math.abs(x1 - x0);
    let dy = Math.abs(y1 - y0);
    let sx = x0 < x1 ? 1 : -1;
    let sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;
    let x = Math.floor(x0);
    let y = Math.floor(y0);
    const targetX = Math.floor(x1);
    const targetY = Math.floor(y1);

    while (true) {
      ctx.fillRect(x, y, 1, 1);
      if (x === targetX && y === targetY) break;
      const e2 = 2 * err;
      if (e2 > -dy) {
        err -= dy;
        x += sx;
      }
      if (e2 < dx) {
        err += dx;
        y += sy;
      }
    }
  }

  private static poly(ctx: CanvasRenderingContext2D, pts: [number, number][], color: string): void {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) {
      ctx.lineTo(pts[i][0], pts[i][1]);
    }
    ctx.closePath();
    ctx.fill();
  }

  // 0. Sombra Elíptica Isométrica HD (24x12)
  private static generateHDShadow(scene: Phaser.Scene): void {
    const ctx = this.initCanvas(scene, 'unit_shadow', 24, 12);
    if (!ctx) return;

    ctx.fillStyle = '#090d0a44';
    ctx.beginPath();
    ctx.ellipse(12, 6, 11, 5.5, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#090d0a77';
    ctx.beginPath();
    ctx.ellipse(12, 6, 7.5, 3.5, 0, 0, Math.PI * 2);
    ctx.fill();

    this.finalizeCanvas(scene, 'unit_shadow');
  }

  // 1. Brigada Voluntária HD (36x44: chapéu de palha trançada, camiseta comunitária branca/verde, abafador manual)
  private static generateHDVoluntario(scene: Phaser.Scene): void {
    const ctx = this.initCanvas(scene, 'unit_voluntario', 36, 44);
    if (!ctx) return;

    // Chapéu de palha trançada
    this.rect(ctx, 11, 4, 14, 4, '#eab308');
    this.rect(ctx, 8, 8, 20, 3, '#facc15');
    this.rect(ctx, 6, 11, 24, 2, '#ca8a04');
    this.line(ctx, 9, 8, 27, 8, '#78350f');

    // Rosto e pescoço
    this.rect(ctx, 13, 13, 10, 8, '#d97706');
    this.px(ctx, 15, 16, '#18181b');
    this.px(ctx, 19, 16, '#18181b');
    this.px(ctx, 17, 18, '#b45309');
    this.line(ctx, 14, 20, 22, 20, '#ef4444');

    // Tronco: Camiseta branca com emblema verde
    this.rect(ctx, 11, 21, 14, 11, '#f8fafc');
    this.rect(ctx, 12, 22, 12, 9, '#e2e8f0');
    this.rect(ctx, 16, 23, 4, 4, '#16a34a');
    this.px(ctx, 17, 22, '#22c55e');

    // Braço esquerdo e abafador manual longo de combate
    this.line(ctx, 9, 22, 6, 28, '#d97706');
    this.rect(ctx, 5, 28, 3, 3, '#facc15');
    this.line(ctx, 28, 8, 4, 38, '#78350f');
    this.line(ctx, 29, 8, 5, 38, '#451a03');
    this.poly(ctx, [[1, 36], [8, 33], [7, 41], [0, 44]], '#18181b');
    this.poly(ctx, [[2, 37], [7, 34], [6, 40], [1, 43]], '#27272a');
    this.px(ctx, 4, 37, '#94a3b8');

    // Braço direito
    this.line(ctx, 25, 22, 27, 28, '#d97706');
    this.rect(ctx, 26, 28, 3, 3, '#facc15');

    // Calça jeans azul resistente com costura
    this.rect(ctx, 12, 32, 12, 2, '#1e3a8a');
    this.rect(ctx, 12, 34, 5, 6, '#1d4ed8');
    this.rect(ctx, 19, 34, 5, 6, '#1e40af');
    this.line(ctx, 17, 34, 17, 39, '#0f172a');

    // Botinas de couro reforçado
    this.rect(ctx, 11, 40, 6, 3, '#451a03');
    this.rect(ctx, 19, 40, 6, 3, '#451a03');
    this.line(ctx, 11, 42, 17, 42, '#18181b');
    this.line(ctx, 19, 42, 25, 42, '#18181b');

    this.finalizeCanvas(scene, 'unit_voluntario');
  }

  // 3. Guarda Florestal Comunitário Armado HD (36x44: boina/cocar, uniforme tático camuflado, rádio e defesa)
  private static generateHDGuarda(scene: Phaser.Scene): void {
    const ctx = this.initCanvas(scene, 'unit_guarda', 36, 44);
    if (!ctx) return;

    // Boina militar verde floresta com cocar indígena tradicional
    this.rect(ctx, 11, 5, 14, 4, '#064e3b');
    this.rect(ctx, 9, 8, 18, 4, '#15803d');
    this.line(ctx, 9, 4, 12, 7, '#ef4444');
    this.line(ctx, 8, 2, 10, 6, '#facc15');
    this.line(ctx, 7, 4, 9, 7, '#38bdf8');

    // Rosto com pintura de guerra e olhar vigilante
    this.rect(ctx, 13, 12, 10, 7, '#d97706');
    this.px(ctx, 15, 15, '#18181b');
    this.px(ctx, 19, 15, '#18181b');
    this.line(ctx, 13, 16, 16, 16, '#dc2626');
    this.line(ctx, 18, 16, 21, 16, '#dc2626');

    // Rádio transmissor tático no ombro
    this.rect(ctx, 24, 18, 3, 5, '#18181b');
    this.line(ctx, 25, 14, 25, 18, '#71717a');

    // Tronco: Colete balístico modular verde-oliva camuflado
    this.rect(ctx, 11, 19, 14, 13, '#065f46');
    this.rect(ctx, 12, 20, 12, 11, '#042f2e');
    this.rect(ctx, 13, 22, 4, 3, '#14532d');
    this.rect(ctx, 19, 22, 4, 3, '#14532d');

    // Braços e equipamento de autodefesa
    this.rect(ctx, 8, 21, 3, 8, '#065f46');
    this.rect(ctx, 25, 21, 3, 8, '#065f46');
    this.rect(ctx, 7, 28, 4, 3, '#18181b');
    this.rect(ctx, 25, 28, 4, 3, '#18181b');

    // Equipamento de autodefesa na diagonal
    this.line(ctx, 28, 20, 10, 32, '#18181b');
    this.line(ctx, 29, 20, 11, 32, '#27272a');
    this.rect(ctx, 27, 19, 4, 3, '#78350f');

    // Cinto tático com cantil e coldre
    this.rect(ctx, 11, 32, 14, 2, '#18181b');
    this.rect(ctx, 23, 32, 3, 4, '#27272a');

    // Calça tática camuflada
    this.rect(ctx, 12, 34, 5, 6, '#065f46');
    this.rect(ctx, 19, 34, 5, 6, '#042f2e');
    this.rect(ctx, 11, 36, 2, 3, '#14532d');

    // Coturnos de selva pretos
    this.rect(ctx, 11, 40, 6, 3, '#18181b');
    this.rect(ctx, 19, 40, 6, 3, '#18181b');
    this.line(ctx, 11, 42, 17, 42, '#27272a');
    this.line(ctx, 19, 42, 25, 42, '#27272a');

    this.finalizeCanvas(scene, 'unit_guarda');
  }

  // 8. Palafita Ribeirinha e Roçado do Campo HD (64x64: palafita de madeira, telhado de palha, varanda e cultivo)
  private static generateHDFarm(scene: Phaser.Scene): void {
    const ctx = this.initCanvas(scene, 'prop_farm', 64, 64);
    if (!ctx) return;

    // Canteiros agrícolas de terra fértil arada em sulcos isométricos
    this.poly(ctx, [[4, 46], [32, 60], [60, 46], [32, 32]], '#3f6212');
    for (let row = -14; row <= 14; row += 5) {
      this.line(ctx, 16 + row, 48 + row * 0.5, 48 + row, 32 + row * 0.5, '#78350f');
      for (let s = 0; s < 5; s++) {
        const mx = 20 + row + s * 6;
        const my = 46 + row * 0.5 - s * 3;
        this.px(ctx, mx, my, '#65a30d');
        this.px(ctx, mx, my - 1, '#84cc16');
      }
    }

    // Estacas/pilotis de madeira suspensa da palafita
    const stilts = [18, 28, 38, 48];
    for (const sx of stilts) {
      this.line(ctx, sx, 34, sx, 44, '#451a03');
      this.line(ctx, sx + 1, 34, sx + 1, 44, '#78350f');
    }

    // Piso e paredes de tábuas de madeira da casa ribeirinha
    this.poly(ctx, [[16, 24], [34, 33], [34, 42], [16, 33]], '#ca8a04');
    this.poly(ctx, [[34, 33], [52, 24], [52, 33], [34, 42]], '#a16207');
    this.rect(ctx, 22, 28, 5, 4, '#0f172a');
    this.rect(ctx, 38, 28, 6, 10, '#451a03');

    // Varandinha com parapeito
    this.line(ctx, 16, 38, 34, 47, '#fef08a');
    this.line(ctx, 34, 47, 52, 38, '#ca8a04');
    this.line(ctx, 18, 39, 28, 43, '#cbd5e1');

    // Telhado de palha/cavaco trançado em duas águas isométricas
    this.poly(ctx, [[14, 22], [34, 32], [54, 22], [34, 12]], '#eab308');
    for (let offset = -8; offset <= 8; offset += 3) {
      this.line(ctx, 24 + offset, 17 + offset * 0.5, 34 + offset, 22 + offset * 0.5, '#fef08a');
      this.line(ctx, 24 + offset, 18 + offset * 0.5, 34 + offset, 23 + offset * 0.5, '#ca8a04');
    }
    this.line(ctx, 34, 12, 34, 22, '#ca8a04');

    this.finalizeCanvas(scene, 'prop_farm');
  }

  // 9. Casa Popular Brasileira/Amazônica HD (128x128: modelo da foto com alta riqueza e fidelidade)
  private static generateHDCityHouse(scene: Phaser.Scene): void {
    const keys = ['casa_isometrica', 'prop_city_house'];
    for (const key of keys) {
      if (scene.textures.exists(key)) {
        scene.textures.remove(key);
      }
    }

    const W = 128;
    const H = 128;
    const canvasTex = scene.textures.createCanvas('casa_isometrica', W, H);
    if (!canvasTex) return;
    const ctx = canvasTex.getContext();
    ctx.clearRect(0, 0, W, H);

    // 1. Base isométrica (calçada, meio-fio e asfalto da sarjeta)
    this.poly(ctx, [[64, 122], [122, 93], [122, 101], [64, 127]], '#111827');
    this.poly(ctx, [[64, 122], [122, 93], [120, 91], [64, 120]], '#1e293b');
    for (let i = 0; i < 32; i++) {
      const bx = 66 + ((i * 37) % 52);
      const by = 94 + ((i * 23) % 28);
      this.px(ctx, bx, by, '#334155');
    }

    this.line(ctx, 14, 97, 64, 122, '#475569');
    this.line(ctx, 14, 96, 64, 121, '#64748b');
    this.line(ctx, 64, 122, 120, 94, '#475569');
    this.line(ctx, 64, 121, 119, 93, '#64748b');

    this.poly(ctx, [[14, 96], [64, 121], [119, 93], [69, 68]], '#cbd5e1');
    this.line(ctx, 38, 84, 88, 109, '#94a3b8');
    this.line(ctx, 64, 71, 64, 120, '#94a3b8');
    this.line(ctx, 42, 98, 48, 103, '#64748b');
    this.line(ctx, 48, 103, 46, 109, '#64748b');
    this.line(ctx, 84, 100, 91, 103, '#64748b');
    this.line(ctx, 91, 103, 95, 99, '#64748b');
    this.px(ctx, 40, 110, '#16a34a'); this.px(ctx, 41, 109, '#22c55e');
    this.px(ctx, 72, 116, '#16a34a'); this.px(ctx, 73, 115, '#22c55e');

    ctx.fillStyle = '#334155';
    ctx.beginPath();
    ctx.ellipse(82, 102, 7, 3.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    ctx.stroke();

    // 2. Paredes azul piscina com manchas de mofo e umidade
    this.poly(ctx, [[38, 56], [66, 70], [66, 101], [38, 87]], '#38bdf8');
    for (let x = 38; x <= 65; x++) {
      const mH = 3 + ((x * 7) % 7);
      const baseY = 87 + Math.floor((x - 38) * 0.5);
      this.rect(ctx, x, baseY - mH, 1, mH, '#78350f');
      this.px(ctx, x, baseY - mH - 1, '#a16207');
    }

    this.poly(ctx, [[66, 70], [98, 54], [98, 85], [66, 101]], '#0284c7');
    for (let x = 66; x <= 97; x++) {
      const mH = 2 + ((x * 5) % 6);
      const baseY = 101 - Math.floor((x - 66) * 0.5);
      this.rect(ctx, x, baseY - mH, 1, mH, '#0369a1');
    }
    this.rect(ctx, 74, 66, 3, 5, '#075985');
    this.rect(ctx, 88, 59, 2, 4, '#075985');

    // 3. Porta de madeira
    this.rect(ctx, 54, 76, 10, 22, '#451a03');
    this.rect(ctx, 55, 77, 8, 20, '#78350f');
    this.rect(ctx, 56, 79, 6, 7, '#5c2406');
    this.rect(ctx, 56, 88, 6, 8, '#5c2406');
    this.px(ctx, 61, 87, '#fde047');
    this.px(ctx, 62, 87, '#eab308');
    this.rect(ctx, 57, 70, 4, 3, '#0f172a');
    this.px(ctx, 58, 71, '#38bdf8');

    // 4. Janela com grades de ferro na parede lateral
    this.rect(ctx, 74, 63, 18, 14, '#f8fafc');
    this.rect(ctx, 76, 65, 14, 10, '#0f172a');
    const barX = [78, 81, 83, 86, 88];
    for (const bx of barX) {
      this.line(ctx, bx, 65, bx, 74, '#1e293b');
      this.px(ctx, bx, 67, '#94a3b8');
      this.px(ctx, bx, 71, '#94a3b8');
    }

    // 5. Muro baixo e portão verde
    this.poly(ctx, [[22, 68], [48, 81], [48, 96], [22, 83]], '#38bdf8');
    this.poly(ctx, [[22, 67], [48, 80], [50, 81], [24, 68]], '#e2e8f0');
    this.rect(ctx, 28, 80, 8, 4, '#78350f');
    this.rect(ctx, 38, 86, 6, 5, '#78350f');

    this.poly(ctx, [[48, 81], [58, 86], [58, 100], [48, 96]], '#0284c7');

    this.line(ctx, 58, 86, 70, 92, '#15803d');
    this.line(ctx, 58, 100, 70, 106, '#15803d');
    this.line(ctx, 58, 86, 58, 100, '#16a34a');
    this.line(ctx, 70, 92, 70, 106, '#16a34a');
    for (let gx = 60; gx < 70; gx += 2) {
      const gy0 = 86 + Math.floor((gx - 58) * 0.5);
      const gy1 = 100 + Math.floor((gx - 58) * 0.5);
      this.line(ctx, gx, gy0, gx, gy1, '#15803d');
      this.px(ctx, gx, gy0 + 2, '#4ade80');
      this.px(ctx, gx, gy0 + 6, '#22c55e');
    }
    this.px(ctx, 68, 98, '#cbd5e1');

    // 6. Vasos com samambaias
    this.poly(ctx, [[49, 93], [53, 93], [52, 97], [50, 97]], '#b45309');
    this.px(ctx, 48, 91, '#15803d'); this.px(ctx, 49, 90, '#22c55e'); this.px(ctx, 51, 89, '#4ade80');
    this.px(ctx, 53, 90, '#22c55e'); this.px(ctx, 54, 91, '#15803d'); this.px(ctx, 51, 92, '#16a34a');

    this.poly(ctx, [[99, 83], [103, 83], [102, 87], [100, 87]], '#b45309');
    this.px(ctx, 98, 81, '#15803d'); this.px(ctx, 99, 80, '#22c55e'); this.px(ctx, 101, 79, '#4ade80');
    this.px(ctx, 103, 80, '#22c55e'); this.px(ctx, 104, 81, '#15803d');

    // 7. Cachorrinho Vira-Lata Caramelo
    ctx.fillStyle = '#090d0a44';
    ctx.beginPath();
    ctx.ellipse(78, 102, 5, 2.5, 0, 0, Math.PI * 2);
    ctx.fill();

    this.rect(ctx, 76, 95, 5, 6, '#f59e0b');
    this.rect(ctx, 75, 98, 7, 3, '#d97706');
    this.rect(ctx, 76, 101, 2, 2, '#f59e0b');
    this.px(ctx, 80, 101, '#d97706');
    this.rect(ctx, 76, 91, 5, 4, '#f59e0b');
    this.px(ctx, 75, 92, '#b45309'); this.px(ctx, 75, 93, '#b45309'); this.px(ctx, 81, 92, '#b45309');
    this.px(ctx, 75, 93, '#18181b');
    this.px(ctx, 77, 92, '#18181b');
    this.line(ctx, 76, 94, 80, 94, '#ef4444');
    this.px(ctx, 81, 97, '#f59e0b'); this.px(ctx, 82, 96, '#f59e0b');

    // 8. Telhado cerâmico terracota canelado
    this.poly(ctx, [[52, 34], [80, 48], [64, 60], [32, 44]], '#c2410c');
    this.poly(ctx, [[80, 48], [102, 59], [64, 60]], '#991b1b');

    for (let offset = 0; offset <= 26; offset += 3) {
      const rx0 = 52 - offset * 0.7;
      const ry0 = 34 + offset * 0.35;
      const rx1 = 80 - offset * 0.7;
      const ry1 = 48 + offset * 0.35;
      this.line(ctx, rx0, ry0, rx1, ry1, '#ea580c');
      this.line(ctx, rx0 + 1, ry0, rx1 + 1, ry1, '#c2410c');
      this.line(ctx, rx0 + 2, ry0, rx1 + 2, ry1, '#7c2d12');
    }

    for (let offset = 0; offset <= 20; offset += 3) {
      const lx0 = 80 + offset * 0.7;
      const ly0 = 48 + offset * 0.35;
      const lx1 = 64 + offset * 0.7;
      const ly1 = 60 + offset * 0.35;
      this.line(ctx, lx0, ly0, lx1, ly1, '#c2410c');
      this.line(ctx, lx0 + 1, ly0, lx1 + 1, ly1, '#7c2d12');
    }

    this.line(ctx, 52, 34, 80, 48, '#fb923c');
    this.line(ctx, 52, 35, 80, 49, '#c2410c');

    this.poly(ctx, [[36, 56], [66, 71], [66, 74], [36, 59]], '#090d0a55');
    this.poly(ctx, [[66, 71], [98, 55], [98, 58], [66, 74]], '#090d0a55');

    // 9. Caixa d'água FORTLEV
    this.rect(ctx, 53, 20, 22, 15, '#0284c7');
    ctx.fillStyle = '#0369a1';
    ctx.beginPath();
    ctx.ellipse(64, 19, 11, 4.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.ellipse(64, 18, 9, 3.5, 0, 0, Math.PI * 2);
    ctx.fill();

    this.line(ctx, 53, 22, 75, 22, '#075985');
    this.line(ctx, 53, 27, 75, 27, '#075985');
    this.line(ctx, 53, 33, 75, 33, '#075985');

    this.rect(ctx, 54, 28, 20, 5, '#ffffff');
    this.px(ctx, 55, 29, '#0369a1'); this.px(ctx, 56, 29, '#0369a1'); this.px(ctx, 55, 30, '#0369a1'); this.px(ctx, 56, 30, '#0369a1'); this.px(ctx, 55, 31, '#0369a1');
    this.px(ctx, 58, 29, '#0369a1'); this.px(ctx, 58, 30, '#0369a1'); this.px(ctx, 58, 31, '#0369a1'); this.px(ctx, 59, 29, '#0369a1'); this.px(ctx, 59, 31, '#0369a1');
    this.px(ctx, 61, 29, '#0369a1'); this.px(ctx, 61, 30, '#0369a1'); this.px(ctx, 61, 31, '#0369a1'); this.px(ctx, 62, 29, '#0369a1'); this.px(ctx, 62, 31, '#0369a1');
    this.px(ctx, 64, 29, '#0369a1'); this.px(ctx, 65, 29, '#0369a1'); this.px(ctx, 66, 29, '#0369a1'); this.px(ctx, 65, 30, '#0369a1'); this.px(ctx, 65, 31, '#0369a1');
    this.px(ctx, 68, 29, '#0369a1'); this.px(ctx, 68, 30, '#0369a1'); this.px(ctx, 68, 31, '#0369a1'); this.px(ctx, 69, 31, '#0369a1');
    this.px(ctx, 71, 29, '#0369a1'); this.px(ctx, 71, 30, '#0369a1'); this.px(ctx, 71, 31, '#0369a1'); this.px(ctx, 72, 29, '#0369a1'); this.px(ctx, 72, 30, '#0369a1'); this.px(ctx, 72, 31, '#0369a1');

    // 10. Antena de TV
    this.line(ctx, 77, 12, 77, 30, '#cbd5e1');
    this.line(ctx, 72, 14, 82, 14, '#94a3b8');
    this.line(ctx, 73, 17, 81, 17, '#94a3b8');
    this.line(ctx, 74, 20, 80, 20, '#94a3b8');
    this.line(ctx, 75, 23, 79, 23, '#94a3b8');

    // 11. Poste de concreto, transformador e fios coloridos
    this.rect(ctx, 22, 18, 3, 78, '#94a3b8');
    this.rect(ctx, 25, 18, 1, 78, '#475569');

    this.rect(ctx, 14, 22, 18, 3, '#78350f');
    this.rect(ctx, 15, 19, 2, 3, '#78350f'); this.px(ctx, 15, 18, '#f8fafc'); this.px(ctx, 16, 18, '#f8fafc');
    this.rect(ctx, 22, 19, 2, 3, '#78350f'); this.px(ctx, 22, 18, '#f8fafc'); this.px(ctx, 23, 18, '#f8fafc');
    this.rect(ctx, 29, 19, 2, 3, '#78350f'); this.px(ctx, 29, 18, '#f8fafc'); this.px(ctx, 30, 18, '#f8fafc');

    this.rect(ctx, 18, 38, 6, 12, '#334155');
    this.line(ctx, 18, 41, 23, 41, '#1e293b');
    this.line(ctx, 18, 45, 23, 45, '#1e293b');
    this.line(ctx, 18, 48, 23, 48, '#1e293b');

    this.line(ctx, 50, 50, 50, 56, '#475569');

    const wires = [
      { color: '#ef4444', y0: 42, sag: 5 },
      { color: '#2563eb', y0: 44, sag: 7 },
      { color: '#16a34a', y0: 46, sag: 9 },
      { color: '#facc15', y0: 48, sag: 11 }
    ];
    for (const w of wires) {
      for (let step = 0; step <= 27; step++) {
        const t = step / 27;
        const wx = 23 + t * (50 - 23);
        const wy = w.y0 + t * (52 - w.y0) + Math.sin(t * Math.PI) * w.sag;
        this.px(ctx, wx, wy, w.color);
      }
    }

    this.finalizeCanvas(scene, 'casa_isometrica');

    const propTex = scene.textures.createCanvas('prop_city_house', W, H);
    if (propTex) {
      const pctx = propTex.getContext();
      pctx.drawImage(canvasTex.getSourceImage() as unknown as CanvasImageSource, 0, 0);
      this.finalizeCanvas(scene, 'prop_city_house');
    }
  }

  // 10. Fortaleza Corporativa do Burguês HD (80x88: bloco de concreto e aço blindado, vidros fumê, torres e holofotes)
  private static generateHDBoss(scene: Phaser.Scene): void {
    const ctx = this.initCanvas(scene, 'boss_fortress', 80, 88);
    if (!ctx) return;

    // Sombra da fortaleza no solo
    ctx.fillStyle = '#090d0a66';
    ctx.beginPath();
    ctx.ellipse(40, 78, 36, 12, 0, 0, Math.PI * 2);
    ctx.fill();

    // Base de concreto armado e fundações
    this.poly(ctx, [[14, 48], [40, 62], [66, 48], [40, 34]], '#18181b');

    // Paredes maciças blindadas de aço escuro
    this.poly(ctx, [[14, 32], [40, 46], [40, 76], [14, 62]], '#27272a');
    this.poly(ctx, [[40, 46], [66, 32], [66, 62], [40, 76]], '#18181b');

    // Linhas de blindagem e rebites metálicos
    this.line(ctx, 14, 42, 40, 56, '#3f3f46');
    this.line(ctx, 14, 52, 40, 66, '#3f3f46');
    this.line(ctx, 40, 56, 66, 42, '#09090b');
    this.line(ctx, 40, 66, 66, 52, '#09090b');

    // Janelas espelhadas fumê com reflexos dourados
    for (let row = 0; row < 3; row++) {
      const wy = 36 + row * 9;
      this.poly(ctx, [[20, wy], [32, wy + 6], [32, wy + 10], [20, wy + 4]], '#eab308');
      this.poly(ctx, [[22, wy + 1], [30, wy + 5], [30, wy + 8], [22, wy + 4]], '#ca8a04');
      this.poly(ctx, [[48, wy + 6], [60, wy], [60, wy + 4], [48, wy + 10]], '#a16207');
    }

    // Portão blindado maciço no centro
    this.poly(ctx, [[34, 64], [46, 58], [46, 73], [34, 79]], '#09090b');
    this.line(ctx, 40, 61, 40, 76, '#ef4444');

    // Torres de vigilância no topo com holofotes vermelhos
    this.rect(ctx, 16, 20, 10, 14, '#27272a');
    this.rect(ctx, 18, 16, 6, 4, '#3f3f46');
    this.px(ctx, 20, 14, '#ef4444');
    this.px(ctx, 21, 14, '#f87171');

    this.rect(ctx, 54, 20, 10, 14, '#18181b');
    this.rect(ctx, 56, 16, 6, 4, '#27272a');
    this.px(ctx, 58, 14, '#ef4444');
    this.px(ctx, 59, 14, '#f87171');

    // Heliporto e antenas corporativas no teto central
    this.poly(ctx, [[26, 26], [40, 33], [54, 26], [40, 19]], '#3f3f46');
    this.line(ctx, 40, 12, 40, 19, '#94a3b8');
    this.line(ctx, 37, 14, 43, 14, '#cbd5e1');
    this.px(ctx, 40, 11, '#ef4444');

    this.finalizeCanvas(scene, 'boss_fortress');
  }
}
