import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { CBS_CATALOG_URL, failureGap, fetchCbsRegions, fetchDecentral } from "./decentral-fetch.mjs";
import { createHttp } from "./live-http.mjs";
import { emptyState, normalizeState } from "./live-state.mjs";

const fx = (name) => readFileSync(new URL(`./fixtures/decentral/${name}`, import.meta.url), "utf8");

function http(routes) {
  const requested = [];
  const fetchImpl = async (input, init) => {
    const url = decodeURIComponent(String(input));
    requested.push({ url, agent: init.headers["User-Agent"] });
    for (const [needle, body] of routes) if (url.includes(needle)) return new Response(typeof body === "string" ? body : JSON.stringify(body), { status: 200 });
    return new Response("niet gevonden", { status: 404 });
  };
  return { http: createHttp({ fetchImpl, minIntervalMs: 0 }), requested };
}

const routes = () => [
  ["ODataCatalog/Tables", JSON.parse(fx("cbs-catalog-excerpt.json"))],
  ["86247NED/TypedDataSet", JSON.parse(fx("cbs-typed-excerpt.json"))],
  ["tooi/id/gemeente", JSON.parse(fx("tooi-gemeente-excerpt.json"))],
  ["export-medewerkers/Gemeenten.csv", fx("register-medewerkers-gemeenten-excerpt.csv")],
  ["export/Gemeenten.csv", fx("register-gemeenten-excerpt.csv")],
  ["commissarissen-van-de-koning", fx("rijksoverheid-cvdk-excerpt.html")],
];

test("gemeenten: TOOI, the register bodies and people, and CBS are read with the project user agent, CBS once per run", async () => {
  const { http: client, requested } = http(routes());
  const shared = {};
  const body = await fetchDecentral({ http: client, key: "gemeenten", today: "2026-10-06", shared });
  assert.equal(body.ok, true);
  assert.equal(body.tooi.entries.length, 7);
  assert.equal(body.register.bodies.length, 3);
  assert.ok(body.register.people.length > 10);
  assert.equal(body.cbs.table.id, "86247NED");
  assert.equal(body.cbs.gemeenten.length, 3);
  assert.equal(requested.length, 5);
  assert.ok(requested.every((entry) => entry.agent.startsWith("StaatsgraafBot/")));
  assert.ok(body.endpointsUsed.some((entry) => entry.url.includes("export-medewerkers/Gemeenten.csv")));
  // CBS is cached for the provincies read of the same run
  const before = requested.length;
  await fetchCbsRegions({ http: client, today: "2026-10-06", shared });
  assert.equal(requested.length, before);
});

test("the CBS catalog URL asks for the tables whose title starts with Gebieden in Nederland", () => {
  assert.match(decodeURIComponent(CBS_CATALOG_URL), /startswith\(Title,'Gebieden in Nederland'\)/);
});

test("commissarissen: the table of the Rijksoverheid page", async () => {
  const { http: client } = http(routes());
  const body = await fetchDecentral({ http: client, key: "commissarissen", today: "2026-10-06" });
  assert.equal(body.items.length, 12);
});

test("a source that answers with an error status throws, and the gap names the endpoint and the way on", async () => {
  const { http: client } = http([]);
  await assert.rejects(fetchDecentral({ http: client, key: "waterschappen", today: "2026-10-06" }), /HTTP 404/);
  const gap = failureGap("waterschappen", new Error("HTTP 404"));
  assert.match(gap.what, /waterschappen/);
  assert.match(gap.endpoint, /identifier\.overheid\.nl/);
  await assert.rejects(fetchDecentral({ http: client, key: "onbekend", today: "2026-10-06" }), /onbekende bron/);
});

test("the state has a decentral section; an older state file without one gets the defaults and keeps what it has", () => {
  const fresh = emptyState();
  assert.deepEqual(Object.keys(fresh.decentral).sort(), ["commissarissen", "gemeenten", "provincies", "waterschappen"]);
  assert.equal(fresh.decentral.gemeenten.lastAttempt, null);
  assert.deepEqual(fresh.decentral.gemeenten.codes, {});
  const old = normalizeState({ version: 1, tk: { cursors: { fzp: "x" } } });
  assert.deepEqual(old.decentral.waterschappen.codes, {});
  assert.equal(old.tk.cursors.fzp, "x");
  const kept = normalizeState({ decentral: { gemeenten: { codes: { gm0001: "org:gemeente-alpha" }, lastRun: "2026-10-06T00:00:00Z" } } });
  assert.equal(kept.decentral.gemeenten.codes.gm0001, "org:gemeente-alpha");
  assert.equal(kept.decentral.gemeenten.lastRun, "2026-10-06T00:00:00Z");
  assert.equal(kept.decentral.gemeenten.pendingRetry, false);
});
