import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import {
  entityTags,
  newsLead,
  sha256Hex,
  translationSourceHash,
  translationTargetLanguage,
} from "../shared/news-translation-hash.mjs";
import {
  checkTranslation,
  mergeRecordSets,
  mergeTranslations,
  pendingTasks,
  parseBatchReply,
  PROVIDERS,
  pruneOrphans,
  resolveProvider,
  runApi,
  runExport,
  runMerge,
  translationState,
  translationTask,
} from "./translate.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

const ITEM_NL = {
  id: "news:aaaa0001",
  title: "Kabinet valt",
  language: "nl",
  published: "2026-09-24T10:00:00.000Z",
  summaryMarkup:
    'Kabinet valt — De <entity id="org:tweede-kamer">Tweede Kamer</entity> stemde in met een motie van wantrouwen tegen <entity id="person:jan-jansen">Jansen</entity>.',
};
const ITEM_EN = {
  id: "news:aaaa0002",
  title: "Dutch cabinet falls",
  language: "en",
  published: "2026-09-24T09:00:00.000Z",
  summaryMarkup: "Dutch cabinet falls",
};

test("sha256Hex matches node:crypto on ASCII, UTF-8 and block-boundary lengths", () => {
  const samples = ["", "abc", "Financiën — ‘quote’", "x".repeat(55), "x".repeat(56), "y".repeat(64), "z".repeat(1000)];
  for (const sample of samples) {
    assert.equal(sha256Hex(sample), createHash("sha256").update(sample, "utf8").digest("hex"));
  }
});

test("translationSourceHash is the first 12 hex of sha256(title\\nmarkup)", () => {
  const expected = createHash("sha256").update(`${ITEM_NL.title}\n${ITEM_NL.summaryMarkup}`, "utf8").digest("hex").slice(0, 12);
  assert.equal(translationSourceHash(ITEM_NL.title, ITEM_NL.summaryMarkup), expected);
  assert.equal(translationSourceHash("Kop", null), createHash("sha256").update("Kop\n").digest("hex").slice(0, 12));
  assert.match(translationSourceHash("Kop", undefined), /^[0-9a-f]{12}$/);
});

test("newsLead strips the title prefix and keeps entity tags", () => {
  assert.equal(
    newsLead(ITEM_NL.summaryMarkup, ITEM_NL.title),
    'De <entity id="org:tweede-kamer">Tweede Kamer</entity> stemde in met een motie van wantrouwen tegen <entity id="person:jan-jansen">Jansen</entity>.',
  );
  assert.equal(newsLead(ITEM_EN.summaryMarkup, ITEM_EN.title), null);
  assert.equal(newsLead(null, "Kop"), null);
  assert.equal(newsLead("Kop — kort", "Kop"), null);
  assert.deepEqual(entityTags(newsLead(ITEM_NL.summaryMarkup, ITEM_NL.title)), [
    '<entity id="org:tweede-kamer">Tweede Kamer</entity>',
    '<entity id="person:jan-jansen">Jansen</entity>',
  ]);
});

test("newsLead agrees with stripTitleFromMarkup in web/lib/news-text.ts on every news item", async () => {
  const webModule = join(ROOT, "web", "lib", "news-text.ts");
  if (!existsSync(webModule)) return;
  const { stripTitleFromMarkup } = await import(webModule);
  const news = JSON.parse(readFileSync(join(ROOT, "data", "news.json"), "utf8"));
  const fixtures = [ITEM_NL, ITEM_EN, { title: "A (b)", summaryMarkup: "A (b) - <entity id=\"org:x\">A (b) nog iets langer dan dit</entity> tekst" }];
  for (const item of [...news, ...fixtures]) {
    assert.equal(newsLead(item.summaryMarkup ?? null, item.title), stripTitleFromMarkup(item.summaryMarkup ?? null, item.title), item.id);
  }
});

test("translationTargetLanguage maps nl to en and en to nl", () => {
  assert.equal(translationTargetLanguage(ITEM_NL), "en");
  assert.equal(translationTargetLanguage(ITEM_EN), "nl");
  assert.equal(translationTargetLanguage({}), "en");
});

