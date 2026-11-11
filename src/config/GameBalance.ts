import {
  DifficultyConfig,
  DifficultyLevel,
  PoliticalPhaseDefinition,
  PoliticalPhaseId,
  SectorType
} from '../types/GameTypes';

/**
 * Resolução da Tela Mobile-First em Paisagem / Celular de Lado (Landscape 16:9): 720 x 405
 * O Mundo do Mapa é muito maior (1800 x 1800) e exige rolagem panorâmica (pan/drag) para todos os lados.
 * Zonas concêntricas:
 * - Centro: CIDADE (Santarém)
 * - Círculo imediato: CAMPO & RIBEIRINHOS
 * - Círculo externo: FLORESTA (Baixo Tapajós)
 */
export const GAME_WIDTH = 720;
export const GAME_HEIGHT = 405;

export const HUD_TOP_HEIGHT = 54;
export const HUD_BOTTOM_HEIGHT = 82;
export const MAP_TOP_Y = HUD_TOP_HEIGHT;
export const MAP_BOTTOM_Y = GAME_HEIGHT - HUD_BOTTOM_HEIGHT; // 323
export const MAP_VIEWPORT_HEIGHT = MAP_BOTTOM_Y - MAP_TOP_Y; // 269

export const WORLD_WIDTH = 1800;
export const WORLD_HEIGHT = 1800;
export const WORLD_CENTER_X = WORLD_WIDTH / 2; // 900
export const WORLD_CENTER_Y = WORLD_HEIGHT / 2; // 900

export const CITY_RADIUS = 250;
export const CAMPO_RADIUS = 520;
export const FLORESTA_OUTER_RADIUS = 840;

export const SECTOR_INFO: Record<
  SectorType,
  { minRadius: number; maxRadius: number; label: string; colorHex: number }
> = {
  [SectorType.CIDADE]: {
    minRadius: 0,
    maxRadius: CITY_RADIUS,
    label: '🏙️ CIDADE (Santarém)',
    colorHex: 0xd97706
  },
  [SectorType.CAMPO]: {
    minRadius: CITY_RADIUS,
    maxRadius: CAMPO_RADIUS,
    label: '🌾 CAMPO & RIBEIRINHOS',
    colorHex: 0x65a30d
  },
  [SectorType.FLORESTA]: {
    minRadius: CAMPO_RADIUS,
    maxRadius: FLORESTA_OUTER_RADIUS,
    label: '🌳 FLORESTA (Baixo Tapajós)',
    colorHex: 0x15803d
  }
};

export function getSectorAtPoint(x: number, y: number): SectorType {
  const dx = x - WORLD_CENTER_X;
  const dy = y - WORLD_CENTER_Y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist <= CITY_RADIUS) {
    return SectorType.CIDADE;
  }
  if (dist <= CAMPO_RADIUS) {
    return SectorType.CAMPO;
  }
  return SectorType.FLORESTA;
}

export function getRandomPointInSector(sector: SectorType, margin = 24): { x: number; y: number } {
  const info = SECTOR_INFO[sector];
  const minR = sector === SectorType.CIDADE ? 0 : info.minRadius + margin;
  const maxR = info.maxRadius - margin;
  const angle = Math.random() * Math.PI * 2;
  const r = minR + Math.random() * Math.max(10, maxR - minR);
  return {
    x: Math.round(WORLD_CENTER_X + Math.cos(angle) * r),
    y: Math.round(WORLD_CENTER_Y + Math.sin(angle) * r)
  };
}

/**
 * Configuração das Dificuldades:
 * Diferencia diretamente o ganho de Consciência Coletiva nas Ações Integradas!
 */
export const DIFFICULTY_CONFIGS: Record<DifficultyLevel, DifficultyConfig> = {
  [DifficultyLevel.EASY]: {
    id: DifficultyLevel.EASY,
    label: 'FÁCIL',
    subtitle: 'Ações Integradas: +8% | Captura: +15%',
    integratedSectorGain: 8,
    captureExposeGain: 15,
    arsonistSpawnIntervalMs: 8500,
    fireGrowthMultiplier: 0.78,
    bossMaxHp: 220
  },
  [DifficultyLevel.NORMAL]: {
    id: DifficultyLevel.NORMAL,
    label: 'NORMAL (GDD)',
    subtitle: 'Ações Integradas: +5% | Captura: +10%',
    integratedSectorGain: 5,
    captureExposeGain: 10,
    arsonistSpawnIntervalMs: 6800,
    fireGrowthMultiplier: 1.0,
    bossMaxHp: 300
  },
  [DifficultyLevel.HARD]: {
    id: DifficultyLevel.HARD,
    label: 'DIFÍCIL',
    subtitle: 'Ações Integradas: +3% | Captura: +6%',
    integratedSectorGain: 3,
    captureExposeGain: 6,
    arsonistSpawnIntervalMs: 5200,
    fireGrowthMultiplier: 1.25,
    bossMaxHp: 380
  }
};

