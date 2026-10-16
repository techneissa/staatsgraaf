import { test } from "node:test";
import assert from "node:assert/strict";

import { currentPersonOffices } from "./person-offices.ts";
import { getMembershipsForPerson, getPersonById, getTenuresForPerson } from "./data.ts";

test("van Campen's header offices are speaker first, then the Kamer seat", () => {
  const person = getPersonById("person:anthony-albertus-hermance-van-campen");
  assert.ok(person);
  const offices = currentPersonOffices(getTenuresForPerson(person.id), getMembershipsForPerson(person.id));
  assert.equal(offices[0]?.position.title, "Voorzitter van de Tweede Kamer der Staten-Generaal");
  assert.ok(offices.some((office) => /^Lid van de Tweede Kamer/.test(office.position.title)));
});
