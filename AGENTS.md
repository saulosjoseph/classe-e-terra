# AGENTS.md

Instruções para agentes de IA que trabalham neste repositório.

## Visão geral do projeto

**Classe e Terra – A União do Tapajós** é um jogo de defesa de território em tempo real (RTS/defesa) feito com **Phaser 3/4** e **TypeScript**, com foco em navegadores mobile (orientação paisagem, tela cheia).
O design completo (mecânicas, fases políticas, classes e setores) está em [classe-e-terra.md](./classe-e-terra.md) e deve ser consultado antes de mudanças de gameplay.

Idioma: a documentação do jogo, comentários e mensagens de UI estão em **português (pt-BR)**. Mantenha esse idioma em novos comentários e textos.

## Stack e comandos

Gerenciador de pacotes: **pnpm** (há `pnpm-lock.yaml` e `pnpm-workspace.yaml`). Também existe um `package-lock.json`; prefira pnpm para não divergir do lockfile principal.

| Ação | Comando |
| --- | --- |
| Instalar dependências | `pnpm install` |
| Servidor de desenvolvimento (porta 5173, `host: true`) | `pnpm dev` |
| Checagem de tipos + build de produção | `pnpm build` (roda `tsc --noEmit && vite build`) |
| Preview do build | `pnpm preview` |
| Gerar sprite/asset | `node scripts/<nome>.js [caminho/da/referencia.jpg]` |

- Não há suíte de testes nem linter configurados. Para validar uma mudança, rode `pnpm build` (checagem de tipos do `tsconfig.json` em `strict`) e teste no navegador com `pnpm dev`.
- O TypeScript está em modo `strict`. Não contorne erros com `any` ou `@ts-ignore` sem necessidade.
- `allowImportingTsExtensions` está habilitado, mas os imports existentes usam caminhos sem extensão (ex.: `'./config/GameBalance'`). Siga o padrão existente.

## Estrutura do código

```
src/
  main.ts          Bootstrap do Phaser (config, fontes, cenas, fullscreen)
  config/          Constantes e balanceamento (GameBalance.ts, casas.ts)
  types/           Tipos compartilhados (GameTypes.ts)
  scenes/          Cenas do Phaser (Boot, Menu, Game, UI, GameOver)
  entities/        Unidades e entidades (Brigadista, Bombeiro, Incendiario, TrabalhadorRural, CarroPopular, ...)
  systems/         Sistemas de jogo (FireSmokeSystem, SpawnerSystem, SectorSystem, PoliticalPhaseSystem, GameClock, ...)
  audio/           SoundManager
  assets/          PixelArtGenerator
  ui/              Componentes de interface (OptionsMenu, SpeechBubble)
public/assets/     Sprites PNG usados pelo jogo (gerados ou ajustados pelos scripts)
scripts/           Scripts Node (ESM) que geram sprites a partir de imagens de referência
scripts/lib/       Utilitários dos scripts (cor.js)
classe-e-terra.md  Documento de design do jogo (GDD)
```

Arquivos de imagem de referência (`*.jpg`) ficam na raiz do repositório e servem de entrada para os scripts de `scripts/`.

## Convenções de código

- **Balanceamento em um lugar só:** valores numéricos de jogo (tempos, raios, limites, escalas) ficam em `src/config/GameBalance.ts`, não espalhados pelos sistemas. Ao adicionar um valor de balanceamento, exporte-o dali.
- **Constantes nomeadas:** use `UPPER_SNAKE_CASE` com um comentário curto em português explicando a unidade ou o papel, como em `src/systems/FireSmokeSystem.ts`.
- **Tempo:** a passagem de tempo do jogo passa pelo `GameClock` (`src/systems/GameClock.ts`, acessado via `getGameClock()`). Não use `Date.now()` ou `setTimeout` para lógica de jogo, pois isso quebra a pausa e o controle de velocidade.
- **Sistemas separados das cenas:** a lógica de simulação vive em `systems/` e `entities/`; `scenes/` orquestra e desenha. Evite colocar regras de gameplay dentro de cenas.
- **Áudio:** use o singleton `SoundManager` (`src/audio/SoundManager.ts`) e chame `SoundManager.unlock()` antes de sons disparados por toque, como fazem `GameScene` e `UIScene`. Não instancie `Audio` diretamente.
- **Pixel art:** os sprites são PNG gerados ou ajustados pelos scripts. Ao mudar um sprite, altere o script correspondente em `scripts/` (ou gere novamente) em vez de editar o PNG à mão, para manter a reprodutibilidade.
- **Mobile-first:** toda interação deve funcionar por toque (`input.activePointers: 2` está configurado). Não dependa de teclado ou hover como único meio de ação.
- **Comentários:** comente apenas trechos que precisem de esclarecimento (regras não óbvias, unidades, decisões de performance). Não comente o óbvio.

## Scripts de geração de assets

- Os scripts são ESM (`"type": "module"` no `package.json`) e dependem de `sharp` (devDependency).
- Rodar a partir da raiz do repositório, pois os caminhos de saída são relativos (ex.: `public/assets/aldeia.png`).
- Os scripts ajustam cor de fundo por tolerância e flood fill a partir das bordas; ao alterar um script, confira visualmente o PNG resultante em `public/assets/`.
- Arquivos `.png` gerados por script devem ser commitados junto com o script que os produziu.

## Git e entregas

- Mensagens de commit seguem **Conventional Commits** em inglês com descrição curta, como no histórico atual: `feat: ...`, `refactor: ...`. Use o mesmo padrão.
- Não commite `node_modules/`, `dist/` ou arquivos `.env` (já cobertos pelo `.gitignore`).
- Antes de concluir uma tarefa, rode `pnpm build` e confirme que não há erros de tipo.
- Ao alterar mecânicas de jogo, atualize `classe-e-terra.md` se o comportamento documentado mudar. Mantenha o conteúdo do GDD consistente com o código.

## Cuidados

- Não altere `vite.config.ts` (`base: './'` e `assetsInlineLimit: 0`) sem motivo; ambos afetam o caminho dos assets no build publicado.
- Não remova os `@fontsource/roboto` nem a configuração de texto HiDPI em `src/main.ts` sem alinhar: eles definem a aparência de todos os textos do jogo.
- Não adicione dependências de runtime sem necessidade; o jogo é leve e roda em navegadores mobile.
