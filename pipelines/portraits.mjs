#!/usr/bin/env bun
// Portretverrijking voor Staatsgraaf.
//
// Per persoon wordt de Wikidata-entiteit gezocht (wbsearchentities, daarna
// wbgetentities), waarna van Wikimedia Commons de licentie- en auteursinformatie
// van de P18-afbeelding wordt opgehaald en een thumbnail van 320 px wordt
// gedownload. Alleen bestanden met een herkenbare licentie komen in aanmerking;
// alles daarbuiten is een benoemde gap.
//
// De pipeline draait na `bun run merge` en schrijft data/media.json,
// data/sources.json en de portret-, Wikidata- en Wikipedia-velden in
// data/people.json. De volgende merge laat die persoonsvelden weer vallen;
// de cache onder research/raw/portraits/ maakt opnieuw toepassen dan een
// lokale bewerking zonder netwerk.
//
// Tweede pas (25-09-2026): research/raw/portraits/review.json bevat handmatig
// beoordeelde koppelingen (identiteit via ambt, gemeente of geboortedatum; foto
// bekeken) naar een Commons-bestand of een TK-portretfoto. Die worden live op
// licentie gecontroleerd en via de cache toegepast; afgewezen kandidaten staan
// daar met reden en verschijnen als benoemde gap.
//
// Derde pas (05-10-2026): elke beoordeelde regel moet een tweede bewijs naast de
// naam dragen (ambt, gemeente of geboortedatum, veld `evidence`), een afwijkende
// geboortedatum (naamgenoot) weigert, en het Commons-bestand moet de persoon zelf
// noemen. `--discover` zoekt kandidaten op Commons en schrijft ze naar
// research/raw/portraits/deep/; het past er nooit een toe, dat blijft handwerk
// via review.json.
//
// No dependencies. Node ESM only.

import { readFile, writeFile, mkdir, stat, rm, rename } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

export const USER_AGENT =
  "StaatsgraafBot/0.1 (https://github.com/techneissa/staatsgraaf; Wikidata- en Commons-verrijking van de publieke dataset)";
export const THROTTLE_MS = 250;
export const SEARCH_LIMIT = 5;
export const MAX_NAME_FORMS = 3;
export const THUMB_WIDTH = 320;
export const MAX_IMAGE_BYTES = 2_500_000;
// A Commons original narrower than this is too small to show (Baukje Dijkstra, 89 px, 25-09-2026).
export const MIN_ORIGINAL_WIDTH = 200;
export const WIKIDATA_API = "https://www.wikidata.org/w/api.php";
export const COMMONS_API = "https://commons.wikimedia.org/w/api.php";
export const NLWIKI_API = "https://nl.wikipedia.org/w/api.php";
export const ENWIKI_API = "https://en.wikipedia.org/w/api.php";
export const HUMAN_QID = "Q5";
// Ophogen zodra de resolutielogica verandert: oudere cachebestanden worden
// dan opnieuw bevraagd in plaats van stil te blijven staan.
// 3 (24-09-2026): "Attribution" accepted, EK website portraits withdrawn, known
// Wikidata entities re-checked for a newer P18.
export const CACHE_VERSION = 3;

// Nederland, het Koninkrijk der Nederlanden en Caribisch Nederland. Een entiteit
// met een andere nationaliteit is nooit de juiste persoon voor deze dataset.
export const NL_CITIZENSHIP = Object.freeze(["Q55", "Q29999", "Q252"]);

// Licenties die Wikimedia Commons noemt en die herleidbaar zijn tot een vaste
// SPDX-achtige waarde. "Attribution" alleen (korte naam van Commons wanneer de
// versie niet vaststaat, maar het gebruik met naamsvermelding vrij is) is per
// ADR 0014 toegestaan en wordt verbatim opgeschreven; het resteert een gap
// wanneer het bestand garantslechte of onherkenbare metadata heeft.
export const LICENSE_PATTERNS = Object.freeze([
  [/^cc0/, "CC0-1.0"],
  [/^cc[ -]?by[ -]?sa[ -]?4/, "CC-BY-SA-4.0"],
  [/^cc[ -]?by[ -]?sa[ -]?3/, "CC-BY-SA-3.0"],
  [/^cc[ -]?by[ -]?sa[ -]?2/, "CC-BY-SA-2.0"],
  [/^cc[ -]?by[ -]?4/, "CC-BY-4.0"],
  [/^cc[ -]?by[ -]?3/, "CC-BY-3.0"],
  [/^cc[ -]?by[ -]?2/, "CC-BY-2.0"],
  [/^attribution$/, "Attribution"],
  [/^(public domain|publiek domein|pd)$/, "publiek-domein"],
  // Commons-sjabloon {{European Parliament}}: hergebruik, ook commercieel, toegestaan
  // met bronvermelding volgens https://www.europarl.europa.eu/legal-notice/ (gelezen
  // 25-09-2026, research/raw/portraits/licences/). Verbatim vastgelegd, zoals "Attribution".
  [/^european parliament$/, "European Parliament"],
  // Commons-sjabloon {{Copyrighted free use}}: vrij gebruik voor elk doel, ook commercieel
  // en met bewerking. Verbatim vastgelegd.
  [/^copyrighted free use$/, "Copyrighted free use"],
]);

// Een Commons-bestand in een van deze categorieen heeft een betwiste of ontbrekende
// licentie (lopend verwijderverzoek, geen toestemming, geen bron). Zo'n bestand wordt
// nooit gebruikt, ook niet als de licentienaam herkenbaar is.
export const BLOCKING_CATEGORY = /deletion requests?|copyright violations?|no permission|no source|no license|without a licen[cs]e|possibly unfree|speedy deletion/i;

export function isBlockedFile(commons) {
  return (commons?.categories ?? []).some((category) => BLOCKING_CATEGORY.test(String(category)));
}

const TITLE_TOKENS = new Set(["dhr", "mevr", "mevrouw", "heer", "mr", "dr", "prof", "ir", "drs", "ing"]);

export function decodeHtml(value) {
  if (typeof value !== "string") return "";
  return value
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, decimal) => String.fromCodePoint(Number(decimal)))
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&apos;/g, "'");
}

export function stripTags(value) {
  return decodeHtml(String(value ?? ""))
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Lowercase, accentloos en zonder leestekens, voor naamvergelijking. */
export function normalizeName(value) {
  if (typeof value !== "string") return "";
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[.'\u2019\u00b7]/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

/** Naam in tokens; aanspreekvormen vallen weg, initialen en tussenvoegsels blijven. */
export function nameTokens(value) {
  const normalized = normalizeName(value);
  if (normalized === "") return [];
  return normalized.split(" ").filter((token) => token !== "" && !TITLE_TOKENS.has(token));
}

/**
 * Zoekvormen voor Wikidata, meest specifiek eerst: de naam zelf, elke alias en
 * de roepnaam uit een haakje ("dhr. D.G. (Derk) Boswijk" geeft "Derk Boswijk").
 */
export function nameForms(person) {
  const raw = [person?.name, ...(Array.isArray(person?.aliases) ? person.aliases : [])].filter(
    (value) => typeof value === "string" && value.trim() !== "",
  );
  const forms = [];
  const add = (value) => {
    const cleaned = String(value).replace(/\s+/g, " ").replace(/^[\s,;.-]+|[\s,;.-]+$/g, "");
    const key = normalizeName(cleaned);
    if (key.length < 3) return;
    if (forms.some((form) => normalizeName(form) === key)) return;
    forms.push(cleaned);
  };
  for (const value of raw) {
    add(value);
    const paren = value.match(/\(([^)]+)\)/);
    if (paren) {
      const lastName = value
        .replace(/\([^)]*\)/g, " ")
        .split(/\s+/)
        .filter(Boolean)
        .pop();
      if (lastName) add(`${paren[1].trim()} ${lastName}`);
    }
  }
  const specificity = (form) => nameTokens(form).filter((token) => token.length > 2).length;
  forms.sort((a, b) => specificity(b) - specificity(a) || b.length - a.length);
  return forms.slice(0, MAX_NAME_FORMS);
}

export function claimValues(entity, property) {
  const claims = entity?.claims?.[property];
  if (!Array.isArray(claims)) return [];
  return claims.map((claim) => claim?.mainsnak?.datavalue?.value).filter((value) => value !== undefined);
}

export function claimIds(entity, property) {
  return claimValues(entity, property)
    .map((value) => value?.id)
    .filter((value) => typeof value === "string");
}

/**
 * Wikidata-tijd ("+1987-03-25T00:00:00Z" met precisie 11) naar ISO-datum.
 * Precisie 10 geeft jaar-maand, 9 alleen het jaar; grover wordt null.
 */
export function formatWikidataTime(value) {
  if (!value || typeof value.time !== "string") return null;
  const match = /^([+-])(\d{4,})-(\d{2})-(\d{2})T/.exec(value.time);
  if (!match) return null;
  const precision = typeof value.precision === "number" ? value.precision : 11;
  if (precision >= 11) return `${match[2]}-${match[3]}-${match[4]}`;
  if (precision === 10) return `${match[2]}-${match[3]}`;
  if (precision === 9) return match[2];
  return null;
}

export function wikipediaUrl(title) {
  if (typeof title !== "string" || title.trim() === "") return null;
  return `https://nl.wikipedia.org/wiki/${encodeURIComponent(title.trim().replace(/ /g, "_"))}`;
}

export function candidateProfile(entity) {
  if (!entity || typeof entity.id !== "string") return null;
  const nlLabel = entity.labels?.nl?.value ?? null;
  const enLabel = entity.labels?.en?.value ?? null;
  const aliases = [
    ...(entity.aliases?.nl ?? []).map((entry) => entry?.value),
    ...(entity.aliases?.en ?? []).map((entry) => entry?.value),
  ].filter((value) => typeof value === "string" && value.trim() !== "");
  return {
    id: entity.id,
    labels: [nlLabel, enLabel].filter((value) => typeof value === "string" && value.trim() !== ""),
    aliases,
    descriptions: [entity.descriptions?.nl?.value, entity.descriptions?.en?.value].filter(
      (value) => typeof value === "string" && value.trim() !== "",
    ),
    isHuman: claimIds(entity, "P31").includes(HUMAN_QID),
    images: claimValues(entity, "P18").filter((value) => typeof value === "string" && value.trim() !== ""),
    image: claimValues(entity, "P18").find((value) => typeof value === "string" && value.trim() !== "") ?? null,
    birthDate: formatWikidataTime(claimValues(entity, "P569")[0]),
    citizenship: claimIds(entity, "P27"),
    parties: claimIds(entity, "P102"),
    positions: claimIds(entity, "P39"),
    sitelinkTitle: entity.sitelinks?.nlwiki?.title ?? null,
    enwikiTitle: entity.sitelinks?.enwiki?.title ?? null,
    wikipedia: wikipediaUrl(entity.sitelinks?.nlwiki?.title ?? null),
  };
}

function birthDatesAgree(personBirth, profileBirth) {
  const personYear = String(personBirth).slice(0, 4);
  const profileYear = String(profileBirth).slice(0, 4);
  if (personYear !== profileYear) return false;
  if (String(personBirth).length >= 10 && String(profileBirth).length >= 10) return personBirth === profileBirth;
  return true;
}

/**
 * Score voor een kandidaat. null betekent afwijzen: geen mens, verkeerde
 * nationaliteit, geen naamdekking of een afwijkende geboortedatum. Een
 * geboortedatum op beide kanten die overeenkomt telt als bewezen match.
 * partyLabels is een Q-id -> partijnaam-tabel; die doorbreekt alleen een
 * gelijke stand, bijvoorbeeld bij twee naamgenoten zonder geboortedatum.
 */
export function scoreCandidate(profile, person, { partyLabels = {} } = {}) {
  if (!profile || profile.isHuman !== true) return null;
  if (Array.isArray(profile.citizenship) && profile.citizenship.length > 0) {
    if (!profile.citizenship.some((id) => NL_CITIZENSHIP.includes(id))) return null;
  }
  const personTokens = new Set(nameTokens([person?.name, ...(person?.aliases ?? [])].join(" ")));
  let best = null;
  for (const name of [...(profile.labels ?? []), ...(profile.aliases ?? [])]) {
    const tokens = nameTokens(name);
    if (tokens.length === 0) continue;
    if (!tokens.every((token) => personTokens.has(token))) continue;
    const exact = normalizeName(name) === normalizeName(person?.name ?? "");
    const coverage = tokens.length / Math.max(1, nameTokens(person?.name ?? "").length);
    const score = (exact ? 2 : 1) + Math.min(1, coverage);
    if (best === null || score > best.score) best = { score, matchedName: name, exact };
  }
  if (best === null) return null;
  const personBirth = typeof person?.birthDate === "string" ? person.birthDate : null;
  const profileBirth = profile.birthDate ?? null;
  if (personBirth && profileBirth) {
    if (!birthDatesAgree(personBirth, profileBirth)) return null;
    best.score += 1;
    best.birthChecked = true;
  }
  const personParty = normalizeName(person?.party ?? "");
  if (personParty !== "" && Array.isArray(profile.parties)) {
    const partyMatch = profile.parties.some((id) =>
      (partyLabels[id] ?? []).some((label) => normalizeName(label) === personParty),
    );
    if (partyMatch) {
      best.score += 0.5;
      best.partyChecked = true;
    }
  }
  return best;
}

/**
 * Kies de beste kandidaat. Twee even sterke kandidaten zonder onderscheidende
 * geboortedatum zijn een gap, geen gok.
 */
export function selectEntity(profiles, person, { partyLabels = {} } = {}) {
  const ranked = [];
  for (const profile of profiles ?? []) {
    const scored = scoreCandidate(profile, person, { partyLabels });
    if (scored) ranked.push({ profile, ...scored });
  }
  ranked.sort((a, b) => b.score - a.score || String(a.profile.id).localeCompare(String(b.profile.id)));
  if (ranked.length === 0) return { profile: null, reason: "geen passende Wikidata-entiteit" };
  const top = ranked[0];
  const tied = ranked.filter((entry) => entry.score === top.score);
  if (tied.length > 1) {
    return {
      profile: null,
      reason: `meerdere gelijkwaardige kandidaten (${top.profile.id}, ${tied[1].profile.id})`,
      tied: tied.map((entry) => entry.profile),
    };
  }
  const confidence = top.birthChecked || (top.exact && top.partyChecked) ? "high" : "medium";
  return { profile: top.profile, score: top.score, matchedName: top.matchedName, confidence };
}

export function filePageUrl(filename) {
  const clean = String(filename ?? "").replace(/^File:/i, "").trim();
  return `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(clean.replace(/ /g, "_"))}`;
}

export function commonsSourceId(filename) {
  return `src:commons-${hashString(filePageUrl(filename))}`;
}

export function wikidataSourceId(slug) {
  return `src:wikidata-${slug}`;
}

export function hashString(value) {
  let hash = 5381;
  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) + hash + value.charCodeAt(index)) >>> 0;
  }
  return hash.toString(16);
}

