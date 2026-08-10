import { createGoogle } from "@ai-sdk/google";
import { generateText, Output } from "ai";
import { z } from "zod";
import { uploadPrototypeFile } from "../object-storage.server";

const MAX_IMAGE_BYTES = 25 * 1024 * 1024;
const imageTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const aiTagSchema = z.object({
  title: z.string().trim().min(2).max(60).describe("Título curto evocativo (2 a 5 palavras)"),
  lens: z.string().trim().min(2).max(40).describe("Lente ou foco conceitual (ex: Padrão, Tensão, Perspectiva)"),
  provocation: z.string().trim().min(10).max(200).describe("Pergunta provocativa para inspirar inovação"),
  altText: z.string().trim().min(5).max(180).describe("Descrição acessível da cena"),
  tags: z.array(z.string().trim().min(2).max(25)).min(2).max(6).describe("Tags temáticas e visuais"),
});

function json(body: unknown, status = 200) {
  return Response.json(body, { status });
}

export async function action({ request }: { request: Request }) {
  if (request.method !== "POST") {
    return json({ error: "Utilize POST para tageamento por IA." }, 405);
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
    const file = formData.get("image");
    const stage = String(formData.get("stage") ?? "SCENARIO").toUpperCase();
    const promptHint = String(formData.get("prompt") ?? "").trim();
    const deckId = String(formData.get("deckId") ?? "custom");

    if (!(file instanceof File) || file.size === 0) {
      return json({ error: "Envie um arquivo de imagem válido." }, 400);
    }
    if (file.size > MAX_IMAGE_BYTES) {
      return json({ error: "A imagem deve ter no máximo 25 MB." }, 413);
    }

    const type = file.type.toLowerCase();
    if (!imageTypes.has(type)) {
      return json({ error: "Formato de imagem não suportado (use JPG, PNG, WEBP ou GIF)." }, 415);
    }

    // 1. Upload image to object storage or static cards path
    let imagePath = "";
    try {
      if (process.env.OBJECT_STORAGE_REGION) {
        const key = await uploadPrototypeFile({
          roomId: `deck-${deckId}`,
          file,
        });
        imagePath = `/api/storage?key=${encodeURIComponent(key)}`;
      }
    } catch (storageErr) {
      console.warn("Storage upload failed, falling back to data URL or preview:", storageErr);
    }

    // If no storage configured, convert to data URL for instant display
    if (!imagePath) {
      const buffer = await file.arrayBuffer();
      const base64 = Buffer.from(buffer).toString("base64");
      imagePath = `data:${file.type};base64,${base64}`;
    }

    // 2. Perform AI Vision analysis with Gemini
    const google = createGoogle({ apiKey });
    const imageBytes = new Uint8Array(await file.arrayBuffer());

    const result = await generateText({
      model: google("gemini-flash-latest"),
      output: Output.object({ schema: aiTagSchema }),
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Você é o diretor de arte e redação do Idea Hero, um jogo de inovação colaborativa.
Analise a imagem enviada para uma carta da etapa de jogo "${stage}".
${promptHint ? `Instrução adicional do usuário: "${promptHint}".` : ""}

Gere metadados marcantes e instigantes em português brasileiro:
1. title: Título poético/evocativo curto (2-5 palavras).
2. lens: Foco de perspectiva ou ângulo criativo.
3. provocation: Uma pergunta aberta e provocativa que estimule ideias sem respostas simples.
4. altText: Descrição objetiva da imagem para leitores de tela.
5. tags: 2 a 6 palavras-chave que resumam os temas visuais e conceituais.`,
            },
            {
              type: "file",
              mediaType: file.type,
              data: imageBytes,
            },
          ],
        },
      ],
    });

    return json({
      success: true,
      imagePath,
      metadata: result.output,
    });
  } catch (error) {
    console.error("Error in AI Tagging API:", error);
    return json({ error: "Falha ao analisar a imagem com a IA." }, 500);
  }
}
