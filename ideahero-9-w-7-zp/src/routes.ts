import { index, route, type RouteConfig } from "@react-router/dev/routes";

export default [
  index("./routes/home.tsx"),
  route("decks", "./routes/decks.tsx"),
  route("decks/:deckId", "./routes/decks.$deckId.tsx"),
  route("api/decks/ai-tag", "./routes/api.decks.ai-tag.ts"),
  route("api/decks/ai-generate", "./routes/api.decks.ai-generate.ts"),
  route("api/voice", "./routes/api.voice.ts"),
  route("api/storage", "./routes/api.storage.ts"),
  route("api/image-studio", "./routes/api.image-studio.ts"),
  route("api/stage-insight", "./routes/api.stage-insight.ts"),
  route("admin", "./routes/admin.tsx"),
  route("api/admin/cards", "./routes/api.admin.cards.ts"),
] satisfies RouteConfig;
