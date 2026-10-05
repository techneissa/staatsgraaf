import { test } from "node:test";
import assert from "node:assert/strict";

import { normalizeFractie, normalizeFzpRow, planTweedeKamer } from "./tk-changes.mjs";
import { slugify } from "./live-util.mjs";
import { OLD_SOURCE, TODAY, datasetFor, fx, snapshotFromFixtures } from "./fixtures/live/helpers.mjs";

function plan(snapshot, dataset, extra = {}) {
  return planTweedeKamer({ snapshot, dataset, state: {}, today: TODAY, elections: [], coalitions: [], ...extra });
}

test("an unchanged Kamer plans no closures, carries every record and learns the person ids", async () => {
  const snapshot = snapshotFromFixtures();
  const dataset = datasetFor(snapshot);
  const result = await plan(snapshot, dataset);
  assert.equal(result.guard.allowed, true);
  assert.equal(result.closures.length, 0);
  assert.equal(result.openings.filter((opening) => opening.entity === "memberships").length, 0);
  assert.equal(result.stats.membershipsCarried, 150);
  assert.equal(result.stats.newPeople, 0);
  assert.equal(Object.keys(result.personMap).length, 150);
  assert.equal(result.invariants.stats.seats, 150);
  // the presidium creates the two ondervoorzitter positions, with a source
  assert.deepEqual(
    result.positions.map((position) => position.id).sort(),
    ["pos:eerste-ondervoorzitter-tweede-kamer", "pos:tweede-ondervoorzitter-tweede-kamer"],
  );
  assert.ok(result.positions.every((position) => position.sources[0].source === "src:tk-odata-presidium"));
  // two new ondervoorzitter tenures open; the Voorzitter and 17 chairs are carried
  assert.equal(result.openings.filter((opening) => opening.entity === "tenures").length, 2);
  assert.equal(result.stats.tenuresCarried, 18);
});

test("a person id in the personMap keeps its person even when the name in the source changed", async () => {
  const snapshot = snapshotFromFixtures();
  const dataset = datasetFor(snapshot);
  const target = snapshot.rows[5];
  const personId = `person:${slugify(target.name)}`;
  const renamed = snapshot.rows.map((row) => (row === target ? { ...row, name: "Totaal Andere Naam", callName: "" } : row));
  const state = { tk: { personMap: { [target.persoonId]: personId } } };
  const result = await plan({ ...snapshot, rows: renamed }, dataset, { state });
  assert.equal(result.stats.newPeople, 0);
  assert.equal(result.closures.length, 0);
  assert.ok(result.memberships.some((membership) => membership.person === personId && !membership.end));
});

test("a Kamerlid the dataset does not know becomes a new, sourced person with a membership", async () => {
  const snapshot = snapshotFromFixtures();
  const dataset = datasetFor(snapshot);
  const target = snapshot.rows.find((row) => row.functie === "Lid");
  const personId = `person:${slugify(target.name)}`;
  dataset.people = dataset.people.filter((person) => person.id !== personId);
  dataset.memberships = dataset.memberships.filter((membership) => membership.person !== personId);
  const result = await plan(snapshot, dataset);
  assert.equal(result.guard.allowed, true);
  assert.equal(result.stats.newPeople, 1);
  const created = result.people.find((person) => person.id === personId);
  assert.ok(created, "the new person record is in the plan");
  assert.equal(created.name, target.name);
  assert.equal(created.sources[0].source, "src:tk-odata-fractiezetelpersonen-expand");
  assert.equal(created.birthDate, target.geboortedatum);
  assert.equal(result.personMap[target.persoonId], personId);
  const opened = result.openings.find((opening) => opening.entity === "memberships");
  assert.equal(opened.record.person, personId);
  assert.equal(opened.record.start, target.van);
  assert.equal(opened.record.source.source, "src:tk-odata-fractiezetelpersonen-expand");
  assert.ok(result.review.some((entry) => entry.kind === "new-person"));
});