/**
 * Paleta estrita da Fumaça Tóxica conforme GDD:
 * "evolui de um cinza claro até um preto denso e absoluto... Não haverá tons de laranja ou vermelho na fumaça."
 */
export const SMOKE_PALETTE: Record<1 | 2 | 3 | 4, { color: number; alpha: number; name: string }> = {
  1: { color: 0xd4d4d8, alpha: 0.42, name: 'Névoa Cinza Clara' },
  2: { color: 0x71717a, alpha: 0.58, name: 'Fumaça Cinza Média' },
  3: { color: 0x27272a, alpha: 0.76, name: 'Fumaça Cinza Escura' },
  4: { color: 0x000000, alpha: 0.92, name: 'Fumaça Preta Absoluta' }
};

export const POLITICAL_PHASES: PoliticalPhaseDefinition[] = [
  {
    id: PoliticalPhaseId.FASE_1_RESISTENCIA_SUFOCADA,
    minConsciousness: 0,
    maxConsciousness: 19,
    title: 'Fase 1: Resistência Sufocada',
    milestone: 'Ajuste Fiscal Ativo',
    description: '1 Brigada Voluntária restrita à Floresta. Cidade travada (+60% recarga).'
  },
  {
    id: PoliticalPhaseId.FASE_2_SEMENTE_ORGANIZACAO,
    minConsciousness: 20,
    maxConsciousness: 34,
    title: 'Fase 2: A Semente da Organização',
    milestone: 'Brigadas Comunitárias (20%)',
    description: 'Unidade evolui! Invoque e posicione Brigadistas na Cidade, Campo e Floresta.'
  },
  {
    id: PoliticalPhaseId.FASE_3_VITORIA_URBANA,
    minConsciousness: 35,
    maxConsciousness: 49,
    title: 'Fase 3: Vitória Urbana',
    milestone: 'Queda do Ajuste Fiscal (35%)',
    description: 'Verbas liberadas! Recarga das ações da Cidade normalizada.'
  },
  {
    id: PoliticalPhaseId.FASE_4_AUTODEFESA_ARMADA,
    minConsciousness: 50,
    maxConsciousness: 64,
    title: 'Fase 4: Autodefesa Armada',
    milestone: 'Guarda Florestal Armado (50%)',
    description: 'Unidade de elite imune à fumaça densa; captura Incendiários em emboscada!'
  },
  {
    id: PoliticalPhaseId.FASE_5_ESCUDO_TERRITORIAL,
    minConsciousness: 65,
    maxConsciousness: 99,
    title: 'Fase 5: O Escudo Territorial',
    milestone: 'Demarcação de Terras Indígenas (65%)',
    description: 'Barreira ecológica ativa: o fogo se alastra 50% mais devagar na Floresta.'
  },
  {
    id: PoliticalPhaseId.FASE_6_CONFRONTO_FINAL,
    minConsciousness: 100,
    maxConsciousness: 100,
    title: 'Fase 6: O Confronto Final',
    milestone: 'União Total! O Burguês se Revela (100%)',
    description: 'Cerque a Fortaleza do Burguês com unidades e Ações Integradas para vencer!'
  }
];

export const BALANCE = {
  INITIAL_FOREST_HEALTH: 100,
  INITIAL_CONSCIOUSNESS: 0,
  MAX_CONSCIOUSNESS: 100,
  /** Cooldowns base em milissegundos */
  COOLDOWNS: {
    INTEGRATED_CIDADE_FLORESTA: 7500,
    INTEGRATED_CAMPO_CIDADE: 7500,
    INTEGRATED_FLORESTA_CAMPO: 7500,
    LOCAL_CIDADE_EXAUSTAO: 9000,
    LOCAL_CAMPO_ACEIRO: 9500,
    LOCAL_FLORESTA_REFLORESTAR: 10000,
    SPAWN_BRIGADISTA: 11000,
    SPAWN_GUARDA: 14000
  },
  /** Penalidade do Ajuste Fiscal nas ações da Cidade durante Fases 1 e 2 */
  AJUSTE_FISCAL_COOLDOWN_MULT: 1.65,
  /** Fumaça tóxica dobra o tempo de recarga conforme GDD */
  SMOKE_COOLDOWN_MULT: 2.0,
  /** Limite máximo de unidades aliadas para manter tela mobile limpa e fluida */
  MAX_BRIGADISTAS: 6,
  MAX_GUARDAS: 3
};
