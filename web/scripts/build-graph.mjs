import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { GRAPH_LAYOUT, GRAPH_SCHEMA, toWireNode } from "../lib/graph.ts";
import { computeLayout } from "../lib/graph-layout.ts";
import { isSplinterGroup, partyByDataset } from "../lib/parties.ts";
import { seatOrder } from "../lib/seats.ts";
import { isCabinetPost, newsReferenceDate, scoreConnections } from "../lib/power-connections.ts";
import { buildHierarchy } from "../lib/hierarchy.ts";

const DATA_DIR = fileURLToPath(new URL("../../data/", import.meta.url));
const WINDOW_DAYS = 90;
const OUT_DIR = fileURLToPath(new URL("../public/", import.meta.url));
const OUT_FILE = fileURLToPath(new URL("../public/graph.json", import.meta.url));
const POWER_FILE = fileURLToPath(new URL("../public/power-map.json", import.meta.url));
const HIERARCHY_FILE = fileURLToPath(new URL("../public/hierarchy.json", import.meta.url));

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
const newsTranslations = readArray("news-translations.json");
const coalitions = readArray("coalitions.json");
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
/**
 * The power map's reference date: the newest news item, so the window and the
 * recency weights reach the latest story even when the dataset snapshot in
 * meta.json is older than the news refresh. The snapshot is the fallback only
 * without news.
 */
const newsAsOf = newsReferenceDate(news, snapshot);
const generatedAt = typeof meta.generatedAt === "string" ? meta.generatedAt : null;

