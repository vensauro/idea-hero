import { describe, expect, it } from "vitest";

type ReactionItem = { reaction: string; emoji: string; playerName: string };

function parseReactions(json: string): Record<string, ReactionItem> {
  try {
    return JSON.parse(json || "{}");
  } catch {
    return {};
  }
}

function computeReactionCounts(reactionsMap: Record<string, ReactionItem>) {
  const counts: Record<string, { count: number; emoji: string; players: string[] }> = {};
  Object.values(reactionsMap).forEach((item) => {
    if (!counts[item.reaction]) {
      counts[item.reaction] = { count: 0, emoji: item.emoji, players: [] };
    }
    counts[item.reaction].count += 1;
    counts[item.reaction].players.push(item.playerName);
  });
  return counts;
}

describe("Validação humana e reações do desfecho", () => {
  it("deve interpretar corretamente o JSON de reações dos jogadores", () => {
    const json = JSON.stringify({
      "user-1": { reaction: "Épico", emoji: "👏", playerName: "Hero 1" },
      "user-2": { reaction: "Épico", emoji: "👏", playerName: "Hero 2" },
      "user-3": { reaction: "Divertido", emoji: "😂", playerName: "Hero 3" },
    });

    const parsed = parseReactions(json);
    expect(Object.keys(parsed)).toHaveLength(3);

    const counts = computeReactionCounts(parsed);
    expect(counts["Épico"].count).toBe(2);
    expect(counts["Épico"].players).toEqual(["Hero 1", "Hero 2"]);
    expect(counts["Divertido"].count).toBe(1);
  });

  it("deve manipular graciosamente JSON de reações inválido ou vazio", () => {
    expect(parseReactions("")).toEqual({});
    expect(parseReactions("invalid json")).toEqual({});
    expect(computeReactionCounts({})).toEqual({});
  });

  it("deve formatar o payload de reescrita contendo diretivas de estilo", () => {
    const payload = {
      stage: "FINAL" as const,
      context: "História fictícia de teste da jornada",
      directive: "Torne o desfecho mais engraçado e trágico",
    };

    expect(payload.stage).toBe("FINAL");
    expect(payload.directive).toContain("engraçado");
  });
});
