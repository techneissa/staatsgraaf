import { test } from "node:test";
import assert from "node:assert/strict";

import {
  GuardError,
  decideBulk,
  evaluateBewindspersonenInvariants,
  evaluateEkInvariants,
  evaluateTkInvariants,
  recentEvents,
} from "./live-guard.mjs";

function seats(fractie, count, startGewicht = 1) {
  return Array.from({ length: count }, (_, index) => ({
    id: `${fractie}-${index}`,
    persoonId: `${fractie}-p${index}`,
    fractieZetelId: `${fractie}-z${index}`,
    fractie,
    gewicht: startGewicht + index,
    functie: index === 0 ? "Fractievoorzitter" : "Lid",
  }));
}

function consistent() {
  const rows = [...seats("A", 100), ...seats("B", 50)];
  const fracties = [
    { id: "fa", afkorting: "A", aantalZetels: 100 },
    { id: "fb", afkorting: "B", aantalZetels: 50 },
  ];
  return { rows, fracties };
}

test("tk invariants hold for 150 consistent seats", () => {
  const { rows, fracties } = consistent();
  const result = evaluateTkInvariants({ activeRows: rows, fracties, vacatures: [], today: "2026-10-05" });
  assert.equal(result.ok, true);
  assert.deepEqual(result.failures, []);
  assert.equal(result.stats.seats, 150);
});

test("tk invariants refuse 149 seats without a fresh vacancy", () => {
  const { rows, fracties } = consistent();
  const result = evaluateTkInvariants({ activeRows: rows.slice(0, 149), fracties, vacatures: [], today: "2026-10-05" });
  assert.equal(result.ok, false);
  assert.ok(result.failures.some((failure) => failure.code === "seat-total"));
});

test("tk invariants accept 149 seats when a vacancy opened within 60 days explains the gap", () => {
  const { rows, fracties } = consistent();
  const vacatures = [{ id: "v1", fractie: "B", van: "2026-09-20", totEnMet: null, gewicht: 50 }];
  const result = evaluateTkInvariants({ activeRows: rows.slice(0, 149), fracties, vacatures, today: "2026-10-05" });
  assert.equal(result.ok, true);
});

test("tk invariants ignore a stale vacancy (the BBB row open since 05-02-2025)", () => {
  const { rows, fracties } = consistent();
  const vacatures = [{ id: "v1", fractie: "B", van: "2025-02-05", totEnMet: null, gewicht: 10000 }];
  const result = evaluateTkInvariants({ activeRows: rows.slice(0, 149), fracties, vacatures, today: "2026-10-05" });
  assert.equal(result.ok, false);
});

test("tk invariants refuse a duplicate seat number inside a fractie", () => {
  const { rows, fracties } = consistent();
  rows[1] = { ...rows[1], gewicht: rows[0].gewicht };
  const result = evaluateTkInvariants({ activeRows: rows, fracties, vacatures: [], today: "2026-10-05" });
  assert.equal(result.ok, false);
  assert.ok(result.failures.some((failure) => failure.code === "duplicate-seat"));
});

test("tk invariants refuse the same zetel or the same person twice", () => {
  const { rows, fracties } = consistent();
  const sameZetel = rows.map((row, index) => (index === 3 ? { ...row, fractieZetelId: rows[2].fractieZetelId } : row));
  assert.ok(evaluateTkInvariants({ activeRows: sameZetel, fracties, vacatures: [], today: "2026-10-05" }).failures.some((f) => f.code === "duplicate-seat"));
  const samePerson = rows.map((row, index) => (index === 3 ? { ...row, persoonId: rows[2].persoonId } : row));
  assert.ok(evaluateTkInvariants({ activeRows: samePerson, fracties, vacatures: [], today: "2026-10-05" }).failures.some((f) => f.code === "duplicate-person"));
});

test("tk invariants refuse a fractie whose members differ from AantalZetels", () => {
  const { rows, fracties } = consistent();
  fracties[0] = { ...fracties[0], aantalZetels: 99 };
  const result = evaluateTkInvariants({ activeRows: rows, fracties, vacatures: [], today: "2026-10-05" });
  assert.equal(result.ok, false);
  assert.ok(result.failures.some((failure) => failure.code === "fractie-count" && failure.detail.includes("A")));
});

