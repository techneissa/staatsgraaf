import { readdir, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const outDir = fileURLToPath(new URL("../out/", import.meta.url));

const KEEP = new Set(["index.txt"]);

async function walk(dir) {
  let files = 0;
  let removed = 0;
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = `${dir}/${entry.name}`;
    if (entry.isDirectory()) {
      const nested = await walk(path);
      files += nested.files;
      removed += nested.removed;
      continue;
    }
    files += 1;
    if (entry.name.endsWith(".txt") && entry.name.startsWith("__next") && !KEEP.has(entry.name)) {
      await rm(path);
      removed += 1;
    }
  }
  return { files, removed };
}

const { files, removed } = await walk(outDir);
console.log(`prune-export: ${files} files before prune, removed ${removed} RSC prefetch payloads, ${files - removed} remain`);

// Cloudflare Pages Free rejects a deployment over 20,000 files. Warn at 15,000
// so growth shows well before the cap. New pages add files fast: a route costs
// one index.html and one index.txt.
if (files - removed > 15000 && files - removed <= 20000) {
  console.warn(`prune-export: warning, ${files - removed} files is over 15000; the Cloudflare Pages Free cap is 20000`);
}

if (files - removed > 20000) {
  console.error("prune-export: export still has more than 20000 files, which Cloudflare Pages Free rejects");
  process.exitCode = 1;
}
