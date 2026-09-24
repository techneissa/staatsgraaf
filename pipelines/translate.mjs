#!/usr/bin/env bun
/**
 * Machine translation of the news layer into the other site language.
 *
 * data/news-translations.json holds one record per news item and target
 * language: nl items get an en record, en items get an nl record. A record is
 * current while its sourceHash equals translationSourceHash(title,
 * summaryMarkup) of the item; the web shows nothing for a stale record.
 *
 * Subcommands:
 *   status                     count current, stale, missing and orphan records
 *   export --dir D [--size N]  write missing or stale items, newest first, to
 *                              D/batch-NN.json in batches of N (default 100)
 *          [--limit M]         only the first M items
 *   merge FILE... [--engine E] [--method M] [--date YYYY-MM-DD]
 *                              merge translated batch files ([{id, title, lead}])
 *                              into data/news-translations.json; every record is
 *                              checked (entity tags byte for byte, no added dash)
 *   check FILE...              run the merge checks on translated batch files
 *                              without writing anything; exit 1 on a problem
 *   prune                      drop records whose news item left news.json
 *   api [--max N] [--provider P] [--model M] [--batch B] [--cache FILE]
 *                              translate missing or stale items through a
 *                              provider: opencode (OPENCODE_API_KEY, OpenCode
 *                              Zen, default deepseek-v4.1-flash), deepseek
 *                              (DEEPSEEK_API_KEY, default deepseek-flash) or
 *                              anthropic (ANTHROPIC_API_KEY, claude-haiku-4-5);
 *                              TRANSLATE_PROVIDER picks one, else the first key
 *                              set in that order; TRANSLATE_MODEL overrides; B items per request (default 8), at most N
 *                              per run (default 400). With --cache the records
 *                              in FILE (restored by CI) are merged in first and
 *                              the result is written back to FILE. Without the
 *                              key: print the backlog, exit 0. Always exits 0.
 *
 * Every subcommand except status prunes orphan records first, so a news run
 * followed by `bun run translate` always leaves a file the validator accepts.
 */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  entityTags,
  newsLead,
  translationSourceHash,
  translationTargetLanguage,
} from "../shared/news-translation-hash.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_DATA = join(ROOT, "data");
export const TRANSLATIONS_FILE = "news-translations.json";
export const SESSION_ENGINE = "claude-opus-5-5";
export const SESSION_METHOD = "claude-code-session";
export const API_METHOD = "anthropic-api";
// A small, cheap current Anthropic model; override with TRANSLATE_MODEL or --model.
export const DEFAULT_API_MODEL = "claude-haiku-4-5";

/**
 * Translation providers, in auto-selection order: the first whose key is set
 * wins unless TRANSLATE_PROVIDER names one. Model ids and endpoints verified by
 * the orchestrator on 24-09-2026 against https://opencode.ai/docs/zen/ and
 * https://api-docs.deepseek.com/quick_start/pricing. Only public news
 * headlines and leads are sent.
 */
export const PROVIDERS = Object.freeze({
  opencode: Object.freeze({
    name: "opencode",
    keyEnv: "OPENCODE_API_KEY",
    method: "opencode-zen",
    defaultModel: "deepseek-v4.1-flash",
    url: "https://opencode.ai/zen/v1/chat/completions",
    kind: "openai",
  }),
  deepseek: Object.freeze({
    name: "deepseek",
    keyEnv: "DEEPSEEK_API_KEY",
    method: "deepseek-api",
    defaultModel: "deepseek-flash",
    url: "https://api.deepseek.com/chat/completions",
    kind: "openai",
  }),
  anthropic: Object.freeze({
    name: "anthropic",
    keyEnv: "ANTHROPIC_API_KEY",
    method: API_METHOD,
    defaultModel: DEFAULT_API_MODEL,
    kind: "anthropic",
  }),
});
export const PROVIDER_ORDER = Object.freeze(["opencode", "deepseek", "anthropic"]);

