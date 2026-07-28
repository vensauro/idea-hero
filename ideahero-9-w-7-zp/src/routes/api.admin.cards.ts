import fs from "node:fs";
import path from "node:path";
import { createGoogle } from "@ai-sdk/google";
import { generateText, Output } from "ai";
import { z } from "zod";
import { uploadPrototypeFile } from "../object-storage.server";
import initialCards from "../data/cards-catalog.json";

export interface CardItem {
  id: string;
  stage: string;
  title: string;
  lens: string;
  imagePath: string;
  altText: string;
  provocation: string;
  custom?: boolean;
}

const CATALOG_PATH = path.resolve(process.cwd(), "src/data/cards-catalog.json");
const PUBLIC_CARDS_DIR = path.resolve(process.cwd(), "public/cards");

function readCatalog(): CardItem[] {
  try {
    if (fs.existsSync(CATALOG_PATH)) {
      const content = fs.readFileSync(CATALOG_PATH, "utf-8");
      return JSON.parse(content) as CardItem[];
    }
  } catch (error) {
    console.error("Failed to read cards catalog file:", error);
  }
  return initialCards as CardItem[];
}

function writeCatalog(cards: CardItem[]) {
  try {
    const dir = path.dirname(CATALOG_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(CATALOG_PATH, JSON.stringify(cards, null, 2), "utf-8");
  } catch (error) {
    console.error("Failed to write cards catalog file:", error);
  }
}

function json(body: unknown, status = 200) {
  return Response.json(body, { status });
}

export async function loader() {
  const cards = readCatalog();
  const stages = [
    "SCENARIO",
    "PROBLEM",
    "INSIGHT",
    "SOLUTION",
    "PROTOTYPE",
    "PILOT",
    "MARKETING",
    "SALES",
  ];
  return json({ cards, stages });
}

export async function action({ request }: { request: Request }) {
  if (request.method !== "POST") {
    return json(
      { error: "Utilize POST para operações no catálogo de cartas." },
      405,
    );
  }

  try {
    const formData = await request.formData();
    const actionType = String(formData.get("action") ?? "");
    const cards = readCatalog();

    if (actionType === "update_metadata") {
      const id = String(formData.get("id") ?? "");
      const title = String(formData.get("title") ?? "").trim();
      const lens = String(formData.get("lens") ?? "").trim();
      const provocation = String(formData.get("provocation") ?? "").trim();
      const altText = String(formData.get("altText") ?? "").trim();
      const imagePath = String(formData.get("imagePath") ?? "").trim();

      const index = cards.findIndex((c) => c.id === id);
      if (index === -1) {
        return json({ error: "Carta não encontrada." }, 404);
      }

      if (title) cards[index].title = title;
      if (lens) cards[index].lens = lens;
      if (provocation) cards[index].provocation = provocation;
      if (altText) cards[index].altText = altText;
      if (imagePath) cards[index].imagePath = imagePath;

      writeCatalog(cards);
      return json({ success: true, card: cards[index] });
    }

    if (actionType === "upload_picture") {
      const id = String(formData.get("id") ?? "");
      const file = formData.get("file");

      const index = cards.findIndex((c) => c.id === id);
      if (index === -1) {
        return json({ error: "Carta não encontrada." }, 404);
      }

      if (!(file instanceof File) || file.size === 0) {
        return json({ error: "Envie um arquivo de imagem válido." }, 400);
      }

      const extMap: Record<string, string> = {
        "image/jpeg": "jpg",
        "image/png": "png",
        "image/webp": "webp",
        "image/gif": "gif",
      };
      const ext = extMap[file.type.toLowerCase()] || "webp";
      const filename = `card_${id}_${Date.now()}.${ext}`;

      // Save locally to public/cards/
      if (!fs.existsSync(PUBLIC_CARDS_DIR)) {
        fs.mkdirSync(PUBLIC_CARDS_DIR, { recursive: true });
      }
      const localFilePath = path.join(PUBLIC_CARDS_DIR, filename);
      const buffer = Buffer.from(await file.arrayBuffer());
      fs.writeFileSync(localFilePath, buffer);

      let imagePath = `/cards/${filename}`;

      // Optionally attempt object storage upload if configured
      try {
        if (process.env.OBJECT_STORAGE_REGION) {
          const key = await uploadPrototypeFile({
            roomId: "admin-cards",
            file: new File([buffer], filename, { type: file.type }),
          });
          imagePath = `/api/storage?key=${encodeURIComponent(key)}`;
        }
      } catch {
        // Fall back gracefully to local static path
      }

      cards[index].imagePath = imagePath;
      cards[index].custom = true;
      writeCatalog(cards);

      return json({ success: true, card: cards[index] });
    }

    if (actionType === "create_card") {
      const stage = String(formData.get("stage") ?? "").toUpperCase();
      const title = String(formData.get("title") ?? "").trim();
      const lens = String(formData.get("lens") ?? "").trim();
      const provocation = String(formData.get("provocation") ?? "").trim();
      const altText = String(formData.get("altText") ?? "").trim();
      const imagePath = String(
        formData.get("imagePath") ?? "/cards/idea-hero-logo.svg",
      ).trim();

      if (!stage || !title) {
        return json({ error: "Etapa e Título são obrigatórios." }, 400);
      }

      const newCard: CardItem = {
        id: crypto.randomUUID(),
        stage,
        title,
        lens: lens || "Geral",
        provocation:
          provocation || "Qual é o próximo passo para este conceito?",
        altText: altText || title,
        imagePath,
        custom: true,
      };

      cards.push(newCard);
      writeCatalog(cards);
      return json({ success: true, card: newCard });
    }

    if (actionType === "delete_card") {
      const id = String(formData.get("id") ?? "");
      const newCards = cards.filter((c) => c.id !== id);
      writeCatalog(newCards);
      return json({ success: true });
    }

    if (actionType === "reset_card") {
      const id = String(formData.get("id") ?? "");
      const index = cards.findIndex((c) => c.id === id);
      if (index !== -1) {
        cards[index].imagePath = `/cards/${cards[index].id.split("-")[0]}.webp`;
        cards[index].custom = false;
        writeCatalog(cards);
        return json({ success: true, card: cards[index] });
      }
      return json({ error: "Carta não encontrada." }, 404);
    }

    if (actionType === "generate_ai_metadata") {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return json(
          { error: "A API do Gemini (GEMINI_API_KEY) não está configurada." },
          503,
        );
      }

      const stage = String(formData.get("stage") ?? "SCENARIO").toUpperCase();
      const currentTitle = String(formData.get("title") ?? "").trim();
      const currentProvocation = String(
        formData.get("provocation") ?? "",
      ).trim();
      const prompt = String(formData.get("prompt") ?? "").trim();

      const google = createGoogle({ apiKey });
      const metadataSchema = z.object({
        title: z.string().describe("Título curto evocativo (2 a 5 palavras)"),
        lens: z.string().describe("Lente ou foco de perspectiva"),
        provocation: z.string().describe("Pergunta provocativa profunda"),
        altText: z.string().describe("Descrição de cena para acessibilidade"),
      });

      const result = await generateText({
        model: google("gemini-flash-latest"),
        output: Output.object({ schema: metadataSchema }),
        messages: [
          {
            role: "user",
            content: `Você é o diretor de arte e redação do Idea Hero, um jogo de inovação colaborativa em português brasileiro.
Crie metadados aprimorados e inspiradores para uma carta da etapa "${stage}".
${currentTitle ? `Título atual: "${currentTitle}".` : ""}
${currentProvocation ? `Provocação atual: "${currentProvocation}".` : ""}
${prompt ? `Orientações adicionais: "${prompt}".` : ""}

Devolva um objeto com título, lente, provocação e altText em português.`,
          },
        ],
      });

      return json({ success: true, suggestion: result.output });
    }

    return json({ error: "Ação não reconhecida." }, 400);
  } catch (error) {
    console.error("Admin cards API error:", error);
    return json({ error: "Ocorreu um erro ao processar a requisição." }, 500);
  }
}
