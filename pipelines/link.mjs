#!/usr/bin/env bun
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_GAZETTEER = join(ROOT, "research", "J-nieuwsbronnen.json");
const DEFAULT_TOPICS = join(ROOT, "research", "K-topics.json");
const DEFAULT_DATA = join(ROOT, "data");

export const STOPWORDS = new Set([
  "aan", "af", "al", "als", "bij", "dan", "dat", "de", "den", "der", "des", "die", "dit",
  "een", "en", "er", "het", "in", "is", "je", "kan", "maar", "met", "na", "naar", "niet",
  "of", "om", "onder", "op", "over", "te", "tot", "uit", "voor", "was", "we", "ze",
  "zich", "zij", "zijn", "zo",
]);

// Precision rules (docs/adr/0021). A match is only a real mention of the Dutch state
// when nothing in the text points abroad or to a non-government meaning. Every set
// below was built from headlines the linker got wrong; see pipelines/link.test.mjs.

/** Foreign adjectives, countries, places and leaders. Used to spot items about another state. */
const FOREIGN_WORDS = [
  // adjectives (-e form, used before a de-word)
  "Franse", "Duitse", "Britse", "Amerikaanse", "Russische", "Chinese", "Belgische", "Italiaanse", "Spaanse", "Poolse",
  "Hongaarse", "Oekraïense", "Israëlische", "Iraanse", "Turkse", "Zweedse", "Deense", "Noorse", "Griekse", "Indiase",
  "Japanse", "Braziliaanse", "Canadese", "Australische", "Oostenrijkse", "Zwitserse", "Portugese", "Finse", "Roemeense",
  "Syrische", "Egyptische", "Palestijnse", "Mexicaanse", "Argentijnse", "Afghaanse", "Vlaamse", "Waalse", "Gentse",
  "Antwerpse", "Brusselse", "Indonesische", "Zuid-Afrikaanse", "Marokkaanse", "Thaise",
  // countries and regions
  "Frankrijk", "Duitsland", "Engeland", "Groot-Brittannië", "Verenigd Koninkrijk", "Verenigde Staten", "VS", "Amerika",
  "Rusland", "China", "België", "Italië", "Spanje", "Polen", "Hongarije", "Oekraïne", "Israël", "Iran", "Turkije",
  "Zweden", "Denemarken", "Noorwegen", "Griekenland", "India", "Japan", "Brazilië", "Canada", "Australië", "Oostenrijk",
  "Zwitserland", "Portugal", "Finland", "Roemenië", "Syrië", "Egypte", "Gaza", "Vlaanderen", "Wallonië", "Indonesië",
  "Marokko", "Thailand", "Zuid-Afrika",
  // capitals and US states that stand for a foreign government or police
  "Kyiv", "Kiev", "Moskou", "Washington", "Londen", "Parijs", "Berlijn", "Madrid", "Rome", "Athene", "Wenen", "Warschau",
  "Boedapest", "Praag", "Stockholm", "Kopenhagen", "Oslo", "Helsinki", "Lissabon", "Dublin", "Peking", "Tokio", "Caïro",
  "Teheran", "Jeruzalem", "Tel Aviv", "Sydney", "Toronto", "Mississippi", "Massachusetts", "Texas",
  "Florida", "Californië", "New York", "Alabama", "Louisiana", "Minnesota", "Ohio",
  // leaders and seats of power
  "Trump", "Trumps", "Poetin", "Putin", "Starmer", "Macron", "Merz", "Netanyahu", "Zelensky", "Zelenski", "Kremlin",
  "Witte Huis",
];
const DEMONYM_FORMS = [
  ...FOREIGN_WORDS.filter((word) => word.endsWith("e")),
  // Before a het-word such as "kabinet" the adjective has no -e: "Brits kabinet".
  "Frans", "Duits", "Brits", "Amerikaans", "Russisch", "Chinees", "Belgisch", "Italiaans", "Spaans", "Pools", "Hongaars",
  "Oekraïens", "Israëlisch", "Iraans", "Turks", "Zweeds", "Deens", "Noors", "Grieks", "Indiaas", "Japans", "Braziliaans",
  "Canadees", "Australisch", "Oostenrijks", "Zwitsers", "Portugees", "Fins", "Roemeens", "Syrisch", "Egyptisch",
];
const FOREIGN_ALTERNATION = [...FOREIGN_WORDS, ...DEMONYM_FORMS.filter((word) => word !== "Frans")].map(escapeRegExp).join("|");
export const FOREIGN_CONTEXT = new RegExp(`(?<![\\p{L}\\p{N}])(?:${FOREIGN_ALTERNATION})(?![\\p{L}\\p{N}])`, "u");
export const DUTCH_CONTEXT =
  /(?<![\p{L}\p{N}])(?:Nederland|Nederlands\w*|Nederlander\w*|Haagse|Tweede Kamer|Eerste Kamer|Binnenhof|Rijksoverheid|Rijk)(?![\p{L}\p{N}])/u;
