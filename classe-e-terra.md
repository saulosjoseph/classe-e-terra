# Documento de Design de Jogo (GDD): Classe e terra - A União do Tapajós

## 1. Visão Geral

* **Gênero:** Ação, Defesa de Território em Tempo Real (Real-Time Strategy/Defense).
* **Temática:** Luta de classes, crise ambiental, resistência comunitária e direitos socioambientais em Santarém e no Baixo Tapajós.
* **Estilo Visual:** Pixel art. Paleta de cores em forte contraste: a fumaça tóxica, que evolui de um **cinza claro até um preto denso e absoluto**, avançando sobre as cores vivas da resistência (verde da mata, azul dos rios, tons quentes da cidade viva). Não haverá tons de laranja ou vermelho na fumaça.
* **Objetivo Principal:** Sobreviver ao avanço da fumaça e do fogo, construir a unidade entre três classes sociais distintas e derrotar a raiz do problema: o Burguês financiador da destruição.
* **Condição de Derrota:** A saúde da Floresta chegar a 0%. Ela combina a perda de árvores (80% do peso) com o dano direto do fogo (20%) e só zera quando 75% das árvores queimam, ou seja, a Floresta é consumida pelo fogo e pela fumaça negra.
* **Condição de Vitória:** Atingir 100% de Consciência Coletiva, sobreviver à investida final e derrotar o Burguês.

## 2. O Mapa e as Classes Bases

A tela apresenta uma visão isométrica ou superior de Santarém, dividida em três zonas interconectadas por estradas, rios e trilhas. Cada setor possui funções vitais e classes nativas:

### 🏙️ A Cidade (Trabalhadores Urbanos)
* **Contexto:** Sofre com sufocamento, calor extremo e o peso do Ajuste Fiscal.
* **Função:** Logística, conscientização, equipamentos e pressão política.
* **Ações:** Mobilização popular, denúncias (Captura ➔ Cidade) e barreira de exaustão contra a fumaça.
* **Mobilização popular (em definição):** A Cidade poderá pressionar o poder público. A mecânica ainda será definida.

### 🌾 O Campo (Agricultura Familiar e Ribeirinhos)
* **Contexto:** Sofre com perda de safra, rios secando e fogo avançando.
* **Função:** Sustentabilidade, recursos alimentares e contenção de avanço.
* **Ações:** Construção de aceiros, mutirão de alimentos e proteção de nascentes.

### 🌳 A Floresta (Guardiões da Mata)
* **Contexto:** Sofre invasões, mortandade de animais e perda de saberes.
* **Função:** Combate direto na linha de frente, regeneração e ancestralidade.
* **Ações:** Plantio de sementes e o Chamado aos Encantados. O mapa tem quatro aldeias indígenas, uma em cada vértice da Floresta (topo, direita, base e esquerda).

### 🌿 Os Encantados (Renovação da Floresta)
* **Quem invoca:** As aldeias indígenas. Ao tocar em uma aldeia, abre-se a opção "Invocar Curupira" ou "Invocar Mãe da Mata", e o encantado nasce nessa aldeia.
* **Limite:** No máximo 4 encantados em campo ao mesmo tempo, somando Curupiras e Mães da Mata.
* **Recarga:** 3 minutos para cada tipo de encantado, separadamente.
* **Duração:** 60 segundos. Depois disso, ele deixa a partida.

#### O Curupira
* **Comportamento:** Age sozinho. Prioridades: (1) laçar e capturar o incendiário mais próximo, a até 56 px; (2) apagar o foco mais próximo; (3) sem focos, atacar a Fortaleza do Burguês, se estiver ativa; (4) sem nada disso, fica parado na aldeia.
* **Captura:** Cada incendiário capturado segue a regra de captura do Guarda Florestal e alimenta a ação Captura ➔ Cidade.
* **Não recupera a floresta:** O Curupira não replanta árvores nem restaura a saúde da floresta.
* **Atributos:** Mesmas regras das demais unidades (fumaça desacelera, pode ser acompanhado pela câmera), mas mais forte: velocidade 240, força de extinção 60 e 20 de dano por segundo ao Burguês. Não cansa: a energia nunca diminui.

