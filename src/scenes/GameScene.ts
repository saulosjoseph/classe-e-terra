import Phaser from 'phaser';
import {
  BALANCE,
  BASE_BRIGADISTA_X,
  BASE_BRIGADISTA_Y,
  CAMPO_RADIUS,
  CAMPO_RADIUS_Y,
  CITY_RADIUS,
  CITY_RADIUS_Y,
  COLLISION,
  DIFFICULTY_CONFIGS,
  FLORESTA_OUTER_RADIUS,
  TREE_FIRE,
  FLORESTA_OUTER_RADIUS_Y,
  GAME_WIDTH,
  ISO_INVERSE_Y_RATIO,
  ISO_Y_RATIO,
  MAP_BOTTOM_Y,
  MAP_TOP_Y,
  MAP_VIEWPORT_HEIGHT,
  SECTOR_INFO,
  WORLD_CENTER_X,
  WORLD_CENTER_Y,
  WORLD_HEIGHT,
  WORLD_WIDTH,
  getIsoDistance,
  getRandomPointInSector,
  getSectorAtPoint
} from '../config/GameBalance';
import { SoundManager } from '../audio/SoundManager';
import { BossFortress } from '../entities/BossFortress';
import { Brigadista } from '../entities/Brigadista';
import { CarroPopular } from '../entities/CarroPopular';
import { GuardaFlorestal } from '../entities/GuardaFlorestal';
import { Incendiario } from '../entities/Incendiario';
import { TrabalhadorRural, TrabalhadorRuralVariant } from '../entities/TrabalhadorRural';
import { Unit } from '../entities/Unit';
import { CollisionSystem, getCollisionSystem, registerCollisionSystem } from '../systems/CollisionSystem';
import { ActiveFireInstance, FireSmokeSystem } from '../systems/FireSmokeSystem';
import { PoliticalPhaseSystem } from '../systems/PoliticalPhaseSystem';
import { SectorSystem } from '../systems/SectorSystem';
import { SpawnerSystem } from '../systems/SpawnerSystem';
import { SpeechBubble } from '../ui/SpeechBubble';
import {
  DifficultyConfig,
  DifficultyLevel,
  GameStatsResult,
  IntegratedActionType,
  LocalActionType,
  PoliticalPhaseDefinition,
  PoliticalPhaseId,
  SectorType,
  UnitType
} from '../types/GameTypes';

export interface FollowableTarget {
  id: string;
  x: number;
  y: number;
  setFollowed: (followed: boolean) => void;
  getLabel: () => string;
  isAlive?: () => boolean;
}

interface CityHouse {
  id: number;
  sprite: Phaser.GameObjects.Sprite;
  obstacleId: string;
  /** Instante (tempo de jogo, em ms) em que a casa pode doar novamente */
  readyAt: number;
}

const BRIGADISTA_EXAUSTO_TEXT =
  'Estou exausto, preciso de um açaí para continuar protegendo nosso território!';
const TRABALHADOR_INTRO_TEXT =
  'Os trabalhadores estão combatendo o fogo sem equipamentos e sem treinamento, correndo risco de vida!';

interface ForestTree {
  x: number;
  y: number;
  sprite: Phaser.GameObjects.Sprite;
  state: 'healthy' | 'burning' | 'burned';
  burnLeftMs: number;
}

/** Ponto onde os brigadistas nascem junto à Base dos Brigadistas (deslocamento em relação ao centro da base) */
const BRIGADISTA_BASE_SPAWN_OFFSET = { x: -150, y: 120 };

export class GameScene extends Phaser.Scene {
  public difficulty!: DifficultyConfig;
  public phaseSystem!: PoliticalPhaseSystem;
  public fireSystem!: FireSmokeSystem;
  private forestTrees: ForestTree[] = [];
  private treeFireTimer = 0;
  public sectorSystem!: SectorSystem;
  public spawnerSystem!: SpawnerSystem;
  public boss!: BossFortress;

  private followedTarget: FollowableTarget | null = null;

  private forestHealth = BALANCE.INITIAL_FOREST_HEALTH;
  private brigadistas: Brigadista[] = [];
  private guardas: GuardaFlorestal[] = [];
  private trabalhadoresRurais: TrabalhadorRural[] = [];
  private nextUnitId = 1;

  private brigadistaBaseReadyAt = 0;
  private spawnGuardaReadyAt = 0;
  private indigenousShieldGraphics!: Phaser.GameObjects.Graphics;

  // Controle de Câmera Panorâmica (Drag / Pan & Teclado)
  private isDraggingCamera = false;
  private dragStartPointerX = 0;
  private dragStartPointerY = 0;
  private dragStartScrollX = 0;
  private dragStartScrollY = 0;
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasdKeys?: {
    W: Phaser.Input.Keyboard.Key;
    A: Phaser.Input.Keyboard.Key;
    S: Phaser.Input.Keyboard.Key;
    D: Phaser.Input.Keyboard.Key;
  };

  // Controle de Zoom (Mouse Wheel e Movimento de Pinça no Touch)
  private cameraZoom = 0.28125;
  private readonly minCameraZoom = 0.25;
  private readonly maxCameraZoom = 2.0;
  private isPinchingCamera = false;
  private initialPinchDistance = 0;
  private initialPinchZoom = 0.28125;

  // Configurações do Grid Isométrico para a Cidade (casas populares brasileiras)
  private mapGridWidth = 6;
  private mapGridHeight = 6;
  private tileWidth = 64;
  private tileHeight = 32;

  // Estatísticas da partida
  private firesExtinguished = 0;
  private arsonistsCaptured = 0;
  private integratedActionsUsed = 0;
  private matchStartTime = 0;
  private isEnding = false;
  public isStoryModalOpen = true;

  // Introdução: foco no Brigadista Voluntário no início da partida
  private introStarted = false;
  // Brigadista exibindo a fala de exaustão (balão ancorado sobre ele)
  private speakingBrigadista: Brigadista | null = null;
  private brigadistaSpeechBubble: SpeechBubble | null = null;

  // Após a primeira doação: foco em um Trabalhador Rural e fala sobre o risco de combate sem equipamentos
  private trabalhadorIntroShown = false;
  private introTrabalhador: TrabalhadorRural | null = null;
  private trabalhadorSpeechBubble: SpeechBubble | null = null;

  // Doações das casas da cidade (tempo de jogo, pausado com modais)
  private cityHouses: CityHouse[] = [];
  private carrosDoacao: CarroPopular[] = [];
  private prefeituraPos: { x: number; y: number } | null = null;
  private prefeituraSprite: Phaser.GameObjects.Sprite | null = null;
  private prefeituraFocusContainer: Phaser.GameObjects.Container | null = null;
  private gameTimeMs = 0;
  private houseFocusContainer: Phaser.GameObjects.Container | null = null;

  constructor() {
    super('GameScene');
  }

  public init(data: { difficulty?: DifficultyLevel }): void {
    const diffLevel = data?.difficulty ?? DifficultyLevel.NORMAL;
    this.difficulty = DIFFICULTY_CONFIGS[diffLevel];
    this.forestHealth = BALANCE.INITIAL_FOREST_HEALTH;
    this.brigadistas = [];
    this.carrosDoacao = [];
    this.guardas = [];
    this.trabalhadoresRurais = [];
    this.nextUnitId = 1;
    this.brigadistaBaseReadyAt = 0;
    this.spawnGuardaReadyAt = 0;
    this.firesExtinguished = 0;
    this.arsonistsCaptured = 0;
    this.integratedActionsUsed = 0;
    this.isEnding = false;
    this.isStoryModalOpen = true;
    this.introStarted = false;
    this.speakingBrigadista = null;
    this.brigadistaSpeechBubble = null;
    this.trabalhadorIntroShown = false;
    this.introTrabalhador = null;
    this.trabalhadorSpeechBubble = null;
    this.cityHouses = [];
    this.gameTimeMs = 0;
    this.houseFocusContainer = null;
    this.prefeituraFocusContainer = null;
    this.followedTarget = null;
    this.cameraZoom = 0.28125;
    this.isPinchingCamera = false;
    this.initialPinchDistance = 0;
    this.initialPinchZoom = 0.28125;
  }

