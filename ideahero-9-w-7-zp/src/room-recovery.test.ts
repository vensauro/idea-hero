import { afterEach, describe, expect, it } from "vitest";
import {
  clearRecoverableRoom,
  recoverableRoomCode,
  ROOM_RECOVERY_KEY,
  saveRecoverableRoom,
} from "./room-recovery";

describe("retomada da sala", () => {
  afterEach(() => localStorage.clear());

  it("guarda um código válido para restaurar a jornada", () => {
    saveRecoverableRoom(" Ideia-AbC123 ");
    expect(localStorage.getItem(ROOM_RECOVERY_KEY)).toBe("ideia-abc123");
    expect(recoverableRoomCode()).toBe("ideia-abc123");
  });

  it("não guarda códigos inválidos e permite limpar a retomada", () => {
    saveRecoverableRoom("invalido com espaços");
    expect(recoverableRoomCode()).toBeUndefined();
    saveRecoverableRoom("sala-valida");
    clearRecoverableRoom();
    expect(recoverableRoomCode()).toBeUndefined();
  });
});
