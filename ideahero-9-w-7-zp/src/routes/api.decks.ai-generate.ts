import { createGoogle } from "@ai-sdk/google";
import { generateImage, generateText, Output } from "ai";
import { z } from "zod";
import { uploadPrototypeFile } from "../object-storage.server";

const STAGES = [
  "SCENARIO",
  "PROBLEM",
  "INSIGHT",
  "SOLUTION",
  "POLISHING",
  "CONQUERING",
] as const;

const cardConceptSchema = z.object({
  stage: z.string().describe("Etapa do jogo (SCENARIO, PROBLEM, INSIGHT, etc.)"),
  title: z.string().trim().min(2).max(60),
  lens: z.string().trim().min(2).max(40),
  provocation: z.string().trim().min(10).max(200),
  altText: z.string().trim().min(5).max(180),
  imagePrompt: z.string().trim().min(20).max(500).describe("Prompt visual detalhado em português para geração da imagem 4:3"),
  tags: z.array(z.string().trim()).min(2).max(5),
});

const fullDeckSchema = z.object({
  deckName: z.string().trim().min(3).max(60),
  description: z.string().trim().min(10).max(250),
  cards: z.array(cardConceptSchema).min(3).max(9),
});

function json(body: unknown, status = 200) {
  return Response.json(body, { status });
}

export async function action({ request }: { request: Request }) {
  if (request.method !== "POST") {
    return json({ error: "Utilize POST para geração por IA." }, 405);
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return json(
      { error: "A API do Gemini (GEMINI_API_KEY) não está configurada." },
      503,
    );
  }

  try {
    const formData = await request.formData();
    const mode = String(formData.get("mode") ?? "single"); // "single" | "deck"
    const topic = String(formData.get("topic") ?? "").trim();
    const stage = String(formData.get("stage") ?? "SCENARIO").toUpperCase();
    const deckId = String(formData.get("deckId") ?? "ai-deck");

    if (topic.length < 3) {
      return json({ error: "Descreva um tema ou conceito visual com mais de 3 caracteres." }, 400);
    }

    const google = createGoogle({ apiKey });

    // Mode A: Single Card AI Generation
    if (mode === "single") {
      const singleSchema = z.object({
        card: cardConceptSchema,
      });

      const textGen = await generateText({
        model: google("gemini-flash-latest"),
        output: Output.object({ schema: singleSchema }),
        messages: [
          {
            role: "user",
            content: `Você é o diretor criativo do jogo Idea Hero.
Crie um conceito de carta para a etapa "${stage}" a partir do tema: "${topic}".

Preencha com título poético, lente, provocação instigante, altText e um imagePrompt descritivo (sem texto, logos ou marcas).`,
          },
        ],
      });

      const concept = textGen.output.card;

      // Generate AI image
      let imagePath = "/cards/idea-hero-logo.svg";
      try {
        const imageResult = await generateImage({
          model: google.image("gemini-2.5-flash-image"),
          prompt: `${concept.imagePrompt}\n\nImagem horizontal 4:3 para carta de jogo de inspiração. Estilo artístico expressivo e marcante. Sem letras, sem texto, sem logos.`,
          aspectRatio: "4:3",
          n: 1,
        });

        const generated = imageResult.image;
        const file = new File([generated.uint8Array], `card_${Date.now()}.png`, {
          type: "image/png",
        });

        if (process.env.OBJECT_STORAGE_REGION) {
          const key = await uploadPrototypeFile({ roomId: `deck-${deckId}`, file });
          imagePath = `/api/storage?key=${encodeURIComponent(key)}`;
        } else {
          const base64 = Buffer.from(generated.uint8Array).toString("base64");
          imagePath = `data:image/png;base64,${base64}`;
        }
      } catch (imgErr) {
        console.warn("AI Image generation fallback:", imgErr);
      }

      return json({
        success: true,
        card: {
          ...concept,
          stage,
          imagePath,
        },
      });
    }

    // Mode B: Full Deck AI Generation
    if (mode === "deck") {
      const deckGen = await generateText({
        model: google("gemini-flash-latest"),
        output: Output.object({ schema: fullDeckSchema }),
        messages: [
          {
            role: "user",
            content: `Você é o designer mestre de baralhos do Idea Hero.
Crie um baralho completo temático sobre: "${topic}".
O baralho deve conter cartas cobrindo as principais etapas: SCENARIO, PROBLEM, INSIGHT, SOLUTION, PROTOTYPE, PILOT, MARKETING, SALES.

Devolva o nome do baralho, descrição e as cartas correspondentes.`,
          },
        ],
      });

      return json({
        success: true,
        deck: deckGen.output,
      });
    }

    return json({ error: "Modo de geração inválido." }, 400);
  } catch (error) {
    console.error("Error in AI Generation API:", error);
    return json({ error: "Ocorreu um erro ao gerar com a IA." }, 500);
  }
}
