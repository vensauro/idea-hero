export const INITIAL_RUNWAY = 10_000;
export const CARD_REDRAW_COST = 500;
export const PROTOTYPE_BASE_SECONDS = 120;
export const PROTOTYPE_EXTENSION_SECONDS = 30;
export const PROTOTYPE_EXTENSION_COST = 500;
export const PROTOTYPE_CREATIVE_BONUS = 250;

export const BOARD_STAGES = [
  "SCENARIO",
  "PROBLEM",
  "INSIGHT",
  "SOLUTION",
  "POLISHING",
  "PROTOTYPE",
  "TESTING",
  "CONQUERING",
  "FINAL",
] as const;

export type EconomyStage = (typeof BOARD_STAGES)[number];

export const PROTOTYPE_CHALLENGES = [
  {
    key: "DRAW",
    title: "Desenhe a experiência",
    description:
      "Transforme a ideia em uma tela, fluxo ou storyboard que outra pessoa consiga entender.",
    artifactKinds: ["DRAWING", "IMAGE"],
  },
  {
    key: "PHOTO",
    title: "Monte e fotografe",
    description:
      "Use papel, objetos ou pessoas para criar uma versão física e registre uma foto.",
    artifactKinds: ["IMAGE", "DRAWING"],
  },
  {
    key: "PERFORM",
    title: "Encene ou cante a ideia",
    description:
      "Faça uma demonstração curta, um jingle ou uma fala e registre o resultado.",
    artifactKinds: ["AUDIO", "IMAGE"],
  },
] as const;

export function prototypeChallengeForSeed(seed: number) {
  return PROTOTYPE_CHALLENGES[
    deterministicIndex(seed, 26, PROTOTYPE_CHALLENGES.length)
  ];
}

export const PILOT_FEEDBACK = [
  {
    title: "A ideia foi entendida, mas ainda não inspira confiança",
    description:
      "As pessoas compreenderam a proposta, porém hesitaram antes do primeiro compromisso.",
    options: [
      {
        key: "A",
        title: "Mostrar prova",
        description: "Adicionar exemplos, resultados ou depoimentos.",
        learning: "PROOF",
      },
      {
        key: "B",
        title: "Reduzir o risco",
        description: "Oferecer uma experiência inicial menor e reversível.",
        learning: "TRIAL",
      },
      {
        key: "C",
        title: "Criar proximidade",
        description:
          "Apresentar a solução por alguém em quem o público confia.",
        learning: "TRUST",
      },
    ],
  },
  {
    title: "As pessoas gostaram, mas não souberam por onde começar",
    description:
      "O valor parece interessante, mas o primeiro passo ficou escondido ou complexo.",
    options: [
      {
        key: "A",
        title: "Uma ação principal",
        description: "Remover distrações e destacar apenas o primeiro passo.",
        learning: "CLARITY",
      },
      {
        key: "B",
        title: "Exemplo guiado",
        description: "Demonstrar a primeira experiência antes de pedir ação.",
        learning: "GUIDANCE",
      },
      {
        key: "C",
        title: "Ajuda humana",
        description: "Começar com acompanhamento pessoal e aprender com ele.",
        learning: "SUPPORT",
      },
    ],
  },
  {
    title: "A solução funciona, mas exige mais tempo do que o esperado",
    description:
      "O teste revelou valor, porém também revelou esforço demais para a rotina real.",
    options: [
      {
        key: "A",
        title: "Encurtar o fluxo",
        description: "Entregar o menor resultado valioso primeiro.",
        learning: "SPEED",
      },
      {
        key: "B",
        title: "Automatizar uma parte",
        description: "Retirar a tarefa mais repetitiva da experiência.",
        learning: "AUTOMATION",
      },
      {
        key: "C",
        title: "Mudar o momento",
        description: "Levar a solução para uma ocasião com menos pressão.",
        learning: "TIMING",
      },
    ],
  },
] as const;

export function pilotFeedbackForSeed(seed: number) {
  return PILOT_FEEDBACK[deterministicIndex(seed, 31, PILOT_FEEDBACK.length)];
}

export const STAGE_COST_LABELS: Record<EconomyStage, string> = {
  SCENARIO: "Pesquisa",
  PROBLEM: "Descoberta",
  INSIGHT: "Análise",
  SOLUTION: "Design",
  POLISHING: "Exploração criativa",
  PROTOTYPE: "Construção",
  TESTING: "Teste de recursos",
  CONQUERING: "Conquista de adesão",
  FINAL: "Cerimônia final",
};

const COST_PAIRS = [
  [500, 750],
  [750, 1_000],
  [1_000, 1_500],
  [750, 1_000],
  [750, 750],
] as const;

export type StageCostDefinition = {
  stage: EconomyStage;
  amount: number;
  label: string;
};

function mix32(value: number) {
  let mixed = value | 0;
  mixed ^= mixed >>> 16;
  mixed = Math.imul(mixed, 0x7feb352d);
  mixed ^= mixed >>> 15;
  mixed = Math.imul(mixed, 0x846ca68b);
  mixed ^= mixed >>> 16;
  return mixed >>> 0;
}

