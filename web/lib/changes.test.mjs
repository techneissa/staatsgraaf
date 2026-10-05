import { test } from "node:test";
import assert from "node:assert/strict";

import { findSeatFiller, groupChangesByPerson } from "./changes.ts";
import { getDataset } from "./data.ts";

const source = { source: "src:test", retrieved: "2026-10-01" };

function change(id, date, kind, extra = {}) {
  return { id, date, kind, position: null, organization: null, summary: `Samenvatting ${id}`, source, ...extra };
}

function realPersonId() {
  return getDataset().people[0].id;
}

test("two changes for one person group together, newest first", () => {
  const person = realPersonId();
  const older = change("c1", "2026-08-01", "appointment", { position: "pos:x", in: { tenure: null, person, label: "A" } });
  const newer = change("c2", "2026-09-01", "departure", { position: "pos:x", out: { tenure: null, person, label: "A" } });
  const groups = groupChangesByPerson([older, newer]);
  assert.equal(groups.length, 1);
  assert.equal(groups[0].kind, "person");
  assert.equal(groups[0].personId, person);
  assert.deepEqual(groups[0].events.map((event) => event.id), ["c2", "c1"]);
});

test("a vacancy makes a seat group keyed by position", () => {
  const vacancy = change("c3", "2026-09-10", "vacancy", { position: "pos:seat" });
  const groups = groupChangesByPerson([vacancy]);
  assert.equal(groups.length, 1);
  assert.equal(groups[0].kind, "seat");
  assert.equal(groups[0].personId, null);
  assert.equal(groups[0].positionId, "pos:seat");
  assert.equal(groups[0].key, "seat:pos:seat");
});

test("an unknown person id never throws and falls back to a seat or unknown group", () => {
  const ghost = { tenure: null, person: "person:bestaat-niet", label: "Spook" };
  const withPosition = change("c4", "2026-09-05", "appointment", { position: "pos:p", in: ghost });
  const without = change("c5", "2026-09-04", "departure", { out: ghost });
  const groups = groupChangesByPerson([withPosition, without]);
  assert.equal(groups.length, 2);
  assert.equal(groups[0].key, "seat:pos:p");
  assert.equal(groups[1].key, "unknown:c5");
  assert.equal(groups[1].personId, null);
});

test("groups sort by their newest event, newest first", () => {
  const [a, b] = getDataset().people;
  const mk = (id, date, p) => change(id, date, "appointment", { in: { tenure: null, person: p.id, label: p.name } });
  const groups = groupChangesByPerson([mk("c6", "2026-07-01", a), mk("c7", "2026-09-01", b), mk("c8", "2026-08-01", a)]);
  assert.deepEqual(groups.map((group) => group.personId), [b.id, a.id]);
});

test("a seat is filled only by a later appointment to the same position", () => {
  const person = realPersonId();
  const vacancy = change("c9", "2026-09-10", "vacancy", { position: "pos:seat" });
  const later = change("c10", "2026-09-20", "appointment", { position: "pos:seat", in: { tenure: null, person, label: "A" } });
  const earlier = change("c11", "2026-09-01", "appointment", { position: "pos:seat", in: { tenure: null, person, label: "A" } });
  const other = change("c12", "2026-09-25", "appointment", { position: "pos:elders", in: { tenure: null, person, label: "A" } });
  const seat = groupChangesByPerson([vacancy]).find((group) => group.kind === "seat");
  assert.equal(findSeatFiller(seat, groupChangesByPerson([vacancy, earlier, other])), null);
  assert.equal(findSeatFiller(seat, groupChangesByPerson([vacancy, later, other]))?.id, "c10");
});

import {
  countChangesByFilter,
  countEntries,
  getChangeReferenceDate,
  groupChangesIntoEntries,
  isInWindow,
} from "./changes.ts";
import { countItems, matchesChangeFilter, sortActing, visibleLimit } from "./change-feed.ts";

const withPerson = (id, date, kind, person, position = "pos:x") =>
  change(id, date, kind, {
    position,
    ...(kind === "departure" ? { out: { tenure: null, person, label: "A" } } : { in: { tenure: null, person, label: "A" } }),
  });

test("one person's changes on one day fold into one entry that keeps every change", () => {
  const changes = [
    withPerson("a1", "2026-09-09", "appointment", "person:a", "pos:1"),
    withPerson("b1", "2026-09-09", "appointment", "person:b", "pos:2"),
    withPerson("a2", "2026-09-09", "appointment", "person:a", "pos:3"),
    withPerson("a3", "2026-09-09", "appointment", "person:a", "pos:4"),
  ];
  const entries = groupChangesIntoEntries(changes);
  assert.equal(entries.length, 2);
  assert.deepEqual(entries[0].changes.map((item) => item.id), ["a1", "a2", "a3"]);
  assert.equal(entries[0].personId, "person:a");
  assert.deepEqual(entries[1].changes.map((item) => item.id), ["b1"]);
});

