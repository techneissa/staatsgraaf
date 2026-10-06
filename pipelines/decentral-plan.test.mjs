import { test } from "node:test";
import assert from "node:assert/strict";

import { planCommissarissen, planDecentral } from "./decentral-plan.mjs";
import { TODAY, makeWorld, takenFor } from "./fixtures/decentral/world.mjs";

const BOUNDS = { gemeenten: [3, 400], provincies: [2, 2], waterschappen: [1, 30] };

function plan(world, level = "gemeenten", extra = {}) {
  return planDecentral({
    level,
    body: world.bodies[level],
    dataset: world.dataset,
    state: extra.state ?? {},
    today: extra.today ?? TODAY,
    taken: takenFor(world.dataset),
    options: { bounds: BOUNDS, ...(extra.options ?? {}) },
  });
}

function baseSpec(overrides = {}) {
  return {
    gemeenten: [
      { code: "gm0001", name: "Alpha", seats: 21, holder: "Anna Alpha", burgemeester: { name: "Mw. A. Alpha" }, start: "1998-01-01", website: "https://www.alpha.nl" },
      { code: "gm0002", name: "Beta", seats: 23, holder: "Ben Beta", burgemeester: { name: "Dhr. Q.D. Zeta" } },
      { code: "gm0003", name: "Gamma", seats: 25, holder: "Carl Gamma", holderActing: true, burgemeester: { name: "Dhr. C. Gamma" } },
      { code: "gm0004", name: "Delta", seats: 19, holder: "Nanning Mol", burgemeester: { name: "Mw. E. Echo" } },
      { code: "gm0005", name: "Epsilon", seats: 17, holder: "Dina Epsilon", burgemeester: { name: "Dhr. N. Mol" } },
    ],
    ...overrides,
  };
}

test("a first read keeps the holder the register confirms and moves its source, replaces one that changed, and flips an acting flag", () => {
  const world = makeWorld(baseSpec());
  const result = plan(world);
  assert.equal(result.guard.allowed, true, JSON.stringify(result.guard));
  const byId = new Map(result.tenures.map((tenure) => [tenure.id, tenure]));
  // Alpha: same person, register source replaces the Wikipedia source once
  assert.equal(byId.get("tenure:burgemeester-alpha").source.source, "src:koop-medewerkers-gemeenten");
  assert.equal(byId.get("tenure:burgemeester-alpha").source.confidence, "high");
  assert.ok(result.sourceUpgrades.includes("tenure:burgemeester-alpha"));
  assert.equal(byId.get("tenure:burgemeester-alpha").start, "2019-01-01", "the start stays");
  // Beta: another surname, so the old tenure closes on the retrieval date (medium) and a new one opens with an unknown start
  const closed = byId.get("tenure:burgemeester-beta");
  assert.equal(closed.end, TODAY);
  assert.equal(closed.source.confidence, "medium");
  const opened = result.openings.find((entry) => entry.record.position === "pos:burgemeester-beta").record;
  assert.equal(opened.start, null);
  assert.equal(opened.acting, false);
  assert.equal(closed.successor, opened.id);
  assert.equal(opened.predecessor, closed.id);
  const newPerson = result.people.find((person) => person.id === opened.person);
  assert.equal(newPerson.name, "Q.D. Zeta");
  assert.deepEqual(newPerson.aliases, ["Dhr. Q.D. Zeta"]);
  // Gamma: the same person, now permanent: changed in place
  const flipped = byId.get("tenure:burgemeester-gamma");
  assert.equal(flipped.acting, false);
  assert.equal(flipped.end, null);
  assert.ok(result.review.some((entry) => entry.kind === "acting-changed"));
  // the first read of a source that replaces a secondary one may change many records and says so
  assert.equal(result.guard.bulk, false, "2 closures stay under the quiet threshold");
});