#### A Mãe da Mata
* **Comportamento:** Age sozinha. Prioridades: (1) apagar o foco mais próximo, jogando água; (2) sem focos, replantar a árvore queimada mais próxima, com 1 árvore a cada 10 segundos de trabalho.
* **Recuperação:** Cada árvore replantada volta a ser saudável e restaura a saúde da floresta.
* **Atributos:** Mesmas regras das demais unidades (fumaça desacelera, pode ser acompanhada pela câmera). Velocidade 200 e força de extinção 50. Não cansa: a energia nunca diminui.

## 3. As Classes Especiais de Combate (Desbloqueáveis)

O avanço da Consciência Coletiva faz nascer unidades móveis que interagem diretamente com o inimigo.

### 🧯 O Brigadista Comunitário (A Força Coletiva)
* **Estado Inicial:** Começa o jogo apenas como uma única e fragilizada **Brigada Voluntária** restrita à Floresta, com poucos equipamentos e cansando rápido.
* **Evolução (Aos 20% de Consciência):** Com a integração inicial entre Cidade (equipamentos) e Campo (alimentação), ela evolui para **Brigada Comunitária**.
* **Atributos:** A Voluntária tem velocidade 98 e força de extinção 22. A Comunitária tem velocidade 200 e força 36. Com energia abaixo de 25, a Voluntária anda 42% mais devagar. Com energia até 18, a força cai para 45%. A energia só volta ao máximo na base. Causa 12 de dano por segundo ao Burguês.
* **Impacto no Jogo:** Multiplica-se. O jogador pode formar brigadistas tocando na **Base dos Brigadistas** (Floresta, noroeste), que abre um aviso com o botão "Formar brigadista". Essa formação não depende de Consciência Coletiva. Cada base forma um novo brigadista a cada 2 minutos, e ele nasce junto à própria base. Durante o Ajuste Fiscal, o brigadista formado é um **Brigadista Voluntário** (restrito aos focos da Floresta) e a base tem no máximo 3 brigadistas; após o Ajuste Fiscal, o brigadista formado é comunitário e o limite volta a 6. Os esquadrões se espalham pelos três setores (Cidade, Campo e Floresta), formando uma rede coordenada de apagamento rápido de incêndios.

### 🚒 O Bombeiro (Caminhão e Combate Pesado)
* **Formação:** Pela Base dos Bombeiros, na borda noroeste da Cidade, com o botão "Formar bombeiro". Cada base forma um novo bombeiro a cada 2 minutos, com seu caminhão.
* **Limite:** 4 bombeiros. Durante o Ajuste Fiscal, a base forma no máximo 1.
* **Impacto no Jogo:** Combate focos com força 26 e perde 2 de energia por segundo fora da base. O caminhão não entra na Floresta: lá o bombeiro segue a pé, mais devagar. Causa 12 de dano por segundo ao Burguês.

### 🎯 O Guarda Florestal Comunitário Armado (A Autodefesa)
* **Desbloqueio:** Aos 50% de Consciência (após derrubar o Ajuste Fiscal). O primeiro guarda surge automaticamente. Os demais são recrutados pelo botão 🎯 GUARDA, com recarga de 14 s e no máximo 3 guardas.
* **Impacto no Jogo:** Unidade de elite na Floresta. Move-se sem lentidão pela fumaça densa, revela áreas escondidas e captura Incendiários instantaneamente através de emboscadas (a até 48 px), impedindo que o fogo sequer comece. Sem incendiários à vista, patrulha o anel da Floresta. Perde energia ao perseguir e recupera fora da perseguição. Causa 22 de dano por segundo ao Burguês, a até 72 px.

### 🌾 Os Trabalhadores da Zona Rural (Apoio Lento)
* **Presença:** Dois trabalhadores rurais (variantes A e B) já aparecem no início da partida, no Campo.
* **Impacto no Jogo:** Apagam o fogo como o Brigadista, porém com muito mais lentidão e menos força de extinção. Vão até o foco ativo mais próximo em qualquer setor e voltam ao ponto de descanso quando não há incêndio.
* **Quantidade:** Escala com o fogo, na proporção de 1 trabalhador para cada 3 focos ativos, com mínimo de 2 e máximo de 10. Ao diminuir o fogo, só são removidos os trabalhadores ociosos, sem interromper quem está apagando.
* **Primeira doação:** Após a primeira doação de uma casa às brigadas, a câmera foca no trabalhador mais próximo de um foco ativo, com um balão dizendo que os trabalhadores combatem o fogo sem equipamentos e sem treinamento, correndo risco de vida. Aparece uma única vez por partida. Tocar no balão abre um aviso de que o poder público tem equipamentos para distribuir às comunidades rurais, com o botão "Ir para a prefeitura", que foca a câmera na prefeitura. A prefeitura fica destacada e clicável: ao tocar, um aviso informa que ela possui necessidades legais para atuar dentro da ordem, responderá ao pedido dos trabalhadores rurais em até 15 dias, e que o governo federal pode ajudar.

