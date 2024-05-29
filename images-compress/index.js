import { readdir, readFile } from "fs/promises";
import { join } from "path";
import sharp from "sharp";
import { parallel } from "radash";

const filenames = await readdir("original");
console.log("starting");
await parallel(10, filenames, async (filename) => {
  const file = await readFile(join("original", filename));
  await sharp(file)
    .resize({ width: 400 })
    .png({ quality: 80 })
    .toFile(join("compressed", filename));
});
console.log("ended");
