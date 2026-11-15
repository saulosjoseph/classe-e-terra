# Análise Detalhada: Mecânicas para Aumentar Consciência de Classe Coletiva

## 📊 Estado Atual do Jogo

Atualmente, existem **5 fontes de Consciência Coletiva**:

1. **Doação de Casas** → +0,5% (recarga 2 min, ação manual)
2. **Cidade ➔ Floresta** → +5% (recarga 7,5s, ação integrada)
3. **Campo ➔ Cidade** → +5% (recarga 7,5s, ação integrada)
4. **Floresta ➔ Campo** → +5% (recarga 7,5s, ação integrada)
5. **Captura ➔ Cidade** → +10% (recarga variável, depende de capturas, ação integrada)

**Problema Identificado:** As doações de casas (+0,5%) são pouco relevantes mecanicamente. Podem ser feitas frequentemente mas geram muito pouca consciência. As ações integradas (5-10%) são as principais.

---

## 🎯 Novas Mecânicas Propostas para Aumentar Consciência Coletiva

### 1. **MOBILIZAÇÃO POPULAR NA CIDADE** (Integração Urbana)
**Tipo:** Ação Local da Cidade (semelhante a Barreira de Exaustão)

**Conceito Narrativo:** Manifestações, concentrações de rua, assembleias comunitárias

**Mecânica Detalhada:**

- **Onde o jogador clica:** Em um botão específico na UI durante a Fase 3+ (após derrubada do Ajuste Fiscal, quando o povo tem mais liberdade)
- **Ícone:** 👥 MOBILIZAÇÃO ou 🗣️ ASSEMBLEIA
- **Ativação:** Requer um mínimo de **2 casas com consciência "ativa"** (que doaram nos últimos 30s) para representar o engajamento popular
- **Recarga:** 45 segundos (ação sustentável, frequente)
- **Ganho:** +2% de Consciência imediata
- **Efeito Secundário:** 
  - Todos os trabalhadores rurais ganham +15% de velocidade e força por 20s (solidariedade das classes)
  - Reduz em 3s o cooldown de uma ação integrada à escolha (representando pressão política)
  - Surgem efeitos visuais: pessoas correndo pelas ruas da cidade, cartazes flutuando

**Feedback Visual:**
- Animação: pessoas saindo das casas e se concentrando em um ponto na Prefeitura
- Sons: vozes crescendo, buzinas, "PÃO E LUTA!" ou similar
- Texto flutuante: "👥 +2% Mobilização Popular!"

**Momento do Jogo:** Surge na Fase 3 (Vitória Urbana - 35% consciência), quando a narrativa permite ativismo político

---

### 2. **AÇÃO COMUNITÁRIA RURAL - MUTIRÃO DE PROTEÇÃO** (Defesa Coletiva)
**Tipo:** Ação Local do Campo

**Conceito Narrativo:** Mutirões comunitários de proteção das plantações e nascentes, trabalho coletivo

**Mecânica Detalhada:**

- **Onde o jogador clica:** Em um botão na UI específico do Campo, ou clicando diretamente numa zona de plantio visível no Campo
- **Ícone:** 🤝 MUTIRÃO ou 🌾 PROTEÇÃO COLETIVA
- **Ativação:** Requer que haja **pelo menos 1 foco de fogo ativo no Campo** (caso contrário, não há ameaça para mobilizar)
- **Recarga:** 50 segundos
- **Ganho:** +3% de Consciência imediata
- **Efeito Secundário:**
  - Cria um efeito de escudo temporário no Campo por 25s: reduz dano direto do fogo em 40% nessa zona
  - Aumenta velocidade e força de extinção dos Brigadistas Comunitários que estão no Campo em +20% por 25s
  - Se combinado com a ação "Floresta ➔ Campo" (nascentes), ambas as ações recebem -5s de cooldown (sinergia)

**Feedback Visual:**
- Animação: mais Trabalhadores Rurais surgem dinamicamente no campo, formando uma linha de defesa
- Aura verde brilhante ao redor da zona agrícola
- Texto flutuante: "🤝 +3% Mutirão Comunitário!"
- Som: cordas de violão, vozes em harmonia