test("checkTranslation enforces entity tags byte for byte and forbids added dashes", () => {
  const task = translationTask(ITEM_NL);
  const good = {
    title: "Cabinet falls",
    lead: 'The <entity id="org:tweede-kamer">Tweede Kamer</entity> backed a motion of no confidence in <entity id="person:jan-jansen">Jansen</entity>.',
  };
  assert.deepEqual(checkTranslation(task, good), []);
  const translatedInner = { ...good, lead: good.lead.replace(">Tweede Kamer<", ">House of Representatives<") };
  assert.ok(checkTranslation(task, translatedInner).some((p) => p.startsWith("entity tag")));
  const dropped = { ...good, lead: "The House backed a motion of no confidence in Jansen." };
  assert.ok(checkTranslation(task, dropped).length >= 2);
  const dashed = { ...good, title: "Cabinet falls — again" };
  assert.deepEqual(checkTranslation(task, dashed), ["dash added to title"]);
  const enTask = translationTask(ITEM_EN);
  assert.deepEqual(checkTranslation(enTask, { title: "Nederlands kabinet valt", lead: null }), []);
  assert.deepEqual(checkTranslation(enTask, { title: "Nederlands kabinet valt", lead: "Extra" }), ["lead given but the source has no lead"]);
});

test("merge, stale detection and pruning", () => {
  const news = [ITEM_NL, ITEM_EN];
  const entries = [
    { id: ITEM_NL.id, title: "Cabinet falls", lead: 'The <entity id="org:tweede-kamer">Tweede Kamer</entity> backed a motion against <entity id="person:jan-jansen">Jansen</entity>.' },
    { id: ITEM_EN.id, title: "Nederlands kabinet valt", lead: null },
    { id: "news:missing", title: "x", lead: null },
  ];
  const result = mergeTranslations({ news, records: [], entries, engine: "claude-opus-5-5", method: "claude-code-session", date: "2026-09-24" });
  assert.equal(result.merged, 2);
  assert.equal(result.rejected.length, 1);
  assert.deepEqual(result.records.map((r) => [r.id, r.language, r.sourceLanguage]), [
    [ITEM_NL.id, "en", "nl"],
    [ITEM_EN.id, "nl", "en"],
  ]);
  assert.equal(result.records[0].sourceHash, translationSourceHash(ITEM_NL.title, ITEM_NL.summaryMarkup));

  const changed = [{ ...ITEM_NL, title: "Kabinet gevallen" }, ITEM_EN];
  const state = translationState(changed, result.records);
  assert.equal(state.stale.length, 1);
  assert.equal(pendingTasks(changed, result.records)[0].id, ITEM_NL.id);

  const pruned = pruneOrphans([ITEM_EN], result.records);
  assert.equal(pruned.pruned, 1);
  assert.deepEqual(pruned.records.map((r) => r.id), [ITEM_EN.id]);
});

async function tempData(news, translations = []) {
  const dir = await mkdtemp(join(tmpdir(), "translate-"));
  await writeFile(join(dir, "news.json"), JSON.stringify(news));
  await writeFile(join(dir, "news-translations.json"), JSON.stringify(translations));
  return dir;
}

test("export writes batches newest first and merge reads them back", async () => {
  const dir = await tempData([ITEM_EN, ITEM_NL]);
  const files = await runExport({ dataDir: dir, dir: join(dir, "out"), size: 1, log: () => {} });
  assert.equal(files.length, 2);
  const first = JSON.parse(await readFile(files[0], "utf8"));
  assert.equal(first[0].id, ITEM_NL.id);
  assert.equal(first[0].language, "en");
  await writeFile(files[0], JSON.stringify([{ id: ITEM_NL.id, title: "Cabinet falls", lead: newsLead(ITEM_NL.summaryMarkup, ITEM_NL.title).replace("stemde in met een motie van wantrouwen tegen", "backed a motion of no confidence in").replace("De ", "The ") }]));
  const result = await runMerge({ dataDir: dir, files: [files[0]], date: "2026-09-24", log: () => {} });
  assert.equal(result.merged, 1);
  const saved = JSON.parse(await readFile(join(dir, "news-translations.json"), "utf8"));
  assert.equal(saved[0].engine, "claude-opus-5-5");
  assert.equal(saved[0].method, "claude-code-session");
  assert.equal(saved[0].translated, "2026-09-24");
});

