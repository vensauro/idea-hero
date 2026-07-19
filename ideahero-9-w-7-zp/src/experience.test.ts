import { describe, expect, it } from "vitest";
import { BOARD_STATES } from "./App";
import { STAGE_GUIDANCE } from "./stage-guidance";
import { CARD_CATALOG, cardForRoomStage } from "../spacetimedb/src/cards";

describe("experiência canônica do Idea Hero", () => {
  it("preserva as oito etapas na ordem definida pelo produto", () => {
    expect(BOARD_STATES).toEqual([
      "SCENARIO",
      "PROBLEM",
      "INSIGHT",
      "SOLUTION",
      "PROTOTYPE",
      "PILOT",
      "MARKETING",
      "SALES",
    ]);
  });

  it("oferece duas cartas curadas e acessíveis para cada etapa", () => {
    for (const stage of BOARD_STATES) {
      const stageCards = CARD_CATALOG.filter((card) => card.stage === stage);
      expect(stageCards).toHaveLength(2);
      for (const card of stageCards) {
        expect(card.imagePath).toMatch(/^\/cards\/.+\.webp$/);
        expect(card.altText.length).toBeGreaterThan(30);
        expect(card.provocation.length).toBeGreaterThan(20);
      }
    }
  });

  it("sorteia de forma determinística dentro do baralho da etapa", () => {
    for (const stage of BOARD_STATES) {
      const first = cardForRoomStage("ideia-teste", stage);
      const replay = cardForRoomStage("ideia-teste", stage);
      expect(replay.id).toBe(first.id);
      expect(first.stage).toBe(stage);
    }
  });

  it("explica ação, escrita e próximo acontecimento em todas as etapas", () => {
    for (const stage of BOARD_STATES) {
      const guidance = STAGE_GUIDANCE[stage];
      expect(guidance.steps).toHaveLength(3);
      expect(guidance.placeholder.length).toBeGreaterThan(10);
      expect(guidance.next.length).toBeGreaterThan(20);
    }
  });
});