/** Commons-extmetadata naar een vaste licentie, of null als die niet herkenbaar is. */
export function mapLicense({ licenseRaw = null, licenseCode = null, usageTerms = null } = {}) {
  const values = [licenseCode, licenseRaw, usageTerms]
    .filter((value) => typeof value === "string" && value.trim() !== "")
    .map((value) => stripTags(value).toLowerCase().replace(/_+/g, "-"));
  for (const value of values) {
    for (const [pattern, license] of LICENSE_PATTERNS) {
      if (pattern.test(value)) return license;
    }
  }
  return null;
}

export function buildCredit({ author = null, credit = null, license = null } = {}) {
  const licenseLabel = license ?? "licentie onbekend";
  const who = author || credit || null;
  if (license === "European Parliament") {
    // Het EP vraagt "© European Union, [jaar] – Source: European Parliament".
    const owner = (who ?? "European Union").replace(/^©\s*/, "");
    const line = /european union/i.test(owner) ? `© ${owner}` : `${owner}, © European Union`;
    const sourcePart = /source\s*:/i.test(owner) ? "" : ", Source: European Parliament";
    return `Foto: ${line}${sourcePart}, hergebruik volgens https://www.europarl.europa.eu/legal-notice/, via Wikimedia Commons`;
  }
  if (who && who.toLowerCase() !== "wikimedia commons") {
    return `Foto: ${who}, ${licenseLabel}, via Wikimedia Commons`;
  }
  return `Foto: Wikimedia Commons, ${licenseLabel}`;
}

export function imageExtension(url) {
  try {
    const path = new URL(url).pathname.toLowerCase();
    const match = /\.(jpe?g|png|gif|webp|tiff?)$/.exec(path);
    if (!match) return ".jpg";
    const extension = match[1];
    if (extension === "jpeg" || extension === "tif" || extension === "tiff") return ".jpg";
    return `.${extension}`;
  } catch {
    return ".jpg";
  }
}

export function buildMediaRecord({ person, image, sourceId }) {
  const record = {
    id: `media:portret-${person.slug}`,
    url: `/media/portretten/${person.slug}${imageExtension(image.thumbUrl)}`,
    type: "portrait",
    license: image.license,
    credit: image.creditLine ?? buildCredit(image),
    author: image.author ?? image.credit ?? null,
    source: sourceId,
  };
  if (Number.isFinite(image.width)) record.width = image.width;
  if (Number.isFinite(image.height)) record.height = image.height;
  return record;
}

export function buildWikidataSource(person, resolution, today) {
  const chosen = resolution.chosen;
  return {
    id: wikidataSourceId(person.slug),
    url: chosen.wikidataUrl,
    title: chosen.label ?? person.name,
    publisher: "Wikidata",
    type: "page",
    published: null,
    retrieved: today,
    license: "CC0-1.0",
    archiveUrl: null,
    notes: `Wikidata-entiteit ${chosen.id} voor ${person.name}; gebruikt voor persoonsidentificatie en het portret.`,
  };
}

export function buildCommonsSource(person, resolution, today) {
  const image = resolution.image;
  const wikidataPart = resolution.chosen ? ` (Wikidata ${resolution.chosen.id})` : "";
  return {
    id: commonsSourceId(image.filename),
    url: image.filePage,
    title: `File:${String(image.filename).replace(/^File:/i, "")}`,
    publisher: "Wikimedia Commons",
    type: "page",
    published: null,
    retrieved: today,
    license: image.license,
    archiveUrl: null,
    notes: `Bestandspagina van het portret van ${person.name}${wikidataPart}; gedownload als thumbnail van ${THUMB_WIDTH} px.`,
  };
}

export function buildOfficialSource(person, resolution, today) {
  const image = resolution.image;
  return {
    id: `src:portret-officieel-${person.slug}`,
    url: image.filePage ?? image.thumbUrl,
    title: `Officieel portret van ${person.name}`,
    publisher: image.publisher ?? "officiële bron",
    type: "page",
    published: null,
    retrieved: today,
    license: image.license,
    archiveUrl: null,
    notes: `Officieel portret van ${person.name}, rechtstreeks van de officiële website (${image.source ?? "onbekend"}); gedownload zoals aangeboden.`,
  };
}

function addSourceRef(record, ref) {
  if (!Array.isArray(record.sources)) record.sources = [];
  if (record.sources.some((entry) => entry?.source === ref.source)) return;
  record.sources.push(ref);
}

async function apiGet(fetchImpl, endpoint, params, { userAgent = USER_AGENT, retries = 2 } = {}) {
  const url = `${endpoint}?${new URLSearchParams(params)}`;
  let lastError = null;
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      const response = await fetchImpl(url, {
        headers: {
          "User-Agent": userAgent,
          Accept: "application/json",
          "Accept-Language": "nl-NL,nl;q=0.9,en;q=0.8",
        },
        redirect: "follow",
      });
      if (!response.ok) throw new Error(`HTTP ${response.status} voor ${endpoint}`);
      return await response.json();
    } catch (error) {
      lastError = error;
      if (attempt < retries) await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
    }
  }
  throw lastError ?? new Error(`verzoek aan ${endpoint} mislukt`);
}

export async function fetchCommonsImage(filename, {
  fetchImpl = globalThis.fetch,
  userAgent = USER_AGENT,
} = {}) {
  const page = filePageUrl(filename);
  let body;
  try {
    body = await apiGet(fetchImpl, COMMONS_API, {
      action: "query",
      titles: `File:${String(filename).replace(/^File:/i, "")}`,
      prop: "imageinfo|categories",
      iiprop: "extmetadata|url|size",
      iiurlwidth: String(THUMB_WIDTH),
      cllimit: "max",
      format: "json",
    }, { userAgent });
  } catch (error) {
    return { ok: false, page, reason: `Commons-verzoek mislukt: ${error.message}` };
  }
  const pages = body?.query?.pages ?? {};
  const entry = Object.values(pages).find((value) => value && Array.isArray(value.imageinfo) && value.imageinfo.length > 0);
  const info = entry?.imageinfo?.[0];
  if (!info) return { ok: false, page, reason: "geen Commons-bestandspagina gevonden" };
  const meta = info.extmetadata ?? {};
  const text = (key) => (typeof meta[key]?.value === "string" ? stripTags(meta[key].value) : null);
  const raw = (key) => (typeof meta[key]?.value === "string" ? meta[key].value : null);
  return {
    ok: true,
    page,
    thumbUrl: typeof info.thumburl === "string" ? info.thumburl : info.url ?? null,
    width: Number.isFinite(info.thumbwidth) ? info.thumbwidth : Number.isFinite(info.width) ? info.width : null,
    height: Number.isFinite(info.thumbheight) ? info.thumbheight : Number.isFinite(info.height) ? info.height : null,
    // Commons returns an upscaled thumbnail for a small original; the true size decides.
    originalWidth: Number.isFinite(info.width) ? info.width : null,
    originalHeight: Number.isFinite(info.height) ? info.height : null,
    licenseRaw: text("LicenseShortName"),
    licenseCode: raw("License"),
    usageTerms: text("UsageTerms"),
    licenseUrl: raw("LicenseUrl"),
    author: text("Artist"),
    credit: text("Credit"),
    description: text("ImageDescription"),
    categories: (entry.categories ?? []).map((category) => String(category?.title ?? "").replace(/^Category:/, "")),
  };
}

