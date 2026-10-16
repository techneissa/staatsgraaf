import { test } from "node:test";
import assert from "node:assert/strict";

import {
  commissieRole,
  compareBySurname,
  compareCommissieHolders,
  descriptionDateConflicts,
  holderState,
  isGenericOrganization,
  sortCareerNewestFirst,
  keyHolderRank,
  nameWithoutTitles,
  partyRoleGroup,
  roleLabel,
  shortRole,
  positionPageTitle,
  sparsePersonDescription,
  surnameKey,
} from "./entity-page.ts";

test("titles and initials drop out of a name", () => {
  assert.deepEqual(nameWithoutTitles("Bgen (b.d.) drs. A.J.A. Beukering"), ["Beukering"]);
  assert.deepEqual(nameWithoutTitles("dr. Roovers"), ["Roovers"]);
  assert.deepEqual(nameWithoutTitles("Tom van der Lee"), ["Tom", "van", "der", "Lee"]);
});

test("the surname key ignores particles and titles", () => {
  assert.equal(surnameKey("Tom van der Lee"), "lee");
  assert.equal(surnameKey("van Hattem"), "hattem");
  assert.equal(surnameKey("Bgen (b.d.) drs. A.J.A. Beukering"), "beukering");
  assert.equal(surnameKey("Aukje Treep-Van Hoeckel"), "treep-van hoeckel");
  assert.equal(surnameKey("Maria Corina Anna Vellinga-Beemsterboer"), "vellinga-beemsterboer");
  assert.equal(surnameKey("Anne-Marijke Podt"), "podt");
  assert.equal(surnameKey("Madonna"), "madonna");
});

test("committee members sort by surname, not by title", () => {
  const names = ["dr. van Toorenburg", "Bgen (b.d.) drs. A.J.A. Beukering", "van Hattem", "dr. Roovers", "drs. van der Goot"];
  const sorted = [...names].sort(compareBySurname);
  assert.deepEqual(sorted, ["Bgen (b.d.) drs. A.J.A. Beukering", "drs. van der Goot", "van Hattem", "dr. Roovers", "dr. van Toorenburg"]);
});

test("chair and vice-chair come first, marked by title", () => {
  assert.equal(commissieRole("Voorzitter Eerste Kamer commissie BIZA"), "chair");
  assert.equal(commissieRole("Ondervoorzitter Eerste Kamer commissie BIZA"), "vice");
  assert.equal(commissieRole("Lid Commissie voor Binnenlandse Zaken"), "member");
  const rows = [
    { role: "member", name: "A. Zee" },
    { role: "vice", name: "B. Meijer" },
    { role: "chair", name: "C. Lagas" },
    { role: "member", name: "D. Aa" },
  ];
  assert.deepEqual(
    rows.sort(compareCommissieHolders).map((row) => row.name),
    ["C. Lagas", "B. Meijer", "D. Aa", "A. Zee"],
  );
});

test("key holders rank ministers before members", () => {
  assert.ok(keyHolderRank("Minister van Financiën") < keyHolderRank("Staatssecretaris van Financiën"));
  assert.ok(keyHolderRank("Burgemeester van Amsterdam") < keyHolderRank("Lid Gemeenteraad"));
  assert.ok(keyHolderRank("Voorzitter Tweede Kamer") < keyHolderRank("Voorzitter Vaste commissie voor Financiën"));
});

test("party groups follow the position title", () => {
  assert.equal(partyRoleGroup("Fractievoorzitter D66"), "fractievoorzitters");
  assert.equal(partyRoleGroup("Staatssecretaris van Financiën"), "bewindspersonen");
  assert.equal(partyRoleGroup("Burgemeester van Ameland"), "burgemeesters");
  assert.equal(partyRoleGroup("Lid Vaste commissie voor Financiën"), "anderen");
});

