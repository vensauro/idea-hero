# Idea Hero V2 — Avaliação e plano de evolução

## Decisão central de produto

O ciclo atual é parte essencial da identidade do Idea Hero e deve ser preservado, nesta ordem:

```ts
export type BoardState =
  | "SCENARIO"
  | "PROBLEM"
  | "INSIGHT"
  | "SOLUTION"
  | "PROTOTYPE"
  | "PILOT"
  | "MARKETING"
  | "SALES";
```

A refatoração não deve substituir esse ciclo. Ela deve tornar cada etapa mais clara, criativa, colaborativa, persistente e prazerosa. Ideias adicionais, como missão, combinação de propostas, teste de realidade e artefato final, devem ser incorporadas **dentro** das oito etapas existentes, sem criar um novo tabuleiro ou quebrar a progressão original.

## Visão do produto

Idea Hero é uma aventura colaborativa de criação. Imagens geradas por IA, usadas como cartas abertas à interpretação, ajudam um grupo a imaginar um cenário, reconhecer um problema, descobrir oportunidades, criar uma solução e conduzi-la até uma simulação de lançamento e vendas.

O objetivo não é premiar a resposta “correta”. O jogo deve:

- Desbloquear associações inesperadas.
- Fazer todas as pessoas contribuírem.
- Transformar conversa em uma ideia registrada.
- Mostrar como a ideia evoluiu ao longo da partida.
- Terminar com um projeto compreensível e compartilhável.

Hipóteses iniciais a validar em playtests:

- 2 a 6 jogadores.
- Um dispositivo por pessoa.
- Experiência mobile-first.
- Partidas de 30 a 45 minutos.
- Modo colaborativo como experiência principal do primeiro lançamento.
- Facilitador opcional.
- Cartas de IA pré-geradas e curadas; geração durante a partida fica para uma etapa posterior.

## Avaliação do MVP atual

### O que deve ser aproveitado

- O ciclo de oito etapas do tabuleiro.
- A identidade visual lúdica e artesanal.
- O conceito de cartas visuais abertas à interpretação, inspirado em Dixit.
- As 372 imagens já produzidas.
- Avatares, compartilhamento por código e presença dos jogadores.
- A distinção entre momentos individuais e decisões coletivas.
- A linguagem de aventura empreendedora: protótipo, piloto, marketing e vendas.
- React, Vite, Tailwind e os componentes de UI como ponto de partida do cliente.

### Problemas de produto e UX

#### A criação acontece fora do sistema

Nas etapas de cenário, problema, insight e solução, os participantes conversam sobre as cartas, mas o produto não registra suas interpretações. O resultado criativo se perde. O campo de texto exibido no encerramento também não é persistido.

O V2 deve capturar contribuições pequenas durante toda a jornada: frases, escolhas, justificativas, hipóteses e revisões. O artefato final deve ser construído progressivamente, e não solicitado do zero no fim.

#### Falta orientação durante a jornada

A interface atual depende de modais de instruções e repete quase a mesma composição em todas as etapas. Faltam:

- Progresso sempre visível.
- Objetivo atual em uma frase.
- Ação primária inequívoca.
- Indicação do jogador ativo.
- Explicação do que acontecerá a seguir.
- Resumo do que já foi construído.
- Atividade significativa para quem está esperando.
- Confirmação de que uma contribuição foi registrada.

#### Espera passiva

Boa parte da partida deixa os demais jogadores apenas “esperando”. Enquanto alguém narra ou escolhe, os outros devem poder reagir, registrar uma associação, preparar uma contribuição ou votar quando for apropriado.

#### Aleatoriedade desconectada das decisões

Eventos e resultados financeiros muito aleatórios podem parecer punição ou recompensa sem relação com a criatividade do grupo. A aleatoriedade deve criar restrições, consequências e escolhas interessantes. Sorte pode modular o desafio, mas não deve apagar decisões anteriores.

#### Entrada e reconexão pouco confiáveis

- A criação da sala navega antes da confirmação do servidor.
- Uma sala inexistente pode ser criada silenciosamente durante a tentativa de entrada.
- O navegador guarda uma cópia potencialmente obsoleta da partida.
- Reiniciar o servidor apaga todas as salas.
- Não existe uma recuperação robusta de identidade e lugar na partida.

#### Acessibilidade e responsividade

