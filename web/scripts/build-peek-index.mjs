#!/usr/bin/env bun
/**
 * Builds the peek index: one compact summary per organisation, position,
 * person and topic, split into PEEK_SHARDS same-origin JSON files under
 * public/peek/. The inline-link popover loads only the shard of the entity a
 * reader opens, so the first page load carries none of it.
 *
 * Every value is copied from the dataset (via the same loaders the pages use);
 * nothing is summarised or generated. Missing values stay null.
 *
 * It also writes the compact row lists of the people, organisation and
 * position index pages to public/peek/lists/ (lib/index-rows.ts); those pages
 * render only their first screen and fetch the rest from there.
 */
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const WEB_DIR = fileURLToPath(new URL("../", import.meta.url));
const OUT_DIR = join(WEB_DIR, "public", "peek");

process.chdir(WEB_DIR);
const data = await import("../lib/data.ts");
const entity = await import("../lib/entity.ts");
const { PARTIES, partyByDataset, partySlug } = await import("../lib/parties.ts");
const { orgEnGloss, positionEn } = await import("../lib/name-gloss.ts");
const { branchColorVar } = await import("../lib/branch-colors.ts");
const { initialsFor } = await import("../lib/initials.ts");
const { descriptionFor } = await import("../lib/description-translations.ts");
const { PEEK_SHARDS, peekKindFor, peekShard } = await import("../lib/peek.ts");

const dataset = data.getDataset();
const { organizations, positions, people, topics, news } = dataset;

function ref(id) {
  const summary = data.entitySummary(id);
  return summary ? { id, name: summary.label, href: summary.href } : null;
}

/** Full Dutch text and a current English translation, or both null (ADR 0016). */
function descriptions(id, text) {
  const pair = descriptionFor(id, text);
  if (pair === null) return { description: null, descriptionEn: null };
  return { description: pair.nl, descriptionEn: pair.en };
}

function sourceFor(refs) {
  for (const item of Array.isArray(refs) ? refs : []) {
    if (!item || typeof item.source !== "string") continue;
    const source = data.getSourceById(item.source);
    if (source && typeof source.url === "string") {
      return { url: source.url, publisher: source.publisher ?? "", retrieved: item.retrieved ?? source.retrieved ?? null };
    }
  }
  return null;
}

function portraitFor(person) {
  const media = entity.getMediaItem(entity.personPortraitId(person));
  return media ? { url: media.url, credit: entity.mediaCreditLine(media) } : null;
}

// News counts in one pass, the same matching the entity pages use.
const newsCount = new Map();
for (const item of news) {
  const seen = new Set();
  for (const id of [...(item.entities ?? []), ...(item.topics ?? [])]) {
    if (seen.has(id)) continue;
    seen.add(id);
    newsCount.set(id, (newsCount.get(id) ?? 0) + 1);
  }
}

// Current tenures by organisation, ordered like the organisation page.
const LEAD_TITLE = /^(Voorzitter|President|Burgemeester|Commissaris van de Koning|Dijkgraaf|Gezaghebber|Directeur-generaal|Secretaris-generaal|Vicepresident|Procureur-generaal)/u;
const positionRank = (title) => (title.startsWith("Minister") ? 0 : LEAD_TITLE.test(title) ? 1 : 2);
const currentByOrganization = new Map();
const currentByPosition = new Map();
const currentByPerson = new Map();
for (const tenure of dataset.tenures) {
  if (tenure.end !== null) continue;
  const position = dataset.positionsById.get(tenure.position);
  if (!position) continue;
  const push = (map, key) => {
    const list = map.get(key);
    if (list) list.push(tenure);
    else map.set(key, [tenure]);
  };
  push(currentByOrganization, position.organization);
  push(currentByPosition, position.id);
  push(currentByPerson, tenure.person);
}
const titleOf = (tenure) => dataset.positionsById.get(tenure.position)?.title ?? "";
for (const list of currentByOrganization.values()) {
  list.sort((a, b) => positionRank(titleOf(a)) - positionRank(titleOf(b)) || titleOf(a).localeCompare(titleOf(b), "nl"));
}

