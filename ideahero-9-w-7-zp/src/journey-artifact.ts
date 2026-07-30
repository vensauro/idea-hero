import type {
  Card,
  CardDraw,
  Contribution,
  Decision,
  Journey,
  Player,
  Room,
  StageOutcome,
} from "./module_bindings/types";

const ARTIFACT_STAGES = [
  ["SCENARIO", "Cenário"],
  ["PROBLEM", "Problema"],
  ["INSIGHT", "Insight"],
  ["SOLUTION", "Solução"],
  ["PROTOTYPE", "Protótipo"],
  ["PILOT", "Piloto"],
  ["MARKETING", "Marketing"],
  ["SALES", "Vendas"],
] as const;

export type JourneyArtifactInput = {
  journey: Pick<Journey, "title" | "summary" | "publicId">;
  room: Pick<Room, "code">;
  players: readonly Pick<Player, "identity" | "displayName">[];
  contributions: readonly Pick<
    Contribution,
    "id" | "stage" | "authorIdentity" | "content"
  >[];
  decisions: readonly Pick<
    Decision,
    "stage" | "selectedContributionId" | "summary" | "totalVotes"
  >[];
  stageOutcomes: readonly Pick<
    StageOutcome,
    "stage" | "resolution" | "summary" | "sourceCount"
  >[];
  cards: readonly Pick<Card, "id" | "title" | "lens">[];
  cardDraws: readonly Pick<CardDraw, "stage" | "cardId">[];
};

function cleanText(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function sameIdentity(
  left?: { toHexString?: () => string } | null,
  right?: { toHexString?: () => string } | null,
) {
  if (!left || !right) return false;
  if (left === right) return true;
  if (typeof left.toHexString !== "function" || typeof right.toHexString !== "function") {
    return false;
  }
  return left.toHexString() === right.toHexString();
}

function contributionAuthor(
  contribution: JourneyArtifactInput["contributions"][number],
  players: JourneyArtifactInput["players"],
) {
  return (
    players.find((player) =>
      sameIdentity(player.identity, contribution.authorIdentity),
    )?.displayName ?? "Participante"
  );
}

export function buildJourneyMarkdown(input: JourneyArtifactInput) {
  const lines = [
    `# ${cleanText(input.journey.title)}`,
    "",
    cleanText(input.journey.summary),
    "",
    `**Jornada:** ${input.journey.publicId}`,
    `**Heróis:** ${input.players.map((player) => player.displayName).join(", ")}`,
    "",
    "---",
  ];

  ARTIFACT_STAGES.forEach(([stage, label], index) => {
    const entries = input.contributions.filter((item) => item.stage === stage);
    const decision = input.decisions.find((item) => item.stage === stage);
    const stageOutcome = input.stageOutcomes.find(
      (item) => item.stage === stage,
    );
    const draw = input.cardDraws.find((item) => item.stage === stage);
    const card = draw
      ? input.cards.find((item) => item.id === draw.cardId)
      : undefined;

    lines.push("", `## ${index + 1}. ${label}`);
    if (card) {
      lines.push(`**Carta:** ${card.title} · lente ${card.lens}`);
    }
    if (decision) {
      lines.push(
        "",
        `> **Escolha do grupo:** ${cleanText(decision.summary)}`,
        `> ${decision.totalVotes} ${decision.totalVotes === 1 ? "voto" : "votos"}`,
      );
    }
    if (stageOutcome) {
      lines.push(
        "",
        `> **${stageOutcome.resolution === "FACILITATOR" ? "Registro da etapa" : "Composicao coletiva"}:**`,
        ...stageOutcome.summary
          .split("\n")
          .map((entry) => `> ${cleanText(entry)}`),
      );
    }

    const supportingEntries = decision
      ? entries.filter((item) => item.id !== decision.selectedContributionId)
      : entries;
    if (supportingEntries.length > 0) {
      lines.push(
        "",
        decision ? "**Outras contribuições:**" : "**Contribuições:**",
      );
      for (const entry of supportingEntries) {
        lines.push(
          `- ${cleanText(entry.content)} — ${contributionAuthor(entry, input.players)}`,
        );
      }
    }
    if (!decision && !stageOutcome && supportingEntries.length === 0) {
      lines.push("", "_Etapa sem registro._");
    }
  });

  lines.push("", "---", "Criado colaborativamente com IDEA HERO.", "");
  return lines.join("\n");
}

export function buildJourneyShareText(
  journey: Pick<Journey, "title" | "summary" | "publicId">,
) {
  return [
    cleanText(journey.title),
    "",
    cleanText(journey.summary),
    "",
    `Jornada ${journey.publicId} criada com IDEA HERO.`,
  ].join("\n");
}

export function journeyFilename(title: string) {
  const slug = title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 52);
  return `idea-hero-${slug || "jornada"}.md`;
}
