import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { GRAPH_LAYOUT, GRAPH_SCHEMA, toWireNode } from "../lib/graph.ts";
import { computeLayout } from "../lib/graph-layout.ts";
import { isSplinterGroup, partyByDataset } from "../lib/parties.ts";

const DATA_DIR = fileURLToPath(new URL("../../data/", import.meta.url));
const WINDOW_DAYS = 90;
const OUT_DIR = fileURLToPath(new URL("../public/", import.meta.url));
const OUT_FILE = fileURLToPath(new URL("../public/graph.json", import.meta.url));
const POWER_FILE = fileURLToPath(new URL("../public/power-map.json", import.meta.url));

function readJson(name) {
  return JSON.parse(readFileSync(`${DATA_DIR}${name}`, "utf8"));
}

function readArray(name) {
  const value = readJson(name);
  return Array.isArray(value) ? value : [];
}

function isOrgId(id) {
  return typeof id === "string" && id.startsWith("org:");
}

function compareNames(a, b) {
  if (a.id !== b.id) return a.id < b.id ? -1 : 1;
  return 0;
}

function dayNumber(iso) {
  if (!iso) return null;
  const time = Date.parse(iso.length <= 10 ? `${iso}T00:00:00Z` : iso);
  return Number.isNaN(time) ? null : Math.floor(time / 86400000);
}

const organizations = readArray("organizations.json");
const memberships = readArray("memberships.json");
const people = readArray("people.json");
const positions = readArray("positions.json");
const tenures = readArray("tenures.json");
const relations = readArray("relations.json");
const news = readArray("news.json");
const media = readArray("media.json");
const meta = readJson("meta.json");

const orgIds = new Set(organizations.map((org) => org.id));
const peopleById = new Map(people.map((person) => [person.id, person]));
const positionsById = new Map(positions.map((position) => [position.id, position]));
const mediaById = new Map(media.map((item) => [item.id, item]));

const degree = new Map();
const edges = [];

for (const relation of relations) {
  if (!isOrgId(relation.from) || !isOrgId(relation.to)) continue;
  if (!orgIds.has(relation.from) || !orgIds.has(relation.to)) continue;
  // Every organization-to-organization relation type is emitted; the legend
  // decides what is drawn. Dates travel with the edge only when the data has them.
  const edge = { from: relation.from, to: relation.to, type: relation.type };
  if (relation.validFrom) edge.validFrom = relation.validFrom;
  if (relation.validTo) edge.validTo = relation.validTo;
  edges.push(edge);
  degree.set(relation.from, (degree.get(relation.from) ?? 0) + 1);
  degree.set(relation.to, (degree.get(relation.to) ?? 0) + 1);
}

edges.sort(compareNames);

const nodes = organizations
  .map((org) => ({
    id: org.id,
    slug: org.slug,
    name: org.name,
    type: org.type,
    subtype: org.subtype,
    branch: org.branch,
    level: org.level,
    degree: degree.get(org.id) ?? 0,
    parent: org.parent ?? null,
  }))
  .sort(compareNames);

const hubOrg =
  organizations.find((org) => org.type === "constituency") ??
  organizations.find((org) => org.id === "org:kiesgerechtigden-nederland") ??
  null;

const snapshot = typeof meta.snapshotId === "string" ? meta.snapshotId : null;
const generatedAt = typeof meta.generatedAt === "string" ? meta.generatedAt : null;

