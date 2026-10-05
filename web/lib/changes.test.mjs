import { test } from "node:test";
import assert from "node:assert/strict";

import { groupChangesByPerson } from "./changes.ts";
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
