import { GENERATED_CARD_CATALOG } from "./generated-cards.ts";

const BASE_CARD_CATALOG = [
  {
    id: "00a3fd49-a67d-4438-92e8-2dc61ef93b98",
    stage: "SCENARIO",
    title: "Chuva de histórias",
    lens: "Mundo",
    imagePath: "/cards/00a3fd49-a67d-4438-92e8-2dc61ef93b98.webp",
    altText:
      "Livros abertos formam uma paisagem sob um céu noturno de estrelas douradas.",
    provocation:
      "Que mundo nasce quando o conhecimento deixa de ter fronteiras?",
  },
  {
    id: "230e679f-867c-465c-a99c-6db7a9efbe68",
    stage: "SCENARIO",
    title: "Floresta que observa",
    lens: "Ambiente",
    imagePath: "/cards/230e679f-867c-465c-a99c-6db7a9efbe68.webp",
    altText:
      "Uma floresta de árvores muito altas cria um corredor verde e silencioso.",
    provocation: "O que este lugar protege, esconde ou torna possível?",
  },
  {
    id: "069c0d85-906b-42ba-86a6-7c41e97a95c9",
    stage: "PROBLEM",
    title: "Peso invisível",
    lens: "Tensão",
    imagePath: "/cards/069c0d85-906b-42ba-86a6-7c41e97a95c9.webp",
    altText:
      "Uma criatura escura de orelhas longas aparece isolada sobre um fundo claro.",
    provocation: "Que obstáculo todos sentem, mas ninguém consegue nomear?",
  },
  {
    id: "415e74fc-ae8e-4d42-89fb-d37376845486",
    stage: "PROBLEM",
    title: "Vozes comprimidas",
    lens: "Pessoas",
    imagePath: "/cards/415e74fc-ae8e-4d42-89fb-d37376845486.webp",
    altText:
      "Muitos rostos desenhados se sobrepõem em uma composição densa de tons verdes.",
    provocation: "Quem não está conseguindo ser visto ou ouvido neste cenário?",
  },
  {
    id: "04101468-212a-48d2-b7e4-aa5746a9cb11",
    stage: "INSIGHT",
    title: "Correntes inesperadas",
    lens: "Padrão",
    imagePath: "/cards/04101468-212a-48d2-b7e4-aa5746a9cb11.webp",
    altText:
      "Faixas coloridas ondulam e se entrelaçam como água, vento ou caminhos.",
    provocation: "Que padrão aparece quando você deixa de olhar em linha reta?",
  },
  {
    id: "3cc0558e-274d-4ea7-8fce-bd679de75938",
    stage: "INSIGHT",
    title: "Olhar de outra espécie",
    lens: "Perspectiva",
    imagePath: "/cards/3cc0558e-274d-4ea7-8fce-bd679de75938.webp",
    altText:
      "Um peixe laranja com um grande olho atravessa um céu azul cheio de estrelas.",
    provocation:
      "O que se torna óbvio quando você muda radicalmente de perspectiva?",
  },
  {
    id: "09d3bfc2-8797-41fc-86aa-008c98b098aa",
    stage: "SOLUTION",
    title: "Cidade em movimento",
    lens: "Possibilidade",
    imagePath: "/cards/09d3bfc2-8797-41fc-86aa-008c98b098aa.webp",
    altText:
      "Uma rua futurista em cores neon mistura arquitetura, natureza e caminhos líquidos.",
    provocation: "Como seria a solução se ela já fizesse parte da paisagem?",
  },
  {
    id: "27f865fe-60fb-4f78-8c6f-f38c57e7f649",
    stage: "SOLUTION",
    title: "Portal para o possível",
    lens: "Combinação",
    imagePath: "/cards/27f865fe-60fb-4f78-8c6f-f38c57e7f649.webp",
    altText:
      "Um castelo multicolorido surge no topo de uma escadaria sob raios luminosos.",
    provocation: "Que duas ideias improváveis podem abrir este portal?",
  },
  {
    id: "0707b746-2626-4f05-b097-814e423bea75",
    stage: "PROTOTYPE",
    title: "Oficina de futuros",
    lens: "Forma",
    imagePath: "/cards/0707b746-2626-4f05-b097-814e423bea75.webp",
    altText:
      "Uma longa mesa de criação ocupa uma biblioteca acolhedora cheia de objetos.",
    provocation: "O que você consegue montar hoje para tornar a ideia visível?",
  },
  {
    id: "2fc1fbea-0f75-49f8-8c1c-e831af9340dd",
    stage: "PROTOTYPE",
    title: "Dueto improvável",
    lens: "Interação",
    imagePath: "/cards/2fc1fbea-0f75-49f8-8c1c-e831af9340dd.webp",
    altText:
      "Uma bailarina e um robô repetem o mesmo gesto como parceiros de dança.",
    provocation:
      "Que interação precisa ser encenada para a ideia ser compreendida?",
  },
  {
    id: "0ba59d82-c596-4fc6-9cdc-b73beafffe22",
    stage: "PILOT",
    title: "Equilíbrio delicado",
    lens: "Teste",
    imagePath: "/cards/0ba59d82-c596-4fc6-9cdc-b73beafffe22.webp",
    altText:
      "Uma ave fantástica de pernas muito longas caminha cautelosamente em preto e branco.",
    provocation: "Qual condição pode desequilibrar o primeiro teste?",
  },
  {
    id: "405f009f-c3b7-4a64-a5e3-ea8d33323a69",
    stage: "PILOT",
    title: "Distância da realidade",
    lens: "Condição",
    imagePath: "/cards/405f009f-c3b7-4a64-a5e3-ea8d33323a69.webp",
    altText:
      "Uma lua enorme flutua sobre montanhas enquanto uma pequena figura paira abaixo dela.",
    provocation: "O que parece perto, mas ainda exige uma travessia?",
  },
  {
    id: "16d17b42-9b9c-4f4a-b792-5573c116ffa0",
    stage: "MARKETING",
    title: "Caminhos que chamam",
    lens: "Canal",
    imagePath: "/cards/16d17b42-9b9c-4f4a-b792-5573c116ffa0.webp",
    altText:
      "Um rio rosa serpenteia por uma paisagem azul e roxa de aparência fantástica.",
    provocation: "Por qual caminho a mensagem encontra quem mais precisa dela?",
  },
  {
    id: "22d440f3-97b3-4de6-8bc4-e98cfe8b19b0",
    stage: "MARKETING",
    title: "O tempo da mensagem",
    lens: "Momento",
    imagePath: "/cards/22d440f3-97b3-4de6-8bc4-e98cfe8b19b0.webp",
    altText:
      "Relógios ornamentados se encaixam em uma composição laranja, azul e rosa.",
    provocation:
      "Quando esta história precisa chegar para realmente mobilizar alguém?",
  },
  {
    id: "185db6df-7fcc-4ed8-869d-e57148b956a1",
    stage: "SALES",
    title: "Valor que floresce",
    lens: "Impacto",
    imagePath: "/cards/185db6df-7fcc-4ed8-869d-e57148b956a1.webp",
    altText:
      "Mãos, flores e formas orgânicas se conectam em uma colagem de tons quentes.",
    provocation:
      "Que transformação concreta provaria que esta ideia tem valor?",
  },
  {
    id: "380f0ddd-3b79-4af0-8200-15fade24b735",
    stage: "SALES",
    title: "Constelação de aliados",
    lens: "Legado",
    imagePath: "/cards/380f0ddd-3b79-4af0-8200-15fade24b735.webp",
    altText:
      "Animais de diferentes espécies formam uma constelação sobre um fundo azul escuro.",
    provocation: "Quem precisa se tornar aliado para a ideia continuar viva?",
  },
  {
    id: "pol-001",
    stage: "POLISHING",
    title: "Espelho do encantamento",
    lens: "Aprimoramento",
    imagePath: "/cards/27f865fe-60fb-4f78-8c6f-f38c57e7f649.webp",
    altText:
      "Um castelo multicolorido surge no topo de uma escadaria sob raios luminosos.",
    provocation:
      "Se o encantamento fosse uma joia, que aresta ainda precisa ser lapidada?",
  },
  {
    id: "pol-002",
    stage: "POLISHING",
    title: "Fogo de fada",
    lens: "Provocação",
    imagePath: "/cards/09d3bfc2-8797-41fc-86aa-008c98b098aa.webp",
    altText:
      "Uma rua futurista em cores neon mistura arquitetura, natureza e caminhos líquidos.",
    provocation:
      "Que ajuste pode tornar este encantamento mais forte e generoso?",
  },
  {
    id: "tst-001",
    stage: "TESTING",
    title: "Equilíbrio delicado",
    lens: "Provação",
    imagePath: "/cards/0ba59d82-c596-4fc6-9cdc-b73beafffe22.webp",
    altText:
      "Uma ave fantástica de pernas muito longas caminha cautelosamente em preto e branco.",
    provocation:
      "Que obstáculo pode desequilibrar o primeiro teste do artefato?",
  },
  {
    id: "tst-002",
    stage: "TESTING",
    title: "Distância da realidade",
    lens: "Travessia",
    imagePath: "/cards/405f009f-c3b7-4a64-a5e3-ea8d33323a69.webp",
    altText:
      "Uma lua enorme flutua sobre montanhas enquanto uma pequena figura paira abaixo dela.",
    provocation: "O que parece perto, mas ainda exige uma travessia corajosa?",
  },
  {
    id: "cnq-001",
    stage: "CONQUERING",
    title: "Caminhos que chamam",
    lens: "Chamado",
    imagePath: "/cards/16d17b42-9b9c-4f4a-b792-5573c116ffa0.webp",
    altText:
      "Um rio rosa serpenteia por uma paisagem azul e roxa de aparência fantástica.",
    provocation: "Que chamado convida alguém a se juntar à missão?",
  },
  {
    id: "cnq-002",
    stage: "CONQUERING",
    title: "O tempo da mensagem",
    lens: "Encontro",
    imagePath: "/cards/22d440f3-97b3-4de6-8bc4-e98cfe8b19b0.webp",
    altText:
      "Relógios ornamentados se encaixam em uma composição laranja, azul e rosa.",
    provocation: "Em que momento este convite pode tocar mais corações?",
  },
  {
    id: "fnl-001",
    stage: "FINAL",
    title: "Jardim que floresce",
    lens: "Transformação",
    imagePath: "/cards/185db6df-7fcc-4ed8-869d-e57148b956a1.webp",
    altText:
      "Mãos, flores e formas orgânicas se conectam em uma colagem de tons quentes.",
    provocation: "Que transformação mostra que a missão fez bem ao reino?",
  },
  {
    id: "fnl-002",
    stage: "FINAL",
    title: "Constelação de aliados",
    lens: "Próximo capítulo",
    imagePath: "/cards/380f0ddd-3b79-4af0-8200-15fade24b735.webp",
    altText:
      "Animais de diferentes espécies formam uma constelação sobre um fundo azul escuro.",
    provocation: "Quem pode ser aliado para esta história continuar viva?",
  },
] as const;

