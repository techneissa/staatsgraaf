import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { runLive } from "./live.mjs";
import { hashPage } from "./ek-live.mjs";
import { emptyState, serializeState } from "./live-state.mjs";
import { makeWorld } from "./fixtures/decentral/world.mjs";

const NOW = new Date("2026-10-06T10:00:00Z");
const BOUNDS = { gemeenten: [3, 400], provincies: [2, 2], waterschappen: [1, 30] };

function live(name) {
  return readFileSync(new URL(`./fixtures/live/${name}`, import.meta.url), "utf8");
}

function spec() {
  return {
    gemeenten: [
      { code: "gm0001", name: "Alpha", seats: 21, holder: "Anna Alpha", burgemeester: { name: "Mw. A. Alpha" }, start: "1998-01-01" },
      { code: "gm0002", name: "Beta", province: "pv25", seats: 23, holder: "Ben Beta", burgemeester: { name: "Dhr. Q.D. Zeta" } },
      { code: "gm0003", name: "Gamma", seats: 25, datasetSeats: 23, holder: "Carl Gamma", burgemeester: { name: "Dhr. C. Gamma" } },
    ],
    waterschappen: [{ code: "ws0001", name: "Aa en Maas", holder: "Mario Jacobs", heads: [{ name: "M.J.J. Jacobs" }] }],
    provincies: [
      { code: "pv22", name: "Drenthe", holder: "Jetta Klijnsma", start: "2022-05-01" },
      { code: "pv25", name: "Gelderland", holder: "John Berends", start: "2020-01-01" },
    ],
  };
}

function cvdkHtml(rows) {
  return `<main><table><tbody><tr><th>Naam</th></tr>${rows.map(([name, province, start]) => `<tr><td>${name} (-)</td><td>${province}</td><td>${start.split("-").reverse().join("-")}</td><td>01-01-1970</td></tr>`).join("")}</tbody></table></main>`;
}

async function makeRoot(world, { state = null } = {}) {
  const root = await mkdtemp(join(tmpdir(), "live-decentral-"));
  await mkdir(join(root, "data"), { recursive: true });
  await mkdir(join(root, "research"), { recursive: true });
  for (const [name, value] of Object.entries(world.dataset)) await writeFile(join(root, "data", `${name}.json`), `${JSON.stringify(value, null, 2)}\n`);
  await writeFile(join(root, "data", "meta.json"), `${JSON.stringify({ datasetVersion: "v1", snapshotId: "2026-09-19" })}\n`);
  const fresh = emptyState();
  const recent = "2026-10-06T09:30:00.000Z";
  fresh.tk = { ...fresh.tk, cursors: { fzp: "a", fractie: "b", vacature: "c", presidium: "d" }, presidiumId: "pres", lastFullRun: recent };
  fresh.ek = { ...fresh.ek, hashes: { fracties: await hashPage(live("ek-fracties.html")), mutaties: await hashPage(live("ek-personele-mutaties.html")) }, lastFullRun: recent };
  fresh.bewindspersonen = { cabinetSlug: "kabinet-jetten", slugsHash: null, lastRun: recent };
  fresh.news = { lastRun: recent, sitemapLastmod: null };
  fresh.electionDates = { lastRun: recent, items: [], gaps: [] };
  await writeFile(join(root, "research", "P-live-state.json"), serializeState(state ?? fresh));
  return root;
}

function router(world, { cvdk, failRegister = false, dropCbsRow = false } = {}) {
  const requested = [];
  const fetchImpl = async (input) => {
    const url = decodeURIComponent(String(input));
    requested.push(url);
    const json = (body) => new Response(JSON.stringify(body), { status: 200 });
    if (url.includes("tweedekamer.nl")) return url.includes("$count=true") ? json({ "@odata.count": 0, value: [] }) : json({ value: [] });
    if (url.endsWith("eerstekamer.nl/fracties")) return new Response(live("ek-fracties.html"), { status: 200 });
    if (url.endsWith("/personele_mutaties")) return new Response(live("ek-personele-mutaties.html"), { status: 200 });
    if (url.includes("identifier.overheid.nl/tooi/id/gemeente")) return json(world.tooi.gemeente);
    if (url.includes("identifier.overheid.nl/tooi/id/waterschap")) return json(world.tooi.waterschap);
    if (url.includes("identifier.overheid.nl/tooi/id/provincie")) return json(world.tooi.provincie);
    if (url.includes("organisaties.overheid.nl/")) {
      if (failRegister) return new Response("kapot", { status: 500 });
      const path = url.split("organisaties.overheid.nl/")[1];
      if (world.files[path] !== undefined) return new Response(world.files[path], { status: 200 });
    }
    if (url.includes("ODataCatalog/Tables")) return json(world.catalog);
    if (url.includes("86247NED/TypedDataSet")) return json(dropCbsRow ? { value: world.cbsTyped.value.slice(1) } : world.cbsTyped);
    if (url.includes("commissaris-van-de-koning/overzicht")) return new Response(cvdkHtml(cvdk), { status: 200 });
    return new Response("niet gevonden", { status: 404 });
  };
  return { fetchImpl, requested };
}