/** A foreign adjective directly before a match: "Duitse minister van Defensie". */
const DEMONYM_BEFORE = new RegExp(`(?:${DEMONYM_FORMS.map(escapeRegExp).join("|")})\\s+(?:[\\p{L}-]+\\s+)?$`, "iu");

/** Institution names every state has. A hit needs a Dutch anchor when the text points abroad. */
const GENERIC_INSTITUTIONS = new Set([
  "regering", "de regering", "kabinet", "het kabinet", "politie", "de politie", "douane", "defensie", "de kamer",
  "openbaar ministerie", "raad van state", "rekenkamer", "justitie", "parlement",
]);
const GENERIC_INSTITUTION_PREFIX = /^ministerie van /;

/** Broadcasters: linked only next to a state actor, never for entertainment news. */
const MEDIA_TARGETS = new Set([
  "org:rwt-nederlandse-omroep-stichting-nos",
  "org:zbo-nederlandse-publieke-omroep",
  "org:zbo-stichting-regionale-publieke-omroep",
  "org:rwt-landelijke-omroeporganisaties",
  "org:rwt-stichting-ntr",
]);
/** Acronyms another organisation also uses. The Dutch body needs its article ("het CBS") or a state actor. */
const AMBIGUOUS_ACRONYM_CUES = new Map([["CBS", /(?<![\p{L}\p{N}])het CBS(?![\p{L}\p{N}])/iu]]);
/** A bare place name is a government mention only with a cue that the municipality or province acts. */
const PLACE_TARGET = /^org:(gemeente|provincie)-/;
const EXPLICIT_GOVERNMENT_ALIAS = /^(gemeente|provincie|gemeenteraad|burgemeester|college|waterschap|lid gemeenteraad|wethouder)(?![\p{L}])/iu;
export const GOVERNMENT_CUES =
  /(?<![\p{L}\p{N}])(?:gemeente\w*|wethouder\w*|burgemeester\w*|raadsle\w+|raadslid|provinci\w+|gedeputeerde\w*|commissaris van de koning|waterschap\w*|college van b&w)/iu;

/**
 * Topic keywords that are everyday words or place names. One of them alone proves
 * nothing ("Van Dijk", "auto", "ziekenhuis"); three distinct ones from the same topic
 * do. Every other keyword is a policy term and attaches the topic by itself, unless the
 * text points abroad, when it needs a second one.
 */