**Momento do Jogo:** Disponível desde o início (Fase 1), mas mais valorizado nas Fases 2-4 quando o Campo é mais ameaçado

---

### 3. **RESGATE E REABILITAÇÃO INDÍGENA** (Encantados + Comunidade)
**Tipo:** Ação Integrada (Floresta → Aldeias)

**Conceito Narrativo:** Quando os Encantados são invocados e completam sua missão, o povo as aldeias celebra e fortalece vínculos de resistência

**Mecânica Detalhada:**

- **O que dispara:** Quando um **Curupira ou Mãe da Mata expiram** (após 60s de ação) ou completam uma tarefa decisiva (capturam 2+ incendiários ou apagam 3+ focos)
- **Automático ou Manual:** Surge uma opção visual na aldeia que o encantado saiu
  - **Se Curupira:** Botão 🎊 CELEBRAR CAPTURA (gratuitamente, sem cooldown)
  - **Se Mãe da Mata:** Botão 🌿 HONRAR REGENERAÇÃO
- **Como Usar:** Clique no botão que surge sobre a aldeia após o encantado desaparecer
- **Ganho:** +4% de Consciência
- **Efeito Secundário:**
  - Próxima invocação de encantado nessa aldeia tem -10s de cooldown
  - Surgem "espíritos" visuais que fluem de volta à aldeia
  - Todos os guardas e brigadistas na área ganham +10% de força por 15s (bênção ancestral)

**Feedback Visual:**
- Animação: fumaça sagrada, pássaros, luz mágica saindo da aldeia
- Indígenas celebrando
- Texto flutuante: "🌿 +4% Honra Ancestral Restaurada!"

**Momento do Jogo:** Fase 2+ (quando Encantados podem ser invocados)

---

### 4. **EDUCAÇÃO AMBIENTAL - PALESTRAS E CONSCIENTIZAÇÃO** 
**Tipo:** Ação Setorial da Floresta

**Conceito Narrativo:** Guardiões da floresta educam as comunidades sobre o valor do território

**Mecânica Detalhada:**

- **Onde o jogador clica:** Clicando no Guarda Florestal Comunitário Armado (quando disponível, Fase 4+) ou num botão dedicado na UI
- **Ícone:** 📚 EDUCAÇÃO ou 🗣️ CONSCIENTIZAÇÃO
- **Requisito:** Apenas ativa a partir da **Fase 4 (50% consciência)**, quando o Guarda surge
- **Ativação:** Clique no Guarda ou num botão UI. O guarda então patrulha um caminho que passa por pelo menos 2 casas da cidade (educação móvel)
- **Duração:** 30 segundos de "missão educativa"
- **Recarga:** 40 segundos
- **Ganho:** +3% de Consciência ao final da duração
- **Efeito Secundário:**
  - Todas as casas que o Guarda passou perto têm +10% de chance de poder doar novamente (encurtamento de cooldown)
  - Próxima ação Captura ➔ Cidade tem -5s de recarga (povo mais mobilizado)
  - Brigadistas que seguem o Guarda ganham +15% de força temporariamente (inspiração)

**Feedback Visual:**
- O Guarda traça um caminho brilhante passando por casas
- Pessoas saem das casas para ouvi-lo (animação)
- Balão de fala acima do Guarda mostrando "📚 Educação Ambiental"
- Texto flutuante nas casas: "📚 +consciência popular"
- Som: flauta indígena, som educativo

**Momento do Jogo:** Fase 4 em diante (Autodefesa Armada, 50%+)

---

### 5. **SOLIDARIEDADE INTER-SETORIAL - CORRENTES DE AJUDA MÚTUA**
**Tipo:** Ação Combinada (cualquier setor, automática/manual)

**Conceito Narrativo:** Quando dois setores executam ações integradas próximas no tempo, a solidariedade cresce

**Mecânica Detalhada:**

- **O que dispara:** Se duas ações integradas forem executadas em sequência **dentro de 15 segundos**:
  - Ex: Cidade ➔ Floresta, DEPOIS Campo ➔ Cidade (dentro de 15s)
  - Ex: Captura ➔ Cidade, DEPOIS Floresta ➔ Campo (dentro de 15s)
  
