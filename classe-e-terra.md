# Documento de Design de Jogo (GDD): Classe e terra - A União do Tapajós

## 1. Visão Geral

* **Gênero:** Ação, Defesa de Território em Tempo Real (Real-Time Strategy/Defense).
* **Temática:** Luta de classes, crise ambiental, resistência comunitária e direitos socioambientais em Santarém e no Baixo Tapajós.
* **Estilo Visual:** Pixel art. Paleta de cores em forte contraste: a fumaça tóxica, que evolui de um **cinza claro até um preto denso e absoluto**, avançando sobre as cores vivas da resistência (verde da mata, azul dos rios, tons quentes da cidade viva). Não haverá tons de laranja ou vermelho na fumaça.
* **Objetivo Principal:** Sobreviver ao avanço da fumaça e do fogo, construir a unidade entre três classes sociais distintas e derrotar a raiz do problema: o Burguês financiador da destruição.
* **Condição de Derrota:** A saúde da Floresta chegar a 0% (totalmente consumida pelo fogo e pela fumaça negra).
* **Condição de Vitória:** Atingir 100% de Consciência Coletiva, sobreviver à investida final e derrotar o Burguês.

## 2. O Mapa e as Classes Bases

A tela apresenta uma visão isométrica ou superior de Santarém, dividida em três zonas interconectadas por estradas, rios e trilhas. Cada setor possui funções vitais e classes nativas:

### 🏙️ A Cidade (Trabalhadores Urbanos)
* **Contexto:** Sofre com sufocamento, calor extremo e o peso do Ajuste Fiscal.
* **Função:** Logística, conscientização, equipamentos e pressão política.
* **Ações:** Mobilização popular, denúncias e barreiras de exaustão contra a fumaça.

### 🌾 O Campo (Agricultura Familiar e Ribeirinhos)
* **Contexto:** Sofre com perda de safra, rios secando e fogo avançando.
* **Função:** Sustentabilidade, recursos alimentares e contenção de avanço.
* **Ações:** Construção de aceiros, mutirão de alimentos e proteção de nascentes.

### 🌳 A Floresta (Guardiões da Mata)
* **Contexto:** Sofre invasões, mortandade de animais e perda de saberes.
* **Função:** Combate direto na linha de frente, regeneração e ancestralidade.
* **Ações:** Plantio de sementes, reflorestamento ativo e Chamado aos Encantados.

## 3. As Classes Especiais de Combate (Desbloqueáveis)

O avanço da Consciência Coletiva faz nascer unidades móveis que interagem diretamente com o inimigo.

### 🧯 O Brigadista Comunitário (A Força Coletiva)
* **Estado Inicial:** Começa o jogo apenas como uma única e fragilizada **Brigada Voluntária** restrita à Floresta, com poucos equipamentos e cansando rápido.
* **Evolução (Aos 20% de Consciência):** Com a integração inicial entre Cidade (equipamentos) e Campo (alimentação), ela evolui para **Brigada Comunitária**.
* **Impacto no Jogo:** Multiplica-se. O jogador pode formar brigadistas tocando na **Base dos Brigadistas** (Floresta, noroeste), que abre um aviso com o botão "Formar brigadista". Essa formação não depende de Consciência Coletiva. Cada base forma um novo brigadista a cada 2 minutos, e ele nasce junto à própria base. Durante o Ajuste Fiscal, o brigadista formado é um **Brigadista Voluntário** (restrito aos focos da Floresta) e a base tem no máximo 3 brigadistas; após o Ajuste Fiscal, o brigadista formado é comunitário e o limite volta a 6. Os esquadrões se espalham pelos três setores (Cidade, Campo e Floresta), formando uma rede coordenada de apagamento rápido de incêndios.

### 🎯 O Guarda Florestal Comunitário Armado (A Autodefesa)
* **Desbloqueio:** Aos 50% de Consciência (após derrubar o Ajuste Fiscal).
* **Impacto no Jogo:** Unidade de elite na Floresta. Move-se sem lentidão pela fumaça densa, revela áreas escondidas e captura Incendiários instantaneamente através de emboscadas, impedindo que o fogo sequer comece.