export const GENERIC_TOPIC_KEYWORDS = new Set([
  "woning", "woningen", "huur", "huurders", "huurwoning", "huurwoningen", "bouw", "daklozen", "woningmarkt", "corporaties",
  "zorg", "ziekenhuis", "ziekenhuizen", "huisarts", "huisartsen", "verpleeghuis", "medicijn", "pandemie", "kanker", "dementie",
  "verpleegkundige", "wachtlijst",
  "kinderopvang", "gedupeerde", "compensatie", "schulden", "hersteloperatie",
  "klimaat", "klimaatverandering", "energie", "energierekening", "gas", "aardgas", "gasprijs", "elektriciteit", "stroom", "stroomnet",
  "waterstof", "groningen", "zonnepark", "verduurzaming",
  "opvang", "noodopvang", "opvanglocatie", "opvangcentrum", "vluchteling", "vluchtelingen", "migratie", "uitzetting", "mensenhandel",
  "onderwijs", "school", "scholen", "basisschool", "leerlingen", "scholieren", "student", "studenten", "universiteit", "universiteiten",
  "hogeschool", "hogescholen", "mbo", "duo", "studie", "examen", "docent", "leraar", "leraren",
  "veiligheid", "criminaliteit", "misdaad", "misdrijf", "verdachte", "aanhoudingen", "aangifte", "rechter", "drugs", "drugscriminaliteit",
  "witwassen", "schietpartij", "terrorisme", "cybercrime", "slachtoffer", "gevangenis",
  "democratie", "verkiezingen", "debat", "kabinet", "regering", "coalitie", "oppositie", "formatie", "motie", "referendum", "premier",
  "fractie", "zetels", "burgemeester",
  "arbeidsmarkt", "werkgelegenheid", "werknemer", "werkgever", "werkenden", "vacature", "vacatures", "banen", "salaris", "loon",
  "loonsverhoging", "cao", "pensioen", "staking", "vakbond", "fnv", "cnv", "personeelstekorten",
  "boer", "boeren", "landbouw", "veehouderij", "veehouder", "veehouders", "vee", "mest", "natuur", "natuurgebied", "voedsel", "visserij",
  "gewas", "veestapel", "landbouwgrond", "bos", "bomen", "wolf", "ganzen",
  "infrastructuur", "wegen", "snelweg", "verkeer", "trein", "spoor", "spoorlijn", "spoorwegen", "openbaar vervoer", "bus", "metro",
  "fietspad", "brug", "tunnel", "sluis", "dijk", "auto", "automobilisten", "vrachtwagen", "schiphol", "luchthaven", "luchtvaart",
  "vliegtuig", "haven", "verkeersveiligheid",
  "aruba", "curacao", "curaçao", "sint maarten", "sint-maarten", "bonaire", "sint eustatius", "saba", "caribisch",
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

/**
 * A name written with two or more capitalised words ("Inspectie Gezondheidszorg en
 * Jeugd", "Alphen aan den Rijn") is a proper name even when it holds a connector word.
 */
export function isProperNameWithConnectors(alias) {
  const tokens = alias.split(" ").filter(Boolean);
  if (tokens.length < 3) return false;
  const capitalised = tokens.filter((token) => /^[A-ZÀ-Þ]/.test(token)).length;
  return capitalised >= 2 && tokens.some((token) => token.length < 3 || STOPWORDS.has(token.toLowerCase()));
}

export function isGenericMultiToken(alias) {
  const tokens = alias.split(" ").filter(Boolean);
  if (tokens.length < 3) return false;
  if (isProperNameWithConnectors(alias)) return false;
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

function weakKind(entry) {
  if (MEDIA_TARGETS.has(entry.target)) return "media";
  if (AMBIGUOUS_ACRONYM_CUES.has(entry.alias)) return "ambiguous";
  if (PLACE_TARGET.test(entry.target) && !EXPLICIT_GOVERNMENT_ALIAS.test(entry.alias)) return "place";
  return null;
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
    // A proper name with connector words matches only as written, so "asiel en migratie" the
    // phrase is not "Asiel en Migratie" the ministry.
    const caseSensitive =
      acronym || (singleToken && capitalized && entry.declared === "medium") || isProperNameWithConnectors(entry.alias);
    return {
      ...entry,
      acronym,
      caseSensitive,
      confidence,
      generic: GENERIC_INSTITUTIONS.has(entry.key) || GENERIC_INSTITUTION_PREFIX.test(entry.key) || /^pos:/.test(entry.target),
      weak: weakKind(entry),
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
  const pointsAbroad = FOREIGN_CONTEXT.test(text) && !DUTCH_CONTEXT.test(text);
  const scores = [];
  for (const topic of topicIndex) {
    const hits = [];
    for (const { keyword, regex } of topic.keywords) {
      if (normalized.includes(keyword.toLowerCase()) && regex.test(normalized)) hits.push(keyword);
      regex.lastIndex = 0;
    }
    const stem = (hit) => hit.toLowerCase().slice(0, 6);
    const distinct = new Set(hits.map(stem));
    const policyTerms = new Set(hits.filter((hit) => !GENERIC_TOPIC_KEYWORDS.has(hit.toLowerCase())).map(stem));
    // At home one policy term, or three everyday words, attach a topic. Abroad it takes two policy terms.
    const enough = pointsAbroad ? policyTerms.size >= 2 : policyTerms.size >= 1 || distinct.size >= 3;
    if (hits.length > 0 && enough) {
      scores.push({ id: topic.id, score: hits.length, keywords: [...new Set(hits)].sort(), order: topic.id });
    }
  }
  scores.sort((a, b) => b.score - a.score || a.order.localeCompare(b.order));
  return scores;
}

/**
 * Drops matches that are not a real mention of the Dutch state. A generic institution
 * or a position title is dropped when the text points abroad; a person or position
 * after a foreign adjective is dropped; a bare place name needs a government cue or a
 * government outlet; a broadcaster or a shared acronym needs a state actor next to it.
 */
function resolveMentions(found, { haystack, pointsAbroad, governmentOutlet }) {
  const kept = found.filter(({ entry, index }) => {
    if (entry.generic && pointsAbroad) return false;
    if (/^(person|pos):/.test(entry.target) || entry.generic) {
      if (DEMONYM_BEFORE.test(haystack.slice(Math.max(0, index - 40), index))) return false;
    }
    return true;
  });
  const stateActor = kept.some(({ entry }) => entry.weak === null);
  return kept.filter(({ entry }) => {
    if (entry.weak === null) return true;
    if (entry.weak === "place") return governmentOutlet || GOVERNMENT_CUES.test(haystack);
    if (entry.weak === "ambiguous") return stateActor || AMBIGUOUS_ACRONYM_CUES.get(entry.alias).test(haystack);
    return stateActor;
  });
}

/**
 * True when the text is about another state: it names a foreign country, adjective,
 * capital or leader and carries no Dutch anchor. The same test the linker uses to drop
 * generic institutions, exported so the news run can apply it to a politics section
 * (docs/adr/0021, amendment 06-10-2026).
 */
export function pointsAbroad(text) {
  const haystack = String(text ?? "");
  return FOREIGN_CONTEXT.test(haystack) && !DUTCH_CONTEXT.test(haystack);
}

export function linkArticle({ title = "", text = "", gazetteer = [], topicIndex = [], governmentOutlet = false, publisher = "" }) {
  const haystack = [title, text].filter(Boolean).join(" \u2014 ");
  const normalized = normalizeText(haystack);
  const occupied = [];
  const found = [];

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
    found.push({ entry, index, length: match[0].length, surface: match[0] });
  }

  const abroad = pointsAbroad(haystack);
  const ownName = normalizeText(publisher);
  // An outlet is never a mention of itself: "NOS" in a NOS item is the byline, not the body.
  const notOwn = ownName === "" ? found : found.filter(({ entry }) => entry.key !== ownName);
  const matches = resolveMentions(notOwn, { haystack, pointsAbroad: abroad, governmentOutlet });

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
    // The keywords that attached the topics, so the reader can see why (docs/adr/0021).
    topicEvidence: [...new Set(topicMatches.flatMap((match) => match.keywords))],
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

const TITLE_LEADER_FORMS = ["fractievoorzitter", "fractieleider", "partijleider", "leider", "Kamerlid"];
const CARIBBEAN_POSITION = /-(aruba|curacao|sint-maarten)$/;

function stripDiacritics(value) {
  return value.normalize("NFD").replace(/\p{M}/gu, "");
}

/** The surname part of a full name, with its particles, plus the first half of a double-barrelled name. */
function surnameForms(name) {
  const tokens = String(name ?? "").split(" ").filter(Boolean);
  if (tokens.length < 2) return [];
  let start = tokens.findIndex((token, index) => index > 0 && /^[a-zà-ÿ]/.test(token));
  if (start === -1) start = tokens.length - 1;
  const full = tokens.slice(start).join(" ");
  const forms = new Set([full]);
  const parts = full.split("-");
  if (parts.length > 1 && !/^(van|de|der|den)$/i.test(parts[0]) && !/^van /i.test(full)) forms.add(parts[0]);
  for (const form of [...forms]) {
    forms.add(stripDiacritics(form));
    forms.add(form.replace(/’/g, "'"));
  }
  return [...forms].filter((form) => form.length >= 4);
}

/**
 * Aliases such as "minister Heinen", "premier Jetten" or "PVV-leider Wilders", built from
 * the current tenures of the dataset so the linker names only people the dataset holds.
 * An alias that two people share is dropped. Past tenures and acting tenures give none.
 */
export function buildTitleAliases(people, tenures) {
  const byId = new Map((people ?? []).map((person) => [person.id, person]));
  const rows = [];
  for (const tenure of tenures ?? []) {
    if (tenure.end || tenure.acting) continue;
    const person = byId.get(tenure.person);
    if (!person) continue;
    const position = String(tenure.position ?? "");
    if (CARIBBEAN_POSITION.test(position)) continue;
    let titles = [];
    if (position === "pos:minister-president") titles = ["premier", "minister-president", "ministerpresident"];
    else if (/^pos:minister-van-/.test(position)) titles = ["minister"];
    else if (/^pos:staatssecretaris-/.test(position)) titles = ["staatssecretaris"];
    else if (/^pos:fractievoorzitter(-|$)/.test(position)) titles = TITLE_LEADER_FORMS;
    else if (/^pos:burgemeester-/.test(position)) titles = ["burgemeester"];
    for (const title of titles) {
      for (const surname of surnameForms(person.name)) rows.push({ alias: `${title} ${surname}`, target: person.id });
    }
  }
  const targetsByKey = new Map();
  for (const row of rows) {
    const key = row.alias.toLowerCase();
    if (!targetsByKey.has(key)) targetsByKey.set(key, new Set());
    targetsByKey.get(key).add(row.target);
  }
  const seen = new Set();
  const aliases = [];
  for (const row of rows) {
    const key = row.alias.toLowerCase();
    if (targetsByKey.get(key).size > 1 || seen.has(row.alias)) continue;
    seen.add(row.alias);
    aliases.push({ alias: row.alias, target: row.target, confidence: "high" });
  }
  return aliases;
}

async function readDataArray(dataDir, name) {
  const file = join(dataDir, `${name}.json`);
  if (!existsSync(file)) return [];
  const parsed = JSON.parse(await readFile(file, "utf8"));
  return Array.isArray(parsed) ? parsed : [];
}

/** Title aliases ("minister Heinen") built from the dataset in `dataDir`. */
export async function loadTitleAliases(dataDir = DEFAULT_DATA) {
  const [people, tenures] = await Promise.all([readDataArray(dataDir, "people"), readDataArray(dataDir, "tenures")]);
  return buildTitleAliases(people, tenures);
}

/** The curated aliases plus the title aliases built from the dataset's current tenures. */
export async function loadAliases(path = DEFAULT_GAZETTEER, dataDir = DEFAULT_DATA) {
  const curated = existsSync(path) ? (JSON.parse(await readFile(path, "utf8")).aliases ?? []) : [];
  return [...curated, ...(await loadTitleAliases(dataDir))];
}

export async function loadGazetteer(path = DEFAULT_GAZETTEER, dataDir = DEFAULT_DATA) {
  if (!existsSync(path)) return [];
  return buildGazetteer(await loadAliases(path, dataDir));
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