export function deterministicIndex(seed: number, salt: number, length: number) {
  if (length <= 0) throw new Error("length must be positive");
  return mix32(seed ^ Math.imul(salt + 1, 0x9e3779b1)) % length;
}

export function createStageCosts(seed: number): StageCostDefinition[] {
  return COST_PAIRS.flatMap((pair, pairIndex) => {
    const shouldSwap = deterministicIndex(seed, pairIndex, 2) === 1;
    const ordered = shouldSwap ? [pair[1], pair[0]] : [pair[0], pair[1]];
    return ordered.flatMap((amount, offset) => {
      const stageIndex = pairIndex * 2 + offset;
      if (stageIndex >= BOARD_STAGES.length) return [];
      const stage = BOARD_STAGES[stageIndex];
      return [{ stage, amount, label: STAGE_COST_LABELS[stage] }];
    });
  });
}

export const FUNDING_STAGES = [
  "INSIGHT",
  "SOLUTION",
  "PROTOTYPE",
  "TESTING",
] as const satisfies readonly EconomyStage[];

export const TEST_OPTIONS = [
  {
    key: "REAL_USER",
    title: "Teste com pessoa real",
    description: "Convide alguém de fora do grupo para usar o protótipo e observe.",
    cost: 300,
    impact: "Feedback direto e revelação de fricções invisíveis.",
  },
  {
    key: "STRESS_TEST",
    title: "Teste de estresse",
    description: "Simule o uso por muitas pessoas ao mesmo tempo e veja onde quebra.",
    cost: 500,
    impact: "Descobre gargalos antes que eles virem crises.",
  },
  {
    key: "COMPETITOR_LENS",
    title: "Olhar do concorrente",
    description: "Analise como um concorrente reagiria e o que faria diferente.",
    cost: 800,
    impact: "Revela diferenciais e vulnerabilidades competitivas.",
  },
  {
    key: "RESOURCE_LIMIT",
    title: "Com recursos mínimos",
    description: "Tire metade dos recursos e veja se a ideia ainda funciona.",
    cost: 1_000,
    impact: "Encontra a essência inegociável da proposta.",
  },
  {
    key: "FUTURE_SCENARIO",
    title: "Cenário futuro",
    description: "Projete a ideia daqui a dois anos e avalie sua resistência ao tempo.",
    cost: 1_200,
    impact: "Testa a longevidade e adaptabilidade da solução.",
  },
] as const;

export function generateTestOptions(seed: number) {
  const shuffled = [...TEST_OPTIONS];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = deterministicIndex(seed, 50 + i, i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, 5);
}

export const FUNDING_VALUES = [2_000, 3_000, 4_000] as const;

export const FUNDING_NARRATIVES = [
  {
    title: "Edital de inovação",
    description:
      "O projeto foi selecionado por um programa de inovação e recebeu recursos sem contrapartidas.",
  },
  {
    title: "Primeiro cliente",
    description:
      "Um cliente acreditou na proposta e fez uma pré-compra para ajudar o projeto a avançar.",
  },
  {
    title: "Aceleradora parceira",
    description:
      "Uma aceleradora decidiu apoiar os próximos experimentos da equipe.",
  },
  {
    title: "Parceria estratégica",
    description:
      "Uma organização parceira contribuiu com capital para levar a solução ao mercado.",
  },
] as const;

export function createFundingOpportunity(seed: number) {
  const stage =
    FUNDING_STAGES[deterministicIndex(seed, 20, FUNDING_STAGES.length)];
  const value =
    FUNDING_VALUES[deterministicIndex(seed, 21, FUNDING_VALUES.length)];
  const narrative =
    FUNDING_NARRATIVES[deterministicIndex(seed, 22, FUNDING_NARRATIVES.length)];
  return { stage, value, ...narrative };
}

export const MARKETING_AUDIENCES = [
  "EARLY_ADOPTERS",
  "COMMUNITIES",
  "ORGANIZATIONS",
  "GENERAL_PUBLIC",
] as const;

export const MARKETING_CHANNELS = [
  "SOCIAL",
  "COMMUNITY",
  "PARTNERSHIPS",
  "DIRECT",
] as const;

export type MarketingAudience = (typeof MARKETING_AUDIENCES)[number];
export type MarketingChannel = (typeof MARKETING_CHANNELS)[number];

