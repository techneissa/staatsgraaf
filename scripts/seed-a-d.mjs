#!/usr/bin/env node
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const RAW = join(ROOT, "research", "raw", "00");
const RETRIEVED = "2026-09-17";

const out = {
  governments: [],
  organizations: [],
  positions: [],
  people: [],
  tenures: [],
  memberships: [],
  relations: [],
  changes: [],
  news: [],
  topics: [],
  budgets: [],
  sources: [],
  media: [],
};

function translit(text) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[şŞ]/g, "s")
    .replace(/[ğĞ]/g, "g")
    .replace(/[ıİ]/g, "i")
    .replace(/[øØ]/g, "o")
    .replace(/[æÆ]/g, "ae")
    .replace(/[œŒ]/g, "oe")
    .replace(/ß/g, "ss")
    .replace(/[’'`´]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function uniqueSlug(base, taken) {
  let slug = base;
  let n = 2;
  while (taken.has(slug)) {
    slug = `${base}-${n}`;
    n += 1;
  }
  taken.add(slug);
  return slug;
}

function addSource(id, url, title, publisher, type, extra = {}) {
  if (out.sources.some((s) => s.id === id)) return id;
  out.sources.push({
    id,
    url,
    title,
    publisher,
    type,
    published: extra.published ?? null,
    retrieved: RETRIEVED,
    license: extra.license ?? null,
    archiveUrl: null,
    notes: extra.notes ?? null,
  });
  return id;
}

const srcRef = (id, confidence = "high") => ({ source: id, retrieved: RETRIEVED, confidence });

// ---------- sources ----------
addSource("src:grondwet", "https://wetten.overheid.nl/BWBR0001840", "Grondwet", "Overheid.nl", "wet");
addSource("src:rijksoverheid-bewindspersonen", "https://www.rijksoverheid.nl/regering/bewindspersonen", "Bewindspersonen", "Rijksoverheid", "page");
addSource("src:rijksoverheid-ministeries", "https://www.rijksoverheid.nl/ministeries", "Ministeries", "Rijksoverheid", "page");
addSource("src:tweede-kamer", "https://www.tweedekamer.nl/", "Tweede Kamer der Staten-Generaal", "Tweede Kamer", "page");
addSource("src:eerstekamer-fracties", "https://www.eerstekamer.nl/fracties", "Fracties", "Eerste Kamer", "page");
addSource("src:ek-alle-leden", "https://www.eerstekamer.nl/alle_leden", "Alle leden", "Eerste Kamer", "page");
const TK_ODATA = "https://gegevensmagazijn.tweedekamer.nl/OData/v4/2.0";
addSource("src:tk-odata-fracties", `${TK_ODATA}/Fractie?$filter=DatumInactief eq null and AantalZetels ne null`, "Fractie", "Tweede Kamer OData API", "api");
addSource("src:tk-odata-fractiezetels", `${TK_ODATA}/FractieZetel?$select=Id,Gewicht,Fractie_Id`, "FractieZetel", "Tweede Kamer OData API", "api");
addSource("src:tk-odata-fractiezetelpersonen", `${TK_ODATA}/FractieZetelPersoon?$filter=Verwijderd eq false and TotEnMet eq null`, "FractieZetelPersoon", "Tweede Kamer OData API", "api");
addSource("src:tk-odata-personen", `${TK_ODATA}/Persoon`, "Persoon", "Tweede Kamer OData API", "api");

// ---------- governments ----------
out.governments.push(
  {
    slug: "nl",
    name: "Nederland",
    type: "land",
    level: "rijk",
    country: "nederland",
    parent: null,
    description: null,
    sources: [srcRef("src:grondwet")],
  },
  {
    slug: "nl-rijk",
    name: "Rijk",
    type: "scope",
    level: "rijk",
    country: "nederland",
    parent: "nl",
    description: null,
    sources: [srcRef("src:grondwet")],
  }
);

// ---------- ministeries (workstream A first pass) ----------
const readNorm = (p) => readFileSync(join(RAW, p), "utf8").replace(/\u00a0/g, " ").replace(/\s+/g, " ");
const ministeriesHtml = readNorm("rijksoverheid-ministeries.out");
const ministerieEntries = [];
const seenMinisteries = new Set();
for (const m of ministeriesHtml.matchAll(/href="(\/ministeries\/[a-z0-9-]+)"[\s\S]*?<\/a>/g)) {
  const slug = m[1].split("/").pop();
  if (seenMinisteries.has(slug)) continue;
  const nameMatch = m[0].match(/>(Ministerie[^<]*)</);
  if (!nameMatch) continue;
  seenMinisteries.add(slug);
  ministerieEntries.push({ slug, name: nameMatch[1].trim() });
}
if (ministerieEntries.length !== 12) {
  throw new Error(`expected 12 ministeries, parsed ${ministerieEntries.length}`);
}

for (const entry of ministerieEntries) {
  out.organizations.push({
    id: `org:${entry.slug}`,
    slug: entry.slug,
    name: entry.name,
    aliases: [],
    type: "department",
    subtype: "ministerie",
    branch: "regering",
    level: "rijk",
    country: "nederland",
    parent: null,
    partOf: [],
    description: null,
    legalSource: { label: "Grondwet art. 44", url: "https://wetten.overheid.nl/BWBR0001840" },
    website: `https://www.rijksoverheid.nl/ministeries/${entry.slug}`,
    established: null,
    dissolved: null,
    seatsCount: null,
    employeeCount: { budgeted: null, actual: null, year: null },
    images: [],
    sources: [srcRef("src:rijksoverheid-ministeries"), srcRef("src:grondwet")],
  });
}

out.organizations.push({
  id: "org:regering",
  slug: "regering",
  name: "Regering",
  aliases: [],
  type: "department",
  subtype: "land-regering",
  branch: "regering",
  level: "rijk",
  country: "nederland",
  parent: null,
  partOf: [],
  description: null,
  legalSource: { label: "Grondwet art. 42", url: "https://wetten.overheid.nl/BWBR0001840" },
  website: null,
  established: null,
  dissolved: null,
  seatsCount: null,
  employeeCount: { budgeted: null, actual: null, year: null },
  images: [],
  sources: [srcRef("src:grondwet"), srcRef("src:rijksoverheid-bewindspersonen")],
});

out.organizations.push({
  id: "org:tweede-kamer",
  slug: "tweede-kamer",
  name: "Tweede Kamer der Staten-Generaal",
  aliases: ["Tweede Kamer"],
  type: "elected",
  subtype: "tweede-kamer",
  branch: "staten-generaal",
  level: "rijk",
  country: "nederland",
  parent: null,
  partOf: [],
  description: null,
  legalSource: { label: "Grondwet art. 51", url: "https://wetten.overheid.nl/BWBR0001840" },
  website: "https://www.tweedekamer.nl",
  established: null,
  dissolved: null,
  seatsCount: 150,
  employeeCount: { budgeted: null, actual: null, year: null },
  images: [],
  sources: [srcRef("src:tweede-kamer"), srcRef("src:tk-odata-fracties")],
});

out.organizations.push({
  id: "org:eerste-kamer",
  slug: "eerste-kamer",
  name: "Eerste Kamer der Staten-Generaal",
  aliases: ["Eerste Kamer"],
  type: "elected",
  subtype: "eerste-kamer",
  branch: "staten-generaal",
  level: "rijk",
  country: "nederland",
  parent: null,
  partOf: [],
  description: null,
  legalSource: { label: "Grondwet art. 51", url: "https://wetten.overheid.nl/BWBR0001840" },
  website: "https://www.eerstekamer.nl",
  established: null,
  dissolved: null,
  seatsCount: 75,
  employeeCount: { budgeted: null, actual: null, year: null },
  images: [],
  sources: [srcRef("src:eerstekamer-fracties"), srcRef("src:ek-alle-leden")],
});

// ---------- bewindspersonen (28 positions, people, tenures) ----------
const personDir = join(RAW, "bewindspersonen");
const bewindspersonen = [];
for (const file of readdirSync(personDir).filter((f) => f.endsWith(".html")).sort()) {
  const html = readFileSync(join(personDir, file), "utf8").replace(/\u00a0/g, " ").replace(/\s+/g, " ");
  const pageSlug = file.replace(/\.html$/, "");
  const title = html.match(/<title>([^<|]+)\|/)[1].trim();
  const description = html.match(/<meta name="description" content="([^"]+)"/)[1];
  let role = description.replace(`${title} is `, "").replace(/\.$/, "");
  role = role.replace(/ en (1e |2e )?viceminister-president$/, "");
  role = role.charAt(0).toUpperCase() + role.slice(1);
  const ministerieLink = [...new Set([...html.matchAll(/href="(\/ministeries\/[a-z0-9-]+)"/g)].map((m) => m[1]))][0];
  const ministerieSlug = ministerieLink
    ? ministerieLink.split("/").pop()
    : "ministerie-van-algemene-zaken";
  const benoeming = html.match(/(\d{1,2} \w+ \d{4})[^0-9]{0,120}Benoeming[^<]*?in het kabinet-Jetten/);
  if (!benoeming) throw new Error(`no appointment date in ${file}`);
  const [day, monthName, year] = benoeming[1].split(" ");
  const months = {
    januari: "01", februari: "02", maart: "03", april: "04", mei: "05", juni: "06",
    juli: "07", augustus: "08", september: "09", oktober: "10", november: "11", december: "12",
  };
  const start = `${year}-${months[monthName]}-${String(day).padStart(2, "0")}`;
  const right = html.match(/<meta name="DCTERMS.rights" content="([^"]+)"/);
  addSource(
    `src:rijksoverheid-${pageSlug}`,
    `https://www.rijksoverheid.nl/regering/bewindspersonen/${pageSlug}`,
    title,
    "Rijksoverheid",
    "page",
    { license: right ? right[1] : null }
  );
  bewindspersonen.push({ pageSlug, title, role, ministerieSlug, start });
}

