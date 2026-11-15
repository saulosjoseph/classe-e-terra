# Audio Design - Classe e Terra 🎮🎵

## 📋 Visão Geral

Documento de referência para a criação, gerenciamento e documentação de todos os sons do jogo "Classe e Terra". Baseado no projeto atual que utiliza **Web Audio API para síntese 8-bit procedural** e **Phaser para áudio em MP3**.

---

## 🔊 Ações COM SOM IMPLEMENTADAS ✅

| # | Ação/Evento | Método | Status | Tipo | Descrição |
|---|------------|--------|--------|------|-----------|
| 1 | **Seleção de Unidade** | `playSelect()` | ✅ Implementado | Efeito UI | Som de confirmação ao selecionar/tocar em unidades (freq: 520→680 Hz, duração: 70ms) |
| 2 | **Apagar Fogo** | `playExtinguish()` | ✅ Implementado | Efeito Ação | Som de extinção de fogo (freq: 300→140 Hz, sawtooth, 140ms) |
| 3 | **Início de Incêndio** | `playFireStart()` | ✅ Implementado | Efeito Ambiente | Som quando fogo começa a arder (freq: 190→95 Hz, sawtooth, 220ms) |
| 4 | **Captura de Incendiário** | `playCapture()` | ✅ Implementado | Efeito Ação | Som de sucesso ao capturar incendiário (freq: 480→760→980 Hz, 2 notas) |
| 5 | **Ação Integrada** | `playIntegratedAction()` | ✅ Implementado | Efeito Ação | Som ao executar ações integradas entre classes (sequência: 330→440→554→659 Hz) |
| 6 | **Fase Avança** | `playPhaseUp()` | ✅ Implementado | Efeito Jogo | Som ao atingir novo estágio de Consciência Coletiva (5 notas ascendentes: 261.6→329.6→392→523.2→659.2 Hz) |
| 7 | **Alerta Boss** | `playBossAlert()` | ✅ Implementado | Efeito Boss | Som de aparição do Burguês/Boss (freq: 146.8→138.6→130.8→110 Hz, sawtooth, 4 notas descendentes) |
| 8 | **Vitória** | `playVictory()` | ✅ Implementado | Efeito Jogo | Som ao vencer (5 notas ascendentes: 392→493.8→587.3→784→987.7 Hz) |
| 9 | **Derrota** | `playDefeat()` | ✅ Implementado | Efeito Jogo | Som ao perder/floresta queimada (4 notas descendentes: 300→260→220→165 Hz, sawtooth) |
| 10 | **BGM - Fase 1** | `playBGMForPhase(1)` | ✅ Parcial | Música | Toca música MP3 'bgm_fase_1' em loop (60% volume) |
| 11 | **BGM Procedural** | `startMusic()` / `stopMusic()` | ✅ Implementado | Música | Linha de baixo recursiva (110→110→130.8→146.8 Hz, triangle, 420ms de intervalo) |

---

## 🔇 Ações SEM SOM QUE SERIA BOM POSSUIR 🎯

### 🎮 UI & Menu
| # | Ação/Evento | Prioridade | Sugestão de Som | Duração | Notas |
|---|------------|-----------|-----------------|---------|-------|
| 1 | **Abrir Menu/Opções** | 🟡 Média | Som suave de abertura | ~200ms | Freq: 440→550 Hz, triangle, fade-in |
| 2 | **Fechar Menu** | 🟡 Média | Som suave de fechamento | ~150ms | Freq: 550→440 Hz, triangle, fade-out (reverso da abertura) |
| 3 | **Clicar em Botão** | 🟡 Média | Click leve | ~50ms | Freq: 800 Hz, square, muito curto |
| 4 | **Movimento de Cursor** | ⚪ Baixa | Som opcional de "hover" | ~30ms | Freq: 600 Hz, sine, muito discreto (se usado) |
| 5 | **Erro/Ação Inválida** | 🟠 Alta | Som de erro/buzzer | ~150ms | Freq: 220 Hz (constante), sawtooth, com pulse |
| 6 | **Mutar/Desmutar Áudio** | 🟡 Média | Som de confirmação | ~100ms | Freq: 660 Hz, square (ou silêncio proposital) |
| 7 | **Pausa/Retomada** | 🟡 Média | Som de pausa | ~120ms | Freq: 440 Hz, sine, suave |

