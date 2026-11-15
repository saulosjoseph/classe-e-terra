# 🎮 ANÁLISE COMPLETA: Mecânicas de Consciência Coletiva

## 📂 Arquivos Inclusos

1. **LEIA-ME.md** (este arquivo)
   - Resumo executivo e guia de navegação

2. **mecanicas_consciencia.md**
   - Análise detalhada de CADA uma das 7 novas mecânicas
   - Conceito narrativo, funcionamento técnico, feedback visual
   - Integração com o jogo existente

3. **resumo_mecanicas.md**
   - Resumo visual em cards
   - Exemplos de gameplay
   - Balanceamento por dificuldade
   - Ordem de implementação

4. **tabela_comparacao.md**
   - Tabelas de referência rápida
   - Como ativar cada ação
   - Progressão por fase
   - Sinergia entre mecânicas

5. **visual_mecanicas.txt**
   - Diagramas ASCII mostrando ONDE O JOGADOR CLICA
   - Antes/Depois de cada ação
   - Timeline de gameplay típico

---

## 🔍 Problema Diagnosticado

**Atual:** Apenas 2 formas significativas ganham consciência:
- Doações de casas (+0,5%, muito lento)
- 4 ações integradas idênticas (+5-10%, mecânica rígida)

**Resultado:** Sistema previsível, sem variedade, sem ritmo

---

## ✅ Solução Proposta: 7 Novas Mecânicas

### Resumo das 7 Mecânicas

| # | Nome | Ganho | Tipo | Momento |
|---|------|-------|------|---------|
| 1 | 👥 Mobilização Popular | +2% | Ação Local | Fase 3+ |
| 2 | 🤝 Mutirão de Proteção | +3% | Ação Local | Fase 1+ |
| 3 | 🌿 Resgate Indígena | +4% | Automática | Fase 2+ |
| 4 | 📚 Educação Ambiental | +3% | Setorial | Fase 4+ |
| 5 | ⚡ Corrente Solidariedade | +2% bônus | Combo | Qualquer |
| 6 | 🏛️ Ocupação Prefeitura | +22,5% | Especial | Fase 5+ |
| 7 | 🔮 Memória Coletiva | +7% | Ritual | Fase 3+ |

---

## 🎮 Como Usar Esta Análise

### Se você quer entender RÁPIDO
→ Leia: **resumo_mecanicas.md**
- Cards com ícone, ganho, e descrição de 3 linhas
- Exemplos de gameplay reais
- Total: 5 minutos

### Se você quer detalhes TÉCNICOS
→ Leia: **mecanicas_consciencia.md**
- Cada mecânica tem: conceito, clique, efeito, feedback visual, momento
- Entender como integrar ao código
- Total: 15 minutos

### Se você quer REFERENCIAR
→ Use: **tabela_comparacao.md**
- Tabelas rápidas, fases, sinergia
- Checklist de implementação
- Estratégias de gameplay
- Total: Consulta rápida (2-3 min)

### Se você quer VER VISUALMENTE
→ Leia: **visual_mecanicas.txt**
- Diagrama ASCII para cada mecânica
- Mostra exatamente onde o jogador clica
- Timeline de gameplay real
- Total: 10 minutos

---

## 📊 Impacto Esperado

### Velocidade de Progressão

**Antes (sem novas mecânicas):**
```
~40% por minuto (apenas ações integradas)
Tempo para 100%: 2,5 minutos
```

**Depois (com novas mecânicas, uso otimizado):**
```
~70% por minuto (passivo)
~89% por minuto (com Ocupação Prefeitura)
Tempo para 100%: 1,1-1,4 minutos
```

### Jogabilidade

- ✅ Mais variedade de ações
- ✅ Múltiplos ritmos (automático, manual, contínuo)
- ✅ Mais estratégia (sinergia entre ações)
- ✅ Narrativa integrada (cada ação é um ato político/social)

---

## 🎯 Próximas Ações Recomendadas

### Passo 1: Decisão de Escopo
- [ ] Confirmar que quer implementar todas as 7
- [ ] Ou selecionar algumas para MVP?

### Passo 2: Prototipagem
Implementar nesta ordem (por impacto/complexidade):

```
Semana 1: ⚡ Corrente Solidariedade + 🌿 Resgate Indígena
Semana 2: 👥 Mobilização + 🤝 Mutirão
Semana 3: 📚 Educação
Semana 4: 🏛️ Ocupação + 🔮 Memória
```

### Passo 3: Balanceamento
- Testar valores de ganho por dificuldade
- Ajustar cooldowns
- Validar sinergia entre ações

---