- **Como o jogador vê:** 
  - Aviso visual: "⚡ Corrente de Solidariedade!" aparece quando a 2ª ação é feita
  - Um bônus é concedido imediatamente
  
- **Ganho:** +2% de Consciência EXTRA (bônus por sinergia)
- **Cooldown Reduzido:** Ambas as ações que formaram a corrente têm recarga reduzida em 40% (por exemplo: volta de 7,5s para ~4,5s)
- **Efeito Cascata:** Se conseguir 3 ações integradas em 30s (um triplo), ganha +5% de Consciência extra e +50% de dano para todas as unidades por 20s

**Feedback Visual:**
- Linha de luz conectando os dois setores envolvidos
- Ícone ⚡ brilhando na tela
- Texto flutuante: "⚡ +2% Solidariedade Ativada!"
- Som: cristais tocando, harmonia crescendo
- Para triplo: Explosão de luz, todos as unidades brilham

**Momento do Jogo:** Disponível desde Fase 1, mas mais interessante nas Fases 2-5 quando o jogador tem mais ações disponíveis

---

### 6. **OCUPAÇÃO COMUNITÁRIA DA PREFEITURA** (Pressão Política Permanente)
**Tipo:** Ação Especial da Cidade (desbloqueável)

**Conceito Narrativo:** O povo ocupa a Prefeitura para pressionar por políticas de proteção ambiental

**Mecânica Detalhada:**

- **Desbloqueio:** Disponível somente na **Fase 5 (65% consciência)** - "O Escudo Territorial"
- **Como Ativar:** Clique na **Prefeitura** (prédio especial na cidade) para exibir opção "🏛️ OCUPAR A PREFEITURA"
- **Requisito:** Requer que pelo menos **3 casas tenham doado** (engajamento da população)
- **Duração:** Enquanto ativada (até que o jogador clique novamente para desativar ou 90s no máximo)
- **Recarga após desativar:** 60 segundos
- **Ganho:** +0,5% de Consciência **por segundo enquanto ativo** (acumulativo!)
  - Se deixar por 20 segundos: +10% de Consciência
  - Máximo de 90s: +45% de Consciência em uma única ação (extraordinária!)
  
- **Trade-off (estratégia real):**
  - Enquanto a ocupação está ativa, o cooldown de Ações Integradas reduz em 50% (poder de negociação)
  - MAS a geração de Incendiários dobra por 60s após desativar (represália do Burguês)
  - A Prefeitura fica "indisponível" para ações por 60s após desativação

**Feedback Visual:**
- Multidão de pessoas entrand na Prefeitura (animação contínua)
- Prédio ganha aura vermelha/rosa (energização política)
- Barreira flutuante mostra duração (3 estágios: 0-30s, 30-60s, 60-90s)
- Sons: palmas ritmadas, slogans ("É DIREITO! É DIREITO!", "FLORESTA E POVO, SIM!")
- Contador visual: "Ocupação ativa: X%"
- Ao atingir máximo: Efeito visual épico, som alto, toda a cidade brilha

**Momento do Jogo:** Fase 5 em diante. Ferramenta de pressão final antes da Fase 6.

---

### 7. **MEMÓRIA COLETIVA - RITUAL DE ANCESTRALIDADE**
**Tipo:** Ação Setorial da Floresta (ritual comunitário)

**Conceito Narrativo:** Comunidades indígenas e tradicionais realizam rituais que conectam o povo ao saber ancestral e à terra

**Mecânica Detalhada:**

- **Desbloqueio:** Fase 3+ (35% consciência)
- **Como Ativar:** Clique em uma das **4 Aldeias** indígenas do mapa
  - Menu surge: "🔮 INVOCAR MEMÓRIA COLETIVA"
  - Além da opção de invocar Encantados, aparece este botão
  
- **Ativação:** Clique. O ritual começa imediatamente.
- **Duração:** 25 segundos (cerimônia longa)
- **Recarga:** 35 segundos (pode usar frequentemente)
- **Ganho:** +2% de Consciência imediata + +0,2% por segundo da cerimônia (total +7% se deixar os 25s completos)
- **Efeito Especial:** 
  - Durante o ritual, TODAS as árvores queimadas num raio de 400px ao redor da aldeia começam a regenerar automaticamente (-1 árvore queimada a cada 5s)
  - Fumaça no raio do ritual reduz 1 nível (nível 3 → nível 2, etc)
  - Incendiários no raio desaceleram -25% (clima espiritual)

