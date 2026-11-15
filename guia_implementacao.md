# 🚀 Guia Passo a Passo: Implementação das 7 Mecânicas

## 📋 Preparação (Antes de Começar)

### Arquivos a Revisar
- [x] `LEIA-ME.md` - Entender o escopo
- [x] `mecanicas_consciencia.md` - Detalhes técnicos
- [x] `visual_mecanicas.txt` - UX/onde clicar
- [x] Código atual: `src/systems/SectorSystem.ts` (executeIntegratedAction)
- [x] Código atual: `src/systems/PoliticalPhaseSystem.ts` (addConsciousness)

### Setup Inicial
```bash
# Confirmar compilação sem erros
npm run build

# Testar jogo atual
npm run dev
```

---

## 🎯 Sprint 1: Semana 1 (Impacto Máximo)

### Meta: ⚡ Corrente Solidariedade + 🌿 Resgate Indígena

**Por quê primeiro?**
- Ambas são relativamente simples
- Não requerem UI nova complexa
- Impacto alto em jogabilidade
- Base para combos futuros

### Task 1.1: Corrente Solidariedade ⚡

**Objetivo:** Detectar 2+ ações integradas em 15s e aplicar bônus

**Modificações de Código:**

#### 1. SectorSystem.ts - Adicionar tracking de ações
```typescript
// Adicione ao construtor:
private lastIntegratedActions: Array<{
  type: IntegratedActionType,
  timestamp: number
}> = [];

// Método novo:
private trackIntegratedAction(type: IntegratedActionType): void {
  const now = getGameClock(this.scene).now();
  
  // Remover ações com mais de 15s
  this.lastIntegratedActions = this.lastIntegratedActions.filter(
    action => (now - action.timestamp) < 15000
  );
  
  // Adicionar ação atual
  this.lastIntegratedActions.push({ type, timestamp: now });
  
  // Detectar corrente (2+ ações em 15s)
  if (this.lastIntegratedActions.length >= 2) {
    this.triggerSolidarityChain();
  }
}

// Método novo:
private triggerSolidarityChain(): void {
  const sectorGain = this.difficulty.integratedSectorGain;
  const bonusGain = sectorGain * 0.4; // Bônus é 40% do ganho normal
  
  this.phaseSystem.addConsciousness(bonusGain, 'Corrente Solidariedade');
  
  // Reduzir cooldown de ambas as ações em 40%
  for (const action of this.lastIntegratedActions) {
    const key = action.type;
    const currentEnd = this.cooldownEnds.get(key);
    if (currentEnd) {
      const now = getGameClock(this.scene).now();
      const remaining = Math.max(0, currentEnd - now);
      const reduced = remaining * 0.6; // 40% redução = 60% do tempo original
      this.cooldownEnds.set(key, now + reduced);
      this.cooldownDurations.set(key, reduced);
    }
  }
  
  this.emit('solidarity-chain-triggered');
  SoundManager.playSolidarityChain();
}
```

#### 2. executeIntegratedAction() - Chamar tracking
```typescript
public executeIntegratedAction(...): boolean {
  if (!this.isActionReady(type)) return false;
  
  // ... código existente ...
  
  // ADICIONAR AQUI:
  this.trackIntegratedAction(type);
  
  // ... resto do código ...
}
```

#### 3. UIScene.ts - Mostrar feedback visual
```typescript
// No construtor, adicionar listener:
this.gameScene.events.on('solidarity-chain-triggered', this.showSolidarityFeedback, this);

private showSolidarityFeedback(): void {
  // Mostrar "⚡ CORRENTE!" na tela
  const text = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, 
    '⚡ CORRENTE DE SOLIDARIEDADE! ⚡',
    { 
      fontSize: '32px',
      color: '#ff6b9d',
      fontStyle: 'bold'
    }
  ).setDepth(200);
  
  this.tweens.add({
    targets: text,
    alpha: { from: 1, to: 0 },
    y: { from: GAME_HEIGHT / 2, to: GAME_HEIGHT / 2 - 50 },
    duration: 1500,
    ease: 'Power2.out',
    onComplete: () => text.destroy()
  });
}
```

**Testes:**
```typescript
// Teste manual: executar 2 ações integradas rapidamente
// Esperado: 
// - Bônus +2% consciência
// - Ambas as ações com -40% cooldown
// - Mensagem visual
```

---

### Task 1.2: Resgate Indígena 🌿

**Objetivo:** Quando Encantado expira, surgir botão automático para +4%