### ⚔️ Ações de Combate & Unidades
| # | Ação/Evento | Prioridade | Sugestão de Som | Duração | Notas |
|---|------------|-----------|-----------------|---------|-------|
| 8 | **Movimento de Unidade** | 🟠 Alta | Som de "passos" ou movimento | ~100ms | Freq: 200→250 Hz, triangle, repetitivo |
| 9 | **Brigadista Formado** | 🟠 Alta | Som de formação/spawning | ~200ms | Freq: 330→440 Hz, square (efeito positivo) |
| 10 | **Bombeiro Chamado** | 🟠 Alta | Som de sirene curta | ~300ms | Freq: 600→400 Hz (descida), sawtooth, tipo "wioo wioo" |
| 11 | **Guarda Florestal Ativado** | 🟠 Alta | Som de alerta/ativação | ~150ms | Freq: 800→600 Hz, square, como bip de radar |
| 12 | **Encantado Invocado (Curupira)** | 🟠 Alta | Som mágico/invocação | ~250ms | Freq: 494→587→659 Hz, sine, ascendente e etéreo |
| 13 | **Encantado Invocado (Mãe da Mata)** | 🟠 Alta | Som mágico/natureza | ~300ms | Freq: 329→392→494 Hz, triangle, ascendente (mais grave que Curupira) |
| 14 | **Unidade Morre/É Derrotada** | 🟠 Alta | Som de morte | ~200ms | Freq: 300→100 Hz, sawtooth, fade rápido (tipo "descida") |
| 15 | **Trabalhador Parado** | ⚪ Baixa | Som opcional de "exaustão" | ~100ms | Freq: 220 Hz, sine, baixo e triste |
| 16 | **Árvore Replantada (Mãe da Mata)** | 🟠 Alta | Som de crescimento/plantio | ~150ms | Freq: 330→440→550 Hz, sine, ascendente leve |
| 17 | **Dano ao Boss (Burguês)** | 🟠 Alta | Som de impacto/dano | ~80ms | Freq: 600→400 Hz, square, corte agudo |
| 18 | **Boss Toma Dano Significativo** | 🟠 Alta | Som de impacto pesado | ~150ms | Freq: 300 Hz, sawtooth, grave e ameaçador |

### 🌍 Eventos do Mundo & Ambiente
| # | Ação/Evento | Prioridade | Sugestão de Som | Duração | Notas |
|---|------------|-----------|-----------------|---------|-------|
| 19 | **Focos de Fogo Multiplicam** | 🟡 Média | Som de propagação | ~120ms | Freq: 250→200 Hz, sawtooth, repetição rápida |
| 20 | **Árvore Queimada Completamente** | 🟡 Média | Som de árvore caindo | ~200ms | Freq: 400→150 Hz, sawtooth, fall-off |
| 21 | **Casa Queimada/Destruída** | 🟡 Média | Som de estrutura queimando | ~180ms | Freq: 350→180 Hz, sawtooth, estrondo abafado |
| 22 | **Fumaça Densa Aparece** | ⚪ Baixa | Som ambiental de neblina | ~250ms | Freq: 150 Hz constante, sine, contínuo suave |
| 23 | **Saúde da Floresta Crítica** | 🟠 Alta | Som de alerta ambiental | ~200ms | Freq: 600→400→600 Hz, square, tipo alarme pulsante |
| 24 | **Consciência Coletiva Aumenta** | 🟠 Alta | Som de progresso positivo | ~250ms | Freq: 440→550→659 Hz, sine, 3 notas ascendentes |
| 25 | **Doação de Casa Recebida** | 🟠 Alta | Som de ganho de recurso | ~200ms | Freq: 523→659→784 Hz, square, 3 notas ascendentes (type winning) |

### 💬 Diálogos & Narrativa
| # | Ação/Evento | Prioridade | Sugestão de Som | Duração | Notas |
|---|------------|-----------|-----------------|---------|-------|
| 26 | **Balão de Fala Aparece** | 🟡 Média | Som suave de notification | ~100ms | Freq: 880 Hz, sine, ping leve |
| 27 | **Ajuste Fiscal Ativado** | 🟠 Alta | Som de "travamento"/restrição | ~200ms | Freq: 440 Hz (constante), sawtooth, tipo efeito de "glitch" |
| 28 | **Ajuste Fiscal Removido** | 🟠 Alta | Som de libertação | ~250ms | Freq: 440→550→659 Hz, square, ascendente rápido |
| 29 | **Narração/Evento Importante** | ⚪ Baixa | Som de abertura de cena | ~300ms | Freq: 329→392→494 Hz, sine, suave |