## 4. Os Inimigos e a Dinâmica de Destruição

1. **Os Incendiários (Agentes do Caos):** Surgem na borda externa da Floresta e se infiltram nos setores: 72% vão para a Floresta, 18% para o Campo e 12% para a Cidade. Ateiam fogo após cerca de 1,5 s e tentam fugir pela borda. Um Guarda que alcança um incendiário o captura, e a captura pode ser usada na ação Captura ➔ Cidade. Eles surgem mais rápido a cada fase, até 62% do intervalo base.
2. **O Fogo (A Ameaça Crescente):** Cresce em progressão geométrica. Drena a saúde da Floresta com peso total no próprio setor, 65% no Campo e 35% na Cidade. Não destrói diretamente o Campo.
3. **A Fumaça (O Efeito Tóxico):** Gerada pelo fogo. Evolui de uma névoa cinza clara para um preto denso absoluto. Desacelera as unidades (×0,75 no nível 2 e ×0,55 no nível 3; o Guarda é imune) e dobra o tempo de recarga (*cooldown*) das ações de um setor com fumaça de nível 2 ou mais.
4. **O Burguês (O Chefão Final):** Financiador oculto. Só aparece quando a Consciência Coletiva atinge 100%. A cada 5,2 s gera um incendiário na Floresta e outro no Campo. Recebe dano das ações integradas (26 ou 42 por ação) e das unidades: Brigadista e Bombeiro 12 por segundo; Guarda 22 por segundo, a até 72 px. Sua vida depende da dificuldade (220, 300 ou 380). Vencê-lo dá a vitória.

### 🔥 Dinâmica do Fogo
* **Crescimento:** Cada foco ativo ganha intensidade (0 a 100) em progressão geométrica, mais rápido quanto mais intenso. O ritmo depende da dificuldade e cai pela metade na Floresta com Terras Indígenas demarcadas.
* **Propagação:** Com intensidade a partir de 74%, um foco tenta criar um novo foco a 55–92 px, em qualquer direção, com chance de 42% a cada 3,8 s (22% na Floresta demarcada). O novo foco nasce com intensidade 22%. Não há propagação para terreno já queimado, para fora do mapa, nem para dentro de aceiros ou do escudo d'água.
* **Ignição de árvores e matos:** Uma árvore saudável ou mato a até 192 px de um foco pode pegar fogo, com chance proporcional à intensidade do foco. Ao pegar fogo, a árvore também gera um novo foco. Uma árvore queima por 8 s e depois vira solo carbonizado, que continua bloqueando a passagem. Um mato queima e some, sem bloquear a passagem.
* **Apagamento:** Um foco se apaga pela ação dos brigadistas, bombeiros e trabalhadores rurais, ou quando fica **cercado**, isto é, sem terreno livre na faixa de 55–92 px onde poderia propagar. Um foco cercado para de crescer e se extingue em poucos segundos. Um foco não cercado não perde intensidade sozinho e continua queimando, e se espalhando, até ser apagado. A barreira de exaustão da Cidade (ação local) reduz a intensidade dos focos, mas não os apaga.

## 5. O Coração Estratégico: As Ações Integradas

Para evoluir a barra de **Consciência Coletiva (0% a 100%)**, o jogador precisa cruzar recursos de um setor para o outro. Cada ação tem recarga de 7,5 s, que dobra com fumaça de nível 2 ou mais no setor de origem e sobe 65% para ações da Cidade durante o Ajuste Fiscal:
* **Cidade ➔ Floresta:** Envio de equipamentos (Gera +5% de Consciência). Dá +35% de velocidade a brigadistas e guardas por 15 s e causa 26 de dano ao Burguês.
* **Campo ➔ Cidade:** Envio de alimentos (Gera +5% de Consciência). Reduz em 2,5 s a recarga da ação Cidade ➔ Floresta e causa 26 de dano ao Burguês.
* **Floresta ➔ Campo:** Proteção das nascentes (Gera +5% de Consciência). Ativa por 14 s um escudo d'água que impede a criação de focos no Campo e reduz para 45% a velocidade de crescimento deles. Causa 26 de dano ao Burguês.
* **Captura ➔ Cidade:** Expor os incendiários capturados (Gera +10% de Consciência imediata). Causa 42 de dano ao Burguês e só pode ser usada quando há incendiário capturado na fila.