/**
 * Pick the provider: TRANSLATE_PROVIDER (or the explicit argument) when its key
 * is set, otherwise the first provider with a key. Null when no key is set.
 */
export function resolveProvider(env = process.env, { provider = null, model = null } = {}) {
  const wanted = provider || env.TRANSLATE_PROVIDER || null;
  const has = (name) => typeof env[PROVIDERS[name].keyEnv] === "string" && env[PROVIDERS[name].keyEnv].trim() !== "";
  let name = null;
  if (wanted) {
    if (!PROVIDERS[wanted]) throw new Error(`unknown TRANSLATE_PROVIDER ${wanted}; use one of ${PROVIDER_ORDER.join(", ")}`);
    if (has(wanted)) name = wanted;
  } else {
    name = PROVIDER_ORDER.find(has) ?? null;
  }
  if (!name) return null;
  const spec = PROVIDERS[name];
  return { ...spec, key: env[spec.keyEnv].trim(), model: model || env.TRANSLATE_MODEL || spec.defaultModel };
}
export const DEFAULT_API_MAX = 400;

const LANGUAGE_NAMES = { nl: "Dutch", en: "English" };

export async function readJson(file, fallback) {
  if (!existsSync(file)) return fallback;
  return JSON.parse(await readFile(file, "utf8"));
}

export function sortTranslations(records) {
  // Code-unit order, the same order scripts/validate.mjs checks.
  const key = (record) => `${record.id}|${record.language}`;
  return [...records].sort((a, b) => (key(a) < key(b) ? -1 : key(a) > key(b) ? 1 : 0));
}

export async function writeTranslations(dataDir, records) {
  const sorted = sortTranslations(records);
  await writeFile(join(dataDir, TRANSLATIONS_FILE), `${JSON.stringify(sorted, null, 2)}\n`, "utf8");
  return sorted;
}

/** What a translation of this item must translate, and the hash it must carry. */
export function translationTask(item) {
  const sourceLanguage = item.language ?? "nl";
  return {
    id: item.id,
    sourceLanguage,
    language: translationTargetLanguage(item),
    title: item.title,
    lead: newsLead(item.summaryMarkup ?? null, item.title),
    sourceHash: translationSourceHash(item.title, item.summaryMarkup ?? null),
    published: item.published,
  };
}

/** Sort key for a record: one per item and target language. */
const keyOf = (record) => `${record.id}|${record.language}`;

/** Classify every news item and record: current, stale, missing, orphan. */
export function translationState(news, records) {
  const byKey = new Map(records.map((record) => [keyOf(record), record]));
  const newsIds = new Set(news.map((item) => item.id));
  const current = [];
  const stale = [];
  const missing = [];
  for (const item of news) {
    const task = translationTask(item);
    const record = byKey.get(keyOf(task));
    if (!record) missing.push(task);
    else if (record.sourceHash !== task.sourceHash) stale.push(task);
    else current.push(task);
  }
  const orphans = records.filter((record) => !newsIds.has(record.id));
  return { current, stale, missing, orphans };
}

/** The items that still need a translation, newest first. */
export function pendingTasks(news, records) {
  const { stale, missing } = translationState(news, records);
  return [...missing, ...stale].sort(
    (a, b) => (b.published ?? "").localeCompare(a.published ?? "") || a.id.localeCompare(b.id),
  );
}