export function officialImage(hint) {
  return {
    kind: "official",
    filePage: hint.pageUrl ?? null,
    thumbUrl: hint.imageUrl,
    license: hint.license ?? "CC-BY-4.0",
    licenseRaw: hint.licenseRaw ?? "CC BY 4.0",
    author: hint.credit ?? null,
    credit: hint.credit ?? null,
    publisher: hint.publisher ?? null,
    source: hint.sourceLabel ?? null,
    creditLine: `Foto: ${hint.credit ?? hint.publisher ?? "officiële bron"}, ${hint.licenseRaw ?? "licentie op de bronpagina"}, ${hint.pageUrl ?? "bronpagina"}`,
  };
}

/**
 * Wikipedia-paginabeeld als fallback (ADR 0014): het vrije paginabeeld van het
 * Nederlandstalige artikel, via de Commons-bestandspagina geverifieerd. Levert
 * dezelfde vorm als fetchCommonsImage of ok:false.
 */
export async function fetchWikipediaImage(title, {
  fetchImpl = globalThis.fetch,
  userAgent = USER_AGENT,
  endpoint = NLWIKI_API,
} = {}) {
  if (typeof title !== "string" || title.trim() === "") {
    return { ok: false, reason: "geen Wikipedia-titel" };
  }
  const cleaned = decodeURIComponent(title.trim().replace(/ /g, "_"));
  let body;
  try {
    body = await apiGet(fetchImpl, endpoint, {
      action: "query",
      titles: cleaned,
      prop: "pageimages",
      piprop: "name",
      pilicense: "free",
      redirects: 1,
      format: "json",
    }, { userAgent });
  } catch (error) {
    return { ok: false, reason: `Wikipedia-verzoek mislukt: ${error.message}` };
  }
  const entry = Object.values(body?.query?.pages ?? {}).find((page) => page?.pageimage);
  const filename = entry?.pageimage;
  if (!filename) return { ok: false, reason: "geen vrij paginabeeld op Wikipedia" };
  const commons = await fetchCommonsImage(filename, { fetchImpl, userAgent });
  if (!commons.ok) return commons;
  return { ...commons, filename };
}

/**
 * Zoek en beoordeel voor een persoon. Levert een cachebaar resultaat: de
 * gekozen entiteit, de beeldinformatie en per afwijzing de reden. Een hint
 * (officiële portret-URL, zoals de og:image van een EK-pagina) en een volledige
 * naam uit die officiële bron versterken de zoekopdracht en dienen als
 * laatste val (ADR 0014).
 */
export async function resolvePerson(person, {
  fetchImpl = globalThis.fetch,
  userAgent = USER_AGENT,
  throttleMs = THROTTLE_MS,
  sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  nowIso = new Date().toISOString(),
  log = () => {},
  hint = null,
  knownEntity = null,
} = {}) {
  const effective = hint?.fullName
    ? { ...person, aliases: [hint.fullName, ...(Array.isArray(person.aliases) ? person.aliases : [])] }
    : person;
  const forms = nameForms(effective);
  const base = {
    personId: person.id,
    slug: person.slug,
    name: person.name,
    cacheVersion: CACHE_VERSION,
    queriedAt: nowIso,
    forms,
    candidates: [],
    chosen: null,
    image: null,
    reason: null,
    gaps: [],
  };
  const candidateIds = new Map();
  if (knownEntity?.id) {
    // A previous run already matched this person to an entity (by name, birth date,
    // party or an official full name); re-read that entity for a current P18.
    return resolveKnownEntity(person, knownEntity, base, { fetchImpl, userAgent });
  }
  try {
    for (const [index, form] of forms.entries()) {
      const search = await apiGet(fetchImpl, WIKIDATA_API, {
        action: "wbsearchentities",
        search: form,
        language: "nl",
        uselang: "nl",
        type: "item",
        limit: String(SEARCH_LIMIT),
        format: "json",
      }, { userAgent });
      for (const hit of search?.search ?? []) {
        if (hit?.id && !candidateIds.has(hit.id)) {
          candidateIds.set(hit.id, { id: hit.id, label: hit.label ?? null, description: hit.description ?? null });
        }
      }
      if (throttleMs > 0 && index < forms.length - 1) await sleep(throttleMs);
    }
  } catch (error) {
    return { ...base, reason: `Wikidata-zoekopdracht mislukt: ${error.message}` };
  }
  if (candidateIds.size === 0) {
    if (hint?.imageUrl) {
      return { ...base, image: officialImage(hint) };
    }
    return { ...base, reason: "geen Wikidata-treffer voor de naamvarianten" };
  }

  let entities;
  try {
    entities = await apiGet(fetchImpl, WIKIDATA_API, {
      action: "wbgetentities",
      ids: [...candidateIds.keys()].join("|"),
      props: "claims|labels|aliases|descriptions|sitelinks",
      languages: "nl|en",
      sitefilter: "nlwiki|enwiki",
      format: "json",
    }, { userAgent });
  } catch (error) {
    return { ...base, reason: `Wikidata-entiteiten ophalen mislukt: ${error.message}` };
  }
  const profiles = Object.values(entities?.entities ?? {})
    .map((entity) => candidateProfile(entity))
    .filter((profile) => profile !== null);
  const candidates = profiles.map((profile) => ({
    id: profile.id,
    label: profile.labels[0] ?? null,
    description: profile.descriptions[0] ?? null,
    hasImage: profile.images.length > 0,
    birthDate: profile.birthDate,
    citizenship: profile.citizenship,
  }));
  let selection = selectEntity(profiles, person);
  if (
    !selection.profile &&
    selection.tied &&
    selection.tied.length > 1 &&
    typeof person.party === "string" &&
    person.party.trim() !== ""
  ) {
    const partyIds = new Set(selection.tied.flatMap((profile) => profile.parties ?? []));
    if (partyIds.size > 0) {
      try {
        const labels = await apiGet(fetchImpl, WIKIDATA_API, {
          action: "wbgetentities",
          ids: [...partyIds].join("|"),
          props: "labels|aliases",
          languages: "nl|en",
          format: "json",
        }, { userAgent });
        const partyLabels = {};
        for (const [id, party] of Object.entries(labels?.entities ?? {})) {
          const names = [
            party?.labels?.nl?.value,
            party?.labels?.en?.value,
            ...(party?.aliases?.nl ?? []).map((entry) => entry?.value),
            ...(party?.aliases?.en ?? []).map((entry) => entry?.value),
          ].filter((value) => typeof value === "string" && value !== "");
          if (names.length > 0) partyLabels[id] = names;
        }
        selection = selectEntity(profiles, person, { partyLabels });
      } catch {
        // Zonder partijlabels blijft de gelijke stand staan.
      }
    }
  }
  if (!selection.profile) {
    if (hint?.imageUrl) return { ...base, candidates, image: officialImage(hint) };
    return { ...base, candidates, reason: selection.reason };
  }

  return findImageForEntity(selection.profile, {
    score: selection.score,
    matchedName: selection.matchedName,
    confidence: selection.confidence,
  }, { ...base, candidates }, { fetchImpl, userAgent, hint });
}

async function resolveKnownEntity(person, knownEntity, base, { fetchImpl, userAgent }) {
  let entities;
  try {
    entities = await apiGet(fetchImpl, WIKIDATA_API, {
      action: "wbgetentities",
      ids: knownEntity.id,
      props: "claims|labels|aliases|descriptions|sitelinks",
      languages: "nl|en",
      sitefilter: "nlwiki|enwiki",
      format: "json",
    }, { userAgent });
  } catch (error) {
    return { ...base, reason: `Wikidata-entiteit ophalen mislukt: ${error.message}` };
  }
  const profile = candidateProfile(entities?.entities?.[knownEntity.id]);
  if (!profile || profile.isHuman !== true) return { ...base, reason: `eerder gekozen entiteit ${knownEntity.id} is geen mens meer` };
  if (profile.citizenship.length > 0 && !profile.citizenship.some((id) => NL_CITIZENSHIP.includes(id))) {
    return { ...base, reason: `eerder gekozen entiteit ${knownEntity.id} heeft geen Nederlandse nationaliteit` };
  }
  if (person.birthDate && profile.birthDate && !birthDatesAgree(person.birthDate, profile.birthDate)) {
    return { ...base, reason: `geboortedatum van ${knownEntity.id} wijkt af` };
  }
  return findImageForEntity(profile, {
    score: knownEntity.score ?? null,
    matchedName: knownEntity.matchedName ?? null,
    confidence: knownEntity.confidence ?? "medium",
  }, { ...base, candidates: [{ id: profile.id, label: profile.labels[0] ?? null, hasImage: profile.images.length > 0 }], reusedEntity: true }, { fetchImpl, userAgent, hint: null });
}

async function findImageForEntity(profile, match, base, { fetchImpl, userAgent, hint }) {
  const person = { name: base.name };
  const candidates = base.candidates;
  const selection = { profile, ...match };
  const chosen = {
    id: selection.profile.id,
    label: selection.profile.labels[0] ?? person.name,
    wikidataUrl: `https://www.wikidata.org/wiki/${selection.profile.id}`,
    wikipedia: selection.profile.wikipedia,
    enwiki: selection.profile.enwikiTitle
      ? `https://en.wikipedia.org/wiki/${encodeURIComponent(selection.profile.enwikiTitle.replace(/ /g, "_"))}`
      : null,
    birthDate: selection.profile.birthDate,
    matchedName: selection.matchedName,
    score: selection.score,
    confidence: selection.confidence,
  };

  let image = null;
  const attempts = [];
  if (selection.profile.images.length > 0) {
    for (const filename of selection.profile.images) {
      const commons = await fetchCommonsImage(filename, { fetchImpl, userAgent });
      if (!commons.ok) {
        attempts.push(`${filename}: ${commons.reason}`);
        continue;
      }
      if (isBlockedFile(commons)) {
        attempts.push(`${filename}: betwiste licentie op Commons (${commons.categories.filter((c) => BLOCKING_CATEGORY.test(c)).join(", ")})`);
        continue;
      }
      const license = mapLicense(commons);
      if (!license) {
        attempts.push(`${filename}: licentie niet herkend (${commons.licenseRaw ?? "geen licentie vermeld"})`);
        continue;
      }
      image = {
        kind: "commons",
        filename,
        filePage: commons.page,
        thumbUrl: commons.thumbUrl,
        width: commons.width,
        height: commons.height,
        license,
        licenseRaw: commons.licenseRaw,
        licenseUrl: commons.licenseUrl,
        author: commons.author,
        credit: commons.credit,
        description: commons.description,
      };
      break;
    }
  }
  if (!image && hint?.imageUrl) {
    image = officialImage(hint);
  }
  if (!image && chosen.wikipedia) {
    const nlTitle = String(chosen.wikipedia).split("/wiki/")[1] ?? null;
    const enTitle = chosen.enwiki ? String(chosen.enwiki).split("/wiki/")[1] : null;
    for (const [index, title] of [nlTitle, enTitle].filter(Boolean).entries()) {
      const wikiImage = await fetchWikipediaImage(title, {
        fetchImpl,
        userAgent,
        endpoint: index === 0 ? NLWIKI_API : ENWIKI_API,
      });
      if (!wikiImage?.ok) {
        attempts.push(`Wikipedia-fallback (${title}): ${wikiImage?.reason ?? "onbekend"}`);
        continue;
      }
      if (isBlockedFile(wikiImage)) {
        attempts.push(`Wikipedia-paginabeeld ${wikiImage.filename}: betwiste licentie op Commons`);
        continue;
      }
      const license = mapLicense(wikiImage);
      if (!license) {
        attempts.push(`Wikipedia-paginabeeld ${wikiImage.filename}: licentie niet herkend (${wikiImage.licenseRaw ?? "geen licentie vermeld"})`);
        continue;
      }
      image = {
        kind: "commons",
        filename: wikiImage.filename,
        filePage: wikiImage.page,
        thumbUrl: wikiImage.thumbUrl,
        width: wikiImage.width,
        height: wikiImage.height,
        license,
        licenseRaw: wikiImage.licenseRaw,
        licenseUrl: wikiImage.licenseUrl,
        author: wikiImage.author,
        credit: wikiImage.credit,
        description: wikiImage.description,
        fallback: "wikipedia",
      };
      break;
    }
  }
  if (image) return { ...base, candidates, chosen, image };
  if (attempts.length === 0 && selection.profile.images.length === 0 && !hint?.imageUrl && !chosen.wikipedia) {
    attempts.push("geen P18-afbeelding op Wikidata en geen fallback beschikbaar");
  }
  return { ...base, candidates, chosen, gaps: [{ what: "portret", reason: attempts.join("; ") || "geen bruikbaar portret" }] };
}

