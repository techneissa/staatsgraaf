import { test } from "node:test";
import assert from "node:assert/strict";

import { partyPeople } from "./entity-party.ts";

test("FNP lists the people the dataset links to it", () => {
  const groups = partyPeople("FNP");
  const names = groups.flatMap((group) => group.people.map((entry) => entry.person.name));
  assert.ok(names.length >= 2, `expected at least two FNP people, got ${names.join(", ")}`);
  assert.ok(names.some((name) => /Willemsma/.test(name)));
  assert.ok(groups.some((group) => group.group === "burgemeesters"));
});

test("a person with two senior roles is listed once, under the more senior group", () => {
  const groups = partyPeople("D66");
  const seen = new Map();
  for (const group of groups) {
    for (const entry of group.people) {
      assert.ok(!seen.has(entry.person.id), `${entry.person.name} listed in ${seen.get(entry.person.id)} and ${group.group}`);
      seen.set(entry.person.id, group.group);
    }
  }
  assert.ok(groups.some((group) => group.group === "bewindspersonen"));
});

test("people already shown as chamber members stay out of the others", () => {
  const all = partyPeople("D66");
  const others = all.find((group) => group.group === "anderen");
  const skip = new Set((others?.people ?? []).map((entry) => entry.person.id));
  const reduced = partyPeople("D66", skip);
  assert.ok(!reduced.some((group) => group.group === "anderen"));
});
