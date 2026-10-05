import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { createHttp } from "./live-http.mjs";
import {
  EK_COLOFON_GAP,
  EK_URLS,
  fetchEkHashes,
  hashPage,
  parseDutchDate,
  parseEkColofon,
  parseEkFractievoorzitter,
  parseEkFracties,
  parseEkMemberSince,
  parseEkVoorzitterLink,
  parseEkVoorzitterSince,
  planEersteKamerBoards,
} from "./ek-live.mjs";
import { evaluateEkInvariants } from "./live-guard.mjs";
import { parseEersteKamerLeden } from "./refresh-official.mjs";

function html(name) {
  return readFileSync(new URL(`./fixtures/live/${name}`, import.meta.url), "utf8");
}

test("the fracties page gives label, seats and page slug per fractie, 75 seats in all", () => {
  const fracties = parseEkFracties(html("ek-fracties.html"));
  assert.equal(fracties.length, 20);
  assert.deepEqual(fracties[0], { slug: "progressief_nederland_pro", label: "PRO", seats: 14, url: "https://www.eerstekamer.nl/fractie/progressief_nederland_pro" });
  assert.equal(fracties.find((fractie) => fractie.label === "50PLUS").seats, 1);
  assert.equal(fracties.reduce((sum, fractie) => sum + fractie.seats, 0), 75);
});

test("the 75 members on alle_leden add up with the fractie page, so the Eerste Kamer invariants hold", () => {
  const members = parseEersteKamerLeden(html("ek-alle-leden.html"));
  assert.equal(members.length, 75);
  const result = evaluateEkInvariants({ members, fracties: parseEkFracties(html("ek-fracties.html")) });
  assert.deepEqual(result.failures, []);
  assert.equal(result.ok, true);
});

test("74 members are refused by the Eerste Kamer invariants", () => {
  const members = parseEersteKamerLeden(html("ek-alle-leden.html")).slice(0, 74);
  const result = evaluateEkInvariants({ members, fracties: parseEkFracties(html("ek-fracties.html")) });
  assert.equal(result.ok, false);
  assert.ok(result.failures.some((failure) => failure.code === "member-total"));
});

test("the fractie page names the fractievoorzitter by member page link and start date", () => {
  assert.deepEqual(parseEkFractievoorzitter(html("ek-fractie-pro.html")), {
    href: "/persoon/p_rosenmoller_pro",
    name: "Paul Rosenmöller",
    since: "2026-09-09",
  });
  assert.equal(parseEkFractievoorzitter("<p>geen bestuur</p>"), null);
});

test("the Voorzitter is found by the nav link and dated by the member page", () => {
  assert.equal(parseEkVoorzitterLink(html("ek-fracties.html")), "/persoon/dr_m_l_vos_pro");
  assert.equal(parseEkVoorzitterSince(html("ek-voorzitter-vos.html")), "2025-10-07");
  assert.equal(parseEkMemberSince(html("ek-voorzitter-vos.html")), "2019-06-11");
});

test("Dutch dates with no-break spaces parse", () => {
  assert.equal(parseDutchDate("9 september 2026"), "2026-09-09");
  assert.equal(parseDutchDate("onzin"), null);
});

test("the colofon requirement is read as it stands: source URL, extraction date, annotation announced but missing (G10)", () => {
  const colofon = parseEkColofon(html("ek-colofon.html"));
  assert.equal(colofon.sourceRequired, true);
  assert.equal(colofon.dateRequired, true);
  assert.equal(colofon.annotationAnnounced, true);
  assert.equal(colofon.annotationText, null);
  assert.equal(colofon.imagesForbidden, true);
  assert.match(EK_COLOFON_GAP.what, /G10/);
});

test("the hash ignores markup noise and changes with the text", async () => {
  const a = await hashPage("<html><body><script>var t=1</script><ul><li>PRO (14 zetels)</li></ul></body></html>");
  const b = await hashPage("<html><body><script>var t=2</script><ul>\n<li>PRO   (14 zetels)</li></ul></body></html>");
  const c = await hashPage("<html><body><ul><li>PRO (13 zetels)</li></ul></body></html>");
  assert.equal(a, b);
  assert.notEqual(a, c);
});

test("the hash check reports a change only when /fracties or /personele_mutaties changed", async () => {
  const pages = { [EK_URLS.fracties]: html("ek-fracties.html"), [EK_URLS.mutaties]: html("ek-personele-mutaties.html") };
  const http = createHttp({ fetchImpl: async (url) => new Response(pages[url], { status: 200 }), minIntervalMs: 0 });
  const first = await fetchEkHashes({ http, hashes: {} });
  assert.equal(first.changed, true);
  const same = await fetchEkHashes({ http, hashes: first.hashes });
  assert.equal(same.changed, false);
  pages[EK_URLS.fracties] = pages[EK_URLS.fracties].replace("PRO (14 zetels)", "PRO (13 zetels)");
  const changed = await fetchEkHashes({ http, hashes: first.hashes });
  assert.equal(changed.changed, true);
  assert.notEqual(changed.hashes.fracties, first.hashes.fracties);
  assert.equal(changed.hashes.mutaties, first.hashes.mutaties);
});

