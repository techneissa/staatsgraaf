#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_GAZETTEER = join(ROOT, "research", "J-nieuwsbronnen.json");
const DEFAULT_TOPICS = join(ROOT, "research", "K-topics.json");

export const STOPWORDS = new Set([
  "aan", "af", "al", "als", "bij", "dan", "dat", "de", "den", "der", "des", "die", "dit",
  "een", "en", "er", "het", "in", "is", "je", "kan", "maar", "met", "na", "naar", "niet",
  "of", "om", "onder", "op", "over", "te", "tot", "uit", "voor", "was", "we", "ze",
  "zich", "zij", "zijn", "zo",
]);

export function normalizeText(value) {
  return String(value ?? "")
    .normalize("NFC")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function isAcronymAlias(alias) {
  const letters = alias.replace(/[^A-Za-z]/g, "");
  return letters.length >= 2 && letters.length <= 6 && alias === alias.toUpperCase() && /[A-Z]/.test(alias);
}

export function isGenericMultiToken(alias) {
  const tokens = alias.split(" ").filter(Boolean);
  if (tokens.length < 3) return false;
  return tokens.some((token) => token.length < 3 || STOPWORDS.has(token.toLowerCase()));
}

export function aliasLengthFloor(alias) {
  const tokens = alias.split(" ").filter(Boolean);
  return tokens.length >= 2 ? 8 : 5;
}

export function gazetteerConfidence(alias, declared, acronym) {
  if (declared === "low") return "low";
  if (acronym) return alias.replace(/[^A-Za-z0-9]/g, "").length >= 3 ? "high" : "medium";
  const tokens = alias.split(" ").filter(Boolean);
  if (tokens.length >= 2) {
    if (alias.length >= 8 && !isGenericMultiToken(alias)) return "high";
    return "medium";
  }
  if (alias.length >= 6) return "high";
  return "medium";
}

export function buildGazetteer(aliases) {
  const seen = new Map();
  for (const entry of aliases ?? []) {
    if (!entry || typeof entry.alias !== "string" || typeof entry.target !== "string") continue;
    if (!/^(org|pos|person|topic):/.test(entry.target)) continue;
    const alias = entry.alias.trim();
    if (alias === "") continue;
    const key = normalizeText(alias);
    if (key === "") continue;
    if (seen.has(alias)) continue;
    seen.set(alias, {
      alias,
      key,
      target: entry.target,
      declared: entry.confidence === "high" || entry.confidence === "low" ? entry.confidence : "medium",
    });
  }
  const compiled = [...seen.values()].map((entry) => {
    const acronym = isAcronymAlias(entry.alias);
    const confidence = gazetteerConfidence(entry.alias, entry.declared, acronym);
    const singleToken = entry.alias.split(" ").filter(Boolean).length === 1;
    const capitalized = /^[A-ZÀ-Þ]/.test(entry.alias);
    const caseSensitive = acronym || (singleToken && capitalized && entry.declared === "medium");
    return {
      ...entry,
      acronym,
      caseSensitive,
      confidence,
      regex: new RegExp(
        `(?<![\\p{L}\\p{N}])${escapeRegExp(entry.alias)}(?![\\p{L}\\p{N}])`,
        caseSensitive ? "gu" : "giu",
      ),
    };
  });
  compiled.sort((a, b) => b.alias.length - a.alias.length || (a.alias < b.alias ? -1 : a.alias > b.alias ? 1 : 0));
  return compiled.filter((entry) => entry.confidence !== "low");
}

export function buildTopicIndex(topics) {
  const list = [];
  for (const topic of topics ?? []) {
    if (!topic || typeof topic.id !== "string") continue;
    const keywords = [];
    for (const raw of topic.keywords ?? []) {
      if (typeof raw !== "string") continue;
      const keyword = raw.trim();
      if (keyword === "") continue;
      keywords.push({
        keyword,
        regex: new RegExp(`(?<![\\p{L}\\p{N}])${escapeRegExp(keyword)}(?![\\p{L}\\p{N}])`, "giu"),
      });
    }
    list.push({ id: topic.id, name: topic.name ?? topic.id, keywords });
  }
  return list;
}

export function findTopicMatches(text, topicIndex) {
  const normalized = normalizeText(text);
  const scores = [];
  for (const topic of topicIndex) {
    const hits = [];
    for (const { keyword, regex } of topic.keywords) {
      if (normalized.includes(keyword.toLowerCase()) && regex.test(normalized)) hits.push(keyword);
      regex.lastIndex = 0;
    }
    if (hits.length > 0) scores.push({ id: topic.id, score: hits.length, keywords: [...new Set(hits)].sort(), order: topic.id });
  }
  scores.sort((a, b) => b.score - a.score || a.order.localeCompare(b.order));
  return scores;
}

export function linkArticle({ title = "", text = "", gazetteer = [], topicIndex = [] }) {
  const haystack = [title, text].filter(Boolean).join(" \u2014 ");
  const normalized = normalizeText(haystack);
  const occupied = [];
  const matches = [];

  for (const entry of gazetteer) {
    const acronymLike = entry.acronym;
    if (!acronymLike && entry.alias.length < aliasLengthFloor(entry.alias)) continue;
    if (acronymLike && entry.alias.replace(/[^A-Za-z0-9]/g, "").length < 2) continue;
    if (acronymLike && entry.alias.replace(/[^A-Za-z0-9]/g, "").length < 3 && entry.confidence !== "high") continue;
    const regex = entry.regex;
    regex.lastIndex = 0;
    const match = regex.exec(haystack);
    if (!match) continue;
    const index = match.index;
    const end = index + match[0].length;
    if (occupied.some((span) => index < span.end && end > span.start)) continue;
    occupied.push({ start: index, end });
    matches.push({ entry, index, length: match[0].length, surface: match[0] });
  }

  matches.sort((a, b) => a.index - b.index || b.length - a.length || a.entry.alias.localeCompare(b.entry.alias));

  const entities = [];
  const seenTargets = new Set();
  const highMatches = [];
  for (const match of matches) {
    if (match.entry.confidence === "high" && !seenTargets.has(match.entry.target)) {
      seenTargets.add(match.entry.target);
      highMatches.push(match);
      entities.push(match.entry.target);
    }
  }

  const topicMatches = findTopicMatches(haystack, topicIndex);
  const fallbackTopics = highMatches.length === 0 && topicMatches.length > 0 ? [topicMatches[0].id] : [];
  const summaryMarkup = applyMarkup(haystack, highMatches);

  return {
    summaryMarkup,
    entities,
    topics: topicMatches.map((match) => match.id),
    fallbackTopics,
    matches: matches.map((match) => ({
      alias: match.entry.alias,
      target: match.entry.target,
      confidence: match.entry.confidence,
    })),
    highMatches: highMatches.length,
    topicMatches,
  };
}

export function applyMarkup(text, highMatches) {
  if (highMatches.length === 0) return text;
  let result = "";
  let cursor = 0;
  const ordered = [...highMatches].sort((a, b) => a.index - b.index);
  for (const match of ordered) {
    if (match.index < cursor) continue;
    result += text.slice(cursor, match.index);
    const surface = text.slice(match.index, match.index + match.length);
    result += `<entity id="${match.entry.target}">${surface}</entity>`;
    cursor = match.index + match.length;
  }
  result += text.slice(cursor);
  return result;
}

export async function loadGazetteer(path = DEFAULT_GAZETTEER) {
  if (!existsSync(path)) return [];
  const parsed = JSON.parse(await readFile(path, "utf8"));
  return buildGazetteer(parsed.aliases ?? []);
}

export async function loadTopicIndex(path = DEFAULT_TOPICS) {
  if (!existsSync(path)) return [];
  const parsed = JSON.parse(await readFile(path, "utf8"));
  return buildTopicIndex(parsed.topics ?? []);
}

export async function linkText(text, { gazetteerPath = DEFAULT_GAZETTEER, topicsPath = DEFAULT_TOPICS } = {}) {
  const [gazetteer, topicIndex] = await Promise.all([loadGazetteer(gazetteerPath), loadTopicIndex(topicsPath)]);
  return linkArticle({ title: text, gazetteer, topicIndex });
}

function parseArgs(argv) {
  const options = { gazetteerPath: DEFAULT_GAZETTEER, topicsPath: DEFAULT_TOPICS, text: null };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--gazetteer") options.gazetteerPath = argv[(i += 1)];
    else if (argv[i] === "--topics") options.topicsPath = argv[(i += 1)];
    else if (argv[i] === "--text") options.text = argv[(i += 1)];
  }
  return options;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (!options.text) {
    console.log("Usage: node pipelines/link.mjs --text \"artikeltekst\" [--gazetteer path] [--topics path]");
    return;
  }
  const result = await linkText(options.text, options);
  console.log(`Hits: ${result.matches.length}, high-confidence: ${result.highMatches}`);
  console.log(`Entities: ${result.entities.join(", ") || "(none)"}`);
  console.log(`Topics: ${result.topics.join(", ") || "(none)"}`);
  console.log(`Markup: ${result.summaryMarkup}`);
}

const invokedDirectly = process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url;
if (invokedDirectly) {
  main().catch((error) => {
    console.error(`link failed: ${error.message}`);
    process.exitCode = 1;
  });
}
