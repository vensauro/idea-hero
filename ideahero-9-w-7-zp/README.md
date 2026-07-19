# Idea Hero 2.0

Fundação funcional da nova experiência multiplayer do Idea Hero, construída com React, TypeScript e SpacetimeDB.

## O que já funciona

- criação e entrada em salas por código;
- perfil, avatar, presença e status de pronto em tempo real;
- início da partida controlado pelo anfitrião;
- ciclo completo de oito etapas;
- catálogo inicial com 16 cartas de IA curadas, metadata e texto alternativo;
- sorteio determinístico e persistido de uma carta por sala e etapa;
- instrução contextual, confirmação de salvamento e indicação do próximo passo;
- contribuição individual persistida em cada etapa;
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

As tabelas públicas atuais são `profile`, `room`, `player`, `contribution`, `card` e `card_draw`. Toda alteração de estado compartilhado passa por reducers do SpacetimeDB.

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

Banco de desenvolvimento: [ideahero-9w7zp no Maincloud](https://spacetimedb.com/ideahero-9w7zp).

## Próximo marco

Completar a vertical slice criativa de `SCENARIO → PROBLEM → INSIGHT → SOLUTION` com síntese coletiva, votação/combinação de contribuições e decisões persistidas; depois validar a experiência em playtests com grupos reais.
