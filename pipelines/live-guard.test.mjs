import { test } from "node:test";
import assert from "node:assert/strict";

import {
  GuardError,
  decideBulk,
  DEFAULT_BOUNDS,
  evaluateBewindspersonenInvariants,
  evaluateBodyInvariants,
  evaluateHolderInvariants,
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

const codes = (n, prefix = "gm") => Array.from({ length: n }, (_, i) => `${prefix}${String(i + 1).padStart(4, "0")}`);

test("bodies: 342 gemeenten that TOOI, the register and CBS all name pass, with the same province", () => {
  const list = codes(342);
  const province = new Map(list.map((code) => [code, "pv22"]));
  const verdict = evaluateBodyInvariants({ level: "gemeenten", tooiCodes: list, registerCodes: list, cbsCodes: list, tooiProvince: province, cbsProvince: province });
  assert.equal(verdict.ok, true);
  assert.deepEqual(verdict.stats, { tooi: 342, register: 342, cbs: 342 });
});

test("bodies: a count outside the range, a code only one source knows and a different province each fail", () => {
  const list = codes(342);
  assert.equal(evaluateBodyInvariants({ level: "gemeenten", tooiCodes: codes(200), registerCodes: codes(200), cbsCodes: codes(200) }).failures[0].code, "count-range");
  const register = evaluateBodyInvariants({ level: "gemeenten", tooiCodes: list, registerCodes: list.slice(1), cbsCodes: list });
  assert.deepEqual(register.failures.map((failure) => failure.code), ["register-vs-tooi"]);
  assert.match(register.failures[0].detail, /gm0001/);
  const cbs = evaluateBodyInvariants({ level: "gemeenten", tooiCodes: list, registerCodes: list, cbsCodes: [...list.slice(1), "gm9999"] });
  assert.deepEqual(cbs.failures.map((failure) => failure.code), ["cbs-vs-tooi"]);
  const tooiProvince = new Map(list.map((code) => [code, "pv22"]));
  const cbsProvince = new Map(list.map((code, i) => [code, i === 0 ? "pv25" : "pv22"]));
  assert.equal(evaluateBodyInvariants({ level: "gemeenten", tooiCodes: list, registerCodes: list, cbsCodes: list, tooiProvince, cbsProvince }).failures[0].code, "province");
});

test("bodies: twelve provincies exactly, and waterschappen between 15 and 30 that TOOI and the register share", () => {
  assert.equal(evaluateBodyInvariants({ level: "provincies", tooiCodes: codes(12, "pv"), registerCodes: codes(12, "pv"), cbsCodes: codes(12, "pv") }).ok, true);
  assert.equal(evaluateBodyInvariants({ level: "provincies", tooiCodes: codes(13, "pv"), registerCodes: codes(13, "pv"), cbsCodes: codes(13, "pv") }).failures[0].code, "count-range");
  assert.equal(evaluateBodyInvariants({ level: "waterschappen", tooiCodes: codes(21, "ws"), registerCodes: codes(21, "ws") }).ok, true);
  assert.equal(evaluateBodyInvariants({ level: "waterschappen", tooiCodes: codes(21, "ws"), registerCodes: codes(20, "ws") }).failures[0].code, "register-vs-tooi");
  assert.deepEqual(DEFAULT_BOUNDS.provincies, [12, 12]);
});

test("holders: the register names a head for at least 97 percent of the bodies", () => {
  assert.equal(evaluateHolderInvariants({ level: "gemeenten", bodies: 342, withHead: 342 }).ok, true);
  assert.equal(evaluateHolderInvariants({ level: "gemeenten", bodies: 342, withHead: 330 }).ok, false, "12 missing is 3.5 percent");
  assert.equal(evaluateHolderInvariants({ level: "gemeenten", bodies: 342, withHead: 333 }).ok, true, "9 missing is 2.6 percent");
  assert.equal(evaluateHolderInvariants({ level: "provincies", bodies: 12, withHead: 0, expectsHeads: false }).ok, true);
});