function buildPowerMap() {
  const windowDays = 90;
  const snapshotDay = dayNumber(snapshot);
  const sinceDay = snapshotDay === null ? null : snapshotDay - windowDays;
  const since = sinceDay === null ? null : new Date(sinceDay * 86400000).toISOString().slice(0, 10);

  if (news.length === 0) {
    return {
      windowDays,
      since,
      computedAt: generatedAt,
      articleCount: 0,
      sources: [],
      people: [],
    };
  }

  const currentTenure = new Map();
  for (const tenure of tenures) {
    if (tenure.end !== null) continue;
    if (!currentTenure.has(tenure.person)) currentTenure.set(tenure.person, tenure);
  }

  const counts = new Map();
  const weeks = new Map();
  const latest = new Map();
  const publishers = new Set();
  let articleCount = 0;

  for (const item of news) {
    const day = dayNumber(item.published);
    if (day === null || sinceDay === null || day < sinceDay) continue;
    if (snapshotDay !== null && day > snapshotDay) continue;
    articleCount += 1;
    if (item.publisher) publishers.add(item.publisher);
    const week = Math.min(11, Math.max(0, Math.floor((day - sinceDay) / 7)));

    for (const entity of item.entities ?? []) {
      if (!isOrgId(entity) && !entity.startsWith("person:")) continue;
      if (!entity.startsWith("person:")) continue;
      counts.set(entity, (counts.get(entity) ?? 0) + 1);
      const list = weeks.get(entity) ?? new Array(12).fill(0);
      list[week] += 1;
      weeks.set(entity, list);
      const previous = latest.get(entity);
      if (!previous || (item.published && item.published > previous.published)) {
        latest.set(entity, {
          published: item.published,
          date: item.published ? item.published.slice(0, 10) : null,
          headline: item.title ?? null,
          source: item.publisher ?? null,
          url: item.url ?? null,
        });
      }
    }
  }

  const ranked = [...counts.entries()]
    .map(([personId, total]) => {
      const person = peopleById.get(personId);
      if (!person) return null;
      const tenure = currentTenure.get(personId) ?? null;
      const position = tenure ? positionsById.get(tenure.position) ?? null : null;
      const portraitId = person.portrait;
      const imageItem = portraitId ? mediaById.get(portraitId) : null;
      const weekList = weeks.get(personId) ?? new Array(12).fill(0);
      const recent = weekList[10] + weekList[11];
      const last = latest.get(personId) ?? null;
      return {
        person: personId,
        slug: person.slug,
        name: person.name,
        job: position?.title ?? null,
        position: position?.id ?? null,
        party: person.party ?? null,
        node: position?.organization ?? null,
        image: imageItem?.url ?? null,
        total,
        recent,
        weeks: weekList,
        latest: {
          date: last?.date ?? null,
          headline: last?.headline ?? null,
          source: last?.source ?? null,
          url: last?.url ?? null,
        },
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.total - a.total || b.recent - a.recent || (a.name < b.name ? -1 : 1))
    .map((entry, index) => ({ ...entry, rank: index + 1, heat: entry.total + entry.recent }));

  return {
    windowDays,
    since,
    computedAt: generatedAt,
    articleCount,
    sources: [...publishers].sort(),
    people: ranked,
  };
}

function buildEntityPowerMap(entityLimit = 8) {
  const snapshotDay = dayNumber(snapshot);
  const sinceDay = snapshotDay === null ? null : snapshotDay - WINDOW_DAYS;
  if (news.length === 0 || sinceDay === null) return { map: {}, personSlugs: {} };

  const currentTenure = new Map();
  for (const tenure of tenures) {
    if (tenure.end !== null) continue;
    if (!currentTenure.has(tenure.person)) currentTenure.set(tenure.person, tenure);
  }

  const perEntity = new Map();
  const personSlugs = {};
  for (const item of news) {
    const day = dayNumber(item.published);
    if (day === null || day < sinceDay) continue;
    if (snapshotDay !== null && day > snapshotDay) continue;
    const entities = Array.isArray(item.entities) ? item.entities : [];
    const personIds = entities.filter(
      (entity) => typeof entity === "string" && entity.startsWith("person:") && peopleById.has(entity),
    );
    if (personIds.length === 0) continue;
    for (const entity of entities) {
      if (typeof entity !== "string") continue;
      if (!isOrgId(entity) && !entity.startsWith("person:") && !entity.startsWith("pos:")) continue;
      let tally = perEntity.get(entity);
      if (!tally) {
        tally = { counts: new Map(), latest: new Map(), weeks: new Map() };
        perEntity.set(entity, tally);
      }
      for (const personId of personIds) {
        tally.counts.set(personId, (tally.counts.get(personId) ?? 0) + 1);
        const previous = tally.latest.get(personId);
        if (!previous || (item.published && item.published > previous.published)) {
          tally.latest.set(personId, item.published ?? null);
        }
        const list = tally.weeks.get(personId) ?? new Array(2).fill(0);
        const week = Math.min(1, Math.max(0, Math.floor((day - (snapshotDay - 14)) / 7)));
        list[week] += 1;
        tally.weeks.set(personId, list);
      }
    }
  }

  const map = {};
  for (const [entity, tally] of perEntity) {
    const ranked = [...tally.counts.entries()]
      .map(([personId, total]) => {
        const person = peopleById.get(personId);
        if (!person) return null;
        const slug = person.slug;
        personSlugs[slug] = personId;
        const tenure = currentTenure.get(personId) ?? null;
        const position = tenure ? positionsById.get(tenure.position) ?? null : null;
        const portraitId = person.portrait;
        const imageItem = portraitId ? mediaById.get(portraitId) : null;
        const weekList = tally.weeks.get(personId) ?? [0, 0];
        const latest = tally.latest.get(personId) ?? null;
        return {
          person: personId,
          slug,
          name: person.name,
          job: position?.title ?? null,
          party: person.party ?? null,
          image: imageItem?.url ?? null,
          total,
          recent: weekList[1] ?? 0,
          latest: {
            date: latest ? latest.slice(0, 10) : null,
            headline: null,
            source: null,
          },
        };
      })
      .filter(Boolean)
      .sort((a, b) => b.total - a.total || b.recent - a.recent || (a.name < b.name ? -1 : 1))
      .slice(0, entityLimit);
    if (ranked.length > 0) map[entity] = ranked;
  }
  return { map, personSlugs };
}

const { map: entityPowerMap, personSlugs } = buildEntityPowerMap();

/**
 * Seat blocks per chamber from current memberships and the sourced party
 * registry, so the canvas can draw the ∩ arches without loading the dataset.
 * Blocks are sorted largest first, then by label, which is the H6 seat order.
 */
function buildChambers() {
  const chambers = {};
  const byOrg = new Map();
  for (const membership of memberships) {
    if (membership.end !== null) continue;
    if (!isOrgId(membership.organization) || !orgIds.has(membership.organization)) continue;
    const list = byOrg.get(membership.organization) ?? [];
    list.push(membership);
    byOrg.set(membership.organization, list);
  }
  for (const [orgId, list] of byOrg) {
    const grouped = new Map();
    for (const membership of list) {
      const fractie = typeof membership.fractie === "string" ? membership.fractie : null;
      const party = fractie !== null ? partyByDataset(fractie) : null;
      const key = party?.key ?? fractie ?? "__none__";
      const entry = grouped.get(key) ?? {
        key: party?.key ?? null,
        label: party?.abbrev ?? fractie ?? "",
        color: party?.color ?? null,
        splinter: fractie !== null && isSplinterGroup(fractie),
        seats: 0,
      };
      entry.seats += 1;
      grouped.set(key, entry);
    }
    const entries = [...grouped.values()].sort((a, b) => b.seats - a.seats || (a.label < b.label ? -1 : a.label > b.label ? 1 : 0));
    chambers[orgId] = { total: list.length, majority: Math.floor(list.length / 2) + 1, entries };
  }
  return chambers;
}

const hub = hubOrg ? { id: hubOrg.id, slug: hubOrg.slug, name: hubOrg.name } : null;

// The layout is computed here, once, and shipped. The client hydrates it and
// never runs the packer (docs/13-graph-rebuild-plan.md, phase 2).
const layout = computeLayout({ hub, nodes, edges });
const hubNode = hub ? nodes.find((node) => node.id === hub.id) : null;
const laidOutNodes = layout.nodes.map(toWireNode);
if (hubNode) {
  // The electorate is the frame, not a mark. It stays in the node list with a
  // placeholder position so lists and slug lookups still find it.
  laidOutNodes.push({
    ...hubNode,
    x: 0,
    y: 0,
    angle: 0,
    radius: layout.frameRadius,
    tier: "kern",
    sector: "frame",
    hidden: true,
  });
}
laidOutNodes.sort(compareNames);

const bundle = {
  schema: GRAPH_SCHEMA,
  scope: "nl-rijk",
  snapshot,
  layout: GRAPH_LAYOUT,
  hub,
  nodes: laidOutNodes,
  edges,
  clusters: layout.clusters.map((cluster) => ({
    id: cluster.id,
    sector: cluster.sector,
    kind: cluster.kind,
    parent: cluster.parent,
    ...(cluster.subtype ? { subtype: cluster.subtype } : {}),
    angle: cluster.angle,
    radius: cluster.radius,
    rows: cluster.rows,
    cols: cluster.cols,
  })),
  chambers: buildChambers(),
  tiers: layout.tiers,
  channels: layout.channels,
  coreRadius: layout.coreRadius,
  frameRadius: layout.frameRadius,
  maxRadius: layout.maxRadius,
  viewBox: layout.viewBox,
};

const powerBundle = {
  schema: GRAPH_SCHEMA,
  snapshot,
  powerMap: buildPowerMap(),
  entityPowerMap,
  personSlugs,
};

mkdirSync(OUT_DIR, { recursive: true });
const json = JSON.stringify(bundle);
writeFileSync(OUT_FILE, json);
const powerJson = JSON.stringify(powerBundle);
writeFileSync(POWER_FILE, powerJson);

const bytes = Buffer.byteLength(json, "utf8");
const powerBytes = Buffer.byteLength(powerJson, "utf8");
console.log(
  `graph.json: ${laidOutNodes.length} nodes, ${edges.length} edges, ${layout.tiers.length} tiers, ` +
    `${bytes} bytes, ${(bytes / 1024).toFixed(1)} KiB`,
);
console.log(
  `power-map.json: ${powerBytes} bytes, ${(powerBytes / 1024).toFixed(1)} KiB, ` +
    `people ${powerBundle.powerMap.people.length}, entity power maps ${Object.keys(entityPowerMap).length}, ` +
    `sources ${powerBundle.powerMap.sources.length}, articles ${powerBundle.powerMap.articleCount}`,
);
