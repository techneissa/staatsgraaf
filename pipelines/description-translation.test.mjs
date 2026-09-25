import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { descriptionSourceHash } from "../shared/description-translation-hash.mjs";
import {
  checkDescriptionTranslation,
  descriptionState,
  descriptionTask,
  mergeDescriptionRecordSets,
  mergeDescriptionTranslations,
  runApi,
  runDescriptionExport,
  runDescriptionMerge,
} from "./translate.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const ORG = { id: "org:ministerie-van-financien", name: "Ministerie van Financiën", description: "Ministerie dat sinds 1798 de rijksfinanciën beheert." };
const PERSON = { id: "person:jan", name: "Jan", description: "Minister van Financiën sinds 2024." };

async function tempData({ orgs = [ORG], people = [PERSON], records = null } = {}) {
  const dir = await mkdtemp(join(tmpdir(), "desc-"));
  await writeFile(join(dir, "news.json"), "[]");
  await writeFile(join(dir, "organizations.json"), JSON.stringify(orgs));
  await writeFile(join(dir, "people.json"), JSON.stringify(people));
  if (records) await writeFile(join(dir, "description-translations.json"), JSON.stringify(records));
  return dir;
}

test("descriptionSourceHash is the first 12 hex characters of sha256 of the description", () => {
  for (const text of [ORG.description, "Curaçao", ""]) {
    assert.equal(descriptionSourceHash(text), createHash("sha256").update(text, "utf8").digest("hex").slice(0, 12));
  }
});

test("checkDescriptionTranslation keeps numbers, tags and dashes honest", () => {
  const task = descriptionTask(ORG);
  assert.deepEqual(checkDescriptionTranslation(task, { text: "Ministry that has managed the central government finances since 1798." }), []);
  assert.ok(checkDescriptionTranslation(task, { text: "Ministry that has managed the central government finances since 1789." }).some((p) => p.includes("1798")));
  assert.ok(checkDescriptionTranslation(task, { text: "Ministry — managing central government finances since 1798." }).includes("dash added"));
  assert.deepEqual(checkDescriptionTranslation(task, { text: "" }), ["empty text"]);
});

test("export and merge round trip, then the state is current", async () => {
  const dir = await tempData();
  const files = await runDescriptionExport({ dataDir: dir, dir: join(dir, "out"), size: 1, log: () => {} });
  assert.equal(files.length, 2);
  const exported = JSON.parse(await readFile(files[0], "utf8"));
  assert.equal(exported[0].sourceHash, descriptionSourceHash(exported[0].nl));
  const filled = join(dir, "filled.json");
  await writeFile(filled, JSON.stringify([
    { id: ORG.id, text: "Ministry that has managed the central government finances since 1798." },
    { id: PERSON.id, text: "Minister van Financiën since 2024." },
  ]));
  const result = await runDescriptionMerge({ dataDir: dir, files: [filled], date: "2026-09-25", log: () => {} });
  assert.equal(result.merged, 2);
  const saved = JSON.parse(await readFile(join(dir, "description-translations.json"), "utf8"));
  assert.deepEqual(saved.map((r) => [r.id, r.field, r.language, r.method, r.engine]), [
    [ORG.id, "description", "en", "claude-code-session", "claude-opus-5-5"],
    [PERSON.id, "description", "en", "claude-code-session", "claude-opus-5-5"],
  ]);
  const state = descriptionState([ORG, PERSON], saved);
  assert.equal(state.current.length, 2);
  const changed = descriptionState([{ ...ORG, description: "Anders." }, PERSON], saved);
  assert.equal(changed.stale.length, 1);
});

test("mergeDescriptionTranslations rejects an entry exported from an older description", () => {
  const result = mergeDescriptionTranslations({
    entities: [ORG],
    records: [],
    entries: [{ id: ORG.id, sourceHash: "000000000000", text: "Ministry since 1798." }],
    engine: "e",
    method: "claude-code-session",
    date: "2026-09-25",
  });
  assert.equal(result.merged, 0);
  assert.equal(result.rejected.length, 1);
});

test("mergeDescriptionRecordSets prefers the record whose hash matches", () => {
  const base = { field: "description", language: "en", sourceLanguage: "nl", text: "x 1798", engine: "e", method: "opencode-zen" };
  const stale = { ...base, id: ORG.id, sourceHash: "000000000000", translated: "2026-09-20" };
  const current = { ...base, id: ORG.id, sourceHash: descriptionSourceHash(ORG.description), translated: "2026-09-25" };
  assert.deepEqual(mergeDescriptionRecordSets([ORG], [stale], [current]), [current]);
});

test("api mode translates missing descriptions through the provider and caches them next to the news cache", async () => {
  const dir = await tempData();
  const requests = [];
  const client = {
    messages: {
      async create(request) {
        requests.push(request);
        const input = JSON.parse(request.messages[0].content.split("\n\n")[1]);
        const items = input.items.map((item) => ({ id: item.id, text: item.id === ORG.id ? "Ministry that has managed the central government finances since 1798." : "Minister van Financiën since 2024." }));
        return { stop_reason: "end_turn", content: [{ type: "text", text: JSON.stringify({ items }) }] };
      },
    },
  };
  await mkdir(join(dir, "cache"), { recursive: true });
  const cacheFile = join(dir, "cache", "news-translations.json");
  const result = await runApi({ dataDir: dir, client, cacheFile, date: "2026-09-25", log: () => {} });
  assert.equal(result.descriptions.translated, 2);
  assert.ok(requests[0].system.includes("descriptions"));
  const cached = JSON.parse(await readFile(join(dir, "cache", "description-translations.json"), "utf8"));
  assert.equal(cached.length, 2);
  assert.equal(cached[0].method, "anthropic-api");
  const again = await runApi({ dataDir: dir, client, cacheFile, log: () => {} });
  assert.equal(again.descriptions.requests, 0);
});

test("api mode without a key leaves descriptions alone", async () => {
  const dir = await tempData();
  const lines = [];
  const result = await runApi({ dataDir: dir, env: {}, log: (line) => lines.push(line) });
  assert.equal(result.descriptions.translated, 0);
  assert.equal(result.descriptions.remaining, 2);
  assert.ok(lines.some((line) => line.includes("description(s)")));
});

test("data/description-translations.json: every record is current and passes the checks", () => {
  const file = join(ROOT, "data", "description-translations.json");
  if (!existsSync(file)) return;
  const entities = [
    ...JSON.parse(readFileSync(join(ROOT, "data", "organizations.json"), "utf8")),
    ...JSON.parse(readFileSync(join(ROOT, "data", "people.json"), "utf8")),
    ...JSON.parse(readFileSync(join(ROOT, "data", "topics.json"), "utf8")),
  ];
  const byId = new Map(entities.map((e) => [e.id, e]));
  for (const record of JSON.parse(readFileSync(file, "utf8"))) {
    const entity = byId.get(record.id);
    assert.ok(entity?.description, `${record.id} has no description`);
    if (record.sourceHash !== descriptionSourceHash(entity.description)) continue;
    assert.deepEqual(checkDescriptionTranslation(descriptionTask(entity), record), [], record.id);
  }
});
