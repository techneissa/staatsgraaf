// Test helper: a small decentral world (gemeenten, waterschappen, provincies) built from a compact spec,
// rendered as the real file formats (register CSV, TOOI JSON-LD, CBS OData JSON, Rijksoverheid table)
// and as the dataset records the pipeline starts from. Tests then change the spec to play a scenario.

import { readFileSync } from "node:fs";

import { parseCbsRegions, parseRegisterBodies, parseRegisterPeople, parseTooiSet } from "../../decentral-parse.mjs";
import { slugify } from "../../live-util.mjs";

export const TODAY = "2026-10-06";
export const OLD_SOURCE = { source: "src:wiki-burgemeesters", retrieved: "2026-09-18", confidence: "medium" };

export function text(name) {
  return readFileSync(new URL(`./${name}`, import.meta.url), "utf8");
}

function q(value) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

function dutch(iso) {
  return iso ? iso.split("-").reverse().join("-") : "";
}

/**
 * spec.gemeenten: [{ code: "gm0001", name: "Alpha", province: "pv22", seats: 21, start: "1998-01-01", end: null,
 *   burgemeester: { name: "Dhr. A. Alpha", acting: false } | null, wethouders: ["Dhr. B. Beta"], holder: "Anna Alpha" (dataset holder), holderActing: false,
 *   inDataset: true }]
 * spec.waterschappen: [{ code: "ws0001", name: "Aa en Maas", head: { name, role: "Dijkgraaf" } | null, holder: "..." }]
 * spec.provincies: [{ code: "pv22", name: "Drenthe" }]
 */
