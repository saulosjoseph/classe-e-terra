# Sistema de Encantados com Cooldown por Aldeia

## Visão Geral

Este documento explica a implementação do sistema de encantados (Curupira e Mãe da Mata) que agora suporta:

1. **Cooldown independente por aldeia**: Cada uma das 4 aldeias tem seu próprio cooldown para invocar encantados
2. **Um encantado por vez por aldeia**: Impossível ter mais de um encantado do mesmo tipo na mesma aldeia simultaneamente
3. **Limite global**: Máximo de 4 encantados em campo (soma de todas as aldeias)

## Arquitetura

### Identificação de Aldeias

As aldeias são identificadas por índice (0-3), correspondendo aos 4 vértices do losango da floresta:
- **0**: Topo (WORLD_CENTER_X, WORLD_CENTER_Y - FLORESTA_OUTER_RADIUS_Y + ALDEIA.EDGE_INSET)
- **1**: Direita (WORLD_CENTER_X + FLORESTA_OUTER_RADIUS - ALDEIA.EDGE_INSET, WORLD_CENTER_Y)
- **2**: Base (WORLD_CENTER_X, WORLD_CENTER_Y + FLORESTA_OUTER_RADIUS_Y - ALDEIA.EDGE_INSET)
- **3**: Esquerda (WORLD_CENTER_X - FLORESTA_OUTER_RADIUS + ALDEIA.EDGE_INSET, WORLD_CENTER_Y)

Estas posições estão definidas em `src/config/GameBalance.ts` na constante `ALDEIA_POSITIONS`.

### Chaves de Cooldown

Cada encantado em cada aldeia tem sua própria chave de cooldown:

```typescript
function getEncantadoCooldownKey(villageIndex: number, encantadoType: 'curupira' | 'mae_da_mata'): string {
  return `${encantadoType.toUpperCase()}_VILLAGE_${villageIndex}`;
}
```

Exemplos:
- `CURUPIRA_VILLAGE_0`: Cooldown do Curupira invocado pela aldeia 0
- `MAE_DA_MATA_VILLAGE_1`: Cooldown da Mãe da Mata invocada pela aldeia 1

## Fluxo de Invocação

### 1. Jogador clica em uma aldeia

```typescript
// GameScene.onAldeiaClicked()
this.events.emit('aldeia-clicked', village);
```

### 2. UIScene exibe modal com opções de invocar

```typescript
// UIScene.showAldeiaInfoModal(village)
- Calcula cooldown específico da aldeia
- Verifica se há espaço para novo encantado
- Habilita/desabilita botões conforme status
```

### 3. Jogador clica "Invocar Curupira" ou "Invocar Mãe da Mata"

```typescript
// UIScene: botão clicado
if (gs.invokeCurupiraFromVillage(village)) {
  // Sucesso
} else {
  // Falha (sem espaço, cooldown ativo, ou já existe um)
}
```

### 4. GameScene passa para SectorSystem

```typescript
// GameScene.invokeCurupiraFromVillage(village)
return this.sectorSystem.executeEncantadoInvocation(
  village,           // Posição da aldeia
  'curupira',        // Tipo de encantado
  '🌿 Curupira invocado!',
  () => this.spawnCurupira(village)  // Callback de criação
);
```

### 5. SectorSystem valida e aplica cooldown

```typescript
// SectorSystem.executeEncantadoInvocation()
1. Calcula villageIndex = getVillageIndex(village.x, village.y)
2. Gera cooldownKey = getEncantadoCooldownKey(villageIndex, encantadoType)
3. Verifica se cooldown está pronto: isActionReady(cooldownKey)
4. Se não, retorna false
5. Chama onInvoke() → GameScene.spawnCurupira(village)
6. Registra cooldown por 1 minuto e 20 segundos (80 segundos)
```

### 6. GameScene cria a unidade

```typescript
// GameScene.spawnCurupira(village)
1. Calcula villageIndex
2. Verifica hasEncantadoFromVillage(villageIndex, 'curupira')
3. Se existe, retorna false
4. Cria Curupira com villageIndex
5. Adiciona ao array this.curupiras[]
```

### 7. Unidade vive por 60 segundos

```typescript
// A unidade tem:
const expiresAt = this.clock.now() + BALANCE.CURUPIRA.LIFETIME_MS // 60000ms
```

### 8. Limpeza automática

```typescript
// GameScene.update()
this.curupiras = this.curupiras.filter((curupira) => {
  if (now < curupira.expiresAt) return true;  // Mantém
  curupira.destroy();
  return false;  // Remove
});
```

## Verificação de Cooldown na UI

A UI precisa saber o cooldown específico da aldeia sendo consultada:

```typescript
// UIScene.showAldeiaInfoModal(village)
const curupiraReady = () => !full() && gs.getCurupiraCooldownRemainingMs(village) <= 0;
const maeDaMataReady = () => !full() && gs.getMaeDaMataCooldownRemainingMs(village) <= 0;

// GameScene.getCurupiraCooldownRemainingMs(village)
const villageIndex = this.getVillageIndex(village.x, village.y);
return this.sectorSystem.getEncantadoCooldownRemainingMs(villageIndex, 'curupira');
```

## Atributos Importantes

