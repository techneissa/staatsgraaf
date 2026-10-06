// Fetching the official sources of provincies, gemeenten and waterschappen (ADR 0027).
// One request per second per host through the shared http helper; a failing source is recorded
// as a gap, never thrown, and its previous records stay.

import {
  parseCbsRegions,
  parseCommissarissen,
  parseRegisterBodies,
  parseRegisterPeople,
  parseTooiSet,
  pickCbsTable,
} from "./decentral-parse.mjs";
import { CVDK_SOURCE_DEF, DECENTRAL_LEVELS, sourceDefs } from "./decentral-plan.mjs";
import { makeGap } from "./live-util.mjs";

export const CBS_CATALOG_URL = `https://opendata.cbs.nl/ODataCatalog/Tables?$format=json&$filter=${encodeURIComponent("startswith(Title,'Gebieden in Nederland')")}&$select=Identifier,Title,Modified,Period`;

function cbsDataUrl(tableId) {
  return `https://opendata.cbs.nl/ODataApi/odata/${tableId}/TypedDataSet?$select=Code_1,Naam_2,Code_28,Naam_29`;
}

/** Read the newest CBS regions table whose year is not after today (cached per run in `shared`). */
export async function fetchCbsRegions({ http, today, shared = {} }) {
  if (shared.cbs) return shared.cbs;
  const catalog = await http.getJson(CBS_CATALOG_URL);
  const table = pickCbsTable(catalog, today);
  if (!table) throw new Error("geen tabel 'Gebieden in Nederland' voor dit jaar in de CBS-catalogus");
  const rows = [];
  let url = cbsDataUrl(table.id);
  for (let page = 0; page < 5 && url; page += 1) {
    const json = await http.getJson(url);
    rows.push(...(json.value ?? []));
    url = json["odata.nextLink"] ?? null;
  }
  const regions = parseCbsRegions({ value: rows });
  shared.cbs = { table, ...regions };
  return shared.cbs;
}

/**
 * Fetch one decentral source. Returns { ok, status, url, ...body, endpointsUsed }:
 * for a level the TOOI set, the register bodies and people (and CBS for gemeenten and provincies),
 * for "commissarissen" the Rijksoverheid table.
 */
export async function fetchDecentral({ http, key, today, shared = {} }) {
  if (key === "commissarissen") {
    const url = CVDK_SOURCE_DEF.url;
    const html = await http.getText(url, { accept: "text/html" });
    return { ok: true, status: 200, url, items: parseCommissarissen(html), endpointsUsed: [{ url, retrieved: today, notes: "Rijksoverheid overzicht commissarissen van de Koning" }] };
  }
  if (!DECENTRAL_LEVELS.includes(key)) throw new Error(`onbekende bron ${key}`);
  const defs = sourceDefs(key);
  const endpointsUsed = [];
  const tooiJson = await http.getJson(defs.tooi.url, { accept: "application/ld+json, application/json" });
  endpointsUsed.push({ url: defs.tooi.url, retrieved: today, notes: `TOOI ${key}` });
  const bodiesText = await http.getText(defs.bodies.url, { accept: "text/csv" });
  endpointsUsed.push({ url: defs.bodies.url, retrieved: today, notes: `Register ${key}` });
  const peopleText = await http.getText(defs.people.url, { accept: "text/csv" });
  endpointsUsed.push({ url: defs.people.url, retrieved: today, notes: `Register medewerkers ${key}` });
  let cbs = null;
  if (key === "gemeenten" || key === "provincies") {
    cbs = await fetchCbsRegions({ http, today, shared });
    endpointsUsed.push({ url: CBS_CATALOG_URL, retrieved: today, notes: "CBS catalogus" });
    endpointsUsed.push({ url: cbsDataUrl(cbs.table.id), retrieved: today, notes: `CBS ${cbs.table.id}` });
  }
  return {
    ok: true,
    status: 200,
    url: defs.tooi.url,
    tooi: parseTooiSet(tooiJson),
    register: { bodies: parseRegisterBodies(bodiesText, key), people: parseRegisterPeople(peopleText) },
    cbs,
    endpointsUsed,
  };
}

export function failureGap(key, error) {
  const names = {
    gemeenten: "gemeenten (TOOI, register, CBS)",
    provincies: "provincies (TOOI, register, CBS)",
    waterschappen: "waterschappen (TOOI, register)",
    commissarissen: "commissarissen van de Koning (Rijksoverheid)",
  };
  return makeGap(
    `Live bron ${names[key] ?? key} kon niet worden opgehaald`,
    `netwerk- of parsefout: ${error.message}`,
    key === "commissarissen" ? CVDK_SOURCE_DEF.url : sourceDefs(key).tooi.url,
    "Controleer de endpoints of probeer het later opnieuw; de vorige records blijven ongewijzigd.",
  );
}
