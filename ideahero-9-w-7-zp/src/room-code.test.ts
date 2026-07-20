import { describe, expect, it, vi } from "vitest";
import { createRoomCode, createRoomWithAvailableCode } from "./room-code";

describe("código de sala", () => {
  it("gera três palavras aceitas pelo servidor", () => {
    const values = [0, 0.5, 0.999999];
    const code = createRoomCode(() => values.shift() ?? 0);

    expect(code).toMatch(/^[a-z0-9]+-[a-z0-9]+-[a-z0-9]+$/);
    expect(code.length).toBeLessThanOrEqual(24);
  });

  it("tenta outro código quando encontra uma colisão", async () => {
    const createRoom = vi
      .fn<(code: string) => Promise<void>>()
      .mockRejectedValueOnce(new Error("Este código de sala já está em uso."))
      .mockResolvedValueOnce();
    const values = [0, 0, 0, 0.1, 0.2, 0.3];

    await createRoomWithAvailableCode(createRoom, () => values.shift() ?? 0);

    expect(createRoom).toHaveBeenCalledTimes(2);
    expect(createRoom.mock.calls[0][0]).not.toBe(createRoom.mock.calls[1][0]);
  });

  it("não repete uma falha que não seja colisão", async () => {
    const error = new Error("Sem conexão com o servidor.");
    const createRoom = vi
      .fn<(code: string) => Promise<void>>()
      .mockRejectedValue(error);

    await expect(createRoomWithAvailableCode(createRoom)).rejects.toBe(error);
    expect(createRoom).toHaveBeenCalledTimes(1);
  });
});
