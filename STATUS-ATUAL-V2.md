# Idea Hero V2 — estado atual e lacunas do plano

_Auditoria do repositório em 19 de julho de 2026._

Este documento compara `PLANO-IDEA-HERO-V2.md` com a implementação presente em
`ideahero-9-w-7-zp/`. Ele descreve o código existente; não substitui playtests ou
uma validação multiusuário em ambiente publicado.

## Resumo

A V2 já é uma fundação funcional de jogo colaborativo: React/Vite no cliente e
SpacetimeDB como autoridade persistente. O fluxo cria e entra em salas, mantém
identidade, presença e reconexão, percorre as oito etapas, salva uma contribuição
por pessoa em cada uma e gera uma jornada final exportável.

As quatro primeiras etapas (`SCENARIO` a `SOLUTION`) possuem o fluxo colaborativo
mais completo: contribuir, votar anonimamente e revelar uma decisão persistida.
As quatro últimas ainda usam o mesmo campo textual e avanço direto. Portanto, o
ciclo está completo, mas a experiência específica prevista para protótipo, piloto,
marketing e vendas ainda não foi implementada.

## O que existe agora

| Área do plano | Estado atual | Evidência principal |
| --- | --- | --- |
| Ciclo canônico de oito etapas | Implementado | Cliente e servidor usam a mesma sequência de oito estados. |
| Identidade, perfil e reconexão | Implementado em base anônima | O token é salvo no `localStorage`; `onConnect`/`onDisconnect` atualizam perfil e jogador. |
| Sala, convite e lobby | Implementado | Criação/entrada por código ou URL, presença, pronto e início pelo anfitrião. |
| Persistência autoritativa | Implementado para o fluxo atual | Tabelas e reducers SpacetimeDB para sala, jogador, contribuição, voto, decisão, carta e jornada. |
| Cartas e sorteio | Parcial | Há 16 cartas WebP (duas por etapa), texto alternativo e escolha determinística derivada do código da sala. |
| `SCENARIO → SOLUTION` | Implementado | `CONTRIBUTING → VOTING → REVIEW`, voto atualizável, quórum online e desempate determinístico. |
| `PROTOTYPE → SALES` | Parcial | Cada etapa recebe uma carta, orientação e uma contribuição textual; não há regras, dados ou UI próprios. |
| Memória e artefato final | Implementado, com escopo básico | Jornada persistida, manifesto editável pelo anfitrião, compartilhamento, Markdown e impressão. |
| Qualidade automatizada | Básica | 11 testes de unidade; build de produção passa. |

## Comparação com o plano: o que falta

### P0 — resolver antes de considerar o produto pronto

1. **Isolamento e privacidade por sala.** Todas as tabelas do módulo estão
   declaradas como públicas e o cliente usa `useTable` para todas elas, sem
   consulta restrita à sala. Isso contradiz o plano de subscriptions restritas,
   RLS/views e contribuições secretas. Uma pessoa conectada pode receber dados de
   outras salas, inclusive votos e contribuições antes da revelação.

2. **Especializar as quatro últimas etapas.** Hoje `PROTOTYPE`, `PILOT`,
   `MARKETING` e `SALES` compartilham apenas o formulário genérico de uma frase.
   Ainda faltam storyboard, hipótese, recursos e timer; condição/resultado/
   aprendizado/revisão do piloto; público/mensagem/canais/investimentos do
   marketing; e simulação explicável de impacto ou resultado em vendas.

3. **Validação de confiabilidade multiusuário.** Não há testes de reducers,
   integração com um módulo local, E2E com múltiplos navegadores, refresh,
   desconexão, reconexão, concorrência ou ações repetidas. Os testes atuais não
   comprovam as regras autoritativas do servidor.

4. **Acessibilidade e responsividade verificadas.** Há bons elementos iniciais
   (labels, texto alternativo, `aria-live`, HTML semântico), mas ainda não há
   auditoria de teclado, contraste, redução de movimento, alvos de toque ou
   validação visual em 320 px/tablet/desktop.

### P1 — lacunas relevantes de arquitetura e produto

1. **Seed e replay auditável.** O sorteio é determinístico, porém a sala não
   armazena seed, versão do baralho ou ordem do sorteio. Também não existem
   `game_event` nem dados suficientes para reconstruir/auditar uma partida como
   planejado.

2. **Modelo de dados de domínio.** Faltam as tabelas/contratos próprios de
   `prototype`, `pilot_result`, `marketing_plan`, `timer`, `game_event`, `asset`
   e `ai_job`. A jornada final apenas reúne contribuições genéricas e decisões.

3. **Conteúdo e entrega de imagens.** O catálogo inicial contém 16 assets locais,
   não as 372 imagens inventariadas. Não há CDN/object storage, thumbnails,
   catálogo versionado com tags/intensidade, preload nem curadoria.

4. **Ambientes e operação.** Não há CI, staging, telemetria/funil, teste de carga,
   estratégia de backup/migração/rollback ou métricas de playtest no repositório.

5. **Facilitador e espera ativa.** O anfitrião controla transições, mas não há
   ferramentas de facilitador. Fora da votação, o participante que já enviou sua
   frase espera; não há reações, associações paralelas adicionais ou atividades
   específicas para reduzir essa espera.

### Regras e arestas ainda incompletas no código

- O produto declara partidas de **2 a 6** pessoas, mas `start_game` aceita uma
  sala com somente um jogador; apenas o limite máximo de seis é aplicado em
  `join_room`.
- Uma identidade pode entrar em mais de uma sala de lobby. O cliente escolhe a
  associação mais recente, o que pode ocultar outra sala e não corresponde a um
  modelo explícito de retomada/abandono.
- A noção de presença é binária. Uma desconexão tira a pessoa do quórum
  imediatamente, sem janela de reconexão, abandono explícito ou regra de troca
  de anfitrião.
- Não há expiração de sala, reset de jogo, remoção de participante pelo anfitrião,
  papel de jogador ativo, investimento/saldo ou mecanismos de economia
  transparentes previstos no plano.
- A autoria fica visível durante `CONTRIBUTING`; o anonimato só se aplica ao
  momento de voto. Isso pode ser uma decisão válida de UX, mas é diferente da
  proposta de leitura inicial sem autoria para problemas.
- O documento final preserva texto, cartas, decisões e votos, mas não consegue
  registrar os campos estruturados que o plano pede para protótipo, piloto,
  marketing e a explicação do resultado de vendas — porque eles ainda não existem
  no domínio.

## Verificações executadas

- `npm test -- --run`: **5 arquivos / 14 testes aprovados**.
- `npm run build`: **aprovado** (`tsc -b` e build Vite).
- `npm run lint`: **aprovado** (ESLint e Prettier).

## Próxima sequência recomendada

1. Restringir subscriptions e acesso às linhas por sala antes de ampliar o fluxo.
2. Cobrir reducers com testes e criar E2E de duas a seis pessoas, incluindo
   refresh/reconexão e concorrência.
3. Modelar e implementar `PROTOTYPE` e `PILOT` primeiro; validar em playtests.
4. Implementar `MARKETING` e `SALES` com resultados explicáveis e então enriquecer
   o artefato final.
5. Fazer a auditoria de responsividade/acessibilidade e, após validar o núcleo,
   migrar e catalogar o conjunto completo de cartas.
