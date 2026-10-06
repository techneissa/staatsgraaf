// Run summary (research/qa/live-run-latest.json) and the weekly review queue
// (research/qa/live-review-queue.md) of `bun run live`.

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";

import { formatDateNL } from "./live-util.mjs";

export const SUMMARY_FILE = "research/qa/live-run-latest.json";
export const QUEUE_FILE = "research/qa/live-review-queue.md";

const QUEUE_HEADER = [
  "# Live review queue",
  "",
  "Entries the live run (`bun run live`, ADR 0024) lists for a weekly human glance: medium-confidence identity matches, bulk events applied, new persons, new parties and positions, closures without an official end date, and named gaps. No entry blocks the data: the run applies what the guard allows and lists it here. The file is appended and deduplicated by the key in the comment at the end of each line; tick a box when reviewed.",
  "",
  "",
].join("\n");

const KIND_LABEL = {
  "bulk-event": "bulkwijziging",
  "new-person": "nieuwe persoon",
  "new-fractie": "nieuwe fractie",
  "fractie-gone": "verdwenen fractie",
  "new-position": "nieuwe positie",
  "unknown-start": "onbekende start",
  "closed-without-official-end": "sluiting zonder bronrij",
  "identity-conflict": "identiteit twijfel",
  "identity-ambiguous": "identiteit dubbelzinnig",
  gap: "gap",
  "stopped-by-guard": "gestopt door de bewaking",
  "name-change": "naamswijziging",
  "seat-change": "zetelwijziging",
  dissolved: "opgeheven",
  "new-gemeente": "nieuwe gemeente",
  "acting-changed": "waarnemend gewijzigd",
  "source-difference": "bronverschil",
};

export function reviewKey(entry) {
  return String(entry.key ?? `${entry.kind}|${entry.text}`).replace(/-->/g, "--&gt;");
}

function renderLine(entry, today) {
  const label = KIND_LABEL[entry.kind] ?? entry.kind;
  return `- [ ] ${formatDateNL(today)} ${label}: ${entry.text.replace(/\s+/g, " ").trim()} <!-- key: ${reviewKey(entry)} -->`;
}

/** Entries not yet in the queue (by key), appended below the existing lines. Returns the entries that were added. */
export async function appendReviewQueue(root, entries, today) {
  const path = join(root, QUEUE_FILE);
  let current = "";
  try {
    current = await readFile(path, "utf8");
  } catch {
    current = "";
  }
  const known = new Set([...current.matchAll(/<!-- key: (.*?) -->/g)].map((match) => match[1]));
  const added = [];
  for (const entry of entries) {
    const key = reviewKey(entry);
    if (known.has(key)) continue;
    known.add(key);
    added.push(entry);
  }
  if (added.length === 0 && current !== "") return added;
  const base = current === "" ? QUEUE_HEADER : current.endsWith("\n") ? current : `${current}\n`;
  const next = `${base}${added.map((entry) => renderLine(entry, today)).join("\n")}${added.length > 0 ? "\n" : ""}`;
  if (next !== current) {
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, next, "utf8");
  }
  return added;
}

export async function writeSummary(root, summary) {
  const path = join(root, SUMMARY_FILE);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
  return path;
}