test("api mode without a key translates nothing and reports the backlog", async () => {
  const dir = await tempData([ITEM_NL, ITEM_EN], [{ id: "news:gone", language: "en" }]);
  const lines = [];
  const result = await runApi({ dataDir: dir, env: {}, log: (line) => lines.push(line) });
  assert.equal(result.translated, 0);
  assert.equal(result.remaining, 2);
  assert.ok(lines.some((line) => line.includes("No translation key set")));
  const saved = JSON.parse(await readFile(join(dir, "news-translations.json"), "utf8"));
  assert.deepEqual(saved, []);
});

function fakeClient(translate, { failures = [] } = {}) {
  const requests = [];
  return {
    requests,
    messages: {
      async create(request) {
        requests.push(request);
        const failure = failures.shift();
        if (failure) throw failure;
        const input = JSON.parse(request.messages[0].content.split("\n\n")[1]);
        const items = input.items.map((item) => ({ id: item.id, ...translate(item) }));
        return { stop_reason: "end_turn", content: [{ type: "text", text: JSON.stringify({ items }) }] };
      },
    },
  };
}

const GOOD_NL_LEAD = 'The <entity id="org:tweede-kamer">Tweede Kamer</entity> backed a motion of no confidence in <entity id="person:jan-jansen">Jansen</entity>.';

test("api mode keeps checked responses and drops ones that break entity tags", async () => {
  const dir = await tempData([ITEM_NL, ITEM_EN]);
  const client = fakeClient((item) => (item.lead === null
    ? { title: "Nederlands kabinet valt", lead: null }
    : { title: "Cabinet falls", lead: "The House backed a motion." }));
  const result = await runApi({ dataDir: dir, client, model: "claude-haiku-4-5", date: "2026-09-24", log: () => {} });
  assert.equal(result.translated, 1);
  assert.equal(result.dropped, 1);
  assert.equal(client.requests[0].model, "claude-haiku-4-5");
  assert.equal(client.requests[0].output_config.format.type, "json_schema");
  const saved = JSON.parse(await readFile(join(dir, "news-translations.json"), "utf8"));
  assert.deepEqual(saved.map((r) => [r.id, r.method, r.engine]), [[ITEM_EN.id, "anthropic-api", "claude-haiku-4-5"]]);
});

test("api mode batches items per language pair and retries a failed batch item by item", async () => {
  const many = Array.from({ length: 5 }, (_, i) => ({ ...ITEM_NL, id: `news:bbbb000${i}` }));
  const dir = await tempData([...many, ITEM_EN]);
  let calls = 0;
  const client = fakeClient((item) => {
    calls += 1;
    if (item.lead === null) return { title: "Nederlands kabinet valt", lead: null };
    // The first time the batch drops a tag for one item; the single retry gets it right.
    if (item.id === "news:bbbb0002" && calls < 5) return { title: "Cabinet falls", lead: "Broken." };
    return { title: "Cabinet falls", lead: GOOD_NL_LEAD };
  });
  const result = await runApi({ dataDir: dir, client, batchSize: 10, concurrency: 1, log: () => {} });
  assert.equal(result.translated, 6);
  assert.equal(result.dropped, 0);
  // One request for the five nl items, one for the en item, one retry for the broken item.
  assert.equal(result.requests, 3);
});

