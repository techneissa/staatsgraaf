#!/usr/bin/env bun
// Who sits on each Eerste Kamer committee, from the committee's own page on
// eerstekamer.nl ("Leden": every member with their fractie and, for the chair
// and vice-chair, their role). The Tweede Kamer publishes committee seats in
// its OData API; the Eerste Kamer publishes them only on these pages.
//
// Writes, for each committee in data/organizations.json whose id starts with
// org:eerste-kamer-commissie-:
//   - the position pos:lid-<committee> (type commission) where it is missing,
//     shaped like the Tweede Kamer's committee positions; the chair and
//     vice-chair positions already on record are used as they are, and made
//     (type dept_head) only when missing;
//   - a tenure per member and role. The pages give no start date, so `start`
//     is null (ADR 0020). A current tenure that a page no longer lists is
//     closed with `end` set to the retrieval date on which it was first seen
//     missing: the latest date it can have ended, not the day it did.
// Members are matched on the /persoon/<slug> link to the person whose
// Eerste Kamer membership cites that page. A member who cannot be matched is
// reported and skipped, never guessed.
//
//   bun pipelines/ek-commissies.mjs            fetch, then write data/
//   bun pipelines/ek-commissies.mjs --dry-run  fetch and report only
import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const USER_AGENT = "Staatsgraaf/1.0 (+https://staatsgraaf.pages.dev; open data project)";
const THROTTLE_MS = 1000;
const COMMITTEE_PREFIX = "org:eerste-kamer-commissie-";
/** At most this many committee pages may list no members before the run stops. */
const MAX_EMPTY = 3;

