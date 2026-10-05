// Eerste Kamer (eerstekamer.nl) for the live run: content hashes of /fracties
// and /personele_mutaties, the fractie boards ("Fractiebestuur"), the
// Voorzitter, the membership start of a new member, and the colofon terms.
//
// The site has no feed, no ETag and no Last-Modified, so a change is a changed
// hash of the normalised page text. Pages are fetched, never recalled; no
// image is read or stored (the colofon forbids republishing them). Every
// source record carries the URL and the extraction date the colofon asks
// for; the annotation text the colofon announces is missing from the page
// (research gap G10) and is recorded as that named gap until it appears.

import {
  addDays,
  buildSourceRecord,
  decodeEntities,
  makeGap,
  nextId,
  normalizeName,
  resolvePerson,
  sha256Hex,
  slugify,
  sourceRef,
} from "./live-util.mjs";

export const EK_BASE = "https://www.eerstekamer.nl";
export const EK_URLS = {
  fracties: `${EK_BASE}/fracties`,
  mutaties: `${EK_BASE}/personele_mutaties`,
  leden: `${EK_BASE}/alle_leden`,
  colofon: `${EK_BASE}/begrip/colofon`,
};
export const EK_ORG = "org:eerste-kamer";

const MONTHS = {
  januari: "01",
  februari: "02",
  maart: "03",
  april: "04",
  mei: "05",
  juni: "06",
  juli: "07",
  augustus: "08",
  september: "09",
  oktober: "10",
  november: "11",
  december: "12",
};

/** Dutch date "13 juni 2023" (also with no-break spaces) to "2023-06-13", or null. */
export function parseDutchDate(text) {
  const match = /(\d{1,2})\s+([a-z]+)\s+(\d{4})/i.exec(String(text ?? "").replace(/ /g, " "));
  if (!match) return null;
  const month = MONTHS[match[2].toLowerCase()];
  return month ? `${match[3]}-${month}-${match[1].padStart(2, "0")}` : null;
}

/** Visible text of an HTML page, one line per element, no scripts or styles. */
export function visibleText(html) {
  const text = String(html ?? "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<[^>]+>/g, "\n");
  return decodeEntities(text)
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join("\n");
}

export async function hashPage(html) {
  return sha256Hex(visibleText(html));
}

/** The fractie lines of /fracties: [{ slug, label, seats, url }]. */
export function parseEkFracties(html) {
  const results = [];
  const seen = new Set();
  for (const match of String(html ?? "").matchAll(/<a href="\/fractie\/([a-z0-9_]+)"[^>]*>([\s\S]*?)<\/a>/g)) {
    const slug = match[1];
    const text = decodeEntities(match[2].replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
    const line = /^(.+?)\s*\((\d+)\s+zetels?\)$/.exec(text);
    if (!line || seen.has(slug)) continue;
    seen.add(slug);
    results.push({ slug, label: line[1].trim(), seats: Number(line[2]), url: `${EK_BASE}/fractie/${slug}` });
  }
  return results;
}

/** The fractievoorzitter of a fractie page: { href, name, since } or null. */
export function parseEkFractievoorzitter(html) {
  const text = decodeEntities(String(html ?? "")).replace(/ /g, " ");
  const match = /(?:^|[^-/])fractievoorzitter:\s*<a href="(\/persoon\/[^"]+)"[^>]*>([^<]+)<\/a>\s*(?:\(sinds\s*([^)]+)\))?/i.exec(text);
  if (!match) return null;
  return { href: match[1], name: match[2].trim(), since: match[3] ? parseDutchDate(match[3]) : null };
}

/** The nav link "Voorzitter" on any page of the site: "/persoon/<slug>" or null. */
export function parseEkVoorzitterLink(html) {
  const match = /<a[^>]*href="(?:\/)?(persoon\/[^"]+)"[^>]*>\s*(?:<span[^>]*>)?\s*Voorzitter\s*(?:<\/span>)?\s*<\/a>/i.exec(String(html ?? ""));
  return match ? `/${match[1]}` : null;
}

/** "... is sinds 7 oktober 2025 Voorzitter van de Eerste Kamer" on the member page: ISO date or null. */
export function parseEkVoorzitterSince(html) {
  const text = visibleText(html).replace(/\n/g, " ");
  const match = /is sinds (\d{1,2} [a-z]+ \d{4}) Voorzitter van de Eerste Kamer/i.exec(text);
  return match ? parseDutchDate(match[1]) : null;
}