test("a mover is found among people who hold or held a decentral office: no second person is made", () => {
  const world = makeWorld(baseSpec());
  const result = plan(world);
  const opened = result.openings.find((entry) => entry.record.position === "pos:burgemeester-epsilon").record;
  assert.equal(opened.person, "person:nanning-mol");
  assert.equal(result.people.some((person) => person.id === "person:nanning-mol"), false);
  // Delta's tenure for the same person closes, because Delta's register names someone else
  assert.equal(result.closures.some((entry) => entry.record.id === "tenure:burgemeester-delta"), true);
  assert.equal(result.review.some((entry) => entry.kind === "identity-conflict"), false);
});

test("a new holder named by surname only is the person who just left an office with that surname", () => {
  const spec = baseSpec();
  spec.gemeenten[3].holder = "Gerard van den Hengel";
  spec.gemeenten[4].burgemeester = { name: "Dhr. van den Hengel MBA" };
  const world = makeWorld(spec);
  const result = plan(world);
  const opened = result.openings.find((entry) => entry.record.position === "pos:burgemeester-epsilon").record;
  assert.equal(opened.person, "person:gerard-van-den-hengel");
  assert.equal(result.people.some((person) => /hengel/.test(person.id)), false);
  assert.ok(result.review.some((entry) => entry.key.startsWith("mover|")));
  assert.equal(result.review.some((entry) => entry.key.startsWith("new-person|person:van-den-hengel")), false);
});

test("two different people named head of one gemeente change nothing there and are listed", () => {
  const spec = baseSpec();
  spec.gemeenten[1].heads = [{ name: "Dhr. W. Jaeger" }, { name: "Mw. M.C. Teunissen" }];
  const world = makeWorld(spec);
  const result = plan(world);
  assert.equal(result.guard.allowed, true);
  assert.equal(result.tenures.some((tenure) => tenure.position === "pos:burgemeester-beta"), false);
  assert.ok(result.review.some((entry) => entry.kind === "identity-ambiguous" && /Beta/.test(entry.text)));
});

test("a waarnemend row is used only when no regular row exists; a duplicate row of the same person counts once", () => {
  const spec = baseSpec();
  spec.gemeenten[0].heads = [{ name: "Mw. A. Alpha" }, { name: "Mw. drs. A. (Anna) Alpha MBA" }, { name: "Dhr. X. Vervanger", acting: true }];
  const world = makeWorld(spec);
  const result = plan(world);
  assert.equal(result.tenures.find((tenure) => tenure.id === "tenure:burgemeester-alpha").end, null);
  assert.equal(result.openings.some((entry) => entry.record.position === "pos:burgemeester-alpha"), false);
});

test("council seats, the start date and the website follow the register; the position and the elects relation follow the seats", () => {
  const spec = baseSpec();
  spec.gemeenten[0].datasetSeats = 19;
  const world = makeWorld(spec);
  const result = plan(world);
  const raad = result.organizations.find((org) => org.id === "org:gemeenteraad-alpha");
  assert.equal(raad.seatsCount, 21);
  assert.equal(result.positions.find((position) => position.id === "pos:raadslid-alpha").seatsCount, 21);
  assert.equal(result.relations.find((relation) => relation.id === "rel:elects-kiesgerechtigden-gemeenteraad-alpha").seatsAppointed, 21);
  const alpha = result.organizations.find((org) => org.id === "org:gemeente-alpha");
  assert.equal(alpha.established, "1998-01-01");
  assert.equal(alpha.website, "https://www.alpha.nl");
  assert.ok(alpha.sources.some((ref) => ref.source === "src:koop-gemeenten"));
  assert.ok(result.review.some((entry) => entry.kind === "seat-change"));
  assert.equal(result.organizations.some((org) => org.id === "org:gemeenteraad-beta"), false, "unchanged seats are not emitted");
});

test("a register name that differs from the CBS name (a disambiguation) is resolved through CBS, and the code map is returned for the state", () => {
  const spec = baseSpec();
  spec.gemeenten[2].name = "Gamma (L.)";
  spec.gemeenten[2].datasetName = "Gamma (L.)";
  spec.gemeenten[2].registerName = "Gamma";
  const world = makeWorld(spec);
  const result = plan(world);
  assert.equal(result.guard.allowed, true, JSON.stringify(result.guard));
  assert.equal(result.stateUpdate.codes.gm0003, "org:gemeente-gamma-l");
  assert.equal(result.stateUpdate.names.gm0003, "Gamma (L.)");
  assert.equal(result.resolved, 5);
});

