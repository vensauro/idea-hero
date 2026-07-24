import { describe, expect, it } from "vitest";
import { latestOpenSession } from "./room-session";

describe("recuperação de sala", () => {
  it("ignora a jornada concluída e mantém a sala aberta mais recente", () => {
    const current = latestOpenSession([
      { status: "FINISHED", joinedAt: 30, value: "jornada-antiga" },
      { status: "ACTIVE", joinedAt: 20, value: "jornada-atual" },
      { status: "LOBBY", joinedAt: 10, value: "lobby" },
    ]);

    expect(current?.value).toBe("jornada-atual");
  });

  it("ignora uma participação que a pessoa encerrou", () => {
    const current = latestOpenSession([
      { status: "ACTIVE", joinedAt: 20, active: false, value: "antiga" },
      { status: "LOBBY", joinedAt: 10, active: true, value: "nova" },
    ]);

    expect(current?.value).toBe("nova");
  });
  it("não recupera nada quando todas as jornadas foram concluídas", () => {
    expect(
      latestOpenSession([{ status: "FINISHED", joinedAt: 1, value: 1 }]),
    ).toBeUndefined();
  });
});
