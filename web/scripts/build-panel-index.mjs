#!/usr/bin/env bun
/**
 * Builds the panel index: one record per organisation, person, news item and
 * topic for the selection panels (components/panels), split into same-origin
 * shards under public/panels/ with the peek hash, plus a small index.json for
 * the details panel's default view. A pick on the graph or the power map
 * loads one shard; the first page load carries none of it.
 *
 * Every value is copied from the dataset through the loaders the pages use;
 * nothing is summarised or generated. Missing values stay out and read as
 * null on the client (normalizePanelRecord).
 */
import { mkdirSync, readFileSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const WEB_DIR = fileURLToPath(new URL("../", import.meta.url));
const OUT_DIR = join(WEB_DIR, "public", "panels");

process.chdir(WEB_DIR);
const data = await import("../lib/data.ts");
const entity = await import("../lib/entity.ts");
const { PARTIES, partyByDataset, partySlug } = await import("../lib/parties.ts");
const { orgEnGloss, positionEn } = await import("../lib/name-gloss.ts");
const { clampSentences, clampMarkupSentences, stripTitleFromMarkup } = await import("../lib/news-text.ts");
const { changeDisplayKind, titleNamesBody } = await import("../lib/changes.ts");
const { newsTranslationFor } = await import("../lib/news-translations.ts");
const { getBudgetByOrganizationSlug, BUDGET_OVERVIEW_YEAR } = await import("../lib/budget.ts");
const { peekKindFor } = await import("../lib/peek.ts");
const { descriptionFor } = await import("../lib/description-translations.ts");
const { compactValue, PANEL_SHARDS, panelShard } = await import("../components/panels/panel-data.ts");

const dataset = data.getDataset();
const { organizations, positions, people, topics, news, changes } = dataset;

const NEWS_LIMIT = 5;
const CHANGE_LIMIT = 5;
const HOLDER_LIMIT = 12;
const PEOPLE_LIMIT = 8;

function ref(id) {
  const summary = data.entitySummary(id);
  return summary ? { id, name: summary.label, href: summary.href } : null;
}

function description(text, max = 520) {
  if (typeof text !== "string" || text.trim() === "") return null;
  return clampSentences(text.replaceAll(/\s+/g, " ").trim(), max);
}

/** The English description, only when a current translation of the Dutch text exists (ADR 0016). */
function descriptionEn(id, text, max = 520) {
  const pair = descriptionFor(id, text);
  if (pair === null || pair.en === null) return null;
  return clampSentences(pair.en.replaceAll(/\s+/g, " ").trim(), max);
}

function sourceOf(sourceId, retrieved) {
  const source = typeof sourceId === "string" ? data.getSourceById(sourceId) : null;
  if (!source || typeof source.url !== "string") return null;
  return { url: source.url, publisher: source.publisher ?? "", retrieved: retrieved ?? source.retrieved ?? null };
}

function sourceFor(refs) {
  for (const item of Array.isArray(refs) ? refs : []) {
    const source = item ? sourceOf(item.source, item.retrieved) : null;
    if (source) return source;
  }
  return null;
}

function portraitOf(person) {
  const media = entity.getMediaItem(entity.personPortraitId(person));
  return media ? { url: media.url, credit: entity.mediaCreditLine(media) } : null;
}

function personRef(person) {
  const party = partyByDataset(person.party);
  return {
    id: person.id,
    name: person.name,
    href: `/personen/${person.slug}/`,
    portrait: portraitOf(person)?.url ?? null,
    color: party?.color ?? null,
    party: party?.abbrev ?? null,
  };
}

function newsRef(item) {
  return {
    id: item.id,
    title: item.title,
    url: item.url,
    publisher: item.publisher,
    published: item.published,
    language: item.language === "en" ? "en" : "nl",
  };
}

// News, newest first, indexed by every entity and topic it names.
const sortedNews = [...news].sort((a, b) => b.published.localeCompare(a.published) || a.id.localeCompare(b.id));
const newsByEntity = new Map();
for (const item of sortedNews) {
  const seen = new Set();
  for (const id of [...(item.entities ?? []), ...(item.topics ?? [])]) {
    if (seen.has(id)) continue;
    seen.add(id);
    const list = newsByEntity.get(id);
    if (list) list.push(item);
    else newsByEntity.set(id, [item]);
  }
}

/** People named in the same news items as `id`, most often first. */
function peopleNamedWith(id) {
  const counts = new Map();
  for (const item of newsByEntity.get(id) ?? []) {
    const seen = new Set();
    for (const other of item.entities ?? []) {
      if (other === id || seen.has(other) || !other.startsWith("person:")) continue;
      seen.add(other);
      counts.set(other, (counts.get(other) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .flatMap(([personId, count]) => {
      const person = dataset.peopleById.get(personId);
      return person ? [{ ...personRef(person), count }] : [];
    })
    .slice(0, PEOPLE_LIMIT);
}

// Changes, newest first, by the organisation and the people they are about.
function changeRef(change) {
  const position = change.position ? dataset.positionsById.get(change.position) : null;
  const organization = change.organization ? dataset.organizationsById.get(change.organization) : null;
  const kind = changeDisplayKind(change);
  const personId = kind === "departure" ? change.out?.person : kind === "vacancy" ? null : change.in?.person;
  const person = personId ? dataset.peopleById.get(personId) : null;
  return {
    id: change.id,
    date: change.date,
    kind,
    person: person ? { id: person.id, name: person.name, href: `/personen/${person.slug}/` } : null,
    position: position ? { id: position.id, name: position.title, href: `/posities/${position.slug}/` } : null,
    organization: organization ? { id: organization.id, name: organization.name, href: `/organisaties/${organization.slug}/` } : null,
    showBody: Boolean(position && organization && !titleNamesBody(position.title, organization.name)),
    summary: change.summary,
    source: sourceOf(change.source?.source, change.source?.retrieved)?.url ?? null,
  };
}
const sortedChanges = [...changes].sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id));
const changesByEntity = new Map();
for (const change of sortedChanges) {
  const ids = new Set([change.organization, change.in?.person, change.out?.person].filter(Boolean));
  for (const id of ids) {
    const list = changesByEntity.get(id);
    if (list) list.push(change);
    else changesByEntity.set(id, [change]);
  }
}
const recentChanges = (id) => (changesByEntity.get(id) ?? []).slice(0, CHANGE_LIMIT).map(changeRef);

// Current tenures and memberships, ordered like the peek index and the pages.
const LEAD_TITLE = /^(Voorzitter|President|Burgemeester|Commissaris van de Koning|Dijkgraaf|Gezaghebber|Directeur-generaal|Secretaris-generaal|Vicepresident|Procureur-generaal)/u;
const positionRank = (title) => (title.startsWith("Minister") ? 0 : LEAD_TITLE.test(title) ? 1 : 2);
const titleOf = (tenure) => dataset.positionsById.get(tenure.position)?.title ?? "";
const currentByOrganization = new Map();
const currentByPerson = new Map();
const positionsByOrganization = new Map();
for (const position of positions) {
  positionsByOrganization.set(position.organization, (positionsByOrganization.get(position.organization) ?? 0) + 1);
}
for (const tenure of dataset.tenures) {
  if (tenure.end !== null) continue;
  const position = dataset.positionsById.get(tenure.position);
  if (!position) continue;
  for (const [map, key] of [
    [currentByOrganization, position.organization],
    [currentByPerson, tenure.person],
  ]) {
    const list = map.get(key);
    if (list) list.push(tenure);
    else map.set(key, [tenure]);
  }
}
const byRank = (a, b) =>
  positionRank(titleOf(a)) - positionRank(titleOf(b)) ||
  titleOf(a).localeCompare(titleOf(b), "nl") ||
  (b.start ?? "").localeCompare(a.start ?? "");
for (const list of currentByOrganization.values()) list.sort(byRank);
for (const list of currentByPerson.values()) list.sort(byRank);

const currentMembersByOrganization = new Map();
const currentMembershipsByPerson = new Map();
for (const membership of dataset.memberships) {
  if (membership.end !== null) continue;
  for (const [map, key] of [
    [currentMembersByOrganization, membership.organization],
    [currentMembershipsByPerson, membership.person],
  ]) {
    const list = map.get(key);
    if (list) list.push(membership);
    else map.set(key, [membership]);
  }
}

/** The chamber entry key, exactly as web/scripts/build-graph.mjs keys the seat blocks. */
function fractieKey(fractie) {
  if (typeof fractie !== "string") return "__none__";
  return partyByDataset(fractie)?.key ?? fractie;
}

// The chambers the graph draws as seat arches get their members per fractie.
const graph = JSON.parse(readFileSync(join(WEB_DIR, "public", "graph.json"), "utf8"));
const chamberIds = new Set(Object.keys(graph.chambers ?? {}));

function budgetFor(org) {
  const view = getBudgetByOrganizationSlug(org.slug);
  if (!view || !view.current) return null;
  const record = view.currentRecord;
  return {
    fiscalYear: record?.fiscalYear ?? BUDGET_OVERVIEW_YEAR,
    previousFiscalYear: view.previousRecord?.fiscalYear ?? (record ? record.fiscalYear - 1 : null),
    unit: view.unit,
    spendingBudget: view.current.spendingBudget ?? null,
    spendingActual: view.previous?.spendingActual ?? null,
    revenue: view.current.revenue ?? null,
    net: view.current.net ?? null,
    previousSpendingBudget: view.previous?.spendingBudget ?? null,
    href: `/begroting/${org.slug}/`,
    source: sourceFor(view.sources),
  };
}

const records = [];

for (const org of organizations) {
  const current = currentByOrganization.get(org.id) ?? [];
  const members = currentMembersByOrganization.get(org.id) ?? [];
  const parentId = entity.organizationParentId(org) ?? entity.organizationPartOf(org)[0] ?? null;
  const orgNews = newsByEntity.get(org.id) ?? [];
  records.push({
    kind: "org",
    id: org.id,
    name: org.name,
    href: `/organisaties/${org.slug}/`,
    gloss: orgEnGloss(org.name),
    subtype: org.subtype ?? null,
    branch: org.branch ?? null,
    description: description(org.description),
    descriptionEn: descriptionEn(org.id, org.description),
    website: typeof org.website === "string" && org.website !== "" ? org.website : null,
    parent: parentId ? ref(parentId) : null,
    holders: current.slice(0, HOLDER_LIMIT).flatMap((tenure) => {
      const person = dataset.peopleById.get(tenure.person);
      const position = dataset.positionsById.get(tenure.position);
      if (!person || !position) return [];
      return [
        {
          position: { id: position.id, name: position.title, href: `/posities/${position.slug}/`, gloss: positionEn(position.title) },
          person: personRef(person),
          acting: Boolean(tenure.acting),
          start: tenure.start ?? null,
        },
      ];
    }),
    holderCount: current.length,
    positionCount: positionsByOrganization.get(org.id) ?? 0,
    memberCount: members.length,
    budget: budgetFor(org),
    news: orgNews.slice(0, NEWS_LIMIT).map(newsRef),
    newsCount: orgNews.length,
    changes: recentChanges(org.id),
    inTheNews: peopleNamedWith(org.id),
    source: sourceFor(org.sources),
  });
}

for (const person of people) {
  const party = partyByDataset(person.party);
  const personNews = newsByEntity.get(person.id) ?? [];
  records.push({
    kind: "person",
    id: person.id,
    name: person.name,
    href: `/personen/${person.slug}/`,
    portrait: portraitOf(person),
    color: party?.color ?? null,
    partyKey: party?.key ?? null,
    party: party
      ? {
          abbrev: party.abbrev,
          name: party.name.nl,
          href: PARTIES.includes(party) ? `/partijen/${partySlug(party)}/` : null,
        }
      : null,
    description: description(person.description),
    descriptionEn: descriptionEn(person.id, person.description),
    roles: (currentByPerson.get(person.id) ?? []).flatMap((tenure) => {
      const position = dataset.positionsById.get(tenure.position);
      if (!position) return [];
      return [
        {
          position: { id: position.id, name: position.title, href: `/posities/${position.slug}/`, gloss: positionEn(position.title) },
          organization: ref(position.organization),
          acting: Boolean(tenure.acting),
          start: tenure.start ?? null,
        },
      ];
    }),
    memberships: (currentMembershipsByPerson.get(person.id) ?? []).flatMap((membership) => {
      const organization = ref(membership.organization);
      if (!organization) return [];
      const fractie = typeof membership.fractie === "string" && membership.fractie !== "" ? membership.fractie : null;
      return [
        {
          organization,
          fractie,
          fractieKey: chamberIds.has(membership.organization) ? fractieKey(fractie) : null,
          start: membership.start ?? null,
        },
      ];
    }),
    news: personNews.slice(0, NEWS_LIMIT).map(newsRef),
    newsCount: personNews.length,
    coMentioned: peopleNamedWith(person.id),
    changes: recentChanges(person.id),
    source: sourceFor(person.sources),
  });
}

function newsEntity(id) {
  const summary = data.entitySummary(id);
  if (!summary) return null;
  const subtype = id.startsWith("org:") ? (dataset.organizationsById.get(id)?.subtype ?? null) : null;
  const kind = peekKindFor(id, subtype);
  if (!kind) return null;
  const person = id.startsWith("person:") ? dataset.peopleById.get(id) : null;
  return {
    id,
    name: summary.label,
    href: summary.href,
    kind,
    portrait: person ? (portraitOf(person)?.url ?? null) : null,
    color: person ? (partyByDataset(person.party)?.color ?? null) : null,
  };
}

/** The lead without the headline some feeds repeat in front of it, clamped to whole sentences. */
function leadOf(markup, title) {
  const lead = markup ? stripTitleFromMarkup(markup, title) : null;
  return lead && lead.trim() !== "" ? clampMarkupSentences(lead.trim(), 420) : null;
}

for (const item of news) {
  const own = item.language === "en" ? "en" : "nl";
  const other = own === "en" ? "nl" : "en";
  const translation = newsTranslationFor(item, other);
  const ids = [...new Set([...(item.entities ?? []), ...(item.topics ?? [])])];
  records.push({
    kind: "news",
    ...newsRef(item),
    summaryMarkup: leadOf(item.summaryMarkup, item.title),
    entities: ids.map(newsEntity).filter(Boolean),
    translation: translation
      ? {
          language: other,
          title: translation.title,
          lead: leadOf(translation.lead, translation.title),
        }
      : null,
    source: sourceFor(item.sources),
  });
}

for (const topic of topics) {
  const organizationIds = Array.isArray(topic.organizations) ? topic.organizations : [];
  const orgSet = new Set(organizationIds);
  const topicNews = sortedNews.filter(
    (item) => (item.topics ?? []).includes(topic.id) || (item.entities ?? []).some((id) => orgSet.has(id)),
  );
  records.push({
    kind: "topic",
    id: topic.id,
    name: topic.name,
    href: `/onderwerpen/${topic.slug}/`,
    description: description(topic.description),
    organizations: organizationIds.map(ref).filter(Boolean),
    positions: (Array.isArray(topic.positions) ? topic.positions : []).map(ref).filter(Boolean),
    news: topicNews.slice(0, NEWS_LIMIT).map(newsRef),
    newsCount: topicNews.length,
    source: sourceFor(topic.sources),
  });
}

// The default view: the latest changes and the people most in the news.
let inTheNews = [];
let newsWindowDays = null;
const powerPath = join(WEB_DIR, "public", "power-map.json");
if (existsSync(powerPath)) {
  const power = JSON.parse(readFileSync(powerPath, "utf8"));
  newsWindowDays = typeof power.powerMap?.windowDays === "number" ? power.powerMap.windowDays : null;
  inTheNews = (power.powerMap?.people ?? [])
    .slice()
    .sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0))
    .flatMap((entry) => {
      const person = dataset.peopleById.get(entry.person);
      return person ? [{ ...personRef(person), count: entry.total ?? 0 }] : [];
    })
    .slice(0, PEOPLE_LIMIT);
}
const index = { version: 1, changes: sortedChanges.slice(0, 6).map(changeRef), inTheNews, newsWindowDays };

const shards = new Map();
for (const record of records) {
  const key = panelShard(record.id);
  const shard = shards.get(key) ?? {};
  shard[record.id] = compactValue(record);
  shards.set(key, shard);
}

rmSync(OUT_DIR, { recursive: true, force: true });
mkdirSync(OUT_DIR, { recursive: true });
let bytes = 0;
let largest = 0;
for (let shard = 0; shard < PANEL_SHARDS; shard += 1) {
  const key = String(shard).padStart(3, "0");
  const json = JSON.stringify({ version: 1, records: shards.get(key) ?? {} });
  writeFileSync(join(OUT_DIR, `${key}.json`), json);
  const size = Buffer.byteLength(json, "utf8");
  bytes += size;
  largest = Math.max(largest, size);
}
writeFileSync(join(OUT_DIR, "index.json"), JSON.stringify(compactValue(index)));
console.log(
  `panel index: ${records.length} records in ${PANEL_SHARDS} shards, ${(bytes / 1024).toFixed(1)} KiB total, largest shard ${(largest / 1024).toFixed(1)} KiB`,
);
