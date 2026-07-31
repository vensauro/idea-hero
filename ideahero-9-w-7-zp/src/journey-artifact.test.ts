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
  stageOutcomes: [],
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
    expect(markdown.match(/^## /gm)).toHaveLength(9);
  });

  it("gera nome de arquivo seguro e texto curto para compartilhamento", () => {
    expect(journeyFilename("  Inovação & Cuidado!  ")).toBe(
      "idea-hero-inovacao-cuidado.md",
    );
    expect(buildJourneyShareText(artifact.journey)).toBe(
      "Cidade que Cuida\n\nUma rede comunitária que transforma cuidado em ação local.\n\nJornada journey-42 criada com IDEA HERO.",
    );
  });

  it("inclui a composicao de uma etapa unida sem fingir que houve votacao", () => {
    const markdown = buildJourneyMarkdown({
      ...artifact,
      decisions: [],
      stageOutcomes: [
        {
          stage: "SCENARIO",
          resolution: "UNION",
          summary: "O lugar: Pracas abertas.\nAs pessoas: Vizinhos colaboram.",
          sourceCount: 2,
        },
      ],
    });

    expect(markdown).toContain("> **Composicao coletiva:**");
    expect(markdown).toContain("> O lugar: Pracas abertas.");
    expect(markdown).not.toContain("> **Escolha do grupo:**");
  });

  it("inclui o desfecho da etapa 9 final no markdown", () => {
    const markdown = buildJourneyMarkdown({
      ...artifact,
      stageInsights: [
        {
          stage: "FINAL",
          headline: "O Despertar da Cidade Conectada",
          body: "A jornada culminou em um grande movimento comunitário.",
        },
      ],
    });

    expect(markdown).toContain("## 9. Final");
    expect(markdown).toContain("> **Desfecho da etapa:**");
    expect(markdown).toContain("> **O Despertar da Cidade Conectada**");
    expect(markdown).toContain("> A jornada culminou em um grande movimento comunitário.");
  });
});