const CARD_VARIANTS: Record<
  string,
  readonly [
    { suffix: string; title: string; lens: string; provocation: string },
    { suffix: string; title: string; lens: string; provocation: string },
  ]
> = {
  SCENARIO: [
    {
      suffix: "future",
      title: "Um futuro escondido",
      lens: "Tempo",
      provocation:
        "O que teria mudado neste mundo cinco anos antes desta imagem?",
    },
    {
      suffix: "voices",
      title: "Vozes do lugar",
      lens: "Comunidade",
      provocation:
        "Quem vive aqui, o que deseja e que história ainda não foi contada?",
    },
  ],
  PROBLEM: [
    {
      suffix: "friction",
      title: "Fricção cotidiana",
      lens: "Barreira",
      provocation:
        "Em que pequeno momento a experiência deixa de funcionar para alguém?",
    },
    {
      suffix: "excluded",
      title: "À margem",
      lens: "Acesso",
      provocation:
        "Quem fica de fora quando este sistema funciona exatamente como foi planejado?",
    },
  ],
  INSIGHT: [
    {
      suffix: "cause",
      title: "Por baixo da superfície",
      lens: "Causa",
      provocation:
        "Que causa silenciosa explicaria vários sintomas ao mesmo tempo?",
    },
    {
      suffix: "resource",
      title: "Recurso esquecido",
      lens: "Oportunidade",
      provocation:
        "Que capacidade já existe neste cenário, mas ainda não está sendo usada?",
    },
  ],
  SOLUTION: [
    {
      suffix: "reverse",
      title: "Caminho inverso",
      lens: "Inversão",
      provocation:
        "Como seria a solução se começasse pelo resultado e voltasse até o primeiro passo?",
    },
    {
      suffix: "bridge",
      title: "Ponte improvável",
      lens: "Conexão",
      provocation:
        "Que duas capacidades existentes podem ser conectadas de uma maneira nova?",
    },
  ],
  PROTOTYPE: [
    {
      suffix: "paper",
      title: "Protótipo de papel",
      lens: "Baixa fidelidade",
      provocation:
        "Mostre o fluxo com papel, cartões e objetos antes de construir tecnologia.",
    },
    {
      suffix: "roleplay",
      title: "Ensaio de serviço",
      lens: "Encenação",
      provocation:
        "Represente os primeiros sessenta segundos da experiência com pessoas e falas.",
    },
  ],
  PILOT: [
    {
      suffix: "access",
      title: "Acesso limitado",
      lens: "Realidade",
      provocation:
        "Teste como a solução se comporta com conexão, tempo ou recursos limitados.",
    },
    {
      suffix: "skeptic",
      title: "Pessoa cética",
      lens: "Confiança",
      provocation:
        "O primeiro participante não acredita na promessa. Que evidência poderia convencê-lo?",
    },
  ],
  MARKETING: [
    {
      suffix: "community",
      title: "Confiança em rede",
      lens: "Comunidade",
      provocation:
        "Como a mensagem pode circular entre pessoas que já confiam umas nas outras?",
    },
    {
      suffix: "direct",
      title: "Convite direto",
      lens: "Relacionamento",
      provocation:
        "Que convite pessoal faria o público certo experimentar a proposta agora?",
    },
  ],
  SALES: [
    {
      suffix: "signal",
      title: "Primeiro sinal",
      lens: "Validação",
      provocation:
        "Qual comportamento concreto indicaria que o mercado percebeu valor?",
    },
    {
      suffix: "runway",
      title: "Próxima pista",
      lens: "Runway",
      provocation:
        "Que próximo experimento merece receber o capital que ainda resta?",
    },
  ],
  POLISHING: [
    {
      suffix: "deeper",
      title: "Camada mais funda",
      lens: "Profundidade",
      provocation:
        "Que parte do encantamento merece mais atenção antes de seguir?",
    },
    {
      suffix: "edge",
      title: "A centelha rara",
      lens: "Magia própria",
      provocation: "O que torna este encantamento impossível de ignorar?",
    },
  ],
  TESTING: [
    {
      suffix: "access",
      title: "Passagem estreita",
      lens: "Limite",
      provocation:
        "Ponham o artefato à prova com pouco tempo, pouca ajuda ou um caminho difícil.",
    },
    {
      suffix: "skeptic",
      title: "Guardião desconfiado",
      lens: "Confiança",
      provocation:
        "Um guardião não acredita na magia. O que pode fazê-lo confiar?",
    },
  ],
  CONQUERING: [
    {
      suffix: "community",
      title: "Sussurro entre aliados",
      lens: "Aliança",
      provocation:
        "Como o convite pode viajar entre aliados que já confiam uns nos outros?",
    },
    {
      suffix: "direct",
      title: "Convite à porta",
      lens: "Encontro",
      provocation:
        "Que convite pessoal faria alguém querer entrar na missão agora?",
    },
  ],
  FINAL: [
    {
      suffix: "signal",
      title: "Primeiro brilho",
      lens: "Sinal",
      provocation: "Que sinal mostra que o reino acolheu a transformação?",
    },
    {
      suffix: "runway",
      title: "Próxima constelação",
      lens: "Continuação",
      provocation:
        "Que capítulo a missão merece explorar depois desta celebração?",
    },
  ],
};

