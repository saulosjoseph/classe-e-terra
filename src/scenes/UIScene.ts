import Phaser from 'phaser';
import {
  BALANCE,
  CAMPO_RADIUS,
  CAMPO_RADIUS_Y,
  CITY_RADIUS,
  FLORESTA_OUTER_RADIUS,
  FLORESTA_OUTER_RADIUS_Y,
  GAME_HEIGHT,
  GAME_WIDTH,
  HUD_BOTTOM_HEIGHT,
  HUD_TOP_HEIGHT,
  ISO_Y_RATIO,
  MAP_BOTTOM_Y,
  MAP_TOP_Y,
  MAP_VIEWPORT_HEIGHT,
  WORLD_CENTER_X,
  WORLD_CENTER_Y
} from '../config/GameBalance';
import { SoundManager } from '../audio/SoundManager';
import { OptionsMenu } from '../ui/OptionsMenu';
import { toggleGameFullscreen } from '../systems/FullscreenManager';
import {
  IntegratedActionType,
  LocalActionType,
  PoliticalPhaseDefinition,
  SectorType
} from '../types/GameTypes';
import { GameScene } from './GameScene';

/** Intervalo mínimo entre redesenhos do minimapa (o mapa não precisa de 60 atualizações por segundo) */
const MINIMAP_REFRESH_MS = 100;

interface TouchActionButton {
  key: string;
  rect: Phaser.GameObjects.Rectangle;
  cooldownOverlay: Phaser.GameObjects.Rectangle;
  titleText: Phaser.GameObjects.Text;
  subText: Phaser.GameObjects.Text;
  width: number;
  height: number;
}

/**
 * HUD Mobile-First em Paisagem (Landscape 720x405):
 * - Topo (0..54px): Saúde da Floresta (esquerda), Fase Política e Status (centro), Consciência Coletiva (direita).
 * - Base / Zona dos Polegares (323..405px): Abas laterais rápidas + 4 ou 5 botões largos lado a lado.
 * - Canto superior direito do viewport do mapa: Radar circular concêntrico interativo.
 */
export class UIScene extends Phaser.Scene {
  private gameScene!: GameScene;
  private optionsMenu!: OptionsMenu;

  private topBarsGraphics!: Phaser.GameObjects.Graphics;
  private forestValueText!: Phaser.GameObjects.Text;
  private consciousnessValueText!: Phaser.GameObjects.Text;
  private phaseTitleText!: Phaser.GameObjects.Text;
  private statusChipsText!: Phaser.GameObjects.Text;
  private bannerContainer!: Phaser.GameObjects.Container;
  private bannerTitle!: Phaser.GameObjects.Text;
  private bannerSub!: Phaser.GameObjects.Text;

  private activeTab: 'INTEGRATED' | 'DEFENSE' = 'INTEGRATED';
  private tabIntegratedBg!: Phaser.GameObjects.Rectangle;
  private tabDefenseBg!: Phaser.GameObjects.Rectangle;
  private integratedContainer!: Phaser.GameObjects.Container;
  private defenseContainer!: Phaser.GameObjects.Container;

  private integratedButtons: Map<IntegratedActionType, TouchActionButton> = new Map();
  private defenseButtons: Map<string, TouchActionButton> = new Map();
  private minimapGraphics!: Phaser.GameObjects.Graphics;
  private currentSectorBadge!: Phaser.GameObjects.Text;
  private cameraFollowChip!: Phaser.GameObjects.Text;
  private readonly minimapX = GAME_WIDTH - 48;
  private readonly minimapY = MAP_TOP_Y + 46;
  private readonly minimapRadius = 36;
  private lastMinimapAt = -Infinity;
  private barPositions!: { x: number; y1: number; y2: number; width: number; height: number };

  constructor() {
    super('UIScene');
  }

  public init(data: { gameScene: GameScene }): void {
    this.gameScene = data.gameScene;
    this.activeTab = 'INTEGRATED';
    this.integratedButtons.clear();
    this.defenseButtons.clear();
  }

  public create(): void {
    // Menu superior removido - informações aparecem como badges
    // this.createTopHud();
    this.createMapNavigationOverlay();
    // Menu de ações removido
    // this.createBottomThumbPanel();
    this.createPhaseBanner();
    this.createStoryModal();

    this.optionsMenu = new OptionsMenu(this, this.gameScene);
    if (this.input.keyboard) {
      this.input.keyboard.on('keydown-ESC', () => this.optionsMenu.toggle());
    }

    this.gameScene.events.on('show-donation-info', this.showDonationInfoModal, this);
    this.gameScene.events.on('show-trabalhador-info', this.showTrabalhadorInfoModal, this);
    this.gameScene.events.on('prefeitura-clicked', this.showPrefeituraInfoModal, this);
    this.gameScene.events.on('house-clicked', this.showHouseDonationPanel, this);
    this.gameScene.events.on('brigadista-base-clicked', this.showBrigadistaBaseModal, this);
    this.gameScene.events.on('aldeia-clicked', this.showAldeiaInfoModal, this);
    this.gameScene.events.on('bombeiros-base-clicked', this.showBombeirosBaseModal, this);
    this.events.once('shutdown', () => {
      this.gameScene.events.off('show-donation-info', this.showDonationInfoModal, this);
      this.gameScene.events.off('show-trabalhador-info', this.showTrabalhadorInfoModal, this);
      this.gameScene.events.off('prefeitura-clicked', this.showPrefeituraInfoModal, this);
      this.gameScene.events.off('house-clicked', this.showHouseDonationPanel, this);
      this.gameScene.events.off('brigadista-base-clicked', this.showBrigadistaBaseModal, this);
      this.gameScene.events.off('aldeia-clicked', this.showAldeiaInfoModal, this);
      this.gameScene.events.off('bombeiros-base-clicked', this.showBombeirosBaseModal, this);
    });

    this.gameScene.phaseSystem.on(
      'phase-changed',
      (newPhase: PoliticalPhaseDefinition) => {
        this.showMilestoneBanner(newPhase.milestone, newPhase.description);
      }
    );
  }

  private createTopHud(): void {
    // Fundo minimalista
    this.add
      .rectangle(GAME_WIDTH / 2, HUD_TOP_HEIGHT / 2, GAME_WIDTH, HUD_TOP_HEIGHT, 0x090d0a, 0.85)
      .setStrokeStyle(1, 0x27272a);

    // Saúde da Floresta (Esquerda)
    this.add.text(14, 12, '🌳 FLORESTA:', {
      fontSize: '11px',
      fontStyle: 'bold',
      color: '#4ade80'
    });

    this.forestValueText = this.add
      .text(104, 12, '100%', {
        fontSize: '11px',
        fontStyle: 'bold',
        color: '#ffffff'
      })
      .setOrigin(0, 0);

    // Fase Política e Status (Centro)
    this.phaseTitleText = this.add
      .text(GAME_WIDTH / 2, 12, 'Fase 1: Resistência', {
        fontSize: '11px',
        fontStyle: 'bold',
        color: '#fde047'
      })
      .setOrigin(0.5, 0);

    // Consciência de Classe (Direita)
    this.add.text(GAME_WIDTH - 14, 12, '✊ CONSCIÊNCIA:', {
      fontSize: '11px',
      fontStyle: 'bold',
      color: '#38bdf8'
    })
    .setOrigin(1, 0);

    this.consciousnessValueText = this.add
      .text(GAME_WIDTH - 14, 28, '0%', {
        fontSize: '11px',
        fontStyle: 'bold',
        color: '#ffffff'
      })
      .setOrigin(1, 0);
  }