test("a changed official name keeps the id and the code, and the old name stays as an alias", () => {
  const world = makeWorld(baseSpec());
  const first = plan(world);
  const renamed = baseSpec();
  renamed.gemeenten[0].name = "Alfa";
  renamed.gemeenten[0].datasetName = "Alpha";
  renamed.gemeenten[0].cbsName = "Alfa";
  const world2 = makeWorld(renamed);
  const second = planDecentral({ level: "gemeenten", body: world2.bodies.gemeenten, dataset: world2.dataset, state: { decentral: { gemeenten: { codes: first.stateUpdate.codes, names: first.stateUpdate.names, holdersBootstrapped: TODAY } } }, today: TODAY, taken: takenFor(world2.dataset), options: { bounds: BOUNDS } });
  const org = second.organizations.find((candidate) => candidate.id === "org:gemeente-alpha");
  assert.equal(org.name, "Gemeente Alfa");
  assert.ok(org.aliases.includes("Alpha"));
  assert.equal(second.organizations.find((candidate) => candidate.id === "org:gemeenteraad-alpha").name, "Gemeenteraad van Alfa");
  assert.ok(second.review.some((entry) => entry.kind === "name-change"));
});

test("after the first read a bulk of closures needs an event: more than 5 percent (at least 5) stops the source", () => {
  const spec = { gemeenten: [] };
  for (let i = 1; i <= 40; i += 1) {
    const code = `gm${String(i).padStart(4, "0")}`;
    spec.gemeenten.push({ code, name: `Plaats${String.fromCharCode(64 + (i % 26) + 1)}${i}`, seats: 21, holder: `Oud${i} Holder${i}`, burgemeester: { name: `Dhr. N. Nieuw${i}x` } });
  }
  const world = makeWorld(spec);
  const first = plan(world);
  assert.equal(first.guard.allowed, true, JSON.stringify(first.guard));
  assert.equal(first.guard.bulk, true);
  assert.equal(first.guard.event, "first-read@2026-10-06");
  assert.ok(first.review.some((entry) => entry.kind === "bulk-event"));
  const later = plan(world, "gemeenten", { state: { decentral: { gemeenten: { holdersBootstrapped: "2026-10-01" } } } });
  assert.equal(later.guard.allowed, false);
  assert.match(later.guard.reasons.join(" "), /40 sluitingen zonder gebeurtenis/);
  assert.equal(later.tenures.length, 0, "a refused plan writes nothing");
  // a herindeling event inside the window explains it
  const withEvent = makeWorld({ ...spec, events: [{ type: "Samenvoeging", date: "2026-09-15", predecessors: ["gm9990"], successors: ["gm0001"] }] });
  const allowed = plan(withEvent, "gemeenten", { state: { decentral: { gemeenten: { holdersBootstrapped: "2026-10-01" } } } });
  assert.equal(allowed.guard.allowed, true);
  assert.match(allowed.guard.event, /herindeling-samenvoeging@2026-09-15/);
});

test("wethouders are read only when the option is on; then the set is matched person by person", () => {
  const spec = baseSpec();
  spec.gemeenten[0].wethouders = ["Dhr. B. Beer", "Mw. C. Cat"];
  spec.gemeenten[0].datasetWethouders = ["Bert Beer", "Dirk Dog"];
  const world = makeWorld(spec);
  const off = plan(world);
  assert.equal(off.tenures.some((tenure) => tenure.position === "pos:wethouder-alpha"), false);
  assert.ok(off.gaps.some((gap) => gap.what === "Wethouders"));
  const on = plan(world, "gemeenten", { options: { wethouders: true } });
  const wethouders = on.tenures.filter((tenure) => tenure.position === "pos:wethouder-alpha");
  assert.equal(wethouders.find((tenure) => tenure.id.includes("dirk-dog")).end, TODAY, "no longer named: closed");
  const added = on.openings.find((entry) => entry.record.position === "pos:wethouder-alpha").record;
  assert.equal(on.people.find((person) => person.id === added.person).id, "person:c-cat-alpha", "namesakes across gemeenten stay apart");
  assert.equal(on.gaps.some((gap) => gap.what === "Wethouders"), false);
});

