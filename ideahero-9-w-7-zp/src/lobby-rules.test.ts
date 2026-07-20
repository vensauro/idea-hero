import { describe, expect, it } from "vitest";
import { lobbyStartState, MAX_PARTICIPANTS } from "./lobby-rules";
import moduleSource from "../spacetimedb/src/index.ts?raw";

describe("regras de início do lobby", () => {
  it("exige pelo menos duas pessoas mesmo quando o anfitrião está pronto", () => {
    expect(lobbyStartState([{ ready: true }])).toEqual({
      allReady: true,
      canStart: false,
      missingParticipants: 1,
    });
  });

  it("exige que todas as pessoas estejam prontas", () => {
    expect(lobbyStartState([{ ready: true }, { ready: false }])).toEqual({
      allReady: false,
      canStart: false,
      missingParticipants: 0,
    });
  });

  it("permite iniciar de duas a seis pessoas quando todas estão prontas", () => {
    const players = Array.from({ length: MAX_PARTICIPANTS }, () => ({
      ready: true,
    }));

    expect(lobbyStartState(players)).toEqual({
      allReady: true,
      canStart: true,
      missingParticipants: 0,
    });
  });

  it("impõe a mesma regra no reducer autoritativo", () => {
    expect(moduleSource).toContain("const MIN_PLAYERS = 2");
    expect(moduleSource).toContain("roomPlayers.length < MIN_PLAYERS");
    expect(moduleSource).toContain(
      "São necessários pelo menos 2 jogadores para começar.",
    );
  });
});