export const MARKETING_LAUNCH_OPTIONS = [
  {
    key: "A",
    label: "Começo próximo",
    audience: "COMMUNITIES",
    valuePromise:
      "Uma mudança útil compartilhada por pessoas que já confiam umas nas outras.",
    channel: "COMMUNITY",
    callToAction: "Experimente com o seu grupo.",
    investment: 0,
    accent: "mint",
    imagePath: "/cards/16d17b42-9b9c-4f4a-b792-5573c116ffa0.webp",
    imageAlt: "Um caminho colorido atravessa uma paisagem fantástica.",
  },
  {
    key: "B",
    label: "Convite direto",
    audience: "EARLY_ADOPTERS",
    valuePromise:
      "Uma primeira experiência simples para quem gosta de testar novidades.",
    channel: "DIRECT",
    callToAction: "Seja uma das primeiras pessoas a experimentar.",
    investment: 500,
    accent: "sun",
    imagePath: "/cards/22d440f3-97b3-4de6-8bc4-e98cfe8b19b0.webp",
    imageAlt: "Relógios coloridos representam o momento do lançamento.",
  },
  {
    key: "C",
    label: "Lançamento com aliados",
    audience: "ORGANIZATIONS",
    valuePromise:
      "Uma solução prática apresentada com credibilidade e alcance.",
    channel: "PARTNERSHIPS",
    callToAction: "Leve esta experiência para a sua organização.",
    investment: 1_000,
    accent: "violet",
    imagePath: "/cards/380f0ddd-3b79-4af0-8200-15fade24b735.webp",
    imageAlt: "Uma constelação de animais representa uma rede de aliados.",
  },
] as const satisfies readonly {
  key: string;
  label: string;
  audience: MarketingAudience;
  valuePromise: string;
  channel: MarketingChannel;
  callToAction: string;
  investment: number;
  accent: string;
  imagePath: string;
  imageAlt: string;
}[];

export function marketingLaunchOption(choice: string) {
  return MARKETING_LAUNCH_OPTIONS.find((option) => option.key === choice);
}

export const MARKET_RESPONSES = [
  {
    title: "Comunidades em movimento",
    description:
      "A conversa já está acontecendo em grupos que confiam uns nos outros.",
    baseMultiplier: 100,
    matchType: "CHANNEL",
    matchValue: "COMMUNITY",
  },
  {
    title: "Algoritmo favorável",
    description:
      "O tema ganhou espaço nas redes e encontrou uma janela de atenção.",
    baseMultiplier: 110,
    matchType: "CHANNEL",
    matchValue: "SOCIAL",
  },
  {
    title: "Portas institucionais",
    description:
      "Organizações procuram soluções concretas e parceiros confiáveis.",
    baseMultiplier: 100,
    matchType: "AUDIENCE",
    matchValue: "ORGANIZATIONS",
  },
  {
    title: "Curiosidade dos pioneiros",
    description:
      "Pessoas abertas a novidades querem experimentar antes do mercado.",
    baseMultiplier: 110,
    matchType: "AUDIENCE",
    matchValue: "EARLY_ADOPTERS",
  },
  {
    title: "Confiança por indicação",
    description: "Uma recomendação direta vale mais do que uma campanha ampla.",
    baseMultiplier: 100,
    matchType: "CHANNEL",
    matchValue: "DIRECT",
  },
  {
    title: "Rede de aliados",
    description: "Parceiros complementares ampliam alcance e credibilidade.",
    baseMultiplier: 100,
    matchType: "CHANNEL",
    matchValue: "PARTNERSHIPS",
  },
  {
    title: "Atenção disputada",
    description:
      "Muitas mensagens competem pelo mesmo espaço e o público está seletivo.",
    baseMultiplier: 90,
    matchType: "AUDIENCE",
    matchValue: "GENERAL_PUBLIC",
  },
  {
    title: "Causa compartilhada",
    description:
      "Comunidades reconhecem o problema e estão prontas para mobilizar.",
    baseMultiplier: 110,
    matchType: "AUDIENCE",
    matchValue: "COMMUNITIES",
  },
] as const;

export function marketResponseForSeed(seed: number) {
  return MARKET_RESPONSES[
    deterministicIndex(seed, 40, MARKET_RESPONSES.length)
  ];
}

export function effectiveMarketMultiplier(
  response: (typeof MARKET_RESPONSES)[number],
  audience: MarketingAudience,
  channel: MarketingChannel,
) {
  const matched =
    (response.matchType === "AUDIENCE" && response.matchValue === audience) ||
    (response.matchType === "CHANNEL" && response.matchValue === channel);
  return {
    matched,
    multiplier: Math.min(130, response.baseMultiplier + (matched ? 20 : 0)),
  };
}

export function roundToHundred(value: number) {
  return Math.round(value / 100) * 100;
}

export function calculateSalesResult(input: {
  remainingCredits: number;
  marketingInvestment: number;
  multiplier: number;
}) {
  const simulatedSales = roundToHundred(
    ((5_000 + input.marketingInvestment) * input.multiplier) / 100,
  );
  const finalRunway = input.remainingCredits + simulatedSales;
  const tier =
    finalRunway < 8_000
      ? "NEEDS_ITERATION"
      : finalRunway < 12_000
        ? "MARKET_SIGNAL"
        : finalRunway < 16_000
          ? "TRACTION"
          : "GROWTH_OPPORTUNITY";
  return { simulatedSales, finalRunway, tier };
}