test("guard: the sources must agree on the bodies, or nothing is written", () => {
  const world = makeWorld(baseSpec());
  const cbsMissing = makeWorld({ ...baseSpec(), gemeenten: baseSpec().gemeenten.map((g, i) => (i === 4 ? { ...g, inCbs: false } : g)) });
  const refused = plan(cbsMissing);
  assert.equal(refused.guard.allowed, false);
  assert.match(refused.guard.reasons.join(" "), /cbs-vs-tooi/);
  const registerMissing = makeWorld({ ...baseSpec(), gemeenten: baseSpec().gemeenten.map((g, i) => (i === 4 ? { ...g, inRegister: false } : g)) });
  assert.match(plan(registerMissing).guard.reasons.join(" "), /register-vs-tooi/);
  const wrongProvince = makeWorld({ ...baseSpec(), gemeenten: baseSpec().gemeenten.map((g, i) => (i === 0 ? { ...g, cbsProvince: "pv25" } : g)) });
  assert.match(plan(wrongProvince).guard.reasons.join(" "), /province/);
  const outOfRange = plan(world, "gemeenten", { options: { bounds: { gemeenten: [300, 400] } } });
  assert.match(outOfRange.guard.reasons.join(" "), /count-range/);
  const noHeads = makeWorld({ ...baseSpec(), gemeenten: baseSpec().gemeenten.map((g) => ({ ...g, burgemeester: null })) });
  assert.match(plan(noHeads).guard.reasons.join(" "), /heads-missing/);
  assert.equal(plan(world).guard.allowed, true);
});

test("a gemeente in the dataset that the sources do not know stops the source", () => {
  const spec = baseSpec();
  const world = makeWorld(spec);
  world.dataset.organizations.push({ id: "org:gemeente-spook", slug: "gemeente-spook", name: "Gemeente Spook", aliases: ["Spook"], type: "department", subtype: "gemeente", branch: "decentraal-lokaal", level: "lokaal", country: "nederland", sources: [] });
  const result = plan(world);
  assert.equal(result.guard.allowed, false);
  assert.match(result.guard.reasons.join(" "), /zonder code in de bron: org:gemeente-spook/);
});