function buildPowerMap() {
  const windowDays = WINDOW_DAYS;
  const snapshotDay = dayNumber(newsAsOf);
  const sinceDay = snapshotDay === null ? null : snapshotDay - windowDays;
  const since = sinceDay === null ? null : new Date(sinceDay * 86400000).toISOString().slice(0, 10);

  if (news.length === 0) {
    return {
      windowDays,
      since,
      computedAt: generatedAt,
      asOf: newsAsOf,
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
    asOf: newsAsOf,
    articleCount,
    sources: [...publishers].sort(),
    people: ranked,
  };
}

/**
 * What the power map needs beyond the ranking: the news items that name the
 * people in it (the bubbles), the connections between people and bodies
 * (lib/power-connections.ts, every tie with its reason and evidence ids), and
 * the names behind every id it mentions. Kept small on purpose: only items
 * that name a ranked person, only the strongest ties per anchor, and only the
 * people and bodies those reference.
 */
function buildPowerExtras(ranked) {
  const snapshotDay = dayNumber(newsAsOf);
  const sinceDay = snapshotDay === null ? null : snapshotDay - WINDOW_DAYS;
  const empty = { people: {}, bodies: {}, news: [], links: [], kabinet: null };
  if (news.length === 0 || snapshotDay === null || sinceDay === null) return empty;

  const rankedIds = new Set(ranked.map((entry) => entry.person));
  const inWindow = news.filter((item) => {
    const day = dayNumber(item.published);
    return day !== null && day >= sinceDay && day <= snapshotDay;
  });
  const titleEn = new Map(
    newsTranslations
      .filter((entry) => entry.language === "en" && typeof entry.title === "string")
      .map((entry) => [entry.id, entry.title]),
  );

  // The bubbles: items in the window that name a ranked person.
  const bubbles = [];
  const anchors = new Set(rankedIds);
  for (const item of inWindow) {
    const entities = Array.isArray(item.entities) ? item.entities : [];
    const people = entities.filter((id) => typeof id === "string" && peopleById.has(id));
    if (!people.some((id) => rankedIds.has(id))) continue;
    const bodies = entities.filter((id) => typeof id === "string" && orgIds.has(id));
    for (const id of bodies) anchors.add(id);
    const bubble = {
      id: item.id,
      title: item.title ?? "",
      publisher: item.publisher ?? null,
      date: item.published ? item.published.slice(0, 10) : null,
      url: item.url ?? null,
      people: [...new Set(people)],
      bodies: [...new Set(bodies)],
    };
    const en = titleEn.get(item.id);
    if (en && en !== bubble.title) bubble.titleEn = en;
    bubbles.push(bubble);
  }
  bubbles.sort((a, b) => (a.date === b.date ? (a.id < b.id ? -1 : 1) : (b.date ?? "") < (a.date ?? "") ? -1 : 1));

  const positionsMap = new Map(
    positions.map((position) => [position.id, { organization: position.organization, title: position.title, type: position.type }]),
  );
  // The sitting cabinet is always on the connections view, in the news or not,
  // so every minister and staatssecretaris can be focused with their ties.
  for (const tenure of tenures) {
    if (tenure.end !== null) continue;
    const position = positionsMap.get(tenure.position);
    if (position && isCabinetPost(position) && peopleById.has(tenure.person)) anchors.add(tenure.person);
  }
  const prominence = new Map(ranked.map((entry) => [entry.person, entry.total]));
  const links = scoreConnections({
    anchors,
    news: inWindow.map((item) => ({ id: item.id, published: item.published ?? null, entities: item.entities ?? [] })),
    memberships,
    tenures,
    positions: positionsMap,
    asOf: newsAsOf,
    prominence,
  });

  // Names behind every id the bundle mentions.
  const currentTenure = new Map();
  for (const tenure of tenures) {
    if (tenure.end !== null) continue;
    if (!currentTenure.has(tenure.person)) currentTenure.set(tenure.person, tenure);
  }
  const personIds = new Set(rankedIds);
  const bodyIds = new Set();
  const note = (id) => {
    if (peopleById.has(id)) personIds.add(id);
    else if (orgIds.has(id)) bodyIds.add(id);
  };
  for (const bubble of bubbles) {
    bubble.people.forEach(note);
    bubble.bodies.forEach(note);
  }
  for (const link of links) {
    note(link.a);
    note(link.b);
    for (const id of link.orgs ?? []) note(id);
  }
  const people = {};
  for (const id of [...personIds].sort()) {
    const person = peopleById.get(id);
    const tenure = currentTenure.get(id) ?? null;
    const position = tenure ? positionsById.get(tenure.position) ?? null : null;
    people[id] = {
      name: person.name,
      slug: person.slug,
      job: position?.title ?? null,
      party: person.party ?? null,
      image: portraitOf(person),
    };
  }
  const orgById = new Map(organizations.map((org) => [org.id, org]));
  const bodies = {};
  for (const id of [...bodyIds].sort()) {
    const org = orgById.get(id);
    bodies[id] = { name: org.name, slug: org.slug, branch: org.branch };
  }

  const current = coalitions.find((coalition) => coalition.end === null && coalition.government === "org:regering") ?? null;
  const kabinet = current ? { id: current.id, name: current.name, start: current.start } : null;
  return { people, bodies, news: bubbles, links, kabinet };
}

/** A local portrait URL for a person, or null. */
function portraitOf(person) {
  const item = person?.portrait ? mediaById.get(person.portrait) : null;
  return item?.url ?? null;
}

/**
 * Seat blocks per chamber from current memberships and the sourced party
 * registry, so the canvas can draw the ∩ arches without loading the dataset.
 * Blocks are sorted largest first, then by label, which is the H6 seat order.
 *
 * Each block carries its members in seat order. Named gap (workstream S):
 * neither chamber publishes a seat per member, `seatNumber` is null on every
 * membership, so a member gets one of their fractie's seats in the stable
 * order of lib/seats.ts (by surname), never a real chair.
 */
function buildChambers() {
  const chambers = {};
  const seatPeople = {};
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
        people: [],
      };
      entry.seats += 1;
      const person = peopleById.get(membership.person);
      entry.people.push({ id: membership.person, name: person?.name ?? membership.person });
      if (person) seatPeople[person.id] = { name: person.name, slug: person.slug, image: portraitOf(person) };
      grouped.set(key, entry);
    }
    const entries = [...grouped.values()]
      .sort((a, b) => b.seats - a.seats || (a.label < b.label ? -1 : a.label > b.label ? 1 : 0))
      .map(({ people: members, ...entry }) => ({ ...entry, members: seatOrder(members).map((member) => member.id) }));
    chambers[orgId] = { total: list.length, majority: Math.floor(list.length / 2) + 1, entries };
  }
  const sortedPeople = Object.fromEntries(Object.keys(seatPeople).sort().map((id) => [id, seatPeople[id]]));
  return { chambers, seatPeople: sortedPeople };
}

