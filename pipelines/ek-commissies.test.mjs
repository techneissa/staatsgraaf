import { test } from "node:test";
import assert from "node:assert/strict";

import { parseRoster, planCommittees } from "./ek-commissies.mjs";

// Two items in the markup eerstekamer.nl uses on a committee page (trimmed).
const PAGE = `<h2><a id="p1"></a>Leden </h2> <ul class="leden">
<li class="persoon grid-x nowr"> <a href="/persoon/prof_dr_e_b_van_apeldoorn_sp"> <div class="nowr grid-x cell pasfoto_tekst_k1"> <div class="persoon_foto"><img src="/x" alt="foto"/> </div> <div class="persoon_bijschrift"><div><div class="naam">prof. dr. E.B. van Apeldoorn</div></div><div>SP</div></div> </div> <div class="cell pasfoto_tekst_k2"> <div>Anci&euml;nniteit: 4127 dagen</div> </div> </a> </li>
<li class="persoon grid-x nowr"> <a href="/persoon/w_t_van_ballekom_vvd"> <div class="nowr grid-x cell pasfoto_tekst_k1"> <div class="persoon_foto"><img src="/y" alt="foto"/> </div> <div class="persoon_bijschrift"><div><div class="naam">W.T. van Ballekom</div></div><div>VVD</div><div>voorzitter</div></div> </div> <div class="cell pasfoto_tekst_k2"> <div>Anci&euml;nniteit: 2664 dagen</div> </div> </a> </li>
</ul>`;

test("a committee page yields its members with fractie and role", () => {
  assert.deepEqual(parseRoster(PAGE), [
    { slug: "prof_dr_e_b_van_apeldoorn_sp", name: "prof. dr. E.B. van Apeldoorn", fractie: "SP", role: null },
    { slug: "w_t_van_ballekom_vvd", name: "W.T. van Ballekom", fractie: "VVD", role: "voorzitter" },
  ]);
  assert.deepEqual(parseRoster("<p>no list</p>"), []);
});

const committee = {
  id: "org:eerste-kamer-commissie-fin",
  name: "Commissie voor Financiën",
  sources: [{ source: "src:ek-commissie-fin", retrieved: "2026-09-17", confidence: "high" }],
  legalSource: null,
};

test("positions already on record are kept as they are", () => {
  const chair = { id: "pos:voorzitter-eerste-kamer-commissie-fin", organization: committee.id, type: "commission", title: "Voorzitter Commissie voor Financiën (FIN)" };
  const plan = planCommittees({
    committees: [committee],
    rosters: new Map([[committee.id, parseRoster(PAGE)]]),
    personBySlug: new Map([["w_t_van_ballekom_vvd", "person:w-t-van-ballekom"]]),
    positions: [chair],
    tenures: [],
    retrieved: "2026-09-26",
  });
  assert.deepEqual(plan.positions.find((position) => position.id === chair.id), chair);
  assert.equal(plan.positions.find((position) => position.id === "pos:lid-eerste-kamer-commissie-fin").title, "Lid Commissie voor Financiën (FIN)");
});

test("members become sourced tenures with an unknown start; a chair also gets the chair's post", () => {
  const plan = planCommittees({
    committees: [committee],
    rosters: new Map([[committee.id, parseRoster(PAGE)]]),
    personBySlug: new Map([
      ["prof_dr_e_b_van_apeldoorn_sp", "person:e-b-van-apeldoorn"],
      ["w_t_van_ballekom_vvd", "person:w-t-van-ballekom"],
    ]),
    positions: [],
    tenures: [],
    retrieved: "2026-09-26",
  });
  assert.deepEqual(plan.positions.map((position) => [position.id, position.type, position.seatsCount]), [
    ["pos:lid-eerste-kamer-commissie-fin", "commission", 2],
    ["pos:voorzitter-eerste-kamer-commissie-fin", "dept_head", 1],
  ]);
  assert.deepEqual(plan.tenures.map((tenure) => tenure.id), [
    "tenure:lid-eerste-kamer-commissie-fin-e-b-van-apeldoorn",
    "tenure:lid-eerste-kamer-commissie-fin-w-t-van-ballekom",
    "tenure:voorzitter-eerste-kamer-commissie-fin-w-t-van-ballekom",
  ]);
  for (const tenure of plan.tenures) {
    assert.equal(tenure.start, null);
    assert.deepEqual(tenure.source, { source: "src:ek-commissie-fin", retrieved: "2026-09-26", confidence: "high" });
  }
});

test("a member no longer listed is closed on the retrieval date; an unmatched member is reported, not guessed", () => {
  const old = { id: "tenure:lid-eerste-kamer-commissie-fin-gone", person: "person:gone", position: "pos:lid-eerste-kamer-commissie-fin", start: null, end: null };
  const other = { id: "tenure:other", person: "person:x", position: "pos:other", start: "2020-01-01", end: null };
  const plan = planCommittees({
    committees: [committee],
    rosters: new Map([[committee.id, parseRoster(PAGE)]]),
    personBySlug: new Map([["w_t_van_ballekom_vvd", "person:w-t-van-ballekom"]]),
    positions: [{ id: "pos:lid-eerste-kamer-commissie-fin", organization: committee.id }, { id: "pos:other", organization: "org:other" }],
    tenures: [old, other],
    retrieved: "2026-09-26",
  });
  assert.deepEqual(plan.closed, [old.id]);
  assert.equal(plan.tenures.find((tenure) => tenure.id === old.id).end, "2026-09-26");
  assert.deepEqual(plan.tenures.find((tenure) => tenure.id === "tenure:other"), other);
  assert.deepEqual(plan.unmatched, ["org:eerste-kamer-commissie-fin: prof. dr. E.B. van Apeldoorn (/persoon/prof_dr_e_b_van_apeldoorn_sp)"]);
});