function countTags(tags) {
  const counts = new Map();
  for (const tag of tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
  return counts;
}

const DASHES = /[\u2013\u2014]/;

/**
 * Check one translated record against its task. Returns a list of problems;
 * empty means the record may be merged.
 */
export function checkTranslation(task, translated) {
  const problems = [];
  if (typeof translated.title !== "string" || translated.title.trim() === "") problems.push("empty title");
  if (task.lead === null) {
    if (translated.lead !== null && translated.lead !== undefined && translated.lead !== "") {
      problems.push("lead given but the source has no lead");
    }
  } else if (typeof translated.lead !== "string" || translated.lead.trim() === "") {
    problems.push("lead missing");
  } else {
    const want = countTags(entityTags(task.lead));
    const got = countTags(entityTags(translated.lead));
    for (const [tag, count] of want) {
      if (got.get(tag) !== count) problems.push(`entity tag not preserved: ${tag}`);
    }
    for (const [tag] of got) if (!want.has(tag)) problems.push(`entity tag not in source: ${tag}`);
    const stray = translated.lead.replaceAll(/<entity id="[^"]*">[^<]*<\/entity>/g, "");
    if (/<\/?entity\b/.test(stray)) problems.push("malformed entity tag");
    if (DASHES.test(translated.lead) && !DASHES.test(task.lead)) problems.push("dash added to lead");
  }
  if (typeof translated.title === "string" && /<entity\b/.test(translated.title)) problems.push("entity tag in title");
  if (typeof translated.title === "string" && DASHES.test(translated.title) && !DASHES.test(task.title)) {
    problems.push("dash added to title");
  }
  return problems;
}

/** Build a record for the data file from a checked translation. */
export function makeRecord(task, translated, { engine, method, date }) {
  return {
    id: task.id,
    language: task.language,
    sourceLanguage: task.sourceLanguage,
    title: translated.title.trim(),
    lead: task.lead === null ? null : translated.lead.trim(),
    sourceHash: task.sourceHash,
    engine,
    method,
    translated: date,
  };
}

/** Merge translated entries into the record list. Returns the new list and a report. */
export function mergeTranslations({ news, records, entries, engine, method, date }) {
  const tasks = new Map(news.map((item) => [item.id, translationTask(item)]));
  const byKey = new Map(records.map((record) => [keyOf(record), record]));
  const rejected = [];
  let merged = 0;
  for (const entry of entries) {
    const task = tasks.get(entry.id);
    if (!task) {
      rejected.push({ id: entry.id, problems: ["no such news item"] });
      continue;
    }
    if (entry.language && entry.language !== task.language) {
      rejected.push({ id: entry.id, problems: [`target language ${entry.language}, expected ${task.language}`] });
      continue;
    }
    const problems = checkTranslation(task, entry);
    if (problems.length > 0) {
      rejected.push({ id: entry.id, problems });
      continue;
    }
    byKey.set(keyOf(task), makeRecord(task, entry, { engine, method, date }));
    merged += 1;
  }
  return { records: sortTranslations([...byKey.values()]), merged, rejected };
}

export function pruneOrphans(news, records) {
  const ids = new Set(news.map((item) => item.id));
  const kept = records.filter((record) => ids.has(record.id));
  return { records: kept, pruned: records.length - kept.length };
}

async function loadState(dataDir) {
  const news = await readJson(join(dataDir, "news.json"), []);
  const records = await readJson(join(dataDir, TRANSLATIONS_FILE), []);
  return { news, records };
}

async function loadAndPrune(dataDir, log) {
  const { news, records } = await loadState(dataDir);
  const pruned = pruneOrphans(news, records);
  if (pruned.pruned > 0) {
    await writeTranslations(dataDir, pruned.records);
    log(`Pruned ${pruned.pruned} translation(s) of news items no longer in news.json.`);
  } else if (!existsSync(join(dataDir, TRANSLATIONS_FILE))) {
    await writeTranslations(dataDir, []);
  }
  return { news, records: pruned.records };
}

function summarize(news, records) {
  const { current, stale, missing, orphans } = translationState(news, records);
  const byLanguage = {};
  for (const item of news) {
    const target = translationTargetLanguage(item);
    byLanguage[target] ??= { total: 0, current: 0 };
    byLanguage[target].total += 1;
  }
  for (const task of current) byLanguage[task.language].current += 1;
  return { current: current.length, stale: stale.length, missing: missing.length, orphans: orphans.length, byLanguage };
}

function printSummary(summary, log) {
  log(`Translations: ${summary.current} current, ${summary.stale} stale, ${summary.missing} missing, ${summary.orphans} orphan.`);
  for (const [language, counts] of Object.entries(summary.byLanguage)) {
    log(`  into ${language}: ${counts.current}/${counts.total}`);
  }
}

export async function runExport({ dataDir = DEFAULT_DATA, dir, size = 100, limit = Infinity, log = console.log }) {
  if (!dir) throw new Error("export needs --dir");
  const { news, records } = await loadAndPrune(dataDir, log);
  const tasks = pendingTasks(news, records).slice(0, limit);
  await mkdir(dir, { recursive: true });
  const files = [];
  for (let start = 0, batch = 1; start < tasks.length; start += size, batch += 1) {
    const file = join(dir, `batch-${String(batch).padStart(2, "0")}.json`);
    const items = tasks.slice(start, start + size).map(({ id, sourceLanguage, language, title, lead }) => ({
      id,
      sourceLanguage,
      language,
      title,
      lead,
    }));
    await writeFile(file, `${JSON.stringify(items, null, 2)}\n`, "utf8");
    files.push(file);
  }
  log(`Exported ${tasks.length} item(s) to ${files.length} batch file(s) in ${dir}.`);
  return files;
}

export async function runMerge({
  dataDir = DEFAULT_DATA,
  files,
  engine = SESSION_ENGINE,
  method = SESSION_METHOD,
  date = new Date().toISOString().slice(0, 10),
  log = console.log,
}) {
  const { news, records } = await loadAndPrune(dataDir, log);
  const entries = [];
  for (const file of files) {
    const parsed = JSON.parse(await readFile(file, "utf8"));
    entries.push(...(Array.isArray(parsed) ? parsed : parsed.items ?? []));
  }
  const result = mergeTranslations({ news, records, entries, engine, method, date });
  await writeTranslations(dataDir, result.records);
  log(`Merged ${result.merged} translation(s) from ${files.length} file(s); ${result.rejected.length} rejected.`);
  for (const reject of result.rejected) log(`  rejected ${reject.id}: ${reject.problems.join("; ")}`);
  printSummary(summarize(news, result.records), log);
  return result;
}

export const API_SYSTEM_PROMPT = [
  "You translate Dutch government news headlines and leads between Dutch and English for a public reference site.",
  "Translate only. Keep the meaning exact: add nothing, leave nothing out, do not summarise, explain or embellish.",
  "Keep every number, date, name, quotation and party abbreviation exactly as in the source.",
  'The lead may contain tags of the form <entity id="...">text</entity>. Copy every tag unchanged, byte for byte, including the Dutch text inside it, and translate only the text around the tags.',
  'Never translate the text inside a tag: <entity id="org:ministerraad">De ministerraad</entity> stays exactly <entity id="org:ministerraad">De ministerraad</entity>, not "The Council of Ministers"; write for example "<entity id="org:ministerraad">De ministerraad</entity> will decide".',
  "Use straight quotes. Do not introduce em dashes or en dashes.",
  "If the lead is null, return null for the lead.",
].join(" ");

export const DEFAULT_API_BATCH = 8;
export const DEFAULT_API_RETRIES = 3;

const BATCH_SCHEMA = {
  type: "object",
  properties: {
    items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          title: { type: "string" },
          lead: { anyOf: [{ type: "string" }, { type: "null" }] },
        },
        required: ["id", "title", "lead"],
        additionalProperties: false,
      },
    },
  },
  required: ["items"],
  additionalProperties: false,
};