const BOARD_DATASET = {
  people: [
    { id: "person:p-rosenmoller", name: "P. Rosenmöller" },
    { id: "person:oud-voorzitter", name: "Oud Voorzitter" },
    { id: "person:dr-m-l-vos", name: "dr. M.L. Vos" },
  ],
  positions: [
    { id: "pos:ek-fractievoorzitter-pro", organization: "org:eerste-kamer" },
    { id: "pos:voorzitter-eerste-kamer", organization: "org:eerste-kamer" },
  ],
  tenures: [
    {
      id: "tenure:fvp-ek-fractievoorzitter-pro-oud",
      person: "person:oud-voorzitter",
      position: "pos:ek-fractievoorzitter-pro",
      start: "2023-06-13",
      end: null,
      source: { source: "src:x", retrieved: "2026-09-25", confidence: "high" },
    },
  ],
  relations: [],
  sources: [],
};

test("a new Eerste Kamer fractievoorzitter closes the old tenure the day before and opens the new one with source URL and extraction date", () => {
  const memberItems = [
    { slug: "p_rosenmoller_pro", name: "P. Rosenmöller", party: "PRO", url: "https://www.eerstekamer.nl/persoon/p_rosenmoller_pro" },
  ];
  const result = planEersteKamerBoards({
    ek: {
      boards: [{ slug: "progressief_nederland_pro", label: "PRO", url: "https://www.eerstekamer.nl/fractie/progressief_nederland_pro", leader: parseEkFractievoorzitter(html("ek-fractie-pro.html")) }],
      voorzitter: null,
    },
    memberItems,
    dataset: BOARD_DATASET,
    today: "2026-10-05",
    colofon: parseEkColofon(html("ek-colofon.html")),
  });
  const closed = result.closures.find((entry) => entry.record.id === "tenure:fvp-ek-fractievoorzitter-pro-oud");
  assert.equal(closed.record.end, "2026-09-08");
  assert.equal(closed.record.source.confidence, "medium");
  const opened = result.openings[0].record;
  assert.equal(opened.id, "tenure:fvp-ek-fractievoorzitter-pro-p-rosenmoller-20260909");
  assert.equal(opened.start, "2026-09-09");
  assert.equal(opened.predecessor, closed.record.id);
  const source = result.sources.find((entry) => entry.id === opened.source.source);
  assert.equal(source.url, "https://www.eerstekamer.nl/fractie/progressief_nederland_pro");
  assert.equal(source.retrieved, "2026-10-05");
  assert.match(source.notes, /geraadpleegd 2026-10-05/);
  assert.ok(result.gaps.some((gap) => gap.what.includes("G10")));
  assert.ok(result.review.some((entry) => entry.kind === "closed-without-official-end"));
});

test("an unchanged Eerste Kamer board carries its tenure and a leader without a known member page is a gap", () => {
  const dataset = {
    ...BOARD_DATASET,
    tenures: [{ ...BOARD_DATASET.tenures[0], id: "tenure:fvp-ek-fractievoorzitter-pro-p-rosenmoller-20260909", person: "person:p-rosenmoller", start: "2026-09-09" }],
  };
  const board = { slug: "progressief_nederland_pro", label: "PRO", url: "https://www.eerstekamer.nl/fractie/progressief_nederland_pro", leader: parseEkFractievoorzitter(html("ek-fractie-pro.html")) };
  const memberItems = [{ slug: "p_rosenmoller_pro", name: "P. Rosenmöller", party: "PRO", url: "x" }];
  const same = planEersteKamerBoards({ ek: { boards: [board], voorzitter: null }, memberItems, dataset, today: "2026-10-05" });
  assert.equal(same.closures.length, 0);
  assert.equal(same.openings.length, 0);
  assert.equal(same.tenures.length, 1);
  const unknown = planEersteKamerBoards({ ek: { boards: [board], voorzitter: null }, memberItems: [], dataset, today: "2026-10-05" });
  assert.equal(unknown.tenures.length, 0);
  assert.ok(unknown.gaps.some((gap) => gap.what.includes("Fractievoorzitter van PRO")));
});

test("a new Voorzitter of the Eerste Kamer closes the previous one", () => {
  const dataset = {
    ...BOARD_DATASET,
    tenures: [
      {
        id: "tenure:voorzitter-eerste-kamer-oud",
        person: "person:oud-voorzitter",
        position: "pos:voorzitter-eerste-kamer",
        start: "2021-01-01",
        end: null,
        source: { source: "src:x", retrieved: "2026-09-25", confidence: "high" },
      },
    ],
  };
  const result = planEersteKamerBoards({
    ek: { boards: [], voorzitter: { href: "/persoon/dr_m_l_vos_pro", since: "2025-10-07", url: "https://www.eerstekamer.nl/persoon/dr_m_l_vos_pro" }, extraPersons: { dr_m_l_vos_pro: "person:dr-m-l-vos" } },
    memberItems: [],
    dataset,
    today: "2026-10-05",
  });
  assert.equal(result.closures[0].record.end, "2025-10-06");
  assert.equal(result.openings[0].record.person, "person:dr-m-l-vos");
  assert.equal(result.openings[0].record.position, "pos:voorzitter-eerste-kamer");
});
