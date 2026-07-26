import { createGoogle } from "@ai-sdk/google";
import { generateImage, generateText, Output } from "ai";
import { z } from "zod";
import { uploadPrototypeFile } from "../object-storage.server";

const MAX_IMAGE_BYTES = 25 * 1024 * 1024;
const imageTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const visualConceptSchema = z.object({
  title: z.string().trim().min(2).max(56),
  description: z.string().trim().min(12).max(180),
  prompt: z.string().trim().min(20).max(700),
  tags: z.array(z.string().trim().min(2).max(22)).min(2).max(4),
});

const studioOutputSchema = z.object({
  extractedContent: z.string().trim().min(2).max(240),
  concepts: z.array(visualConceptSchema).length(6),
});

function json(body: unknown, status = 200) {
  return Response.json(body, { status });
}

function normalizedImageType(type: string) {
  return type.split(";", 1)[0]?.trim().toLowerCase() ?? "";
}

function isRoomId(value: string) {
  return /^\d+$/.test(value);
}

function studioPrompt(idea: string, hasReference: boolean) {
  return `Voce e diretor(a) de arte do Idea Hero, um jogo colaborativo de criacao de ideias em portugues brasileiro.

Crie exatamente 6 direcoes visuais distintas para uma imagem horizontal 4:3 de carta de inspiracao. A ideia do grupo e: "${idea}".

${hasReference ? "A imagem anexada e uma referencia visual. Extraia somente elementos relevantes para a ideia e nao invente logotipos, pessoas identificaveis ou texto legivel." : "Nao ha imagem de referencia; proponha imagens originais a partir da ideia."}

Para cada direcao, escreva um titulo curto, uma descricao clara, 2 a 4 tags e um prompt em portugues pronto para um gerador de imagens. Os prompts devem pedir composicao sem texto, sem letras, sem logos, com assunto claro, boa luz e espaco negativo para a interface. Varie o tratamento entre fotografia editorial, colagem, ilustraçao, cena humana abstrata, close de objeto e ambiente. Evite estereotipos e afirmacoes factuais nao comprovadas.`;
}

async function createVisualDirections({
  google,
  idea,
  reference,
}: {
  google: ReturnType<typeof createGoogle>;
  idea: string;
  reference?: File;
}) {
  const text = {
    type: "text" as const,
    text: studioPrompt(idea, Boolean(reference)),
  };
  const content = reference
    ? [
        text,
        {
          type: "file" as const,
          mediaType: reference.type,
          data: new Uint8Array(await reference.arrayBuffer()),
        },
      ]
    : [text];

  const result = await generateText({
    model: google("gemini-flash-latest"),
    output: Output.object({ schema: studioOutputSchema }),
    messages: [{ role: "user", content }],
  });
  return result.output;
}

export async function action({ request }: { request: Request }) {
  if (request.method !== "POST") {
    return json({ error: "Use POST para trabalhar uma imagem." }, 405);
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return json(
      { error: "O estúdio de imagens ainda não está configurado." },
      503,
    );
  }

  try {
    const formData = await request.formData();
    const operation = String(formData.get("operation") ?? "");
    const roomId = String(formData.get("roomId") ?? "");
    const idea = String(formData.get("idea") ?? "")
      .trim()
      .slice(0, 500);
    if (!isRoomId(roomId)) {
      return json({ error: "A sala informada não é válida." }, 400);
    }
    const google = createGoogle({ apiKey });

    if (operation === "directions" || operation === "analyze") {
      if (idea.length < 2) {
        return json(
          { error: "Conte em poucas palavras o que a imagem deve comunicar." },
          400,
        );
      }
      let reference: File | undefined;
      let referenceKey: string | undefined;
      if (operation === "analyze") {
        const uploaded = formData.get("image");
        if (!(uploaded instanceof File) || uploaded.size === 0) {
          return json(
            { error: "Escolha uma imagem válida para analisar." },
            400,
          );
        }
        if (uploaded.size > MAX_IMAGE_BYTES) {
          return json({ error: "Use uma imagem de até 25 MB." }, 413);
        }
        const imageType = normalizedImageType(uploaded.type);
        if (!imageTypes.has(imageType)) {
          return json({ error: "Use JPG, PNG, WEBP ou GIF." }, 415);
        }
        reference = new File([await uploaded.arrayBuffer()], uploaded.name, {
          type: imageType,
        });
        referenceKey = await uploadPrototypeFile({ roomId, file: reference });
      }

      const output = await createVisualDirections({ google, idea, reference });
      return json({ ...output, referenceKey });
    }

    if (operation === "generate") {
      const prompt = String(formData.get("prompt") ?? "")
        .trim()
        .slice(0, 900);
      const title = String(formData.get("title") ?? "Imagem criada com IA")
        .trim()
        .slice(0, 120);
      if (prompt.length < 20) {
        return json(
          { error: "Escolha uma direção visual antes de gerar." },
          400,
        );
      }
      const imageResult = await generateImage({
        model: google.image("gemini-2.5-flash-image"),
        prompt: `${prompt}\n\nImagem horizontal 4:3 para uma carta de inspiração. Sem texto, letras, marcas, logos ou marcas-d'agua.`,
        aspectRatio: "4:3",
        n: 1,
      });
      const generated = imageResult.image;
      const imageType = normalizedImageType(generated.mediaType);
      if (!imageTypes.has(imageType)) {
        throw new Error(
          "O gerador devolveu um formato de imagem não suportado.",
        );
      }
      const extension =
        imageType === "image/jpeg" ? "jpg" : imageType.split("/")[1];
      const file = new File([generated.uint8Array], `${title}.${extension}`, {
        type: imageType,
      });
      const key = await uploadPrototypeFile({ roomId, file });
      return json({ key, caption: title });
    }

    return json({ error: "A operação do estúdio não é válida." }, 400);
  } catch (error) {
    console.error("Image studio failed", error);
    return json(
      { error: "Não foi possível criar esta imagem agora. Tente novamente." },
      502,
    );
  }
}