### 🌾 Os Trabalhadores da Zona Rural (Apoio Lento)
* **Presença:** Dois trabalhadores rurais (variantes A e B) já aparecem no início da partida, no Campo.
* **Impacto no Jogo:** Apagam o fogo como o Brigadista, porém com muito mais lentidão e menos força de extinção. Vão até o foco ativo mais próximo em qualquer setor e voltam ao ponto de descanso quando não há incêndio.
* **Quantidade:** Escala com o fogo, na proporção de 1 trabalhador para cada 3 focos ativos, com mínimo de 2. Ao diminuir o fogo, só são removidos os trabalhadores ociosos, sem interromper quem está apagando.
* **Primeira doação:** Após a primeira doação de uma casa às brigadas, a câmera foca no trabalhador mais próximo de um foco ativo, com um balão dizendo que os trabalhadores combatem o fogo sem equipamentos e sem treinamento, correndo risco de vida. Aparece uma única vez por partida. Tocar no balão abre um aviso de que o poder público tem equipamentos para distribuir às comunidades rurais, com o botão "Ir para a prefeitura", que foca a câmera na prefeitura. A prefeitura fica destacada e clicável: ao tocar, um aviso informa que ela possui necessidades legais para atuar dentro da ordem, responderá ao pedido dos trabalhadores rurais em até 15 dias, e que o governo federal pode ajudar.

## 4. Os Inimigos e a Dinâmica de Destruição

1. **Os Incendiários (Agentes do Caos):** Surgem nas bordas e pontos cegos da mata, ateiam fogo e tentam fugir.
2. **O Fogo (A Ameaça Crescente):** Cresce em progressão geométrica. Drena a saúde da Floresta e destrói o Campo.
3. **A Fumaça (O Efeito Tóxico):** Gerada pelo fogo. Evolui de uma névoa cinza clara para um preto denso absoluto. Intoxica trabalhadores e dobra o tempo de recarga (*cooldown*) das habilidades.
4. **O Burguês (O Chefão Final):** Financiador oculto. Só aparece quando a Consciência Coletiva atinge 100%.

## 5. O Coração Estratégico: As Ações Integradas

Para evoluir a barra de **Consciência Coletiva (0% a 100%)**, o jogador precisa cruzar recursos de um setor para o outro:
* **Cidade ➔ Floresta:** Envio de equipamentos (Gera +5% de Consciência).
* **Campo ➔ Cidade:** Envio de alimentos para zerar o estresse urbano (Gera +5% de Consciência).
* **Floresta ➔ Campo:** Proteção das nascentes (Gera +5% de Consciência).
* **Captura ➔ Cidade:** Expor os incendiários capturados (Gera +10% de Consciência imediata).

*Representação visual da doação:* ao enviar uma doação de casa, um **carro popular** (em uma das cores vermelho, amarelo, preto ou prata, sorteada) sai da casa, leva a doação até o brigadista mais próximo e volta para a mesma casa. É apenas uma animação; o efeito (Consciência e energia) é imediato.

## 6. Faseamento Político e Progressão

O jogo evolui conforme a Consciência Coletiva aumenta, marcando a conquista de pautas históricas:

**Fase 1: Resistência Sufocada (0% - 19%)**
* O jogo inicia com o **Ajuste Fiscal** ativo. 
* O jogador conta apenas com **uma Brigada Voluntária** na Floresta, isolada e com poucos recursos. A Cidade está travada por falta de verbas públicas.

**Fase 2: A Semente da Organização (20% - 34%)**
* **Marco Atingido:** Formação das Brigadas Comunitárias.
* *Efeito prático:* A unidade isolada da floresta evolui. O jogador agora pode criar múltiplos Brigadistas Comunitários e alocá-los tanto no Campo quanto na Cidade para proteger áreas essenciais.

**Fase 3: Vitória Urbana (35% - 49%)**
* **Marco Atingido:** Derrubada do Ajuste Fiscal.
* *Efeito prático:* Liberação de verbas. O *cooldown* das ações da Cidade normaliza, viabilizando o suporte massivo aos brigadistas e guardiões.

**Fase 4: Autodefesa Armada (50% - 64%)**
* **Marco Atingido:** Surgimento do Guarda Florestal Comunitário Armado.
* *Efeito prático:* Bloqueio ostensivo de novos focos na mata; captura rápida de grileiros.

**Fase 5: O Escudo Territorial (65% - 99%)**
* **Marco Atingido:** Demarcação das Terras Indígenas.
* *Efeito prático:* A mata ganha uma barreira jurídica/ecológica. O fogo se alastra 50% mais devagar nessas áreas protegidas.

**Fase 6: O Confronto Final (100%)**
* **Marco Atingido:** União Total. O Burguês se revela.
* Batalha final utilizando todas as forças integradas contra a origem da destruição.