O V2 precisa prever desde o início:

- Contraste e tipografia legível.
- Estados que não dependam apenas de cor.
- Navegação por teclado.
- Redução de movimento.
- Texto alternativo contextual para cartas.
- Alvos de toque adequados.
- Layout entre 320 px e desktop sem cortes ou sobreposição.

### Problemas técnicos

- O backend mantém todas as partidas em um `Map` em memória.
- A lógica de tempo real está concentrada em um arquivo de aproximadamente 1.181 linhas.
- A máquina de estados é uma lista mutável de ações, alterada durante a execução.
- Há eventos que não verificam corretamente host, jogador ativo ou identidade.
- Valores enviados pelo cliente não são validados de forma abrangente.
- Sorteios não possuem seed reproduzível.
- O estado completo do servidor é duplicado no Zustand e persistido no navegador.
- Não há suíte de testes visível para regras, concorrência, reconexão ou jornada E2E.
- As cartas estão empacotadas como aproximadamente 65 MB de PNGs, sem catálogo de metadados ou CDN.

## O ciclo preservado, com UX aprimorada

### 1. SCENARIO — construir o mundo

**Objetivo:** alinhar o grupo sobre o contexto em que a ideia existirá.

Experiência proposta:

- O jogador ativo revela uma carta.
- Cada pessoa registra uma associação curta: “O que existe neste mundo?”.
- O narrador combina as associações em uma descrição de cenário.
- O grupo confirma uma frase-síntese.

Saída persistida:

- Carta usada.
- Associações individuais.
- Descrição coletiva do cenário.
- Pessoas ou comunidades presentes nesse mundo.

### 2. PROBLEM — encontrar o desafio

**Objetivo:** formular um problema relevante dentro do cenário.

Experiência proposta:

- Cada jogador interpreta uma carta como tensão, necessidade ou obstáculo.
- As propostas ficam visíveis sem identificar o autor durante a primeira leitura, se isso melhorar a liberdade criativa.
- O grupo vota, combina ou reescreve as propostas.
- Investimento pode continuar existindo como mecanismo de priorização, com valores simples, limites claros e justificativa opcional.

Saída persistida:

- Problemas propostos.
- Votos/investimentos.
- Problema escolhido e sua formulação final.
- Público mais afetado.

### 3. INSIGHT — descobrir causas e oportunidades

**Objetivo:** olhar além da primeira explicação do problema.

Experiência proposta:

- Cartas geram perguntas como “O que estamos deixando de perceber?” e “Que recurso inesperado aparece aqui?”.
- Jogadores registram descobertas curtas em paralelo.
- O grupo agrupa insights por causa, comportamento, recurso ou oportunidade.
- Uma rodada extra continua possível, mas com custo e benefício transparentes.

Saída persistida:

- Insights individuais.
- Agrupamentos.
- Insight-chave escolhido para orientar a solução.

### 4. SOLUTION — imaginar e combinar respostas

**Objetivo:** criar alternativas e chegar a uma proposta coletiva.

Experiência proposta:

- Cada pessoa cria uma microideia: título e uma frase.
- A carta é uma provocação, não uma resposta literal.
- A etapa de advocate ajuda outra pessoa a fortalecer sua ideia.
- Seleção e investimento permanecem, mas também permitem combinar partes de propostas diferentes.

Saída persistida:

- Ideias individuais.
- Contribuições do advocate.
- Votos/investimentos.
- Solução escolhida ou combinada.
- Proposta de valor em uma frase.

### 5. PROTOTYPE — tornar a ideia visível

**Objetivo:** representar rapidamente como a solução funciona.

Experiência proposta:

- Timer compartilhado, com início explícito e controle acessível.
- Pequeno storyboard: pessoa, situação, ação, resultado.
- Espaço para texto, foto ou desenho em evolução futura.
- O custo do protótipo é apresentado antes da confirmação.

Saída persistida:

- Storyboard ou roteiro.
- Hipótese principal.
- Recursos necessários.
- Versão do protótipo.

### 6. PILOT — testar e revisar

**Objetivo:** confrontar o protótipo com uma condição de realidade.

Experiência proposta:

- Dado ou carta introduz um desafio de teste.
- O resultado não é apenas “passou/falhou”: ele revela uma condição.
- O grupo decide manter, adaptar ou refazer parte do protótipo.
- Falha gera aprendizado registrado, não apenas repetição e perda de pontos.

