# Idea Hero V2 — adendo de evolução

Este adendo complementa `PLANO-IDEA-HERO-V2.md` com problemas observados no uso
da V2 em julho de 2026. Não altera o ciclo canônico:

`SCENARIO → PROBLEM → INSIGHT → SOLUTION → PROTOTYPE → PILOT → MARKETING → SALES`

## Ordem recomendada

1. Corrigir isolamento de dados por sala e validar uma partida multiusuário.
2. Separar identificadores permanentes de códigos temporários de convite.
3. Corrigir a barra superior mobile e validar os principais fluxos em 320 px.
4. Implementar o construtor de avatares pixel-art com assets do projeto.
5. Melhorar compartilhamento/exportação e, então, especializar as últimas quatro
   etapas com dados próprios.

## Códigos temporários, dados permanentes

O código de convite não deve ser a identidade da jornada. A identidade interna
permanente é `room.id`; jogadores, contribuições, votos, decisões e a jornada
final devem usar somente esse identificador.

Criar uma reserva temporária de código:

```text
room_code
- code       # três palavras aleatórias, como aurora-mundo-estrela
- roomId     # chave para room.id
- expiresAt
```

- O código é único somente enquanto a reserva está ativa.
- Ao concluir ou expirar uma sala, a reserva é removida e a combinação volta a
  ficar disponível.
- O cliente gera três palavras legíveis, sem prefixo fixo e sem caracteres que o
  servidor rejeite. Em colisão, ele solicita outra combinação automaticamente.
- Criar `journey.publicId` permanente antes de publicar um resultado. Um convite
  de sala reutilizado nunca pode abrir uma jornada histórica errada.

## Avatares pixel-art

- Substituir emotes por um construtor com, inicialmente, duas camadas:
  base/personagem e acessório.
- Usar sprites PNG transparentes de mesmo tamanho e composição fixa, versionados
  pelo projeto; upload de participantes fica para depois de armazenamento e
  moderação adequados.
- Salvar combinações compactas, por exemplo `pixel:fox:glasses`, e manter leitura
  compatível para os IDs de emote existentes.
- Preparar um catálogo com nome acessível, caminho de asset, fallback visual e
  ordem de camada. O avatar precisa funcionar na escolha de perfil, lobby,
  presença e artefato final.

## Barra superior e mobile

- Agrupar código de sala e ação "Ver jornada" em uma única área à direita da
  logo. O chip não deve cair para outra linha.
- Em 320 px, reduzir primeiro o rótulo "Sala" e preservar o código e a ação;
  não ocultar a etapa atual nem aumentar a altura da barra.
- Testar área de toque, leitura por teclado, contraste e comportamento da barra
  fixa em mobile, tablet e desktop.

## Resultado, compartilhamento e download

- Oferecer ações explícitas: compartilhar manifesto, copiar resumo e baixar
  jornada completa; cada uma deve informar sucesso, cancelamento ou falha.
- Manter Markdown como exportação base. Avaliar PDF e página pública somente
  depois de definir `journey.publicId`, permissões e privacidade.
- Exportar título, manifesto, participantes, cartas, contribuições, decisões e
  todos os campos estruturados de cada etapa.
- Deixar claro quando o anfitrião alterou o manifesto localmente e ainda não o
  salvou antes de compartilhar ou baixar.

## Etapas que ainda precisam de experiência própria

`PROTOTYPE`, `PILOT`, `MARKETING` e `SALES` não devem permanecer como uma única
frase genérica. O plano futuro precisa incluir:

- **PROTOTYPE:** storyboard, hipótese, recursos, versão e timer acessível.
- **PILOT:** condição de teste, resultado, aprendizado e decisão de manter,
  adaptar ou refazer.
- **MARKETING:** público, mensagem, canal, chamada para ação e consequências
  legíveis dos investimentos.
- **SALES:** resultado ou impacto explicável, fatores que o produziram e próximo
  experimento real opcional.
