import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  csvObjects,
  currentTooi,
  dutchDateToIso,
  parseCbsRegions,
  parseCommissarissen,
  parseCouncilSeats,
  parseCsv,
  parseRegisterBodies,
  parseRegisterPeople,
  parseTooiSet,
  pickCbsTable,
} from "./decentral-parse.mjs";

const fx = (name) => readFileSync(new URL(`./fixtures/decentral/${name}`, import.meta.url), "utf8");

test("the CSV parser keeps quoted semicolons, doubled quotes and newlines inside a cell", () => {
  const rows = parseCsv('a;b;c\r\n"x;1";"he said ""hi""";"two\nlines"\n"last";;\n');
  assert.deepEqual(rows, [["a", "b", "c"], ["x;1", 'he said "hi"', "two\nlines"], ["last", "", ""]]);
  assert.deepEqual(csvObjects("n;m\n1;2\n"), [{ n: "1", m: "2" }]);
});

test("dd-mm-yyyy becomes ISO, anything else null", () => {
  assert.equal(dutchDateToIso("01-01-1998"), "1998-01-01");
  assert.equal(dutchDateToIso("1-2-2020"), "2020-02-01");
  assert.equal(dutchDateToIso(""), null);
  assert.equal(dutchDateToIso("2020-01-01"), null);
});

test("council seats are read from the party list even when a party name has brackets", () => {
  assert.deepEqual(parseCouncilSeats("Gemeentebelangen (GB) (3);VVD (5)"), [{ party: "Gemeentebelangen (GB)", seats: 3 }, { party: "VVD", seats: 5 }]);
  assert.deepEqual(parseCouncilSeats(""), []);
});

test("register bodies: real rows of three gemeenten give code, name, start date, website, seats and the council", () => {
  const bodies = parseRegisterBodies(fx("register-gemeenten-excerpt.csv"), "gemeenten");
  assert.equal(bodies.length, 3);
  const aa = bodies.find((body) => body.code === "gm1680");
  assert.equal(aa.name, "Gemeente Aa en Hunze");
  assert.equal(aa.start, "1998-01-01");
  assert.equal(aa.website, "https://www.aaenhunze.nl");
  assert.equal(aa.seats, 21);
  assert.equal(aa.council.reduce((sum, row) => sum + row.seats, 0), 21);
  assert.ok(bodies.every((body) => /^gm\d{4}$/.test(body.code)));
  // a Provincie file has Organisatieonderdeel rows too, which are not bodies
  assert.deepEqual(parseRegisterBodies('"Officiële naam";"Type";"TOOi URI"\n"X";"Organisatieonderdeel";""\n', "provincies"), []);
});

test("register people: the organisation code comes from the v5.0 identifier, parts of an organisation are split off", () => {
  const rows = parseRegisterPeople(fx("register-medewerkers-gemeenten-excerpt.csv"));
  const pille = rows.find((row) => row.name === "Dhr. Pille");
  assert.equal(pille.function, "Burgemeester");
  assert.equal(pille.code, "gm0613");
  assert.equal(pille.orgName, "Gemeente Albrandswaard");
  const provinces = parseRegisterPeople('"Organisatie (onderdeel)";"Naam";"Functie";"Resource identifier v5.0 organisatie"\n"Provincie Drenthe | Commissaris van de Koning";"mw. drs. J. Klijnsma";"Commissaris van de Koning";""\n');
  assert.equal(provinces[0].part, "Commissaris van de Koning");
  assert.equal(provinces[0].code, null);
});

test("TOOI: an ended gemeente keeps its end date, a herindeling becomes an event with predecessors and successors", () => {
  const { entries, events } = parseTooiSet(JSON.parse(fx("tooi-gemeente-excerpt.json")));
  const haaren = entries.find((entry) => entry.code === "gm0788");
  assert.equal(haaren.end, "2020-12-31");
  assert.equal(haaren.province, "pv30");
  assert.deepEqual(haaren.names, ["Haaren"]);
  const aa = entries.find((entry) => entry.code === "gm1680");
  assert.equal(aa.end, null);
  const uitbreiding = events.find((event) => event.predecessors.includes("gm0788"));
  assert.equal(uitbreiding.date, "2021-01-01");
  assert.equal(uitbreiding.type, "Uitbreiding");
  assert.deepEqual(uitbreiding.successors, ["gm0757", "gm0824", "gm0855", "gm0865"]);
  assert.deepEqual(currentTooi(entries, "2026-10-06").map((entry) => entry.code).includes("gm0788"), false);
  assert.equal(currentTooi(entries, "2020-12-31").some((entry) => entry.code === "gm0788"), true, "the end date is the last day it existed");
});

test("TOOI: a code with two versions (a name change) is one entry and current when one version has no end", () => {
  const { entries, events } = parseTooiSet(JSON.parse(fx("tooi-waterschap-excerpt.json")));
  const agv = entries.filter((entry) => entry.code === "ws0155");
  assert.equal(agv.length, 1);
  assert.equal(agv[0].end, null);
  assert.equal(agv[0].begin, "2017-01-01");
  assert.deepEqual(agv[0].names, ["Amstel, Gooi en Vecht"]);
  assert.equal(entries.find((entry) => entry.code === "ws0524").end, "2010-12-31");
  assert.ok(events.some((event) => event.type === "Samenvoeging" && event.successors.includes("ws0661") && event.predecessors.includes("ws0524")));
});

test("CBS: the newest table whose year is not after today, and the regions with their province", () => {
  const catalog = JSON.parse(fx("cbs-catalog-excerpt.json"));
  assert.equal(pickCbsTable(catalog, "2026-10-06").id, "86247NED");
  assert.equal(pickCbsTable(catalog, "2025-10-06").id, "86059NED");
  assert.equal(pickCbsTable({ value: [{ Identifier: "99999NED", Title: "Gebieden in Nederland 2027", Modified: "x" }] }, "2026-10-06"), null);
  const regions = parseCbsRegions(JSON.parse(fx("cbs-typed-excerpt.json")));
  assert.deepEqual(regions.gemeenten.map((row) => row.code), ["gm0197", "gm0358", "gm1680"]);
  assert.equal(regions.gemeenten.find((row) => row.code === "gm1680").name, "Aa en Hunze");
  assert.deepEqual(regions.provincies.map((row) => row.code), ["pv22", "pv25", "pv27"]);
});

test("the Rijksoverheid table gives name, party, province, appointment date and birth date; (-) means no party", () => {
  const items = parseCommissarissen(fx("rijksoverheid-cvdk-excerpt.html"));
  assert.equal(items.length, 12);
  const mulder = items.find((item) => item.province === "Drenthe");
  assert.deepEqual({ name: mulder.name, party: mulder.party, start: mulder.start, birthDate: mulder.birthDate }, { name: "mw. drs. A.H. Mulder", party: "CDA", start: "2026-01-01", birthDate: "1973-10-21" });
  assert.equal(items.find((item) => item.province === "Gelderland").party, null);
  assert.deepEqual(parseCommissarissen("<p>geen tabel</p>"), []);
});