**Feedback Visual:**
- Luz sagrada emanando da aldeia
- Índígenas em círculo, dançando/cantando (animação cíclica)
- Árvores ao redor reluzem enquanto regeneram
- Pássaros e animais aparecem próximos à aldeia
- Fumaça se dissipa com movimento orgânico
- Texto flutuante: "🔮 +2% Memória Ancestral Resgatada"

**Momento do Jogo:** Fase 3+ (Vitória Urbana)

---

## 📈 Tabela Comparativa: Fontes de Consciência de Classe

| Fonte | Tipo | Recarga | Ganho | Momento | Automaticidade | Sinergia |
|-------|------|---------|-------|---------|-----------------|----------|
| Doação de Casa | Manual | 2 min | +0,5% | Qualquer | Manual | Nenhuma |
| Cidade ➔ Floresta | Integrada | 7,5s | +5% | Qualquer | Manual | Bônus sinergia |
| Campo ➔ Cidade | Integrada | 7,5s | +5% | Qualquer | Manual | Bônus sinergia |
| Floresta ➔ Campo | Integrada | 7,5s | +5% | Qualquer | Manual | Bônus sinergia |
| Captura ➔ Cidade | Integrada | Var. | +10% | Qualquer | Manual | Bônus sinergia |
| **Mobilização Popular** | **Local Cidade** | **45s** | **+2%** | **Fase 3+** | **Manual** | **-3s recarga ação** |
| **Mutirão de Proteção** | **Local Campo** | **50s** | **+3%** | **Fase 1+** | **Manual** | **Sinergia Floresta** |
| **Resgate Indígena** | **Automática** | **Var.** | **+4%** | **Fase 2+** | **Automática** | **-10s encantado** |
| **Educação Ambiental** | **Setorial Floresta** | **40s** | **+3%** | **Fase 4+** | **Manual** | **-5s Captura** |
| **Corrente Solidariedade** | **Combinada** | **N/A** | **+2% bônus** | **Qualquer** | **Automática** | **-40% recarga** |
| **Ocupação Prefeitura** | **Especial Cidade** | **60s** | **+0,5%/s** (até 45%) | **Fase 5+** | **Manual Contínuo** | **-50% recarga ações** |
| **Memória Coletiva** | **Setorial Floresta** | **35s** | **+7%** (25s) | **Fase 3+** | **Manual** | **Regenera árvores** |

---

## 🎮 Prototipagem Priorizada: Implementar Nesta Ordem

### Tier 1 (Impacto Alto, Implementação Média):
1. **Corrente Solidariedade** - Incentiva combo de ações, mecânica pura
2. **Resgate Indígena** - Automática, liga Encantados à Consciência

### Tier 2 (Impacto Médio, Implementação Média):
3. **Mobilização Popular** - Nova ação urbana, requer UI dedicada
4. **Mutirão de Proteção** - Novo efeito setorial, IA simples

### Tier 3 (Impacto Alto, Implementação Complexa):
5. **Ocupação Prefeitura** - Ação especial, requer balanceamento fino
6. **Educação Ambiental** - Requer pathfinding do Guarda

### Tier 4 (Impacto Alto, Implementação Complexa):
7. **Memória Coletiva** - Regeneração de árvores, fx visuais

---

## 🎯 Recomendações Finais

1. **Diversidade de Formas:** As novas mecânicas criam diferentes "ritmos" de ganho (manual, automática, contínua)
2. **Narrativa Integrada:** Cada ação reforça um pilar da luta de classes (urbana, rural, indígena, solidariedade)
3. **Progressão:** Novas mecânicas desbloqueiam em Fases específicas, marcando evolução
4. **Profundidade Estratégica:** A Corrente de Solidariedade premia jogadores que coordenam ações
5. **Recompensa Criatividade:** Ocupação da Prefeitura permite "vencer na política" com pressão sustentada

