export type InsightOption = {
  key: string;
  title: string;
  description: string;
  learning: string;
};

export type InsightReaction = {
  headline: string;
  body: string;
  options: InsightOption[];
};

export type InsightJourney = {
  title: string;
  summary: string;
};

export type InsightStage = {
  stage: string;
  label: string;
  decision?: string;
  outcome?: string;
  contributions: string[];
};

export type InsightContextInput = {
  contributions?: ReadonlyArray<{
    stage: string;
    content: string;
  }>;
  decisions?: ReadonlyArray<{
    stage: string;
    summary: string;
  }>;
  stageOutcomes?: ReadonlyArray<{
    stage: string;
    summary: string;
  }>;
  stageInsights?: ReadonlyArray<{
    stage: string;
    selectedLearning?: string;
    selectedKey?: string;
  }>;
  prototype?: {
    challengeTitle?: string;
    caption?: string;
  };
  testingOption?: {
    title: string;
    description: string;
    impact: string;
  };
};

const STAGE_LABELS: Record<string, string> = {
  SCENARIO: "Cenario",
  PROBLEM: "Problema",
  INSIGHT: "Insight",
  SOLUTION: "Solucao",
  POLISHING: "Lapidacao",
  PROTOTYPE: "Prototipo",
  TESTING: "Teste",
  CONQUERING: "Conquista",
  FINAL: "Final",
};

const STAGE_ORDER = [
  "SCENARIO",
  "PROBLEM",
  "INSIGHT",
  "SOLUTION",
  "POLISHING",
  "PROTOTYPE",
  "TESTING",
  "CONQUERING",
];

function clean(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

export function buildInsightContext(input: InsightContextInput): {
  stages: InsightStage[];
  prototype?: { challengeTitle?: string; caption?: string };
  testingOption?: { title: string; description: string; impact: string };
  learnings: string[];
} {
  const decisionsByStage = new Map(
    (input.decisions ?? []).map((item) => [item.stage, clean(item.summary)]),
  );
  const outcomesByStage = new Map(
    (input.stageOutcomes ?? [])
      .filter((item) => item.summary)
      .map((item) => [item.stage, clean(item.summary)]),
  );
  const contributionsByStage = new Map<string, string[]>();
  for (const item of input.contributions ?? []) {
    const text = clean(item.content);
    if (!text) continue;
    const list = contributionsByStage.get(item.stage) ?? [];
    list.push(text);
    contributionsByStage.set(item.stage, list);
  }

  const stages: InsightStage[] = STAGE_ORDER.map((stage) => {
    const stageContributions = (contributionsByStage.get(stage) ?? []).slice(
      0,
      6,
    );
    const decision = decisionsByStage.get(stage);
    const outcome = outcomesByStage.get(stage);
    if (!decision && !outcome && stageContributions.length === 0) {
      return { stage, label: STAGE_LABELS[stage] ?? stage, contributions: [] };
    }
    return {
      stage,
      label: STAGE_LABELS[stage] ?? stage,
      decision,
      outcome,
      contributions: stageContributions,
    };
  }).filter(
    (item) => item.decision || item.outcome || item.contributions.length > 0,
  );

  const learnings = (input.stageInsights ?? [])
    .map((item) => item.selectedLearning)
    .filter((value): value is string => Boolean(value && value.trim()));

  return {
    stages,
    prototype: input.prototype,
    testingOption: input.testingOption,
    learnings,
  };
}

export function serializeInsightContext(
  context: ReturnType<typeof buildInsightContext>,
) {
  const lines: string[] = [];
  for (const stage of context.stages) {
    lines.push(`[${stage.label}]`);
    if (stage.decision) lines.push(`Escolha do grupo: ${stage.decision}`);
    if (stage.outcome) lines.push(`Composicao coletiva: ${stage.outcome}`);
    for (const contribution of stage.contributions) {
      lines.push(`- ${contribution}`);
    }
  }
  if (context.prototype) {
    lines.push("[Prototipo]");
    if (context.prototype.challengeTitle)
      lines.push(`Desafio: ${context.prototype.challengeTitle}`);
    if (context.prototype.caption)
      lines.push(`Legenda: ${context.prototype.caption}`);
  }
  if (context.testingOption) {
    lines.push("[Teste escolhido]");
    lines.push(
      `${context.testingOption.title}: ${context.testingOption.description}`,
    );
    lines.push(`Impacto esperado: ${context.testingOption.impact}`);
  }
  if (context.learnings.length > 0) {
    lines.push("[Aprendizados da equipe]");
    for (const learning of context.learnings) lines.push(`- ${learning}`);
  }
  return lines.join("\n");
}