const currentMembers = new Map();
const currentMemberships = new Map();
for (const membership of dataset.memberships) {
  if (membership.end !== null) continue;
  currentMembers.set(membership.organization, (currentMembers.get(membership.organization) ?? 0) + 1);
  const list = currentMemberships.get(membership.person);
  if (list) list.push(membership);
  else currentMemberships.set(membership.person, [membership]);
}

function holder(tenure, withTitle) {
  const person = dataset.peopleById.get(tenure.person);
  if (!person) return null;
  const position = dataset.positionsById.get(tenure.position);
  return {
    id: person.id,
    name: withTitle && position ? `${person.name}` : person.name,
    href: `/personen/${person.slug}/`,
    portrait: portraitFor(person)?.url ?? null,
    initials: initialsFor(person.name),
    color: partyByDataset(person.party)?.color ?? null,
    acting: Boolean(tenure.acting),
    start: tenure.start ?? null,
    title: withTitle && position ? position.title : null,
  };
}

function base(id, kind, name, href) {
  return {
    id,
    kind,
    name,
    href,
    gloss: null,
    initials: kind === "person" ? initialsFor(name) : null,
    color: null,
    portrait: null,
    subtype: null,
    branch: null,
    party: null,
    description: null,
    descriptionEn: null,
    parent: null,
    roles: [],
    roleCount: 0,
    holders: [],
    holderCount: 0,
    memberOf: [],
    memberOfCount: 0,
    related: [],
    relatedCount: 0,
    members: 0,
    seats: null,
    connections: entity.getConnectionsForEntity(id).length,
    news: newsCount.get(id) ?? 0,
    source: null,
  };
}

const records = [];

for (const org of organizations) {
  const record = base(org.id, peekKindFor(org.id, org.subtype), org.name, `/organisaties/${org.slug}/`);
  record.gloss = orgEnGloss(org.name);
  record.color = branchColorVar(org.branch);
  record.subtype = org.subtype ?? null;
  record.branch = org.branch ?? null;
  Object.assign(record, descriptions(org.id, org.description));
  const parentId = entity.organizationParentId(org) ?? entity.organizationPartOf(org)[0] ?? null;
  record.parent = parentId ? ref(parentId) : null;
  const current = currentByOrganization.get(org.id) ?? [];
  record.holders = current
    .slice(0, 2)
    .map((tenure) => holder(tenure, true))
    .filter(Boolean);
  record.holderCount = current.length;
  record.members = currentMembers.get(org.id) ?? 0;
  record.seats = typeof org.seatsCount === "number" ? org.seatsCount : null;
  record.source = sourceFor(org.sources);
  records.push(record);
}

for (const position of positions) {
  const record = base(position.id, "position", position.title, `/posities/${position.slug}/`);
  record.gloss = positionEn(position.title);
  const organization = dataset.organizationsById.get(position.organization);
  record.color = organization ? branchColorVar(organization.branch) : null;
  record.branch = organization?.branch ?? null;
  record.parent = organization ? ref(organization.id) : null;
  const current = currentByPosition.get(position.id) ?? [];
  record.holders = current
    .slice(0, 2)
    .map((tenure) => holder(tenure, false))
    .filter(Boolean);
  record.holderCount = current.length;
  record.seats = typeof position.seatsCount === "number" ? position.seatsCount : null;
  record.source = sourceFor(position.sources);
  records.push(record);
}

