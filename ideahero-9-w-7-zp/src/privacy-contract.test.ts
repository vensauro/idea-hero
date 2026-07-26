import { describe, expect, it } from "vitest";
import moduleSource from "../spacetimedb/src/index.ts?raw";
import bindingsSource from "./module_bindings/index.ts?raw";

describe("contrato de privacidade por sala", () => {
  it("mantém os dados de jornada privados e expõe somente views autorizadas", () => {
    for (const tableName of [
      "profile",
      "room",
      "player",
      "contribution",
      "card_draw",
      "stage_session",
      "vote",
      "decision",
      "journey",
    ]) {
      expect(moduleSource).toContain(`{ name: "${tableName}" }`);
      expect(moduleSource).not.toContain(
        `{ name: "${tableName}", public: true }`,
      );
    }

    expect(moduleSource).toContain(
      '{ name: "published_result", public: true }',
    );

    for (const viewName of [
      "current_profile",
      "member_rooms",
      "room_players",
      "room_card_draws",
      "room_stage_sessions",
      "visible_contributions",
      "room_contribution_status",
      "own_votes",
      "room_vote_status",
      "room_decisions",
      "room_journeys",
    ]) {
      expect(moduleSource).toContain(`name: "${viewName}", public: true`);
      expect(bindingsSource).toContain(`name: '${viewName}'`);
    }
  });

  it("não envia conteúdo alheio durante contribuição nem escolhas de voto", () => {
    expect(moduleSource).toContain('activeSession?.phase === "CONTRIBUTING"');
    expect(moduleSource).toContain("!item.authorIdentity.isEqual(ctx.sender)");
    expect(moduleSource).toContain("authorIdentity: hideAuthor ? undefined");
    expect(moduleSource).toContain(
      "ctx.db.vote.voterIdentity.filter(ctx.sender)",
    );
    expect(moduleSource).toContain("room_vote_status");
    expect(moduleSource).not.toContain("contributionId: item.contributionId");
  });
});
