import Phaser from 'phaser';

/**
 * Gera todas as texturas em Pixel Art diretamente via Canvas no BootScene.
 * Respeita rigorosamente a regra visual do GDD:
 * - Cores vivas na resistência (verde da mata, azul dos rios, tons quentes da cidade viva)
 * - Fumaça tóxica evolui estritamente de cinza claro até preto denso e absoluto (SEM laranja/vermelho na fumaça).
 */
export class PixelArtGenerator {
  public static generateAll(scene: Phaser.Scene): void {
    // 1. Brigada Voluntária (Camiseta branca/verde, chapéu de palha, abafador simples)
    this.drawPixelSprite(scene, 'unit_voluntario', 16, 16, [
      '.....YYYYYY.....',
      '....YYYYYYYY....',
      '.....SSSSSS.....',
      '.....SKSSKS.....',
      '.....SSSSSS.....',
      '....GGGGGGGG....',
      '...GGGGWWGGGG...',
      '...GGGGGGGGGG...',
      '...SS.GGGG.SS...',
      '......BBBB......',
      '.....BB..BB.....',
      '.....BB..BB.....',
      '....DDD..DDD....',
      '................',
      '................',
      '................'
    ], {
      Y: '#eab308',
      S: '#d97706',
      K: '#111827',
      G: '#22c55e',
      W: '#f8fafc',
      B: '#1d4ed8',
      D: '#451a03'
    });

    // 2. Brigadista Comunitário (Capacete amarelo, uniforme equipado laranja/verde vivo e mangueira azul)
    this.drawPixelSprite(scene, 'unit_brigadista', 16, 16, [
      '.....YYYYYY.....',
      '....YYYYYYYY....',
      '....GGGGGGGG....',
      '.....SKSSKS.....',
      '.....SSSSSS.....',
      '...OOOOOOOOOO...',
      '..OOYYOOOOYYOO..',
      '..OOOOOOOOOOOO..',
      '..SS.OOOOOO.CC..',
      '.....OOOOOO.CC..',
      '.....BBBBBB.....',
      '....BBB..BBB....',
      '....BBB..BBB....',
      '....KKK..KKK....',
      '................',
      '................'
    ], {
      Y: '#facc15',
      G: '#16a34a',
      S: '#b45309',
      K: '#090d0a',
      O: '#ea580c',
      C: '#38bdf8',
      B: '#1e3a8a'
    });

    // 3. Guarda Florestal Comunitário Armado (Autodefesa - Boina/cocar verde-floresta, equipamento de elite)
    this.drawPixelSprite(scene, 'unit_guarda', 16, 16, [
      '....GGGGGGGG....',
      '...GYYGGGGYYG...',
      '....GGGGGGGG....',
      '.....SKSSKS.....',
      '.....SSSSSS.....',
      '...EEEEEEEEEE...',
      '..EEYYEEEEYYEE..',
      '..EEEEEEEEEEEEKK',
      '..SS.EEEEEE.KKKK',
      '.....EEEEEE...KK',
      '.....DDDDDD.....',
      '....DDD..DDD....',
      '....DDD..DDD....',
      '....KKK..KKK....',
      '................',
      '................'
    ], {
      G: '#15803d',
      Y: '#fde047',
      S: '#92400e',
      K: '#18181b',
      E: '#065f46',
      D: '#14532d'
    });

    // 4. Incendiário / Grileiro (Agente do Caos - Cinza/escuro furtivo com tocha)
    this.drawPixelSprite(scene, 'enemy_incendiario', 16, 16, [
      '.....KKKKKK...FF',
      '....KKKKKKKK..FY',
      '....KRRRRRRK..FF',
      '.....SKSSKS...T.',
      '....KKKKKKKK.TT.',
      '...KKKKKKKKKKT..',
      '...KKKKKKKKKK...',
      '...SS.KKKK.SS...',
      '......KKKK......',
      '.....KK..KK.....',
      '.....KK..KK.....',
      '....KKK..KKK....',
      '................',
      '................',
      '................',
      '................'
    ], {
      K: '#27272a',
      R: '#dc2626',
      S: '#a16207',
      F: '#ef4444',
      Y: '#facc15',
      T: '#78350f'
    });

    // 5. Foco de Fogo (Chamas vivas destrutivas no chão)
    this.drawPixelSprite(scene, 'fire_node', 16, 16, [
      '.......RR.......',
      '......RFFR......',
      '.....RFFYFR.....',
      '....RFFYYFFR....',
      '...RFFYYYYFFR...',
      '..RFFYYWWYYFFR..',
      '..RFFYYYYYYFFR..',
      '..RFFFYYYYFFFR..',
      '...RFFFFFFFFR...',
      '....RRRRRRRR....',
      '...TTTTTTTTTT...',
      '................',
      '................',
      '................',
      '................',
      '................'
    ], {
      R: '#b91c1c',
      F: '#f97316',
      Y: '#fde047',
      W: '#ffffff',
      T: '#27272a'
    });

    // 6. Nuvens de Fumaça Tóxica (4 estágios: Cinza Claro -> Cinza Médio -> Cinza Escuro -> Preto Absoluto)
    // ESTRITAMENTE SEM TONS DE LARANJA OU VERMELHO
    const smokeShades: Array<{ key: string; main: string; edge: string; core: string }> = [
      { key: 'smoke_1', main: '#d4d4d8', edge: '#e4e4e7', core: '#a1a1aa' },
      { key: 'smoke_2', main: '#71717a', edge: '#a1a1aa', core: '#52525b' },
      { key: 'smoke_3', main: '#27272a', edge: '#3f3f46', core: '#18181b' },
      { key: 'smoke_4', main: '#000000', edge: '#09090b', core: '#000000' }
    ];

    for (const s of smokeShades) {
      this.drawPixelSprite(scene, s.key, 16, 16, [
        '....EEEEEEEE....',
        '..EEMMMMMMMMEE..',
        '.EMMMMMMMMMMMME.',
        'EMMMMCCCCCCMMMME',
        'EMMMCCCCCCCCMMME',
        'EMMCCCCCCCCCCMME',
        'EMMCCCCCCCCCCMME',
        'EMMMCCCCCCCCMMME',
        '.EMMMMCCCCMMMME.',
        '..EEMMMMMMMMEE..',
        '....EEEEEEEE....',
        '................',
        '................',
        '................',
        '................',
        '................'
      ], {
        E: s.edge,
        M: s.main,
        C: s.core
      });
    }

    // 7. Árvore da Floresta Viva (Tapajós)
    this.drawPixelSprite(scene, 'prop_tree', 16, 16, [
      '.....GGGGGG.....',
      '...GGGGGGGGGG...',
      '..GGGLLLLLLGGG..',
      '.GGGLLLLLLLLGGG.',
      '.GGLLLLLLLLLLGG.',
      '.GGGLLLLLLLLGGG.',
      '..GGGGGGGGGGGG..',
      '....GGGGGGGG....',
      '......TTTT......',
      '......TTTT......',
      '.....TTTTTT.....',
      '................',
      '................',
      '................',
      '................',
      '................'
    ], {
      G: '#15803d',
      L: '#22c55e',
      T: '#78350f'
    });

    // 8. Prédio/Casa Viva de Santarém (Cidade)
    this.drawPixelSprite(scene, 'prop_city_house', 16, 16, [
      '....RRRRRRRR....',
      '..RRRRRRRRRRRR..',
      '.RRRRRRRRRRRRRR.',
      '..WWWWWWWWWWWW..',
      '..WCCWWCCWWCCW..',
      '..WCCWWCCWWCCW..',
      '..WWWWWWWWWWWW..',
      '..WCCWWDDWWCCW..',
      '..WCCWWDDWWCCW..',
      '..WWWWWWWWWWWW..',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................'
    ], {
      R: '#ea580c',
      W: '#fef3c7',
      C: '#38bdf8',
      D: '#92400e'
    });

    // 9. Roçado / Casa Ribeirinha (Campo)
    this.drawPixelSprite(scene, 'prop_farm', 16, 16, [
      '.....YYYYYY.....',
      '...YYYYYYYYYY...',
      '..YYYYYYYYYYYY..',
      '...WWWWWWWWWW...',
      '...WDDWWWWCCW...',
      '...WDDWWWWWWWW..',
      '.GGGGGGGGGGGGGG.',
      '.GLGLGLGLGLGLGL.',
      '.GGGGGGGGGGGGGG.',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................'
    ], {
      Y: '#ca8a04',
      W: '#fde68a',
      D: '#78350f',
      C: '#0284c7',
      G: '#4d7c0f',
      L: '#84cc16'
    });

    // 10. Fortaleza do Burguês (Chefão Final - Fase 6)
    this.drawPixelSprite(scene, 'boss_fortress', 24, 24, [
      '..KKK..............KKK..',
      '..KKK..............KKK..',
      '..KKK....GGGGGG....KKK..',
      '..KKK...GGGGGGGG...KKK..',
      '.KKKKK..GGKKKKGG..KKKKK.',
      '.KKKKKKKGGGGGGGGKKKKKKK.',
      '.KKKKKKKKKKKKKKKKKKKKKK.',
      '.KKRRKKRRKKYYKKRRKKRRKK.',
      '.KKRRKKRRKKYYKKRRKKRRKK.',
      '.KKKKKKKKKKKKKKKKKKKKKK.',
      '.KKKKGGGGGGGGGGGGGGKKKK.',
      '.KKKKGYYYYYYYYYYYYGKKKK.',
      '.KKKKGYKKKKKKKKKKYGKKKK.',
      '.KKKKGYYYYYYYYYYYYGKKKK.',
      '.KKKKGGGGGGGGGGGGGGKKKK.',
      '.KKKKKKKKKKKKKKKKKKKKKK.',
      'KKKKKKKKKKKKKKKKKKKKKKKK',
      '========================',
      '........................',
      '........................',
      '........................',
      '........................',
      '........................',
      '........................'
    ], {
      K: '#18181b',
      G: '#52525b',
      Y: '#eab308',
      R: '#ef4444',
      '=': '#09090b'
    });
  }

  private static drawPixelSprite(
    scene: Phaser.Scene,
    key: string,
    width: number,
    height: number,
    rows: string[],
    palette: Record<string, string>
  ): void {
    if (scene.textures.exists(key)) {
      return;
    }
    const scale = 2; // Gera 32x32 ou 48x48 nítido
    const canvasTex = scene.textures.createCanvas(key, width * scale, height * scale);
    if (!canvasTex) return;
    const ctx = canvasTex.getContext();
    ctx.clearRect(0, 0, width * scale, height * scale);

    for (let y = 0; y < rows.length; y++) {
      const row = rows[y];
      for (let x = 0; x < row.length; x++) {
        const ch = row[x];
        if (ch !== '.' && palette[ch]) {
          ctx.fillStyle = palette[ch];
          ctx.fillRect(x * scale, y * scale, scale, scale);
        }
      }
    }
    canvasTex.refresh();
  }
}
