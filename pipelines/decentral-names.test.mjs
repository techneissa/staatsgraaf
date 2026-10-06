import { test } from "node:test";
import assert from "node:assert/strict";

import { holderMatchesPerson, parseHolderName } from "./decentral-names.mjs";

function parsed(raw) {
  const p = parseHolderName(raw);
  return { display: p.display, initials: p.initials.join(""), surname: p.surnameTokens.join(" "), given: p.givenFirst };
}

test("honorifics, titles, suffix titles and nicknames are stripped; initials and surname are kept", () => {
  assert.deepEqual(parsed("Dhr. mr. J.H.C. van Zanen"), { display: "J.H.C. van Zanen", initials: "jhc", surname: "van zanen", given: null });
  assert.deepEqual(parsed("Mw. drs. M.C. Starmans - Gelijns"), { display: "M.C. Starmans-Gelijns", initials: "mc", surname: "starmans gelijns", given: null });
  assert.deepEqual(parsed("mr. drs. A.J.G. (Toine) Poppelaars"), { display: "A.J.G. Poppelaars", initials: "ajg", surname: "poppelaars", given: null });
  assert.deepEqual(parsed("Mw. drs. R.W.J. Melissant-Briene MSM"), { display: "R.W.J. Melissant-Briene", initials: "rwj", surname: "melissant briene", given: null });
  assert.deepEqual(parsed("mr. A.Th.H. van Dijk"), { display: "A.Th.H. van Dijk", initials: "ath", surname: "van dijk", given: null });
  assert.deepEqual(parsed("N. Versteeg (Provinciesecretaris / Algemeen Directeur)"), { display: "N. Versteeg", initials: "n", surname: "versteeg", given: null });
  assert.deepEqual(parsed("Dhr. J. Chr. van der Hoek MBA"), { display: "J.Chr. van der Hoek", initials: "jc", surname: "van der hoek", given: null });
});

test("a form with no initials: a given name in front of the surname, or just a surname with a double name", () => {
  assert.deepEqual(parsed("Joris Bengevoord"), { display: "Joris Bengevoord", initials: "", surname: "bengevoord", given: "j" });
  assert.deepEqual(parsed("Arthur van Dijk"), { display: "Arthur van Dijk", initials: "", surname: "van dijk", given: "a" });
  assert.deepEqual(parsed("Dhr. Pille"), { display: "Pille", initials: "", surname: "pille", given: null });
  assert.deepEqual(parsed("Mw. Gräper-van Koolwijk"), { display: "Gräper-van Koolwijk", initials: "", surname: "graper van koolwijk", given: null });
});

test("the holder of the same position matches on surname, also with a call name and a partner name on one side", () => {
  const person = (name, aliases = []) => ({ name, aliases });
  assert.equal(holderMatchesPerson(parseHolderName("Dhr. W.H.J.M. van der Loo"), person("Hein van der Loo")), true);
  assert.equal(holderMatchesPerson(parseHolderName("Mw. A.A.H.C.M. van Extel-van Katwijk"), person("Anke van Extel-van Katwijk")), true);
  assert.equal(holderMatchesPerson(parseHolderName("Mw. W.J.F. van der Rijt-van der Kruis"), person("Wilma van der Rijt")), true);
  assert.equal(holderMatchesPerson(parseHolderName("Mw. Gräper-van Koolwijk"), person("Fleur Gräper")), true);
  assert.equal(holderMatchesPerson(parseHolderName("Dhr. Pille"), person("Jolanda de Witte")), false);
  assert.equal(holderMatchesPerson(parseHolderName("Mw. mr. drs. C.M. Sjerps"), person("Ina Sjerps", ["Mw. mr. drs. C.M. Sjerps"])), true);
});

test("a search across people is strict: the same surname and an initial that fits a given name or the call name", () => {
  const person = (name) => ({ name, aliases: [] });
  assert.equal(holderMatchesPerson(parseHolderName("Dhr. N. Mol"), person("Nanning Mol"), { pool: true }), true);
  assert.equal(holderMatchesPerson(parseHolderName("Dhr. W.H.J.M. van der Loo"), person("Hein van der Loo"), { pool: true }), true, "H is one of the initials");
  assert.equal(holderMatchesPerson(parseHolderName("Dhr. P. Mol"), person("Nanning Mol"), { pool: true }), false);
  assert.equal(holderMatchesPerson(parseHolderName("Dhr. Jansen"), person("Jan Jansen"), { pool: true }), false, "no initials, no pool match");
  assert.equal(holderMatchesPerson(parseHolderName("Mw. Gräper-van Koolwijk"), person("Fleur Gräper"), { pool: true }), false, "a partner name is not exact");
});