/**
 * An abbreviation per organisation for the wheel form of the graph: the
 * shortest alias of at most eight characters without spaces that has a
 * capital (BZK, IGJ, CPB), where the dataset records one.
 */
function buildShortNames() {
  const out = {};
  for (const org of [...organizations].sort((a, b) => (a.id < b.id ? -1 : 1))) {
    const pick = (org.aliases ?? [])
      .filter((alias) => typeof alias === "string" && alias.length <= 8 && !/\s/.test(alias) && /[A-Z]/.test(alias))
      .sort((a, b) => a.length - b.length || (a < b ? -1 : 1))[0];
    if (pick) out[org.id] = pick;
  }
  return out;
}

const hub = hubOrg ? { id: hubOrg.id, slug: hubOrg.slug, name: hubOrg.name } : null;

// The layout is computed here, once, and shipped. The client hydrates it and
// never runs the packer (docs/13-graph-rebuild-plan.md, phase 2).
const { chambers, seatPeople } = buildChambers();
const layout = computeLayout({ hub, nodes, edges, chambers });
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
  chambers,
  seatPeople,
  shortNames: buildShortNames(),
  tiers: layout.tiers,
  channels: layout.channels,
  coreRadius: layout.coreRadius,
  frameRadius: layout.frameRadius,
  maxRadius: layout.maxRadius,
  viewBox: layout.viewBox,
};

const powerMap = buildPowerMap();
const powerBundle = {
  schema: GRAPH_SCHEMA,
  snapshot,
  powerMap,
  ...buildPowerExtras(powerMap.people),
};

mkdirSync(OUT_DIR, { recursive: true });
const powerJson = JSON.stringify(powerBundle);
writeFileSync(POWER_FILE, powerJson);

