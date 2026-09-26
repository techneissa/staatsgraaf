// Small WebP copies of the portraits for the places that show them small
// (avatars, the seat loupe, search results, person tiles): 160 px wide, which
// covers a 52 px tile at three device pixels per CSS pixel. The originals stay
// for the person page. Derived at build time; lib/thumb.ts maps a portrait URL
// to its copy, and a missing copy falls back to the original.
import { mkdirSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const here = dirname(fileURLToPath(import.meta.url));
const SOURCE = join(here, "..", "public", "media", "portretten");
const TARGET = join(SOURCE, "klein");
const WIDTH = 160;

mkdirSync(TARGET, { recursive: true });
let made = 0;
let kept = 0;
let bytesIn = 0;
let bytesOut = 0;
for (const name of readdirSync(SOURCE).sort()) {
  if (!/\.(jpe?g|png|webp)$/i.test(name)) continue;
  const from = join(SOURCE, name);
  const to = join(TARGET, name.replace(/\.[^.]+$/, ".webp"));
  const source = statSync(from);
  bytesIn += source.size;
  let fresh = false;
  try {
    fresh = statSync(to).mtimeMs >= source.mtimeMs;
  } catch {
    // Not made yet.
  }
  if (!fresh) {
    await sharp(from).resize({ width: WIDTH, withoutEnlargement: true }).webp({ quality: 72 }).toFile(to);
    made += 1;
  } else {
    kept += 1;
  }
  bytesOut += statSync(to).size;
}
console.log(
  `thumbs: ${made} made, ${kept} kept, ${(bytesIn / 1024 / 1024).toFixed(1)} MiB of portraits as ${(bytesOut / 1024 / 1024).toFixed(1)} MiB of thumbnails`,
);
