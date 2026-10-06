import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { runLive } from "./live.mjs";
import { createHttp } from "./live-http.mjs";
import { hashPage } from "./ek-live.mjs";
import { emptyState, serializeState } from "./live-state.mjs";
import { parseEersteKamerLeden } from "./refresh-official.mjs";
import { slugify } from "./live-util.mjs";
import { OLD_SOURCE, datasetFor, fx, snapshotFromFixtures } from "./fixtures/live/helpers.mjs";

const NOW = new Date("2026-10-05T16:00:00Z");

function text(name) {
  return readFileSync(new URL(`./fixtures/live/${name}`, import.meta.url), "utf8");
}

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), { status });
}

/** A 28-person cabinet page and the matching dataset records. */
function cabinetFixture() {
  const items = Array.from({ length: 28 }, (_, index) => ({ slug: `persoon-${index}`, name: `Persoon ${index}`, role: `Minister van Test ${index}` }));
  const html = items
    .map(
      (item) =>
        `<a href="/regering/bewindspersonen/${item.slug}" class="card card--photo-nav"><span class="link-plus__title">${item.name}</span><div class="card__summary"><p class="card__subtitle">${item.role}</p></div></a>`,
    )
    .join("\n") + '<img src="/bewindspersonen/kabinet-jetten/x/x.jpg">';
  const positions = items.map((item, index) => ({ id: `pos:minister-van-test-${index}`, slug: `minister-van-test-${index}`, title: item.role, organization: `org:ministerie-test-${index}`, sources: [OLD_SOURCE] }));
  const organizations = positions.map((position) => ({ id: position.organization, level: "rijk", country: "nederland" }));
  const people = items.map((item, index) => ({ id: `person:persoon-${index}`, slug: `persoon-${index}`, name: item.name, sources: [OLD_SOURCE] }));
  const tenures = items.map((item, index) => ({ id: `tenure:minister-van-test-${index}-persoon-${index}`, person: `person:persoon-${index}`, position: `pos:minister-van-test-${index}`, start: "2026-02-23", end: null, source: OLD_SOURCE }));
  return { html, positions, organizations, people, tenures };
}

function ekFixture() {
  const members = parseEersteKamerLeden(text("ek-alle-leden.html"));
  const people = members.map((item) => ({ id: `person:${slugify(item.name)}`, slug: slugify(item.name), name: item.name, sources: [OLD_SOURCE] }));
  const memberships = members.map((item) => ({ id: `membership:eerste-kamer-${slugify(item.name)}`, organization: "org:eerste-kamer", person: `person:${slugify(item.name)}`, seatNumber: null, fractie: item.party, start: "2023-06-13", end: null, source: OLD_SOURCE }));
  return { people, memberships };
}

async function makeRoot({ state = emptyState() } = {}) {
  const root = await mkdtemp(join(tmpdir(), "live-run-"));
  const tk = datasetFor(snapshotFromFixtures());
  const bw = cabinetFixture();
  const ek = ekFixture();
  const data = {
    organizations: [{ id: "org:tweede-kamer" }, { id: "org:eerste-kamer" }, ...bw.organizations],
    positions: [...tk.positions, ...bw.positions],
    people: [...tk.people, ...bw.people, ...ek.people],
    tenures: [...tk.tenures, ...bw.tenures],
    memberships: [...tk.memberships, ...ek.memberships],
    relations: [],
    sources: [],
    elections: [],
    coalitions: [],
  };
  await mkdir(join(root, "data"), { recursive: true });
  await mkdir(join(root, "research"), { recursive: true });
  for (const [name, value] of Object.entries(data)) await writeFile(join(root, "data", `${name}.json`), `${JSON.stringify(value, null, 2)}\n`);
  await writeFile(join(root, "data", "meta.json"), `${JSON.stringify({ datasetVersion: "v1", snapshotId: "2026-09-19" })}\n`);
  await writeFile(join(root, "research", "P-live-state.json"), serializeState(state));
  return root;
}