for (const person of people) {
  const record = base(person.id, "person", person.name, `/personen/${person.slug}/`);
  const party = partyByDataset(person.party);
  record.color = party?.color ?? null;
  record.portrait = portraitFor(person);
  record.party = party
    ? {
        abbrev: party.abbrev,
        name: party.name.nl,
        href: PARTIES.includes(party) ? `/partijen/${partySlug(party)}/` : null,
      }
    : null;
  Object.assign(record, descriptions(person.id, person.description));
  const current = (currentByPerson.get(person.id) ?? [])
    .slice()
    .sort((a, b) => positionRank(titleOf(a)) - positionRank(titleOf(b)) || (b.start ?? "").localeCompare(a.start ?? ""));
  record.roles = current.slice(0, 2).flatMap((tenure) => {
    const position = dataset.positionsById.get(tenure.position);
    if (!position) return [];
    const organization = dataset.organizationsById.get(position.organization);
    return [
      {
        id: position.id,
        name: position.title,
        href: `/posities/${position.slug}/`,
        gloss: positionEn(position.title),
        organization: organization ? ref(organization.id) : null,
        acting: Boolean(tenure.acting),
        start: tenure.start ?? null,
      },
    ];
  });
  record.roleCount = current.length;
  const memberships = currentMemberships.get(person.id) ?? [];
  record.memberOf = memberships
    .slice(0, 2)
    .map((membership) => ref(membership.organization))
    .filter(Boolean);
  record.memberOfCount = memberships.length;
  record.source = sourceFor(person.sources);
  records.push(record);
}

for (const topic of topics) {
  const record = base(topic.id, "topic", topic.name, `/onderwerpen/${topic.slug}/`);
  Object.assign(record, descriptions(topic.id, topic.description));
  const organizationIds = Array.isArray(topic.organizations) ? topic.organizations : [];
  record.related = organizationIds.slice(0, 3).map(ref).filter(Boolean);
  record.relatedCount = organizationIds.length;
  record.source = sourceFor(topic.sources);
  records.push(record);
}

// Drop empty values (null, false, 0, empty lists) to keep the shards small;
// the client restores the defaults with normalizePeekRecord.
function compact(value) {
  if (Array.isArray(value)) return value.map(compact);
  if (value === null || typeof value !== "object") return value;
  const out = {};
  for (const [key, entry] of Object.entries(value)) {
    if (entry === null || entry === false || entry === 0 || (Array.isArray(entry) && entry.length === 0)) continue;
    out[key] = compact(entry);
  }
  return out;
}

const shards = new Map();
for (const record of records) {
  const key = peekShard(record.id);
  const shard = shards.get(key) ?? {};
  shard[record.id] = compact(record);
  shards.set(key, shard);
}

rmSync(OUT_DIR, { recursive: true, force: true });
mkdirSync(OUT_DIR, { recursive: true });
let bytes = 0;
let largest = 0;
for (let index = 0; index < PEEK_SHARDS; index += 1) {
  const key = String(index).padStart(2, "0");
  const json = JSON.stringify({ version: 1, records: shards.get(key) ?? {} });
  writeFileSync(join(OUT_DIR, `${key}.json`), json);
  const size = Buffer.byteLength(json, "utf8");
  bytes += size;
  largest = Math.max(largest, size);
}
console.log(
  `peek index: ${records.length} records in ${PEEK_SHARDS} shards, ${(bytes / 1024).toFixed(1)} KiB total, largest shard ${(largest / 1024).toFixed(1)} KiB`,
);

// The long index lists (people, organisations, positions): one JSON file each,
// fetched by the list pages after the first screen. Same loaders as the pages.
const { buildPeopleRows, buildOrganizationRows, buildPositionRows } = await import("../lib/index-rows.ts");
const LISTS_DIR = join(OUT_DIR, "lists");
mkdirSync(LISTS_DIR, { recursive: true });
for (const [name, rows] of [
  ["personen", buildPeopleRows().rows],
  ["organisaties", buildOrganizationRows().rows],
  ["posities", buildPositionRows().rows],
]) {
  const json = JSON.stringify(rows.map((row) => Object.fromEntries(Object.entries(row).filter(([, value]) => value !== null && value !== undefined))));
  writeFileSync(join(LISTS_DIR, `${name}.json`), json);
  console.log(`index list ${name}: ${rows.length} rows, ${(Buffer.byteLength(json, "utf8") / 1024).toFixed(1)} KiB`);
}