export interface Card {
  id: string;
  stage: string;
  title: string;
  lens: string;
  imagePath: string;
  altText: string;
  provocation: string;
}

const STAGE_ALIAS_MAP: Record<string, string> = {
  POLISHING: "SOLUTION",
  TESTING: "PILOT",
  CONQUERING: "MARKETING",
  FINAL: "SALES",
};

const combinedMap = new Map<string, Card>();
for (const card of BASE_CARD_CATALOG) {
  combinedMap.set(card.id, card);
}
for (const card of GENERATED_CARD_CATALOG) {
  combinedMap.set(card.id, card);
}
const allUniqueCards: Card[] = Array.from(combinedMap.values());

const fullCatalogRaw: Card[] = [...allUniqueCards];
for (const [targetStage, sourceStage] of Object.entries(STAGE_ALIAS_MAP)) {
  const sourceCards = allUniqueCards.filter((c) => c.stage === sourceStage);
  for (const c of sourceCards) {
    fullCatalogRaw.push({
      ...c,
      id: `${targetStage.toLowerCase()}-${c.id}`,
      stage: targetStage,
    });
  }
}

export const CARD_CATALOG: Card[] = fullCatalogRaw.flatMap((card) => {
  const variants = CARD_VARIANTS[card.stage] ?? [];
  return [
    card,
    ...variants.map((variant) => ({
      ...card,
      id: `${card.id}-${variant.suffix}`,
      title: variant.title,
      lens: variant.lens,
      provocation: variant.provocation,
    })),
  ];
});