**Modificações de Código:**

#### 1. Curupira.ts ou MaeDaMata.ts - Ao expirar
```typescript
// No método que termina a vida do encantado:
private onExpire(): void {
  // ... código existente de cleanup ...
  
  // ADICIONAR:
  // Emitir evento para game scene
  this.scene.events.emit('enchanted-expired', {
    type: this.constructor.name, // 'Curupira' ou 'MaeDaMata'
    aldeiaIndex: this.aldeiaIndex, // Qual aldeia é
    x: this.x,
    y: this.y
  });
  
  this.destroy();
}
```

#### 2. GameScene.ts - Capturar evento e criar botão
```typescript
// No construtor:
this.events.on('enchanted-expired', this.onEnchantedExpired, this);

private onEnchantedExpired(data: any): void {
  const { type, aldeiaIndex, x, y } = data;
  
  // Criar botão flutuante sobre a aldeia
  const buttonText = type === 'Curupira' ? '🎊 CELEBRAR CAPTURA' : '🌿 HONRAR';
  
  const button = this.add.text(x, y - 100, buttonText, {
    fontSize: '24px',
    color: '#FFD700',
    fontStyle: 'bold',
    backgroundColor: '#333333',
    padding: { x: 10, y: 10 }
  }).setDepth(150);
  
  button.setInteractive();
  button.on('pointerdown', () => this.claimRescueBonus(type));
  
  // Animar pulsação
  this.tweens.add({
    targets: button,
    scale: { from: 1, to: 1.2 },
    duration: 500,
    repeat: -1,
    yoyo: true
  });
  
  // Guardar referência para limpar depois
  this.pendingRescueButtons.push({
    button,
    expiresAt: this.clock.now() + 30000 // 30s de timeout
  });
}

private claimRescueBonus(enchantedType: string): void {
  const rescueGain = this.phaseSystem.getDifficulty().captureExposeGain * 0.4; // +4% em Normal
  
  this.phaseSystem.addConsciousness(rescueGain, 'Resgate Indígena');
  
  // -10s no próximo cooldown dessa aldeia (já implementado no código original)
  
  // Efeitos visuais
  this.showRescueEffects();
  SoundManager.playRescueBonus();
  
  // Limpar button
  this.cleanupRescueButtons();
}

private showRescueEffects(): void {
  // Efeitos de luz, pássaros, celebração
  // ...
}
```

#### 3. GameScene.ts - Gerenciar cleanup de botões
```typescript
// No update:
private cleanupExpiredRescueButtons(): void {
  const now = this.clock.now();
  
  for (let i = this.pendingRescueButtons.length - 1; i >= 0; i--) {
    if (now >= this.pendingRescueButtons[i].expiresAt) {
      this.pendingRescueButtons[i].button.destroy();
      this.pendingRescueButtons.splice(i, 1);
    }
  }
}
```

**Testes:**
```typescript
// Teste manual: invocar Curupira, deixar expirar
// Esperado:
// - Botão "🎊 CELEBRAR CAPTURA" surge sobre aldeia
// - Clique no botão: +4% consciência
// - Próximo Curupira com -10s cooldown
```

---

## ✅ Checklist Sprint 1

- [ ] Corrente Solidariedade implementada
  - [ ] Tracking de ações em 15s
  - [ ] Detecção de 2+ ações
  - [ ] Bônus -40% cooldown
  - [ ] Feedback visual
  - [ ] Sons
  
- [ ] Resgate Indígena implementado
  - [ ] Evento ao Encantado expirar
  - [ ] Botão automático na tela
  - [ ] +4% consciência ao clicar
  - [ ] -10s cooldown próximo
  - [ ] Timeout 30s
  
- [ ] Testes
  - [ ] Jogabilidade flui naturalmente
  - [ ] Balanceamento se sente certo
  - [ ] Sem bugs visuais/sonoros

---

## 🎯 Sprint 2: Semana 2 (UI Simples)

### Meta: 👥 Mobilização Popular + 🤝 Mutirão de Proteção

**Por quê depois?**
- Ambas requerem UI nova no menu
- Ambas têm requisitos simples (validar 2 casas, validar foco)
- Base para lógica de ações locais futuras

### Task 2.1: Mobilização Popular 👥

**Conceito:** Botão na UI que congrega pessoas nas ruas

**Modificações:**

