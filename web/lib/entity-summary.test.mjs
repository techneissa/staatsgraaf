import { test } from "node:test";
import assert from "node:assert/strict";

import { getOrganizationById, getPersonById, getPositionById } from "./data.ts";
import { organizationSummary, personSummary, positionSummary } from "./entity-summary.ts";
import { careerYears } from "./careers.ts";
import { descriptionHash } from "./description-translations.ts";
import { descriptionSourceHash } from "../../shared/description-translation-hash.mjs";

test("the King's summary names his office and the date", () => {
  const person = getPersonById("person:willem-alexander");
  assert.ok(person);
  const summary = personSummary(person);
  assert.ok(summary);
  assert.match(summary.nl, /^Koning der Nederlanden sinds \d+ april 2013$/);
  assert.match(summary.en, /since \d+ April 2013$/);
});

test("a Kamerlid's summary names the chamber and the party", () => {
  const person = getPersonById("person:geert-wilders");
  assert.ok(person);
  const summary = personSummary(person);
  assert.ok(summary);
  assert.match(summary.nl, /^Tweede Kamerlid voor de PVV/);
});

test("a ministry's summary says where it sits and never repeats itself", () => {
  const finance = getOrganizationById("org:ministerie-van-financien");
  assert.ok(finance);
  const summary = organizationSummary(finance);
  assert.ok(summary);
  assert.match(summary.nl, /^Ministerie in de rijksoverheid/);
  const curacao = getOrganizationById("org:ministerie-financien-curacao");
  assert.ok(curacao);
  assert.equal(organizationSummary(curacao)?.nl, "Ministerie van Curaçao");
});

test("a position's summary names the holder", () => {
  const position = getPositionById("pos:koning");
  assert.ok(position);
  assert.match(positionSummary(position)?.nl ?? "", /^Bekleed door Willem-Alexander sinds/);
});

test("career years read as a span, an open end or a single year", () => {
  assert.deepEqual(careerYears("2017-03-01", "2021-05-01", false), { nl: "2017 – 2021", en: "2017 – 2021" });
  assert.deepEqual(careerYears("2023-01-01", null, true), { nl: "sinds 2023", en: "since 2023" });
  assert.deepEqual(careerYears("2019", "2019", false), { nl: "2019", en: "2019" });
  assert.equal(careerYears(null, null, false), null);
});

test("the description hash agrees with the shared contract", () => {
  for (const text of ["", "Ministerie van het land Curaçao.", "Het ministerie van Financiën beheert de rijksfinanciën."]) {
    assert.equal(descriptionHash(text), descriptionSourceHash(text));
  }
});