const CVDK_SAME = [["mw. drs. J. Klijnsma", "Drenthe", "2022-05-01"], ["drs. J. Berends", "Gelderland", "2020-01-01"]];

async function run(root, world, options = {}, extra = {}) {
  const { fetchImpl, requested } = router(world, options);
  const result = await runLive({ root, now: extra.now ?? NOW, fetchImpl, minIntervalMs: 0, validate: false, skipSitemap: true, log: () => {}, decentral: { bounds: BOUNDS }, ...extra, });
  return { ...result, requested };
}

const read = async (root, relative) => JSON.parse(await readFile(join(root, relative), "utf8"));

test("a first run reads the four decentral sources, applies what they say, and records codes and dates in the state", async () => {
  const world = makeWorld(spec());
  const root = await makeRoot(world);
  const result = await run(root, world, { cvdk: CVDK_SAME });
  assert.equal(result.exitCode, 0, JSON.stringify([result.summary.gaps, result.summary.stoppedByGuard]));
  assert.equal(result.summary.outcome, "updated");
  for (const key of ["gemeenten", "provincies", "waterschappen", "commissarissen"]) assert.equal(result.summary.sources[key].stopped, false, key);
  const tenures = await read(root, "data/tenures.json");
  const beta = tenures.filter((tenure) => tenure.position === "pos:burgemeester-beta");
  assert.equal(beta.length, 2);
  assert.equal(beta.find((tenure) => tenure.end).end, "2026-10-06");
  assert.equal(beta.find((tenure) => !tenure.end).start, null);
  assert.equal(tenures.find((tenure) => tenure.id === "tenure:burgemeester-alpha").source.source, "src:koop-medewerkers-gemeenten", "the unchanged holder now cites the register");
  const orgs = await read(root, "data/organizations.json");
  assert.equal(orgs.find((org) => org.id === "org:gemeenteraad-gamma").seatsCount, 25);
  const sources = await read(root, "data/sources.json");
  for (const id of ["src:tooi-gemeenten", "src:koop-medewerkers-gemeenten", "src:koop-medewerkers-waterschappen", "src:cbs-86247ned-live"]) assert.ok(sources.some((source) => source.id === id), id);
  assert.equal(sources.find((source) => source.id === "src:tooi-gemeenten").license, "unknown");
  assert.equal(sources.find((source) => source.id === "src:koop-medewerkers-gemeenten").license, "CC0-1.0");
  const state = await read(root, "research/P-live-state.json");
  assert.equal(state.decentral.gemeenten.codes.gm0002, "org:gemeente-beta");
  assert.equal(state.decentral.gemeenten.holdersBootstrapped, "2026-10-06");
  assert.equal(state.decentral.waterschappen.codes.ws0001, "org:waterschap-aa-en-maas");
  assert.equal(state.decentral.provincies.codes.pv22, "org:provincie-drenthe");
  assert.equal(state.decentral.gemeenten.lastRun, NOW.toISOString());
  const queue = await readFile(join(root, "research/qa/live-review-queue.md"), "utf8");
  assert.match(queue, /nieuwe persoon/);
  assert.match(queue, /Leden van de gemeenteraden/);
  // 6 requests for gemeenten, 3 for waterschappen, 3 for provincies (CBS is shared with gemeenten), 1 for the commissarissen
  const hosts = result.summary.requests.byHost;
  assert.equal(hosts["identifier.overheid.nl"], 3);
  assert.equal(hosts["organisaties.overheid.nl"], 6);
  assert.equal(hosts["opendata.cbs.nl"], 2);
});