/** "... is sinds 11 juni 2019 lid van de Eerste Kamer" (page description or intro): ISO date or null. */
export function parseEkMemberSince(html) {
  const text = decodeEntities(String(html ?? "")).replace(/ /g, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
  const match = /is sinds (\d{1,2} [a-z]+ \d{4}) lid van de Eerste Kamer/i.exec(text);
  return match ? parseDutchDate(match[1]) : null;
}

/**
 * The reuse terms of the colofon as the page states them. `annotationText` is
 * null while the sentence "Als annotatie ... het volgende vermeld:" is not
 * followed by any text (research gap G10).
 */
export function parseEkColofon(html) {
  const lines = visibleText(html).split("\n");
  const sourceRequired = lines.some((line) => /verwezen naar de authentieke bron/i.test(line));
  const dateRequired = lines.some((line) => /datum van extractie vermeld/i.test(line));
  const annotationIndex = lines.findIndex((line) => /Als annotatie wordt daarbij het volgende vermeld/i.test(line));
  let annotationText = null;
  if (annotationIndex >= 0) {
    const following = lines[annotationIndex + 1] ?? "";
    // The next line is the next section heading (for example "Beeldmateriaal") when no annotation text is given.
    if (following !== "" && !/^Beeldmateriaal$/i.test(following) && following.length > 12) annotationText = following;
  }
  const imagesForbidden = lines.some((line) => /niet toegestaan dit beeldmateriaal te \(her\)publiceren/i.test(line));
  return { sourceRequired, dateRequired, annotationAnnounced: annotationIndex >= 0, annotationText, imagesForbidden };
}

export const EK_COLOFON_GAP = makeGap(
  "G10: de annotatietekst die het colofon van de Eerste Kamer voorschrijft",
  "het colofon zegt \"Als annotatie wordt daarbij het volgende vermeld:\" maar de pagina bevat daarna geen tekst",
  EK_URLS.colofon,
  "Neem contact op met de Eerste Kamer of lees de pagina gerenderd; tot die tijd vermeldt elke bron de URL en de extractiedatum.",
);

/** Hash check: which of the two watched pages changed since the stored hashes. */
export async function fetchEkHashes({ http, hashes = {} }) {
  const fracties = await http.getText(EK_URLS.fracties, { accept: "text/html" });
  const mutaties = await http.getText(EK_URLS.mutaties, { accept: "text/html" });
  const next = { fracties: await hashPage(fracties), mutaties: await hashPage(mutaties) };
  return {
    hashes: next,
    changed: next.fracties !== hashes.fracties || next.mutaties !== hashes.mutaties,
    pages: { fracties, mutaties },
  };
}

/**
 * The full read: all members, the fracties page, every fractie board, the Voorzitter,
 * and the start page of members that are new to the dataset (`needSince`: slugs).
 */
export async function fetchEkFull({ http, fractiesHtml = null, parseMembers, selectNeedSince = () => [] }) {
  const leden = await http.getText(EK_URLS.leden, { accept: "text/html" });
  const fractiesPage = fractiesHtml ?? (await http.getText(EK_URLS.fracties, { accept: "text/html" }));
  const items = parseMembers(leden);
  const needSince = selectNeedSince(items);
  const fracties = parseEkFracties(fractiesPage);
  const boards = [];
  const gaps = [];
  for (const fractie of fracties) {
    try {
      const page = await http.getText(fractie.url, { accept: "text/html" });
      boards.push({ ...fractie, leader: parseEkFractievoorzitter(page) });
    } catch (error) {
      gaps.push(makeGap(`Fractiebestuur van ${fractie.label}`, `pagina niet bereikbaar (${error.message})`, fractie.url, "De bestaande tenure blijft staan tot de pagina weer bereikbaar is."));
    }
  }
  let voorzitter = null;
  const link = parseEkVoorzitterLink(fractiesPage) ?? parseEkVoorzitterLink(leden);
  if (link) {
    try {
      const page = await http.getText(`${EK_BASE}${link}`, { accept: "text/html" });
      voorzitter = { href: link, since: parseEkVoorzitterSince(page), url: `${EK_BASE}${link}` };
    } catch (error) {
      gaps.push(makeGap("Voorzitter van de Eerste Kamer", `pagina niet bereikbaar (${error.message})`, `${EK_BASE}${link}`, "De bestaande tenure blijft staan."));
    }
  } else {
    gaps.push(makeGap("Voorzitter van de Eerste Kamer", "de navigatielink Voorzitter staat niet meer op de pagina", EK_URLS.fracties, "Controleer de paginaopbouw."));
  }
  const memberSince = {};
  for (const slug of needSince.slice(0, 15)) {
    try {
      const page = await http.getText(`${EK_BASE}/persoon/${slug}`, { accept: "text/html" });
      memberSince[slug] = parseEkMemberSince(page);
    } catch {
      memberSince[slug] = null;
    }
  }
  return { leden, items, fracties, boards, voorzitter, memberSince, gaps, fractiesHtml: fractiesPage };
}

function compact(iso) {
  return typeof iso === "string" ? iso.replace(/-/g, "") : "onbekend";
}

/**
 * Fractievoorzitters and the Voorzitter of the Eerste Kamer as tenures.
 * `memberItems` are the alle_leden cards; a leader is found by the /persoon/<slug>
 * link, never by the (differently written) name on the fractie page.
 * A tenure whose holder is no longer named is closed on the day before the
 * successor's "sinds" date (medium confidence, listed for review): the page
 * names no end date.
 */
export function planEersteKamerBoards({ ek, memberItems, dataset, today, colofon = null }) {
  const gaps = [];
  const review = [];
  const sources = [];
  const positions = [];
  const relations = [];
  const tenures = [];
  const closures = [];
  const openings = [];
  const personBySlug = new Map();
  const index = new Map();
  for (const person of dataset.people ?? []) {
    index.set(normalizeName(person.name), index.get(normalizeName(person.name)) ?? []);
    index.get(normalizeName(person.name)).push(person.id);
    for (const alias of person.aliases ?? []) {
      const key = normalizeName(alias);
      if (!index.has(key)) index.set(key, []);
      index.get(key).push(person.id);
    }
  }
  const personIndex = { byNormalized: new Map([...index].map(([key, ids]) => [key, new Set(ids)])) };
  for (const item of memberItems) {
    const found = resolvePerson(item.name, personIndex);
    if (found.status === "matched") personBySlug.set(item.slug, found.id);
  }
  if (ek.extraPersons) for (const [slug, id] of Object.entries(ek.extraPersons)) personBySlug.set(slug, id);

  const positionsById = new Map((dataset.positions ?? []).map((position) => [position.id, position]));
  const relationIds = new Set((dataset.relations ?? []).map((relation) => relation.id));
  const allTenureIds = new Set((dataset.tenures ?? []).map((tenure) => tenure.id));
  const existingSources = dataset.sources ?? [];
  const annotation = colofon?.annotationText ?? null;

  function sourceFor({ id, url, title, notes }) {
    const record = buildSourceRecord(
      {
        id,
        url,
        title,
        publisher: "Eerste Kamer",
        type: "page",
        license: "CC-BY-4.0",
        notes: `${notes} Bron: Eerste Kamer der Staten-Generaal, ${url}, geraadpleegd ${today}.${annotation ? ` ${annotation}` : ""}`,
      },
      existingSources,
      today,
    );
    if (!sources.some((entry) => entry.id === record.id)) sources.push(record);
    return record.id;
  }

  function reconcile({ positionId, holderId, since, prefix, ref, label, url }) {
    const open = (dataset.tenures ?? []).filter((tenure) => tenure.position === positionId && !tenure.end);
    const mine = open.find((tenure) => tenure.person === holderId);
    if (mine) {
      tenures.push({ ...mine, source: ref });
      return;
    }
    const closed = [];
    for (const tenure of open) {
      const end = since ? addDays(since, -1) : today;
      const record = { ...tenure, end, source: sourceRef(ref.source, today, "medium") };
      closures.push({ entity: "tenures", record, why: `${label}-change`, endIsOfficial: false });
      closed.push(record);
      review.push({
        kind: "closed-without-official-end",
        key: `closed-without-official-end|${tenure.id}`,
        text: `${tenure.id} is gesloten op ${end}: ${url} noemt de nieuwe houder sinds ${since ?? "een onbekende datum"} maar geeft geen einddatum voor de vorige.`,
      });
    }
    const personSlug = holderId.replace(/^person:/, "");
    const id = nextId(`${prefix}-${personSlug}${since ? `-${compact(since)}` : ""}`, allTenureIds);
    const record = {
      id,
      person: holderId,
      position: positionId,
      seat: null,
      start: since ?? null,
      end: null,
      acting: false,
      entryMode: "gekozen",
      appointedBy: null,
      predecessor: closed.length === 1 ? closed[0].id : null,
      successor: null,
      endReason: null,
      source: ref,
    };
    if (closed.length === 1) closed[0].successor = id;
    if (!since) gaps.push(makeGap(`Startdatum van ${label} ${holderId}`, "de pagina noemt geen datum", url, "Geen actie: de start blijft onbekend (ADR 0020)."));
    tenures.push(...closed, record);
    openings.push({ entity: "tenures", record, why: `${label}-new-holder` });
  }

  for (const board of ek.boards ?? []) {
    if (!board.leader) {
      gaps.push(makeGap(`Fractievoorzitter van ${board.label}`, "de fractiepagina noemt geen fractievoorzitter", board.url, "De bestaande tenure blijft staan."));
      continue;
    }
    const slug = board.leader.href.replace(/^\/persoon\//, "");
    const holderId = personBySlug.get(slug);
    if (!holderId) {
      gaps.push(makeGap(`Fractievoorzitter van ${board.label}: ${board.leader.name}`, "geen persoon gevonden voor deze ledenpagina op alle_leden", `${EK_BASE}${board.leader.href}`, "Controleer of het lid op alle_leden staat en in de dataset."));
      continue;
    }
    const sourceId = sourceFor({
      id: `src:ek-fractie-${slugify(board.slug)}`,
      url: board.url,
      title: `${board.label}-fractie - fractiepagina Eerste Kamer`,
      notes: `Fractiebestuur: fractievoorzitter ${board.leader.name}${board.leader.since ? ` sinds ${board.leader.since}` : ""}.`,
    });
    const ref = sourceRef(sourceId, today);
    const fkey = slugify(board.label);
    const positionId = `pos:ek-fractievoorzitter-${fkey}`;
    if (!positionsById.has(positionId)) {
      const record = {
        id: positionId,
        slug: positionId.replace(/^pos:/, ""),
        title: `Fractievoorzitter ${board.label}`,
        organization: EK_ORG,
        type: "elected",
        fillMethod: "benoeming-door-college",
        entryModes: ["gekozen"],
        termLengthMonths: null,
        seatsCount: 1,
        exOfficioOf: [],
        sources: [ref],
        aliases: [`Fractievoorzitter ${board.label} Eerste Kamer`],
      };
      positionsById.set(positionId, record);
      positions.push(record);
      review.push({ kind: "new-position", key: `new-position|${positionId}`, text: `Nieuwe positie ${positionId} (Fractievoorzitter ${board.label}) aangemaakt uit ${board.url}.` });
    }
    const relationId = `rel:office-ek-fractievoorzitter-${fkey}`;
    if (!relationIds.has(relationId)) {
      relationIds.add(relationId);
      relations.push({ id: relationId, from: positionId, to: EK_ORG, type: "office", metadata: {}, seatsAppointed: 0, source: ref });
    }
    reconcile({
      positionId,
      holderId,
      since: board.leader.since,
      prefix: `tenure:fvp-ek-fractievoorzitter-${fkey}`,
      ref,
      label: "ek-fractievoorzitter",
      url: board.url,
    });
  }

  if (ek.voorzitter) {
    const slug = ek.voorzitter.href.replace(/^\/persoon\//, "");
    const holderId = personBySlug.get(slug);
    if (!holderId) {
      gaps.push(makeGap("Voorzitter van de Eerste Kamer", "geen persoon gevonden voor de ledenpagina van de Voorzitter", ek.voorzitter.url, "Controleer of het lid op alle_leden staat."));
    } else {
      const sourceId = sourceFor({
        id: `src:ek-persoon-${slugify(slug)}`,
        url: ek.voorzitter.url,
        title: `Voorzitter van de Eerste Kamer - ${slug}`,
        notes: `Ledenpagina van de Voorzitter${ek.voorzitter.since ? `, Voorzitter sinds ${ek.voorzitter.since}` : ""}.`,
      });
      reconcile({
        positionId: "pos:voorzitter-eerste-kamer",
        holderId,
        since: ek.voorzitter.since,
        prefix: "tenure:voorzitter-eerste-kamer",
        ref: sourceRef(sourceId, today),
        label: "ek-voorzitter",
        url: ek.voorzitter.url,
      });
    }
  }

  if (colofon && colofon.annotationAnnounced && !colofon.annotationText) gaps.push(EK_COLOFON_GAP);

  const byId = (a, b) => String(a.id).localeCompare(String(b.id));
  return {
    tenures: tenures.sort(byId),
    positions: positions.sort(byId),
    relations: relations.sort(byId),
    sources: sources.sort(byId),
    closures,
    openings,
    gaps,
    review,
  };
}
