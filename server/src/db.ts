import type { Game } from "../../shared/game";
export type * from "../../shared/game";

// import { writeFile, readFile } from "fs/promises";

export let db = new Map<string, Game>();

const cleanupInterval = 60 * 60 * 12 * 1000;

function cleanupExpiredEntries() {
  const now = Date.now();
  for (const [key, value] of db.entries()) {
    if (value.expiresAt && now > value.expiresAt) {
      db.delete(key);
      console.log(`Entry with key '${key}' expired and removed by cleanup.`);
    }
  }
}

setInterval(cleanupExpiredEntries, cleanupInterval);


// readFile("./db-cache.json").then((value) => {
//   const oldDb = JSON.parse(value.toString());
//   db = new Map<string, Game>(oldDb);
// });

// const shutdown = async () => {
//   await writeFile("./db-cache.json", JSON.stringify([...db]));
//   process.exit();
// };
// process.on("SIGINT", () => {
//   shutdown();
// });

// process.on("SIGTERM", () => {
//   shutdown();
// });