test("api mode retries transient errors with backoff and never throws on a hard failure", async () => {
  const dir = await tempData([ITEM_NL]);
  const delays = [];
  const client = fakeClient(() => ({ title: "Cabinet falls", lead: GOOD_NL_LEAD }), {
    failures: [Object.assign(new Error("overloaded"), { status: 529 }), Object.assign(new Error("rate limited"), { status: 429 })],
  });
  const result = await runApi({ dataDir: dir, client, sleep: async (ms) => delays.push(ms), log: () => {} });
  assert.equal(result.translated, 1);
  assert.deepEqual(delays, [2000, 4000]);

  const dir2 = await tempData([ITEM_NL]);
  const broken = fakeClient(() => ({}), { failures: [Object.assign(new Error("bad request"), { status: 400 })] });
  const hard = await runApi({ dataDir: dir2, client: broken, sleep: async () => {}, log: () => {} });
  assert.equal(hard.translated, 0);
  assert.equal(hard.remaining, 1);
});

test("mergeRecordSets keeps the current record per id and language", () => {
  const news = [ITEM_NL, ITEM_EN];
  const hashNl = translationSourceHash(ITEM_NL.title, ITEM_NL.summaryMarkup);
  const base = { language: "en", sourceLanguage: "nl", title: "t", lead: GOOD_NL_LEAD, engine: "e", method: "anthropic-api" };
  const committedStale = { ...base, id: ITEM_NL.id, sourceHash: "000000000000", translated: "2026-09-20" };
  const cachedCurrent = { ...base, id: ITEM_NL.id, sourceHash: hashNl, translated: "2026-09-25" };
  const cachedOrphan = { ...base, id: "news:gone", sourceHash: hashNl, translated: "2026-09-25" };
  const merged = mergeRecordSets(news, [committedStale], [cachedCurrent, cachedOrphan]);
  assert.deepEqual(merged, [cachedCurrent]);

  const committedCurrent = { ...cachedCurrent, method: "claude-code-session", translated: "2026-09-24" };
  assert.deepEqual(mergeRecordSets(news, [committedCurrent], [cachedCurrent]), [committedCurrent]);

  const olderStale = { ...committedStale, translated: "2026-09-01" };
  assert.deepEqual(mergeRecordSets(news, [olderStale], [committedStale]), [committedStale]);
});

test("api mode with a cache file: restores, translates only what is new, writes the cache back", async () => {
  const dir = await tempData([ITEM_NL, ITEM_EN]);
  const cacheFile = join(dir, "cache", "news-translations.json");
  const hashEn = translationSourceHash(ITEM_EN.title, ITEM_EN.summaryMarkup);
  await mkdir(join(dir, "cache"), { recursive: true });
  await writeFile(cacheFile, JSON.stringify([
    { id: ITEM_EN.id, language: "nl", sourceLanguage: "en", title: "Nederlands kabinet valt", lead: null, sourceHash: hashEn, engine: "claude-haiku-4-5", method: "anthropic-api", translated: "2026-09-23" },
  ]));
  const client = fakeClient(() => ({ title: "Cabinet falls", lead: GOOD_NL_LEAD }));
  const result = await runApi({ dataDir: dir, client, cacheFile, log: () => {} });
  assert.equal(result.translated, 1);
  assert.equal(client.requests.length, 1);
  assert.equal(JSON.parse(client.requests[0].messages[0].content.split("\n\n")[1]).items[0].id, ITEM_NL.id);
  const cache = JSON.parse(await readFile(cacheFile, "utf8"));
  assert.deepEqual(cache.map((r) => r.id), [ITEM_NL.id, ITEM_EN.id]);

  // A second run sends nothing: every hash already matches.
  const again = fakeClient(() => ({ title: "x", lead: null }));
  const second = await runApi({ dataDir: dir, client: again, cacheFile, log: () => {} });
  assert.equal(second.requests, 0);
  assert.equal(again.requests.length, 0);
});

