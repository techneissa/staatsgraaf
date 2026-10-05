import { test } from "node:test";
import assert from "node:assert/strict";

import { getPersonBySlug, getTenuresForPerson, getMembershipsForPerson } from "./data.ts";
import { sparsePerson } from "./entity-sparse.ts";

test("a person with no role gets a description from their source and occupation", () => {
  const person = getPersonBySlug("erik-akerboom");
  assert.ok(person);
  assert.equal(getTenuresForPerson(person.id).length + getMembershipsForPerson(person.id).length, 0);
  const sparse = sparsePerson(person);
  assert.match(sparse.description, /^Erik Akerboom: /);
  assert.match(sparse.description, /Nog geen functies of lidmaatschappen/);
  assert.ok(sparse.facts.sourceTitle !== null);
  assert.doesNotMatch(sparse.description, /wikidata/i);
});

test("a person whose only sources are general references names no source", () => {
  const person = getPersonBySlug("isabel-arends");
  assert.ok(person);
  const sparse = sparsePerson(person);
  assert.ok(sparse.facts.sourceTitle === null || !/Isabel Arends$/.test(sparse.facts.sourceTitle));
});