test("a shared title gets its body without repeating it", () => {
  const base = { bodySubtype: "ministerie" };
  assert.equal(positionPageTitle({ title: "Minister van Financiën", ambiguous: true, bodyName: "Ministerie van Financiën", ...base }), "Minister van Financiën · Ministerie van Financiën");
  assert.equal(positionPageTitle({ title: "Burgemeester", ambiguous: true, bodyName: "Gemeente Amsterdam", bodySubtype: "gemeente" }), "Burgemeester van Amsterdam");
  assert.equal(positionPageTitle({ title: "Minister van Financiën", ambiguous: false, bodyName: "Ministerie van Financiën", ...base }), "Minister van Financiën");
  assert.equal(positionPageTitle({ title: "Burgemeester van Amsterdam", ambiguous: true, bodyName: "Gemeente Amsterdam", bodySubtype: "gemeente" }), "Burgemeester van Amsterdam");
});

test("a sparse person description names only what the data holds", () => {
  const text = sparsePersonDescription({
    name: "Erik Akerboom",
    careerTitles: ["ambtenaar"],
    sourceTitle: "Directoraat-generaal AIVD",
    sourceOrganizations: [],
    hasWikipedia: true,
  });
  assert.match(text, /^Erik Akerboom: Beroep: ambtenaar\. Genoemd in de bron "Directoraat-generaal AIVD"\./);
  assert.match(text, /Nog geen functies of lidmaatschappen/);
});

test("a short role drops the body", () => {
  assert.equal(shortRole("Voorzitter Commissie voor Binnenlandse Zaken (BIZA)"), "Voorzitter");
  assert.equal(shortRole("Minister van Financiën"), "Minister");
  assert.equal(shortRole("Staatssecretaris Herstel Toeslagen"), "Staatssecretaris Herstel Toeslagen");
  assert.equal(shortRole("Lid Gemeenteraad"), "Lid");
});

test("a caption role does not hang an open parenthesis", () => {
  assert.equal(roleLabel("Procureur-generaal (lid van het College van procureurs-generaal)"), "Procureur-generaal");
  assert.equal(roleLabel("Voorzitter van het College van procureurs-generaal"), "Voorzitter");
  assert.equal(roleLabel("Minister van Financiën"), "Minister");
});

test("a career reads newest first by the latest year shown", () => {
  const item = (id, nl, current = false) => ({ id, years: nl === null ? null : { nl }, current });
  const sorted = sortCareerNewestFirst([
    item("a", "2018"),
    item("b", "2023 – 2026"),
    item("c", "2026"),
    item("d", "2024"),
    item("e", "2023"),
    item("f", null),
    item("g", "sinds 2023", true),
  ]);
  assert.deepEqual(sorted.map((entry) => entry.id), ["g", "c", "b", "d", "e", "a", "f"]);
});

test("generic organisation words are recognised", () => {
  assert.equal(isGenericOrganization("fractie"), true);
  assert.equal(isGenericOrganization("Fractie "), true);
  assert.equal(isGenericOrganization("Tweede Kamer"), false);
  assert.equal(isGenericOrganization(null), false);
});

test("a position without tenures is unknown, not vacant", () => {
  const base = { currentHolders: 0, lastEnded: null, vacancy: false, memberCount: 0 };
  assert.deepEqual(holderState(base), { kind: "unknown" });
  assert.deepEqual(holderState({ ...base, vacancy: true }), { kind: "vacant" });
  assert.deepEqual(holderState({ ...base, lastEnded: "2025-01-01" }), { kind: "ended", date: "2025-01-01" });
  assert.deepEqual(holderState({ ...base, memberCount: 150 }), { kind: "members", count: 150 });
  assert.deepEqual(holderState({ ...base, currentHolders: 2, vacancy: true }), { kind: "holders" });
});

test("a description date that no structured date matches is reported", () => {
  const text = "Fractievoorzitter sinds 23-02-2026, toen zij zich afsplitste. Is Kamerlid sinds 12-11-2025.";
  assert.deepEqual(descriptionDateConflicts(text, ["2026-02-24", "2025-11-12", null]), ["2026-02-23"]);
  assert.deepEqual(descriptionDateConflicts("Geen datum.", ["2026-02-24"]), []);
  assert.deepEqual(descriptionDateConflicts(text, ["2026-02-23T00:00:00Z", "2025-11-12"]), []);
});