function stableHash(value: string) {
  let hash = 2_166_136_261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }
  return hash >>> 0;
}

export function cardForRoomStage(
  roomCode: string,
  stage: string,
  drawIndex = 0,
) {
  const stageCards = CARD_CATALOG.filter((card) => card.stage === stage);
  if (stageCards.length === 0) {
    throw new Error(`Nenhuma carta configurada para a etapa ${stage}.`);
  }
  const imageGroups = stageCards.reduce<(typeof stageCards)[]>(
    (groups, card) => {
      const group = groups.find(
        (items) => items[0]?.imagePath === card.imagePath,
      );
      if (group) group.push(card);
      else groups.push([card]);
      return groups;
    },
    [],
  );
  const firstImageIndex =
    stableHash(`${roomCode}:${stage}:images-v3`) % imageGroups.length;
  const imageGroup =
    imageGroups[(firstImageIndex + drawIndex) % imageGroups.length];
  const copyIndex =
    stableHash(`${roomCode}:${stage}:copy-v3:${drawIndex}`) % imageGroup.length;
  return imageGroup[copyIndex];
}

export function replacementCardForRoomStage(
  roomCode: string,
  stage: string,
  discardedImagePath: string,
  drawIndex = 1,
) {
  const replacementCards = CARD_CATALOG.filter(
    (card) => card.stage === stage && card.imagePath !== discardedImagePath,
  );
  if (replacementCards.length === 0) {
    throw new Error(
      `Nenhuma carta substituta configurada para a etapa ${stage}.`,
    );
  }
  const replacementIndex =
    stableHash(`${roomCode}:${stage}:replacement-v1:${drawIndex}`) %
    replacementCards.length;
  return replacementCards[replacementIndex];
}
