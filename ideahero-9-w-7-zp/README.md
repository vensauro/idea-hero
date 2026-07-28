# Idea Hero 2.0

Fundação funcional da nova experiência multiplayer do Idea Hero, construída com React, TypeScript e SpacetimeDB.

## O que já funciona

- criação e entrada em salas por código ou convite em URL;
- compartilhamento nativo do convite com cópia do link como fallback;
- perfil, avatar, presença e status de pronto em tempo real;
- início da partida controlado pelo anfitrião;
- ciclo completo de oito etapas;
- catálogo inicial com 16 cartas de IA curadas, metadata e texto alternativo;
- sorteio determinístico e persistido de uma carta por sala e etapa;
- instrução contextual, confirmação de salvamento e indicação do próximo passo;
- contribuição individual persistida em cada etapa;
- microciclo `CONTRIBUTING → VOTING → REVIEW` em `SCENARIO`, `PROBLEM`, `INSIGHT` e `SOLUTION`;
- votação sem autoria visível, um voto atualizável por pessoa e desempate determinístico;
- decisão coletiva persistida no resumo cumulativo e no documento final;
- manifesto final persistente e editável pelo anfitrião;
- compartilhamento nativo com fallback para cópia, download em Markdown e impressão;
- arquivo final com cartas, decisões, votos, contribuições e autoria das oito etapas;
- saída segura da sala concluída para começar uma nova jornada;
- painel compartilhado da jornada e encerramento após `SALES`;
- regras de sala e progressão validadas no servidor.

## Ciclo canônico

```text
SCENARIO → PROBLEM → INSIGHT → SOLUTION → PROTOTYPE → PILOT → MARKETING → SALES
```

Essa sequência é uma regra central do domínio. Mudanças de interface podem enriquecer cada etapa, mas não devem quebrar o ciclo.

## Arquitetura

- `src/`: cliente React e bindings TypeScript gerados;
- `spacetimedb/src/index.ts`: tabelas, reducers e regras autoritativas;
- `spacetime.json`: configuração do banco e geração de bindings;
- `.env.example`: configuração pública esperada pelo cliente.

As tabelas públicas atuais são `profile`, `room`, `player`, `contribution`, `card`, `card_draw`, `stage_session`, `vote`, `decision` e `journey`. Toda alteração de estado compartilhado passa por reducers do SpacetimeDB.

## Requisitos no WSL

- Node.js e npm;
- SpacetimeDB CLI 2.6 ou compatível;
- sessão autenticada no Maincloud para publicar.

## Instalação e execução

```bash
cd /home/ivensauro/claraidea/idea-hero/ideahero-9-w-7-zp
cp .env.example .env.local
npm install
npm --prefix spacetimedb install
npm run dev
```

O cliente abre normalmente em `http://localhost:5173` e se conecta ao banco definido no ambiente.

## Comandos principais

```bash
# validar módulo do servidor
spacetime build --module-path spacetimedb

# regenerar bindings após mudar tabelas ou reducers
spacetime generate --yes --lang typescript \
  --out-dir src/module_bindings \
  --module-path spacetimedb

# publicar o módulo no Maincloud
spacetime publish ideahero-9w7zp \
  --server maincloud \
  --module-path spacetimedb

# qualidade do cliente
npm run format
npm run lint
npm run build
npm test -- --run
```

## Gerar cartas de inspiraÃ§Ã£o com IA

Com `GEMINI_API_KEY` configurada em `.env`, o pipeline cria conceitos visuais
surpreendentes, gera cada arte 4:3 com o Gemini e, a partir da imagem gerada,
escreve tÃ­tulo, lente, texto alternativo e provocaÃ§Ã£o em portuguÃªs. Cada run
completa adiciona as cartas ao catÃ¡logo do cliente e ao catÃ¡logo do
SpacetimeDB.

```bash
# valida o fluxo sem fazer chamadas ou gravar arquivos
npm run cards:dry-run -- --count 12

# cria 12 cartas (o mÃ­nimo Ã© 10)
npm run cards:generate -- --count 12 --run-name primeira-baralhada
```

As imagens ficam em `public/cards/generated/<run-name>/` e o manifesto de cada
execuÃ§Ã£o em `output/card-generation/<run-name>/manifest.json`. Depois de uma
geraÃ§Ã£o, valide com `npm run spacetime:build` e publique o mÃ³dulo para que as
novas cartas apareÃ§am em salas novas.

Banco de desenvolvimento: [ideahero-9w7zp no Maincloud](https://spacetimedb.com/ideahero-9w7zp).

## Próximo marco

Validar a vertical slice colaborativa de `SCENARIO → PROBLEM → INSIGHT → SOLUTION` em sessões multiusuário reais, incluindo refresh e reconexão. Depois dos playtests, refinar o microciclo e estender padrões aprovados para `PROTOTYPE → PILOT → MARKETING → SALES`.