test("an hour later nothing is due; a day later the sources are read again and change nothing in the people, tenures and organisations", async () => {
  const world = makeWorld(spec());
  const root = await makeRoot(world);
  await run(root, world, { cvdk: CVDK_SAME });
  const snapshot = async () => ({ tenures: await readFile(join(root, "data/tenures.json"), "utf8"), people: await readFile(join(root, "data/people.json"), "utf8"), organizations: await readFile(join(root, "data/organizations.json"), "utf8") });
  const before = await snapshot();
  const soon = await run(root, world, { cvdk: CVDK_SAME }, { now: new Date("2026-10-06T11:00:00Z") });
  assert.equal(soon.summary.outcome, "unchanged");
  assert.equal(soon.requested.filter((url) => /overheid\.nl|cbs\.nl|rijksoverheid/.test(url)).length, 0);
  // the older sources are not the subject here: mark them as read a moment ago
  const state = await read(root, "research/P-live-state.json");
  const recent = "2026-10-07T10:30:00.000Z";
  state.tk.lastFullRun = recent;
  state.ek.lastFullRun = recent;
  state.bewindspersonen.lastRun = recent;
  state.news.lastRun = recent;
  state.electionDates.lastRun = recent;
  await writeFile(join(root, "research/P-live-state.json"), serializeState(state));
  const next = await run(root, world, { cvdk: CVDK_SAME }, { now: new Date("2026-10-07T11:00:00Z"), today: "2026-10-07" });
  assert.equal(next.exitCode, 0, JSON.stringify(next.summary.gaps));
  assert.deepEqual(await snapshot(), before);
  assert.equal(next.summary.counts.closures, 0);
  assert.equal(next.summary.counts.openings, 0);
});

test("a source stopped by its guard writes nothing of its own, the others still apply, the run exits 2 and reads the source again after six hours", async () => {
  const world = makeWorld(spec());
  const root = await makeRoot(world);
  const first = await run(root, world, { cvdk: CVDK_SAME, dropCbsRow: true });
  assert.equal(first.exitCode, 2);
  assert.ok(first.summary.stoppedByGuard.some((entry) => entry.source === "gemeenten"));
  const tenures = await read(root, "data/tenures.json");
  assert.equal(tenures.filter((tenure) => tenure.position === "pos:burgemeester-beta").length, 1, "no gemeente record was written");
  const state = await read(root, "research/P-live-state.json");
  assert.ok(state.decentral.gemeenten.pendingGuard.length > 0);
  assert.equal(state.decentral.gemeenten.lastRun, null);
  assert.equal(state.decentral.waterschappen.lastRun, NOW.toISOString(), "waterschappen passed");
  const queue = await readFile(join(root, "research/qa/live-review-queue.md"), "utf8");
  assert.match(queue, /gestopt door de bewaking/);
  // within six hours nothing is read; after six hours the stopped source is tried again
  const early = await run(root, world, { cvdk: CVDK_SAME }, { now: new Date("2026-10-06T13:00:00Z") });
  assert.equal(early.summary.sources.gemeenten.full, false);
  const retry = await run(root, world, { cvdk: CVDK_SAME }, { now: new Date("2026-10-06T16:30:00Z") });
  assert.equal(retry.summary.sources.gemeenten.full, true);
  assert.equal(retry.summary.sources.waterschappen.full, false);
  assert.equal(retry.exitCode, 0);
  assert.equal((await read(root, "research/P-live-state.json")).decentral.gemeenten.pendingGuard, null);
});

test("an unreachable register is a gap, not an error: the records stay and the source is retried after six hours", async () => {
  const world = makeWorld(spec());
  const root = await makeRoot(world);
  const before = await readFile(join(root, "data/tenures.json"), "utf8");
  const result = await run(root, world, { cvdk: CVDK_SAME, failRegister: true });
  assert.equal(result.exitCode, 0);
  assert.ok(result.summary.gaps.some((gap) => /Live bron gemeenten/.test(gap.what)));
  assert.equal(await readFile(join(root, "data/tenures.json"), "utf8"), before);
  const state = await read(root, "research/P-live-state.json");
  assert.equal(state.decentral.gemeenten.pendingRetry, true);
  assert.equal(state.decentral.commissarissen.lastRun, NOW.toISOString());
});