function router({ rows = null, counts = 0 } = {}) {
  const cabinet = cabinetFixture();
  const requested = [];
  const fetchImpl = async (input) => {
    const url = decodeURIComponent(String(input));
    requested.push(url);
    if (url.includes("sitemap.xml")) return new Response(text("rijksoverheid-news-sitemap.xml"), { status: 200 });
    if (url.endsWith("/regering/bewindspersonen")) return new Response(cabinet.html, { status: 200 });
    if (url.includes("tweedekamer.nl")) {
      if (url.includes("$count=true")) return jsonResponse({ "@odata.count": counts, value: [] });
      if (url.includes("$orderby=ApiGewijzigdOp desc")) return jsonResponse({ value: [{ ApiGewijzigdOp: "2026-09-02T13:39:19.6078662Z" }] });
      if (url.includes("/Commissie?")) return jsonResponse(fx("tk-presidium-commissie.json"));
      if (url.includes("CommissieZetelVastPersoon")) return jsonResponse(fx("tk-presidium-rows.json"));
      if (url.includes("FractieZetelVacature")) return jsonResponse(fx("tk-vacature-open.json"));
      if (url.includes("/Fractie?")) return jsonResponse(fx("tk-fractie-active.json"));
      if (url.includes("TotEnMet ne null")) return jsonResponse({ value: [] });
      if (url.includes("FractieZetelPersoon")) {
        const all = fx("tk-fzp-open.json");
        return jsonResponse(rows ? { value: all.value.filter((row) => rows.has(row.Id)) } : all);
      }
    }
    if (url.endsWith("eerstekamer.nl/fracties")) return new Response(text("ek-fracties.html"), { status: 200 });
    if (url.endsWith("/personele_mutaties")) return new Response(text("ek-personele-mutaties.html"), { status: 200 });
    if (url.endsWith("/alle_leden")) return new Response(text("ek-alle-leden.html"), { status: 200 });
    if (url.endsWith("/fractie/progressief_nederland_pro")) return new Response(text("ek-fractie-pro.html"), { status: 200 });
    if (url.endsWith("/persoon/dr_m_l_vos_pro")) return new Response(text("ek-voorzitter-vos.html"), { status: 200 });
    if (url.endsWith("/begrip/colofon")) return new Response(text("ek-colofon.html"), { status: 200 });
    if (url.includes("kiesraad.nl/verkiezingen/")) return new Response(text(`kiesraad-${url.split("/").pop()}.html`), { status: 200 });
    return new Response("niet gevonden", { status: 404 });
  };
  return { fetchImpl, requested };
}

async function run(root, scenario, extra = {}) {
  const { fetchImpl, requested } = router(scenario);
  // the decentral sources have their own test (live-decentral.test.mjs); here they are off so the request counts stay about the five older sources
  const result = await runLive({ root, now: NOW, fetchImpl, minIntervalMs: 0, validate: false, log: () => {}, skipDecentral: true, ...extra });
  return { ...result, requested };
}

async function read(root, relative) {
  return JSON.parse(await readFile(join(root, relative), "utf8"));
}

test("a first run reads every source, writes what the sources say, and a second run finds nothing to do", async () => {
  const root = await makeRoot();
  const first = await run(root, {});
  assert.equal(first.exitCode, 0, JSON.stringify(first.summary.gaps));
  assert.equal(first.summary.outcome, "updated");
  assert.equal(first.summary.stoppedByGuard.length, 0);
  // the two ondervoorzitters of the Tweede Kamer and the PRO fractievoorzitter of the Eerste Kamer are new records
  const opened = first.summary.openings.map((entry) => entry.id);
  assert.ok(opened.some((id) => id.startsWith("tenure:eerste-ondervoorzitter-tweede-kamer-")));
  assert.ok(opened.some((id) => id.startsWith("tenure:tweede-ondervoorzitter-tweede-kamer-")));
  const tenures = await read(root, "data/tenures.json");
  assert.ok(tenures.some((tenure) => tenure.position === "pos:tweede-ondervoorzitter-tweede-kamer" && tenure.end === null));
  const state = await read(root, "research/P-live-state.json");
  assert.equal(Object.keys(state.tk.personMap).length >= 150, true);
  assert.equal(state.tk.cursors.fzp, "2026-09-02T13:39:19.6078662Z");
  assert.ok(state.ek.hashes.fracties);
  assert.equal(state.bewindspersonen.cabinetSlug, "kabinet-jetten");
  const upcoming = await read(root, "data/upcoming-elections.json");
  assert.ok(upcoming.some((record) => record.type === "tk" && record.kind === "next" && record.date === "2030-05-15"));
  const queue = await readFile(join(root, "research/qa/live-review-queue.md"), "utf8");
  assert.match(queue, /nieuwe positie/);

  const second = await run(root, {}, {});
  assert.equal(second.summary.outcome, "unchanged");
  assert.equal(second.exitCode, 0);
  assert.deepEqual(second.summary.files, { envelopeChanged: false, upcomingChanged: false, stateChanged: false });
  // counts and hashes only: four counts, two Eerste Kamer pages, the news sitemap
  assert.ok(second.requested.length <= 8, `requests ${second.requested.length}`);
  assert.ok(second.requested.filter((url) => url.includes("$count=true")).length === 4);
});