const sleepMs = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Transient: rate limits, overload, server errors and network failures. */
export function isTransient(error) {
  if (error?.permanent) return false;
  const status = error?.status;
  if (status === undefined || status === null) return error?.name !== "SyntaxError";
  return status === 408 || status === 409 || status === 429 || status >= 500;
}

function permanent(message, status = 400) {
  return Object.assign(new Error(message), { status, permanent: true });
}

function batchPrompt(tasks) {
  const [first] = tasks;
  const payload = tasks.map((task) => ({ id: task.id, title: task.title, lead: task.lead }));
  return `Translate each item from ${LANGUAGE_NAMES[first.sourceLanguage]} into ${LANGUAGE_NAMES[first.language]}. Return every item with its id unchanged. Reply with a JSON object of the form {"items": [{"id": "...", "title": "...", "lead": "..." or null}]} and nothing else.\n\n${JSON.stringify({ items: payload })}`;
}

/**
 * Parse a model reply into id -> {title, lead}. Strips code fences and any text
 * around the JSON object; records without a string id and title are dropped.
 * Throws a SyntaxError when no JSON object can be read at all.
 */
export function parseBatchReply(text) {
  let body = String(text ?? "").trim();
  const fenced = /```(?:json)?\s*([\s\S]*?)```/i.exec(body);
  if (fenced) body = fenced[1].trim();
  const open = body.indexOf("{");
  const close = body.lastIndexOf("}");
  if (open === -1 || close <= open) throw new SyntaxError("no JSON object in the reply");
  const parsed = JSON.parse(body.slice(open, close + 1));
  const out = new Map();
  for (const item of Array.isArray(parsed?.items) ? parsed.items : []) {
    if (!item || typeof item.id !== "string" || typeof item.title !== "string") continue;
    const lead = typeof item.lead === "string" ? item.lead : null;
    out.set(item.id, { title: item.title, lead });
  }
  return out;
}