test("the same person on another day, or in another role, stays a separate entry", () => {
  const changes = [
    withPerson("a1", "2026-09-09", "appointment", "person:a"),
    withPerson("a2", "2026-09-08", "appointment", "person:a"),
    withPerson("a3", "2026-09-09", "departure", "person:a"),
  ];
  assert.equal(groupChangesIntoEntries(changes).length, 3);
});

test("a vacancy never bundles and keeps its place in the order", () => {
  const changes = [
    change("v1", "2026-09-19", "vacancy", { position: "pos:seat" }),
    change("v2", "2026-09-19", "vacancy", { position: "pos:seat" }),
    withPerson("a1", "2026-09-09", "appointment", "person:a"),
  ];
  const entries = groupChangesIntoEntries(changes);
  assert.deepEqual(entries.map((entry) => entry.key), ["v1", "v2", "a1"]);
});

test("counts give the changes and the different people", () => {
  const entries = groupChangesIntoEntries([
    withPerson("a1", "2026-09-09", "appointment", "person:a"),
    withPerson("a2", "2026-09-09", "appointment", "person:a"),
    withPerson("b1", "2026-09-09", "appointment", "person:b"),
    change("v1", "2026-09-19", "vacancy", { position: "pos:seat" }),
  ]);
  assert.deepEqual(countEntries(entries), { changes: 4, people: 2 });
});

test("every chip counts the changes shown under its own label", () => {
  const tenure = getDataset().tenures.find((item) => item.acting === true || item.entryMode === "waarnemend");
  assert.ok(tenure, "the dataset has an acting tenure");
  const acting = change("x1", "2026-09-10", "appointment", { position: "pos:y", in: { tenure: tenure.id, person: "person:c", label: "C" } });
  const entries = groupChangesIntoEntries([
    withPerson("a1", "2026-09-09", "appointment", "person:a"),
    withPerson("a2", "2026-09-09", "appointment", "person:a"),
    acting,
    withPerson("d1", "2026-09-08", "departure", "person:d"),
    change("v1", "2026-09-19", "vacancy", { position: "pos:seat" }),
  ]);
  assert.deepEqual(countChangesByFilter(entries), { all: 5, appointment: 2, acting: 1, departure: 1, vacancy: 1 });
  const shown = (filter) =>
    entries.filter((entry) => matchesChangeFilter(entry.displayKind, filter)).reduce((sum, entry) => sum + entry.changes.length, 0);
  for (const filter of ["all", "appointment", "acting", "departure", "vacancy"]) {
    assert.equal(shown(filter), countChangesByFilter(entries)[filter], filter);
  }
});

test("long lists show ten, and everything when no more than three would hide", () => {
  assert.equal(visibleLimit(11), 11);
  assert.equal(visibleLimit(13), 13);
  assert.equal(visibleLimit(14), 10);
  assert.equal(visibleLimit(51), 10);
  assert.equal(visibleLimit(4), 4);
  assert.equal(visibleLimit(0), 0);
});

test("acting officials sort by start date newest first, undated last, or by name", () => {
  const list = [
    { start: "2025-04-14", name: "Bos" },
    { start: "2026-08-01", name: "Zwart" },
    { start: null, name: "Aal" },
    { start: "2025-04-14", name: "Aap" },
  ];
  const key = (item) => item;
  assert.deepEqual(sortActing(list, "newest", key).map((item) => item.name), ["Zwart", "Aap", "Bos", "Aal"]);
  assert.deepEqual(sortActing(list, "name", key).map((item) => item.name), ["Aal", "Aap", "Bos", "Zwart"]);
  assert.equal(list[0].name, "Bos");
});

test("windows count from the build day, not from the dataset date", () => {
  const now = new Date("2026-10-05T10:00:00Z");
  const reference = getChangeReferenceDate(now);
  assert.equal(reference, "2026-10-05");
  assert.equal(isInWindow("2026-09-19", 7, reference), false);
  assert.equal(isInWindow("2026-09-19", 30, reference), true);
  assert.equal(isInWindow("2026-09-06", 30, reference), true);
  assert.equal(isInWindow("2026-09-05", 30, reference), false);
});

test("countItems counts changes and distinct people, vacancies add no person", () => {
  assert.deepEqual(
    countItems([
      { changes: 6, personId: "person:a" },
      { changes: 1, personId: "person:a" },
      { changes: 1, personId: null },
    ]),
    { changes: 8, people: 1 },
  );
  assert.deepEqual(countItems([]), { changes: 0, people: 0 });
});

import { groupEntriesByDay } from "./changes.ts";

test("entries group by day, newest day first", () => {
  const entries = groupChangesIntoEntries([
    withPerson("a1", "2026-09-09", "appointment", "person:a"),
    withPerson("b1", "2026-09-19", "appointment", "person:b"),
    withPerson("c1", "2026-09-09", "appointment", "person:c"),
  ]);
  const days = groupEntriesByDay(entries);
  assert.deepEqual(days.map((day) => day.date), ["2026-09-19", "2026-09-09"]);
  assert.deepEqual(days[1].entries.map((entry) => entry.key), ["a1", "c1"]);
});
