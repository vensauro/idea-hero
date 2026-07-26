import { describe, expect, it } from "vitest";
import {
  buildPublicResultUrl,
  publicResultTokenFromUrl,
} from "./public-result-link";

const token = "ab12cd34ef56ab78cd90ef12ab34cd56ef78";

describe("link publico de resultado", () => {
  it("cria uma URL limpa e recupera o token", () => {
    const url = buildPublicResultUrl(
      token,
      "https://idea.example/jogar?sala=grupo-42#fim",
    );

    expect(url).toBe(`https://idea.example/jogar?resultado=${token}`);
    expect(publicResultTokenFromUrl(url)).toBe(token);
  });

  it("recusa tokens curtos ou fora do formato", () => {
    expect(
      publicResultTokenFromUrl("https://idea.example/?resultado=abc"),
    ).toBeUndefined();
    expect(() =>
      buildPublicResultUrl("not-a-token", "https://idea.example"),
    ).toThrow();
  });
});