Saída persistida:

- Condição do piloto.
- Resultado.
- Aprendizado.
- Revisão realizada.

### 7. MARKETING — explicar valor e alcançar pessoas

**Objetivo:** decidir como a proposta será comunicada e distribuída.

Experiência proposta:

- O grupo define público, mensagem, canal e chamada para ação.
- Jogadores estimam valor percebido depois de ver uma apresentação curta.
- Investimentos e empréstimos continuam possíveis, mas com fórmulas legíveis e consequências previamente exibidas.
- O resultado deve depender principalmente da coerência entre público, mensagem, canal e solução.

Saída persistida:

- Público prioritário.
- Mensagem central.
- Canais escolhidos.
- Investimentos.
- Estimativa de valor percebido.

### 8. SALES — resultado e legado da jornada

**Objetivo:** revelar o resultado da simulação e consolidar o projeto criado.

Experiência proposta:

- Resultado financeiro ou de impacto com explicação dos fatores que o produziram.
- Celebração compatível com sucesso, aprendizado ou oportunidade de revisão.
- Artefato final automaticamente preenchido com toda a jornada.
- Possibilidade de editar, imprimir, exportar e compartilhar.
- Primeiro experimento real sugerido como encerramento opcional.

Saída persistida:

- Resultado da simulação.
- Resumo da ideia.
- Cartas utilizadas.
- Contribuições e decisões.
- Aprendizados do piloto.
- Plano de comunicação.
- Próximo passo.

## Padrão de interface para todas as etapas

Cada tela deve compartilhar uma estrutura previsível:

1. Barra superior com fase, progresso, sala e conexão.
2. Jogador ativo e presença do grupo.
3. Objetivo da etapa em uma frase.
4. Carta ou elemento principal.
5. Área de contribuição/decisão.
6. Resumo cumulativo da jornada, recolhível.
7. Ação primária clara.
8. Texto curto indicando o próximo acontecimento.

Os modais de instrução deixam de abrir obrigatoriamente a cada turno. Regras detalhadas ficam disponíveis sob demanda; dicas curtas aparecem no contexto certo.

## Arquitetura alvo com SpacetimeDB

### Responsabilidades

- **React/Vite:** renderização, interação, formulários e estado efêmero de UI.
- **SpacetimeDB:** verdade da partida, persistência, regras, presença, autorização e sincronização em tempo real.
- **Object storage + CDN:** imagens originais e thumbnails.
- **Worker de IA:** geração e moderação futura de assets, fora do caminho crítico da partida.

O Zustand pode continuar apenas para preferências locais e UI efêmera. Partida, jogador, turno, contribuições e pontuação não devem ser duplicados como verdade persistente no navegador.

### Tabelas propostas

- `room`: código, host, status, fase, rodada, seed, versão do baralho e expiração.
- `player`: identidade, sala, nome, avatar, papel, presença, prontidão e pontos.
- `card`: asset, tema, tags, intensidade, prompt, texto alternativo e versão.
- `card_draw`: sala, etapa, jogador, carta, ordem e seed.
- `contribution`: autoria, etapa, tipo, conteúdo, versão e timestamp.
- `vote`: eleitor, alvo, valor e justificativa.
- `decision`: resultado coletivo de cada etapa.
- `prototype`: storyboard, hipótese, recursos e revisão.
- `pilot_result`: condição, resultado, aprendizado e decisão.
- `marketing_plan`: público, mensagem, canais, investimentos e empréstimo.
- `journey`: resumo final e snapshot compartilhável.
- `game_event`: histórico imutável para auditoria e recuperação.
- `timer`: transições e prazos agendados.
- `ai_job` e `asset`: geração futura e metadados de armazenamento.

### Reducers propostos

- `create_room`
- `join_room`
- `set_player_ready`
- `start_game`
- `draw_card`
- `submit_contribution`
- `revise_contribution`
- `cast_vote`
- `make_investment`
- `resolve_stage`
- `advance_turn`
- `advance_board_state`
- `start_prototype_timer`
- `submit_pilot_result`
- `update_marketing_plan`
- `finish_game`
- `reset_game`
- `leave_room`
- `host_remove_player`

Todos devem validar no servidor:

- Identidade do remetente.
- Participação na sala.
- Permissão de host ou jogador ativo.
- Fase e rodada esperadas.
- Valores mínimos, máximos e saldo disponível.
- Idempotência de ações repetidas.
- Concorrência entre votos e submissões.
- Regras para jogadores desconectados.

### Subscriptions

Cada cliente assina apenas:

- Sua sala atual.
- Jogadores da sala.
- Estado e rodada atuais.
- Contribuições que podem ser vistas naquela fase.
- Decisões já reveladas.
- Cartas sorteadas para aquele contexto.

Evitar assinatura indiscriminada de todas as tabelas. Tabelas privadas, views e RLS devem impedir o acesso a outras salas e a contribuições ainda secretas.

### Identidade e reconexão

- Persistir o token/identidade emitido para conexões anônimas.
- Relacionar jogador à identidade, não a `socketId`, nome ou aba.
- Permitir reconexão e retomada automática.
- Diferenciar presença temporária de abandono.
- Reservar OIDC/contas permanentes para quando houver galeria, histórico entre sessões ou perfil.

### Aleatoriedade determinística

- A sala recebe uma seed no início.
- Sorteios são realizados no servidor.
- Cada retirada fica registrada em `card_draw`.
- Replays e investigações podem reconstruir a sequência.
- O cliente nunca escolhe diretamente a URL ou o índice da carta sorteada.

### Imagens e IA

As 372 imagens devem ser migradas para object storage/CDN e catalogadas. Para cada carta, registrar:

- URL original e thumbnail.
- Dimensões e formato.
- Tema e tags.
- Grau de abstração/intensidade.
- Texto alternativo.
- Origem, modelo e versão, quando disponíveis.
- Status de curadoria/moderação.

Geração em tempo real não deve bloquear uma rodada. Em uma evolução futura:

1. A partida solicita um `ai_job`.
2. Um worker autenticado processa o pedido.
3. A imagem é moderada e enviada ao storage.
4. O metadata é registrado no SpacetimeDB.
5. A sala recebe o asset por subscription.

## Estratégia de migração

Não migrar tela por tela sobre a máquina de estados atual. Construir o V2 ao lado do MVP e substituir por fatias completas.

### O que migra

- Ciclo do tabuleiro e regras desejadas.
- Marca, ilustrações e linguagem visual.
- Cartas, avatares e textos úteis.
- Componentes React/Tailwind que passarem por revisão de acessibilidade.
- Conhecimento incorporado nas regras atuais.

### O que será substituído

- Express + Socket.IO como autoridade da partida.
- `Map` em memória.
- Array mutável de `actions` como máquina de estados.
- Cópia integral da partida no Zustand/localStorage.
- Seleção de tela por grande `switch` acoplado à regra.
- Instruções obrigatórias em modal.
- Fórmulas financeiras opacas.

### Caminho incremental

1. Congelar o comportamento do MVP em documentação e testes de caracterização.
2. Criar o módulo `spacetimedb/` no mesmo repositório.
3. Implementar sala, jogador, presença e ciclo vazio de oito etapas.
4. Criar uma rota/entrada V2 isolada por feature flag.
5. Entregar a fatia vertical `SCENARIO → PROBLEM → INSIGHT → SOLUTION`.
6. Completar `PROTOTYPE → PILOT → MARKETING → SALES`.
7. Migrar assets para CDN.
8. Testar partidas reais e comparar métricas.
9. Tornar o V2 padrão e manter rollback temporário para o MVP.

Como as salas atuais não são persistidas, não há benefício em migrar partidas em andamento. O que precisa ser preservado é conteúdo, regras úteis e identidade do produto.

## Plano de execução

### Fase 0 — Descoberta e baseline — 1 semana

- Fazer o MVP rodar de forma reproduzível.
- Documentar o ciclo e as regras atuais.
- Realizar de 5 a 8 sessões observadas.
- Definir público primário, duração e papel do facilitador.
- Medir dúvidas, espera, abandono e contribuições.
- Inventariar cartas e conteúdo.

**Entrega:** PRD curto, mapa da jornada, regras canônicas e métricas.

### Fase 1 — Protótipo de UX — 1 a 2 semanas