async function requestAnthropic(client, provider, tasks) {
  const response = await client.messages.create({
    model: provider.model,
    max_tokens: 16000,
    system: API_SYSTEM_PROMPT,
    output_config: { format: { type: "json_schema", schema: BATCH_SCHEMA } },
    messages: [{ role: "user", content: batchPrompt(tasks) }],
  });
  if (response.stop_reason === "refusal") throw permanent("refused");
  if (response.stop_reason === "max_tokens") throw permanent("output cut off at max_tokens");
  return response.content.filter((block) => block.type === "text").map((block) => block.text).join("");
}

/**
 * Output budget for a batch: the translation is about as long as the source,
 * so allow roughly one token per two source characters plus JSON overhead.
 */
export function maxTokensFor(tasks) {
  const chars = tasks.reduce((sum, task) => sum + task.title.length + (task.lead ?? "").length + task.id.length + 40, 0);
  return Math.min(32000, 1024 + Math.ceil(chars / 2));
}

async function requestOpenAiCompatible(fetchImpl, provider, tasks, { jsonMode = true } = {}) {
  const body = {
    model: provider.model,
    temperature: 0,
    max_tokens: maxTokensFor(tasks),
    // DeepSeek V4 models reason by default and can spend the whole budget on
    // reasoning_tokens; tested 24-09-2026 on OpenCode Zen: disabled gives a clean answer.
    thinking: { type: "disabled" },
    messages: [
      { role: "system", content: API_SYSTEM_PROMPT },
      { role: "user", content: batchPrompt(tasks) },
    ],
  };
  if (jsonMode) body.response_format = { type: "json_object" };
  let response;
  try {
    response = await fetchImpl(provider.url, {
      method: "POST",
      headers: { Authorization: `Bearer ${provider.key}`, "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(body),
    });
  } catch (error) {
    throw Object.assign(new Error(`network error: ${error?.message ?? error}`), { status: null });
  }
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw Object.assign(new Error(`HTTP ${response.status} from ${provider.name}: ${detail.slice(0, 200)}`), { status: response.status, detail });
  }
  const json = await response.json();
  const choice = json?.choices?.[0];
  if (choice?.finish_reason === "length") throw permanent("output cut off at max_tokens");
  // DeepSeek reasoning models add message.reasoning_content; only content is the answer.
  const content = choice?.message?.content;
  if (typeof content !== "string" || content.trim() === "") {
    throw Object.assign(new Error("empty reply"), { status: 400, emptyReply: true });
  }
  return content;
}

