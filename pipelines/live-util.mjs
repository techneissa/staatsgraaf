// Shared helpers for the live pipelines (refresh-official, tk-changes, ek-live,
// election-dates, news-trigger, live). No network, no file access: pure functions.

export const LIVE_USER_AGENT = "StaatsgraafBot/0.1 (+https://github.com/techneissa/staatsgraaf)";

export function decodeEntities(value) {
  if (typeof value !== "string") return "";
  return value
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0*39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&euml;/g, "ë")
    .replace(/&eacute;/g, "é")
    .replace(/&egrave;/g, "è")
    .replace(/&ouml;/g, "ö")
    .replace(/&uuml;/g, "ü")
    .replace(/&iuml;/g, "ï")
    .replace(/&ccedil;/g, "ç")
    .replace(/&#([0-9]+);/g, (_, code) => String.fromCodePoint(Number(code)));
}

export function normalizeName(value) {
  if (typeof value !== "string") return "";
  return value
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function slugify(value) {
  return normalizeName(value).replace(/\s+/g, "-") || "onbekend";
}

export function buildPersonIndex(people = []) {
  const byNormalized = new Map();
  const byId = new Map();
  for (const person of people) {
    if (!person || typeof person.id !== "string") continue;
    byId.set(person.id, person);
    const forms = [person.name, ...(Array.isArray(person.aliases) ? person.aliases : [])];
    for (const form of forms) {
      const key = normalizeName(form);
      if (key === "") continue;
      if (!byNormalized.has(key)) byNormalized.set(key, new Set());
      byNormalized.get(key).add(person.id);
    }
  }
  return { byNormalized, byId };
}

export function resolvePerson(name, index) {
  const key = normalizeName(name);
  const matches = key === "" ? undefined : index.byNormalized.get(key);
  const ids = matches ? [...matches] : [];
  if (ids.length === 1) return { status: "matched", id: ids[0] };
  if (ids.length > 1) return { status: "ambiguous", candidates: ids.sort() };
  return { status: "none" };
}

export function buildSourceRecord(def, existingSources, today) {
  const existing = existingSources.find((source) => source && source.url === def.url) ?? null;
  return {
    id: existing ? existing.id : def.id,
    url: def.url,
    title: def.title || existing?.title || def.url,
    publisher: def.publisher || existing?.publisher || "Onbekend",
    type: def.type || existing?.type || "page",
    published: null,
    retrieved: today,
    license: existing?.license ?? def.license ?? null,
    archiveUrl: null,
    notes: def.notes ?? existing?.notes ?? null,
  };
}

export function makeGap(what, why, endpoint, resume) {
  return { what, why, endpoint, resume };
}

export function nextId(base, taken) {
  if (!taken.has(base)) {
    taken.add(base);
    return base;
  }
  let counter = 2;
  while (taken.has(`${base}-${counter}`)) counter += 1;
  const value = `${base}-${counter}`;
  taken.add(value);
  return value;
}

export function sourceRef(sourceId, today, confidence = "high") {
  return { source: sourceId, retrieved: today, confidence };
}

export function isoDate(value) {
  return typeof value === "string" && value.length >= 10 ? value.slice(0, 10) : null;
}

/** Whole days from isoA to isoB (positive when b is later). */
export function daysBetween(isoA, isoB) {
  return Math.round((Date.parse(`${isoDate(isoB)}T00:00:00Z`) - Date.parse(`${isoDate(isoA)}T00:00:00Z`)) / 86_400_000);
}

export function addDays(iso, days) {
  const date = new Date(`${isoDate(iso)}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function formatDateNL(iso) {
  if (typeof iso !== "string" || iso.length < 10) return String(iso ?? "");
  const [year, month, day] = iso.slice(0, 10).split("-");
  return `${day}-${month}-${year}`;
}

/** sha256 of a string as hex, through the platform crypto (works in Bun and Node). */
export async function sha256Hex(text) {
  const bytes = new TextEncoder().encode(String(text));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Whole hours from an ISO timestamp to `now` (Infinity when the timestamp is missing or invalid). */
export function hoursSinceIso(iso, now = new Date()) {
  const time = Date.parse(iso);
  return Number.isFinite(time) ? (now.getTime() - time) / 3_600_000 : Infinity;
}
