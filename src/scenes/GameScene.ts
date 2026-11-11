import Phaser from 'phaser';
import {
  BALANCE,
  CAMPO_RADIUS,
  CITY_RADIUS,
  DIFFICULTY_CONFIGS,
  FLORESTA_OUTER_RADIUS,
  GAME_WIDTH,
  MAP_BOTTOM_Y,
  MAP_TOP_Y,
  MAP_VIEWPORT_HEIGHT,
  SECTOR_INFO,
  WORLD_CENTER_X,
  WORLD_CENTER_Y,
  WORLD_HEIGHT,
  WORLD_WIDTH,
  getRandomPointInSector,
  getSectorAtPoint
} from '../config/GameBalance';
import { SoundManager } from '../audio/SoundManager';
import { BossFortress } from '../entities/BossFortress';
import { Brigadista } from '../entities/Brigadista';
import { GuardaFlorestal } from '../entities/GuardaFlorestal';
import { Incendiario } from '../entities/Incendiario';
import { Unit } from '../entities/Unit';
import { ActiveFireInstance, FireSmokeSystem } from '../systems/FireSmokeSystem';
import { PoliticalPhaseSystem } from '../systems/PoliticalPhaseSystem';
import { SectorSystem } from '../systems/SectorSystem';
import { SpawnerSystem } from '../systems/SpawnerSystem';
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

export class GameScene extends Phaser.Scene {
  public difficulty!: DifficultyConfig;
  public phaseSystem!: PoliticalPhaseSystem;
  public fireSystem!: FireSmokeSystem;
  public sectorSystem!: SectorSystem;
  public spawnerSystem!: SpawnerSystem;
  public boss!: BossFortress;

  private forestHealth = BALANCE.INITIAL_FOREST_HEALTH;
  private brigadistas: Brigadista[] = [];
  private guardas: GuardaFlorestal[] = [];
  private nextUnitId = 1;

  private spawnBrigadistaReadyAt = 0;
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

  // Estatísticas da partida
  private firesExtinguished = 0;
  private arsonistsCaptured = 0;
  private integratedActionsUsed = 0;
  private matchStartTime = 0;
  private isEnding = false;

  constructor() {
    super('GameScene');
  }

  public init(data: { difficulty?: DifficultyLevel }): void {
    const diffLevel = data?.difficulty ?? DifficultyLevel.NORMAL;
    this.difficulty = DIFFICULTY_CONFIGS[diffLevel];
    this.forestHealth = BALANCE.INITIAL_FOREST_HEALTH;
    this.brigadistas = [];
    this.guardas = [];
    this.nextUnitId = 1;
    this.spawnBrigadistaReadyAt = 0;
    this.spawnGuardaReadyAt = 0;
    this.firesExtinguished = 0;
    this.arsonistsCaptured = 0;
    this.integratedActionsUsed = 0;
    this.isEnding = false;
    this.isDraggingCamera = false;
  }

  public create(): void {
    this.matchStartTime = this.time.now;
    SoundManager.startMusic();

    this.setupScrollableCamera();
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

    // Estado inicial do GDD (Fase 1):
    // 1 Brigada Voluntária restrita ao anel da Floresta (posicionada ao sul da Cidade, na borda interna da Floresta)
    this.spawnBrigadistaUnit(
      WORLD_CENTER_X,
      WORLD_CENTER_Y + CAMPO_RADIUS + 55,
      false,
      false
    );

    // Cria 1 foco inicial na Floresta ao Sul para o jogador explorar o mapa
    this.fireSystem.spawnFire(
      WORLD_CENTER_X + 60,
      WORLD_CENTER_Y + CAMPO_RADIUS + 110,
      22
    );

    // Garante que a câmera começa centralizada exatamente na CIDADE!
    this.centerCameraOnPoint(WORLD_CENTER_X, WORLD_CENTER_Y, false);

    this.registerEvents();

    // Inicia HUD Mobile-First em cena paralela
    this.scene.launch('UIScene', { gameScene: this });
  }