/**
 * Translate a group of tasks with the same language pair in one request.
 * Returns a map id -> {title, lead}; items the model left out are absent.
 * Retries transient errors (429, 5xx, network) with exponential backoff.
 */
export async function translateBatch(provider, tasks, {
  client = null,
  fetchImpl = globalThis.fetch,
  retries = DEFAULT_API_RETRIES,
  sleep = sleepMs,
  baseDelayMs = 2000,
} = {}) {
  let jsonMode = true;
  let emptyRetried = false;
  for (let attempt = 0; ; attempt += 1) {
    try {
      const text = provider.kind === "anthropic"
        ? await requestAnthropic(client, provider, tasks)
        : await requestOpenAiCompatible(fetchImpl, provider, tasks, { jsonMode });
      return parseBatchReply(text);
    } catch (error) {
      // A provider that rejects response_format gets the same request without it, once.
      if (jsonMode && provider.kind === "openai" && error?.status === 400 && /response_format|json_object/i.test(error?.detail ?? "")) {
        jsonMode = false;
        continue;
      }
      // An empty reply gets one more try, then the batch is dropped.
      if (error?.emptyReply && !emptyRetried) {
        emptyRetried = true;
        continue;
      }
      if (error?.status === 401 || error?.status === 403 || attempt >= retries || !isTransient(error)) throw error;
      await sleep(baseDelayMs * 2 ** attempt);
    }
  }
}

