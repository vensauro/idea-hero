import { index, route, type RouteConfig } from "@react-router/dev/routes";

export default [
  index("./routes/home.tsx"),
  route("api/voice", "./routes/api.voice.ts"),
  route("api/storage", "./routes/api.storage.ts"),
  route("api/image-studio", "./routes/api.image-studio.ts"),
] satisfies RouteConfig;