### 📊 HUD & Sistemas
| # | Ação/Evento | Prioridade | Sugestão de Som | Duração | Notas |
|---|------------|-----------|-----------------|---------|-------|
| 30 | **Atualização de Estatísticas** | 🟡 Média | Som de "blip" | ~80ms | Freq: 700 Hz, square, ping |
| 31 | **Recurso Esgotado** | 🟠 Alta | Som de falta de recurso | ~150ms | Freq: 220 Hz, triangle, triste/grave |
| 32 | **Limite de Unidades Atingido** | 🟡 Média | Som de aviso suave | ~120ms | Freq: 600 Hz, sine, tipo "ding" |
| 33 | **Timer/Contagem Regressiva** | 🟡 Média | Som repetitivo de tique | ~50ms cada | Freq: 800 Hz, sine, repetido a cada segundo |
| 34 | **Cooldown de Habilidade Pronta** | 🟠 Alta | Som de "prontidão" | ~200ms | Freq: 659→784 Hz, square, 2 notas ascendentes rápidas |

---

## 🎼 Especificações Técnicas

### Síntese Web Audio
- **Contexto:** `AudioContext` da Web Audio API
- **Tipos de Onda:** square, triangle, sawtooth, sine
- **Volume Padrão:** 0.06-0.11 (volume total do jogo em 60% para BGM)
- **Duração Típica:** 50ms-300ms para efeitos, ~400-500ms para melódias
- **Ramp:** `exponentialRampToValueAtTime` para transições suaves

### MP3 via Phaser
- **Arquivo BGM Fase 1:** `bgm_fase_1` (em loop, 60% volume)
- **Música Atual:** `O_Peso_da_Terra.mp3` (utilizada como fallback)
- **Taxa de Amostragem:** 44.1 kHz (padrão web)

### Frequências Musicais (Referência)
```
C4: 261.6 Hz      | D4: 293.7 Hz      | E4: 329.6 Hz
F4: 349.2 Hz      | G4: 392.0 Hz      | A4: 440.0 Hz
B4: 493.8 Hz      | C5: 523.2 Hz      | D5: 587.3 Hz
E5: 659.2 Hz      | F5: 698.5 Hz      | G5: 784.0 Hz
A5: 880.0 Hz      | B5: 987.7 Hz      | C6: 1046.5 Hz
```

---

## 📝 Guia de Implementação

### Adicionando um Novo Som

1. **Defina o método no SoundManager:**
   ```typescript
   public playMySound(): void {
     this.playTone(440, 0.1, 'square', 0.07, 550); // freq, duration, type, volume, slideToFreq
   }
   ```

2. **Chame em seu código:**
   ```typescript
   import { SoundManager } from '../audio/SoundManager';
   
   SoundManager.playMySound();
   ```

3. **Para MP3/Áudio externo:**
   ```typescript
   SoundManager.setScene(this); // Na Scene
   this.sound.add('my_audio_key', { loop: false, volume: 0.8 }).play();
   ```

4. **Registre no BootScene (se MP3):**
   - Adicione o carregamento em `BootScene.ts`
   - Formato: `this.load.audio('audio_key', 'path/to/audio.mp3')`

### Boas Práticas
- ✅ Use **síntese** para efeitos rápidos e UI (< 300ms)
- ✅ Use **MP3** para música de fundo e áudio longo
- ✅ Mantenha **volume consistente** entre efeitos (0.06-0.11)
- ✅ Teste em **dispositivos móveis** (áudio pode ser bloqueado inicialmente)
- ✅ Sempre **desbloqueia o contexto de áudio** no primeiro toque (`unlock()`)
- ⚠️ Evite sons muito **altos ou irritantes** (pode prejudicar UX)
- ⚠️ Considere **múltiplos sons simultâneos** (pode sobrecarregar em modo web)

---

## 🎯 Prioridades de Desenvolvimento