const personSlugs = new Set();
const positionSlugs = new Set();
const bewindspersonenByName = new Map();
for (const b of bewindspersonen) {
  const isMp = /^minister-president/i.test(b.role);
  const isSecretary = /^staatssecretaris/i.test(b.role);
  let title;
  let orgSlug;
  if (isMp) {
    title = "Minister-president";
    orgSlug = "ministerie-van-algemene-zaken";
  } else {
    title = b.role.replace("Koninkrijkrelaties", "Koninkrijksrelaties");
    orgSlug = b.ministerieSlug;
  }
  const positionSlug = translit(title);
  positionSlugs.add(positionSlug);
  const orgId = `org:${orgSlug}`;
  if (!out.organizations.some((o) => o.id === orgId)) {
    throw new Error(`unknown ministerie for ${b.title}: ${orgSlug}`);
  }
  out.positions.push({
    id: `pos:${positionSlug}`,
    slug: positionSlug,
    title,
    organization: orgId,
    type: "dept_head",
    fillMethod: "koninklijk-besluit",
    entryModes: ["benoemd"],
    termLengthMonths: null,
    seatsCount: 1,
    legalBasis: { label: "Grondwet art. 43", url: "https://wetten.overheid.nl/BWBR0001840" },
    exOfficioOf: [],
    sources: [srcRef(`src:rijksoverheid-${b.pageSlug}`)],
  });
  const personSlug = uniqueSlug(translit(b.title), personSlugs);
  const personId = `person:${personSlug}`;
  out.people.push({
    id: personId,
    slug: personSlug,
    name: b.title,
    aliases: [],
    portrait: null,
    birthDate: null,
    party: null,
    wikipedia: null,
    wikidata: null,
    description: null,
    sources: [srcRef(`src:rijksoverheid-${b.pageSlug}`)],
  });
  bewindspersonenByName.set(b.title, personId);
  out.tenures.push({
    id: `tenure:${positionSlug}-${personSlug}`,
    person: personId,
    position: `pos:${positionSlug}`,
    seat: null,
    start: b.start,
    end: null,
    acting: false,
    entryMode: "benoemd",
    appointedBy: "org:regering",
    predecessor: null,
    successor: null,
    endReason: null,
    source: srcRef(`src:rijksoverheid-${b.pageSlug}`),
  });
  const relationType = isSecretary ? "office" : "dept_head";
  out.relations.push({
    id: `rel:${relationType.replace(/_/g, "-")}-${positionSlug}`,
    from: `pos:${positionSlug}`,
    to: orgId,
    type: relationType,
    metadata: {},
    seatsAppointed: 0,
    source: srcRef(`src:rijksoverheid-${b.pageSlug}`),
  });
}

