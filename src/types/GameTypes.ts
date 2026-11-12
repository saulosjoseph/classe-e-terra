export enum DifficultyLevel {
  EASY = 'EASY',
  NORMAL = 'NORMAL',
  HARD = 'HARD'
}

export enum SectorType {
  CIDADE = 'CIDADE',
  CAMPO = 'CAMPO',
  FLORESTA = 'FLORESTA'
}

export enum PoliticalPhaseId {
  FASE_1_RESISTENCIA_SUFOCADA = 1,
  FASE_2_SEMENTE_ORGANIZACAO = 2,
  FASE_3_VITORIA_URBANA = 3,
  FASE_4_AUTODEFESA_ARMADA = 4,
  FASE_5_ESCUDO_TERRITORIAL = 5,
  FASE_6_CONFRONTO_FINAL = 6
}

export enum UnitType {
  BRIGADA_VOLUNTARIA = 'BRIGADA_VOLUNTARIA',
  BRIGADISTA_COMUNITARIO = 'BRIGADISTA_COMUNITARIO',
  GUARDA_FLORESTAL = 'GUARDA_FLORESTAL',
  TRABALHADOR_RURAL = 'TRABALHADOR_RURAL'
}

export enum IntegratedActionType {
  CIDADE_PARA_FLORESTA = 'CIDADE_PARA_FLORESTA',
  CAMPO_PARA_CIDADE = 'CAMPO_PARA_CIDADE',
  FLORESTA_PARA_CAMPO = 'FLORESTA_PARA_CAMPO',
  CAPTURA_PARA_CIDADE = 'CAPTURA_PARA_CIDADE'
}

export enum LocalActionType {
  CIDADE_BARREIRA_EXAUSTAO = 'CIDADE_BARREIRA_EXAUSTAO',
  CAMPO_ACEIRO = 'CAMPO_ACEIRO',
  FLORESTA_REFLORESTAMENTO = 'FLORESTA_REFLORESTAMENTO'
}

export interface DifficultyConfig {
  id: DifficultyLevel;
  label: string;
  subtitle: string;
  /** Ganho de Consciência Coletiva nas Ações Integradas entre setores (GDD base = 5%) */
  integratedSectorGain: number;
  /** Ganho de Consciência Coletiva na ação Captura -> Cidade (GDD base = 10%) */
  captureExposeGain: number;
  /** Intervalo base (ms) de surgimento de incendiários */
  arsonistSpawnIntervalMs: number;
  /** Multiplicador de crescimento do fogo */
  fireGrowthMultiplier: number;
  /** Vida total da Fortaleza do Burguês na Fase 6 */
  bossMaxHp: number;
}

export interface PoliticalPhaseDefinition {
  id: PoliticalPhaseId;
  minConsciousness: number;
  maxConsciousness: number;
  title: string;
  milestone: string;
  description: string;
}

export interface FireNodeData {
  id: string;
  x: number;
  y: number;
  sector: SectorType;
  intensity: number; // 1 a 100 (cresce em PG)
  smokeLevel: 1 | 2 | 3 | 4; // 1 = cinza claro -> 4 = preto absoluto
  hasFirebreak: boolean;
}

export interface GameStatsResult {
  victory: boolean;
  reason: string;
  difficulty: DifficultyLevel;
  maxConsciousness: number;
  forestHealthRemaining: number;
  firesExtinguished: number;
  arsonistsCaptured: number;
  integratedActionsUsed: number;
  elapsedSeconds: number;
}