- Prototipar as oito etapas preservadas.
- Validar barra de progresso, instrução contextual e resumo da jornada.
- Testar experiência do jogador ativo e de quem espera.
- Definir design system mobile-first e acessível.
- Realizar playtests presenciais e remotos.

**Entrega:** protótipo navegável e relatório de testes.

### Fase 2 — Fundação SpacetimeDB — 2 semanas

- Criar módulo TypeScript.
- Modelar tabelas, views, RLS e reducers.
- Gerar bindings do cliente.
- Implementar identidade, sala, presença e reconexão.
- Implementar o ciclo vazio de oito etapas.
- Configurar ambientes local, staging e CI.

**Entrega:** criar, entrar, avançar pelas fases e retomar uma sala sem perda.

### Fase 3 — Vertical slice criativa — 2 a 3 semanas

- Implementar `SCENARIO`.
- Implementar `PROBLEM`.
- Implementar `INSIGHT`.
- Implementar `SOLUTION`.
- Persistir cartas, contribuições, votos e decisões.
- Mostrar resumo cumulativo da jornada.

**Entrega:** primeira metade completa, testável com vários jogadores.

### Fase 4 — Realização e mercado — 2 a 3 semanas

- Implementar `PROTOTYPE`.
- Implementar `PILOT`.
- Implementar `MARKETING`.
- Implementar `SALES`.
- Gerar artefato final persistido e compartilhável.

**Entrega:** ciclo completo do Idea Hero V2.

### Fase 5 — Conteúdo e performance — 1 a 2 semanas

- Criar catálogo de cartas.
- Migrar imagens para object storage/CDN.
- Criar WebP/AVIF e thumbnails.
- Implementar preload das próximas cartas.
- Criar baralhos temáticos e versionados.
- Criar interface simples de curadoria.

### Fase 6 — Hardening e lançamento — 2 semanas

- Testar reducers, permissões e limites.
- Criar E2E com múltiplos navegadores simultâneos.
- Testar refresh, reconexão, concorrência e ações repetidas.
- Fazer auditoria de acessibilidade.
- Adicionar telemetria e funil de produto.
- Fazer teste de carga por salas simultâneas.
- Validar backup, migrações e rollback.

Estimativa inicial:

- Equipe com design/produto, dois desenvolvedores e QA parcial: 10 a 13 semanas.
- Uma pessoa: aproximadamente 16 a 22 semanas.

## Estratégia de testes

### Testes de domínio/reducers

- Jogador não autorizado não avança fase.
- Apenas host inicia ou reseta a partida.
- Jogador só age no turno correto.
- Submissão duplicada é idempotente.
- Investimento negativo ou acima do saldo é rejeitado.
- Votos concorrentes são contabilizados uma vez.
- Desconexão não remove a contribuição.
- Reconexão recupera identidade e turno.
- Timer não executa duas transições.
- Seed reproduz a mesma ordem de cartas.

### Testes de integração

- Publicar módulo local.
- Gerar bindings e verificar alterações no CI.
- Criar sala, entrar e concluir cada fase.
- Atualizar subscriptions sem vazamento entre salas.
- Verificar autorização e RLS.

### Testes E2E

- Três ou mais contextos do navegador.
- Host, jogador ativo e jogador em espera.
- Entrada por link compartilhado.
- Refresh no meio da contribuição.
- Queda e retorno de conexão.
- Partida completa nos tamanhos 320 px, tablet e desktop.

### Playtests

Observar:

- Tempo até a primeira contribuição.
- Tempo de espera passiva.
- Quantidade de pedidos de explicação.
- Distribuição de fala e contribuições.
- Clareza do resultado final.
- Desejo de compartilhar ou continuar a ideia.

## Prioridades

### P0 — indispensável

- Preservar e clarificar o ciclo de oito etapas.
- Captura e autosave das contribuições.
- SpacetimeDB como fonte de verdade.
- Reconexão e identidade confiáveis.
- Autorização e validação server-side.
- Progresso e ação atual claros.
- Jornada final compartilhável.
- Testes multiusuário e acessibilidade.

### P1 — após validar o núcleo

- Ferramentas de facilitador.
- Baralhos temáticos.
- Galeria de jornadas.
- Contas permanentes.
- Analytics de produto.
- Interface de curadoria.
- Modo competitivo redesenhado sobre as mesmas etapas.

### P2 — posteriormente