async function downloadImage(url, destination, {
  fetchImpl = globalThis.fetch,
  userAgent = USER_AGENT,
  maxBytes = MAX_IMAGE_BYTES,
} = {}) {
  if (typeof url !== "string" || url === "") throw new Error("geen thumbnail-URL");
  const response = await fetchImpl(url, {
    headers: { "User-Agent": userAgent, Accept: "image/*" },
    redirect: "follow",
  });
  if (!response.ok) throw new Error(`HTTP ${response.status} bij het downloaden van de thumbnail`);
  const contentType = response.headers?.get?.("content-type") ?? "";
  if (contentType !== "" && !contentType.startsWith("image/")) {
    throw new Error(`onverwacht content-type ${contentType}`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length === 0) throw new Error("lege afbeelding");
  if (buffer.length > maxBytes) throw new Error(`afbeelding groter dan ${maxBytes} bytes`);
  await writeFile(destination, buffer);
  return buffer.length;
}

function formatDateNL(date) {
  const iso = typeof date === "string" ? date.slice(0, 10) : new Date(date).toISOString().slice(0, 10);
  const [year, month, day] = iso.split("-");
  return `${day}-${month}-${year}`;
}

export function renderPortraitReport({ stats, gaps, today, licenseCounts = {} }) {
  const lines = [];
  lines.push(`# Run report: portretten ${formatDateNL(today)}`);
  lines.push("");
  lines.push("## Tellingen");
  lines.push("");
  lines.push(`- Personen in de selectie: ${stats.scanned}.`);
  lines.push(`- Al bekend uit cache: ${stats.fromCache}; nieuw bevraagd: ${stats.queried}.`);
  lines.push(`- Persoonsmatches op Wikidata: ${stats.entityMatches}.`);
  lines.push(`- Toegepaste portretten: ${stats.portraitsApplied}.`);
  lines.push(`- Afbeeldingen gedownload: ${stats.imagesDownloaded}; al aanwezig: ${stats.imagesPresent}.`);
  lines.push(`- Gaps: ${gaps.length}.`);
  if (stats.withdrawnEk) lines.push(`- Ingetrokken portretten van de EK-website: ${stats.withdrawnEk}.`);
  if (stats.tkApplied !== undefined) lines.push(`- Officiele TK-portretten (CC0 1.0): ${stats.tkApplied} toegepast, waarvan ${stats.tkReplaced} ter vervanging van een ouder portret; ${stats.tkSkipped} overgeslagen.`);
  if (stats.reviewedApplied) lines.push(`- Handmatig beoordeelde portretten (research/raw/portraits/review.json) toegepast: ${stats.reviewedApplied}.`);
  if (stats.reviewedWithdrawn) lines.push(`- Ingetrokken na beoordeling (betwiste licentie): ${stats.reviewedWithdrawn}.`);
  if (stats.redownloaded) lines.push(`- Opnieuw gedownload omdat Wikidata een ander P18-bestand aanwijst: ${stats.redownloaded}.`);
  if (typeof stats.remaining === "number" && stats.remaining > 0) {
    lines.push(`- --max-new bereikt: ${stats.remaining} personen resteren voor de volgende run.`);
  }
  if (typeof stats.orphanMedia === "number" && stats.orphanMedia > 0) {
    lines.push(
      stats.prunedMedia > 0
        ? `- Orphan media (media:portret-* zonder verwijzende persoon): ${stats.orphanMedia} gevonden, ${stats.prunedMedia} verwijderd uit data/media.json.`
        : `- Orphan media (media:portret-* zonder verwijzende persoon): ${stats.orphanMedia} gevonden, niet verwijderd (voeg --prune toe).`,
    );
  }
  lines.push("");
  lines.push("## Licenties van toegepaste portretten");
  lines.push("");
  const licenses = Object.entries(licenseCounts).filter(([, count]) => count > 0).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  if (licenses.length === 0) {
    lines.push("Geen.");
  } else {
    lines.push("| licentie | aantal |");
    lines.push("| --- | --- |");
    for (const [license, count] of licenses) lines.push(`| ${license} | ${count} |`);
  }
  lines.push("");
  lines.push("## Gaps");
  lines.push("");
  if (gaps.length === 0) {
    lines.push("Geen.");
  } else {
    let number = 1;
    for (const gap of gaps) {
      lines.push(`${number}. \`${gap.person}\` (${gap.name}): ${gap.reason}`);
      number += 1;
    }
  }
  lines.push("");
  lines.push("## Toelichting");
  lines.push("");
  lines.push("- Alleen Wikimedia Commons-bestanden met een herkenbare licentie (CC0, CC BY, CC BY-SA, publiek domein of, per ADR 0014, de korte naam \"Attribution\") zijn toegepast; de creditline staat in `data/media.json`.");
  lines.push("- Voor huidige Tweede Kamerleden gaat de officiele portretfoto uit het Gegevensmagazijn van de Tweede Kamer voor (CC0 1.0 volgens https://opendata.tweedekamer.nl/disclaimer). Zonder bruikbaar Commons-portret valt de resolver terug op het vrije paginabeeld van het Wikipedia-artikel.");
  lines.push("- Portretten van de EK-website worden niet meer gebruikt: het colofon (https://www.eerstekamer.nl/begrip/colofon) staat herpublicatie van beeldmateriaal zonder toestemming niet toe.");
  lines.push("- Een ontbrekende of onherkenbare licentie, een ontbrekende P18 en een dubbele kandidaat zonder officiële fallback zijn gaps. Er is niets geschat.");
  lines.push(`- De thumbnails van ${THUMB_WIDTH} px staan onder \`web/public/media/portretten/\` en worden van de eigen origin geserveerd.`);
  lines.push("");
  return `${lines.join("\n")}\n`;
}


export const TK_ODATA = "https://gegevensmagazijn.tweedekamer.nl/OData/v4/2.0";
export const TK_LICENSE_PAGE = "https://opendata.tweedekamer.nl/disclaimer";
export const EK_COLOFON = "https://www.eerstekamer.nl/begrip/colofon";

/** Fetch the current Tweede Kamer members with their Persoon record (CC0 1.0 per TK_LICENSE_PAGE). */
export async function fetchTkMembers({ fetchImpl = globalThis.fetch, userAgent = USER_AGENT } = {}) {
  const url = `${TK_ODATA}/FractieZetelPersoon?$filter=${encodeURIComponent("TotEnMet eq null and Verwijderd eq false")}&$expand=Persoon&$top=250`;
  const response = await fetchImpl(url, { headers: { "User-Agent": userAgent, Accept: "application/json" } });
  if (!response.ok) throw new Error(`HTTP ${response.status} voor ${url}`);
  const body = await response.json();
  return (body?.value ?? [])
    .map((row) => row?.Persoon)
    .filter((persoon) => persoon && typeof persoon.Id === "string" && persoon.Functie === "Tweede Kamerlid")
    .map((persoon) => ({
      id: persoon.Id,
      fullName: [persoon.Voornamen, persoon.Tussenvoegsel, persoon.Achternaam].filter(Boolean).join(" "),
      roepnaam: persoon.Roepnaam ?? null,
      birthDate: typeof persoon.Geboortedatum === "string" ? persoon.Geboortedatum.slice(0, 10) : null,
      contentType: persoon.ContentType ?? null,
      contentLength: persoon.ContentLength ?? null,
      changed: persoon.GewijzigdOp ?? null,
      resourceUrl: `${TK_ODATA}/Persoon(${persoon.Id})/resource`,
      recordUrl: `${TK_ODATA}/Persoon(${persoon.Id})`,
    }));
}

/**
 * Match TK members to dataset people. A match needs a current Tweede Kamer
 * membership in the dataset, the same full name (Voornamen, tussenvoegsel,
 * achternaam) and, when both sides have one, the same birth date. Anything
 * short of that is left alone: a wrong face is worse than no face.
 */
export function matchTkMembers(members, people, memberships) {
  const current = new Set(
    memberships.filter((m) => m.organization === "org:tweede-kamer" && !m.end).map((m) => m.person),
  );
  const byName = new Map();
  for (const member of members) {
    const key = normalizeName(member.fullName);
    byName.set(key, byName.has(key) ? null : member);
  }
  const matches = [];
  for (const person of people) {
    if (!current.has(person.id)) continue;
    const member = byName.get(normalizeName(person.name));
    if (!member) continue;
    if (person.birthDate && member.birthDate && person.birthDate !== member.birthDate) continue;
    matches.push({ person, member, birthChecked: Boolean(person.birthDate && member.birthDate) });
  }
  return matches;
}

/**
 * Resize to at most THUMB_WIDTH px wide with ImageMagick or sips; smaller images
 * (older TK photos are 112 px wide) are never enlarged. Returns false when
 * neither tool works.
 */
export function resizeImage(source, destination, width = THUMB_WIDTH) {
  const magick = spawnSync("magick", [source, "-resize", `${width}x>`, "-strip", "-quality", "85", destination]);
  if (magick.status === 0) return true;
  const sips = spawnSync("sips", ["--resampleWidth", String(width), source, "--out", destination]);
  return sips.status === 0;
}

export function buildTkMediaRecord(person, extension = ".jpg") {
  return {
    id: `media:portret-${person.slug}`,
    url: `/media/portretten/${person.slug}${extension}`,
    type: "portrait",
    license: "CC0-1.0",
    credit: "Foto: Tweede Kamer der Staten-Generaal, CC0 1.0, via het Open Data Portaal van de Tweede Kamer",
    author: null,
    source: `src:portret-tk-${person.slug}`,
  };
}

export function buildTkSource(person, member, today) {
  return {
    id: `src:portret-tk-${person.slug}`,
    url: member.recordUrl,
    title: `Portretfoto van ${member.fullName} (Persoon ${member.id})`,
    publisher: "Tweede Kamer der Staten-Generaal",
    type: "api",
    published: member.changed ? String(member.changed).slice(0, 10) : null,
    retrieved: today,
    license: "CC0-1.0",
    archiveUrl: null,
    notes: `Officiele portretfoto uit het Gegevensmagazijn van de Tweede Kamer (${member.resourceUrl}), verkleind tot ${THUMB_WIDTH} px breed. Licentie: CC0 1.0 volgens ${TK_LICENSE_PAGE}, gecontroleerd op 24-09-2026.`,
  };
}

/** True for a media record that came from an Eerste Kamer member page (ADR 0014, withdrawn 24-09-2026). */
export function isEkWebsitePortrait(mediaRecord, sourceRecord) {
  if (!mediaRecord || !String(mediaRecord.source ?? "").startsWith("src:portret-officieel-")) return false;
  return /eerstekamer\.nl/.test(sourceRecord?.url ?? "") || /Eerste Kamer/.test(mediaRecord.credit ?? "");
}

// Handmatig beoordeelde portretten (tweede pas van 25-09-2026). Elke regel legt de
// identiteit vast met naam plus ambt, gemeente of geboortedatum uit een tweede bron;
// de foto zelf is bekeken. De licentie wordt bij het oplossen live gecontroleerd.
export const REVIEW_FILE = join("research", "raw", "portraits", "review.json");

export function reviewKey(entry) {
  return hashString(JSON.stringify(entry));
}

/** Tweede bewijs naast de naam dat een review-regel mag dragen (ADR 0014, amendement 2 en 3). */
export const REVIEW_EVIDENCE_KINDS = Object.freeze(["office", "municipality", "birthDate"]);

/** The accepted kinds of second evidence on a review entry; unknown kinds ("depicts", "name") do not count. */
export function reviewEvidenceKinds(entry) {
  const list = Array.isArray(entry?.evidence) ? [...entry.evidence] : [];
  // A TK photo is only applied when name and birth date both match the TK record.
  if (entry?.kind === "tk" && entry.birthDate) list.push("birthDate");
  return [...new Set(list.filter((kind) => REVIEW_EVIDENCE_KINDS.includes(kind)))];
}

/**
 * Toets een review-regel aan de persoon voordat er iets wordt opgehaald.
 * Een naam alleen is geen bewijs; een Commons "depicts"-tag ook niet. Een
 * afwijkende geboortedatum betekent een naamgenoot. Een intrekking mag altijd.
 */
export function checkReviewEntry(person, entry) {
  if (entry?.kind === "withdraw") return { ok: true, kinds: [] };
  const kinds = reviewEvidenceKinds(entry);
  if (kinds.length === 0) {
    return { ok: false, kinds, reason: "geen tweede bewijs naast de naam (ambt, gemeente of geboortedatum); een naam of een Commons-depicts-tag alleen is niet genoeg" };
  }
  const known = typeof entry?.birthDate === "string" ? entry.birthDate : null;
  if (known && person?.birthDate && !birthDatesAgree(person.birthDate, known)) {
    return { ok: false, kinds, reason: `naamgenoot: geboortedatum ${known} van de kandidaat wijkt af van ${person.birthDate} in de dataset` };
  }
  return { ok: true, kinds };
}

/** Significant name tokens (no forms of address, no one-letter initials) of one name. */
function significantTokens(value) {
  return nameTokens(value).filter((token) => token.length > 1);
}

/**
 * Does the Commons file name the person? Every significant token of the person's
 * name (or of the reviewed `fullName`, needed for initials-only names) must occur in the file title, description or
 * categories. The check protects against a review entry that points at the wrong
 * file; it does not replace looking at the photo.
 */
export function commonsFileNamesPerson(commons, filename, person, entry = null) {
  const hay = new Set(
    nameTokens([String(filename ?? ""), commons?.description ?? "", ...(commons?.categories ?? [])].join(" ")),
  );
  const names = [entry?.fullName, entry?.expectName, person?.name, ...(person?.aliases ?? [])].filter(Boolean);
  return names.some((name) => {
    const tokens = significantTokens(name);
    return tokens.length >= 2 && tokens.every((token) => hay.has(token));
  });
}

const IMAGE_FILE = /\.(jpe?g|png|gif|webp|tiff?)$/i;

const OFFICE_WORDS = /burgemeester|gezaghebber|commissaris|dijkgraaf|minister|staatssecretaris|kamerlid|senator|president|voorzitter|directeur|mayor|member of|chair/i;

/**
 * Beoordeel een Commons-bestand als kandidaat voor een persoon, zonder iets toe te passen.
 * eligible betekent: herkende licentie, geen verwijder- of permissiecategorie, het bestand
 * noemt de persoon en de bestandstekst draagt zelf een tweede bewijs (gemeente of ambt).
 * Alles daarbuiten is refused met de reden; een mens beslist daarna over review.json.
 */
export function evaluateCommonsCandidate(commons, filename, person, context = {}) {
  const reasons = [];
  const license = commons?.ok ? mapLicense(commons) : null;
  if (!commons?.ok) reasons.push(commons?.reason ?? "bestand niet op te halen");
  else if (isBlockedFile(commons)) reasons.push("betwiste licentie op Commons (verwijderverzoek, geen toestemming of geen licentie)");
  else if (!license) reasons.push(`licentie niet toegestaan of niet herkend (${commons.licenseRaw ?? "geen licentie vermeld"})`);
  const names = commons?.ok ? commonsFileNamesPerson(commons, filename, person) : false;
  if (commons?.ok && !names) reasons.push("het bestand noemt de persoon niet bij naam");
  const text = normalizeName([String(filename ?? ""), commons?.description ?? "", ...(commons?.categories ?? [])].join(" "));
  const evidence = [];
  const place = normalizeName(context.municipality ?? "");
  if (place !== "" && text.includes(place)) evidence.push("municipality");
  if (OFFICE_WORDS.test(text)) evidence.push("office");
  if (commons?.ok && license && names && evidence.length === 0) reasons.push("geen tweede bewijs in de bestandstekst (ambt of gemeente)");
  if (commons?.ok && Number.isFinite(commons.originalWidth) && commons.originalWidth < MIN_ORIGINAL_WIDTH) {
    reasons.push(`afbeelding te klein (${commons.originalWidth} px breed)`);
  }
  return { filename, license, eligible: reasons.length === 0, evidence, reasons };
}

/** Search Commons for files that may show a person. Candidates only; nothing is applied. */
export async function discoverCommonsCandidates(person, {
  context = {},
  fetchImpl = globalThis.fetch,
  userAgent = USER_AGENT,
  throttleMs = THROTTLE_MS,
  sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  perQuery = 10,
} = {}) {
  const queries = [];
  for (const form of nameForms(person)) {
    if (significantTokens(form).length >= 2) queries.push(`"${form}"`);
  }
  const surname = String(person?.name ?? "").replace(/\([^)]*\)/g, " ").trim().split(/\s+/).filter(Boolean).pop();
  if (context.municipality && surname) queries.push(`burgemeester ${context.municipality} ${surname}`);
  const titles = new Set();
  const failures = [];
  for (const query of queries) {
    try {
      const body = await apiGet(fetchImpl, COMMONS_API, {
        action: "query", list: "search", srsearch: query, srnamespace: "6", srlimit: String(perQuery), format: "json",
      }, { userAgent });
      // Only still images can become a portrait; videos, audio and PDFs are skipped.
      for (const hit of body?.query?.search ?? []) {
        const title = String(hit.title).replace(/^File:/, "");
        if (IMAGE_FILE.test(title)) titles.add(title);
      }
    } catch (error) {
      failures.push(`${query}: ${error.message}`);
    }
    if (throttleMs > 0) await sleep(throttleMs);
  }
  const candidates = [];
  for (const filename of titles) {
    const commons = await fetchCommonsImage(filename, { fetchImpl, userAgent });
    candidates.push({ page: filePageUrl(filename), ...evaluateCommonsCandidate(commons, filename, person, context), author: commons.author ?? null });
    if (throttleMs > 0) await sleep(throttleMs);
  }
  return { person: person.id, queries, failures, candidates };
}

