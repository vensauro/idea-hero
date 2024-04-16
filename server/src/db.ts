import type { Game } from "../../shared/game";
export type * from "../../shared/game";

import { writeFile, readFile } from "fs/promises";

export let db = new Map<string, Game>();

readFile("./db-cache.json").then((value) => {
  const oldDb = JSON.parse(value.toString());
  db = new Map<string, Game>(oldDb);
});

const shutdown = async () => {
  await writeFile("./db-cache.json", JSON.stringify([...db]));
  process.exit();
};
process.on("SIGINT", () => {
  shutdown();
});

process.on("SIGTERM", () => {
  shutdown();
});