  /**
   * Configura a câmera principal para ocupar o viewport entre o HUD superior e o HUD inferior,
   * permitindo navegar pelos 1600x1600 do mapa concêntrico e começando centralizada na Cidade.
   */
  private setupScrollableCamera(): void {
    const cam = this.cameras.main;
    cam.setViewport(0, MAP_TOP_Y, GAME_WIDTH, MAP_VIEWPORT_HEIGHT);
    cam.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    cam.centerOn(WORLD_CENTER_X, WORLD_CENTER_Y);

    if (this.input.keyboard) {
      this.cursors = this.input.keyboard.createCursorKeys();
      this.wasdKeys = {
        W: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
        A: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
        S: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
        D: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D)
      };
    }

    // Arraste (Touch Pan / Mouse Drag) para mover a câmera para os lados, cima e baixo
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.y < MAP_TOP_Y || pointer.y > MAP_BOTTOM_Y) return;
      SoundManager.unlock();
      this.isDraggingCamera = true;
      this.dragStartPointerX = pointer.x;
      this.dragStartPointerY = pointer.y;
      this.dragStartScrollX = cam.scrollX;
      this.dragStartScrollY = cam.scrollY;
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!this.isDraggingCamera || !pointer.isDown) return;
      const dx = pointer.x - this.dragStartPointerX;
      const dy = pointer.y - this.dragStartPointerY;
      if (Math.hypot(dx, dy) > 4) {
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
      this.isDraggingCamera = false;
    });
  }

  public centerCameraOnPoint(wx: number, wy: number, animate = true): void {
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
   * Desenha o mapa concêntrico de 1600x1600:
   * - Centro: CIDADE (Santarém)
   * - Círculo Imediato: CAMPO & RIBEIRINHOS
   * - Círculo Externo: FLORESTA (Baixo Tapajós)
   * Conectados por estradas radiais e pelo Rio Tapajós.
   */
  private drawConcentricSantaremMap(): void {
    const g = this.add.graphics().setDepth(1);

    // Fundo de mata profunda nas bordas do mundo
    g.fillStyle(0x042f2e, 1);
    g.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

    // 3. Círculo Externo: FLORESTA (Raio até 760px)
    g.fillStyle(0x064e3b, 1);
    g.fillCircle(WORLD_CENTER_X, WORLD_CENTER_Y, FLORESTA_OUTER_RADIUS);
    g.fillStyle(0x047857, 0.42);
    g.fillCircle(WORLD_CENTER_X, WORLD_CENTER_Y, FLORESTA_OUTER_RADIUS - 30);

    // 2. Círculo Imediato à Cidade: CAMPO & RIBEIRINHOS (Raio até 470px)
    g.fillStyle(0x3f6212, 1);
    g.fillCircle(WORLD_CENTER_X, WORLD_CENTER_Y, CAMPO_RADIUS);
    g.fillStyle(0x4d7c0f, 0.48);
    g.fillCircle(WORLD_CENTER_X, WORLD_CENTER_Y, CAMPO_RADIUS - 24);

    // 1. Círculo Central: CIDADE DE SANTARÉM (Raio até 230px)
    g.fillStyle(0x78350f, 1);
    g.fillCircle(WORLD_CENTER_X, WORLD_CENTER_Y, CITY_RADIUS);
    g.fillStyle(0x92400e, 0.58);
    g.fillCircle(WORLD_CENTER_X, WORLD_CENTER_Y, CITY_RADIUS - 20);

    // Rio Tapajós e igarapés cortando da Floresta -> Campo -> Cidade
    g.fillStyle(0x0284c7, 0.85);
    g.beginPath();
    g.moveTo(WORLD_CENTER_X - 720, WORLD_CENTER_Y - 380);
    g.lineTo(WORLD_CENTER_X - 70, WORLD_CENTER_Y - 95);
    g.lineTo(WORLD_CENTER_X + 740, WORLD_CENTER_Y - 320);
    g.lineTo(WORLD_CENTER_X + 740, WORLD_CENTER_Y - 260);
    g.lineTo(WORLD_CENTER_X - 60, WORLD_CENTER_Y - 40);
    g.lineTo(WORLD_CENTER_X - 720, WORLD_CENTER_Y - 320);
    g.closePath();
    g.fillPath();

    // Afluente Sul (Rio Arapiuns / Igarapés da Floresta ao Campo)
    g.beginPath();
    g.moveTo(WORLD_CENTER_X - 95, WORLD_CENTER_Y - 60);
    g.lineTo(WORLD_CENTER_X - 45, WORLD_CENTER_Y - 60);
    g.lineTo(WORLD_CENTER_X - 180, WORLD_CENTER_Y + 720);
    g.lineTo(WORLD_CENTER_X - 235, WORLD_CENTER_Y + 720);
    g.closePath();
    g.fillPath();

    // Estradas e Trilhas Radiais conectando Cidade <-> Campo <-> Floresta (Norte, Sul, Leste, Oeste)
    g.fillStyle(0xd97706, 0.52);
    g.fillRect(
      WORLD_CENTER_X - 14,
      WORLD_CENTER_Y - FLORESTA_OUTER_RADIUS,
      28,
      FLORESTA_OUTER_RADIUS * 2
    );
    g.fillRect(
      WORLD_CENTER_X - FLORESTA_OUTER_RADIUS,
      WORLD_CENTER_Y - 14,
      FLORESTA_OUTER_RADIUS * 2,
      28
    );

    // Fronteiras circulares tracejadas/destacadas entre os setores
    g.lineStyle(3, 0xfef08a, 0.45);
    g.strokeCircle(WORLD_CENTER_X, WORLD_CENTER_Y, CITY_RADIUS);
    g.lineStyle(3, 0x84cc16, 0.45);
    g.strokeCircle(WORLD_CENTER_X, WORLD_CENTER_Y, CAMPO_RADIUS);
    g.lineStyle(3, 0x22c55e, 0.38);
    g.strokeCircle(WORLD_CENTER_X, WORLD_CENTER_Y, FLORESTA_OUTER_RADIUS);

    // Placas indicadoras nos anéis (Norte, Sul, Leste, Oeste)
    this.addSectorLabel(WORLD_CENTER_X, WORLD_CENTER_Y - 18, SECTOR_INFO[SectorType.CIDADE].label);
    const directions = [
      { dx: 0, dy: -1, dirName: 'NORTE' },
      { dx: 0, dy: 1, dirName: 'SUL' },
      { dx: -1, dy: 0, dirName: 'OESTE' },
      { dx: 1, dy: 0, dirName: 'LESTE' }
    ];

    for (const d of directions) {
      const campoR = (CITY_RADIUS + CAMPO_RADIUS) / 2;
      this.addSectorLabel(
        WORLD_CENTER_X + d.dx * campoR,
        WORLD_CENTER_Y + d.dy * campoR,
        `🌾 CAMPO (${d.dirName})`
      );

      const florestaR = (CAMPO_RADIUS + FLORESTA_OUTER_RADIUS) / 2;
      this.addSectorLabel(
        WORLD_CENTER_X + d.dx * florestaR,
        WORLD_CENTER_Y + d.dy * florestaR,
        `🌳 FLORESTA (${d.dirName})`
      );
    }

    // Props da CIDADE (Centro)
    for (let i = 0; i < 14; i++) {
      const angle = (i / 14) * Math.PI * 2;
      const r = 65 + (i % 3) * 48;
      const px = WORLD_CENTER_X + Math.cos(angle) * r;
      const py = WORLD_CENTER_Y + Math.sin(angle) * r;
      this.add.sprite(px, py, 'prop_city_house').setDepth(6).setAlpha(0.92);
    }

    // Props do CAMPO (Anel intermediário)
    for (let i = 0; i < 24; i++) {
      const angle = (i / 24) * Math.PI * 2 + 0.12;
      const r = CITY_RADIUS + 50 + (i % 3) * 65;
      const px = WORLD_CENTER_X + Math.cos(angle) * r;
      const py = WORLD_CENTER_Y + Math.sin(angle) * r;
      this.add.sprite(px, py, 'prop_farm').setDepth(6).setAlpha(0.92);
    }

    // Props da FLORESTA (Anel externo)
    for (let i = 0; i < 48; i++) {
      const angle = (i / 48) * Math.PI * 2 + 0.05;
      const r = CAMPO_RADIUS + 45 + (i % 4) * 62;
      const px = WORLD_CENTER_X + Math.cos(angle) * r;
      const py = WORLD_CENTER_Y + Math.sin(angle) * r;
      this.add.sprite(px, py, 'prop_tree').setDepth(6).setAlpha(0.94);
    }
  }

  private addSectorLabel(x: number, y: number, text: string): void {
    this.add
      .text(x, y, text, {
        fontFamily: 'Courier New, monospace',
        fontSize: '11px',
        fontStyle: 'bold',
        color: '#fef9c3',
        backgroundColor: '#090d0acc',
        padding: { x: 5, y: 2 }
      })
      .setOrigin(0.5)
      .setDepth(10);
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
      this.spawnGuardaUnit(WORLD_CENTER_X + 60, WORLD_CENTER_Y + CAMPO_RADIUS + 60, false);
    }

    // Fase 5 (65%): Demarcação das Terras Indígenas (Barreira ecológica circular na Floresta)
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
    this.indigenousShieldGraphics.lineStyle(5, 0x10b981, 0.85);
    this.indigenousShieldGraphics.strokeCircle(
      WORLD_CENTER_X,
      WORLD_CENTER_Y,
      CAMPO_RADIUS + 8
    );
    this.indigenousShieldGraphics.strokeCircle(
      WORLD_CENTER_X,
      WORLD_CENTER_Y,
      FLORESTA_OUTER_RADIUS - 8
    );
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
    if (focusCamera) {
      this.centerCameraOnPoint(x, y, true);
    }
    return unit;
  }

  public tryRecruitBrigadista(): boolean {
    if (!this.phaseSystem.isBrigadaComunitariaUnlocked()) return false;
    if (this.brigadistas.length >= BALANCE.MAX_BRIGADISTAS) return false;
    if (this.time.now < this.spawnBrigadistaReadyAt) return false;

    this.spawnBrigadistaReadyAt = this.time.now + BALANCE.COOLDOWNS.SPAWN_BRIGADISTA;
    const pt = getRandomPointInSector(SectorType.CIDADE, 40);
    this.spawnBrigadistaUnit(pt.x, pt.y, true, true);
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

  public getBrigadistaRecruitCooldownRatio(): number {
    if (this.time.now >= this.spawnBrigadistaReadyAt) return 0;
    return (this.spawnBrigadistaReadyAt - this.time.now) / BALANCE.COOLDOWNS.SPAWN_BRIGADISTA;
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
    return [...this.brigadistas, ...this.guardas];
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
        fontFamily: 'Courier New, monospace',
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
    if (this.isEnding) return;

    // Suporte adicional a setas / WASD para mover a câmera caso jogue no computador
    const camSpeed = 0.42 * deltaMs;
    const cam = this.cameras.main;
    if (this.cursors?.left.isDown || this.wasdKeys?.A.isDown) {
      cam.scrollX = Phaser.Math.Clamp(cam.scrollX - camSpeed, 0, WORLD_WIDTH - GAME_WIDTH);
    }
    if (this.cursors?.right.isDown || this.wasdKeys?.D.isDown) {
      cam.scrollX = Phaser.Math.Clamp(cam.scrollX + camSpeed, 0, WORLD_WIDTH - GAME_WIDTH);
    }
    if (this.cursors?.up.isDown || this.wasdKeys?.W.isDown) {
      cam.scrollY = Phaser.Math.Clamp(
        cam.scrollY - camSpeed,
        0,
        WORLD_HEIGHT - MAP_VIEWPORT_HEIGHT
      );
    }
    if (this.cursors?.down.isDown || this.wasdKeys?.S.isDown) {
      cam.scrollY = Phaser.Math.Clamp(
        cam.scrollY + camSpeed,
        0,
        WORLD_HEIGHT - MAP_VIEWPORT_HEIGHT
      );
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

      for (const brig of this.brigadistas) {
        if (
          arsonist.isAlive() &&
          Phaser.Math.Distance.Between(brig.x, brig.y, arsonist.x, arsonist.y) <= 28
        ) {
          this.captureArsonist(arsonist);
          break;
        }
      }
    }

    for (const brig of this.brigadistas) {
      brig.update(deltaMs, this.fireSystem, arsonists, this.boss);
    }

    for (const guarda of this.guardas) {
      guarda.update(deltaMs, this.fireSystem, arsonists, this.boss, (captured) =>
        this.captureArsonist(captured)
      );
    }

    const { forestDamage } = this.fireSystem.update(
      deltaMs,
      this.difficulty.fireGrowthMultiplier,
      this.phaseSystem.isIndigenousDemarcationActive()
    );

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
