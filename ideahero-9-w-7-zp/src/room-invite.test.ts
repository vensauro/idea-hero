import { describe, expect, it } from "vitest";
import {
  buildRoomInviteUrl,
  clearRoomInviteUrl,
  extractRoomCode,
  normalizeInviteCode,
  roomCodeFromUrl,
} from "./room-invite";

describe("convite de sala", () => {
  it("normaliza apenas códigos aceitos pelo servidor", () => {
    expect(normalizeInviteCode(" Ideia-AbC123 ")).toBe("ideia-abc123");
    expect(normalizeInviteCode("não vale")).toBeUndefined();
    expect(normalizeInviteCode("abc")).toBeUndefined();
  });

  it("cria e recupera uma URL de convite sem parâmetros obsoletos", () => {
    const invite = buildRoomInviteUrl(
      "IDEIA-AbC123",
      "https://idea.example/jogar?utm_source=teste#fim",
    );

    expect(invite).toBe("https://idea.example/jogar?sala=ideia-abc123");
    expect(roomCodeFromUrl(invite)).toBe("ideia-abc123");
  });

  it("aceita o parâmetro legado room e limpa somente dados do convite", () => {
    expect(roomCodeFromUrl("https://idea.example/?room=grupo-42")).toBe(
      "grupo-42",
    );
    expect(
      clearRoomInviteUrl(
        "https://idea.example/jogar?sala=grupo-42&utm_source=amigo#fim",
      ),
    ).toBe("/jogar?utm_source=amigo");
  });

  it("extrai códigos de URLs coladas no input da sala", () => {
    expect(
      extractRoomCode("https://ideahero.app/?sala=super-hero-12"),
    ).toBe("super-hero-12");

    expect(
      extractRoomCode("http://localhost:5173/jogar?room=minha-sala"),
    ).toBe("minha-sala");

    expect(
      extractRoomCode("https://example.com/?codigo=hero-code-42"),
    ).toBe("hero-code-42");

    expect(
      extractRoomCode("ideahero.app/?sala=link-direto"),
    ).toBe("link-direto");

    expect(
      extractRoomCode("https://ideahero.app/sala/codigo-secreto"),
    ).toBe("codigo-secreto");

    expect(
      extractRoomCode("https://ideahero.app/room/sala-galera"),
    ).toBe("sala-galera");

    expect(
      extractRoomCode(" SALA-SECRETA "),
    ).toBe("sala-secreta");

    expect(
      extractRoomCode("https://google.com"),
    ).toBeUndefined();
  });
});