test("an inconsistent Tweede Kamer stops that source only: nothing of it is written, the cursor stays, the run exits 2", async () => {
  const root = await makeRoot();
  const rows = new Set(fx("tk-fzp-open.json").value.slice(0, 149).map((row) => row.Id));
  const before = await readFile(join(root, "data", "tenures.json"), "utf8");
  const result = await run(root, { rows });
  assert.equal(result.exitCode, 2);
  assert.equal(result.summary.outcome, "stopped-by-guard");
  assert.deepEqual(result.summary.stoppedByGuard.map((entry) => entry.source), ["tweedeKamer"]);
  assert.match(result.summary.stoppedByGuard[0].reasons.join(" "), /seat-total/);
  const tenures = await readFile(join(root, "data", "tenures.json"), "utf8");
  assert.equal(tenures.includes("ondervoorzitter-tweede-kamer"), false, "no Tweede Kamer record was written");
  assert.notEqual(tenures, before, "the sources that passed (Eerste Kamer) were still applied");
  const state = await read(root, "research/P-live-state.json");
  assert.deepEqual(state.tk.cursors, {});
  assert.ok(state.tk.pendingGuard.length > 0);
  const queue = await readFile(join(root, "research/qa/live-review-queue.md"), "utf8");
  assert.match(queue, /gestopt door de bewaking/);
  // the next run reads the Tweede Kamer again, even though no count changed
  const retry = await run(root, {});
  assert.equal(retry.summary.sources.tweedeKamer.reason, "vorige run gestopt door de bewaking");
  assert.equal(retry.exitCode, 0);
  assert.equal((await read(root, "research/P-live-state.json")).tk.pendingGuard, null);
});

test("a quiet run with fresh state and unchanged counts does not read the sources and touches no file", async () => {
  const hashes = { fracties: await hashPage(text("ek-fracties.html")), mutaties: await hashPage(text("ek-personele-mutaties.html")) };
  const state = emptyState();
  state.tk = { ...state.tk, cursors: { fzp: "a", fractie: "b", vacature: "c", presidium: "d" }, presidiumId: "pres", lastFullRun: "2026-10-05T15:30:00.000Z" };
  state.ek = { ...state.ek, hashes, lastFullRun: "2026-10-05T15:30:00.000Z" };
  state.bewindspersonen = { cabinetSlug: "kabinet-jetten", slugsHash: null, lastRun: "2026-10-05T15:30:00.000Z" };
  state.news = { lastRun: "2026-10-05T15:30:00.000Z", sitemapLastmod: null };
  state.electionDates = { lastRun: "2026-10-05T15:30:00.000Z", items: [], gaps: [] };
  const root = await makeRoot({ state });
  const stateBefore = await readFile(join(root, "research", "P-live-state.json"), "utf8");
  const result = await run(root, {});
  assert.equal(result.summary.outcome, "unchanged");
  assert.equal(result.summary.trigger.run, false);
  assert.equal(result.requested.length, 7);
  assert.equal(await readFile(join(root, "research", "P-live-state.json"), "utf8"), stateBefore);
  assert.equal(result.summary.files.envelopeChanged, false);
});

test("a news item about an office change makes the sources due early, and the reason is logged in the summary", async () => {
  const state = emptyState();
  state.tk = { ...state.tk, cursors: { fzp: "a", fractie: "b", vacature: "c", presidium: "d" }, presidiumId: "pres", lastFullRun: "2026-10-05T15:30:00.000Z" };
  state.ek = { ...state.ek, hashes: { fracties: await hashPage(text("ek-fracties.html")), mutaties: await hashPage(text("ek-personele-mutaties.html")) }, lastFullRun: "2026-10-05T15:30:00.000Z" };
  state.bewindspersonen = { cabinetSlug: "kabinet-jetten", slugsHash: null, lastRun: "2026-10-05T15:30:00.000Z" };
  state.news = { lastRun: "2026-10-05T06:00:00.000Z", sitemapLastmod: null };
  state.electionDates = { lastRun: "2026-10-05T15:30:00.000Z", items: [], gaps: [] };
  const root = await makeRoot({ state });
  const result = await run(root, {});
  assert.equal(result.summary.trigger.run, true);
  assert.match(result.summary.trigger.reason, /kabinet/);
  assert.equal(result.summary.sources.tweedeKamer.reason, "vroeg of geforceerd");
});

test("a failing validation restores data/ and the envelope and keeps the state, and the run exits 1", async () => {
  const root = await makeRoot();
  await mkdir(join(root, "scripts"), { recursive: true });
  await writeFile(join(root, "scripts", "validate.mjs"), "console.error('FAIL: voorbeeld'); process.exit(1);\n");
  const tenuresBefore = await readFile(join(root, "data", "tenures.json"), "utf8");
  const stateBefore = await readFile(join(root, "research", "P-live-state.json"), "utf8");
  const result = await run(root, {}, { validate: true });
  assert.equal(result.exitCode, 1);
  assert.equal(result.summary.outcome, "error");
  assert.equal(result.summary.validate.ok, false);
  assert.equal(await readFile(join(root, "data", "tenures.json"), "utf8"), tenuresBefore);
  assert.equal(await readFile(join(root, "research", "P-live-state.json"), "utf8"), stateBefore);
  await assert.rejects(readFile(join(root, "research", "P-live-ambtsdragers.json"), "utf8"), "the envelope of the failed run is gone");
});
