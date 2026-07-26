export const INITIAL_RUNWAY = 10_000;
export const CARD_REDRAW_COST = 500;

export const BOARD_STAGES = [
  "SCENARIO",
  "PROBLEM",
  "INSIGHT",
  "SOLUTION",
  "PROTOTYPE",
  "PILOT",
  "MARKETING",
  "SALES",
] as const;

export type EconomyStage = (typeof BOARD_STAGES)[number];
export type PrototypeFidelity = "LEAN" | "FOCUSED" | "ROBUST";
export type PilotOutcome = "PROMISING" | "MIXED" | "FRICTION";

export const STAGE_COST_LABELS: Record<EconomyStage, string> = {
  SCENARIO: "Pesquisa",
  PROBLEM: "Descoberta",
  INSIGHT: "Análise",
  SOLUTION: "Design",
  PROTOTYPE: "Construção",
  PILOT: "Teste",
  MARKETING: "Preparação do lançamento",
  SALES: "Operação de lançamento",
};

const COST_PAIRS = [
  [250, 500],
  [500, 750],
  [750, 1_000],
  [500, 750],
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
    return ordered.map((amount, offset) => {
      const stage = BOARD_STAGES[pairIndex * 2 + offset];
      return { stage, amount, label: STAGE_COST_LABELS[stage] };
    });
  });
}

export const FUNDING_STAGES = [
  "INSIGHT",
  "SOLUTION",
  "PROTOTYPE",
  "PILOT",
] as const satisfies readonly EconomyStage[];

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

export const PROTOTYPE_FIDELITIES: Record<
  PrototypeFidelity,
  {
    label: string;
    cost: number;
    promising: number;
    mixed: number;
    friction: number;
  }
> = {
  LEAN: {
    label: "Lean",
    cost: 500,
    promising: 20,
    mixed: 50,
    friction: 30,
  },
  FOCUSED: {
    label: "Focado",
    cost: 1_000,
    promising: 30,
    mixed: 50,
    friction: 20,
  },
  ROBUST: {
    label: "Robusto",
    cost: 1_500,
    promising: 40,
    mixed: 45,
    friction: 15,
  },
};

export function resolvePilotOutcome(
  seed: number,
  fidelity: PrototypeFidelity,
): PilotOutcome {
  const probabilities = PROTOTYPE_FIDELITIES[fidelity];
  const roll = deterministicIndex(seed, 30, 100);
  if (roll < probabilities.promising) return "PROMISING";
  if (roll < probabilities.promising + probabilities.mixed) return "MIXED";
  return "FRICTION";
}

export function pilotReadinessBonus(outcome: PilotOutcome) {
  if (outcome === "PROMISING") return 2_000;
  if (outcome === "MIXED") return 1_000;
  return 0;
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
  readinessBonus: number;
  multiplier: number;
}) {
  const simulatedSales = roundToHundred(
    ((5_000 + input.marketingInvestment + input.readinessBonus) *
      input.multiplier) /
      100,
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