/** TK Persoon-record ophalen en toetsen aan de verwachte naam en geboortedatum. */
export async function fetchTkPersoon(tkId, { fetchImpl = globalThis.fetch, userAgent = USER_AGENT } = {}) {
  const recordUrl = `${TK_ODATA}/Persoon(${tkId})`;
  const response = await fetchImpl(recordUrl, { headers: { "User-Agent": userAgent, Accept: "application/json" } });
  if (!response.ok) throw new Error(`HTTP ${response.status} voor ${recordUrl}`);
  const persoon = await response.json();
  const tussen = persoon.Tussenvoegsel ? `${persoon.Tussenvoegsel} ` : "";
  return {
    id: persoon.Id,
    fullName: [persoon.Voornamen, persoon.Tussenvoegsel, persoon.Achternaam].filter(Boolean).join(" "),
    callName: persoon.Roepnaam ? `${persoon.Roepnaam} ${tussen}${persoon.Achternaam}` : null,
    birthDate: typeof persoon.Geboortedatum === "string" ? persoon.Geboortedatum.slice(0, 10) : null,
    functie: persoon.Functie ?? null,
    contentLength: persoon.ContentLength ?? null,
    changed: persoon.GewijzigdOp ?? null,
    recordUrl,
    resourceUrl: `${recordUrl}/resource`,
  };
}

/** True when a TK Persoon matches the reviewed name and birth date exactly. */
export function tkPersoonMatches(member, entry) {
  if (!member || !entry) return false;
  const expected = normalizeName(entry.expectName ?? "");
  const names = [member.fullName, member.callName].filter(Boolean).map(normalizeName);
  if (expected === "" || !names.includes(expected)) return false;
  return Boolean(entry.birthDate) && member.birthDate === entry.birthDate;
}

/**
 * Een beoordeelde regel omzetten in een cachebare resolutie. Faalt de live
 * controle (licentie, verwijderverzoek, naam of geboortedatum), dan wordt het
 * een gap met de reden; er wordt nooit iets anders gekozen.
 */