#### 1. UIScene.ts - Adicionar botão ao menu
```typescript
// No método que renderiza menu de ações, adicionar:
if (this.gameScene.getCurrentPhase().id >= 'Fase_3') { // Fase 3+
  
  const mobButton = this.add.text(btnX, btnY + btnSpacing * 4, 
    '👥 Mobilização',
    buttonStyle
  ).setDepth(200).setInteractive();
  
  mobButton.on('pointerdown', () => {
    this.gameScene.executeMobilization();
  });
  
  this.updateCooldownText(mobButton, 'mobilization');
}

// Método para atualizar cooldown
private updateCooldownText(button: any, actionKey: string): void {
  const ratio = this.gameScene.getSectorSystem().getCooldownRemainingRatio(actionKey);
  if (ratio > 0) {
    button.setAlpha(0.5); // Desativado
    button.setText(button.text.split('[')[0] + ` [${(ratio * 100).toFixed(0)}%]`);
  }
}
```

#### 2. SectorSystem.ts - Validar e executar
```typescript
// Adicionar ação local nova:
case LocalActionType.CIDADE_MOBILIZACAO: {
  // Validar 2+ casas com doação recente (últimos 30s)
  if (!this.validateMinimumActiveCities(2)) return false;
  
  this.triggerCooldown('mobilization', BALANCE.COOLDOWNS.LOCAL_CIDADE_MOBILIZACAO, SectorType.CIDADE);
  
  const mobGain = this.difficulty.integratedSectorGain * 0.4; // +2% em Normal
  this.phaseSystem.addConsciousness(mobGain, 'Mobilização Popular');
  
  // Aplicar buff a trabalhadores
  this.emit('apply-buff-workers', {
    speedMultiplier: 1.15,
    durationMs: 20000
  });
  
  // -3s no cooldown de uma ação integrada à escolha
  // (ou automático a próxima disponível)
  this.reduceNextIntegratedActionCooldown(3000);
  
  // Efeitos
  this.spawnFloatingText(WORLD_CENTER_X, WORLD_CENTER_Y, '👥 +2% Mobilização Popular!');
  SoundManager.playMobilization();
  
  return true;
}

private validateMinimumActiveCities(count: number): boolean {
  // Verificar quantas casas doaram nos últimos 30s
  // Implementar no GameScene e chamar daqui via evento
  return true; // Placeholder
}

private reduceNextIntegratedActionCooldown(ms: number): void {
  // Encontrar próxima ação integrada com cooldown e reduzir em ms
  const actions = [
    IntegratedActionType.CIDADE_PARA_FLORESTA,
    IntegratedActionType.CAMPO_PARA_CIDADE,
    IntegratedActionType.FLORESTA_PARA_CAMPO,
  ];
  
  for (const action of actions) {
    const end = this.cooldownEnds.get(action);
    if (end && getGameClock(this.scene).now() < end) {
      const newEnd = Math.max(getGameClock(this.scene).now(), end - ms);
      this.cooldownEnds.set(action, newEnd);
      return;
    }
  }
}
```

#### 3. GameScene.ts - Executar ação
```typescript
public executeMobilization(): boolean {
  return this.sectorSystem.executeLocalAction(LocalActionType.CIDADE_MOBILIZACAO);
}

public validateActiveCities(): number {
  // Contar casas que doaram nos últimos 30s
  let count = 0;
  const now = this.clock.now();
  const threshold = 30000;
  
  for (const house of this.cityHouses) {
    if (now - house.lastDonationTime < threshold) {
      count++;
    }
  }
  
  return count;
}
```

**Testes:**
```typescript
// Teste: Doar em 2+ casas, clicar "Mobilização"
// Esperado: +2%, trabalhadores +15%, -3s cooldown
```

---

### Task 2.2: Mutirão de Proteção 🤝

**Conceito:** Botão que convoca trabalhadores rurais para defesa

**Implementação:**
```typescript
// SectorSystem.ts
case LocalActionType.CAMPO_MUTIRAO: {
  // Validar há foco de fogo ativo
  if (!this.fireSystem.hasActiveFocuses(SectorType.CAMPO)) return false;
  
  this.triggerCooldown('mutirao', BALANCE.COOLDOWNS.LOCAL_CAMPO_MUTIRAO, SectorType.CAMPO);
  
  const mutraoGain = this.difficulty.integratedSectorGain * 0.6; // +3% em Normal
  this.phaseSystem.addConsciousness(mutraoGain, 'Mutirão de Proteção');
  
  // Ativar escudo de 25s
  this.fireSystem.activateFieldShield(25000);
  
  // Buff em brigadistas do campo
  this.emit('apply-field-buff', {
    speedMultiplier: 1.2,
    damageMultiplier: 1.2,
    durationMs: 25000
  });
  
  // Sinergia: Se Floresta→Campo foi usado recentemente (-5s ambas)
  if (this.checkSynergyWithFlorestAction()) {
    this.reduceActionCooldown(IntegratedActionType.FLORESTA_PARA_CAMPO, 5000);
    this.reduceActionCooldown('mutirao', 5000);
  }
  
  return true;
}
```