  private createMapNavigationOverlay(): void {
    this.minimapGraphics = this.add.graphics().setDepth(80);

    const miniZone = this.add
      .zone(this.minimapX, this.minimapY, this.minimapRadius * 2 + 8, this.minimapRadius * 2 + 8)
      .setInteractive({ useHandCursor: true })
      .setDepth(82);

    miniZone.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      SoundManager.unlock();
      const nx = (pointer.x - this.minimapX) / this.minimapRadius;
      const ny = (pointer.y - this.minimapY) / this.minimapRadius;
      const wx = WORLD_CENTER_X + nx * FLORESTA_OUTER_RADIUS;
      const wy = WORLD_CENTER_Y + ny * FLORESTA_OUTER_RADIUS_Y;
      this.gameScene.centerCameraOnPoint(wx, wy, true);
    });

    this.currentSectorBadge = this.add
      .text(12, MAP_TOP_Y + 8, '📍 CIDADE (Centro) • Arraste p/ mover o mapa', {
        fontSize: '10px',
        fontStyle: 'bold',
        color: '#fef08a',
        backgroundColor: '#090d0acc',
        padding: { x: 6, y: 3 }
      })
      .setDepth(80);

    this.cameraFollowChip = this.add
      .text(12, MAP_TOP_Y + 32, '', {
        fontSize: '10px',
        fontStyle: 'bold',
        color: '#fef08a',
        backgroundColor: '#14532dee',
        padding: { x: 7, y: 3 }
      })
      .setInteractive({ useHandCursor: true })
      .setDepth(80)
      .setVisible(false);

    this.cameraFollowChip.on('pointerdown', () => {
      SoundManager.unlock();
      SoundManager.playSelect();
      this.gameScene.stopFollowingEntity();
    });

    // Fase Política no canto inferior esquerdo (como badge)
    this.phaseTitleText = this.add
      .text(12, GAME_HEIGHT - 12, '', {
        fontSize: '10px',
        fontStyle: 'bold',
        color: '#fde047',
        backgroundColor: '#090d0acc',
        padding: { x: 6, y: 3 }
      })
      .setOrigin(0, 1)
      .setDepth(80);

    // Barras de Saúde e Consciência no canto inferior direito
    const barsX = GAME_WIDTH - 140;
    const barY1 = GAME_HEIGHT - 42;
    const barY2 = GAME_HEIGHT - 22;
    const barWidth = 130;
    const barHeight = 14;

    // Label "Saúde da Floresta"
    this.add.text(barsX, barY1 - 2, '🌳 Saúde:', {
      fontSize: '9px',
      fontStyle: 'bold',
      color: '#4ade80'
    })
    .setOrigin(0, 1)
    .setDepth(80);

    // Barra de Saúde (background)
    this.add
      .rectangle(barsX + barWidth / 2, barY1 + 6, barWidth, barHeight, 0x18181b, 1)
      .setStrokeStyle(1, 0x4ade80)
      .setDepth(79);

    // Barra de Saúde (preenchimento) - Graphics para desenhar dinamicamente
    this.topBarsGraphics = this.add.graphics().setDepth(80);

    // Label "Consciência"
    this.add.text(barsX, barY2 - 2, '✊ Consciência:', {
      fontSize: '9px',
      fontStyle: 'bold',
      color: '#38bdf8'
    })
    .setOrigin(0, 1)
    .setDepth(80);

    // Barra de Consciência (background)
    this.add
      .rectangle(barsX + barWidth / 2, barY2 + 6, barWidth, barHeight, 0x18181b, 1)
      .setStrokeStyle(1, 0x38bdf8)
      .setDepth(79);

    // Armazenar posições para usar no update()
    this.barPositions = {
      x: barsX,
      y1: barY1 + 6,
      y2: barY2 + 6,
      width: barWidth,
      height: barHeight
    };

    // Texto de valores
    this.forestValueText = this.add
      .text(barsX + barWidth + 10, barY1 + 6, '', {
        fontSize: '9px',
        fontStyle: 'bold',
        color: '#ffffff'
      })
      .setOrigin(0, 0.5)
      .setDepth(80);

    this.consciousnessValueText = this.add
      .text(barsX + barWidth + 10, barY2 + 6, '', {
        fontSize: '9px',
        fontStyle: 'bold',
        color: '#ffffff'
      })
      .setOrigin(0, 0.5)
      .setDepth(80);

    // Botões de navegação removidos
  }

  // Menu de ações removido - método desabilitado
  /*
  private createBottomThumbPanel(): void {
    this.add
      .rectangle(
        GAME_WIDTH / 2,
        MAP_BOTTOM_Y + HUD_BOTTOM_HEIGHT / 2,
        GAME_WIDTH,
        HUD_BOTTOM_HEIGHT,
        0x090d0a,
        0.98
      )
      .setStrokeStyle(2, 0x27272a);

    // Seletores de Aba na coluna esquerda do painel inferior (x = 72)
    this.tabIntegratedBg = this.add
      .rectangle(72, MAP_BOTTOM_Y + 23, 128, 32, 0x065f46, 1)
      .setStrokeStyle(2, 0x4ade80)
      .setInteractive({ useHandCursor: true });

    this.add
      .text(72, MAP_BOTTOM_Y + 23, '🤝 INTEGRADAS', {
        fontSize: '11px',
        fontStyle: 'bold',
        color: '#ffffff'
      })
      .setOrigin(0.5);

    this.tabDefenseBg = this.add
      .rectangle(72, MAP_BOTTOM_Y + 59, 128, 32, 0x18181b, 1)
      .setStrokeStyle(1.5, 0x52525b)
      .setInteractive({ useHandCursor: true });

    this.add
      .text(72, MAP_BOTTOM_Y + 59, '🧯 DEFESA/UNID.', {
        fontSize: '11px',
        fontStyle: 'bold',
        color: '#e4e4e7'
      })
      .setOrigin(0.5);

    this.tabIntegratedBg.on('pointerdown', () => {
      SoundManager.unlock();
      SoundManager.playSelect();
      this.switchTab('INTEGRATED');
    });

    this.tabDefenseBg.on('pointerdown', () => {
      SoundManager.unlock();
      SoundManager.playSelect();
      this.switchTab('DEFENSE');
    });

    this.integratedContainer = this.add.container(0, 0);
    this.defenseContainer = this.add.container(0, 0);

    this.buildIntegratedButtons();
    this.buildDefenseButtons();
    this.switchTab('INTEGRATED');
  }
  */

  private buildIntegratedButtons(): void {
    const diff = this.gameScene.difficulty;
    const sGain = diff.integratedSectorGain;
    const cGain = diff.captureExposeGain;
    const rowY = MAP_BOTTOM_Y + HUD_BOTTOM_HEIGHT / 2;

    const specs: Array<{
      type: IntegratedActionType;
      x: number;
      title: string;
      sub: string;
      color: number;
    }> = [
      {
        type: IntegratedActionType.CIDADE_PARA_FLORESTA,
        x: 212,
        title: '🏙️➔🌳 EQUIPAR',
        sub: `+${sGain}% Consc.|Turbo`,
        color: 0x0c4a6e
      },
      {
        type: IntegratedActionType.CAMPO_PARA_CIDADE,
        x: 352,
        title: '🌾➔🏙️ ALIMENTO',
        sub: `+${sGain}% Consc.|Alívio`,
        color: 0x713f12
      },
      {
        type: IntegratedActionType.FLORESTA_PARA_CAMPO,
        x: 492,
        title: '🌳➔🌾 NASCENTE',
        sub: `+${sGain}% Consc.|Escudo`,
        color: 0x064e3b
      },
      {
        type: IntegratedActionType.CAPTURA_PARA_CIDADE,
        x: 636,
        title: '📢 EXPOR (0)',
        sub: `+${cGain}% Consc. Imed.!`,
        color: 0x7f1d1d
      }
    ];

    for (const s of specs) {
      const btn = this.createTouchButton(
        this.integratedContainer,
        s.type,
        s.x,
        rowY,
        134,
        66,
        s.title,
        s.sub,
        s.color,
        () => {
          this.gameScene.triggerIntegratedAction(s.type);
        }
      );
      this.integratedButtons.set(s.type, btn);
    }
  }

  private buildDefenseButtons(): void {
    const rowY = MAP_BOTTOM_Y + HUD_BOTTOM_HEIGHT / 2;

    const specs: Array<{
      key: string;
      x: number;
      title: string;
      sub: string;
      color: number;
      onClick: () => void;
    }> = [
      {
        key: 'RECRUIT_GUARDA',
        x: 198,
        title: '🎯 GUARDA',
        sub: 'Requer 50%',
        color: 0x065f46,
        onClick: () => this.gameScene.tryRecruitGuarda()
      },
      {
        key: LocalActionType.CAMPO_ACEIRO,
        x: 312,
        title: '🛡️ ACEIRO',
        sub: 'Anel no Campo',
        color: 0x78350f,
        onClick: () => this.gameScene.triggerLocalAction(LocalActionType.CAMPO_ACEIRO)
      },
      {
        key: LocalActionType.CIDADE_BARREIRA_EXAUSTAO,
        x: 426,
        title: '💨 EXAUSTÃO',
        sub: 'Limpa Fumaça',
        color: 0x1e3a8a,
        onClick: () =>
          this.gameScene.triggerLocalAction(LocalActionType.CIDADE_BARREIRA_EXAUSTAO)
      }
    ];

    for (const s of specs) {
      const btn = this.createTouchButton(
        this.defenseContainer,
        s.key,
        s.x,
        rowY,
        108,
        66,
        s.title,
        s.sub,
        s.color,
        s.onClick
      );
      this.defenseButtons.set(s.key, btn);
    }
  }

  private createTouchButton(
    container: Phaser.GameObjects.Container,
    key: string,
    x: number,
    y: number,
    width: number,
    height: number,
    title: string,
    sub: string,
    fillColor: number,
    onTap: () => void
  ): TouchActionButton {
    const rect = this.add
      .rectangle(x, y, width, height, fillColor, 0.95)
      .setStrokeStyle(2, 0x71717a)
      .setInteractive({ useHandCursor: true });

    const cooldownOverlay = this.add
      .rectangle(x - width / 2, y, 0, height, 0x000000, 0.68)
      .setOrigin(0, 0.5);

    const titleText = this.add
      .text(x, y - 10, title, {
        fontSize: width < 120 ? '11px' : '12px',
        fontStyle: 'bold',
        color: '#ffffff'
      })
      .setOrigin(0.5);

    const subText = this.add
      .text(x, y + 11, sub, {
        fontSize: '9.5px',
        color: '#e2e8f0'
      })
      .setOrigin(0.5);

    rect.on('pointerdown', () => {
      SoundManager.unlock();
      onTap();
    });

    container.add([rect, cooldownOverlay, titleText, subText]);

    return {
      key,
      rect,
      cooldownOverlay,
      titleText,
      subText,
      width,
      height
    };
  }

  private switchTab(tab: 'INTEGRATED' | 'DEFENSE'): void {
    this.activeTab = tab;
    const isInt = tab === 'INTEGRATED';

    this.integratedContainer.setVisible(isInt);
    this.defenseContainer.setVisible(!isInt);

    this.tabIntegratedBg.setFillStyle(isInt ? 0x065f46 : 0x18181b, 1);
    this.tabIntegratedBg.setStrokeStyle(isInt ? 2 : 1, isInt ? 0x4ade80 : 0x52525b);

    this.tabDefenseBg.setFillStyle(!isInt ? 0x065f46 : 0x18181b, 1);
    this.tabDefenseBg.setStrokeStyle(!isInt ? 2 : 1, !isInt ? 0x4ade80 : 0x52525b);
  }

  private createPhaseBanner(): void {
    const bg = this.add
      .rectangle(0, 0, 440, 50, 0x090d0a, 0.94)
      .setStrokeStyle(2, 0xfacc15);

    this.bannerTitle = this.add
      .text(0, -10, '', {
        fontSize: '12px',
        fontStyle: 'bold',
        color: '#fde047'
      })
      .setOrigin(0.5);

    this.bannerSub = this.add
      .text(0, 9, '', {
        fontSize: '10px',
        color: '#f4f4f5',
        align: 'center',
        wordWrap: { width: 420 }
      })
      .setOrigin(0.5);

    this.bannerContainer = this.add
      .container(GAME_WIDTH / 2, MAP_TOP_Y + 34, [bg, this.bannerTitle, this.bannerSub])
      .setDepth(100)
      .setAlpha(0);
  }

  private showMilestoneBanner(title: string, description: string): void {
    this.bannerTitle.setText(`★ ${title}`);
    this.bannerSub.setText(description);
    this.bannerContainer.setAlpha(1);

    this.tweens.killTweensOf(this.bannerContainer);
    this.tweens.add({
      targets: this.bannerContainer,
      alpha: { from: 1, to: 0 },
      delay: 3400,
      duration: 600
    });
  }

  public createStoryModal(): void {
    if (this.gameScene) {
      this.gameScene.isStoryModalOpen = true;
    }

    const storyText =
      'A floresta está queimando e o Velho Estado se mostra incapaz de resolver a situação — seja devido a uma política de ajuste fiscal que privilegia o mercado financeiro e impede investimentos estruturais e de pessoal, seja por se alinhar aos interesses do agronegócio e de empreiteiras que veem no fogo uma oportunidade de expandir as fronteiras de seus negócios. Diante desse cenário, o povo está na linha de frente do combate: sem equipamentos, sem EPIs e sem treinamento. Em meio a isso, os setores mais avançados da população se organizam em brigadas voluntárias, mas sofrem com limitação de recursos e ausência de apoio do Velho Estado.';

    const modalContainer = this.add.container(0, 0).setDepth(200);

    // Fundo escuro semitransparente que bloqueia toques no jogo ao fundo
    const backdrop = this.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.82)
      .setInteractive();

    const boxW = 630;
    const boxH = 300;
    const boxX = GAME_WIDTH / 2;
    const boxY = GAME_HEIGHT / 2;

    const boxBg = this.add
      .rectangle(boxX, boxY, boxW, boxH, 0x090d0a, 0.98)
      .setStrokeStyle(2.5, 0xfacc15);

    const innerBorder = this.add
      .rectangle(boxX, boxY, boxW - 10, boxH - 10, 0x000000, 0)
      .setStrokeStyle(1, 0x15803d);

    // const titleBadge = this.add
    //   .text(boxX, boxY - boxH / 2 + 25, '✊ CONTEXTO HISTÓRICO • A LUTA NO TAPAJÓS', {
    //     fontSize: '13px',
    //     fontStyle: 'bold',
    //     color: '#fde047'
    //   })
    //   .setOrigin(0.5);

    const divider = this.add.graphics();
    divider.lineStyle(1, 0x3f3f46, 0.8);
    divider.lineBetween(
      boxX - boxW / 2 + 24,
      boxY - boxH / 2 + 42,
      boxX + boxW / 2 - 24,
      boxY - boxH / 2 + 42
    );

    const contentText = this.add
      .text(boxX, boxY - 14, storyText, {
        fontSize: '11px',
        color: '#f4f4f5',
        align: 'left',
        lineSpacing: 4.5,
        wordWrap: { width: boxW - 52 }
      })
      .setOrigin(0.5);

    const btnW = 260;
    const btnH = 38;
    const btnY = boxY + boxH / 2 - 32;

    const startBtn = this.add
      .rectangle(boxX, btnY, btnW, btnH, 0x16a34a, 1)
      .setStrokeStyle(2, 0x86efac)
      .setInteractive({ useHandCursor: true });

    const btnText = this.add
      .text(boxX, btnY, 'Ok', {
        fontSize: '12px',
        fontStyle: 'bold',
        color: '#052e16'
      })
      .setOrigin(0.5);

    this.tweens.add({
      targets: [startBtn, btnText],
      scaleX: 1.03,
      scaleY: 1.03,
      yoyo: true,
      repeat: -1,
      duration: 650
    });

    const closeModal = () => {
      SoundManager.unlock();
      SoundManager.playPhaseUp();
      if (this.gameScene) {
        this.gameScene.isStoryModalOpen = false;
        this.gameScene.startBrigadistaIntro();
      }

      this.tweens.add({
        targets: modalContainer,
        alpha: 0,
        duration: 250,
        onComplete: () => {
          modalContainer.destroy();
        }
      });
    };

    startBtn.on('pointerup', closeModal);
    backdrop.on('pointerup', closeModal);

    modalContainer.add([
      backdrop,
      boxBg,
      innerBorder,
      // titleBadge,
      divider,
      contentText,
      startBtn,
      btnText
    ]);
  }

  public showDonationInfoModal(): void {
    if (this.gameScene) {
      this.gameScene.isStoryModalOpen = true;
    }

    const infoText =
      'As pessoas da cidade podem fazer doações para as brigadas voluntárias. Cada doação devolve energia aos brigadistas, permitindo que sigam combatendo o fogo e protegendo nosso território.';

    const modalContainer = this.add.container(0, 0).setDepth(201);

    const backdrop = this.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.82)
      .setInteractive();

    const boxW = 630;
    const boxH = 220;
    const boxX = GAME_WIDTH / 2;
    const boxY = GAME_HEIGHT / 2;

    const boxBg = this.add
      .rectangle(boxX, boxY, boxW, boxH, 0x090d0a, 0.98)
      .setStrokeStyle(2.5, 0xfacc15);

    const innerBorder = this.add
      .rectangle(boxX, boxY, boxW - 10, boxH - 10, 0x000000, 0)
      .setStrokeStyle(1, 0x15803d);

    const contentText = this.add
      .text(boxX, boxY - 22, infoText, {
        fontSize: '12px',
        color: '#f4f4f5',
        align: 'left',
        lineSpacing: 5,
        wordWrap: { width: boxW - 60 }
      })
      .setOrigin(0.5);

    const btnW = 220;
    const btnH = 36;
    const btnY = boxY + boxH / 2 - 30;

    const okBtn = this.add
      .rectangle(boxX, btnY, btnW, btnH, 0x16a34a, 1)
      .setStrokeStyle(2, 0x86efac)
      .setInteractive({ useHandCursor: true });

    const okText = this.add
      .text(boxX, btnY, 'Ir para cidade', {
        fontSize: '12px',
        fontStyle: 'bold',
        color: '#052e16'
      })
      .setOrigin(0.5);

    const closeModal = () => {
      SoundManager.unlock();
      if (this.gameScene) {
        this.gameScene.isStoryModalOpen = false;
      }
      modalContainer.destroy();
    };

    okBtn.on('pointerup', () => {
      closeModal();
      this.gameScene.focusRandomHouse();
    });
    backdrop.on('pointerup', closeModal);

    modalContainer.add([backdrop, boxBg, innerBorder, contentText, okBtn, okText]);
  }

  public showTrabalhadorInfoModal(): void {
    if (!this.gameScene) return;
    this.gameScene.isStoryModalOpen = true;

    const infoText =
      'O poder público tem à disposição equipamentos que podem ser distribuídos para as comunidades rurais.';

    const modalContainer = this.add.container(0, 0).setDepth(201);

    const backdrop = this.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.82)
      .setInteractive();

    const boxW = 630;
    const boxH = 220;
    const boxX = GAME_WIDTH / 2;
    const boxY = GAME_HEIGHT / 2;

    const boxBg = this.add
      .rectangle(boxX, boxY, boxW, boxH, 0x090d0a, 0.98)
      .setStrokeStyle(2.5, 0xfacc15);

    const innerBorder = this.add
      .rectangle(boxX, boxY, boxW - 10, boxH - 10, 0x000000, 0)
      .setStrokeStyle(1, 0x15803d);

    const contentText = this.add
      .text(boxX, boxY - 22, infoText, {
        fontSize: '12px',
        color: '#f4f4f5',
        align: 'left',
        lineSpacing: 5,
        wordWrap: { width: boxW - 60 }
      })
      .setOrigin(0.5);

    const btnW = 240;
    const btnH = 36;
    const btnY = boxY + boxH / 2 - 30;

    const prefeituraBtn = this.add
      .rectangle(boxX, btnY, btnW, btnH, 0x16a34a, 1)
      .setStrokeStyle(2, 0x86efac)
      .setInteractive({ useHandCursor: true });

    const prefeituraText = this.add
      .text(boxX, btnY, 'Ir para a prefeitura', {
        fontSize: '12px',
        fontStyle: 'bold',
        color: '#052e16'
      })
      .setOrigin(0.5);

    const closeModal = () => {
      SoundManager.unlock();
      if (this.gameScene) {
        this.gameScene.isStoryModalOpen = false;
      }
      modalContainer.destroy();
    };

    prefeituraBtn.on('pointerup', () => {
      closeModal();
      this.gameScene.focusPrefeitura();
    });
    backdrop.on('pointerup', closeModal);

    modalContainer.add([backdrop, boxBg, innerBorder, contentText, prefeituraBtn, prefeituraText]);
  }

  public showPrefeituraInfoModal(): void {
    this.openInfoModal(
      'PREFEITURA',
      'A prefeitura possui necessidades legais para atuar dentro da ordem. Ela responderá ao pedido dos trabalhadores rurais em um prazo de 15 dias.\n\nMas o governo federal pode ajudar.'
    );
  }

  public showAldeiaInfoModal(village: { x: number; y: number }): void {
    if (!this.gameScene) return;
    this.gameScene.isStoryModalOpen = true;
    const gs = this.gameScene;

    const modalContainer = this.add.container(0, 0).setDepth(201);

    const backdrop = this.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.82)
      .setInteractive();

    const boxW = 630;
    const boxH = 270;
    const boxX = GAME_WIDTH / 2;
    const boxY = GAME_HEIGHT / 2;

    const boxBg = this.add
      .rectangle(boxX, boxY, boxW, boxH, 0x090d0a, 0.98)
      .setStrokeStyle(2.5, 0x4ade80);

    const title = this.add
      .text(boxX, boxY - boxH / 2 + 28, 'ALDEIA', {
        fontSize: '13px',
        fontStyle: 'bold',
        color: '#86efac'
      })
      .setOrigin(0.5);

    const infoText = this.add
      .text(
        boxX,
        boxY - 50,
        'A aldeia guarda saberes e o território que mantém a floresta de pé. Ela pode invocar encantados, até 4 em campo somando os dois.\n\n🌿 Curupira: age sozinho por 60 s, laça e captura incendiários e apaga focos com força.\n🌿 Mãe da Mata: age sozinha por 60 s, apaga focos com água e replanta árvores queimadas.',
        {
          fontSize: '12px',
          color: '#f4f4f5',
          align: 'center',
          lineSpacing: 4,
          wordWrap: { width: boxW - 60 }
        }
      )
      .setOrigin(0.5);

    const countText = this.add
      .text(boxX, boxY + 22, '', { fontSize: '12px', fontStyle: 'bold', color: '#f4f4f5' })
      .setOrigin(0.5);

    const btnY = boxY + boxH / 2 - 32;
    const curX = boxX - 190;
    const maeX = boxX + 20;

    const curStatus = this.add
      .text(curX, btnY - 28, '', { fontSize: '11px', fontStyle: 'bold', color: '#86efac' })
      .setOrigin(0.5);
    const maeStatus = this.add
      .text(maeX, btnY - 28, '', { fontSize: '11px', fontStyle: 'bold', color: '#86efac' })
      .setOrigin(0.5);

    const curBtn = this.add.rectangle(curX, btnY, 200, 38, 0x14532d, 1).setStrokeStyle(2, 0x4ade80);
    const curText = this.add
      .text(curX, btnY, '🌿 Invocar Curupira', { fontSize: '12px', fontStyle: 'bold', color: '#f0fdf4' })
      .setOrigin(0.5);

    const maeBtn = this.add.rectangle(maeX, btnY, 200, 38, 0x134e4a, 1).setStrokeStyle(2, 0x5eead4);
    const maeText = this.add
      .text(maeX, btnY, '🌿 Invocar Mãe da Mata', { fontSize: '12px', fontStyle: 'bold', color: '#f0fdf4' })
      .setOrigin(0.5);

    const closeBtn = this.add
      .rectangle(boxX + 230, btnY, 110, 38, 0x27272a, 1)
      .setStrokeStyle(2, 0x71717a)
      .setInteractive({ useHandCursor: true });

    const closeText = this.add
      .text(boxX + 230, btnY, 'Fechar', { fontSize: '12px', fontStyle: 'bold', color: '#f4f4f5' })
      .setOrigin(0.5);

    modalContainer.add([
      backdrop,
      boxBg,
      title,
      infoText,
      countText,
      curStatus,
      maeStatus,
      curBtn,
      curText,
      maeBtn,
      maeText,
      closeBtn,
      closeText
    ]);

    const full = (): boolean => gs.getEncantadoCount() >= BALANCE.ENCANTADOS_MAX_ACTIVE;
    const curupiraReady = (): boolean => !full() && gs.getCurupiraCooldownRemainingMs(village) <= 0;
    const maeDaMataReady = (): boolean => !full() && gs.getMaeDaMataCooldownRemainingMs(village) <= 0;

    const formatWait = (ms: number): string => {
      const sec = Math.ceil(ms / 1000);
      return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
    };

    const applyButton = (
      btn: Phaser.GameObjects.Rectangle,
      text: Phaser.GameObjects.Text,
      status: Phaser.GameObjects.Text,
      ready: boolean,
      remainingMs: number,
      readyFill: number,
      readyStroke: number
    ): void => {
      let label = 'Pronto';
      if (full()) {
        label = 'Limite de 4 encantados';
      } else if (remainingMs > 0) {
        label = `Recarga: ${formatWait(remainingMs)}`;
      }
      status.setText(label).setColor(ready ? '#86efac' : '#fca5a5');
      btn.setFillStyle(ready ? readyFill : 0x3f3f46, 1).setStrokeStyle(2, ready ? readyStroke : 0x71717a);
      text.setColor(ready ? '#f0fdf4' : '#a1a1aa');
      if (ready) {
        btn.setInteractive({ useHandCursor: true });
      } else {
        btn.disableInteractive();
      }
    };

    const refresh = (): void => {
      countText.setText(
        `Encantados em campo: ${gs.getEncantadoCount()}/${BALANCE.ENCANTADOS_MAX_ACTIVE}`
      );
      applyButton(
        curBtn,
        curText,
        curStatus,
        curupiraReady(),
        gs.getCurupiraCooldownRemainingMs(village),
        0x14532d,
        0x4ade80
      );
      applyButton(
        maeBtn,
        maeText,
        maeStatus,
        maeDaMataReady(),
        gs.getMaeDaMataCooldownRemainingMs(village),
        0x134e4a,
        0x5eead4
      );
    };
    refresh();
    const liveTimer = this.time.addEvent({ delay: 250, loop: true, callback: refresh });

    const closeModal = () => {
      SoundManager.unlock();
      liveTimer.remove();
      if (this.gameScene) {
        this.gameScene.isStoryModalOpen = false;
      }
      modalContainer.destroy();
    };

    curBtn.on('pointerup', () => {
      if (!curupiraReady()) return;
      if (gs.invokeCurupiraFromVillage(village)) {
        closeModal();
      } else {
        refresh();
      }
    });

    maeBtn.on('pointerup', () => {
      if (!maeDaMataReady()) return;
      if (gs.invokeMaeDaMataFromVillage(village)) {
        closeModal();
      } else {
        refresh();
      }
    });

    closeBtn.on('pointerup', closeModal);
  }

  public showBombeirosBaseModal(): void {
    if (!this.gameScene) return;
    this.gameScene.isStoryModalOpen = true;

    const modalContainer = this.add.container(0, 0).setDepth(201);

    const backdrop = this.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.82)
      .setInteractive();

    const boxW = 630;
    const boxH = 240;
    const boxX = GAME_WIDTH / 2;
    const boxY = GAME_HEIGHT / 2;

    const boxBg = this.add
      .rectangle(boxX, boxY, boxW, boxH, 0x090d0a, 0.98)
      .setStrokeStyle(2.5, 0xfacc15);

    const innerBorder = this.add
      .rectangle(boxX, boxY, boxW - 10, boxH - 10, 0x000000, 0)
      .setStrokeStyle(1, 0x15803d);

    const title = this.add
      .text(boxX, boxY - boxH / 2 + 28, 'BASE DOS BOMBEIROS', {
        fontSize: '13px',
        fontStyle: 'bold',
        color: '#fde047'
      })
      .setOrigin(0.5);

    const count = this.gameScene.getBombeiroCount();
    const limit = this.gameScene.getBombeiroLimit();
    const limitReached = count >= limit;
    const remainingMs = this.gameScene.getBombeiroBaseCooldownRemainingMs();
    const onCooldown = remainingMs > 0;

    const infoText = this.add
      .text(
        boxX,
        boxY - 40,
        this.gameScene.phaseSystem.isAjusteFiscalActive()
          ? 'Durante o Ajuste Fiscal, a base forma no máximo 1 bombeiro, com seu caminhão. Ele perde energia fora da base e volta para recarregar.'
          : 'A base forma um novo bombeiro a cada 2 minutos, até o limite de bombeiros. Cada bombeiro vem com seu caminhão, que não entra na floresta: lá ele desce e anda até o fogo. Perde energia fora da base.',
        {
          fontSize: '12px',
          color: '#f4f4f5',
          align: 'center',
          lineSpacing: 5,
          wordWrap: { width: boxW - 60 }
        }
      )
      .setOrigin(0.5);

    const countText = this.add
      .text(boxX, boxY + 4, `Bombeiros: ${count}/${limit}`, {
        fontSize: '12px',
        fontStyle: 'bold',
        color: '#f4f4f5'
      })
      .setOrigin(0.5);

    let statusLabel: string;
    if (limitReached) {
      statusLabel = 'Limite de bombeiros atingido';
    } else if (onCooldown) {
      const remainingSec = Math.ceil(remainingMs / 1000);
      statusLabel = `Próximo bombeiro em ${Math.floor(remainingSec / 60)}:${String(remainingSec % 60).padStart(2, '0')}`;
    } else {
      statusLabel = 'Pronto para formar um bombeiro';
    }
    const canRecruit = !limitReached && !onCooldown;

    const statusText = this.add
      .text(boxX, boxY + 26, statusLabel, {
        fontSize: '11px',
        fontStyle: 'bold',
        color: canRecruit ? '#86efac' : '#fca5a5'
      })
      .setOrigin(0.5);

    const btnY = boxY + boxH / 2 - 32;

    const recruitBtn = this.add
      .rectangle(boxX - 110, btnY, 260, 38, canRecruit ? 0x9a3412 : 0x3f3f46, 1)
      .setStrokeStyle(2, canRecruit ? 0xfdba74 : 0x71717a);
    if (canRecruit) recruitBtn.setInteractive({ useHandCursor: true });

    const recruitText = this.add
      .text(boxX - 110, btnY, '🚒 Formar bombeiro', {
        fontSize: '12px',
        fontStyle: 'bold',
        color: canRecruit ? '#fff7ed' : '#a1a1aa'
      })
      .setOrigin(0.5);

    const closeBtn = this.add
      .rectangle(boxX + 150, btnY, 120, 38, 0x27272a, 1)
      .setStrokeStyle(2, 0x71717a)
      .setInteractive({ useHandCursor: true });

    const closeText = this.add
      .text(boxX + 150, btnY, 'Fechar', {
        fontSize: '12px',
        fontStyle: 'bold',
        color: '#f4f4f5'
      })
      .setOrigin(0.5);

    const liveStatus = this.bindLiveRecruitStatus({
      plural: 'Bombeiros',
      singular: 'bombeiro',
      countText,
      statusText,
      recruitBtn,
      recruitText,
      getCount: () => this.gameScene.getBombeiroCount(),
      getLimit: () => this.gameScene.getBombeiroLimit(),
      getRemainingMs: () => this.gameScene.getBombeiroBaseCooldownRemainingMs()
    });

    const closeModal = () => {
      SoundManager.unlock();
      liveStatus.remove();
      if (this.gameScene) {
        this.gameScene.isStoryModalOpen = false;
      }
      modalContainer.destroy();
    };

    recruitBtn.on('pointerup', () => {
      if (this.gameScene.tryRecruitBombeiro()) {
        closeModal();
      }
    });
    closeBtn.on('pointerup', closeModal);
    backdrop.on('pointerup', closeModal);

    modalContainer.add([
      backdrop,
      boxBg,
      innerBorder,
      title,
      infoText,
      countText,
      statusText,
      recruitBtn,
      recruitText,
      closeBtn,
      closeText
    ]);
  }

  private openInfoModal(headerText: string, infoText: string): void {
    if (!this.gameScene) return;
    this.gameScene.isStoryModalOpen = true;

    const modalContainer = this.add.container(0, 0).setDepth(201);

    const backdrop = this.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.82)
      .setInteractive();

    const boxW = 630;
    const boxH = 220;
    const boxX = GAME_WIDTH / 2;
    const boxY = GAME_HEIGHT / 2;

    const boxBg = this.add
      .rectangle(boxX, boxY, boxW, boxH, 0x090d0a, 0.98)
      .setStrokeStyle(2.5, 0xfacc15);

    const innerBorder = this.add
      .rectangle(boxX, boxY, boxW - 10, boxH - 10, 0x000000, 0)
      .setStrokeStyle(1, 0x15803d);

    const title = this.add
      .text(boxX, boxY - boxH / 2 + 28, headerText, {
        fontSize: '13px',
        fontStyle: 'bold',
        color: '#fde047'
      })
      .setOrigin(0.5);

    const contentText = this.add
      .text(boxX, boxY + 4, infoText, {
        fontSize: '12px',
        color: '#f4f4f5',
        align: 'left',
        lineSpacing: 5,
        wordWrap: { width: boxW - 60 }
      })
      .setOrigin(0.5);

    const btnW = 220;
    const btnH = 36;
    const btnY = boxY + boxH / 2 - 30;

    const closeBtn = this.add
      .rectangle(boxX, btnY, btnW, btnH, 0x27272a, 1)
      .setStrokeStyle(2, 0x71717a)
      .setInteractive({ useHandCursor: true });

    const closeText = this.add
      .text(boxX, btnY, 'Fechar', {
        fontSize: '12px',
        fontStyle: 'bold',
        color: '#f4f4f5'
      })
      .setOrigin(0.5);

    const closeModal = () => {
      SoundManager.unlock();
      if (this.gameScene) {
        this.gameScene.isStoryModalOpen = false;
      }
      modalContainer.destroy();
    };

    closeBtn.on('pointerup', closeModal);
    backdrop.on('pointerup', closeModal);

    modalContainer.add([backdrop, boxBg, innerBorder, title, contentText, closeBtn, closeText]);
  }

  public showBrigadistaBaseModal(): void {
    if (!this.gameScene) return;
    this.gameScene.isStoryModalOpen = true;

    const modalContainer = this.add.container(0, 0).setDepth(201);

    const backdrop = this.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.82)
      .setInteractive();

    const boxW = 630;
    const boxH = 240;
    const boxX = GAME_WIDTH / 2;
    const boxY = GAME_HEIGHT / 2;

    const boxBg = this.add
      .rectangle(boxX, boxY, boxW, boxH, 0x090d0a, 0.98)
      .setStrokeStyle(2.5, 0xfacc15);

    const innerBorder = this.add
      .rectangle(boxX, boxY, boxW - 10, boxH - 10, 0x000000, 0)
      .setStrokeStyle(1, 0x15803d);

    const title = this.add
      .text(boxX, boxY - boxH / 2 + 28, 'BASE DOS BRIGADISTAS', {
        fontSize: '13px',
        fontStyle: 'bold',
        color: '#fde047'
      })
      .setOrigin(0.5);

    const count = this.gameScene.getBrigadistaCount();
    const limit = this.gameScene.getBrigadistaLimit();
    const limitReached = count >= limit;
    const remainingMs = this.gameScene.getBrigadistaBaseCooldownRemainingMs();
    const onCooldown = remainingMs > 0;

    const infoText = this.add
      .text(
        boxX,
        boxY - 40,
        this.gameScene.phaseSystem.isAjusteFiscalActive()
          ? 'Durante o Ajuste Fiscal, a base forma no máximo 3 brigadistas. A base forma um novo brigadista a cada 2 minutos.'
          : 'A base forma um novo brigadista a cada 2 minutos, até o limite de brigadistas.',
        {
          fontSize: '12px',
          color: '#f4f4f5',
          align: 'center',
          lineSpacing: 5,
          wordWrap: { width: boxW - 60 }
        }
      )
      .setOrigin(0.5);

    const countText = this.add
      .text(boxX, boxY + 4, `Brigadistas: ${count}/${limit}`, {
        fontSize: '12px',
        fontStyle: 'bold',
        color: '#f4f4f5'
      })
      .setOrigin(0.5);

    let statusLabel: string;
    if (limitReached) {
      statusLabel = 'Limite de brigadistas atingido';
    } else if (onCooldown) {
      const remainingSec = Math.ceil(remainingMs / 1000);
      statusLabel = `Próximo brigadista em ${Math.floor(remainingSec / 60)}:${String(remainingSec % 60).padStart(2, '0')}`;
    } else {
      statusLabel = 'Pronto para formar um brigadista';
    }
    const canRecruit = !limitReached && !onCooldown;

    const statusText = this.add
      .text(boxX, boxY + 26, statusLabel, {
        fontSize: '11px',
        fontStyle: 'bold',
        color: canRecruit ? '#86efac' : '#fca5a5'
      })
      .setOrigin(0.5);

    const btnY = boxY + boxH / 2 - 32;

    const recruitBtn = this.add
      .rectangle(boxX - 110, btnY, 260, 38, canRecruit ? 0x9a3412 : 0x3f3f46, 1)
      .setStrokeStyle(2, canRecruit ? 0xfdba74 : 0x71717a);
    if (canRecruit) recruitBtn.setInteractive({ useHandCursor: true });

    const recruitText = this.add
      .text(boxX - 110, btnY, '🧯 Formar brigadista', {
        fontSize: '12px',
        fontStyle: 'bold',
        color: canRecruit ? '#fff7ed' : '#a1a1aa'
      })
      .setOrigin(0.5);

    const closeBtn = this.add
      .rectangle(boxX + 150, btnY, 120, 38, 0x27272a, 1)
      .setStrokeStyle(2, 0x71717a)
      .setInteractive({ useHandCursor: true });

    const closeText = this.add
      .text(boxX + 150, btnY, 'Fechar', {
        fontSize: '12px',
        fontStyle: 'bold',
        color: '#f4f4f5'
      })
      .setOrigin(0.5);

    const liveStatus = this.bindLiveRecruitStatus({
      plural: 'Brigadistas',
      singular: 'brigadista',
      countText,
      statusText,
      recruitBtn,
      recruitText,
      getCount: () => this.gameScene.getBrigadistaCount(),
      getLimit: () => this.gameScene.getBrigadistaLimit(),
      getRemainingMs: () => this.gameScene.getBrigadistaBaseCooldownRemainingMs()
    });

    const closeModal = () => {
      SoundManager.unlock();
      liveStatus.remove();
      if (this.gameScene) {
        this.gameScene.isStoryModalOpen = false;
      }
      modalContainer.destroy();
    };

    recruitBtn.on('pointerup', () => {
      if (this.gameScene.tryRecruitBrigadista()) {
        closeModal();
      }
    });
    closeBtn.on('pointerup', closeModal);
    backdrop.on('pointerup', closeModal);

    modalContainer.add([
      backdrop,
      boxBg,
      innerBorder,
      title,
      infoText,
      countText,
      statusText,
      recruitBtn,
      recruitText,
      closeBtn,
      closeText
    ]);
  }

  public showHouseDonationPanel(houseId: number): void {
    if (!this.gameScene) return;
    this.gameScene.isStoryModalOpen = true;

    const modalContainer = this.add.container(0, 0).setDepth(201);

    const backdrop = this.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.82)
      .setInteractive();

    const boxW = 630;
    const boxH = 220;
    const boxX = GAME_WIDTH / 2;
    const boxY = GAME_HEIGHT / 2;

    const boxBg = this.add
      .rectangle(boxX, boxY, boxW, boxH, 0x090d0a, 0.98)
      .setStrokeStyle(2.5, 0xfacc15);

    const innerBorder = this.add
      .rectangle(boxX, boxY, boxW - 10, boxH - 10, 0x000000, 0)
      .setStrokeStyle(1, 0x15803d);

    const title = this.add
      .text(boxX, boxY - boxH / 2 + 28, 'CASA DE MORADOR', {
        fontSize: '13px',
        fontStyle: 'bold',
        color: '#fde047'
      })
      .setOrigin(0.5);

    const donationBlocked = this.gameScene.isHouseDonationBlocked();

    const infoText = this.add
      .text(
        boxX,
        boxY - 20,
        donationBlocked
          ? 'Os brigadistas agradecem muito, mas não estão mais aceitando doações porque não possuem pessoal nem estrutura para a quantidade de doações recebidas.'
          : 'Esta casa pode enviar uma doação a cada 2 minutos. Cada doação aumenta a Consciência de Classe e devolve energia aos brigadistas.',
        {
          fontSize: '12px',
          color: '#f4f4f5',
          align: 'center',
          lineSpacing: 5,
          wordWrap: { width: boxW - 60 }
        }
      )
      .setOrigin(0.5);

    const remainingMs = this.gameScene.getHouseCooldownRemainingMs(houseId);
    const onCooldown = remainingMs > 0;
    const remainingSec = Math.ceil(remainingMs / 1000);
    const statusLabel = donationBlocked
      ? 'Brigadistas com energia cheia'
      : onCooldown
        ? `Disponível em ${Math.floor(remainingSec / 60)}:${String(remainingSec % 60).padStart(2, '0')}`
        : 'Disponível agora';

    const statusText = this.add
      .text(boxX, boxY + 38, statusLabel, {
        fontSize: '11px',
        fontStyle: 'bold',
        color: onCooldown || donationBlocked ? '#fca5a5' : '#86efac'
      })
      .setOrigin(0.5);

    const btnY = boxY + boxH / 2 - 32;
    const cannotDonate = onCooldown || donationBlocked;

    const donateBtn = this.add
      .rectangle(boxX - 70, btnY, 340, 38, cannotDonate ? 0x3f3f46 : 0x16a34a, 1)
      .setStrokeStyle(2, cannotDonate ? 0x71717a : 0x86efac);
    if (!cannotDonate) donateBtn.setInteractive({ useHandCursor: true });

    const donateText = this.add
      .text(boxX - 70, btnY, 'Enviar doação para brigadistas', {
        fontSize: '12px',
        fontStyle: 'bold',
        color: cannotDonate ? '#a1a1aa' : '#052e16'
      })
      .setOrigin(0.5);

    const closeBtn = this.add
      .rectangle(boxX + 180, btnY, 120, 38, 0x27272a, 1)
      .setStrokeStyle(2, 0x71717a)
      .setInteractive({ useHandCursor: true });

    const closeText = this.add
      .text(boxX + 180, btnY, 'Fechar', {
        fontSize: '12px',
        fontStyle: 'bold',
        color: '#f4f4f5'
      })
      .setOrigin(0.5);

    const closeModal = () => {
      SoundManager.unlock();
      if (this.gameScene) {
        this.gameScene.isStoryModalOpen = false;
      }
      modalContainer.destroy();
    };

    donateBtn.on('pointerup', () => {
      if (this.gameScene.donateFromHouse(houseId)) {
        SoundManager.unlock();
        SoundManager.playPhaseUp();
        closeModal();
      }
    });
    closeBtn.on('pointerup', closeModal);
    backdrop.on('pointerup', closeModal);

    modalContainer.add([
      backdrop,
      boxBg,
      innerBorder,
      title,
      infoText,
      statusText,
      donateBtn,
      donateText,
      closeBtn,
      closeText
    ]);
  }

  /** Mantém contador, status e botão de recrutamento de uma base sincronizados com o tempo real. */
  private bindLiveRecruitStatus(cfg: {
    plural: string;
    singular: string;
    countText: Phaser.GameObjects.Text;
    statusText: Phaser.GameObjects.Text;
    recruitBtn: Phaser.GameObjects.Rectangle;
    recruitText: Phaser.GameObjects.Text;
    getCount: () => number;
    getLimit: () => number;
    getRemainingMs: () => number;
  }): Phaser.Time.TimerEvent {
    const refresh = (): void => {
      const count = cfg.getCount();
      const limit = cfg.getLimit();
      const limitReached = count >= limit;
      const remainingMs = cfg.getRemainingMs();
      const onCooldown = remainingMs > 0;
      const canRecruit = !limitReached && !onCooldown;

      let statusLabel: string;
      if (limitReached) {
        statusLabel = `Limite de ${cfg.plural.toLowerCase()} atingido`;
      } else if (onCooldown) {
        const remainingSec = Math.ceil(remainingMs / 1000);
        statusLabel = `Próximo ${cfg.singular} em ${Math.floor(remainingSec / 60)}:${String(remainingSec % 60).padStart(2, '0')}`;
      } else {
        statusLabel = `Pronto para formar um ${cfg.singular}`;
      }

      cfg.countText.setText(`${cfg.plural}: ${count}/${limit}`);
      cfg.statusText.setText(statusLabel).setColor(canRecruit ? '#86efac' : '#fca5a5');
      cfg.recruitBtn
        .setFillStyle(canRecruit ? 0x9a3412 : 0x3f3f46, 1)
        .setStrokeStyle(2, canRecruit ? 0xfdba74 : 0x71717a);
      cfg.recruitText.setColor(canRecruit ? '#fff7ed' : '#a1a1aa');
      if (canRecruit && !cfg.recruitBtn.input?.enabled) {
        cfg.recruitBtn.setInteractive({ useHandCursor: true });
      } else if (!canRecruit && cfg.recruitBtn.input?.enabled) {
        cfg.recruitBtn.disableInteractive();
      }
    };

    refresh();
    return this.time.addEvent({ delay: 100, loop: true, callback: refresh });
  }

  public override update(): void {
    if (!this.gameScene || !this.gameScene.phaseSystem) return;

    const forest = this.gameScene.getForestHealth();
    const consc = this.gameScene.phaseSystem.getConsciousness();
    const phase = this.gameScene.phaseSystem.getCurrentPhase();

    this.phaseTitleText.setText(`📊 ${phase.title}`);
    this.forestValueText.setText(`${Math.round(forest)}%`);
    this.consciousnessValueText.setText(`${Math.round(consc)}%`);

    // Desenhar barras de preenchimento
    this.topBarsGraphics.clear();

    // Barra de Saúde da Floresta
    const forestColor = forest > 50 ? 0x22c55e : forest > 25 ? 0xeab308 : 0xef4444;
    const forestFillWidth = (this.barPositions.width - 2) * (forest / 100);
    this.topBarsGraphics.fillStyle(forestColor, 1);
    this.topBarsGraphics.fillRect(
      this.barPositions.x + 1,
      this.barPositions.y1 - this.barPositions.height / 2 + 1,
      forestFillWidth,
      this.barPositions.height - 2
    );

    // Barra de Consciência
    const conscFillWidth = (this.barPositions.width - 2) * (consc / 100);
    this.topBarsGraphics.fillStyle(0x38bdf8, 1);
    this.topBarsGraphics.fillRect(
      this.barPositions.x + 1,
      this.barPositions.y2 - this.barPositions.height / 2 + 1,
      conscFillWidth,
      this.barPositions.height - 2
    );

    const minimapNow = this.time.now;
    if (minimapNow - this.lastMinimapAt >= MINIMAP_REFRESH_MS) {
      this.lastMinimapAt = minimapNow;
      this.updateMinimapAndSectorIndicator();
    }
  }

  private updateMinimapAndSectorIndicator(): void {
    const viewInfo = this.gameScene.getCameraCenterWorldPoint();
    const sectorName =
      viewInfo.sector === SectorType.CIDADE
        ? '🏙️ CIDADE (Centro)'
        : viewInfo.sector === SectorType.CAMPO
          ? '🌾 CAMPO (Anel Médio)'
          : '🌳 FLORESTA (Anel Externo)';
    const followed = this.gameScene.getFollowedEntity();
    if (followed) {
      this.cameraFollowChip
        .setText(`🎥 ACOMPANHANDO: ${followed.getLabel().toUpperCase()} [✕ SOLTAR]`)
        .setVisible(true);
    } else {
      this.cameraFollowChip.setVisible(false);
    }

    const g = this.minimapGraphics;
    g.clear();

    const mx = this.minimapX;
    const my = this.minimapY;
    const r = this.minimapRadius;
    const scale = r / FLORESTA_OUTER_RADIUS;

    // Fundo e setores quadrados isométricos (losangos 2:1)
    const drawMiniDiamond = (radius: number, fillHex?: number, strokeHex?: number) => {
      const rx = radius * scale;
      const ry = rx * ISO_Y_RATIO;
      g.beginPath();
      g.moveTo(mx, my - ry);
      g.lineTo(mx + rx, my);
      g.lineTo(mx, my + ry);
      g.lineTo(mx - rx, my);
      g.closePath();
      if (fillHex !== undefined) {
        g.fillStyle(fillHex, 0.95);
        g.fillPath();
      }
      if (strokeHex !== undefined) {
        g.lineStyle(1.5, strokeHex, 0.85);
        g.strokePath();
      }
    };

    drawMiniDiamond(FLORESTA_OUTER_RADIUS + 30, 0x090d0a, 0xa1a1aa);
    drawMiniDiamond(FLORESTA_OUTER_RADIUS, 0x064e3b);
    drawMiniDiamond(CAMPO_RADIUS, 0x3f6212);
    drawMiniDiamond(CITY_RADIUS, 0x92400e, 0xfef08a);

    for (const f of this.gameScene.fireSystem.getActiveFires()) {
      const fx = mx + (f.data.x - WORLD_CENTER_X) * scale;
      const fy = my + (f.data.y - WORLD_CENTER_Y) * scale;
      g.fillStyle(0xef4444, 1);
      g.fillCircle(fx, fy, 2.5);
    }

    for (const a of this.gameScene.spawnerSystem.getArsonists()) {
      const ax = mx + (a.x - WORLD_CENTER_X) * scale;
      const ay = my + (a.y - WORLD_CENTER_Y) * scale;
      g.fillStyle(0xfacc15, 1);
      g.fillCircle(ax, ay, 2);
    }

    for (const u of this.gameScene.getAllUnits()) {
      const ux = mx + (u.x - WORLD_CENTER_X) * scale;
      const uy = my + (u.y - WORLD_CENTER_Y) * scale;
      g.fillStyle(0x38bdf8, 1);
      g.fillCircle(ux, uy, 2.2);
    }

    const cam = this.gameScene.cameras.main;
    const rw = (GAME_WIDTH / cam.zoom) * scale;
    const rh = (MAP_VIEWPORT_HEIGHT / cam.zoom) * scale;
    const rx = mx + (cam.scrollX + (GAME_WIDTH - GAME_WIDTH / cam.zoom) / 2 - WORLD_CENTER_X) * scale;
    const ry = my + (cam.scrollY + (MAP_VIEWPORT_HEIGHT - MAP_VIEWPORT_HEIGHT / cam.zoom) / 2 - WORLD_CENTER_Y) * scale;
    g.lineStyle(1.2, 0xffffff, 0.95);
    g.strokeRect(rx, ry, rw, rh);
  }
}