  public create(): void {
    this.matchStartTime = this.time.now;
    SoundManager.startMusic();

    this.setupScrollableCamera();
    registerCollisionSystem(this, new CollisionSystem());
    this.drawConcentricSantaremMap();

    this.phaseSystem = new PoliticalPhaseSystem(BALANCE.INITIAL_CONSCIOUSNESS);
    this.fireSystem = new FireSmokeSystem(this);
    this.sectorSystem = new SectorSystem(
      this,
      this.difficulty,
      this.phaseSystem,
      this.fireSystem
    );
    this.spawnerSystem = new SpawnerSystem(this);
    this.boss = new BossFortress(this, this.difficulty.bossMaxHp);

    this.indigenousShieldGraphics = this.add.graphics().setDepth(15);

    // Personagens iniciais: Brigadista junto à base dos Brigadistas (noroeste da Floresta) e os dois
    // Trabalhadores Rurais ao Norte. Cada personagem nasce com 3 focos próximos de si.
    const brigadistaSpot = {
      x: BASE_BRIGADISTA_X + BRIGADISTA_BASE_SPAWN_OFFSET.x,
      y: BASE_BRIGADISTA_Y + BRIGADISTA_BASE_SPAWN_OFFSET.y
    };
    const northSpotY = WORLD_CENTER_Y - CAMPO_RADIUS_Y - 55;
    const northSpots = [
      { x: WORLD_CENTER_X - 240, y: northSpotY },
      { x: WORLD_CENTER_X + 240, y: northSpotY }
    ];
    // Focos a 55px do personagem e um logo acima: ficam separados entre si e o mais próximo fica ao alcance de combate
    const initialFireOffsets: [number, number][] = [
      [-55, 0],
      [55, 0],
      [0, -20]
    ];
    for (const spot of [brigadistaSpot, ...northSpots]) {
      for (const [dx, dy] of initialFireOffsets) {
        this.fireSystem.spawnFire(spot.x + dx, spot.y + dy, 22);
      }
    }

    // Estado inicial do GDD (Fase 1): 1 Brigada Voluntária restrita ao anel da Floresta
    const brigadista = this.spawnBrigadistaUnit(brigadistaSpot.x, brigadistaSpot.y, false, false);
    // Atualização com dt 0: sem movimento nem dano, só aplica a animação de combate
    // (o loop de update fica pausado enquanto o modal de história está aberto)
    brigadista?.update(0, this.fireSystem, this.boss);

    // 1 Trabalhador Rural de cada tipo, cada um no centro de um dos grupos de focos do Norte
    (['a', 'b'] as TrabalhadorRuralVariant[]).forEach((variant, i) => {
      const worker = this.spawnTrabalhadorRuralUnit(northSpots[i].x, northSpots[i].y, variant);
      worker.update(0, this.fireSystem);
    });

    // Inicia a câmera posicionada no Campo (Anel Médio), enquadrando Floresta, Campo e Cidade conforme imagem de referência
    this.centerCameraOnPoint(1864, 3994.5, false);

    this.registerEvents();

    // Inicia HUD Mobile-First em cena paralela
    this.scene.launch('UIScene', { gameScene: this });
  }

  /**
   * Configura a câmera principal para ocupar o viewport entre o HUD superior e o HUD inferior,
   * com suporte a navegação por arraste, roda do mouse (zoom) e movimento de pinça no celular.
   */
  private setupScrollableCamera(): void {
    const cam = this.cameras.main;
    cam.setViewport(0, MAP_TOP_Y, GAME_WIDTH, MAP_VIEWPORT_HEIGHT);
    cam.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    cam.centerOn(WORLD_CENTER_X, WORLD_CENTER_Y);
    cam.setZoom(this.cameraZoom);

    // Habilita ponteiro adicional para suporte a gestos multitoque (pinça / pinch-to-zoom)
    this.input.addPointer(1);

    if (this.input.keyboard) {
      this.cursors = this.input.keyboard.createCursorKeys();
      this.wasdKeys = {
        W: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
        A: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
        S: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
        D: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D)
      };

      // Atalhos de teclado para zoom (+ / - / =)
      this.input.keyboard.on('keydown-PLUS', () => this.zoomIn());
      this.input.keyboard.on('keydown-EQUALS', () => this.zoomIn());
      this.input.keyboard.on('keydown-MINUS', () => this.zoomOut());
    }

    // 1. Zoom via Roda de Rolagem do Mouse (Mouse Wheel)
    this.input.on(
      'wheel',
      (pointer: Phaser.Input.Pointer, _over: unknown[], _dx: number, deltaY: number) => {
        if (pointer.y < MAP_TOP_Y || pointer.y > MAP_BOTTOM_Y) return;
        SoundManager.unlock();
        const factor = deltaY > 0 ? 0.88 : 1.14;
        this.setCameraZoom(this.cameraZoom * factor, false);
      }
    );