export async function resolveReviewed(person, entry, { fetchImpl = globalThis.fetch, userAgent = USER_AGENT, nowIso = new Date().toISOString() } = {}) {
  const base = {
    personId: person.id,
    slug: person.slug,
    name: person.name,
    cacheVersion: CACHE_VERSION,
    queriedAt: nowIso,
    reviewed: true,
    reviewKey: reviewKey(entry),
    identity: entry.identity ?? null,
    evidence: reviewEvidenceKinds(entry),
    confidence: entry.confidence ?? "medium",
    candidates: [],
    chosen: entry.wikidata
      ? {
          id: entry.wikidata,
          label: entry.expectName ?? person.name,
          wikidataUrl: `https://www.wikidata.org/wiki/${entry.wikidata}`,
          wikipedia: null,
          matchedName: "handmatig beoordeeld",
          confidence: entry.confidence ?? "medium",
        }
      : null,
    image: null,
    reason: null,
    gaps: [],
  };
  const check = checkReviewEntry(person, entry);
  if (!check.ok) return { ...base, gaps: [{ what: "portret", reason: `beoordeling geweigerd: ${check.reason}` }] };
  if (entry.kind === "commons") {
    const commons = await fetchCommonsImage(entry.file, { fetchImpl, userAgent });
    if (!commons.ok) return { ...base, gaps: [{ what: "portret", reason: `beoordeeld bestand ${entry.file}: ${commons.reason}` }] };
    if (isBlockedFile(commons)) return { ...base, gaps: [{ what: "portret", reason: `beoordeeld bestand ${entry.file}: betwiste licentie op Commons` }] };
    if (Number.isFinite(commons.originalWidth) && commons.originalWidth < MIN_ORIGINAL_WIDTH) {
      return { ...base, gaps: [{ what: "portret", reason: `beoordeeld bestand ${entry.file}: te klein (${commons.originalWidth} px breed)` }] };
    }
    if (!commonsFileNamesPerson(commons, entry.file, person, entry)) {
      return { ...base, gaps: [{ what: "portret", reason: `beoordeeld bestand ${entry.file}: het bestand noemt de persoon niet bij naam; mogelijk een naamgenoot` }] };
    }
    const license = mapLicense(commons);
    if (!license) return { ...base, gaps: [{ what: "portret", reason: `beoordeeld bestand ${entry.file}: licentie niet herkend (${commons.licenseRaw ?? "geen"})` }] };
    return {
      ...base,
      image: {
        kind: "commons",
        filename: entry.file,
        filePage: commons.page,
        thumbUrl: commons.thumbUrl,
        width: commons.width,
        height: commons.height,
        license,
        licenseRaw: commons.licenseRaw,
        licenseUrl: commons.licenseUrl,
        // Some files carry no usable author ("not stated"); the review then names the
        // rights holder from the file page's permission field.
        author: entry.author ?? commons.author,
        credit: commons.credit,
        description: commons.description,
        reviewed: true,
      },
    };
  }
  if (entry.kind === "tk") {
    let member;
    try {
      member = await fetchTkPersoon(entry.tkId, { fetchImpl, userAgent });
    } catch (error) {
      return { ...base, gaps: [{ what: "portret", reason: `TK-Persoon ${entry.tkId} niet op te halen: ${error.message}` }] };
    }
    if (!tkPersoonMatches(member, entry)) {
      return { ...base, gaps: [{ what: "portret", reason: `TK-Persoon ${entry.tkId} wijkt af van naam of geboortedatum` }] };
    }
    if (!member.contentLength) return { ...base, gaps: [{ what: "portret", reason: `TK-Persoon ${entry.tkId} heeft geen portretfoto` }] };
    return { ...base, image: { kind: "tk", license: "CC0-1.0", member } };
  }
  if (entry.kind === "withdraw") {
    return { ...base, reason: entry.reason ?? "portret ingetrokken", gaps: [{ what: "portret", reason: entry.reason ?? "portret ingetrokken" }] };
  }
  return { ...base, gaps: [{ what: "portret", reason: `onbekende soort beoordeling: ${entry.kind}` }] };
}

async function downloadTkPortrait(member, destination, { fetchImpl, userAgent, rawDir }) {
  const response = await fetchImpl(member.resourceUrl, { headers: { "User-Agent": userAgent, Accept: "image/*" } });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length === 0) throw new Error("lege afbeelding");
  const raw = join(rawDir, `${member.id}.orig`);
  await writeFile(raw, buffer);
  const temp = `${destination}.tmp.jpg`;
  if (!resizeImage(raw, temp)) throw new Error("verkleinen mislukt (geen magick of sips)");
  await rename(temp, destination);
  await rm(raw);
}

function measureImage(file) {
  const probe = spawnSync("magick", ["identify", "-format", "%w %h", file], { encoding: "utf8" });
  const [width, height] = String(probe.stdout ?? "").trim().split(" ").map(Number);
  return probe.status === 0 && Number.isInteger(width) && Number.isInteger(height) ? { width, height } : null;
}