// The hierarchy form of the connections view (lib/hierarchy.ts): cabinet and
// chambers from current tenures and memberships, loaded only when shown.
const hierarchy = buildHierarchy({
  snapshot,
  organizations,
  people,
  positions,
  tenures,
  memberships,
  coalitions,
  sources: readArray("sources.json"),
  portraitOf: (id) => portraitOf(peopleById.get(id)),
  partyOf: (name) => partyByDataset(name),
  seatOrder,
  plans: readArray("chamber-plans.json"),
});
// The chambers' halls, compact, for the wheel form of the graph: seat
// positions in seat pitches as the sourced floor plans lay them out
// (lib/chamber-hall.ts) and the fractie colour of each seat.
bundle.chamberShapes = Object.fromEntries(
  hierarchy.trees
    .filter((tree) => tree.hall)
    .map((tree) => {
      const colorOf = new Map(tree.hubs.map((hub) => [hub.id, hub.color ?? null]));
      const colors = [...new Set(tree.hall.seats.map((seat) => colorOf.get(seat.hub) ?? null))];
      return [
        tree.org,
        {
          width: tree.hall.width,
          height: tree.hall.height,
          r: tree.hall.r,
          colors,
          seats: tree.hall.seats.map((seat) => [seat.x, seat.y, colors.indexOf(colorOf.get(seat.hub) ?? null), seat.chair ? 1 : 0]),
          // Who sits in each seat, in the same order, so the wheel can pick a member by their seat.
          people: tree.hall.seats.map((seat) => seat.person ?? null),
          // The chair at the desk (Tweede Kamer) and the kabinet bench, as the floor plan places them.
          chair: tree.hall.chair ? [tree.hall.chair.x, tree.hall.chair.y, tree.hall.chair.r, tree.hall.chair.person ?? null] : null,
          bench: { r: tree.hall.cabinet.r, seats: tree.hall.cabinet.seats.map((seat) => [seat.x, seat.y, seat.person]) },
        },
      ];
    }),
);
// Each person in a hall's current posts outside that chamber (a commissie
// seat, a commissie chair, a post such as burgemeester or minister), from
// tenures.json, so the wheel draws a picked person's ties from their own
// seat. A commission position is a seat on that body; every other position is
// a post there. The people on the bench and at the chair's desk who are not
// seated members get their name and portrait in `hallPeople`.
{
  const seatedIn = new Map();
  const hallPeople = {};
  for (const tree of hierarchy.trees) {
    if (!tree.hall) continue;
    for (const seat of tree.hall.seats) if (seat.person) seatedIn.set(seat.person, tree.org);
    const others = [...tree.hall.cabinet.seats.map((seat) => seat.person), tree.hall.chair?.person].filter(Boolean);
    for (const id of others) {
      if (!seatedIn.has(id)) seatedIn.set(id, tree.org);
      const person = peopleById.get(id);
      if (person && !seatPeople[id]) hallPeople[id] = { name: person.name, slug: person.slug, image: portraitOf(person) };
    }
  }
  bundle.hallPeople = Object.fromEntries(Object.keys(hallPeople).sort().map((id) => [id, hallPeople[id]]));
  const seatTies = {};
  for (const tenure of tenures) {
    if (tenure.end !== null || !seatedIn.has(tenure.person)) continue;
    const position = positionsById.get(tenure.position);
    if (!position?.organization || position.organization === seatedIn.get(tenure.person)) continue;
    const kind = position.type === "commission" ? "member" : "post";
    const ties = (seatTies[tenure.person] ??= []);
    const same = ties.find(([organization]) => organization === position.organization);
    // A chair of a commissie is also a member of it: the post wins.
    if (same) same[1] = same[1] === "post" || kind === "post" ? "post" : "member";
    else ties.push([position.organization, kind]);
  }
  for (const ties of Object.values(seatTies)) ties.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  bundle.seatTies = Object.fromEntries(Object.entries(seatTies).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));
}
const json = JSON.stringify(bundle);
writeFileSync(OUT_FILE, json);

const hierarchyJson = JSON.stringify(hierarchy);
writeFileSync(HIERARCHY_FILE, hierarchyJson);

const bytes = Buffer.byteLength(json, "utf8");
const powerBytes = Buffer.byteLength(powerJson, "utf8");
console.log(
  `graph.json: ${laidOutNodes.length} nodes, ${edges.length} edges, ${layout.tiers.length} tiers, ` +
    `${bytes} bytes, ${(bytes / 1024).toFixed(1)} KiB`,
);
console.log(
  `power-map.json: ${powerBytes} bytes, ${(powerBytes / 1024).toFixed(1)} KiB, ` +
    `ranked ${powerBundle.powerMap.people.length}, people ${Object.keys(powerBundle.people).length}, ` +
    `bodies ${Object.keys(powerBundle.bodies).length}, news ${powerBundle.news.length}, links ${powerBundle.links.length}, ` +
    `sources ${powerBundle.powerMap.sources.length}, articles ${powerBundle.powerMap.articleCount}`,
);
console.log(
  `hierarchy.json: ${Buffer.byteLength(hierarchyJson, "utf8")} bytes, ` +
    hierarchy.trees
      .map((tree) => `${tree.id} ${tree.hubs.length} hubs${tree.hall ? `, hall ${tree.hall.seats.length} seats (${tree.hall.basis})` : ""}`)
      .join(", ") +
    `, sources ${hierarchy.sources.length}`,
);