/** Group tasks by language pair into chunks of at most `size`. */
export function chunkTasks(tasks, size) {
  const groups = new Map();
  for (const task of tasks) {
    const key = `${task.sourceLanguage}>${task.language}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(task);
  }
  const chunks = [];
  for (const group of groups.values()) {
    for (let start = 0; start < group.length; start += size) chunks.push(group.slice(start, start + size));
  }
  return chunks;
}

/**
 * Combine the committed records with records restored from the CI cache. Per
 * id and language the record whose sourceHash matches the current item wins;
 * when both match the committed one (reviewed in a session) wins; when neither
 * matches the newer one is kept and stays hidden until retranslated. Records
 * for items that left news.json are dropped.
 */
export function mergeRecordSets(news, committed, cached) {
  const current = new Map(news.map((item) => [item.id, translationTask(item)]));
  const byKey = new Map();
  const score = (record) => {
    const task = current.get(record.id);
    return task && task.language === record.language && task.sourceHash === record.sourceHash ? 1 : 0;
  };
  for (const [origin, list] of [["committed", committed], ["cached", cached]]) {
    for (const record of list ?? []) {
      if (!record || typeof record.id !== "string" || !current.has(record.id)) continue;
      const key = keyOf(record);
      const existing = byKey.get(key);
      if (!existing) {
        byKey.set(key, { record, origin });
        continue;
      }
      const a = score(existing.record);
      const b = score(record);
      if (b > a || (a === 0 && b === 0 && String(record.translated) > String(existing.record.translated))) {
        byKey.set(key, { record, origin });
      }
    }
  }
  return sortTranslations([...byKey.values()].map((entry) => entry.record));
}

export async function runApi({
  dataDir = DEFAULT_DATA,
  max = DEFAULT_API_MAX,
  batchSize = DEFAULT_API_BATCH,
  env = process.env,
  provider: providerName = null,
  model = null,
  client = null,
  fetchImpl = globalThis.fetch,
  cacheFile = null,
  concurrency = 3,
  retries = DEFAULT_API_RETRIES,
  sleep = sleepMs,
  date = new Date().toISOString().slice(0, 10),
  log = console.log,
}) {
  let { news, records } = await loadAndPrune(dataDir, log);
  if (cacheFile) {
    const cached = await readJson(cacheFile, []);
    const merged = mergeRecordSets(news, records, Array.isArray(cached) ? cached : []);
    log(`Merged ${Array.isArray(cached) ? cached.length : 0} cached translation(s) with ${records.length} committed; ${merged.length} kept.`);
    records = merged;
    await writeTranslations(dataDir, records);
  }
  const saveCache = async (list) => {
    if (!cacheFile) return;
    await mkdir(dirname(cacheFile), { recursive: true });
    await writeFile(cacheFile, `${JSON.stringify(sortTranslations(list), null, 2)}\n`, "utf8");
  };
  const pending = pendingTasks(news, records);
  // An injected client (tests) stands for the Anthropic provider.
  const provider = client
    ? { ...PROVIDERS.anthropic, key: "injected", model: model || env.TRANSLATE_MODEL || PROVIDERS.anthropic.defaultModel }
    : resolveProvider(env, { provider: providerName, model });
  if (!provider) {
    const keys = PROVIDER_ORDER.map((name) => PROVIDERS[name].keyEnv).join(", ");
    log(`No translation key set (${keys}); ${pending.length} news item(s) remain untranslated or stale and show in their original language. Nothing translated.`);
    printSummary(summarize(news, records), log);
    await saveCache(records);
    return { translated: 0, dropped: 0, remaining: pending.length, requests: 0, provider: null };
  }
  if (provider.kind === "anthropic" && !client) {
    const { default: Anthropic } = await import("@anthropic-ai/sdk");
    // The SDK retries 408/409/429/5xx itself; translateBatch adds a slower outer backoff.
    client = new Anthropic({ apiKey: provider.key, maxRetries: 2 });
  }
  log(`Translating with ${provider.name} (${provider.model}), ${pending.length} item(s) pending, cap ${max}.`);
  const tasks = pending.slice(0, max);
  const chunks = chunkTasks(tasks, Math.max(1, batchSize));
  const entries = [];
  const dropped = [];
  let requests = 0;
  let next = 0;
  let halted = null;

  async function translateChunk(chunk) {
    requests += 1;
    const out = await translateBatch(provider, chunk, { client, fetchImpl, retries, sleep });
    const failed = [];
    for (const task of chunk) {
      const translated = out.get(task.id);
      const problems = translated ? checkTranslation(task, translated) : ["missing from the response"];
      if (problems.length === 0) entries.push({ id: task.id, language: task.language, ...translated });
      else failed.push({ task, problems });
    }
    return failed;
  }

  async function worker() {
    while (next < chunks.length && halted === null) {
      const chunk = chunks[next];
      next += 1;
      let failed;
      try {
        failed = await translateChunk(chunk);
      } catch (error) {
        if (error?.status === 401 || error?.status === 403) {
          halted = error;
          for (const task of chunk) dropped.push({ id: task.id, problems: [error?.message ?? String(error)] });
          continue;
        }
        failed = chunk.map((task) => ({ task, problems: [error?.message ?? String(error)] }));
      }
      // A batch that broke a tag or lost an item gets one more try, item by item,
      // so one hard item never costs the rest of the batch.
      if (chunk.length > 1) {
        for (const { task } of failed) {
          if (halted) break;
          try {
            const again = await translateChunk([task]);
            for (const miss of again) dropped.push({ id: miss.task.id, problems: miss.problems });
          } catch (error) {
            if (error?.status === 401 || error?.status === 403) halted = error;
            dropped.push({ id: task.id, problems: [error?.message ?? String(error)] });
          }
        }
      } else {
        for (const miss of failed) dropped.push({ id: miss.task.id, problems: miss.problems });
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, chunks.length) }, worker));
  if (halted) log(`Stopped early: the API refused the credentials (${halted.status}).`);
  const result = mergeTranslations({ news, records, entries, engine: provider.model, method: provider.method, date });
  await writeTranslations(dataDir, result.records);
  await saveCache(result.records);
  log(`Translated ${result.merged} item(s) with ${provider.name} (${provider.model}) in ${requests} request(s); dropped ${dropped.length + result.rejected.length}.`);
  for (const drop of [...dropped, ...result.rejected]) log(`  dropped ${drop.id}: ${drop.problems.join("; ")}`);
  const remaining = pendingTasks(news, result.records).length;
  log(`${remaining} news item(s) remain untranslated or stale and show in their original language.`);
  return { translated: result.merged, dropped: dropped.length + result.rejected.length, remaining, requests, provider: provider.name };
}

function parseArgs(argv) {
  const [command = "status", ...rest] = argv;
  const options = { command, files: [] };
  for (let i = 0; i < rest.length; i += 1) {
    const arg = rest[i];
    if (arg === "--dir") options.dir = rest[(i += 1)];
    else if (arg === "--size") options.size = Number(rest[(i += 1)]);
    else if (arg === "--limit") options.limit = Number(rest[(i += 1)]);
    else if (arg === "--engine") options.engine = rest[(i += 1)];
    else if (arg === "--method") options.method = rest[(i += 1)];
    else if (arg === "--date") options.date = rest[(i += 1)];
    else if (arg === "--max") options.max = Number(rest[(i += 1)]);
    else if (arg === "--model") options.model = rest[(i += 1)];
    else if (arg === "--data") options.dataDir = rest[(i += 1)];
    else if (arg === "--cache") options.cacheFile = rest[(i += 1)];
    else if (arg === "--provider") options.provider = rest[(i += 1)];
    else if (arg === "--batch") options.batchSize = Number(rest[(i += 1)]);
    else options.files.push(arg);
  }
  return options;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const dataDir = options.dataDir ?? DEFAULT_DATA;
  const defined = (object) => Object.fromEntries(Object.entries(object).filter(([, value]) => value !== undefined));
  switch (options.command) {
    case "status": {
      const { news, records } = await loadState(dataDir);
      printSummary(summarize(news, records), console.log);
      break;
    }
    case "export":
      await runExport(defined({ dataDir, dir: options.dir, size: options.size, limit: options.limit }));
      break;
    case "merge": {
      const result = await runMerge(
        defined({ dataDir, files: options.files, engine: options.engine, method: options.method, date: options.date }),
      );
      if (result.rejected.length > 0) process.exitCode = 1;
      break;
    }
    case "check": {
      const { news, records } = await loadState(dataDir);
      const entries = [];
      for (const file of options.files) {
        const parsed = JSON.parse(await readFile(file, "utf8"));
        entries.push(...(Array.isArray(parsed) ? parsed : parsed.items ?? []));
      }
      const result = mergeTranslations({ news, records, entries, engine: "check", method: SESSION_METHOD, date: "2026-01-01" });
      console.log(`${result.merged} entr(y/ies) pass, ${result.rejected.length} rejected.`);
      for (const reject of result.rejected) console.log(`  rejected ${reject.id}: ${reject.problems.join("; ")}`);
      if (result.rejected.length > 0) process.exitCode = 1;
      break;
    }
    case "prune":
      await loadAndPrune(dataDir, console.log);
      break;
    case "api":
      // Translation never fails the build: an untranslated item shows in its own language.
      try {
        await runApi(defined({ dataDir, max: options.max, model: options.model, provider: options.provider, cacheFile: options.cacheFile, batchSize: options.batchSize }));
      } catch (error) {
        console.error(`translate api: ${error.message}; continuing without new translations.`);
      }
      break;
    default:
      throw new Error(`unknown subcommand ${options.command}`);
  }
}

const invokedDirectly = process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url;
if (invokedDirectly) {
  main().catch((error) => {
    console.error(`translate failed: ${error.message}`);
    process.exitCode = 1;
  });
}
