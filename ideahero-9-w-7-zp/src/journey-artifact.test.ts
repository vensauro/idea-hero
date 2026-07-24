import { describe, expect, it } from "vitest";
import type { Player } from "./module_bindings/types";
import {
  buildJourneyMarkdown,
  buildJourneyShareText,
  journeyFilename,
  type JourneyArtifactInput,
} from "./journey-artifact";

function identity(hex: string) {
  return { toHexString: () => hex } as unknown as Player["identity"];
}

const ana = identity("aa");
const bia = identity("bb");

const artifact: JourneyArtifactInput = {
  journey: {
    title: "Cidade que Cuida",
    summary: "Uma rede comunitária que transforma cuidado em ação local.",
    publicId: "journey-42",
  },
  room: { code: "ideia-teste" },
  players: [
    { identity: ana, displayName: "Ana" },
    { identity: bia, displayName: "Bia" },
  ],
  contributions: [
    {
      id: 1n,
      stage: "SCENARIO",
      authorIdentity: ana,
      content: "Praças viram pontos de encontro entre gerações.",
    },
    {
      id: 2n,
      stage: "SCENARIO",
      authorIdentity: bia,
      content: "O bairro compartilha recursos e histórias.",
    },
  ],
  decisions: [
    {
      stage: "SCENARIO",
      selectedContributionId: 1n,
      summary: "Praças viram pontos de encontro entre gerações.",
      totalVotes: 1,
    },
  ],
  cards: [{ id: "scenario-1", title: "A praça suspensa", lens: "Encontro" }],
  cardDraws: [{ stage: "SCENARIO", cardId: "scenario-1" }],
};

describe("artefato compartilhável da jornada", () => {
  it("preserva manifesto, carta, decisão e contribuições no Markdown", () => {
    const markdown = buildJourneyMarkdown(artifact);

    expect(markdown).toContain("# Cidade que Cuida");
    expect(markdown).toContain("**Heróis:** Ana, Bia");
    expect(markdown).toContain("**Carta:** A praça suspensa · lente Encontro");
    expect(markdown).toContain(
      "> **Escolha do grupo:** Praças viram pontos de encontro entre gerações.",
    );
    expect(markdown).toContain(
      "- O bairro compartilha recursos e histórias. — Bia",
    );
    expect(markdown.match(/^## /gm)).toHaveLength(8);
  });

  it("gera nome de arquivo seguro e texto curto para compartilhamento", () => {
    expect(journeyFilename("  Inovação & Cuidado!  ")).toBe(
      "idea-hero-inovacao-cuidado.md",
    );
    expect(buildJourneyShareText(artifact.journey)).toBe(
      "Cidade que Cuida\n\nUma rede comunitária que transforma cuidado em ação local.\n\nJornada journey-42 criada com IDEA HERO.",
    );
  });
});