### Curupira
- **Classe**: `src/entities/Curupira.ts`
- **Atributo**: `villageIndex: number` (qual aldeia invocou)
- **Duração**: 60 segundos
- **Cooldown**: 1 minuto e 20 segundos (80 segundos) por aldeia
- **Limite por aldeia**: Máximo 1 encantado por vez (qualquer tipo)

### Mãe da Mata
- **Classe**: `src/entities/MaeDaMata.ts`
- **Atributo**: `villageIndex: number` (qual aldeia invocou)
- **Duração**: 60 segundos
- **Cooldown**: 1 minuto e 20 segundos (80 segundos) por aldeia
- **Limite por aldeia**: Máximo 1 encantado por vez (qualquer tipo)

## Exemplos de Cenários

### Cenário 1: Invocar em aldeias diferentes é independente

```
T=0s: Invoca Curupira na aldeia 0
      - CURUPIRA_VILLAGE_0 = cooldown até T=80s
      - Aldeia 0 está ocupada por Curupira

T=5s: Invoca Curupira na aldeia 1
      - CURUPIRA_VILLAGE_1 = cooldown até T=85s
      (aldeias 0 e 1 têm cooldowns e encantados independentes)

T=60s: Curupira da aldeia 0 expira
       - Aldeia 0 fica livre para novo encantado
       - CURUPIRA_VILLAGE_0 ainda em cooldown até T=80s
       - MAE_DA_MATA_VILLAGE_0 está pronto para invocar!
```

### Cenário 2: Um encantado por aldeia (novo!)

```
T=0s: Invoca Curupira na aldeia 0
      - Aldeia 0 está ocupada

T=5s: Tenta invocar Mãe da Mata na aldeia 0
      → FALHA: Já existe Curupira nessa aldeia
      → Mensagem: "Já existe um encantado nesta aldeia"

T=60s: Curupira da aldeia 0 expira
       - Aldeia 0 fica livre
       - MAE_DA_MATA_VILLAGE_0 está pronto

T=65s: Invoca Mãe da Mata na aldeia 0 ✓
       - MAE_DA_MATA_VILLAGE_0 = cooldown até T=145s
```

### Cenário 3: Limite global é respeitado

```
T=0s: Invoca Curupira na aldeia 0 (total: 1)
T=5s: Invoca Curupira na aldeia 1 (total: 2)
T=10s: Invoca Mãe da Mata na aldeia 2 (total: 3)
T=15s: Invoca Mãe da Mata na aldeia 3 (total: 4)
T=20s: Tenta invocar novo encantado
       → FALHA: Limite global de 4 atingido

## Como Testar

### Teste 1: Cooldown por aldeia
1. Clique na aldeia 0, invoque Curupira
2. Aguarde 2 segundos
3. Clique na aldeia 1, tente invocar Curupira
4. **Esperado**: Botão está habilitado e você consegue invocar (cooldowns independentes)

### Teste 2: Limite por aldeia
### Teste 2: Um encantado por aldeia
1. Clique na aldeia 0, invoque Curupira
2. Na mesma aldeia 0, tente invocar Mãe da Mata
3. **Esperado**: Botão desabilitado ou mensagem de erro (já existe um encantado nessa aldeia)

### Teste 3: Cooldown específico por tipo
1. Clique na aldeia 0, invoque Curupira
2. Aguarde 60 segundos (Curupira expira)
3. Imediatamente invoque Mãe da Mata na aldeia 0
4. **Esperado**: Sucesso! Mãe da Mata é invocada (cooldown de Curupira não afeta Mãe da Mata)

### Teste 4: Limite global
1. Invoque encantados em todas as 4 aldeias até ter 4 em campo
2. Tente invocar um 5º encantado
3. **Esperado**: Mensagem "Limite de 4 encantados", botão desabilitado

## Modificações Futuras

Para adicionar suporte a novos encantados ou sistemas:

### Novo tipo de encantado
1. Criar classe em `src/entities/NovoEncantado.ts`
2. Adicionar atributo `villageIndex: number` no construtor
3. Passar `villageIndex` ao criar em `GameScene.spawnNovoEncantado()`
4. Usar `'novo_encantado'` como string no sistema

### Modificar cooldown por tipo
Apenas altere a constante em `GameBalance.ts`:
```typescript
COOLDOWNS: {
  LOCAL_FLORESTA_ENCANTADOS: 80000,  // Curupira (1 minuto 20 segundos)
  LOCAL_MAE_DA_MATA: 80000,           // Mãe da Mata (1 minuto 20 segundos)
}
```

### Permitir múltiplos do mesmo tipo por aldeia
Remova a verificação em `GameScene.spawnCurupira()`:
```typescript
// Apague estas linhas:
if (this.hasEncantadoFromVillage(villageIndex, 'curupira')) return false;
```

## Referências

- **Documento de Design (GDD)**: `classe-e-terra.md` - Seção "Os Encantados"
- **GameBalance**: `src/config/GameBalance.ts` - ALDEIA_POSITIONS, COOLDOWNS
- **SectorSystem**: `src/systems/SectorSystem.ts` - Gerenciamento de cooldowns
- **GameScene**: `src/scenes/GameScene.ts` - Spawn e verificação de encantados