test("a Kamerlid who left is closed with the official end date from the closed row", async () => {
  const snapshot = snapshotFromFixtures();
  const dataset = datasetFor(snapshot);
  const leaver = snapshot.rows.find((row) => row.functie === "Lid");
  const rows = snapshot.rows.filter((row) => row !== leaver);
  const fractie = snapshot.fracties.find((entry) => entry.afkorting === leaver.fractie);
  const fracties = snapshot.fracties.map((entry) => (entry === fractie ? { ...entry, aantalZetels: entry.aantalZetels - 1 } : entry));
  const vacatures = [{ id: "v-new", fractie: leaver.fractie, functie: "Lid", van: "2026-10-01", totEnMet: null, gewicht: leaver.gewicht, verwijderd: false }];
  const closedRow = { ...leaver, totEnMet: "2026-09-30", apiGewijzigdOp: "2026-10-01T09:00:00Z" };
  // first run: the personMap is empty, so seed it as the previous run would have
  const state = { tk: { personMap: { [leaver.persoonId]: `person:${slugify(leaver.name)}` } } };
  const result = await plan({ ...snapshot, rows: [...rows, closedRow], fracties, vacatures }, dataset, { state });
  assert.equal(result.guard.allowed, true, result.guard.reasons.join(" | "));
  const closure = result.closures.find((entry) => entry.entity === "memberships");
  assert.equal(closure.record.end, "2026-09-30");
  assert.equal(closure.record.source.source, "src:tk-odata-fractiezetelpersoon-gesloten");
  assert.equal(closure.record.source.confidence, "high");
});

test("a leaver the personMap does not know yet is linked by the exact name of the closed row, and the id is learned", async () => {
  const snapshot = snapshotFromFixtures();
  const dataset = datasetFor(snapshot);
  const leaver = snapshot.rows.find((row) => row.functie === "Lid");
  const rows = snapshot.rows.filter((row) => row !== leaver);
  const fracties = snapshot.fracties.map((entry) => (entry.afkorting === leaver.fractie ? { ...entry, aantalZetels: entry.aantalZetels - 1 } : entry));
  const vacatures = [{ id: "v-new", fractie: leaver.fractie, functie: "Lid", van: "2026-10-01", totEnMet: null, gewicht: leaver.gewicht, verwijderd: false }];
  const closedRow = { ...leaver, totEnMet: "2026-09-30", apiGewijzigdOp: "2026-10-01T09:00:00Z" };
  const result = await plan({ ...snapshot, rows: [...rows, closedRow], fracties, vacatures }, dataset);
  const closure = result.closures.find((entry) => entry.entity === "memberships");
  assert.equal(closure.record.end, "2026-09-30");
  assert.equal(closure.record.source.confidence, "high");
  assert.equal(result.personMap[leaver.persoonId], `person:${slugify(leaver.name)}`);
  assert.ok(result.review.some((entry) => entry.key === `identity-by-name|${leaver.persoonId}`));
});

test("a closure without any closed row falls back to the retrieval date at medium confidence and a review entry", async () => {
  const snapshot = snapshotFromFixtures();
  const dataset = datasetFor(snapshot);
  const leaver = snapshot.rows.find((row) => row.functie === "Lid");
  const rows = snapshot.rows.filter((row) => row !== leaver);
  const fracties = snapshot.fracties.map((entry) => (entry.afkorting === leaver.fractie ? { ...entry, aantalZetels: entry.aantalZetels - 1 } : entry));
  const vacatures = [{ id: "v-new", fractie: leaver.fractie, functie: "Lid", van: "2026-10-01", totEnMet: null, gewicht: leaver.gewicht, verwijderd: false }];
  const result = await plan({ ...snapshot, rows, fracties, vacatures }, dataset);
  const closure = result.closures.find((entry) => entry.entity === "memberships");
  assert.equal(closure.record.end, TODAY);
  assert.equal(closure.record.source.confidence, "medium");
  assert.ok(result.review.some((entry) => entry.kind === "closed-without-official-end"));
});