export function makeWorld(spec) {
  const gemeenten = spec.gemeenten ?? [];
  const waterschappen = spec.waterschappen ?? [];
  const provincies = spec.provincies ?? [
    { code: "pv22", name: "Drenthe" },
    { code: "pv25", name: "Gelderland" },
  ];
  const organizations = [];
  const positions = [];
  const people = [];
  const tenures = [];
  const relations = [];
  const personFor = (name) => {
    const id = `person:${slugify(name)}`;
    if (!people.some((person) => person.id === id)) people.push({ id, slug: id.slice(7), name, sources: [OLD_SOURCE] });
    return id;
  };
  organizations.push({ id: "org:kiesgerechtigden-nederland", slug: "kiesgerechtigden-nederland", name: "Kiesgerechtigden", type: "constituency", subtype: "kiesgerechtigden-nederland", branch: "zelfstandig", level: "rijk", country: "nederland", sources: [OLD_SOURCE] });
  for (const province of provincies) {
    const id = `org:provincie-${slugify(province.name)}`;
    organizations.push({ id, slug: id.slice(4), name: `Provincie ${province.name}`, aliases: [province.name, `Provincie ${province.name}`], type: "department", subtype: "provincie", branch: "decentraal-provinciaal", level: "provinciaal", country: "nederland", sources: [OLD_SOURCE] });
    const positionId = `pos:commissaris-van-de-koning-${slugify(province.name)}`;
    positions.push({ id: positionId, slug: positionId.slice(4), title: `Commissaris van de Koning in ${province.name}`, organization: id, type: "dept_head", entryModes: ["benoemd-bij-kb"], sources: [OLD_SOURCE] });
    if (province.holder) {
      tenures.push({ id: `tenure:commissaris-van-de-koning-${slugify(province.name)}`, person: personFor(province.holder), position: positionId, seat: null, start: province.start ?? "2020-01-01", end: null, acting: false, entryMode: "benoemd-bij-kb", source: { source: "src:rijksoverheid-cvdk-overzicht", retrieved: "2026-09-18", confidence: "high" } });
    }
  }
  for (const g of gemeenten) {
    if (g.inDataset === false) continue;
    const base = slugify(g.datasetName ?? g.name);
    const orgId = `org:gemeente-${base}`;
    organizations.push({ id: orgId, slug: orgId.slice(4), name: `Gemeente ${g.datasetName ?? g.name}`, aliases: [g.datasetName ?? g.name, `Gemeente ${g.datasetName ?? g.name}`], type: "department", subtype: "gemeente", branch: "decentraal-lokaal", level: "lokaal", country: "nederland", website: g.website ?? null, established: g.established ?? null, dissolved: g.dissolved ?? null, sources: [OLD_SOURCE] });
    organizations.push({ id: `org:gemeenteraad-${base}`, slug: `gemeenteraad-${base}`, name: `Gemeenteraad van ${g.datasetName ?? g.name}`, type: "elected", subtype: "gemeenteraad", branch: "decentraal-lokaal", level: "lokaal", country: "nederland", parent: orgId, partOf: [orgId], seatsCount: g.datasetSeats ?? g.seats ?? 21, sources: [OLD_SOURCE] });
    organizations.push({ id: `org:college-van-bw-${base}`, slug: `college-van-bw-${base}`, name: `College van burgemeester en wethouders van ${g.datasetName ?? g.name}`, type: "commission", subtype: "commissie", branch: "decentraal-lokaal", level: "lokaal", country: "nederland", parent: orgId, partOf: [orgId], sources: [OLD_SOURCE] });
    positions.push({ id: `pos:burgemeester-${base}`, slug: `burgemeester-${base}`, title: `Burgemeester van ${g.datasetName ?? g.name}`, organization: orgId, type: "dept_head", entryModes: ["benoemd-bij-kb"], sources: [OLD_SOURCE] });
    positions.push({ id: `pos:raadslid-${base}`, slug: `raadslid-${base}`, title: `Lid gemeenteraad van ${g.datasetName ?? g.name}`, organization: `org:gemeenteraad-${base}`, type: "elected", seatsCount: g.datasetSeats ?? g.seats ?? 21, sources: [OLD_SOURCE] });
    positions.push({ id: `pos:wethouder-${base}`, slug: `wethouder-${base}`, title: "Wethouder", organization: `org:college-van-bw-${base}`, type: "commission", entryModes: ["benoemd"], sources: [OLD_SOURCE] });
    relations.push({ id: `rel:elects-kiesgerechtigden-gemeenteraad-${base}`, from: "org:kiesgerechtigden-nederland", to: `org:gemeenteraad-${base}`, type: "elects", metadata: {}, seatsAppointed: g.datasetSeats ?? g.seats ?? 21, source: OLD_SOURCE });
    if (g.holder) {
      tenures.push({ id: `tenure:burgemeester-${base}`, person: personFor(g.holder), position: `pos:burgemeester-${base}`, seat: null, start: g.holderStart ?? "2019-01-01", end: null, acting: Boolean(g.holderActing), entryMode: g.holderActing ? "waarnemend" : "benoemd-bij-kb", source: OLD_SOURCE });
    }
    for (const name of g.datasetWethouders ?? []) {
      tenures.push({ id: `tenure:wethouder-${base}-${slugify(name)}`, person: personFor(name), position: `pos:wethouder-${base}`, seat: null, start: "2022-06-01", end: null, acting: false, entryMode: "benoemd", source: OLD_SOURCE });
    }
  }
  for (const w of waterschappen) {
    if (w.inDataset === false) continue;
    const base = slugify(w.name);
    const orgId = `org:waterschap-${base}`;
    organizations.push({ id: orgId, slug: orgId.slice(4), name: `Waterschap ${w.name}`, aliases: [w.name, `Waterschap ${w.name}`], type: "department", subtype: "waterschap", branch: "waterschap", level: "regionaal", country: "nederland", established: null, sources: [OLD_SOURCE] });
    positions.push({ id: `pos:dijkgraaf-${base}`, slug: `dijkgraaf-${base}`, title: `Dijkgraaf van Waterschap ${w.name}`, organization: orgId, type: "dept_head", entryModes: ["benoemd-bij-kb"], sources: [OLD_SOURCE] });
    if (w.holder) tenures.push({ id: `tenure:dijkgraaf-${base}`, person: personFor(w.holder), position: `pos:dijkgraaf-${base}`, seat: null, start: "2021-04-01", end: null, acting: false, entryMode: "benoemd-bij-kb", source: OLD_SOURCE });
  }
  const dataset = {
    organizations,
    positions,
    people,
    tenures,
    memberships: [],
    relations,
    sources: [{ id: "src:wiki-burgemeesters", url: "https://nl.wikipedia.org/wiki/Lijst", title: "Lijst", publisher: "Wikipedia", type: "page", retrieved: "2026-09-18", license: "CC-BY-SA-4.0" }],
    elections: [],
    coalitions: [],
  };

  // ----- the source files -----
  const orgHeader = ["Officiële naam", "Afkorting", "Type", "Startdatum", "Einddatum", "Internetpagina's", "Aantal inwoners", "Totaal aantal zetels", "Raad (Partij (aantal zetels))", "TOOi URI", "Organisatiecode"];
  const regOrg = (cells) => cells.map(q).join(";");
  const gemeenteOrgRows = gemeenten.filter((g) => g.inRegister !== false).map((g) => regOrg([`Gemeente ${g.registerName ?? g.name}`, g.name, "Gemeente", dutch(g.start ?? ""), "", g.website ? `${g.website}, label: algemeen` : "", "10000", g.seats ?? 21, `Partij A (${g.seats ?? 21})`, `https://identifier.overheid.nl/tooi/id/gemeente/${g.code}`, g.code]));
  const waterOrgRows = waterschappen.map((w) => regOrg([w.registerName ?? w.name, "", "Waterschap", dutch(w.start ?? ""), "", "", "", "", "", `https://identifier.overheid.nl/tooi/id/waterschap/${w.code}`, w.code]));
  const provinceOrgRows = provincies.map((p) => regOrg([`Provincie ${p.name}`, "", "Provincie", "", "", "", "", "", "", `https://identifier.overheid.nl/tooi/id/provincie/${p.code}`, p.code]));
  const orgCsv = (rows) => `${orgHeader.map(q).join(";")}\n${rows.join("\n")}\n`;
  const peopleHeader = ["Organisatie (onderdeel)", "Naam", "Functie", "Resource identifier v4.0 organisatie", "Resource identifier v5.0 organisatie", "Actieve beheerder ROO"];
  const peopleRow = (org, name, role, kind, code) => [org, name, role, "", `https://identifier.overheid.nl/tooi/id/${kind}/${code}`, "Ja"].map(q).join(";");
  const gemeentePeople = [];
  for (const g of gemeenten.filter((entry) => entry.inRegister !== false)) {
    for (const head of g.heads ?? (g.burgemeester ? [g.burgemeester] : [])) gemeentePeople.push(peopleRow(`Gemeente ${g.registerName ?? g.name}`, head.name, head.acting ? "Burgemeester waarnemend" : "Burgemeester", "gemeente", g.code));
    for (const name of g.wethouders ?? []) gemeentePeople.push(peopleRow(`Gemeente ${g.registerName ?? g.name}`, name, "Wethouder", "gemeente", g.code));
    gemeentePeople.push(peopleRow(`Gemeente ${g.registerName ?? g.name}`, "Woo-team", "Woo-contactpersoon", "gemeente", g.code));
  }
  const waterPeople = [];
  for (const w of waterschappen) {
    for (const head of w.heads ?? (w.head ? [w.head] : [])) waterPeople.push(peopleRow(w.registerName ?? w.name, head.name, head.role ?? "Dijkgraaf", "waterschap", w.code));
  }
  const peopleCsv = (rows) => `${peopleHeader.map(q).join(";")}\n${rows.join("\n")}\n`;

  const node = (kind, code, name, { begin, end, province } = {}) => ({
    "@id": `https://identifier.overheid.nl/tooi/id/${kind}/${code}`,
    "@type": ["https://identifier.overheid.nl/tooi/def/ont/Gemeente"],
    "https://identifier.overheid.nl/tooi/def/ont/organisatiecode": [{ "@value": code }],
    "https://identifier.overheid.nl/tooi/def/ont/officieleNaamExclSoort": [{ "@value": name }],
    ...(begin ? { "https://identifier.overheid.nl/tooi/def/ont/begindatum": [{ "@value": begin }] } : {}),
    ...(end ? { "https://identifier.overheid.nl/tooi/def/ont/einddatum": [{ "@value": end }] } : {}),
    ...(province ? { "https://identifier.overheid.nl/tooi/def/ont/ligtInProvincie": [{ "@id": `https://identifier.overheid.nl/tooi/id/provincie/${province}` }] } : {}),
  });
  const eventNode = (index, type, date, predecessors, successors) => ({
    "@id": `https://identifier.overheid.nl/tooi/id/gemeente/wzg_${index}`,
    "@type": [`https://identifier.overheid.nl/tooi/def/ont/${type}`],
    "https://identifier.overheid.nl/tooi/def/ont/tijdstipWijziging": [{ "@value": `${date}T00:00:00+01:00` }],
    "http://www.w3.org/ns/prov#invalidated": predecessors.map((code) => ({ "@id": `https://identifier.overheid.nl/tooi/id/gemeente/${code}` })),
    "http://www.w3.org/ns/prov#generated": successors.map((code) => ({ "@id": `https://identifier.overheid.nl/tooi/id/gemeente/${code}` })),
  });
  const tooiGemeente = [{ "@id": "https://identifier.overheid.nl/tooi/id/gemeente", "@graph": [...gemeenten.filter((g) => g.inTooi !== false).map((g) => node("gemeente", g.code, g.name, { begin: g.start, end: g.end, province: g.province ?? "pv22" })), ...(spec.events ?? []).map((e, i) => eventNode(i, e.type, e.date, e.predecessors, e.successors))] }];
  const tooiWater = [{ "@id": "https://identifier.overheid.nl/tooi/id/waterschap", "@graph": waterschappen.map((w) => node("waterschap", w.code, w.name, { end: w.end })) }];
  const tooiProvince = [{ "@id": "https://identifier.overheid.nl/tooi/id/provincie", "@graph": provincies.map((p) => node("provincie", p.code, `provincie ${p.name}`)) }];
  const cbsTyped = {
    value: gemeenten
      .filter((g) => g.inCbs !== false && !g.end)
      .map((g) => ({ RegioS: `${g.code.toUpperCase()}    `, Code_1: `${g.code.toUpperCase()}    `, Naam_2: `${g.cbsName ?? g.datasetName ?? g.name}    `, Code_28: `${(g.cbsProvince ?? g.province ?? "pv22").toUpperCase()}    `, Naam_29: provincies.find((p) => p.code === (g.cbsProvince ?? g.province ?? "pv22"))?.name ?? "Onbekend" })),
  };
  const files = {
    "export/Gemeenten.csv": orgCsv(gemeenteOrgRows),
    "export-medewerkers/Gemeenten.csv": peopleCsv(gemeentePeople),
    "export/Waterschappen.csv": orgCsv(waterOrgRows),
    "export-medewerkers/Waterschappen.csv": peopleCsv(waterPeople),
    "export/Provincies.csv": orgCsv(provinceOrgRows),
    "export-medewerkers/Provincies.csv": peopleCsv([]),
  };
  const catalog = { value: [{ Identifier: "86247NED", Title: "Gebieden in Nederland 2026", Modified: "2026-07-14T02:00:00", Period: "2026" }] };
  const bodies = {
    gemeenten: {
      ok: true,
      tooi: parseTooiSet(tooiGemeente),
      register: { bodies: parseRegisterBodies(files["export/Gemeenten.csv"], "gemeenten"), people: parseRegisterPeople(files["export-medewerkers/Gemeenten.csv"]) },
      cbs: { table: { id: "86247NED", title: "Gebieden in Nederland 2026", year: 2026 }, ...parseCbsRegions(cbsTyped) },
    },
    waterschappen: {
      ok: true,
      tooi: parseTooiSet(tooiWater),
      register: { bodies: parseRegisterBodies(files["export/Waterschappen.csv"], "waterschappen"), people: parseRegisterPeople(files["export-medewerkers/Waterschappen.csv"]) },
      cbs: null,
    },
    provincies: {
      ok: true,
      tooi: parseTooiSet(tooiProvince),
      register: { bodies: parseRegisterBodies(files["export/Provincies.csv"], "provincies"), people: [] },
      cbs: { table: { id: "86247NED", title: "Gebieden in Nederland 2026", year: 2026 }, gemeenten: [], provincies: provincies.map((p) => ({ code: p.code, name: p.name })) },
    },
  };
  return { dataset, bodies, files, tooi: { gemeente: tooiGemeente, waterschap: tooiWater, provincie: tooiProvince }, cbsTyped, catalog };
}

export function takenFor(dataset) {
  return {
    persons: new Set(dataset.people.map((record) => record.id)),
    tenures: new Set(dataset.tenures.map((record) => record.id)),
    positions: new Set(dataset.positions.map((record) => record.id)),
    orgs: new Set(dataset.organizations.map((record) => record.id)),
    relations: new Set(dataset.relations.map((record) => record.id)),
  };
}