const decode = (text) =>
  text
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&([a-z]+);/gi, (entity, name) => ({ amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", euml: "ë", eacute: "é", iuml: "ï", ouml: "ö", uuml: "ü", egrave: "è", auml: "ä" })[name.toLowerCase()] ?? entity);
const text = (html) => decode(html.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();

/**
 * The members on one committee page: the `ul.leden` list, each item a link to
 * /persoon/<slug> with the name, the fractie and an optional role line.
 */
export function parseRoster(html) {
  const list = /<ul class="leden">([\s\S]*?)<\/ul>/.exec(html);
  if (!list) return [];
  const members = [];
  for (const item of list[1].split(/<li class="persoon[^"]*">/).slice(1)) {
    const slug = /href="\/persoon\/([a-z0-9_]+)"/.exec(item)?.[1];
    const caption = /<div class="persoon_bijschrift">([\s\S]*?)<\/div>\s*<\/div>\s*<div class="cell/.exec(item)?.[1] ?? "";
    const name = text(/<div class="naam">([\s\S]*?)<\/div>/.exec(item)?.[1] ?? "");
    if (!slug || !name) continue;
    // The caption holds the name, then one line per fact: the fractie, then the role if any.
    const lines = [...caption.matchAll(/<div>([^<]*)<\/div>/g)].map((match) => text(match[1])).filter(Boolean);
    const fractie = lines[0] ?? null;
    const role = lines.slice(1).find((line) => /voorzitter/i.test(line))?.toLowerCase() ?? null;
    members.push({ slug, name, fractie, role: role === "voorzitter" || role === "ondervoorzitter" ? role : null });
  }
  return members;
}

const suffixOf = (orgId) => orgId.slice("org:".length);
const personSlug = (personId) => personId.slice("person:".length);

/**
 * The records one run writes, from the rosters. Pure: the caller fetches and
 * writes. Returns the new positions and tenures (replacing the old ones for
 * these committees), the source retrieval dates and what could not be matched.
 */
export function planCommittees({ committees, rosters, personBySlug, positions, tenures, retrieved }) {
  const committeeIds = new Set(committees.map((org) => org.id));
  const newPositions = [];
  const newTenures = [];
  const unmatched = [];
  for (const org of committees) {
    const roster = rosters.get(org.id);
    if (!roster) continue;
    const suffix = suffixOf(org.id);
    const source = org.sources.find((entry) => entry.source.startsWith("src:ek-commissie-"))?.source;
    if (!source) continue;
    const sourceRef = { source, retrieved, confidence: "high" };
    // An existing chair's title carries the committee's full name ("... (FIN)"); a new member position follows it.
    const chairTitle = positions.find((entry) => entry.id === `pos:voorzitter-${suffix}`)?.title;
    const committeeName = chairTitle?.startsWith("Voorzitter ") ? chairTitle.slice("Voorzitter ".length) : org.name;
    // Positions already on record are kept as they are; only missing ones are added.
    const position = (kind, title, type, seats) =>
      positions.find((entry) => entry.id === `pos:${kind}-${suffix}`) ?? {
      id: `pos:${kind}-${suffix}`,
      slug: `${kind}-${suffix}`,
      title: `${title} ${committeeName}`,
      organization: org.id,
      type,
      fillMethod: "benoeming-door-college",
      entryModes: ["benoemd"],
      termLengthMonths: null,
      seatsCount: seats,
      exOfficioOf: [],
      sources: [sourceRef, ...org.sources.filter((entry) => entry.source === "src:grondwet")],
      legalBasis: org.legalSource ?? null,
      aliases: [`${title} ${committeeName}`],
    };
    const matched = roster.filter((member) => {
      const person = personBySlug.get(member.slug);
      if (!person) unmatched.push(`${org.id}: ${member.name} (/persoon/${member.slug})`);
      return Boolean(person);
    });
    newPositions.push(position("lid", "Lid", "commission", roster.length));
    for (const role of ["voorzitter", "ondervoorzitter"]) {
      if (roster.some((member) => member.role === role)) newPositions.push(position(role, role === "voorzitter" ? "Voorzitter" : "Ondervoorzitter", "dept_head", 1));
    }
    for (const member of matched) {
      const person = personBySlug.get(member.slug);
      const tenure = (kind) => ({
        id: `tenure:${kind}-${suffix}-${personSlug(person)}`,
        person,
        position: `pos:${kind}-${suffix}`,
        seat: null,
        start: null,
        end: null,
        acting: false,
        entryMode: "benoemd",
        appointedBy: null,
        predecessor: null,
        successor: null,
        endReason: null,
        source: sourceRef,
      });
      newTenures.push(tenure("lid"));
      if (member.role) newTenures.push(tenure(member.role));
    }
  }
  const ownPosition = (id) => positions.find((entry) => entry.id === id)?.organization;
  const isOurs = (positionId) => {
    const organization = ownPosition(positionId) ?? newPositions.find((entry) => entry.id === positionId)?.organization;
    return organization !== undefined && committeeIds.has(organization);
  };
  const fresh = new Set(newTenures.map((tenure) => tenure.id));
  // Kept: every tenure of other positions; ours that ended already; ours no longer listed, closed now.
  const keptTenures = [];
  const closed = [];
  for (const tenure of tenures) {
    if (!isOurs(tenure.position) || fresh.has(tenure.id)) continue;
    if (tenure.end === null) {
      closed.push(tenure.id);
      keptTenures.push({ ...tenure, end: retrieved });
    } else keptTenures.push(tenure);
  }
  const newPositionIds = new Set(newPositions.map((entry) => entry.id));
  // The data files are kept sorted by id.
  const byId = (a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  return {
    positions: [...positions.filter((entry) => !newPositionIds.has(entry.id)), ...newPositions].sort(byId),
    tenures: [...tenures.filter((tenure) => !isOurs(tenure.position)), ...keptTenures, ...newTenures].sort(byId),
    added: newTenures.length,
    closed,
    unmatched,
  };
}

async function readJson(file) {
  return JSON.parse(await readFile(join(REPO_ROOT, file), "utf8"));
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const retrieved = new Date().toISOString().slice(0, 10);
  const [organizations, positions, tenures, memberships, sources] = await Promise.all(
    ["organizations", "positions", "tenures", "memberships", "sources"].map((name) => readJson(`data/${name}.json`)),
  );
  // /persoon/<slug> to person id, through the source each Eerste Kamer membership cites.
  const urlOf = new Map(sources.map((source) => [source.id, source.url]));
  const personBySlug = new Map();
  for (const membership of memberships) {
    if (membership.organization !== "org:eerste-kamer" || membership.end !== null) continue;
    const slug = /\/persoon\/([a-z0-9_]+)/.exec(urlOf.get(membership.source.source) ?? "")?.[1];
    if (slug) personBySlug.set(slug, membership.person);
  }
  const committees = organizations.filter((org) => org.id.startsWith(COMMITTEE_PREFIX) && org.website);
  const rosters = new Map();
  const empty = [];
  for (const org of committees) {
    const response = await fetch(org.website, { headers: { "user-agent": USER_AGENT } });
    if (!response.ok) throw new Error(`${org.website}: HTTP ${response.status}`);
    const roster = parseRoster(await response.text());
    // Some committees have no standing roster (the credentials committee is formed per new member);
    // they are skipped and keep their tenures as they are.
    if (roster.length > 0) rosters.set(org.id, roster);
    else empty.push(org.id);
    await new Promise((resolve) => setTimeout(resolve, THROTTLE_MS));
  }
  // Many empty pages mean the layout changed: stop rather than write a partial picture.
  if (empty.length > MAX_EMPTY) throw new Error(`${empty.length} committee pages list no members; the page layout may have changed. Nothing written.`);
  const plan = planCommittees({ committees, rosters, personBySlug, positions, tenures, retrieved });
  console.log(`ek-commissies: ${committees.length} committees (${empty.length} without a roster: ${empty.join(", ") || "none"}), ${plan.added} current tenures, ${plan.closed.length} closed, ${plan.unmatched.length} unmatched`);
  for (const line of plan.unmatched) console.log(`  unmatched: ${line}`);
  if (dryRun) return;
  const citedSources = new Set(committees.flatMap((org) => org.sources.map((entry) => entry.source)).filter((id) => id.startsWith("src:ek-commissie-")));
  const nextSources = sources.map((source) => (citedSources.has(source.id) ? { ...source, retrieved } : source));
  const write = (name, value) => writeFile(join(REPO_ROOT, `data/${name}.json`), `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await Promise.all([write("positions", plan.positions), write("tenures", plan.tenures), write("sources", nextSources)]);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