test("tk invariants refuse an active member without a fractie row", () => {
  const { rows, fracties } = consistent();
  const result = evaluateTkInvariants({ activeRows: rows, fracties: fracties.slice(1), vacatures: [], today: "2026-10-05" });
  assert.ok(result.failures.some((failure) => failure.code === "fractie-missing"));
});

test("ek invariants need 75 members, a seat sum of 75 and matching fractie totals", () => {
  const members = Array.from({ length: 75 }, (_, index) => ({ slug: `m${index}`, party: index < 40 ? "X" : "Y" }));
  const fracties = [
    { label: "X", seats: 40 },
    { label: "Y", seats: 35 },
  ];
  assert.equal(evaluateEkInvariants({ members, fracties }).ok, true);
  const short = evaluateEkInvariants({ members: members.slice(0, 74), fracties });
  assert.equal(short.ok, false);
  assert.ok(short.failures.some((failure) => failure.code === "member-total"));
  const drift = evaluateEkInvariants({ members, fracties: [{ label: "X", seats: 41 }, { label: "Y", seats: 34 }] });
  assert.ok(drift.failures.some((failure) => failure.code === "fractie-count"));
  const sum = evaluateEkInvariants({ members, fracties: [{ label: "X", seats: 40 }, { label: "Y", seats: 30 }] });
  assert.ok(sum.failures.some((failure) => failure.code === "seat-total"));
});

test("bewindspersonen invariants allow 28 plus or minus 3 and nothing else", () => {
  assert.equal(evaluateBewindspersonenInvariants({ count: 28 }).ok, true);
  assert.equal(evaluateBewindspersonenInvariants({ count: 25 }).ok, true);
  assert.equal(evaluateBewindspersonenInvariants({ count: 31 }).ok, true);
  assert.equal(evaluateBewindspersonenInvariants({ count: 24 }).ok, false);
  assert.equal(evaluateBewindspersonenInvariants({ count: 32 }).ok, false);
});

test("recentEvents finds an election or a cabinet start inside the 60 day window only", () => {
  const elections = [
    { id: "election:tk-2025-10-29", body: "org:tweede-kamer", date: "2025-10-29" },
    { id: "election:tk-x", body: "org:tweede-kamer", date: "2026-08-20" },
  ];
  const coalitions = [{ id: "coalition:kabinet-jetten", start: "2026-02-23" }];
  const events = recentEvents({ today: "2026-10-05", elections, coalitions });
  assert.deepEqual(events.map((event) => event.id), ["election:tk-x"]);
  const early = recentEvents({ today: "2026-04-01", elections, coalitions });
  assert.deepEqual(early.map((event) => event.kind).sort(), ["cabinet-start"]);
  assert.deepEqual(recentEvents({ today: "2025-12-20", elections, coalitions }).map((e) => e.id), ["election:tk-2025-10-29"]);
});

test("decideBulk lets a quiet run through up to 5 closures", () => {
  const decision = decideBulk({ closures: 5, fractieChanged: false, events: [] });
  assert.equal(decision.allowed, true);
  assert.equal(decision.bulk, false);
});

test("decideBulk refuses more than 5 closures without an event", () => {
  const decision = decideBulk({ closures: 6, fractieChanged: false, events: [] });
  assert.equal(decision.allowed, false);
  assert.match(decision.reason, /6 sluitingen/);
});

test("decideBulk allows bulk closures when a fractie changed or an event is recent", () => {
  const merger = decideBulk({ closures: 21, fractieChanged: true, events: [] });
  assert.equal(merger.allowed, true);
  assert.equal(merger.bulk, true);
  assert.equal(merger.event, "fractie-changed");
  const election = decideBulk({ closures: 40, fractieChanged: false, events: [{ kind: "election", id: "election:tk-x", date: "2026-08-20" }] });
  assert.equal(election.allowed, true);
  assert.equal(election.event, "election@2026-08-20");
});

test("GuardError carries the source and the reasons", () => {
  const error = new GuardError("tweedeKamer", ["149 zetels"]);
  assert.equal(error.name, "GuardError");
  assert.equal(error.source, "tweedeKamer");
  assert.match(error.message, /149 zetels/);
});