test("the lookup callback supplies an official end date the snapshot does not carry", async () => {
  const snapshot = snapshotFromFixtures();
  const dataset = datasetFor(snapshot);
  const leaver = snapshot.rows.find((row) => row.functie === "Lid");
  const rows = snapshot.rows.filter((row) => row !== leaver);
  const fracties = snapshot.fracties.map((entry) => (entry.afkorting === leaver.fractie ? { ...entry, aantalZetels: entry.aantalZetels - 1 } : entry));
  const vacatures = [{ id: "v-new", fractie: leaver.fractie, functie: "Lid", van: "2026-10-01", totEnMet: null, gewicht: leaver.gewicht, verwijderd: false }];
  const state = { tk: { personMap: { [leaver.persoonId]: `person:${slugify(leaver.name)}` } } };
  const calls = [];
  const result = await plan({ ...snapshot, rows, fracties, vacatures }, dataset, {
    state,
    lookupClosedRow: async (query) => {
      calls.push(query);
      return { totEnMet: "2026-09-29" };
    },
  });
  assert.equal(result.closures.find((entry) => entry.entity === "memberships").record.end, "2026-09-29");
  assert.equal(calls[0].persoonId, leaver.persoonId);
});

function swapChair(snapshot, label, newChairIndexWithinFractie, van, closedOn) {
  const members = snapshot.rows.filter((row) => row.fractie === label);
  const oldChair = members.find((row) => row.functie === "Fractievoorzitter");
  const newChair = members.filter((row) => row.functie === "Lid")[newChairIndexWithinFractie];
  const rows = snapshot.rows.map((row) => {
    if (row === oldChair) return { ...row, functie: "Lid", van, id: `${row.id}-lid` };
    if (row === newChair) return { ...row, functie: "Fractievoorzitter", van, id: `${row.id}-chair` };
    return row;
  });
  rows.push(
    { ...oldChair, totEnMet: closedOn, apiGewijzigdOp: "2026-10-02T08:00:00Z" },
    { ...newChair, totEnMet: closedOn, apiGewijzigdOp: "2026-10-02T08:00:00Z" },
  );
  return { snapshot: { ...snapshot, rows }, oldChair, newChair };
}

test("a new fractievoorzitter closes the old tenure and opens the new one, linked as successor and predecessor", async () => {
  const base = snapshotFromFixtures();
  const dataset = datasetFor(base);
  const { snapshot, oldChair, newChair } = swapChair(base, "D66", 0, "2026-10-01", "2026-09-30");
  const state = {
    tk: { personMap: Object.fromEntries(base.rows.map((row) => [row.persoonId, `person:${slugify(row.name)}`])) },
  };
  const result = await plan(snapshot, dataset, { state });
  assert.equal(result.guard.allowed, true, result.guard.reasons.join(" | "));
  const closedTenure = result.closures.find((entry) => entry.entity === "tenures");
  assert.equal(closedTenure.record.person, `person:${slugify(oldChair.name)}`);
  assert.equal(closedTenure.record.position, "pos:fractievoorzitter-d66");
  assert.equal(closedTenure.record.end, "2026-09-30");
  const opened = result.openings.find((entry) => entry.entity === "tenures" && entry.record.position === "pos:fractievoorzitter-d66");
  assert.equal(opened.record.person, `person:${slugify(newChair.name)}`);
  assert.equal(opened.record.start, "2026-10-01");
  assert.equal(opened.record.predecessor, closedTenure.record.id);
  assert.equal(closedTenure.record.successor, opened.record.id);
  // the same people stay members of the same fractie: no membership change
  assert.equal(result.closures.filter((entry) => entry.entity === "memberships").length, 0);
  assert.equal(result.stats.closed, 1);
});