---

## ✅ Checklist Sprint 2

- [ ] Mobilização Popular
  - [ ] Botão UI adicionado
  - [ ] Validar 2+ casas ativas
  - [ ] +2% consciência
  - [ ] Buff trabalhadores
  
- [ ] Mutirão de Proteção
  - [ ] Botão UI adicionado
  - [ ] Validar foco ativo
  - [ ] +3% consciência
  - [ ] Escudo de defesa
  - [ ] Sinergia com Floresta

---

## 📈 Sprint 3-4: Continuação

**Sprint 3:** 📚 Educação Ambiental (pathfinding do Guarda)
**Sprint 4:** 🏛️ Ocupação Prefeitura + 🔮 Memória Coletiva (mais complexas)

---

## 🔧 Padrão de Código Para Adicionar Ação

```typescript
// 1. Adicionar ao enum LocalActionType em GameTypes.ts
enum LocalActionType {
  CIDADE_BARREIRA_EXAUSTAO = 'CIDADE_BARREIRA_EXAUSTAO',
  CAMPO_ACEIRO = 'CAMPO_ACEIRO',
  CIDADE_MOBILIZACAO = 'CIDADE_MOBILIZACAO', // NOVO
  // ...
}

// 2. Adicionar ao balanço em GameBalance.ts
export const BALANCE = {
  // ...
  COOLDOWNS: {
    // ...
    LOCAL_CIDADE_MOBILIZACAO: 45000, // 45 segundos
  },
  // ...
};

// 3. Implementar em SectorSystem.ts
public executeLocalAction(type: LocalActionType): boolean {
  if (!this.isActionReady(type)) return false;
  
  switch (type) {
    case LocalActionType.CIDADE_MOBILIZACAO:
      // Validar requisitos
      // Aplicar efeitos
      // Emitir eventos
      // Atualizar cooldown
      break;
  }
  
  return true;
}

// 4. Adicionar botão em UIScene.ts
// 5. Ligar em GameScene.ts
// 6. Testar manualmente
```

---

## 📋 Dicas de Implementação

### Evitar Problemas Comuns

1. **Cooldowns se sobrepondo**
   - Use chaves únicas por ação
   - Testar com Timeline visual

2. **Requisitos não validados**
   - Sempre verificar pré-condições antes de executar
   - Dar feedback ao jogador se não pode

3. **Efeitos visuais não saem**
   - Usar `destroy()` após animações
   - Testar em diferentes resoluções

4. **Eventos não emitidos**
   - Verificar nome do evento exato
   - Debugar com `console.log`

5. **Balanceamento errado**
   - Testar em todas 3 dificuldades
   - Validar progressão em tempo real

### Ferramentas de Debug

```typescript
// Adicionar ao GameScene.ts:
public getDebugInfo(): string {
  const sector = this.sectorSystem;
  return `
    Consciência: ${this.phaseSystem.getConsciousness()}%
    Cooldowns: ${JSON.stringify(sector.getAllCooldowns())}
    Casas Ativas: ${this.getActiveCitiesCount()}
  `;
}

// Ver no console durante jogo:
window.game.scene.getScene('GameScene').getDebugInfo();
```

---

## 🎯 Checklist Final de Implementação

**Antes de chamar "pronto":**

- [ ] Todas 7 mecânicas implementadas
- [ ] Cada uma testada manualmente
- [ ] Cooldowns corretos
- [ ] Valores de ganho balanceados
- [ ] Sinergia entre ações funciona
- [ ] Sem memory leaks (botões destroem)
- [ ] Sem bugs visuais (texto saindo da tela)
- [ ] Sons funcionam
- [ ] Funciona em todas as dificuldades
- [ ] Gameplay flui naturalmente
- [ ] Documentação atualizada

---

**Tempo Estimado Total: 4 semanas com 1 dev**
**Difículdade: Médio (maioria é integração, pouca lógica nova)**

