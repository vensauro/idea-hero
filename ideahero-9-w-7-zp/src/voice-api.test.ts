import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { action } from "./routes/api.voice";

describe("api.voice stage validation", () => {
  const originalKey = process.env.GEMINI_API_KEY;

  beforeEach(() => {
    delete process.env.GEMINI_API_KEY;
  });

  afterEach(() => {
    process.env.GEMINI_API_KEY = originalKey;
  });

  it("rejects non-POST request", async () => {
    const request = new Request("http://localhost/api/voice", { method: "GET" });
    const response = await action({ request });
    expect(response.status).toBe(405);
  });

  it("validates stage name before API key when form data is valid", async () => {
    process.env.GEMINI_API_KEY = "dummy-key";
    
    // Test that FINAL is accepted stage
    const formFinal = new FormData();
    formFinal.append("audio", new File([new Uint8Array([1, 2, 3])], "test.webm", { type: "audio/webm" }));
    formFinal.append("stage", "FINAL");
    formFinal.append("target", "contribution");

    const reqFinal = new Request("http://localhost/api/voice", {
      method: "POST",
      body: formFinal,
    });

    const resFinal = await action({ request: reqFinal });
    if (resFinal.status === 400) {
      const body = await resFinal.json();
      expect(body.error).not.toBe("A etapa da jornada e invalida.");
    }
  });
});