export async function runPortraits(options = {}) {
  const now = options.now ?? new Date();
  const today = options.today ?? now.toISOString().slice(0, 10);
  const root = options.root ?? REPO_ROOT;
  const dataDir = options.dataDir ?? join(root, "data");
  const cacheDir = options.cacheDir ?? join(root, "research", "raw", "portraits");
  const mediaDir = options.mediaDir ?? join(root, "web", "public", "media", "portretten");
  const offline = options.offline ?? false;
  const only = options.only instanceof Set && options.only.size > 0 ? options.only : null;
  const limit = Number.isFinite(options.limit) && options.limit > 0 ? options.limit : null;
  // --new-only: alleen personen zonder portret en zonder cachebestand. Iedereen die al
  // eens is opgelost, portret of benoemde gap, blijft buiten de selectie zonder dat er
  // een cachebestand wordt gelezen. Dat houdt een nachtelijke run goedkoop.
  const newOnly = options.newOnly ?? false;
  // --max-new: stop na n nieuw bevraagde personen; de rest wacht op de volgende run.
  const maxNew = Number.isFinite(options.maxNew) && options.maxNew > 0 ? options.maxNew : null;
  // --prune: verwijder media:portret-* records die geen enkele persoon meer aanwijst.
  // Zonder de vlag wordt alleen geteld en gerapporteerd; bestandsverwijzingen op disk
  // blijven altijd staan, een latere run kan er weer naar wijzen.
  const prune = options.prune ?? false;
  const hints = options.hints ?? null;
  const log = options.log ?? console.log;
  const io = { writeFile, mkdir, ...(options.io ?? {}) };
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  const userAgent = options.userAgent ?? USER_AGENT;
  const throttleMs = options.throttleMs ?? THROTTLE_MS;
  const sleep = options.sleep ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));

  const people = JSON.parse(await readFile(join(dataDir, "people.json"), "utf8"));
  const sources = JSON.parse(await readFile(join(dataDir, "sources.json"), "utf8"));
  let media = JSON.parse(await readFile(join(dataDir, "media.json"), "utf8"));
  let srcById = new Map(sources.map((record) => [record.id, record]));
  let mediaById = new Map(media.map((record) => [record.id, record]));
  const tkEnabled = options.tk ?? !offline;

  // The Eerste Kamer colofon (EK_COLOFON, read 24-09-2026) reserves image rights:
  // republishing its photos needs permission. Portraits taken from EK member pages
  // under ADR 0014 are withdrawn: record, source reference and file.
  const withdrawn = [];
  if (!only) {
    for (const person of people) {
      const record = person.portrait ? mediaById.get(person.portrait) : null;
      if (!record || !isEkWebsitePortrait(record, srcById.get(record.source))) continue;
      withdrawn.push({ person: person.id, name: person.name, source: record.source });
      person.portrait = null;
      person.sources = (person.sources ?? []).filter((ref) => ref?.source !== record.source);
      media = media.filter((entry) => entry.id !== record.id);
      const stillUsed = media.some((entry) => entry.source === record.source);
      if (!stillUsed) {
        const index = sources.findIndex((entry) => entry.id === record.source);
        if (index >= 0) sources.splice(index, 1);
      }
      const file = join(mediaDir, String(record.url).split("/").pop());
      if (existsSync(file)) await rm(file);
    }
    srcById = new Map(sources.map((record) => [record.id, record]));
    mediaById = new Map(media.map((record) => [record.id, record]));
  }

  let selected = people;
  if (only) selected = people.filter((person) => only.has(person.slug));
  if (newOnly) {
    selected = selected.filter(
      (person) => !person.portrait && !existsSync(join(cacheDir, `${person.slug}.json`)),
    );
  }
  if (limit) selected = selected.slice(0, limit);

  await io.mkdir(cacheDir, { recursive: true });
  await io.mkdir(mediaDir, { recursive: true });

  const stats = {
    scanned: selected.length,
    fromCache: 0,
    queried: 0,
    entityMatches: 0,
    portraitsApplied: 0,
    officialApplied: 0,
    wikiFallbackApplied: 0,
    imagesDownloaded: 0,
    imagesPresent: 0,
    remaining: 0,
    orphanMedia: 0,
    prunedMedia: 0,
    withdrawnEk: withdrawn.length,
    tkApplied: 0,
    tkReplaced: 0,
    tkSkipped: 0,
    redownloaded: 0,
  };
  const gaps = [];
  const licenseCounts = {};

  function upsertSource(record) {
    const existing = srcById.get(record.id);
    if (existing) {
      // Een src:wikidata-<slug> die nog naar een andere entiteit wijst, wordt bijgewerkt.
      if (existing.url !== record.url && /^src:wikidata-/.test(record.id)) Object.assign(existing, record);
      // A Commons file whose licence template changed (Rob Jetten's file moved from
      // "Attribution" to "European Parliament") gets the current licence.
      if (/^src:commons-/.test(record.id) && existing.license !== record.license) {
        existing.license = record.license;
        existing.retrieved = record.retrieved;
      }
      return existing;
    }
    sources.push(record);
    srcById.set(record.id, record);
    addedSources.add(record.id);
    return record;
  }
  const addedSources = new Set();

  // Beoordeelde portretten: eerst oplossen en in de cache zetten, zodat de gewone
  // lus ze toepast en een latere run ze zonder netwerk opnieuw kan toepassen.
  let review = options.review ?? null;
  if (!review && options.review !== false && existsSync(join(root, REVIEW_FILE))) {
    review = JSON.parse(await readFile(join(root, REVIEW_FILE), "utf8"));
  }
  const reviewed = review?.people ?? {};
  const rejected = review?.rejected ?? {};
  stats.reviewedApplied = 0;
  for (const person of selected) {
    const entry = reviewed[person.slug];
    if (!entry) continue;
    const cacheFile = join(cacheDir, `${person.slug}.json`);
    let cached = null;
    if (existsSync(cacheFile)) {
      try {
        cached = JSON.parse(await readFile(cacheFile, "utf8"));
      } catch {
        cached = null;
      }
    }
    if (cached?.reviewed && cached.reviewKey === reviewKey(entry) && cached.cacheVersion === CACHE_VERSION) continue;
    if (offline) continue;
    const resolution = await resolveReviewed(person, entry, { fetchImpl, userAgent });
    if (!resolution.image && !resolution.reason) resolution.reason = resolution.gaps?.[0]?.reason ?? null;
    await io.writeFile(cacheFile, `${JSON.stringify(resolution, null, 2)}\n`, "utf8");
    log(`  beoordeeld: ${person.name} -> ${resolution.image ? `${resolution.image.kind} (${resolution.image.license})` : resolution.reason}`);
    if (throttleMs > 0) await sleep(throttleMs);
  }

  for (const [index, person] of selected.entries()) {
    const cacheFile = join(cacheDir, `${person.slug}.json`);
    let resolution = null;
    if (existsSync(cacheFile)) {
      try {
        resolution = JSON.parse(await readFile(cacheFile, "utf8"));
      } catch {
        resolution = null;
      }
    }
    const validCache = resolution && resolution.cacheVersion === CACHE_VERSION;
    const knownEntity = !validCache && resolution?.chosen?.id ? resolution.chosen : null;
    // De cap telt alleen nieuw bevraagde personen; wie al uit de cache komt kost geen
    // netwerkverzoek en mag gewoon worden toegepast. Eenmaal bereikt stopt de run in
    // plaats van verder te bevragen; de rest staat klaar voor de volgende run.
    if (!validCache && maxNew !== null && stats.queried >= maxNew) {
      stats.remaining = selected.length - index;
      break;
    }
    if (validCache) {
      stats.fromCache += 1;
    } else if (offline) {
      gaps.push({ person: person.id, name: person.name, reason: "geen cache en offline modus staat aan" });
      continue;
    } else {
      resolution = null;
      try {
        resolution = await resolvePerson(person, {
          fetchImpl,
          userAgent,
          throttleMs,
          sleep,
          log,
          hint: hints?.[person.slug] ?? null,
          knownEntity,
        });
      } catch (error) {
        gaps.push({ person: person.id, name: person.name, reason: `onverwachte fout: ${error.message}` });
        continue;
      }
      await io.writeFile(cacheFile, `${JSON.stringify(resolution, null, 2)}\n`, "utf8");
      stats.queried += 1;
      log(`  [${index + 1}/${selected.length}] ${person.name} -> ${resolution.chosen ? resolution.chosen.id : resolution.image ? resolution.image.kind : resolution.reason}`);
    }

    // An official TK photo (CC0 1.0) already on disk is kept and re-linked, also after a
    // merge cleared the person fields and in offline mode; the TK pass refreshes it.
    // Only a reviewed decision replaces it.
    const ownRecord = mediaById.get(`media:portret-${person.slug}`) ?? null;
    const currentPortrait = (person.portrait ? mediaById.get(person.portrait) : null) ?? ownRecord;
    const keepTk = !resolution.reviewed &&
      String(currentPortrait?.source ?? "").startsWith("src:portret-tk-") &&
      existsSync(join(mediaDir, String(currentPortrait.url).split("/").pop()));
    if (keepTk) {
      person.portrait = currentPortrait.id;
      const tkSource = srcById.get(currentPortrait.source);
      addSourceRef(person, { source: currentPortrait.source, retrieved: tkSource?.retrieved ?? today, confidence: "high" });
    }
    if (!resolution.chosen && !resolution.image) {
      if (keepTk) {
        stats.imagesPresent += 1;
        continue;
      }
      gaps.push({ person: person.id, name: person.name, reason: resolution.reason ?? "geen resolutie" });
      continue;
    }
    let confidence = resolution.confidence ?? resolution.chosen?.confidence ?? "medium";
    if (resolution.chosen) {
      stats.entityMatches += 1;
      const wikidataSource = upsertSource(buildWikidataSource(person, resolution, today));
      person.wikidata = resolution.chosen.id;
      if (resolution.chosen.wikipedia) person.wikipedia = resolution.chosen.wikipedia;
      addSourceRef(person, {
        source: wikidataSource.id,
        retrieved: today,
        confidence: resolution.chosen.confidence ?? "medium",
      });
    }

    // An official TK photo (CC0 1.0) is never replaced by a Commons file here; the TK
    // pass below refreshes it. Resolving Commons first only churned files and left
    // uncited src:commons-* records behind.
    if (keepTk) {
      stats.imagesPresent += 1;
      continue;
    }
    if (!resolution.image) {
      if (resolution.reviewed && currentPortrait) {
        // A reviewed withdrawal: the shipped file's licence is disputed (for example a
        // pending Commons deletion request). Record, reference and file go; the source
        // record stays, files under research/ may cite it.
        person.portrait = null;
        person.sources = (person.sources ?? []).filter((ref) => ref?.source !== currentPortrait.source);
        media = media.filter((entry) => entry.id !== currentPortrait.id);
        mediaById.delete(currentPortrait.id);
        const file = join(mediaDir, String(currentPortrait.url).split("/").pop());
        if (existsSync(file)) await rm(file);
        stats.reviewedWithdrawn = (stats.reviewedWithdrawn ?? 0) + 1;
      }
      gaps.push({
        person: person.id,
        name: person.name,
        reason: `entiteit gevonden, geen portret: ${resolution.gaps?.[0]?.reason ?? "onbekend"}`,
      });
      continue;
    }
    // ADR 0014: een officiële portret van de eigen website is een hogere
    // betrouwbaarheid dan de gematchte Wikidata-entiteit.
    if (resolution.image.kind === "official" && /eerstekamer\.nl/.test(resolution.image.filePage ?? resolution.image.thumbUrl ?? "")) {
      gaps.push({ person: person.id, name: person.name, reason: "alleen een portret van de EK-website; het EK-colofon staat hergebruik van beeld niet toe" });
      continue;
    }
    if (resolution.image.kind === "tk") {
      // Beoordeelde TK-portretfoto (CC0 1.0) van een oud- of EK-lid uit het Gegevensmagazijn.
      const member = resolution.image.member;
      const record = buildTkMediaRecord(person, ".jpg");
      const destination = join(mediaDir, `${person.slug}.jpg`);
      const previous = person.portrait ? mediaById.get(person.portrait) : null;
      const source = buildTkSource(person, member, today);
      if (member.functie !== "Tweede Kamerlid") {
        source.notes = `${source.notes} ${member.functie ?? "Oud-lid"}: de foto is de laatste die de Kamer van deze persoon publiceert en kan uit een eerdere periode stammen. Identiteit: ${resolution.identity ?? "naam en geboortedatum"}.`;
      }
      const unchanged = (mediaById.get(record.id) ?? previous)?.source === record.source && existsSync(destination);
      if (!unchanged) {
        try {
          const tkRaw = join(cacheDir, "tk");
          await io.mkdir(tkRaw, { recursive: true });
          await downloadTkPortrait(member, destination, { fetchImpl, userAgent, rawDir: tkRaw });
          stats.imagesDownloaded += 1;
        } catch (error) {
          gaps.push({ person: person.id, name: person.name, reason: `TK-portret niet op te halen: ${error.message}` });
          continue;
        }
      } else {
        stats.imagesPresent += 1;
      }
      const size = existsSync(destination) ? measureImage(destination) : null;
      if (size) Object.assign(record, size);
      if (size && size.width < THUMB_WIDTH) {
        source.notes = source.notes.replace(`verkleind tot ${THUMB_WIDTH} px breed`, `op de oorspronkelijke grootte (${size.width} x ${size.height} px) bewaard`);
      }
      const oldSource = srcById.get(source.id);
      if (oldSource) Object.assign(oldSource, source);
      else {
        sources.push(source);
        srcById.set(source.id, source);
      }
      const existing = mediaById.get(record.id);
      if (existing) {
        for (const key of Object.keys(existing)) if (!(key in record)) delete existing[key];
        Object.assign(existing, record);
      } else {
        media.push(record);
        mediaById.set(record.id, record);
      }
      person.sources = (person.sources ?? []).filter(
        (ref) => ref?.source === source.id || !/^src:(commons-|portret-)/.test(ref?.source ?? ""),
      );
      person.portrait = record.id;
      addSourceRef(person, { source: source.id, retrieved: today, confidence });
      stats.portraitsApplied += 1;
      if (resolution.reviewed) stats.reviewedApplied += 1;
      licenseCounts["CC0-1.0 (TK)"] = (licenseCounts["CC0-1.0 (TK)"] ?? 0) + 1;
      continue;
    }
    const official = resolution.image.kind === "official";
    if (official) confidence = "high";
    const imageSource = official
      ? upsertSource(buildOfficialSource(person, resolution, today))
      : upsertSource(buildCommonsSource(person, resolution, today));
    const mediaRecord = buildMediaRecord({ person, image: resolution.image, sourceId: imageSource.id });
    const existing = mediaById.get(mediaRecord.id);
    // A different source file under the same name must replace the file on disk,
    // or the credit line would describe another photo.
    const sourceChanged = Boolean(existing && existing.source !== mediaRecord.source);
    if (existing) {
      for (const key of Object.keys(existing)) if (!(key in mediaRecord)) delete existing[key];
      Object.assign(existing, mediaRecord);
    }
    else {
      media.push(mediaRecord);
      mediaById.set(mediaRecord.id, mediaRecord);
    }
    const destination = join(mediaDir, mediaRecord.url.split("/").pop());
    if (existsSync(destination) && !sourceChanged) {
      stats.imagesPresent += 1;
    } else {
      if (sourceChanged) stats.redownloaded += 1;
      try {
        await downloadImage(resolution.image.thumbUrl, destination, { fetchImpl, userAgent });
        stats.imagesDownloaded += 1;
      } catch (error) {
        gaps.push({ person: person.id, name: person.name, reason: `download mislukt: ${error.message}` });
        continue;
      }
    }
    // Commons serves standard thumbnail widths (330 px for a 320 px request), so the
    // size in the API answer can differ from the file; record what is on disk.
    const onDisk = measureImage(destination);
    const stored = mediaById.get(mediaRecord.id);
    if (onDisk && stored) Object.assign(stored, onDisk);
    person.sources = (person.sources ?? []).filter(
      (ref) => ref?.source === imageSource.id || !/^src:(commons-|portret-)/.test(ref?.source ?? ""),
    );
    person.portrait = mediaRecord.id;
    addSourceRef(person, {
      source: imageSource.id,
      retrieved: today,
      confidence,
    });
    stats.portraitsApplied += 1;
    if (resolution.reviewed) stats.reviewedApplied += 1;
    if (official) stats.officialApplied += 1;
    else if (resolution.image.fallback === "wikipedia") stats.wikiFallbackApplied += 1;
    licenseCounts[mediaRecord.license] = (licenseCounts[mediaRecord.license] ?? 0) + 1;
  }

  // Officiele TK-portretten (CC0 1.0, Open Data Portaal): voor huidige Tweede
  // Kamerleden gaat het portret dat de Kamer nu publiceert voor elk ander.
  const tkLog = [];
  if (tkEnabled) {
    let members = [];
    try {
      members = await fetchTkMembers({ fetchImpl, userAgent });
    } catch (error) {
      gaps.push({ person: "tk", name: "Tweede Kamer", reason: `TK Open Data niet bereikbaar: ${error.message}` });
    }
    const memberships = JSON.parse(await readFile(join(dataDir, "memberships.json"), "utf8"));
    const selectedIds = new Set(selected.map((person) => person.id));
    const tkRaw = join(cacheDir, "tk");
    await io.mkdir(tkRaw, { recursive: true });
    if (members.length > 0) {
      await io.writeFile(join(tkRaw, "personen.json"), `${JSON.stringify({ retrieved: today, license: TK_LICENSE_PAGE, members }, null, 2)}\n`, "utf8");
    }
    for (const { person, member, birthChecked } of matchTkMembers(members, people, memberships)) {
      if (!selectedIds.has(person.id)) continue;
      if (!member.contentLength) {
        stats.tkSkipped += 1;
        tkLog.push(`${person.name}: geen portretfoto in het Gegevensmagazijn`);
        continue;
      }
      const record = buildTkMediaRecord(person, ".jpg");
      const destination = join(mediaDir, `${person.slug}.jpg`);
      const measure = () => {
        const probe = spawnSync("magick", ["identify", "-format", "%w %h", destination], { encoding: "utf8" });
        const [width, height] = String(probe.stdout ?? "").trim().split(" ").map(Number);
        if (probe.status === 0 && Number.isInteger(width) && Number.isInteger(height)) {
          record.width = width;
          record.height = height;
        }
      };
      const raw = join(tkRaw, `${person.slug}.orig`);
      const previous = person.portrait ? mediaById.get(person.portrait) : null;
      const unchanged = previous?.source === record.source && existsSync(destination) &&
        srcById.get(record.source)?.published === (member.changed ? String(member.changed).slice(0, 10) : null);
      if (!unchanged) {
        try {
          const response = await fetchImpl(member.resourceUrl, { headers: { "User-Agent": userAgent, Accept: "image/*" } });
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          const buffer = Buffer.from(await response.arrayBuffer());
          if (buffer.length === 0) throw new Error("lege afbeelding");
          await writeFile(raw, buffer);
          const temp = `${destination}.tmp.jpg`;
          if (!resizeImage(raw, temp)) throw new Error("verkleinen mislukt (geen magick of sips)");
          await rename(temp, destination);
          await rm(raw);
          stats.imagesDownloaded += 1;
        } catch (error) {
          stats.tkSkipped += 1;
          gaps.push({ person: person.id, name: person.name, reason: `TK-portret niet op te halen: ${error.message}` });
          continue;
        }
      }
      if (existsSync(destination)) measure();
      if (previous && previous.source !== record.source) {
        stats.tkReplaced += 1;
        person.sources = (person.sources ?? []).filter((ref) => ref?.source !== previous.source);
        if (previous.id !== record.id) media = media.filter((entry) => entry.id !== previous.id);
      }
      const source = buildTkSource(person, member, today);
      const oldSource = srcById.get(source.id);
      if (oldSource) Object.assign(oldSource, source);
      else {
        sources.push(source);
        srcById.set(source.id, source);
      }
      const existing = mediaById.get(record.id);
      if (existing) {
        for (const key of Object.keys(existing)) if (!(key in record)) delete existing[key];
        Object.assign(existing, record);
      } else {
        media.push(record);
        mediaById.set(record.id, record);
      }
      if (!person.portrait) stats.portraitsApplied += 1;
      person.portrait = record.id;
      addSourceRef(person, { source: source.id, retrieved: today, confidence: birthChecked ? "high" : "medium" });
      // Remove the gap this person may have had from the Commons pass.
      for (let index = gaps.length - 1; index >= 0; index -= 1) if (gaps[index].person === person.id) gaps.splice(index, 1);
      stats.tkApplied += 1;
      licenseCounts["CC0-1.0 (TK)"] = (licenseCounts["CC0-1.0 (TK)"] ?? 0) + 1;
    }
  }

  // Handmatig bekeken en afgewezen kandidaten maken de gap specifieker.
  for (const gap of gaps) {
    const slug = String(gap.person).replace(/^person:/, "");
    const verdict = rejected[slug];
    if (!verdict) continue;
    // A plain string is a verdict of the second pass (25-09-2026); newer ones carry their own date.
    const { reason, reviewed } = typeof verdict === "string" ? { reason: verdict, reviewed: "2026-09-25" } : verdict;
    gap.reason = `${gap.reason}; beoordeeld ${formatDateNL(reviewed)}: ${reason}`;
  }

  // Een media:portret-* record dat geen enkele persoon meer aanwijst is een wees: de
  // persoon is samengevoegd of hernoemd sinds het portret is toegepast. Altijd tellen,
  // alleen verwijderen uit media.json met --prune. Het bestand op disk blijft staan.
  const portraitIds = new Set(people.map((person) => person.portrait).filter(Boolean));
  const orphanMedia = media.filter(
    (record) => typeof record.id === "string" && record.id.startsWith("media:portret-") && !portraitIds.has(record.id),
  );
  stats.orphanMedia = orphanMedia.length;
  if (prune && orphanMedia.length > 0) {
    const orphanIds = new Set(orphanMedia.map((record) => record.id));
    media = media.filter((record) => !orphanIds.has(record.id));
    stats.prunedMedia = orphanMedia.length;
  }

  // Only records this run added and nothing cites are dropped. Older records stay:
  // files under research/ may cite them (see scripts/validate.mjs --research).
  const cited = new Set([
    ...media.map((record) => record.source),
    ...people.flatMap((person) => (person.sources ?? []).map((ref) => ref?.source)),
  ]);
  for (let index = sources.length - 1; index >= 0; index -= 1) {
    if (addedSources.has(sources[index].id) && !cited.has(sources[index].id)) sources.splice(index, 1);
  }

  sources.sort((a, b) => a.id.localeCompare(b.id));
  media.sort((a, b) => a.id.localeCompare(b.id));

  await io.writeFile(join(dataDir, "people.json"), `${JSON.stringify(people, null, 2)}\n`, "utf8");
  await io.writeFile(join(dataDir, "media.json"), `${JSON.stringify(media, null, 2)}\n`, "utf8");
  await io.writeFile(join(dataDir, "sources.json"), `${JSON.stringify(sources, null, 2)}\n`, "utf8");

  const qaDir = join(root, "research", "qa");
  await io.mkdir(qaDir, { recursive: true });
  const qaPath = join(qaDir, `portraits-${formatDateNL(today)}.md`);
  await io.writeFile(qaPath, renderPortraitReport({ stats, gaps, today, licenseCounts }), "utf8");

  log("");
  log(`portretten: ${stats.scanned} bekeken, ${stats.queried} nieuw bevraagd, ${stats.entityMatches} persoonsmatches, ${stats.portraitsApplied} portretten (waarvan ${stats.officialApplied} officieel, ${stats.wikiFallbackApplied} via Wikipedia), ${stats.imagesDownloaded} gedownload, ${gaps.length} gaps, ${stats.remaining} resterend, ${stats.orphanMedia} orphan media (${stats.prunedMedia} verwijderd).`);
  log(`Wrote ${qaPath}`);
  return { stats, gaps, licenseCounts, qaPath };
}