    // 2. Toque inicial e detecção de Pinça (Pinch) ou Arraste (Pan)
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.y < MAP_TOP_Y || pointer.y > MAP_BOTTOM_Y) return;
      SoundManager.unlock();

      const p1 = this.input.pointer1;
      const p2 = this.input.pointer2;

      // Se dois dedos estiverem na tela, inicia o movimento de pinça no celular
      if (p1.isDown && p2.isDown) {
        this.isPinchingCamera = true;
        this.isDraggingCamera = false;
        this.initialPinchDistance = Math.hypot(p1.x - p2.x, p1.y - p2.y);
        this.initialPinchZoom = this.cameras.main.zoom;
        return;
      }

      this.isDraggingCamera = true;
      this.dragStartPointerX = pointer.x;
      this.dragStartPointerY = pointer.y;
      this.dragStartScrollX = cam.scrollX;
      this.dragStartScrollY = cam.scrollY;
    });

    // 3. Movimento: Atualiza Zoom por Pinça ou Arraste de Câmera
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      const p1 = this.input.pointer1;
      const p2 = this.input.pointer2;

      // Movimento de pinça com 2 dedos no celular
      if (p1.isDown && p2.isDown) {
        this.isDraggingCamera = false;
        const currentDist = Math.hypot(p1.x - p2.x, p1.y - p2.y);
        if (this.initialPinchDistance > 12) {
          const pinchFactor = currentDist / this.initialPinchDistance;
          this.setCameraZoom(this.initialPinchZoom * pinchFactor, false);
        }
        return;
      }

      if (!this.isDraggingCamera || !pointer.isDown || this.isPinchingCamera) return;

      // Ajusta o arraste pelo fator de zoom da câmera para movimentação fluida 1:1
      const dx = (pointer.x - this.dragStartPointerX) / cam.zoom;
      const dy = (pointer.y - this.dragStartPointerY) / cam.zoom;

      if (Math.hypot(dx, dy) > 3) {
        if (Math.hypot(dx, dy) > 8 && this.followedTarget) {
          this.stopFollowingEntity();
        }
        cam.scrollX = Phaser.Math.Clamp(
          this.dragStartScrollX - dx,
          0,
          WORLD_WIDTH - GAME_WIDTH
        );
        cam.scrollY = Phaser.Math.Clamp(
          this.dragStartScrollY - dy,
          0,
          WORLD_HEIGHT - MAP_VIEWPORT_HEIGHT
        );
      }
    });

    this.input.on('pointerup', () => {
      const p1 = this.input.pointer1;
      const p2 = this.input.pointer2;
      if (!p1.isDown && !p2.isDown) {
        this.isPinchingCamera = false;
        this.isDraggingCamera = false;
      } else if (!p1.isDown || !p2.isDown) {
        this.isPinchingCamera = false;
      }
    });
  }

  public setCameraZoom(newZoom: number, animate = false): void {
    const target = Phaser.Math.Clamp(newZoom, this.minCameraZoom, this.maxCameraZoom);
    this.cameraZoom = target;
    const cam = this.cameras.main;

    if (!animate) {
      cam.setZoom(target);
      return;
    }

    this.tweens.add({
      targets: cam,
      zoom: target,
      duration: 220,
      ease: 'Cubic.easeOut'
    });
  }

  public zoomIn(): void {
    SoundManager.unlock();
    SoundManager.playSelect();
    this.setCameraZoom(this.cameraZoom * 1.25, true);
  }

  public zoomOut(): void {
    SoundManager.unlock();
    SoundManager.playSelect();
    this.setCameraZoom(this.cameraZoom * 0.8, true);
  }

  public getCameraZoom(): number {
    return this.cameraZoom;
  }

  public centerCameraOnPoint(wx: number, wy: number, animate = true, cancelFollow = true): void {
    if (cancelFollow && this.followedTarget) {
      // Se a centralização for chamada para um ponto diferente da entidade seguida, cancela o acompanhamento
      if (Math.hypot(this.followedTarget.x - wx, this.followedTarget.y - wy) > 20) {
        this.stopFollowingEntity();
      }
    }

    const cam = this.cameras.main;
    const targetScrollX = Phaser.Math.Clamp(
      wx - GAME_WIDTH / 2,
      0,
      WORLD_WIDTH - GAME_WIDTH
    );
    const targetScrollY = Phaser.Math.Clamp(
      wy - MAP_VIEWPORT_HEIGHT / 2,
      0,
      WORLD_HEIGHT - MAP_VIEWPORT_HEIGHT
    );

    if (!animate) {
      cam.setScroll(targetScrollX, targetScrollY);
      return;
    }

    this.tweens.add({
      targets: cam,
      scrollX: targetScrollX,
      scrollY: targetScrollY,
      duration: 380,
      ease: 'Cubic.easeOut'
    });
  }

  public followEntity(target: FollowableTarget): void {
    if (this.followedTarget === target) return;

    if (this.followedTarget) {
      this.followedTarget.setFollowed(false);
    }

    this.followedTarget = target;
    target.setFollowed(true);

    SoundManager.unlock();
    SoundManager.playSelect();

    // Centraliza suavemente na entidade ao iniciar o acompanhamento
    this.centerCameraOnPoint(target.x, target.y, true, false);

    this.events.emit('camera-follow-changed', target);
  }

  public stopFollowingEntity(): void {
    if (!this.followedTarget) return;

    this.followedTarget.setFollowed(false);
    this.followedTarget = null;

    this.events.emit('camera-follow-changed', null);
  }

  public getFollowedEntity(): FollowableTarget | null {
    return this.followedTarget;
  }

  /**
   * Foca o Brigadista Voluntário ao iniciar a partida. Ele começa com energia cheia e a fala
   * de exaustão só aparece quando a energia chegar ao mínimo (ver showBrigadistaExhaustedBubble).
   */
  public startBrigadistaIntro(): void {
    if (this.introStarted) return;
    const voluntario = this.brigadistas[0];
    if (!voluntario) return;

    this.introStarted = true;
    this.followEntity(voluntario);
  }

  /** Exibe a fala de exaustão acima do brigadista que chegou ao mínimo de energia. */
  private showBrigadistaExhaustedBubble(brigadista: Brigadista): void {
    if (this.isEnding) return;

    this.brigadistaSpeechBubble?.dismiss();
    this.followEntity(brigadista);

    const bubble = new SpeechBubble(this, BRIGADISTA_EXAUSTO_TEXT);
    bubble.once('tap', () => this.events.emit('show-donation-info'));
    bubble.once('destroy', () => {
      if (this.brigadistaSpeechBubble === bubble) {
        this.brigadistaSpeechBubble = null;
        this.speakingBrigadista = null;
      }
    });
    this.speakingBrigadista = brigadista;
    this.brigadistaSpeechBubble = bubble;
    this.updateBrigadistaSpeechBubble();
  }

  /**
   * Foca um Trabalhador Rural (o mais próximo de um foco ativo) e exibe a fala sobre o risco do combate.
   * Ocorre uma única vez por partida, na primeira doação de uma casa.
   */
  private startTrabalhadorIntro(): void {
    if (this.trabalhadorIntroShown || this.isEnding) return;
    const trabalhador = this.findTrabalhadorNearestFire();
    if (!trabalhador) return;

    this.trabalhadorIntroShown = true;
    this.introTrabalhador = trabalhador;
    this.followEntity(trabalhador);

    const bubble = new SpeechBubble(this, TRABALHADOR_INTRO_TEXT);
    bubble.once('tap', () => this.events.emit('show-trabalhador-info'));
    bubble.once('destroy', () => {
      if (this.trabalhadorSpeechBubble === bubble) {
        this.trabalhadorSpeechBubble = null;
        this.introTrabalhador = null;
      }
    });
    this.trabalhadorSpeechBubble = bubble;
    this.updateTrabalhadorSpeechBubble();
  }

  private findTrabalhadorNearestFire(): TrabalhadorRural | null {
    if (this.trabalhadoresRurais.length === 0) return null;

    const fires = this.fireSystem.getActiveFires();
    if (fires.length === 0) return this.trabalhadoresRurais[0];

    let best: TrabalhadorRural | null = null;
    let bestDist = Infinity;
    for (const trabalhador of this.trabalhadoresRurais) {
      for (const fire of fires) {
        const d = getIsoDistance(trabalhador.x, trabalhador.y, fire.data.x, fire.data.y);
        if (d < bestDist) {
          bestDist = d;
          best = trabalhador;
        }
      }
    }
    return best;
  }

  // Mantém a ponta da cauda logo acima da cabeça do personagem, mesmo com ele em movimento
  private updateBrigadistaSpeechBubble(): void {
    this.anchorSpeechBubble(this.brigadistaSpeechBubble, this.speakingBrigadista);
  }

  private updateTrabalhadorSpeechBubble(): void {
    this.anchorSpeechBubble(this.trabalhadorSpeechBubble, this.introTrabalhador);
  }

  private anchorSpeechBubble(bubble: SpeechBubble | null, unit: Unit | null): void {
    if (!bubble || !unit) return;

    const headY = unit.y - unit.sprite.displayHeight * unit.sprite.originY;
    bubble.followAnchor(unit.x, headY - 6, this.cameras.main.zoom);
  }

  /** Centraliza a câmera na prefeitura (Palácio Municipal) e a destaca para toque. */
  public focusPrefeitura(): void {
    if (!this.prefeituraPos || !this.prefeituraSprite) return;
    this.stopFollowingEntity();
    this.clearHouseFocus();
    this.clearPrefeituraFocus();
    this.centerCameraOnPoint(this.prefeituraPos.x, this.prefeituraPos.y, true, false);
    this.showPrefeituraFocusIndicator();
  }

  private showPrefeituraFocusIndicator(): void {
    if (!this.prefeituraSprite) return;
    const base = this.prefeituraSprite.getBottomCenter();
    const top = this.prefeituraSprite.getTopCenter();

    const ring = this.add.ellipse(0, 0, 620, 310).setStrokeStyle(4, 0xfacc15, 1);
    const label = this.add
      .text(0, 0, 'Toque na prefeitura', {
        fontSize: '12px',
        fontStyle: 'bold',
        color: '#fef08a',
        backgroundColor: '#052e16dd',
        padding: { x: 6, y: 3 }
      })
      .setOrigin(0.5, 1);
    label.setY(-ring.height / 2 - 6);

    this.tweens.add({
      targets: ring,
      scaleX: 1.12,
      scaleY: 1.12,
      alpha: 0.35,
      yoyo: true,
      repeat: -1,
      duration: 650
    });

    this.prefeituraFocusContainer = this.add
      .container(base.x, base.y - (base.y - top.y) * 0.5, [ring, label])
      .setDepth(60000)
      .setScale(1 / this.cameraZoom);
  }

  private clearPrefeituraFocus(): void {
    if (!this.prefeituraFocusContainer) return;
    this.tweens.killTweensOf(this.prefeituraFocusContainer.getAll());
    this.prefeituraFocusContainer.destroy();
    this.prefeituraFocusContainer = null;
  }

  private onPrefeituraClicked(): void {
    if (this.isEnding || this.isStoryModalOpen) return;
    SoundManager.unlock();
    SoundManager.playSelect();
    this.clearPrefeituraFocus();
    this.events.emit('prefeitura-clicked');
  }

  private createCityHouse(hx: number, hy: number): void {
    const sprite = this.add.sprite(hx, hy, 'casa_isometrica');
    sprite.setScale(1.3);
    sprite.setOrigin(0.5, 0.88);
    sprite.setDepth(hy);

    const obstacleId = getCollisionSystem(this).addObstacle(hx, hy, COLLISION.HOUSE_RADIUS);
    const house: CityHouse = { id: this.cityHouses.length + 1, sprite, obstacleId, readyAt: 0 };
    this.cityHouses.push(house);

    sprite.setInteractive({ useHandCursor: true });
    sprite.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      // Arrastar o mapa não conta como toque na casa
      if (pointer.getDistance() > 10) return;
      this.onCityHouseClicked(house);
    });
  }

  private onCityHouseClicked(house: CityHouse): void {
    if (this.isEnding || this.isStoryModalOpen) return;
    SoundManager.unlock();
    SoundManager.playSelect();
    this.clearHouseFocus();
    this.clearPrefeituraFocus();
    this.events.emit('house-clicked', house.id);
  }

  private findCityHouse(houseId: number): CityHouse | undefined {
    return this.cityHouses.find((house) => house.id === houseId);
  }

  public getHouseCooldownRemainingMs(houseId: number): number {
    const house = this.findCityHouse(houseId);
    return house ? Math.max(0, house.readyAt - this.gameTimeMs) : 0;
  }

  /** Doações são bloqueadas quando todos os brigadistas já estão com energia cheia. */
  public isHouseDonationBlocked(): boolean {
    return this.brigadistas.length > 0 && this.brigadistas.every((brig) => brig.getStaminaRatio() >= 1);
  }

  /** Envia a doação da casa: +Consciência de Classe e +energia para todos os brigadistas. */
  public donateFromHouse(houseId: number): boolean {
    const house = this.findCityHouse(houseId);
    if (!house || this.getHouseCooldownRemainingMs(houseId) > 0) return false;
    if (this.isHouseDonationBlocked()) return false;

    const { COOLDOWN_MS, CONSCIOUSNESS_GAIN, BRIGADISTA_ENERGY_PERCENT } =
      BALANCE.HOUSE_DONATION;
    house.readyAt = this.gameTimeMs + COOLDOWN_MS;

    this.phaseSystem.addConsciousness(CONSCIOUSNESS_GAIN, 'Doação de moradores');
    for (const brig of this.brigadistas) {
      brig.boostStaminaPercent(BRIGADISTA_ENERGY_PERCENT);
    }

    this.showDonationFeedback(house.sprite.x, house.sprite.y);
    this.launchDonationCar(house.sprite.x, house.sprite.y, house.obstacleId);
    this.startTrabalhadorIntro();
    return true;
  }

  /** Animação: carro popular sai da casa, leva a doação até a base dos brigadistas e volta para a casa. */
  private launchDonationCar(homeX: number, homeY: number, homeObstacleId: string): void {
    const collision = getCollisionSystem(this);
    const dirX = homeX - BASE_BRIGADISTA_X;
    const dirY = homeY - BASE_BRIGADISTA_Y;
    const dirLen = Math.hypot(dirX, dirY) || 1;
    // Para na borda da base, do lado por onde o carro chega
    const stopDist = COLLISION.BASE_BRIGADISTA_RADIUS + COLLISION.AGENT_CLEARANCE + 8;
    const destination = collision.snapToFree(
      BASE_BRIGADISTA_X + (dirX / dirLen) * stopDist,
      BASE_BRIGADISTA_Y + (dirY / dirLen) * stopDist
    );
    this.carrosDoacao.push(new CarroPopular(this, homeX, homeY, destination, homeObstacleId));
  }

  /** Centraliza a câmera numa casa aleatória e pede que o jogador toque em uma casa. */
  public focusRandomHouse(): void {
    if (this.cityHouses.length === 0) return;
    const house = Phaser.Utils.Array.GetRandom(this.cityHouses);

    this.stopFollowingEntity();
    this.clearHouseFocus();
    this.clearPrefeituraFocus();
    this.centerCameraOnPoint(house.sprite.x, house.sprite.y, true, false);
    this.showHouseFocusIndicator(house.sprite.x, house.sprite.y);
  }

  private showHouseFocusIndicator(x: number, y: number): void {
    const ring = this.add.ellipse(0, 0, 90, 46).setStrokeStyle(3, 0xfacc15, 1);
    const label = this.add
      .text(0, -62, 'Toque em uma casa para doar', {
        fontSize: '12px',
        fontStyle: 'bold',
        color: '#fef08a',
        backgroundColor: '#052e16dd',
        padding: { x: 6, y: 3 }
      })
      .setOrigin(0.5);

    this.tweens.add({
      targets: ring,
      scaleX: 1.15,
      scaleY: 1.15,
      alpha: 0.35,
      yoyo: true,
      repeat: -1,
      duration: 650
    });

    this.houseFocusContainer = this.add
      .container(x, y, [ring, label])
      .setDepth(60000)
      .setScale(1 / this.cameraZoom);
  }

  private clearHouseFocus(): void {
    if (!this.houseFocusContainer) return;
    this.tweens.killTweensOf(this.houseFocusContainer.getAll());
    this.houseFocusContainer.destroy();
    this.houseFocusContainer = null;
  }

  private showDonationFeedback(x: number, y: number): void {
    const { CONSCIOUSNESS_GAIN, BRIGADISTA_ENERGY_PERCENT } = BALANCE.HOUSE_DONATION;
    const gainText = String(CONSCIOUSNESS_GAIN).replace('.', ',');

    const feedback = this.add
      .text(x, y - 60, `+${gainText}% consciência\n+${BRIGADISTA_ENERGY_PERCENT}% energia`, {
        fontSize: '12px',
        fontStyle: 'bold',
        color: '#86efac',
        align: 'center',
        stroke: '#052e16',
        strokeThickness: 3
      })
      .setOrigin(0.5)
      .setDepth(60000)
      .setScale(1 / this.cameraZoom);

    this.tweens.add({
      targets: feedback,
      y: y - 110,
      alpha: 0,
      duration: 1400,
      onComplete: () => feedback.destroy()
    });
  }

  public getCameraCenterWorldPoint(): { x: number; y: number; sector: SectorType } {
    const cam = this.cameras.main;
    const cx = cam.scrollX + GAME_WIDTH / 2;
    const cy = cam.scrollY + MAP_VIEWPORT_HEIGHT / 2;
    return {
      x: cx,
      y: cy,
      sector: getSectorAtPoint(cx, cy)
    };
  }

  /**
   * Desenha o mapa de Santarém e Baixo Tapajós em Visão Isométrica com Setores Quadrados:
   * - Centro: CIDADE QUADRADA ISOMÉTRICA com malha viária de asfalto, calçadas, linhas brancas e muro perimetral
   * - Anel Intermediário: CAMPO & RIBEIRINHOS QUADRADO ISOMÉTRICO
   * - Anel Externo: FLORESTA QUADRADA ISOMÉTRICA
   * Totalmente alinhado aos eixos isométricos (sem círculos concêntricos).
   */
  private drawConcentricSantaremMap(): void {
    const g = this.add.graphics().setDepth(1);
    const cx = WORLD_CENTER_X;
    const cy = WORLD_CENTER_Y;

    // Fundo de mata profunda nas bordas do mundo
    g.fillStyle(0x042f2e, 1);
    g.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

    // Malha sutil de relevo / grid isométrico no solo
    g.lineStyle(1, 0x064e3b, 0.28);
    for (let offset = -FLORESTA_OUTER_RADIUS; offset <= FLORESTA_OUTER_RADIUS; offset += 180) {
      g.beginPath();
      g.moveTo(cx + offset - 3000, cy - 1500 + (offset * 0.25));
      g.lineTo(cx + offset + 3000, cy + 1500 + (offset * 0.25));
      g.strokePath();

      g.beginPath();
      g.moveTo(cx + offset - 3000, cy + 1500 - (offset * 0.25));
      g.lineTo(cx + offset + 3000, cy - 1500 - (offset * 0.25));
      g.strokePath();
    }

    const drawIsoSquare = (radX: number, radY: number, fillHex?: number, strokeHex?: number, strokeWidth = 3) => {
      g.beginPath();
      g.moveTo(cx, cy - radY);
      g.lineTo(cx + radX, cy);
      g.lineTo(cx, cy + radY);
      g.lineTo(cx - radX, cy);
      g.closePath();
      if (fillHex !== undefined) {
        g.fillStyle(fillHex, 1);
        g.fillPath();
      }
      if (strokeHex !== undefined) {
        g.lineStyle(strokeWidth, strokeHex, 0.7);
        g.strokePath();
      }
    };

    // 3. Setor Externo: FLORESTA QUADRADA ISOMÉTRICA (Losango 2:1)
    drawIsoSquare(FLORESTA_OUTER_RADIUS, FLORESTA_OUTER_RADIUS_Y, 0x064e3b, 0x22c55e, 3);
    drawIsoSquare(FLORESTA_OUTER_RADIUS - 40, FLORESTA_OUTER_RADIUS_Y - 20, 0x047857);

    // 2. Setor Intermediário: CAMPO & RIBEIRINHOS QUADRADO ISOMÉTRICO (Losango 2:1)
    drawIsoSquare(CAMPO_RADIUS, CAMPO_RADIUS_Y, 0x3f6212, 0x84cc16, 3);
    drawIsoSquare(CAMPO_RADIUS - 30, CAMPO_RADIUS_Y - 15, 0x4d7c0f);

    // 1. Núcleo Central: CIDADE QUADRADA ISOMÉTRICA QUADRUPLICADA (Losango 2:1, Raio X: 1840px, Raio Y: 920px)
    // Piso de gramado verde vivo conforme imagem de referência
    drawIsoSquare(CITY_RADIUS, CITY_RADIUS_Y, 0x3a6b22, 0x22c55e, 4);
    drawIsoSquare(CITY_RADIUS - 14, CITY_RADIUS_Y - 7, 0x3a6b22);

    // Traçado viário ortogonal isométrico da Cidade:
    // Pistas de asfalto cinza escuro, linhas brancas tracejadas e quarteirões com gramado verde
    const streetsGraphics = this.add.graphics().setDepth(2);
    const markingsGraphics = this.add.graphics().setDepth(4);

    // Grid ortogonal isométrico ajustado para enquadramento idêntico à imagem de referência
    const streetStep = 240;
    const streetWidth = 64;
    const halfWidth = streetWidth / 2;
    const gridBound = 4 * streetStep; // Limite da malha viária da cidade (u, v de -960 a +960)

    // 1. Ruas na diagonal noroeste-sudeste (direção U: v = constante, dx = +1, dy = +0.5)
    for (let k = -4; k <= 4; k++) {
      const v = k * streetStep;
      const v1 = v - halfWidth;
      const v2 = v + halfWidth;

      streetsGraphics.fillStyle(0x222222, 1);
      streetsGraphics.beginPath();
      streetsGraphics.moveTo(cx - gridBound - v1, cy + (-gridBound + v1) * 0.5);
      streetsGraphics.lineTo(cx + gridBound - v1, cy + (gridBound + v1) * 0.5);
      streetsGraphics.lineTo(cx + gridBound - v2, cy + (gridBound + v2) * 0.5);
      streetsGraphics.lineTo(cx - gridBound - v2, cy + (-gridBound + v2) * 0.5);
      streetsGraphics.closePath();
      streetsGraphics.fillPath();

      // Linhas brancas tracejadas no centro da via (apenas entre os cruzamentos)
      markingsGraphics.lineStyle(3, 0xf8fafc, 0.92);
      for (let m = -4; m < 4; m++) {
        const uStart = m * streetStep + halfWidth + 6;
        const uEnd = (m + 1) * streetStep - halfWidth - 6;

        for (let du = uStart; du + 10 <= uEnd; du += 22) {
          const x1 = cx + du - v;
          const y1 = cy + (du + v) * 0.5;
          const x2 = cx + (du + 12) - v;
          const y2 = cy + (du + 12 + v) * 0.5;
          markingsGraphics.lineBetween(x1, y1, x2, y2);
        }
      }
    }

    // 2. Ruas na diagonal sudoeste-nordeste (direção V: u = constante, dx = -1, dy = +0.5)
    for (let m = -4; m <= 4; m++) {
      const u = m * streetStep;
      const u1 = u - halfWidth;
      const u2 = u + halfWidth;

      streetsGraphics.fillStyle(0x222222, 1);
      // Na rua central (m === 0), interrompe o trecho entre v = halfWidth e v = streetStep - halfWidth
      // para unir os dois quarteirões centrais (-1, 0) e (0, 0) onde fica a Prefeitura
      const vSegments: Array<[number, number]> =
        m === 0
          ? [
              [-gridBound, halfWidth],
              [streetStep - halfWidth, gridBound]
            ]
          : [[-gridBound, gridBound]];

      for (const [vMin, vMax] of vSegments) {
        streetsGraphics.beginPath();
        streetsGraphics.moveTo(cx + u1 - vMin, cy + (u1 + vMin) * 0.5);
        streetsGraphics.lineTo(cx + u2 - vMin, cy + (u2 + vMin) * 0.5);
        streetsGraphics.lineTo(cx + u2 - vMax, cy + (u2 + vMax) * 0.5);
        streetsGraphics.lineTo(cx + u1 - vMax, cy + (u1 + vMax) * 0.5);
        streetsGraphics.closePath();
        streetsGraphics.fillPath();
      }

      // Linhas brancas tracejadas no centro da via (apenas entre os cruzamentos)
      markingsGraphics.lineStyle(3, 0xf8fafc, 0.92);
      for (let k = -4; k < 4; k++) {
        // Sem faixa tracejada no trecho removido entre os dois quarteirões da Prefeitura
        if (m === 0 && k === 0) continue;

        const vStart = k * streetStep + halfWidth + 6;
        const vEnd = (k + 1) * streetStep - halfWidth - 6;

        for (let dv = vStart; dv + 10 <= vEnd; dv += 22) {
          const x1 = cx + u - dv;
          const y1 = cy + (u + dv) * 0.5;
          const x2 = cx + u - (dv + 12);
          const y2 = cy + (u + dv + 12) * 0.5;
          markingsGraphics.lineBetween(x1, y1, x2, y2);
        }
      }
    }

    // 3. Casas populares de Santarém alinhadas nos quarteirões gramados (conforme imagem de referência)
    // Cada quarteirão possui fileiras organizadas de casas voltadas para a rua
    for (let i = -4; i < 4; i++) {
      for (let j = -4; j < 4; j++) {
        const uc = (i + 0.5) * streetStep;
        const vc = (j + 0.5) * streetStep;

        // Quarteirão (-1, 0) foi unificado com (0, 0) para abrigar a Prefeitura em quadra dupla
        if (i === -1 && j === 0) {
          continue;
        }

        // Quadra dupla central ((-1, 0) + (0, 0)): Palácio Municipal (Prefeitura) ocupando os 2 quarteirões somados
        if (i === 0 && j === 0) {
          const mergedUc = 0; // Centro entre os quarteirões i = -1 e i = 0
          const mergedVc = vc; // 0.5 * streetStep
          const px = cx + mergedUc - mergedVc + 12;
          const py = cy + (mergedUc + mergedVc) * 0.5 - 10;

          const prefeitura = this.add.sprite(px, py, 'prefeitura');
          prefeitura.setOrigin(0.5, 0.652);
          prefeitura.setScale(580 / 2477);
          prefeitura.setDepth(py + 14);
          prefeitura.setInteractive({ useHandCursor: true });
          prefeitura.on('pointerup', (pointer: Phaser.Input.Pointer) => {
            if (pointer.getDistance() > 10) return;
            this.onPrefeituraClicked();
          });
          this.prefeituraSprite = prefeitura;
          this.prefeituraPos = { x: px, y: py };

          const collision = getCollisionSystem(this);
          for (const uOffset of [-0.5 * streetStep, 0, 0.5 * streetStep]) {
            const obsU = mergedUc + uOffset;
            const obsX = cx + obsU - mergedVc;
            const obsY = cy + (obsU + mergedVc) * 0.5;
            collision.addObstacle(obsX, obsY, COLLISION.PREFEITURA_RADIUS);
          }
          continue;
        }

        // Determina a quantidade de casas nas fileiras frontal e traseira da quadra
        let frontCount = 4;
        let backCount = 2;

        if (i === -1 && j === -1) {
          frontCount = 4;
          backCount = 0; // Bloco superior esquerdo: 1 fileira de 4 casas
        } else if (i === 0 && j === -1) {
          frontCount = 4;
          backCount = 2; // Bloco superior central
        } else if (i === 1 && j === 0) {
          frontCount = 2;
          backCount = 2; // Bloco centro-direito
        } else if (i === 1 && j === -1) {
          frontCount = 2;
          backCount = 2; // Bloco superior direito
        } else if (i === -1 && j === 1) {
          frontCount = 3;
          backCount = 1; // Bloco inferior esquerdo
        } else if (i === 0 && j === 1) {
          frontCount = 4;
          backCount = 2; // Bloco inferior central
        } else if (i === 1 && j === 1) {
          frontCount = 2;
          backCount = 1; // Bloco inferior direito
        } else if (i === -2 && j === 0) {
          frontCount = 4;
          backCount = 2;
        } else if (i === -2 && j === -1) {
          frontCount = 2;
          backCount = 0;
        } else if (i === 2 && j === 0) {
          frontCount = 2;
          backCount = 0;
        } else if (i === 2 && j === -1) {
          frontCount = 2;
          backCount = 2;
        } else if (i === -2 && j === 1) {
          frontCount = 2;
          backCount = 1;
        } else {
          // Padrão determinístico variado para as demais quadras do loteamento
          const seed = Math.abs((i * 11 + j * 17 + 5) % 5);
          if (seed === 0) { frontCount = 4; backCount = 2; }
          else if (seed === 1) { frontCount = 3; backCount = 1; }
          else if (seed === 2) { frontCount = 2; backCount = 2; }
          else if (seed === 3) { frontCount = 2; backCount = 0; }
          else { frontCount = 3; backCount = 0; }
        }

        const getRowOffsets = (count: number): number[] => {
          if (count === 4) return [-66, -22, 22, 66];
          if (count === 3) return [-44, 0, 44];
          if (count === 2) return [-26, 26];
          if (count === 1) return [0];
          return [];
        };

        // Fileira frontal (voltada para a rua de baixo-esquerda)
        const frontOffsets = getRowOffsets(frontCount);
        const frontV = vc + 22;
        for (const offU of frontOffsets) {
          const u = uc + offU;
          const hx = cx + u - frontV;
          const hy = cy + (u + frontV) * 0.5;

          this.createCityHouse(hx, hy);
        }

        // Fileira traseira (recuada no quarteirão com espaçamento nítido para o gramado)
        const backOffsets = getRowOffsets(backCount);
        const backV = vc - 60;
        for (const offU of backOffsets) {
          const u = uc + offU;
          const hx = cx + u - backV;
          const hy = cy + (u + backV) * 0.5;

          this.createCityHouse(hx, hy);
        }
      }
    }

    // Props do CAMPO QUADRADO ISOMÉTRICO (Palafitas e roçados ribeirinhos)
    for (let i = 0; i < 24; i++) {
      const pt = getRandomPointInSector(SectorType.CAMPO, 36);
      this.add
        .sprite(pt.x, pt.y, 'prop_farm')
        .setOrigin(0.5, 0.9)
        .setDepth(15 + Math.floor(pt.y))
        .setAlpha(0.96);
      getCollisionSystem(this).addObstacle(pt.x, pt.y, COLLISION.FARM_RADIUS);
    }

    // Sede dos Brigadistas Voluntários no anel da Floresta (noroeste, distância isométrica ~3400)
    const baseX = BASE_BRIGADISTA_X;
    const baseY = BASE_BRIGADISTA_Y;
    const baseSprite = this.add
      .sprite(baseX, baseY, 'base_brigadista_voluntario')
      .setOrigin(0.5, 0.75)
      .setScale(440 / 2338);
    baseSprite.setDepth(15 + Math.floor(baseY + baseSprite.displayHeight * 0.25));
    baseSprite.setInteractive({ useHandCursor: true });
    baseSprite.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      // Arrastar o mapa não conta como toque na base
      if (pointer.getDistance() > 10) return;
      this.onBrigadistaBaseClicked();
    });
    getCollisionSystem(this).addObstacle(baseX, baseY, COLLISION.BASE_BRIGADISTA_RADIUS);

    // Props da FLORESTA QUADRADA ISOMÉTRICA (Samaúmas e Castanheiras)
    // Clareira ao redor da sede: nenhuma árvore nasce sobre o prédio
    const baseClearing = 260;
    for (let i = 0; i < 200; i++) {
      let pt = getRandomPointInSector(SectorType.FLORESTA, 40);
      while (getIsoDistance(pt.x, pt.y, baseX, baseY) < baseClearing) {
        pt = getRandomPointInSector(SectorType.FLORESTA, 40);
      }
      const sprite = this.add
        .sprite(pt.x, pt.y, 'prop_tree')
        .setOrigin(0.5, 0.92)
        .setScale(3)
        .setDepth(15 + Math.floor(pt.y))
        .setAlpha(0.98);
      getCollisionSystem(this).addObstacle(pt.x, pt.y, COLLISION.TREE_RADIUS);
      this.forestTrees.push({ x: pt.x, y: pt.y, sprite, state: 'healthy', burnLeftMs: 0 });
    }
  }

  // Árvores saudáveis perto de um foco ativo pegam fogo; a árvore em chamas vira um foco próprio
  private updateForestTrees(deltaMs: number): void {
    for (const tree of this.forestTrees) {
      if (tree.state !== 'burning') continue;
      tree.burnLeftMs -= deltaMs;
      if (tree.burnLeftMs <= 0) {
        tree.state = 'burned';
        tree.sprite.setTint(0x3f3f46);
      }
    }

    this.treeFireTimer += deltaMs;
    if (this.treeFireTimer < TREE_FIRE.CHECK_INTERVAL_MS) return;
    this.treeFireTimer = 0;

    const fires = this.fireSystem.getActiveFires();
    if (fires.length === 0) return;

    for (const tree of this.forestTrees) {
      if (tree.state !== 'healthy') continue;
      for (const fire of fires) {
        if (getIsoDistance(tree.x, tree.y, fire.data.x, fire.data.y) > TREE_FIRE.IGNITION_RADIUS) continue;
        const chance = TREE_FIRE.IGNITION_CHANCE_PER_CHECK * (fire.data.intensity / 100);
        if (Math.random() < chance) {
          tree.state = 'burning';
          tree.burnLeftMs = TREE_FIRE.BURN_DURATION_MS;
          tree.sprite.setTint(0xff7a1a);
          this.fireSystem.spawnFire(tree.x, tree.y, TREE_FIRE.INITIAL_INTENSITY);
          break;
        }
      }
    }
  }

  // Converte coordenadas do grid lógico para coordenadas de tela isométrica
  private cartesianToIsometric(cartX: number, cartY: number, originX: number, originY: number) {
    const screenX = originX + (cartX - cartY) * (this.tileWidth / 2);
    const screenY = originY + (cartX + cartY) * (this.tileHeight / 2);
    return { x: screenX, y: screenY };
  }

  // Desenha o piso isométrico para referência do cenário
  private drawIsometricGrid(originX: number, originY: number) {
    const graphics = this.add.graphics().setDepth(2);
    graphics.lineStyle(1, 0x92400e, 0.4);

    for (let x = 0; x < this.mapGridWidth; x++) {
      for (let y = 0; y < this.mapGridHeight; y++) {
        const p1 = this.cartesianToIsometric(x, y, originX, originY);
        const p2 = this.cartesianToIsometric(x + 1, y, originX, originY);
        const p3 = this.cartesianToIsometric(x + 1, y + 1, originX, originY);
        const p4 = this.cartesianToIsometric(x, y + 1, originX, originY);

        graphics.beginPath();
        graphics.moveTo(p1.x, p1.y);
        graphics.lineTo(p2.x, p2.y);
        graphics.lineTo(p3.x, p3.y);
        graphics.lineTo(p4.x, p4.y);
        graphics.closePath();
        graphics.strokePath();
      }
    }
  }

  private registerEvents(): void {
    this.fireSystem.on('fire-extinguished', () => {
      this.firesExtinguished++;
      this.phaseSystem.addConsciousness(1, 'Foco de incêndio contido');
    });

    this.boss.on('boss-defeated', () => {
      this.triggerGameOver(
        true,
        'O Burguês foi derrotado pela união entre Cidade, Campo e Floresta! O Baixo Tapajós respira livre!'
      );
    });

    this.phaseSystem.on(
      'phase-changed',
      (newPhase: PoliticalPhaseDefinition) => {
        this.handlePhaseMilestone(newPhase);
      }
    );

    this.sectorSystem.on('integrated-action-executed', () => {
      this.integratedActionsUsed++;
    });

    this.spawnerSystem.on('arsonist-tapped', (clicked: Incendiario) => {
      this.followEntity(clicked);
    });
  }

  private handlePhaseMilestone(phase: PoliticalPhaseDefinition): void {
    // Fase 2 (20%): Evolui a Brigada Voluntária isolada para Brigada Comunitária e adiciona +1 esquadrão na Cidade!
    if (phase.id >= PoliticalPhaseId.FASE_2_SEMENTE_ORGANIZACAO) {
      this.brigadistas.forEach((b) => b.evolveToComunitario());
      if (this.brigadistas.length < 2) {
        this.spawnBrigadistaUnit(WORLD_CENTER_X - 45, WORLD_CENTER_Y + 35, true, false);
      }
    }

    // Fase 4 (50%): Surge automaticamente o primeiro Guarda Florestal Comunitário Armado na Floresta!
    if (
      phase.id >= PoliticalPhaseId.FASE_4_AUTODEFESA_ARMADA &&
      this.guardas.length === 0
    ) {
      this.spawnGuardaUnit(WORLD_CENTER_X + 60, WORLD_CENTER_Y + CAMPO_RADIUS_Y + 30, false);
    }

    // Fase 5 (65%): Demarcação das Terras Indígenas (Barreira ecológica elíptica na Floresta)
    if (phase.id >= PoliticalPhaseId.FASE_5_ESCUDO_TERRITORIAL) {
      this.drawIndigenousDemarcationShield();
    }

    // Fase 6 (100%): União Total! O Burguês se revela
    if (phase.id === PoliticalPhaseId.FASE_6_CONFRONTO_FINAL) {
      this.boss.reveal();
      this.centerCameraOnPoint(this.boss.x, this.boss.y, true);
    }
  }

  private drawIndigenousDemarcationShield(): void {
    this.indigenousShieldGraphics.clear();
    this.indigenousShieldGraphics.lineStyle(5, 0x10b981, 0.9);

    const drawShieldSquare = (rx: number, ry: number) => {
      this.indigenousShieldGraphics.beginPath();
      this.indigenousShieldGraphics.moveTo(WORLD_CENTER_X, WORLD_CENTER_Y - ry);
      this.indigenousShieldGraphics.lineTo(WORLD_CENTER_X + rx, WORLD_CENTER_Y);
      this.indigenousShieldGraphics.lineTo(WORLD_CENTER_X, WORLD_CENTER_Y + ry);
      this.indigenousShieldGraphics.lineTo(WORLD_CENTER_X - rx, WORLD_CENTER_Y);
      this.indigenousShieldGraphics.closePath();
      this.indigenousShieldGraphics.strokePath();
    };

    drawShieldSquare(CAMPO_RADIUS + 18, CAMPO_RADIUS_Y + 9);
    drawShieldSquare(FLORESTA_OUTER_RADIUS - 18, FLORESTA_OUTER_RADIUS_Y - 9);
  }

  public spawnBrigadistaUnit(
    x: number,
    y: number,
    isComunitario: boolean,
    focusCamera = true
  ): Brigadista | null {
    if (this.brigadistas.length >= BALANCE.MAX_BRIGADISTAS) return null;
    const unit = new Brigadista(
      this,
      `brig_${this.nextUnitId++}`,
      x,
      y,
      isComunitario,
      this.brigadistas.length
    );
    this.brigadistas.push(unit);
    unit.on('unit-tapped', (clicked: Unit) => {
      this.followEntity(clicked);
    });
    unit.on('brigadista-exhausted', (exhausted: Brigadista) => {
      this.showBrigadistaExhaustedBubble(exhausted);
    });
    if (focusCamera) {
      this.centerCameraOnPoint(x, y, true);
    }
    return unit;
  }

  public spawnGuardaUnit(
    x: number,
    y: number,
    focusCamera = true
  ): GuardaFlorestal | null {
    if (this.guardas.length >= BALANCE.MAX_GUARDAS) return null;
    const unit = new GuardaFlorestal(this, `guarda_${this.nextUnitId++}`, x, y);
    this.guardas.push(unit);
    unit.on('unit-tapped', (clicked: Unit) => {
      this.followEntity(clicked);
    });
    if (focusCamera) {
      this.centerCameraOnPoint(x, y, true);
    }
    return unit;
  }

  public spawnTrabalhadorRuralUnit(
    x: number,
    y: number,
    variant: TrabalhadorRuralVariant
  ): TrabalhadorRural {
    const unit = new TrabalhadorRural(this, `trab_${this.nextUnitId++}`, x, y, variant);
    this.trabalhadoresRurais.push(unit);
    unit.on('unit-tapped', (clicked: Unit) => {
      this.followEntity(clicked);
    });
    return unit;
  }

  /**
   * Mantém 1 Trabalhador Rural para cada N focos ativos (mínimo fixo).
   * Ao diminuir o fogo, só remove os que estão ociosos, sem apagar nenhum foco.
   */
  private updateTrabalhadoresRurais(): void {
    const { MIN_COUNT, FIRES_PER_WORKER } = BALANCE.TRABALHADOR_RURAL;
    const activeFires = this.fireSystem.getActiveFires().length;
    const targetCount = Math.max(MIN_COUNT, Math.ceil(activeFires / FIRES_PER_WORKER));

    while (this.trabalhadoresRurais.length < targetCount) {
      const countA = this.trabalhadoresRurais.filter((t) => t.variant === 'a').length;
      const countB = this.trabalhadoresRurais.length - countA;
      const variant: TrabalhadorRuralVariant = countA <= countB ? 'a' : 'b';
      const pt = getRandomPointInSector(SectorType.CAMPO, 36);
      this.spawnTrabalhadorRuralUnit(pt.x, pt.y, variant);
    }

    while (this.trabalhadoresRurais.length > targetCount) {
      const idleIndex = this.findLastIdleTrabalhadorIndex();
      if (idleIndex < 0) break;
      const [removed] = this.trabalhadoresRurais.splice(idleIndex, 1);
      if (this.getFollowedEntity() === removed) {
        this.stopFollowingEntity();
      }
      if (this.introTrabalhador === removed) {
        this.trabalhadorSpeechBubble?.destroy();
        this.trabalhadorSpeechBubble = null;
        this.introTrabalhador = null;
      }
      removed.destroy();
    }
  }

  private findLastIdleTrabalhadorIndex(): number {
    for (let i = this.trabalhadoresRurais.length - 1; i >= 0; i--) {
      if (!this.trabalhadoresRurais[i].isWorking()) return i;
    }
    return -1;
  }

  private onBrigadistaBaseClicked(): void {
    if (this.isEnding || this.isStoryModalOpen) return;
    SoundManager.unlock();
    SoundManager.playSelect();
    this.clearHouseFocus();
    this.clearPrefeituraFocus();
    this.events.emit('brigadista-base-clicked');
  }

  public getBrigadistaLimit(): number {
    return this.phaseSystem.isAjusteFiscalActive()
      ? BALANCE.BRIGADISTA_BASE_MAX_AJUSTE_FISCAL
      : BALANCE.MAX_BRIGADISTAS;
  }

  public getBrigadistaBaseCooldownRemainingMs(): number {
    return Math.max(0, this.brigadistaBaseReadyAt - this.time.now);
  }

  public tryRecruitBrigadista(): boolean {
    if (this.brigadistas.length >= this.getBrigadistaLimit()) return false;
    if (this.getBrigadistaBaseCooldownRemainingMs() > 0) return false;

    const spawnX = BASE_BRIGADISTA_X + BRIGADISTA_BASE_SPAWN_OFFSET.x;
    const spawnY = BASE_BRIGADISTA_Y + BRIGADISTA_BASE_SPAWN_OFFSET.y;
    const isComunitario = !this.phaseSystem.isAjusteFiscalActive();
    const unit = this.spawnBrigadistaUnit(spawnX, spawnY, isComunitario, true);
    if (!unit) return false;

    this.brigadistaBaseReadyAt = this.time.now + BALANCE.COOLDOWNS.SPAWN_BRIGADISTA_BASE;
    SoundManager.playSelect();
    return true;
  }

  public tryRecruitGuarda(): boolean {
    if (!this.phaseSystem.isGuardaFlorestalUnlocked()) return false;
    if (this.guardas.length >= BALANCE.MAX_GUARDAS) return false;
    if (this.time.now < this.spawnGuardaReadyAt) return false;

    this.spawnGuardaReadyAt = this.time.now + BALANCE.COOLDOWNS.SPAWN_GUARDA;
    const pt = getRandomPointInSector(SectorType.FLORESTA, 60);
    this.spawnGuardaUnit(pt.x, pt.y, true);
    SoundManager.playSelect();
    return true;
  }

  public getGuardaRecruitCooldownRatio(): number {
    if (this.time.now >= this.spawnGuardaReadyAt) return 0;
    return (this.spawnGuardaReadyAt - this.time.now) / BALANCE.COOLDOWNS.SPAWN_GUARDA;
  }

  public getBrigadistaCount(): number {
    return this.brigadistas.length;
  }

  public getGuardaCount(): number {
    return this.guardas.length;
  }

  public getAllUnits(): Unit[] {
    return [...this.brigadistas, ...this.guardas, ...this.trabalhadoresRurais];
  }

  public getForestHealth(): number {
    return this.forestHealth;
  }

  public healForest(amount: number): void {
    this.forestHealth = Phaser.Math.Clamp(this.forestHealth + amount, 0, 100);
  }

  public triggerIntegratedAction(type: IntegratedActionType): boolean {
    return this.sectorSystem.executeIntegratedAction(
      type,
      () => {
        this.brigadistas.forEach((b) => b.applyEquipmentBoost(15000));
        this.guardas.forEach((g) => g.applyEquipmentBoost(15000));
      },
      (bossDmg: number) => {
        if (this.boss && this.boss.isActive()) {
          this.boss.takeDamage(bossDmg);
        }
      }
    );
  }

  public triggerLocalAction(type: LocalActionType): boolean {
    return this.sectorSystem.executeLocalAction(type, (heal) => this.healForest(heal));
  }

  private captureArsonist(arsonist: Incendiario): void {
    if (!arsonist.isAlive()) return;
    const ax = arsonist.x;
    const ay = arsonist.y;
    arsonist.destroy();
    this.arsonistsCaptured++;
    this.sectorSystem.addCapturedArsonist();
    SoundManager.playCapture();

    const badge = this.add
      .text(ax, ay - 10, '⛓️ CAPTURADO!', {
        fontSize: '11px',
        fontStyle: 'bold',
        color: '#fef08a',
        backgroundColor: '#15803d',
        padding: { x: 4, y: 2 }
      })
      .setOrigin(0.5)
      .setDepth(45);

    this.tweens.add({
      targets: badge,
      y: ay - 34,
      alpha: 0,
      duration: 950,
      onComplete: () => badge.destroy()
    });
  }

  public override update(_time: number, deltaMs: number): void {
    if (this.isEnding || this.isStoryModalOpen) return;

    this.gameTimeMs += deltaMs;
    this.houseFocusContainer?.setScale(1 / this.cameraZoom);
    this.prefeituraFocusContainer?.setScale(1 / this.cameraZoom);

    // Suporte adicional a setas / WASD para mover a câmera caso jogue no computador
    const camSpeed = 0.42 * deltaMs;
    const cam = this.cameras.main;
    let manualKeyMove = false;
    if (this.cursors?.left.isDown || this.wasdKeys?.A.isDown) {
      cam.scrollX = Phaser.Math.Clamp(cam.scrollX - camSpeed, 0, WORLD_WIDTH - GAME_WIDTH);
      manualKeyMove = true;
    }
    if (this.cursors?.right.isDown || this.wasdKeys?.D.isDown) {
      cam.scrollX = Phaser.Math.Clamp(cam.scrollX + camSpeed, 0, WORLD_WIDTH - GAME_WIDTH);
      manualKeyMove = true;
    }
    if (this.cursors?.up.isDown || this.wasdKeys?.W.isDown) {
      cam.scrollY = Phaser.Math.Clamp(
        cam.scrollY - camSpeed,
        0,
        WORLD_HEIGHT - MAP_VIEWPORT_HEIGHT
      );
      manualKeyMove = true;
    }
    if (this.cursors?.down.isDown || this.wasdKeys?.S.isDown) {
      cam.scrollY = Phaser.Math.Clamp(
        cam.scrollY + camSpeed,
        0,
        WORLD_HEIGHT - MAP_VIEWPORT_HEIGHT
      );
      manualKeyMove = true;
    }

    if (manualKeyMove && this.followedTarget) {
      this.stopFollowingEntity();
    } else if (this.followedTarget) {
      // Se a entidade tiver método isAlive e não estiver mais viva, interrompe
      if (this.followedTarget.isAlive && !this.followedTarget.isAlive()) {
        this.stopFollowingEntity();
      } else {
        // Interpola suavemente a câmera para manter a entidade acompanhada no centro
        const targetScrollX = Phaser.Math.Clamp(
          this.followedTarget.x - GAME_WIDTH / 2,
          0,
          WORLD_WIDTH - GAME_WIDTH
        );
        const targetScrollY = Phaser.Math.Clamp(
          this.followedTarget.y - MAP_VIEWPORT_HEIGHT / 2,
          0,
          WORLD_HEIGHT - MAP_VIEWPORT_HEIGHT
        );
        cam.scrollX = Phaser.Math.Linear(cam.scrollX, targetScrollX, 0.08);
        cam.scrollY = Phaser.Math.Linear(cam.scrollY, targetScrollY, 0.08);
      }
    }

    this.sectorSystem.update(deltaMs);

    this.spawnerSystem.update(
      deltaMs,
      this.difficulty.arsonistSpawnIntervalMs,
      this.phaseSystem.getCurrentPhase().id
    );

    const arsonists = this.spawnerSystem.getArsonists();
    for (const arsonist of arsonists) {
      arsonist.update(deltaMs, this.fireSystem);
    }

    for (const brig of this.brigadistas) {
      brig.update(deltaMs, this.fireSystem, this.boss);
    }
    this.updateBrigadistaSpeechBubble();

    for (const carro of this.carrosDoacao) {
      carro.update(deltaMs);
    }
    this.carrosDoacao = this.carrosDoacao.filter((carro) => carro.isAlive());

    for (const guarda of this.guardas) {
      guarda.update(deltaMs, arsonists, this.boss, (captured) =>
        this.captureArsonist(captured)
      );
    }

    for (const trabalhador of this.trabalhadoresRurais) {
      trabalhador.update(deltaMs, this.fireSystem);
    }
    this.updateTrabalhadoresRurais();
    this.updateTrabalhadorSpeechBubble();

    const { forestDamage } = this.fireSystem.update(
      deltaMs,
      this.difficulty.fireGrowthMultiplier,
      this.phaseSystem.isIndigenousDemarcationActive()
    );
    this.updateForestTrees(deltaMs);

    this.forestHealth = Phaser.Math.Clamp(this.forestHealth - forestDamage, 0, 100);

    this.boss.update(deltaMs, () => {
      this.spawnerSystem.spawnArsonist(SectorType.FLORESTA);
      this.spawnerSystem.spawnArsonist(SectorType.CAMPO);
    });

    if (this.forestHealth <= 0) {
      this.triggerGameOver(
        false,
        'A Saúde da Floresta chegou a 0%. A fumaça negra absoluta e o fogo consumiram o território do Tapajós.'
      );
    }
  }

  private triggerGameOver(victory: boolean, reason: string): void {
    if (this.isEnding) return;
    this.isEnding = true;

    const elapsedSeconds = Math.max(1, Math.round((this.time.now - this.matchStartTime) / 1000));
    const result: GameStatsResult = {
      victory,
      reason,
      difficulty: this.difficulty.id,
      maxConsciousness: this.phaseSystem.getConsciousness(),
      forestHealthRemaining: this.forestHealth,
      firesExtinguished: this.firesExtinguished,
      arsonistsCaptured: this.arsonistsCaptured,
      integratedActionsUsed: this.integratedActionsUsed,
      elapsedSeconds
    };

    this.scene.stop('UIScene');
    this.scene.start('GameOverScene', result);
  }
}