// ---------- Tweede Kamer leden (150 memberships) ----------
const fractiesFull = JSON.parse(readFileSync(join(RAW, "tk-fracties-full.json"), "utf8")).value;
const fractiesById = new Map(fractiesFull.map((f) => [f.Id, f]));
const zetels = JSON.parse(readFileSync(join(RAW, "tk-fractiezetels.json"), "utf8"));
const zetelsById = new Map(zetels.map((z) => [z.Id, z]));
const fzps = JSON.parse(readFileSync(join(RAW, "tk-fractiezetelpersonen.json"), "utf8"));
const rows = (raw) => (Array.isArray(raw) ? raw : raw.value);
const personen = [
  ...rows(JSON.parse(readFileSync(join(RAW, "tk-personen-th.json"), "utf8"))),
  ...rows(JSON.parse(readFileSync(join(RAW, "tk-personen-missing.json"), "utf8"))),
];
const personenById = new Map(personen.map((p) => [p.Id, p]));

if (fzps.length !== 150) throw new Error(`expected 150 FractieZetelPersoon, got ${fzps.length}`);
let tkCount = 0;
for (const fzp of fzps) {
  const persoon = personenById.get(fzp.Persoon_Id);
  if (!persoon) throw new Error(`missing Persoon ${fzp.Persoon_Id}`);
  const zetel = zetelsById.get(fzp.FractieZetel_Id);
  const fractie = zetel ? fractiesById.get(zetel.Fractie_Id) : null;
  if (!zetel || !fractie) throw new Error(`missing fractie join for ${fzp.Id}`);
  const parts = [persoon.Voornamen, persoon.Tussenvoegsel, persoon.Achternaam].filter(Boolean);
  const name = parts.join(" ");
  const initialsName = [persoon.Initialen, persoon.Tussenvoegsel, persoon.Achternaam].filter(Boolean).join(" ");
  const personSlug = uniqueSlug(translit(name), personSlugs);
  const personId = `person:${personSlug}`;
  out.people.push({
    id: personId,
    slug: personSlug,
    name,
    aliases: [initialsName],
    portrait: null,
    birthDate: persoon.Geboortedatum ?? null,
    party: fractie.Afkorting,
    wikipedia: null,
    wikidata: null,
    description: null,
    sources: [srcRef("src:tk-odata-personen")],
  });
  out.memberships.push({
    id: `membership:tweede-kamer-${personSlug}`,
    organization: "org:tweede-kamer",
    person: personId,
    seatNumber: null,
    fractie: fractie.Afkorting,
    start: fzp.Van.slice(0, 10),
    end: null,
    source: srcRef("src:tk-odata-fractiezetelpersonen"),
  });
  tkCount += 1;
}
if (tkCount !== 150) throw new Error(`expected 150 TK memberships, got ${tkCount}`);