test("a herindeling: the predecessors are dissolved on the official end date with their office holders, a new gemeente is created with its structure", () => {
  const spec = {
    gemeenten: [
      { code: "gm0001", name: "Alpha", seats: 21, holder: "Anna Alpha", burgemeester: { name: "Mw. A. Alpha" } },
      { code: "gm0002", name: "Beta", seats: 23, holder: "Ben Beta", burgemeester: { name: "Dhr. B. Beta" } },
      { code: "gm0003", name: "Gamma", seats: 25, holder: "Carl Gamma", burgemeester: { name: "Dhr. C. Gamma" } },
      { code: "gm0010", name: "Alphabeta", seats: 31, province: "pv22", website: "https://www.alphabeta.nl", start: "2026-01-01", burgemeester: { name: "Dhr. Z. Nieuw", acting: true }, inDataset: false },
      { code: "gm0001", name: "Alpha", end: "2025-12-31", inRegister: false, inCbs: false, inDataset: false, holder: null },
    ],
    events: [{ type: "Samenvoeging", date: "2026-01-01", predecessors: ["gm0001", "gm0002"], successors: ["gm0010"] }],
  };
  // Alpha and Beta end on 31-12-2025: model them as ended TOOI entries that are still current in the dataset
  spec.gemeenten = spec.gemeenten.filter((g) => !(g.code === "gm0001" && g.end));
  spec.gemeenten[0] = { ...spec.gemeenten[0], end: "2025-12-31", inRegister: false, inCbs: false };
  spec.gemeenten[1] = { ...spec.gemeenten[1], end: "2025-12-31", inRegister: false, inCbs: false };
  const world = makeWorld(spec);
  const result = plan(world, "gemeenten", { today: "2026-02-10", state: { decentral: { gemeenten: { holdersBootstrapped: "2026-01-05" } } }, options: { bounds: { gemeenten: [2, 400] } } });
  assert.equal(result.guard.allowed, true, JSON.stringify(result.guard));
  assert.equal(result.guard.bulk, false, "two bodies end and one starts: three changes stay quiet");
  const alpha = result.organizations.find((org) => org.id === "org:gemeente-alpha");
  assert.equal(alpha.dissolved, "2025-12-31");
  assert.equal(result.organizations.find((org) => org.id === "org:gemeenteraad-alpha").dissolved, "2025-12-31");
  const closed = result.tenures.find((tenure) => tenure.id === "tenure:burgemeester-alpha");
  assert.equal(closed.end, "2025-12-31");
  assert.equal(closed.endReason, "reorganisatie");
  assert.equal(closed.source.confidence, "high");
  const succession = result.relations.find((relation) => relation.type === "succeeded_by" && relation.from === "org:gemeente-alpha");
  assert.equal(succession.to, "org:gemeente-alphabeta");
  assert.equal(succession.validFrom, "2026-01-01");
  // the new gemeente
  const created = result.organizations.map((org) => org.id).sort();
  assert.ok(created.includes("org:gemeente-alphabeta") && created.includes("org:gemeenteraad-alphabeta") && created.includes("org:college-van-bw-alphabeta"));
  const raad = result.organizations.find((org) => org.id === "org:gemeenteraad-alphabeta");
  assert.equal(raad.seatsCount, 31);
  assert.deepEqual(result.positions.filter((position) => position.organization.includes("alphabeta")).map((position) => position.id).sort(), ["pos:burgemeester-alphabeta", "pos:raadslid-alphabeta", "pos:wethouder-alphabeta"]);
  assert.ok(result.relations.some((relation) => relation.type === "oversees" && relation.to === "org:gemeente-alphabeta"));
  assert.ok(result.relations.some((relation) => relation.type === "elects" && relation.to === "org:gemeenteraad-alphabeta" && relation.seatsAppointed === 31));
  const head = result.openings.find((entry) => entry.record.position === "pos:burgemeester-alphabeta").record;
  assert.equal(head.acting, true);
  assert.equal(result.stateUpdate.codes.gm0010, "org:gemeente-alphabeta");
  assert.ok(result.review.some((entry) => entry.kind === "new-gemeente"));
  assert.ok(result.review.some((entry) => entry.kind === "dissolved"));
});

test("waterschappen: dijkgraaf and watergraaf are the head, a duplicate row counts once, a waarnemend row is ignored beside a regular one", () => {
  const spec = {
    waterschappen: [
      { code: "ws0001", name: "Aa en Maas", holder: "Mario Jacobs", heads: [{ name: "M.J.J. Jacobs" }] },
      { code: "ws0002", name: "De Dommel", holder: "Erik de Ridder", heads: [{ name: "E. de Ridder", role: "Watergraaf" }] },
      { code: "ws0003", name: "Rivierenland", holder: "Tanja Cuppen", heads: [{ name: "T. Cuppen" }, { name: "drs. T.J.A.M. (Tanja) Cuppen MBA" }] },
      { code: "ws0004", name: "Schieland", holder: "Piet van de Stadt", heads: [{ name: "P.H. van de Stadt" }, { name: "M.J. van Cappelle", role: "Dijkgraaf(Waarnemend)" }] },
      { code: "ws0005", name: "Limburg", holder: "Saskia Borgers", heads: [{ name: "mw. S.M.M. (Saskia) Borgers" }] },
      { code: "ws0006", name: "Vechtstromen", holder: "Oud Hoofd", heads: [{ name: "prof. dr. S.M.M. Kuks", role: "Watergraaf" }], established: "2014-01-01", start: "2014-01-01" },
    ],
  };
  const world = makeWorld(spec);
  const result = plan(world, "waterschappen");
  assert.equal(result.guard.allowed, true, JSON.stringify(result.guard));
  assert.equal(result.closures.length, 1);
  assert.equal(result.closures[0].record.position, "pos:dijkgraaf-vechtstromen");
  assert.equal(result.openings.length, 1);
  assert.equal(result.openings[0].record.person.startsWith("person:s-m-m-kuks"), true);
  assert.equal(result.organizations.find((org) => org.id === "org:waterschap-vechtstromen").established, "2014-01-01");
  assert.ok(result.gaps.some((gap) => /algemeen bestuur/i.test(gap.what)));
});