test("a backdated chair row is applied with its own Van date, not the cursor or the retrieval date", async () => {
  const base = snapshotFromFixtures();
  const dataset = datasetFor(base);
  // the Dekker case: a row that starts 06-08-2026 became visible only on 31-08-2026
  const { snapshot } = swapChair(base, "FVD", 0, "2026-08-06", "2026-08-05");
  const rows = snapshot.rows.map((row) => (row.fractie === "FVD" && row.functie === "Fractievoorzitter" ? { ...row, apiGewijzigdOp: "2026-08-31T10:04:20Z" } : row));
  const state = { tk: { personMap: Object.fromEntries(base.rows.map((row) => [row.persoonId, `person:${slugify(row.name)}`])) } };
  const result = await plan({ ...snapshot, rows }, dataset, { state });
  const opened = result.openings.find((entry) => entry.record.position === "pos:fractievoorzitter-fvd");
  assert.equal(opened.record.start, "2026-08-06");
  assert.equal(result.closures.find((entry) => entry.record.position === "pos:fractievoorzitter-fvd").record.end, "2026-08-05");
});

test("a new Voorzitter of the Tweede Kamer closes the old tenure and opens a new one at the same position", async () => {
  const base = snapshotFromFixtures();
  const dataset = datasetFor(base);
  const oldVoorzitter = base.presidium.find((row) => row.functie === "Voorzitter");
  const successor = base.rows.find((row) => row.functie === "Lid" && row.persoonId !== oldVoorzitter.persoonId);
  const presidium = [
    ...base.presidium.filter((row) => row !== oldVoorzitter),
    { ...oldVoorzitter, totEnMet: "2026-09-30", apiGewijzigdOp: "2026-10-01T10:00:00Z" },
    {
      id: "pres-new",
      persoonId: successor.persoonId,
      nummer: successor.nummer,
      name: successor.name,
      callName: successor.callName,
      initialen: successor.initialen,
      geboortedatum: successor.geboortedatum,
      functie: "Voorzitter",
      van: "2026-10-01",
      totEnMet: null,
      verwijderd: false,
      apiGewijzigdOp: "2026-10-01T10:00:00Z",
    },
  ];
  const state = { tk: { personMap: Object.fromEntries(base.rows.map((row) => [row.persoonId, `person:${slugify(row.name)}`])) } };
  const result = await plan({ ...base, presidium }, dataset, { state });
  const closed = result.closures.find((entry) => entry.record.position === "pos:voorzitter-tweede-kamer");
  assert.equal(closed.record.id, "tenure:voorzitter-tweede-kamer-oud");
  assert.equal(closed.record.end, "2026-09-30");
  const opened = result.openings.find((entry) => entry.record.position === "pos:voorzitter-tweede-kamer");
  assert.equal(opened.record.person, `person:${slugify(successor.name)}`);
  assert.equal(opened.record.start, "2026-10-01");
  assert.equal(opened.record.predecessor, closed.record.id);
});

function mergerScenario() {
  const after = snapshotFromFixtures();
  const closedRows = fx("tk-merger-closed-rows.json").value.map(normalizeFzpRow);
  // In the real data one GL-PvdA member (Lahlah) did not continue and one PRO member (Bolhuis) is new.
  const departed = closedRows.find((row) => !after.rows.some((open) => open.persoonId === row.persoonId));
  const newcomer = after.rows.find((row) => row.fractie === "PRO" && !closedRows.some((closed) => closed.persoonId === row.persoonId));
  const before = { ...after, rows: [...after.rows.filter((row) => row !== newcomer), { ...departed, totEnMet: null }] };
  const dataset = datasetFor(before, { relabel: (label) => (label === "PRO" ? "GroenLinks-PvdA" : label) });
  const glPvda = fx("tk-fractie-groenlinks-pvda.json").value.map(normalizeFractie);
  const state = {
    tk: { personMap: Object.fromEntries(before.rows.map((row) => [row.persoonId, `person:${slugify(row.name)}`])) },
  };
  return {
    snapshot: { ...after, rows: [...after.rows, ...closedRows], fracties: [...after.fracties, ...glPvda] },
    dataset,
    state,
    closedRows,
    departed,
    newcomer,
  };
}