// ---------- Eerste Kamer leden (75 memberships) ----------
const ekHtml = readNorm("ek-alle-leden.out");
const ekItems = [...ekHtml.matchAll(/<li class="persoon[^"]*">([\s\S]*?)<\/li>/g)].map((m) => m[1]);
if (ekItems.length !== 75) throw new Error(`expected 75 EK leden, got ${ekItems.length}`);
function stripTags(s) {
  return s.replace(/<[^>]+>/g, " ").replace(/&euml;/g, "e").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
}
const retrievedDate = new Date(`${RETRIEVED}T00:00:00Z`);
let ekCount = 0;
for (const item of ekItems) {
  const bijschriftMatch = item.match(/<div class="persoon_bijschrift"><div><div class="naam">([^<]+)<\/div><\/div><div>([^<]+)<\/div>/);
  const ancienniteitMatch = item.match(/Anci&euml;nniteit:\s*(\d+)\s*dagen/);
  const geboorteMatch = item.match(/Geboortedatum:\s*(\d{2})-(\d{2})-(\d{4})/);
  if (!bijschriftMatch || !ancienniteitMatch) throw new Error(`cannot parse EK item: ${stripTags(item).slice(0, 120)}`);
  const name = bijschriftMatch[1].trim();
  const fractie = bijschriftMatch[2].trim();
  const startDate = new Date(retrievedDate);
  startDate.setUTCDate(startDate.getUTCDate() - Number(ancienniteitMatch[1]));
  const start = startDate.toISOString().slice(0, 10);
  const personSlug = uniqueSlug(translit(name), personSlugs);
  const personId = `person:${personSlug}`;
  out.people.push({
    id: personId,
    slug: personSlug,
    name,
    aliases: [],
    portrait: null,
    birthDate: geboorteMatch ? `${geboorteMatch[3]}-${geboorteMatch[2]}-${geboorteMatch[1]}` : null,
    party: fractie,
    wikipedia: null,
    wikidata: null,
    description: null,
    sources: [srcRef("src:ek-alle-leden")],
  });
  out.memberships.push({
    id: `membership:eerste-kamer-${personSlug}`,
    organization: "org:eerste-kamer",
    person: personId,
    seatNumber: null,
    fractie,
    start,
    end: null,
    source: srcRef("src:ek-alle-leden", "medium"),
  });
  ekCount += 1;
}
if (ekCount !== 75) throw new Error(`expected 75 EK memberships, got ${ekCount}`);

// ---------- write ----------
const files = [
  ["governments", "governments.json"],
  ["organizations", "organizations.json"],
  ["positions", "positions.json"],
  ["people", "people.json"],
  ["tenures", "tenures.json"],
  ["memberships", "memberships.json"],
  ["relations", "relations.json"],
  ["changes", "changes.json"],
  ["news", "news.json"],
  ["topics", "topics.json"],
  ["budgets", "budgets.json"],
  ["sources", "sources.json"],
  ["media", "media.json"],
];
for (const [key, file] of files) {
  writeFileSync(join(ROOT, "data", file), JSON.stringify(out[key], null, 2) + "\n");
}
console.log("seed written:", files.map(([k]) => `${k}=${out[k].length}`).join(" "));