### Fase 1: CRÍTICO 🔴
- [x] Seleção de unidade (`playSelect`)
- [x] Apagar fogo (`playExtinguish`)
- [x] Captura (`playCapture`)
- [ ] Movimento de unidade (`playMovement`) - **NOVO**
- [ ] Formação de unidade (`playUnitSpawned`) - **NOVO**
- [ ] Morte de unidade (`playUnitDeath`) - **NOVO**
- [ ] Dano ao Boss (`playBossDamage`) - **NOVO**

### Fase 2: IMPORTANTE 🟠
- [x] Fogo inicia (`playFireStart`)
- [x] Ação integrada (`playIntegratedAction`)
- [x] Fase avança (`playPhaseUp`)
- [ ] Unidade crítica/exausta (`playUnitExhausted`) - **NOVO**
- [ ] Árvore replantada (`playTreeGrown`) - **NOVO**
- [ ] Consciência aumenta (`playConsciousnessUp`) - **NOVO**
- [ ] Doação recebida (`playDonationReceived`) - **NOVO**
- [ ] Ajuste Fiscal removido (`playAdjustmentRemoved`) - **NOVO**

### Fase 3: MELHORIAS 🟡
- [x] Boss alerta (`playBossAlert`)
- [x] Vitória (`playVictory`)
- [x] Derrota (`playDefeat`)
- [ ] Menu abrir/fechar
- [ ] Balão de fala aparece
- [ ] Cooldown pronto
- [ ] Som ambiental contínuo (fumaça)

### Fase 4: POLIMENTO ⚪
- [ ] Sons de hover em botões
- [ ] Tiques de timer/contagem regressiva
- [ ] Narração/cenas cinemáticas
- [ ] Diferentes sons de morte por tipo de unidade

---

## 🔗 Referências no Código

### Arquivos com Chamadas de Som
- **SoundManager.ts** - Definições de todos os sons
- **GameScene.ts** - Maioria das ações de jogo
- **GameOverScene.ts** - Vitória/Derrota
- **Brigadista.ts** / **Bombeiro.ts** / **GuardaFlorestal.ts** - Ações de unidades
- **Curupira.ts** / **MaeDaMata.ts** - Ações de encantados
- **Incendiario.ts** - Ações do inimigo
- **MenuScene.ts** - Menu UI

### Métodos SoundManager Disponíveis
```typescript
// Implementados
playSelect()           // UI
playExtinguish()       // Ação
playFireStart()        // Evento
playCapture()          // Ação
playIntegratedAction() // Ação
playPhaseUp()          // Evento
playBossAlert()        // Evento
playVictory()          // Fim
playDefeat()           // Fim
playBGMForPhase(id)    // BGM
startMusic()           // BGM fallback
stopMusic()            // BGM stop
toggleMute()           // Controle
unlock()               // Desbloqueio automático
```

---

## 📊 Checklist de Implementação

- [ ] **Fase 1 Crítica** - Todos os sons de movimento e unidades
- [ ] **Fase 2 Importante** - Sons de eventos do mundo
- [ ] **Fase 3 Melhorias** - Sons de UI e ambiente
- [ ] **Fase 4 Polimento** - Sons especiais e cinemática
- [ ] **Testes** - Funcionamento em desktop e mobile
- [ ] **Balanceamento** - Volumes consistentes
- [ ] **Documentação** - Atualizar com sons adicionados
- [ ] **Performance** - Verificar overhead de síntese em múltiplos sons

---

## 🎨 Paleta de Sons (Resumo)

| Tipo | Frequência | Onda | Volume | Duração | Exemplo |
|------|-----------|------|--------|---------|---------|
| **UI/Menu** | 400-880 Hz | square | 0.06-0.07 | 50-200ms | Select, Click |
| **Ação** | 300-800 Hz | square/sine | 0.07-0.08 | 80-200ms | Move, Attack, Capture |
| **Impacto** | 200-600 Hz | sawtooth | 0.08-0.11 | 150-250ms | Damage, Explosion |
| **Mágico** | 330-987 Hz | sine | 0.07-0.09 | 150-300ms | Invocation, Growth |
| **Alerta** | 150-600 Hz | square | 0.07-0.11 | 120-200ms | Warning, Critical |
| **Música** | Variável | triangle/sine | 0.025-0.06 | 100-300ms | BGM, Jingles |

---

**Última Atualização:** 15 de Novembro de 2024  
**Versão:** 1.0  
**Estatus:** 🟡 Em Progresso (11/44 sons implementados)