test("api mode without a key still merges the cache and writes it back", async () => {
  const dir = await tempData([ITEM_EN]);
  const cacheFile = join(dir, "cache.json");
  const hashEn = translationSourceHash(ITEM_EN.title, ITEM_EN.summaryMarkup);
  const record = { id: ITEM_EN.id, language: "nl", sourceLanguage: "en", title: "Nederlands kabinet valt", lead: null, sourceHash: hashEn, engine: "claude-haiku-4-5", method: "anthropic-api", translated: "2026-09-23" };
  await writeFile(cacheFile, JSON.stringify([record]));
  const lines = [];
  const result = await runApi({ dataDir: dir, env: {}, cacheFile, log: (line) => lines.push(line) });
  assert.equal(result.remaining, 0);
  assert.ok(lines.some((line) => line.includes("No translation key set")));
  const saved = JSON.parse(await readFile(join(dir, "news-translations.json"), "utf8"));
  assert.deepEqual(saved, [record]);
});

test("data/news-translations.json: current records pass the merge checks", () => {
  const file = join(ROOT, "data", "news-translations.json");
  if (!existsSync(file)) return;
  const news = JSON.parse(readFileSync(join(ROOT, "data", "news.json"), "utf8"));
  const records = JSON.parse(readFileSync(file, "utf8"));
  const byId = new Map(news.map((item) => [item.id, item]));
  for (const record of records) {
    const item = byId.get(record.id);
    if (!item) continue;
    const task = translationTask(item);
    if (task.sourceHash !== record.sourceHash) continue;
    assert.equal(record.language, task.language, record.id);
    assert.deepEqual(checkTranslation(task, record), [], record.id);
  }
});

test("resolveProvider picks TRANSLATE_PROVIDER, else the first key in order opencode, deepseek, anthropic", () => {
  assert.equal(resolveProvider({}), null);
  const all = { OPENCODE_API_KEY: "o", DEEPSEEK_API_KEY: "d", ANTHROPIC_API_KEY: "a" };
  assert.equal(resolveProvider(all).name, "opencode");
  assert.equal(resolveProvider(all).model, "claude-haiku-5-5");
  assert.equal(resolveProvider({ OPENCODE_API_KEY: "k" }).baseUrl, "https://opencode.ai/inference");
  assert.equal(resolveProvider({ OPENCODE_API_KEY: "k", TRANSLATE_PROVIDER: "opencode-go" }).baseUrl, "https://opencode.ai/inference/go");
  assert.equal(resolveProvider({ DEEPSEEK_API_KEY: "d", ANTHROPIC_API_KEY: "a" }).name, "deepseek");
  assert.equal(resolveProvider({ DEEPSEEK_API_KEY: "d" }).model, "deepseek-flash");
  assert.equal(resolveProvider({ ANTHROPIC_API_KEY: "a" }).model, "claude-haiku-4-5");
  assert.equal(resolveProvider({ ...all, TRANSLATE_PROVIDER: "anthropic" }).name, "anthropic");
  assert.equal(resolveProvider({ ...all, TRANSLATE_MODEL: "deepseek-v4-flash" }).model, "deepseek-v4-flash");
  assert.equal(resolveProvider({ OPENCODE_API_KEY: "  " }), null);
  assert.equal(resolveProvider({ DEEPSEEK_API_KEY: "d", TRANSLATE_PROVIDER: "opencode" }), null);
  assert.throws(() => resolveProvider({ TRANSLATE_PROVIDER: "nope" }));
});

test("parseBatchReply strips code fences and drops unusable records", () => {
  const reply = '```json\n{"items":[{"id":"news:1","title":"A","lead":null},{"id":2,"title":"B"},{"id":"news:3"}]}\n```';
  const out = parseBatchReply(reply);
  assert.deepEqual([...out.keys()], ["news:1"]);
  assert.throws(() => parseBatchReply("sorry, no JSON"), SyntaxError);
});

function fakeFetch(reply, { statuses = [] } = {}) {
  const calls = [];
  const impl = async (url, init) => {
    calls.push({ url, init, body: JSON.parse(init.body) });
    const status = statuses.shift() ?? 200;
    if (status !== 200) return { ok: false, status, text: async () => "busy", json: async () => ({}) };
    const input = JSON.parse(JSON.parse(init.body).messages[1].content.split("\n\n")[1]);
    const content = typeof reply === "function" ? reply(input.items) : reply;
    return {
      ok: true,
      status: 200,
      json: async () => ({ choices: [{ finish_reason: "stop", message: { content, reasoning_content: "thinking..." } }] }),
    };
  };
  impl.calls = calls;
  return impl;
}