- Geração de imagens durante a partida.
- Ranking e progressão.
- Espectadores e salas públicas.
- Economia avançada.
- Expansões e conteúdo da comunidade.

## Métricas e critérios de sucesso

Metas iniciais a calibrar depois do baseline:

- Entrada por link e início sem explicação externa.
- Primeira contribuição criativa em menos de 3 minutos.
- Nenhuma contribuição perdida após refresh ou reconexão.
- Todos sabem a fase, o objetivo e a próxima ação.
- Cada jogador contribui em todas as etapas criativas relevantes.
- Redução clara do tempo de espera passiva.
- Maioria das partidas iniciadas chega a `SALES`.
- A sessão termina com uma ideia compreensível e recuperável.
- Três ou mais clientes completam simultaneamente o E2E.
- Nenhum cliente age em nome de outro ou fora de sua permissão.
- Assets principais carregam adequadamente em conexão móvel.

## Primeiro marco recomendado

O primeiro marco não é reescrever todas as telas. É construir uma vertical slice com:

`sala → SCENARIO → PROBLEM → INSIGHT → SOLUTION → resumo persistido`

Essa fatia deve usar SpacetimeDB, registrar as contribuições, suportar reconexão e oferecer a nova estrutura de UX. Depois de validada, o mesmo padrão é estendido para:

`PROTOTYPE → PILOT → MARKETING → SALES → artefato final`

Assim, o Idea Hero preserva seu melhor elemento — a aventura completa da criação ao mercado — enquanto ganha clareza, memória, confiabilidade e espaço real para a criatividade do grupo.

## Progresso implementado na V2

### Fundação concluída

- V1 preservada na branch histórica `codex/v1-mvp-archive`.
- V2 isolada na branch `codex/v2-spacetimedb` e no diretório `ideahero-9-w-7-zp/`.
- React, TypeScript e SpacetimeDB operacionais no WSL.
- Identidade, perfil, sala, lobby, presença, reconexão, contribuições e ciclo de oito etapas persistidos.
- Convites por URL preservam a sala durante o onboarding e usam compartilhamento nativo com fallback para cópia.
- Catálogo inicial com 16 cartas de IA curadas, otimizadas e acessíveis.
- Linguagem visual original IDEA HERO, logo e fontes Palmer Lake recuperados.

### Vertical slice colaborativa implementada

As quatro primeiras etapas agora mantêm o ciclo canônico e adicionam o microciclo `CONTRIBUTING → VOTING → REVIEW`.

- Cada participante online registra uma contribuição antes da votação.
- Apenas o anfitrião abre a votação e revela a decisão.
- Cada pessoa tem um voto por etapa e pode alterá-lo antes da revelação.
- A interface esconde autoria durante a escolha para reduzir viés social.
- O servidor valida sala, etapa, autoria da ação, contribuição escolhida e quórum online.
- Empates são resolvidos deterministicamente pela contribuição de menor ID.
- A decisão escolhida fica persistida e aparece na memória cumulativa e no documento final.
- Salas ativas anteriores ao novo schema recebem a sessão colaborativa ao abrir a votação.

### Encerramento útil implementado

- A conclusão de `SALES` cria um registro `journey` persistente com título e manifesto.
- O anfitrião pode editar o manifesto final; os demais participantes recebem a atualização em tempo real.
- A tela final mantém cartas, decisões escolhidas, votos e contribuições das oito etapas.
- O resultado pode ser compartilhado pelo recurso nativo do dispositivo ou copiado como texto.
- A jornada completa pode ser baixada como Markdown e impressa com layout limpo.
- O arquivo exportado preserva autoria, carta inspiradora e síntese coletiva de cada etapa.
- Depois de salvar ou compartilhar, cada participante pode sair da sala concluída e iniciar outra jornada.
- O servidor impede saída durante uma partida ativa e restringe a edição final ao anfitrião.

### Próximas validações

- Executar E2E real com 2 a 6 navegadores, incluindo refresh, desconexão e retorno.
- Auditar visualmente 320 px, tablet e desktop assim que a automação do navegador estiver disponível.
- Fazer playtests para validar anonimato, clareza do desempate e ritmo de `Criar → Escolher → Revelar`.
- Depois da validação, decidir se `PROTOTYPE`, `PILOT`, `MARKETING` e `SALES` recebem microciclos próprios ou mantêm avanço direto.
