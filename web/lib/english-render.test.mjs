import { test } from "node:test";
import assert from "node:assert/strict";

import { localizeCredit } from "./format.ts";
import { vacancySeatCounts } from "./changes.ts";

test("a portrait credit changes only its fixed words in English", () => {
  const credit = "Foto: Tweede Kamer der Staten-Generaal, CC0 1.0, via het Open Data Portaal van de Tweede Kamer";
  assert.equal(localizeCredit(credit, "nl"), credit);
  assert.equal(
    localizeCredit(credit, "en"),
    "Photo: Tweede Kamer der Staten-Generaal, CC0 1.0, via the Open Data Portal of the Tweede Kamer",
  );
  assert.equal(localizeCredit("Foto: Ter-burg, CC-BY-4.0, via Wikimedia Commons", "en"), "Photo: Ter-burg, CC-BY-4.0, via Wikimedia Commons");
  assert.equal(localizeCredit("Wapen: Arch, publiek-domein, via Wikimedia Commons", "en"), "Coat of arms: Arch, public domain, via Wikimedia Commons");
  assert.equal(localizeCredit("Wapen: auteur niet vermeld, publiek-domein, via Wikimedia Commons", "en"), "Coat of arms: author not stated, public domain, via Wikimedia Commons");
  assert.equal(localizeCredit("Logo: getoond vanaf rijksoverheid.nl", "en"), "Logo: shown from rijksoverheid.nl");
  assert.equal(localizeCredit("Wapen van Gemeente Utrecht: Arch, publiek-domein, via Wikimedia Commons", "en"), "Coat of arms of Gemeente Utrecht: Arch, public domain, via Wikimedia Commons");
  assert.equal(localizeCredit("Logo van Tweede Kamer der Staten-Generaal: getoond vanaf tweedekamer.nl", "en"), "Logo of Tweede Kamer der Staten-Generaal: shown from tweedekamer.nl");
  assert.equal(localizeCredit("Logo: auteursrecht voorbehouden, te zien op rechtspraak.nl", "en"), "Logo: copyright reserved, see rechtspraak.nl");
});

test("vacancy seat counts come from the record, not from free text", () => {
  const change = { kind: "vacancy", out: { label: "4 van 5 zetels vervuld" }, in: { label: "1 vacante zetel" } };
  assert.deepEqual(vacancySeatCounts(change), { filled: 4, seats: 5, vacant: 1 });
  assert.equal(vacancySeatCounts({ ...change, out: { label: "iets anders" } }), null);
  assert.equal(vacancySeatCounts({ ...change, kind: "appointment" }), null);
});