test("provincies: twelve are checked against TOOI, the register and CBS; heads come from the Rijksoverheid source", () => {
  const world = makeWorld({ gemeenten: [{ code: "gm0001", name: "Alpha" }, { code: "gm0002", name: "Beta", province: "pv25" }, { code: "gm0003", name: "Gamma" }] });
  const result = plan(world, "provincies");
  assert.equal(result.guard.allowed, true, JSON.stringify(result.guard));
  assert.equal(result.resolved, 2);
  assert.ok(result.gaps.some((gap) => /Gedeputeerden/.test(gap.what)));
  const bad = planDecentral({ level: "provincies", body: world.bodies.provincies, dataset: world.dataset, today: TODAY, taken: takenFor(world.dataset), options: { bounds: { provincies: [12, 12] } } });
  assert.equal(bad.guard.allowed, false);
});

const CVDK = (rows) => ({ items: rows.map(([name, province, start, party = null, birthDate = "1970-01-01"]) => ({ name, province, start, party, birthDate, raw: name })) });

test("commissarissen: an unchanged holder writes nothing; a new one closes the predecessor the day before and opens with the official date", () => {
  const world = makeWorld({ provincies: [{ code: "pv22", name: "Drenthe", holder: "Jetta Klijnsma", start: "2022-05-01" }, { code: "pv25", name: "Gelderland", holder: "John Berends", start: "2020-01-01" }], gemeenten: [] });
  const unchanged = planCommissarissen({ body: CVDK([["mw. drs. J. Klijnsma", "Drenthe", "2022-05-01"], ["drs. J. Berends", "Gelderland", "2020-01-01"]]), dataset: world.dataset, today: TODAY, taken: takenFor(world.dataset), options: { bounds: { provincies: [2, 2] } } });
  assert.equal(unchanged.guard.allowed, true, JSON.stringify(unchanged.guard));
  assert.equal(unchanged.tenures.length, 0);
  const changed = planCommissarissen({ body: CVDK([["mw. drs. A.H. Mulder", "Drenthe", "2026-01-01", "CDA", "1973-10-21"], ["drs. J. Berends", "Gelderland", "2020-01-01"]]), dataset: world.dataset, today: TODAY, taken: takenFor(world.dataset), options: { bounds: { provincies: [2, 2] } } });
  const closed = changed.tenures.find((tenure) => tenure.id === "tenure:commissaris-van-de-koning-drenthe");
  assert.equal(closed.end, "2025-12-31");
  assert.equal(closed.source.confidence, "medium");
  const opened = changed.openings[0].record;
  assert.equal(opened.start, "2026-01-01");
  assert.equal(opened.source.confidence, "high");
  const person = changed.people.find((candidate) => candidate.id === opened.person);
  assert.equal(person.party, "CDA");
  assert.equal(person.birthDate, "1973-10-21");
  assert.equal(closed.successor, opened.id);
});

test("commissarissen: a wrong count, an unknown province or a missing date stops the source", () => {
  const world = makeWorld({ provincies: [{ code: "pv22", name: "Drenthe", holder: "Jetta Klijnsma" }, { code: "pv25", name: "Gelderland", holder: "John Berends" }], gemeenten: [] });
  const run = (rows, bounds = [2, 2]) => planCommissarissen({ body: CVDK(rows), dataset: world.dataset, today: TODAY, taken: takenFor(world.dataset), options: { bounds: { provincies: bounds } } });
  assert.equal(run([["a. b", "Drenthe", "2020-01-01"]]).guard.allowed, false);
  assert.match(run([["a. b", "Drenthe", "2020-01-01"], ["c. d", "Atlantis", "2020-01-01"]]).guard.reasons.join(" "), /Atlantis/);
  assert.match(run([["a. b", "Drenthe", null], ["c. d", "Gelderland", "2020-01-01"]]).guard.reasons.join(" "), /benoemingsdatum/);
});