## 📌 Informações Importantes

### Fase de Desbloqueio

Cada mecânica é desbloqueada em uma fase específica da narrativa:

- **Fase 1** (0-19%): Mutirão (já está, defesa agrária)
- **Fase 2** (20-34%): Resgate Indígena (Encantados ativam consciência)
- **Fase 3** (35-49%): Mobilização + Memória (Cidade se liberta, rituais)
- **Fase 4** (50-64%): Educação (Guarda Florestal conscientiza)
- **Fase 5** (65-99%): Ocupação Prefeitura (Pressão política máxima)
- **Fase 6** (100%): Todas + Burguês final

### Mecânicas Automáticas

Algumas ações geram consciência SEM o jogador fazer nada:
- 🌿 **Resgate Indígena**: Quando Encantado expira (surgir botão, mas é automático)
- ⚡ **Corrente Solidariedade**: Quando 2+ ações em 15s (sistema detecta, bônus automático)

### Mecânicas Contínuas

Algumas ganham consciência "por segundo":
- 🏛️ **Ocupação Prefeitura**: +0,5%/s enquanto ativa (até 90s = até +45%)

---

## 💡 Exemplos de Gameplay

### Exemplo 1: Fase 2 (Early Game)
```
T=0s   Encantado expira → Clica "Resgate" → +4%
T=10s  Clica "Mutirão" → +3%
T=25s  Executa ação integrada → +5%
T=30s  Executa segunda ação integrada
       CORRENTE DETECTADA! → +2% bônus automático
─────────────────────────────────────────────
Total: 14% em 30 segundos (muito mais rápido!)
```

### Exemplo 2: Fase 5 (Late Game)
```
T=0s   Clica "Ocupação Prefeitura" ATIVA
       Multidão ocupa prefeitura...
       +0,5%/s começa

T=20s  Executa ação integrada (cooldown -50%!)
       Ganho: +5% + bônus combo +2%

T=45s  Clica "Ocupação" DESATIVA
       Ganho total ocupação: +22,5%
       Represália: Incendiários dobram por 60s
       (Precisa defender enquanto reprimem)
─────────────────────────────────────────────
Total: ~30% em 45 segundos (rápido E estratégico)
```

---

## 🔗 Integração com Código Existente

### Arquivos-chave do Jogo
```
src/systems/SectorSystem.ts
  ├─ executeIntegratedAction() → Adicionar sinergia "Corrente"
  └─ executeLocalAction() → Adicionar Mobilização + Mutirão

src/systems/PoliticalPhaseSystem.ts
  └─ addConsciousness() → Já existe, só usar para novas ações

src/scenes/GameScene.ts
  ├─ donateFromHouse() → Já existe
  └─ Adicionar handlers para novas ações

src/scenes/UIScene.ts
  ├─ showDonationInfoModal() → Já existe
  └─ Adicionar painéis para novas ações
```

---

## ⚙️ Balanceamento Por Dificuldade

Os ganhos de consciência escalam com dificuldade:

| Mecânica | Fácil | Normal | Difícil |
|----------|-------|--------|---------|
| Mobilização | +3% | +2% | +1,4% |
| Mutirão | +4,5% | +3% | +2,1% |
| Resgate | +6% | +4% | +2,8% |
| Educação | +4,5% | +3% | +2,1% |
| Corrente | +3% | +2% | +1,4% |
| Ocupação/s | +0,75%/s | +0,5%/s | +0,35%/s |
| Memória | +10,5% | +7% | +4,9% |

---

## 📋 Checklist Rápido

**Antes de implementar:**
- [ ] Ler `resumo_mecanicas.md` (5 min)
- [ ] Ler `visual_mecanicas.txt` (10 min)
- [ ] Discutir prioridades de implementação

**Durante implementação:**
- [ ] Consultar `mecanicas_consciencia.md` para cada ação
- [ ] Usar `tabela_comparacao.md` para referências
- [ ] Testar sequências de gameplay

**Após implementação:**
- [ ] Validar cooldowns e ganhos
- [ ] Testar sinergia entre ações
- [ ] Balancear por dificuldade

---

## 🎬 Próximas Perguntas?

Se tiver dúvidas sobre:
- **Como uma ação funciona?** → `mecanicas_consciencia.md`
- **Onde o jogador clica?** → `visual_mecanicas.txt`
- **Quanto ganha por ação?** → `tabela_comparacao.md`
- **Qual implementar primeiro?** → `resumo_mecanicas.md` (Sprint 1-4)

---

**Última atualização:** 15 de Novembro, 2026
**Status:** Análise Completa - Pronto para Implementação

