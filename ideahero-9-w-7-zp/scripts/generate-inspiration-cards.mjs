#!/usr/bin/env node

/**
 * Creates production-ready Idea Hero inspiration cards in three AI steps:
 * 1. invent unrelated surreal concepts;
 * 2. render each concept as a 4:3 card image;
 * 3. inspect the rendered image and write accessible Portuguese card copy.
 *
 * The resulting images, catalog JSON and SpacetimeDB source are all updated
 * together, so the new cards become available after the module is published.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { createGoogle } from "@ai-sdk/google";
import { generateImage, generateText, Output } from "ai";
import { format } from "prettier";
import { z } from "zod";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const STAGES = [
  "SCENARIO",
  "PROBLEM",
  "INSIGHT",
  "SOLUTION",
  "PROTOTYPE",
  "PILOT",
  "MARKETING",
  "SALES",
];
const DEFAULT_COUNT = 12;
const MAX_COUNT = 40;

function fail(message) {
  console.error(`\nError: ${message}`);
  process.exitCode = 1;
}

function usage() {
  console.log(`
Generate surreal Idea Hero inspiration cards.

Usage:
  npm run cards:generate -- --count 12
  npm run cards:generate -- --count 16 --run-name july-ideas
  npm run cards:dry-run -- --count 12

Options:
  --count <n>       Cards to create (default: ${DEFAULT_COUNT}, max: ${MAX_COUNT})
  --run-name <name> Output folder name (default: timestamp)
  --dry-run         Show the pipeline plan without calling Gemini or writing files
  --help            Show this help
`);
}

function parseArgs(argv) {
  const options = { count: DEFAULT_COUNT, dryRun: false, runName: "" };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--help" || argument === "-h") return { help: true };
    if (argument === "--dry-run") {
      options.dryRun = true;
      continue;
    }
    if (argument === "--count") {
      options.count = Number(argv[index + 1]);
      index += 1;
      continue;
    }
    if (argument === "--run-name") {
      options.runName = String(argv[index + 1] ?? "");
      index += 1;
      continue;
    }
    throw new Error(`Unknown option: ${argument}`);
  }
  if (
    !Number.isInteger(options.count) ||
    options.count < 10 ||
    options.count > MAX_COUNT
  ) {
    throw new Error(`--count must be an integer between 10 and ${MAX_COUNT}.`);
  }
  if (options.runName && !/^[a-z0-9][a-z0-9-]{0,48}$/i.test(options.runName)) {
    throw new Error(
      "--run-name may contain letters, numbers and hyphens only.",
    );
  }
  return options;
}

function runName(value) {
  return value || new Date().toISOString().replace(/[:.]/g, "-");
}

function cardId() {
  return randomUUID();
}

function extensionFor(mediaType) {
  const extensions = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
  };
  return extensions[mediaType] ?? "png";
}

function conceptsSchema(count) {
  return z.object({
    concepts: z
      .array(
        z.object({
          stage: z.enum(STAGES),
          imagePrompt: z.string().trim().min(80).max(900),
          creativeSeed: z.string().trim().min(12).max(180),
        }),
      )
      .length(count),
  });
}

const metadataSchema = z.object({
  title: z.string(),
  lens: z.string(),
  altText: z.string(),
  provocation: z.string(),
});

function conceptPrompt(count) {
  return `You are the imagination engine for Idea Hero, a collaborative innovation game in Brazilian Portuguese.

Invent exactly ${count} radically different visual prompts for inspiration cards. The feeling should be poetic, surprising and open to interpretation: surreal tabletop-card art, never a copy of an existing game's visual style. Mix dreamlike places, strange objects, creatures, paradoxes, quiet human moments and impossible natural phenomena.

Distribute the cards across these stages as evenly as possible: ${STAGES.join(", ")}.
Every imagePrompt must be in English, self-contained and visually specific. It must request an original 4:3 image with no readable text, no letters, no logo, no watermark, no frame and no collage borders. Avoid copyrighted characters, brands, political persuasion, stereotypes, gore and identifiable real people. Do not repeat central objects, color palettes or settings.

creativeSeed should be a concise English explanation of the unexpected association behind the scene. Return only the structured result.`;
}

function metadataPrompt({ stage, creativeSeed, imagePrompt }) {
  return `You are a Brazilian Portuguese card editor for Idea Hero, a collaborative innovation game.

Write the final copy for one ${stage} inspiration card. Its original creative association was: "${creativeSeed}". The image that was just rendered follows this exact art direction: "${imagePrompt}".

Return Portuguese (Brazil) only:
- title: evocative, 2 to 5 words, no punctuation at the end;
- lens: one short perspective word or phrase;
- altText: literal accessible description of the visible image, not an interpretation;
- provocation: one open, practical question that helps a team use this card during the ${stage} stage.

Do not claim details outside the art direction. Do not mention AI, a game, card or prompt. Return only the structured result.`;
}

function cleanMetadata(metadata) {
  const clean = (value, maxLength) => String(value).trim().slice(0, maxLength);
  const result = {
    title: clean(metadata.title, 56),
    lens: clean(metadata.lens, 32),
    altText: clean(metadata.altText, 220),
    provocation: clean(metadata.provocation, 220),
  };
  if (Object.values(result).some((value) => value.length < 2)) {
    throw new Error("Metadata generation returned an empty card field.");
  }
  return result;
}

async function generatedSource(cards) {
  return format(
    `/**\n * Generated by scripts/generate-inspiration-cards.mjs.\n * Do not hand-edit; generate a new run instead.\n */\nexport const GENERATED_CARD_CATALOG = ${JSON.stringify(cards, null, 2)} as const;\n`,
    { parser: "typescript" },
  );
}

async function writeJson(filename, value) {
  await writeFile(filename, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function readJsonIfPresent(filename) {
  try {
    return JSON.parse(await readFile(filename, "utf8"));
  } catch (error) {
    if (error && typeof error === "object" && error.code === "ENOENT") {
      return undefined;
    }
    throw error;
  }
}

function mergeCards(existing, additions) {
  const seen = new Set(existing.map((card) => card.id));
  return [...existing, ...additions.filter((card) => !seen.has(card.id))];
}

async function retryModelCall(label, request, attempts = 3) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await request();
    } catch (error) {
      lastError = error;
      if (attempt < attempts) {
        console.warn(
          `${label} did not return valid structured data (attempt ${attempt}/${attempts}); retrying…`,
        );
      }
    }
  }
  throw lastError;
}

async function main() {
  let options;
  try {
    options = parseArgs(process.argv.slice(2));
  } catch (error) {
    fail(error instanceof Error ? error.message : "Invalid arguments.");
    usage();
    return;
  }
  if (options.help) {
    usage();
    return;
  }

  const currentRun = runName(options.runName);
  if (options.dryRun) {
    console.log(
      `Dry run: would generate ${options.count} cards in ${currentRun}.`,
    );
    console.log("1. Gemini text creates unrelated surreal concepts.");
    console.log("2. Gemini image renders one 4:3 image per concept.");
    console.log(
      "3. Gemini text inspects each render and writes Portuguese metadata.",
    );
    console.log(
      "4. Images, a run manifest, client catalog and SpacetimeDB catalog are written.",
    );
    return;
  }

  if (!process.env.GEMINI_API_KEY) {
    fail(
      "GEMINI_API_KEY is missing. Put it in .env, then run this script with Node's --env-file option.",
    );
    return;
  }

  const imageDirectory = path.join(
    ROOT,
    "public",
    "cards",
    "generated",
    currentRun,
  );
  const runDirectory = path.join(ROOT, "output", "card-generation", currentRun);
  const catalogPath = path.join(ROOT, "src", "data", "cards-catalog.json");
  const generatedSourcePath = path.join(
    ROOT,
    "spacetimedb",
    "src",
    "generated-cards.ts",
  );
  await Promise.all([
    mkdir(imageDirectory, { recursive: true }),
    mkdir(runDirectory, { recursive: true }),
  ]);

  const google = createGoogle({ apiKey: process.env.GEMINI_API_KEY });
  const conceptsPath = path.join(runDirectory, "concepts.json");
  const storedConcepts = await readJsonIfPresent(conceptsPath);
  let concepts = storedConcepts;
  if (!Array.isArray(concepts) || concepts.length !== options.count) {
    console.log(`Creating ${options.count} distinct concepts…`);
    const conceptsResult = await retryModelCall("Concept generation", () =>
      generateText({
        model: google("gemini-flash-latest"),
        output: Output.object({ schema: conceptsSchema(options.count) }),
        prompt: conceptPrompt(options.count),
      }),
    );
    concepts = conceptsResult.output.concepts;
    await writeJson(conceptsPath, concepts);
  } else {
    console.log(
      `Resuming ${currentRun} with ${concepts.length} saved concepts…`,
    );
  }

  const manifestPath = path.join(runDirectory, "manifest.json");
  const savedManifest = await readJsonIfPresent(manifestPath);
  const generatedCards = Array.isArray(savedManifest?.cards)
    ? savedManifest.cards
    : [];
  for (const [index, concept] of concepts.entries()) {
    if (generatedCards[index]) continue;
    const position = `${index + 1}/${concepts.length}`;
    console.log(`[${position}] Rendering ${concept.stage}…`);
    const image = await retryModelCall("Image generation", async () => {
      const imageResult = await generateImage({
        model: google.image("gemini-2.5-flash-image"),
        prompt: `${concept.imagePrompt}\n\nUse case: illustration-story. Asset type: Idea Hero inspiration card. Composition: horizontal 4:3, clear central subject, a small amount of breathing room. Constraints: original surreal poetic illustration, no readable text, no letters, no logo, no watermark, no frame, no borders.`,
        aspectRatio: "4:3",
        n: 1,
      });
      if (!imageResult.image?.uint8Array?.length) {
        throw new Error(
          `Image generation returned no image for concept ${index + 1}.`,
        );
      }
      return imageResult.image;
    });

    const id = cardId();
    const extension = extensionFor(image.mediaType);
    const filename = `${String(index + 1).padStart(2, "0")}-${id}.${extension}`;
    const absoluteImagePath = path.join(imageDirectory, filename);
    await writeFile(absoluteImagePath, image.uint8Array);

    console.log(`[${position}] Writing Portuguese metadata…`);
    const copyResult = await retryModelCall("Metadata generation", () =>
      generateText({
        model: google("gemini-flash-latest"),
        output: Output.object({ schema: metadataSchema }),
        prompt: metadataPrompt(concept),
      }),
    );
    const copy = cleanMetadata(copyResult.output);
    const card = {
      id,
      stage: concept.stage,
      title: copy.title,
      lens: copy.lens,
      imagePath: `/cards/generated/${currentRun}/${filename}`,
      altText: copy.altText,
      provocation: copy.provocation,
    };
    generatedCards.push(card);
    await writeJson(manifestPath, {
      run: currentRun,
      completed: generatedCards.length,
      requested: options.count,
      cards: generatedCards,
    });
  }

  const existingCatalog = JSON.parse(await readFile(catalogPath, "utf8"));
  if (!Array.isArray(existingCatalog))
    throw new Error("cards-catalog.json must contain an array.");
  await writeJson(catalogPath, mergeCards(existingCatalog, generatedCards));

  let existingGenerated = [];
  try {
    const source = await readFile(generatedSourcePath, "utf8");
    const match = source.match(/=\s*(\[[\s\S]*\])\s+as const;/);
    if (match) existingGenerated = JSON.parse(match[1]);
  } catch {
    // The starter source is created below if it is not present.
  }
  await writeFile(
    generatedSourcePath,
    await generatedSource(mergeCards(existingGenerated, generatedCards)),
    "utf8",
  );
  await writeJson(manifestPath, {
    run: currentRun,
    completed: generatedCards.length,
    requested: options.count,
    cards: generatedCards,
  });

  console.log(`\nDone. ${generatedCards.length} cards added.`);
  console.log(`Images: public/cards/generated/${currentRun}`);
  console.log(
    "Next: npm run spacetime:build, then publish the module to make cards available in new rooms.",
  );
}

main().catch((error) =>
  fail(error instanceof Error ? error.message : "Generation failed."),
);
