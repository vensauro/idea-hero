import { createGoogle } from "@ai-sdk/google";
import { generateText, Output } from "ai";
import { z } from "zod";

const MAX_AUDIO_BYTES = 5 * 1024 * 1024;
const acceptedAudioTypes = new Set([
  "audio/webm",
  "audio/mp4",
  "audio/mpeg",
  "audio/mpga",
  "audio/wav",
  "audio/x-wav",
  "audio/ogg",
]);
const acceptedStages = new Set([
  "SCENARIO",
  "PROBLEM",
  "INSIGHT",
  "SOLUTION",
  "PROTOTYPE",
  "PILOT",
  "MARKETING",
  "SALES",
  "JOURNEY",
]);

type VoiceTarget = "contribution" | "journey-summary";

function json(body: unknown, status = 200) {
  return Response.json(body, { status });
}

function normalizedAudioType(type: string) {
  return type.split(";", 1)[0]?.trim().toLowerCase() ?? "";
}

function voicePrompt(stage: string, target: VoiceTarget, maxLength: number) {
  const field =
    target === "contribution"
      ? "uma contribuicao para a etapa"
      : "o manifesto final da jornada";

  return `Ouca o audio em portugues brasileiro e devolva apenas o objeto solicitado.

O campo e ${field}. A etapa e ${stage}.

- transcript: transcricao fiel do que a pessoa disse, preservando o idioma e o sentido. Remova apenas sons sem significado, como hesitacoes repetidas.
- summary: uma versao curta e clara da mesma ideia, adequada a ${field}, com no maximo ${maxLength} caracteres. Nao invente fatos, pessoas, promessas ou detalhes que nao estejam no audio.
- Se nao houver fala compreensivel, devolva transcript e summary como strings vazias.`;
}

export async function action({ request }: { request: Request }) {
  if (request.method !== "POST") {
    return json({ error: "Use POST para enviar um audio." }, 405);
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return json(
      { error: "A transcricao por voz ainda nao esta configurada." },
      503,
    );
  }

  try {
    const formData = await request.formData();
    const audio = formData.get("audio");
    const requestedStage = String(formData.get("stage") ?? "").toUpperCase();
    const target = formData.get("target");

    if (!(audio instanceof File) || audio.size === 0) {
      return json({ error: "Envie uma gravacao de audio valida." }, 400);
    }
    if (audio.size > MAX_AUDIO_BYTES) {
      return json({ error: "A gravacao deve ter no maximo 5 MB." }, 413);
    }
    const audioType = normalizedAudioType(audio.type);
    if (!acceptedAudioTypes.has(audioType)) {
      return json({ error: "Este formato de audio nao e compativel." }, 415);
    }
    if (!acceptedStages.has(requestedStage)) {
      return json({ error: "A etapa da jornada e invalida." }, 400);
    }
    if (target !== "contribution" && target !== "journey-summary") {
      return json({ error: "O campo de destino e invalido." }, 400);
    }

    const maxLength = target === "contribution" ? 280 : 400;
    const google = createGoogle({ apiKey });
    const result = await generateText({
      model: google("gemini-flash-latest"),
      output: Output.object({
        schema: z.object({
          transcript: z.string().trim().max(2_000),
          summary: z.string().trim().max(maxLength),
        }),
      }),
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: voicePrompt(requestedStage, target, maxLength),
            },
            {
              type: "file",
              mediaType: audioType,
              data: new Uint8Array(await audio.arrayBuffer()),
            },
          ],
        },
      ],
    });

    return json(result.output);
  } catch (error) {
    console.error("Voice transcription failed", error);
    return json(
      { error: "Nao foi possivel transcrever a gravacao. Tente novamente." },
      502,
    );
  }
}
