#!/usr/bin/env bun
// Portretverrijking voor Staatsgraaf.
//
// Per persoon wordt de Wikidata-entiteit gezocht (wbsearchentities, daarna
// wbgetentities), waarna van Wikimedia Commons de licentie- en auteursinformatie
// van de P18-afbeelding wordt opgehaald en een thumbnail van 320 px wordt
// gedownload. Alleen bestanden met een herkenbare licentie komen in aanmerking;
// alles daarbuiten is een benoemde gap. research/O-licenses.md is de regel.
//
// De pipeline draait na `bun run merge` en schrijft data/media.json,
// data/sources.json en de portret-, Wikidata- en Wikipedia-velden in
// data/people.json. De volgende merge laat die persoonsvelden weer vallen;
// de cache onder research/raw/portraits/ maakt opnieuw toepassen dan een
// lokale bewerking zonder netwerk.
//
// No dependencies. Node ESM only.

import { readFile, writeFile, mkdir, stat } from "node:fs/promises";
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
export const WIKIDATA_API = "https://www.wikidata.org/w/api.php";
export const COMMONS_API = "https://commons.wikimedia.org/w/api.php";
export const NLWIKI_API = "https://nl.wikipedia.org/w/api.php";
export const ENWIKI_API = "https://en.wikipedia.org/w/api.php";
export const HUMAN_QID = "Q5";
// Ophogen zodra de resolutielogica verandert: oudere cachebestanden worden
// dan opnieuw bevraagd in plaats van stil te blijven staan.
export const CACHE_VERSION = 2;

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
]);

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
      prop: "imageinfo",
      iiprop: "extmetadata|url|size",
      iiurlwidth: String(THUMB_WIDTH),
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
    licenseRaw: text("LicenseShortName"),
    licenseCode: raw("License"),
    usageTerms: text("UsageTerms"),
    licenseUrl: raw("LicenseUrl"),
    author: text("Artist"),
    credit: text("Credit"),
    description: text("ImageDescription"),
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
 * Wikipedia-paginabezame als fallback (ADR 0014): het vrije paginabezame van het
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
    body = await apiGet(fetchImpl, NLWIKI_API, {
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
  if (!filename) return { ok: false, reason: "geen vrije paginabezame op Wikipedia" };
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
      const license = mapLicense(wikiImage);
      if (!license) {
        attempts.push(`Wikipedia-paginabezame ${wikiImage.filename}: licentie niet herkend (${wikiImage.licenseRaw ?? "geen licentie vermeld"})`);
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
  lines.push("- Zonder bruikbaar Commons-portret valt de resolver eerst terug op het officiële portret van de eigen website (EK-pagina, CC BY 4.0, hoog betrouwbaar) en daarna op het vrije paginabezame van het Nederlandstalige Wikipedia-artikel (ADR 0014).");
  lines.push("- Een ontbrekende of onherkenbare licentie, een ontbrekende P18 en een dubbele kandidaat zonder officiële fallback zijn gaps. Er is niets geschat.");
  lines.push(`- De thumbnails van ${THUMB_WIDTH} px staan onder \`web/public/media/portretten/\` en worden van de eigen origin geserveerd.`);
  lines.push("");
  return `${lines.join("\n")}\n`;
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
  const srcById = new Map(sources.map((record) => [record.id, record]));
  const mediaById = new Map(media.map((record) => [record.id, record]));

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
  };
  const gaps = [];
  const licenseCounts = {};

  function upsertSource(record) {
    const existing = srcById.get(record.id);
    if (existing) return existing;
    sources.push(record);
    srcById.set(record.id, record);
    return record;
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
        });
      } catch (error) {
        gaps.push({ person: person.id, name: person.name, reason: `onverwachte fout: ${error.message}` });
        continue;
      }
      await io.writeFile(cacheFile, `${JSON.stringify(resolution, null, 2)}\n`, "utf8");
      stats.queried += 1;
      log(`  [${index + 1}/${selected.length}] ${person.name} -> ${resolution.chosen ? resolution.chosen.id : resolution.image ? resolution.image.kind : resolution.reason}`);
    }

    if (!resolution.chosen && !resolution.image) {
      gaps.push({ person: person.id, name: person.name, reason: resolution.reason ?? "geen resolutie" });
      continue;
    }
    let confidence = resolution.chosen?.confidence ?? "medium";
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

    if (!resolution.image) {
      gaps.push({
        person: person.id,
        name: person.name,
        reason: `entiteit gevonden, geen portret: ${resolution.gaps?.[0]?.reason ?? "onbekend"}`,
      });
      continue;
    }
    // ADR 0014: een officiële portret van de eigen website is een hogere
    // betrouwbaarheid dan de gematchte Wikidata-entiteit.
    const official = resolution.image.kind === "official";
    if (official) confidence = "high";
    const imageSource = official
      ? upsertSource(buildOfficialSource(person, resolution, today))
      : upsertSource(buildCommonsSource(person, resolution, today));
    const mediaRecord = buildMediaRecord({ person, image: resolution.image, sourceId: imageSource.id });
    const existing = mediaById.get(mediaRecord.id);
    if (existing) Object.assign(existing, mediaRecord);
    else {
      media.push(mediaRecord);
      mediaById.set(mediaRecord.id, mediaRecord);
    }
    const destination = join(mediaDir, mediaRecord.url.split("/").pop());
    if (existsSync(destination)) {
      stats.imagesPresent += 1;
    } else {
      try {
        await downloadImage(resolution.image.thumbUrl, destination, { fetchImpl, userAgent });
        stats.imagesDownloaded += 1;
      } catch (error) {
        gaps.push({ person: person.id, name: person.name, reason: `download mislukt: ${error.message}` });
        continue;
      }
    }
    person.portrait = mediaRecord.id;
    addSourceRef(person, {
      source: imageSource.id,
      retrieved: today,
      confidence,
    });
    stats.portraitsApplied += 1;
    if (official) stats.officialApplied += 1;
    else if (resolution.image.fallback === "wikipedia") stats.wikiFallbackApplied += 1;
    licenseCounts[mediaRecord.license] = (licenseCounts[mediaRecord.license] ?? 0) + 1;
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
  }
  return options;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.hintsPath) {
    options.hints = JSON.parse(await readFile(options.hintsPath, "utf8"));
  }
  await runPortraits(options);
}

const invokedDirectly = process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url;
if (invokedDirectly) {
  main().catch((error) => {
    console.error(`portraits failed: ${error.message}`);
    process.exitCode = 1;
  });
}