/** Municipality of a person's current mayor tenure ("Gemeente Winterswijk" gives "Winterswijk"), or null. */
export function currentMunicipality(person, { tenures, positions, organizations }) {
  for (const tenure of tenures) {
    if (tenure.person !== person.id || tenure.end) continue;
    const position = positions.find((entry) => entry.id === tenure.position);
    if (!position || !/burgemeester|gezaghebber/i.test(position.title ?? "")) continue;
    const organization = organizations.find((entry) => entry.id === position.organization);
    if (organization?.name) return organization.name.replace(/^Gemeente\s+/i, "").replace(/\s*\(.*\)\s*$/, "");
  }
  return null;
}

/**
 * Zoek Commons-kandidaten voor personen zonder portret en schrijf ze naar
 * research/raw/portraits/deep/discovery-<datum>.json. Past niets toe: een kandidaat
 * wordt pas een portret als iemand de foto bekijkt en een regel in review.json zet.
 */
export async function runDiscover(options = {}) {
  const root = options.root ?? REPO_ROOT;
  const dataDir = options.dataDir ?? join(root, "data");
  const today = options.today ?? new Date().toISOString().slice(0, 10);
  const log = options.log ?? console.log;
  const read = async (name) => JSON.parse(await readFile(join(dataDir, name), "utf8"));
  const [people, tenures, positions, organizations] = await Promise.all([
    read("people.json"), read("tenures.json"), read("positions.json"), read("organizations.json"),
  ]);
  let selected = people.filter((person) => !person.portrait);
  if (options.only) selected = selected.filter((person) => options.only.has(person.slug));
  if (options.limit) selected = selected.slice(0, options.limit);
  const results = [];
  for (const person of selected) {
    const context = { municipality: currentMunicipality(person, { tenures, positions, organizations }) };
    const found = await discoverCommonsCandidates(person, {
      context,
      fetchImpl: options.fetchImpl,
      userAgent: options.userAgent,
      throttleMs: options.throttleMs ?? THROTTLE_MS,
      sleep: options.sleep,
    });
    results.push({ slug: person.slug, name: person.name, municipality: context.municipality, ...found });
    log(`  ontdekt: ${person.name}: ${found.candidates.filter((c) => c.eligible).length} geschikt van ${found.candidates.length}`);
  }
  const outDir = join(root, "research", "raw", "portraits", "deep");
  await mkdir(outDir, { recursive: true });
  const file = join(outDir, `discovery-${today}.json`);
  await writeFile(file, `${JSON.stringify({ retrieved: today, note: "Kandidaten, niets toegepast. Zie ADR 0014, amendement 3.", results }, null, 2)}\n`, "utf8");
  log(`Wrote ${file}`);
  return { file, results };
}

function parseArgs(argv) {
  const options = { offline: false, limit: null, only: null, throttleMs: THROTTLE_MS };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--root") options.root = argv[(i += 1)];
    else if (argv[i] === "--data") options.dataDir = argv[(i += 1)];
    else if (argv[i] === "--cache") options.cacheDir = argv[(i += 1)];
    else if (argv[i] === "--media") options.mediaDir = argv[(i += 1)];
    else if (argv[i] === "--throttle") options.throttleMs = Number(argv[(i += 1)]);
    else if (argv[i] === "--limit") options.limit = Number(argv[(i += 1)]);
    else if (argv[i] === "--only") options.only = new Set(argv[(i += 1)].split(",").map((value) => value.trim()).filter(Boolean));
    else if (argv[i] === "--offline") options.offline = true;
    else if (argv[i] === "--new-only") options.newOnly = true;
    else if (argv[i] === "--max-new") options.maxNew = Number(argv[(i += 1)]);
    else if (argv[i] === "--prune") options.prune = true;
    else if (argv[i] === "--hints") options.hintsPath = argv[(i += 1)];
    else if (argv[i] === "--no-tk") options.tk = false;
    else if (argv[i] === "--no-review") options.review = false;
    else if (argv[i] === "--discover") options.discover = true;
    else if (argv[i] === "--today") options.today = argv[(i += 1)];
  }
  return options;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.hintsPath) {
    options.hints = JSON.parse(await readFile(options.hintsPath, "utf8"));
  }
  if (options.discover) await runDiscover(options);
  else await runPortraits(options);
}

const invokedDirectly = process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url;
if (invokedDirectly) {
  main().catch((error) => {
    console.error(`portraits failed: ${error.message}`);
    process.exitCode = 1;
  });
}