*Representação visual da doação:* ao enviar uma doação de casa, um **carro popular** (em uma das cores vermelho, amarelo, preto ou prata, sorteada) sai da casa, leva a doação até o brigadista mais próximo e volta para a mesma casa. É apenas uma animação; o efeito (Consciência e energia) é imediato.

### Ações Locais
Cada setor tem uma ação própria, que não gera Consciência:
* **Cidade ➔ Barreira de Exaustão (9 s):** Reduz para 65% (mínimo 10) a intensidade dos focos da Cidade e do Campo, e de qualquer foco com fumaça de nível 2 ou mais. Não apaga focos.
* **Campo ➔ Anel de Aceiro (9,5 s):** Cria por 16 s um anel de aceiro na divisa entre Campo e Floresta, que impede a criação de focos ali.
* **Floresta ➔ Chamado aos Encantados (3 min):** Ao tocar em uma aldeia, invoca um Curupira ou uma Mãe da Mata nela.

### Doações de Casas
* Cada casa da Cidade pode doar às brigadas: +0,5% de Consciência e +25% de energia para os brigadistas.
* Cada casa tem recarga de 2 minutos.
* A doação fica indisponível se todos os brigadistas já estiverem com energia cheia.

## 6. Faseamento Político e Progressão

O jogo evolui conforme a Consciência Coletiva aumenta, marcando a conquista de pautas históricas:

**Fase 1: Resistência Sufocada (0% - 19%)**
* O jogo inicia com o **Ajuste Fiscal** ativo. 
* O jogador conta apenas com **uma Brigada Voluntária** na Floresta, isolada e com poucos recursos. A Cidade está travada por falta de verbas públicas. As ações da Cidade têm recarga 65% maior.

**Fase 2: A Semente da Organização (20% - 34%)**
* **Marco Atingido:** Formação das Brigadas Comunitárias.
* *Efeito prático:* A unidade isolada da floresta evolui. O jogador agora pode criar múltiplos Brigadistas Comunitários e alocá-los tanto no Campo quanto na Cidade para proteger áreas essenciais. Ao chegar a 20%, se houver menos de 2 brigadistas, um novo é criado no centro da Cidade.

**Fase 3: Vitória Urbana (35% - 49%)**
* **Marco Atingido:** Derrubada do Ajuste Fiscal.
* *Efeito prático:* Liberação de verbas. O *cooldown* das ações da Cidade normaliza, viabilizando o suporte massivo aos brigadistas e guardiões.

**Fase 4: Autodefesa Armada (50% - 64%)**
* **Marco Atingido:** Surgimento do Guarda Florestal Comunitário Armado.
* *Efeito prático:* O primeiro guarda surge automaticamente, e outros podem ser recrutados. Os guardas capturam incendiários rapidamente.

**Fase 5: O Escudo Territorial (65% - 99%)**
* **Marco Atingido:** Demarcação das Terras Indígenas.
* *Efeito prático:* A mata ganha uma barreira jurídica/ecológica. Dentro da Floresta demarcada, o fogo cresce à metade do ritmo normal e tem chance de propagação menor (22% em vez de 42%).

**Fase 6: O Confronto Final (100%)**
* **Marco Atingido:** União Total. O Burguês se revela.
* Batalha final utilizando todas as forças integradas contra a origem da destruição.

## 7. Dificuldades

| Dificuldade | Crescimento do fogo | Intervalo de incendiários | Consciência (ação / captura) | Vida do Burguês |
| --- | --- | --- | --- | --- |
| Fácil | ×0,78 | 8,5 s | +8% / +15% | 220 |
| Normal (padrão do GDD) | ×1,0 | 6,8 s | +5% / +10% | 300 |
| Difícil | ×1,25 | 5,2 s | +3% / +6% | 380 |