function fakeMessages(reply) {
  const calls = [];
  const impl = async (url, init) => {
    const body = JSON.parse(init.body);
    calls.push({ url, init, body });
    const input = JSON.parse(body.messages[0].content.split("\n\n")[1]);
    const text = typeof reply === "function" ? reply(input.items) : reply;
    return new Response(JSON.stringify({ stop_reason: "end_turn", content: [{ type: "text", text }] }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  };
  impl.calls = calls;
  return impl;
}

const TRANSLATE_PAIR = (items) => JSON.stringify({
  items: items.map((item) => (item.lead === null
    ? { id: item.id, title: "Nederlands kabinet valt", lead: null }
    : { id: item.id, title: "Cabinet falls", lead: GOOD_NL_LEAD })),
});

test("opencode provider: Haiku 5.5 on the pay-as-you-go Messages endpoint, effort medium, tag check", async () => {
  const dir = await tempData([ITEM_NL, ITEM_EN]);
  const fetchImpl = fakeMessages(TRANSLATE_PAIR);
  const result = await runApi({ dataDir: dir, env: { OPENCODE_API_KEY: "zen-key", ANTHROPIC_API_KEY: "a" }, fetchImpl, concurrency: 1, log: () => {} });
  assert.equal(result.provider, "opencode");
  assert.equal(result.translated, 2);
  const call = fetchImpl.calls[0];
  assert.equal(call.url, "https://opencode.ai/inference/v1/messages");
  assert.equal(call.init.method, "POST");
  assert.equal(new Headers(call.init.headers).get("x-api-key"), "zen-key");
  assert.equal(new Headers(call.init.headers).get("x-opencode-session"), null);
  assert.equal(call.body.model, "claude-haiku-5-5");
  assert.equal(call.body.output_config.effort, "medium");
  assert.equal(call.body.output_config.format.type, "json_schema");
  const saved = JSON.parse(await readFile(join(dir, "news-translations.json"), "utf8"));
  assert.deepEqual([...new Set(saved.map((r) => `${r.method}|${r.engine}`))], ["opencode-zen|claude-haiku-5-5"]);
});

test("opencode-go provider: same key on the Go Messages endpoint with a session id, only by name", async () => {
  const dir = await tempData([ITEM_NL]);
  const fetchImpl = fakeMessages(TRANSLATE_PAIR);
  const result = await runApi({ dataDir: dir, env: { OPENCODE_API_KEY: "go-key" }, provider: "opencode-go", fetchImpl, concurrency: 1, log: () => {} });
  assert.equal(result.provider, "opencode-go");
  assert.equal(result.translated, 1);
  const call = fetchImpl.calls[0];
  assert.equal(call.url, "https://opencode.ai/inference/go/v1/messages");
  assert.equal(new Headers(call.init.headers).get("x-api-key"), "go-key");
  assert.ok(new Headers(call.init.headers).get("x-opencode-session"));
  const saved = JSON.parse(await readFile(join(dir, "news-translations.json"), "utf8"));
  assert.deepEqual([...new Set(saved.map((r) => `${r.method}|${r.engine}`))], ["opencode-go|claude-haiku-5-5"]);
  assert.equal((await runApi({ dataDir: dir, env: { OPENCODE_API_KEY: "go-key" }, fetchImpl, concurrency: 1, log: () => {} })).translated, 0);
});

test("opencode provider: malformed JSON and broken entity tags are dropped, the run still succeeds", async () => {
  const dir = await tempData([ITEM_NL]);
  const malformed = fakeFetch("{ this is not json");
  const bad = await runApi({ dataDir: dir, env: { DEEPSEEK_API_KEY: "k" }, fetchImpl: malformed, sleep: async () => {}, log: () => {} });
  assert.equal(bad.translated, 0);
  assert.equal(bad.dropped, 1);
  assert.equal(bad.remaining, 1);

  const tagBreaker = fakeFetch((items) => JSON.stringify({ items: items.map((item) => ({ id: item.id, title: "Cabinet falls", lead: "The House backed a motion." })) }));
  const broken = await runApi({ dataDir: dir, env: { DEEPSEEK_API_KEY: "k" }, fetchImpl: tagBreaker, log: () => {} });
  assert.equal(broken.translated, 0);
  assert.equal(broken.dropped, 1);
  const saved = JSON.parse(await readFile(join(dir, "news-translations.json"), "utf8"));
  assert.deepEqual(saved, []);
});

test("--replace ENGINE translates current records of that engine again and keeps the others", async () => {
  const deepseek = { id: ITEM_NL.id, language: "en", sourceLanguage: "nl", title: "Cabinet falls", lead: GOOD_NL_LEAD, sourceHash: translationSourceHash(ITEM_NL.title, ITEM_NL.summaryMarkup), engine: "deepseek-v4.1-flash", method: "opencode-zen", translated: "2026-09-24" };
  const claude = { id: ITEM_EN.id, language: "nl", sourceLanguage: "en", title: "Nederlands kabinet valt", lead: null, sourceHash: translationSourceHash(ITEM_EN.title, ITEM_EN.summaryMarkup), engine: "claude-opus-5-5", method: "claude-code-session", translated: "2026-09-23" };
  const news = [ITEM_NL, ITEM_EN];
  assert.equal(pendingTasks(news, [deepseek, claude], { replaceEngine: "deepseek-v4.1-flash" }).length, 1);
  assert.equal(pendingTasks(news, [deepseek, claude]).length, 0);
  const dir = await tempData(news, [deepseek, claude]);
  const fetchImpl = fakeMessages(TRANSLATE_PAIR);
  const result = await runApi({ dataDir: dir, env: { OPENCODE_API_KEY: "k" }, provider: "opencode", replaceEngine: "deepseek-v4.1-flash", fetchImpl, concurrency: 1, log: () => {} });
  assert.equal(result.translated, 1);
  const saved = JSON.parse(await readFile(join(dir, "news-translations.json"), "utf8"));
  assert.deepEqual(saved.map((r) => [r.id, r.language, r.engine, r.method]), [
    [ITEM_NL.id, "en", "claude-haiku-5-5", "opencode-zen"],
    [ITEM_EN.id, "nl", "claude-opus-5-5", "claude-code-session"],
  ]);
});

test("deepseek provider retries 429 and 503 with backoff", async () => {
  const dir = await tempData([ITEM_NL]);
  const fetchImpl = fakeFetch((items) => JSON.stringify({ items: items.map((item) => ({ id: item.id, title: "Cabinet falls", lead: GOOD_NL_LEAD })) }), { statuses: [429, 503] });
  const delays = [];
  const result = await runApi({ dataDir: dir, env: { DEEPSEEK_API_KEY: "d" }, fetchImpl, sleep: async (ms) => delays.push(ms), log: () => {} });
  assert.equal(result.translated, 1);
  assert.deepEqual(delays, [2000, 4000]);
  assert.equal(fetchImpl.calls[0].url, PROVIDERS.deepseek.url);
  assert.equal(fetchImpl.calls[0].body.model, "deepseek-flash");
});

test("an empty reply is retried once, then the item is dropped", async () => {
  const dir = await tempData([ITEM_NL]);
  let calls = 0;
  const fetchImpl = async () => {
    calls += 1;
    return { ok: true, status: 200, json: async () => ({ choices: [{ finish_reason: "stop", message: { content: "", reasoning_content: "..." } }] }) };
  };
  const result = await runApi({ dataDir: dir, env: { DEEPSEEK_API_KEY: "k" }, fetchImpl, sleep: async () => {}, log: () => {} });
  assert.equal(calls, 2);
  assert.equal(result.translated, 0);
  assert.equal(result.dropped, 1);
});