test("the GroenLinks-PvdA to PRO merger of 09-06-2026 passes with at least 20 closures because a fractie changed", async () => {
  const { snapshot, dataset, state, newcomer } = mergerScenario();
  const result = await plan(snapshot, dataset, { state });
  assert.equal(result.guard.allowed, true, result.guard.reasons.join(" | "));
  assert.equal(result.guard.bulk, true);
  assert.equal(result.guard.event, "fractie-changed");
  assert.deepEqual(result.newFracties, ["PRO"]);
  assert.deepEqual(result.goneFracties, ["GroenLinks-PvdA"]);
  const memberClosures = result.closures.filter((entry) => entry.entity === "memberships");
  assert.ok(memberClosures.length >= 20, `closures ${memberClosures.length}`);
  assert.deepEqual(memberClosures.filter((entry) => entry.record.end !== "2026-06-09").map((entry) => [entry.record.person, entry.record.end, entry.record.fractie]), []);
  assert.ok(memberClosures.every((entry) => entry.record.fractie === "GroenLinks-PvdA"));
  const memberOpenings = result.openings.filter((entry) => entry.entity === "memberships");
  assert.equal(memberOpenings.length, 20);
  assert.ok(memberOpenings.every((entry) => entry.record.fractie === "PRO" && entry.record.start === "2026-06-10"));
  // the history is kept: a continuing member gets a new dated membership, the old one is closed, not rewritten
  assert.equal(memberOpenings.filter((entry) => /-20260610$/.test(entry.record.id)).length, 19);
  assert.equal(memberOpenings.find((entry) => entry.record.person === `person:${slugify(newcomer.name)}`).why, "new-member");
  assert.equal(result.stats.newPeople, 1);
  // the chair of the old fractie is closed and the chair of PRO opens at a new position
  const chairClosed = result.closures.find((entry) => entry.record.position === "pos:fractievoorzitter-groenlinks-pvda");
  assert.equal(chairClosed.record.end, "2026-06-09");
  assert.ok(result.positions.some((position) => position.id === "pos:fractievoorzitter-pro" && position.sources.length === 1));
  assert.ok(result.review.some((entry) => entry.kind === "bulk-event"));
  assert.ok(result.review.some((entry) => entry.kind === "new-fractie" && entry.text.includes("PRO")));
});

test("the same bulk closures are refused when no fractie changed and no election or cabinet event is recent", async () => {
  const snapshot = snapshotFromFixtures();
  const dataset = datasetFor(snapshot);
  // twenty members the source no longer lists, while the 150 seats are still full: a stale dataset, not an event
  const ghosts = Array.from({ length: 20 }, (_, index) => ({
    id: `membership:tweede-kamer-spook-${index}`,
    organization: "org:tweede-kamer",
    person: `person:spook-${index}`,
    seatNumber: null,
    fractie: "D66",
    start: "2021-03-31",
    end: null,
    source: OLD_SOURCE,
  }));
  dataset.memberships.push(...ghosts);
  dataset.people.push(...ghosts.map((ghost) => ({ id: ghost.person, slug: ghost.person.slice(7), name: `Spook ${ghost.person}`, sources: [OLD_SOURCE] })));
  const result = await plan(snapshot, dataset);
  assert.equal(result.guard.allowed, false);
  assert.match(result.guard.reasons[0], /20 sluitingen/);
  assert.equal(result.closures.filter((entry) => entry.entity === "memberships").length, 20);
});

test("a recent election day inside 60 days allows the same bulk closures", async () => {
  const snapshot = snapshotFromFixtures();
  const dataset = datasetFor(snapshot);
  const ghosts = Array.from({ length: 20 }, (_, index) => ({
    id: `membership:tweede-kamer-spook-${index}`,
    organization: "org:tweede-kamer",
    person: `person:spook-${index}`,
    seatNumber: null,
    fractie: "D66",
    start: "2021-03-31",
    end: null,
    source: OLD_SOURCE,
  }));
  dataset.memberships.push(...ghosts);
  dataset.people.push(...ghosts.map((ghost) => ({ id: ghost.person, slug: ghost.person.slice(7), name: `Spook ${ghost.person}`, sources: [OLD_SOURCE] })));
  const result = await plan(snapshot, dataset, { elections: [{ id: "election:tk-2026-09-16", date: "2026-09-16" }] });
  assert.equal(result.guard.allowed, true);
  assert.equal(result.guard.event, "election@2026-09-16");
  const old = await plan(snapshot, dataset, { elections: [{ id: "election:tk-2026-04-16", date: "2026-04-16" }] });
  assert.equal(old.guard.allowed, false);
});

test("a Fractie row that turned active inside 60 days counts as a fractie change even with the same labels", async () => {
  const snapshot = snapshotFromFixtures();
  const dataset = datasetFor(snapshot);
  const ghosts = Array.from({ length: 8 }, (_, index) => ({
    id: `membership:tweede-kamer-spook-${index}`,
    organization: "org:tweede-kamer",
    person: `person:spook-${index}`,
    seatNumber: null,
    fractie: "D66",
    start: "2021-03-31",
    end: null,
    source: OLD_SOURCE,
  }));
  dataset.memberships.push(...ghosts);
  dataset.people.push(...ghosts.map((ghost) => ({ id: ghost.person, slug: ghost.person.slice(7), name: `Spook ${ghost.person}`, sources: [OLD_SOURCE] })));
  const fracties = snapshot.fracties.map((fractie) => (fractie.afkorting === "Volt" ? { ...fractie, datumActief: "2026-09-01" } : fractie));
  const allowed = await plan({ ...snapshot, fracties }, dataset);
  assert.equal(allowed.guard.allowed, true);
  assert.equal(allowed.guard.event, "fractie-changed");
  const refused = await plan(snapshot, dataset);
  assert.equal(refused.guard.allowed, false);
});

test("149 seats are refused and nothing is planned", async () => {
  const snapshot = snapshotFromFixtures();
  const dataset = datasetFor(snapshot);
  const rows = snapshot.rows.slice(0, 149);
  const result = await plan({ ...snapshot, rows }, dataset);
  assert.equal(result.guard.allowed, false);
  assert.ok(result.guard.reasons.some((reason) => reason.startsWith("seat-total")));
  assert.deepEqual(result.memberships, []);
  assert.deepEqual(result.tenures, []);
  assert.deepEqual(result.people, []);
});

test("a duplicate seat number inside a fractie is refused", async () => {
  const snapshot = snapshotFromFixtures();
  const dataset = datasetFor(snapshot);
  const [first, second] = snapshot.rows.filter((row) => row.fractie === "D66");
  const rows = snapshot.rows.map((row) => (row === second ? { ...row, gewicht: first.gewicht } : row));
  const result = await plan({ ...snapshot, rows }, dataset);
  assert.equal(result.guard.allowed, false);
  assert.ok(result.guard.reasons.some((reason) => reason.startsWith("duplicate-seat")));
});

test("a fractie whose members differ from Fractie.AantalZetels is refused", async () => {
  const snapshot = snapshotFromFixtures();
  const dataset = datasetFor(snapshot);
  const fracties = snapshot.fracties.map((fractie) => (fractie.afkorting === "VVD" ? { ...fractie, aantalZetels: 21 } : fractie));
  const result = await plan({ ...snapshot, fracties }, dataset);
  assert.equal(result.guard.allowed, false);
  assert.ok(result.guard.reasons.some((reason) => reason.startsWith("fractie-count") && reason.includes("VVD")));
});

test("an ambiguous identity stops the plan instead of guessing", async () => {
  const snapshot = snapshotFromFixtures();
  const dataset = datasetFor(snapshot);
  const target = snapshot.rows.find((row) => row.functie === "Lid");
  dataset.people.push({ id: "person:dubbel", slug: "dubbel", name: target.name, sources: [OLD_SOURCE] });
  const result = await plan(snapshot, dataset);
  assert.equal(result.guard.allowed, false);
  assert.ok(result.guard.reasons.some((reason) => reason.startsWith("unresolved-person")));
});
