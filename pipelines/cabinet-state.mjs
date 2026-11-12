// The state of the cabinet (parties, demissionair, romp cabinet) from the official cabinet page.
//
// Source: https://www.rijksoverheid.nl/regering/over-de-regering/kabinetten-sinds-1945/<slug>. Its intro
// sentence states, in plain Dutch, what happened and when:
//   "Op 3 juni 2025 boden de bewindspersonen van de PVV hun ontslag aan de Koning aan. De minister-president
//    en de overige ministers en staatssecretarissen stelden hun functie ter beschikking."   (kabinet-Schoof)
//   "Op 7 juli 2023 bood minister-president Rutte aan de Koning het ontslag aan van alle ministers en
//    staatssecretarissen."                                                                  (kabinet-Rutte IV)
// A cabinet that is still sitting without such a sentence (kabinet-Jetten today) has none. Only these
// sentences count: a news headline or the mere absence of ministers on the bewindspersonen page never
// writes a change; that case is drafted as an [ops] issue for a person (draftOpsText).

import { daysBetween, decodeEntities, formatDateNL, sourceRef } from "./live-util.mjs";

export const CABINET_PAGES_URL = "https://www.rijksoverheid.nl/regering/over-de-regering/kabinetten-sinds-1945";
/** A statement older than this no longer explains a mass closure of bewindspersonen. */
export const STATEMENT_WINDOW_DAYS = 60;

const MONTHS = { januari: 1, februari: 2, maart: 3, april: 4, mei: 5, juni: 6, juli: 7, augustus: 8, september: 9, oktober: 10, november: 11, december: 12 };
const ROMAN = ["i", "ii", "iii", "iv", "v", "vi", "vii", "viii", "ix", "x"];
const DATE = String.raw`(\d{1,2}) (januari|februari|maart|april|mei|juni|juli|augustus|september|oktober|november|december) (\d{4})`;

function toIso(day, month, year) {
  return `${year}-${String(MONTHS[month]).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function plainText(html) {
  return decodeEntities(String(html).replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, " ").replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

// The page writes parties long ("Volkspartij voor Vrijheid en Democratie") or short; data/people.json mixes CU and
// ChristenUnie, GL and GroenLinks; data/coalitions.json has its own strings. Everything is compared by the key below.
const PARTY_ALIASES = {
  VVD: ["Volkspartij voor Vrijheid en Democratie"],
  CDA: ["Christen-Democratisch Appèl", "Christen Democratisch Appèl"],
  D66: ["Democraten 66"],
  PvdA: ["Partij van de Arbeid"],
  PVV: ["Partij voor de Vrijheid"],
  CU: ["ChristenUnie"],
  GL: ["GroenLinks"],
  BBB: ["BoerBurgerBeweging"],
  NSC: ["Nieuw Sociaal Contract"],
  FVD: ["Forum voor Democratie"],
  PvdD: ["Partij voor de Dieren"],
  SGP: ["Staatkundig Gereformeerde Partij"],
  SP: ["Socialistische Partij"],
};
const ALIAS_LOOKUP = new Map(Object.entries(PARTY_ALIASES).flatMap(([key, names]) => [[key.toLowerCase(), key], ...names.map((name) => [name.toLowerCase(), key])]));

/** The one spelling of a party that the comparisons use (short form of the known parties, else the name as written). */
export function canonicalParty(name) {
  const trimmed = String(name ?? "").replace(/^\s*(?:de|het)\s+/i, "").trim();
  return ALIAS_LOOKUP.get(trimmed.toLowerCase()) ?? trimmed;
}

function splitParties(text) {
  // A long name that contains " en " is shortened first, so it is not split in the middle.
  let shortened = text;
  for (const [key, names] of Object.entries(PARTY_ALIASES)) {
    for (const name of names) shortened = shortened.replace(new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"), key);
  }
  return shortened
    .split(/,| en /)
    .map(canonicalParty)
    .filter(Boolean);
}

/**
 * What the cabinet page says happened: `{ sworn, events }` or null when the page is not a cabinet page.
 * `sworn` is the date of the beëdiging. An event is `{ kind: "party-exit", date, parties, demissionair }`
 * (the bewindspersonen of these parties offered their resignation; `demissionair` is true when the page adds that
 * the minister-president and the others put their function at disposal) or `{ kind: "cabinet-resigned", date }`
 * (all ministers and staatssecretarissen offered their resignation).
 */
export function parseCabinetStatement(html) {
  if (typeof html !== "string" || html === "") return null;
  const text = plainText(html);
  const sworn = text.match(new RegExp(String.raw`Op ${DATE} was de beëdiging van het kabinet`));
  if (!sworn) return null;
  const events = [];
  const exits = new RegExp(
    String.raw`Op ${DATE} boden (?:ook )?de bewindspersonen van ([^.]{1,80}?) (?:ook )?hun ontslag aan de Koning aan\.( De minister-president en de overige ministers en staatssecretarissen stelden hun functie ter beschikking\.)?`,
    "g",
  );
  for (const found of text.matchAll(exits)) {
    events.push({ kind: "party-exit", date: toIso(found[1], found[2], found[3]), parties: splitParties(found[4]), demissionair: Boolean(found[5]) });
  }
  const resigned = new RegExp(String.raw`Op ${DATE} bood minister-president [^.]{1,60}? aan de Koning het ontslag aan van alle ministers en staatssecretarissen`, "g");
  for (const found of text.matchAll(resigned)) events.push({ kind: "cabinet-resigned", date: toIso(found[1], found[2], found[3]) });
  events.sort((a, b) => a.date.localeCompare(b.date));
  return { sworn: toIso(sworn[1], sworn[2], sworn[3]), events };
}

/** The parties that left according to the page, inside the window before today: they explain a mass closure. */
export function recentPartyExits(statement, today, windowDays = STATEMENT_WINDOW_DAYS) {
  const exits = (statement?.events ?? []).filter((event) => event.kind === "party-exit" && daysBetween(event.date, today) >= 0 && daysBetween(event.date, today) <= windowDays);
  return { parties: new Set(exits.flatMap((event) => event.parties)), date: exits.length > 0 ? exits[exits.length - 1].date : null, events: exits };
}

/** The common party of the people who left, or null when one has no known party (never guessed). */
export function partiesOfLeavers(personIds, people) {
  const byId = new Map(people.map((person) => [person.id, person]));
  const parties = new Set();
  for (const id of personIds) {
    const party = byId.get(id)?.party;
    if (typeof party !== "string" || party === "") return null;
    parties.add(canonicalParty(party));
  }
  return parties;
}

/**
 * How many people of parties that left the cabinet held a bewindspersoon post when their party left (so the list
 * may be that much shorter). Two sources, so the answer stays the same after the run that closed their tenures:
 * the page's own recent statements, and the open romp cabinet record, which keeps the parties that are gone.
 */
export function exitedPartyHolders({ slug, coalitions, exits, tenures, cabinetPositionIds, people }) {
  const groups = exits.events.map((event) => ({ parties: event.parties, date: event.date }));
  const chain = coalitions.filter((coalition) => coalition.source?.source === `src:rijksoverheid-${slug}`);
  const open = chain.find((coalition) => !coalition.end);
  if (open?.kind === "rompkabinet") {
    const kept = new Set(open.parties.map(canonicalParty));
    const lost = [...new Set(chain.flatMap((coalition) => coalition.parties.map(canonicalParty)))].filter((party) => !kept.has(party));
    const since = chain.filter((coalition) => coalition.kind === "rompkabinet").map((coalition) => coalition.start).sort()[0];
    if (lost.length > 0) groups.push({ parties: lost, date: since });
  }
  const partyOf = new Map(people.map((person) => [person.id, canonicalParty(person.party)]));
  const holders = new Set();
  for (const tenure of tenures) {
    if (!cabinetPositionIds.has(tenure.position)) continue;
    if (groups.some((group) => group.parties.includes(partyOf.get(tenure.person)) && (!tenure.end || tenure.end >= group.date))) holders.add(tenure.person);
  }
  return holders.size;
}

function nextRompId(slug, chain) {
  const taken = chain.filter((coalition) => coalition.id.startsWith(`coalition:${slug}-romp-`)).length;
  return `coalition:${slug}-romp-${ROMAN[taken] ?? taken + 1}`;
}

/**
 * The change to data/coalitions.json that the events call for, as records to insert or patch
 * (`end` and `demissionairSince` of an existing record; a new romp cabinet). Events already in the data are skipped,
 * so a later run finds nothing to do. What cannot be written from the statement alone goes to `drafts`.
 *
 * `slug` is the cabinet slug of the page ("kabinet-jetten"); its coalition records are the ones citing
 * `src:rijksoverheid-<slug>`.
 */
export function planCoalitionChanges({ slug, events, coalitions, sources = [], today }) {
  const sourceId = `src:rijksoverheid-${slug}`;
  const chain = coalitions.filter((coalition) => coalition.source?.source === sourceId).map((coalition) => structuredClone(coalition));
  const upserts = new Map();
  const drafts = [];
  const sourceKnown = sources.some((source) => source.id === sourceId);

  // Party exits on one day are one change: the romp cabinet is the cabinet without all of them.
  const grouped = [];
  for (const event of [...events].sort((a, b) => a.date.localeCompare(b.date))) {
    const same = event.kind === "party-exit" ? grouped.find((entry) => entry.kind === "party-exit" && entry.date === event.date) : null;
    if (same) {
      same.parties = [...new Set([...same.parties, ...event.parties])];
      same.demissionair = same.demissionair || event.demissionair;
    } else grouped.push({ ...event, ...(event.parties ? { parties: [...event.parties] } : {}) });
  }

  for (const event of grouped) {
    if (event.date > today) continue;
    // Known when a record starts that day without any of these parties; a record that still lists one is not done yet.
    const known =
      event.kind === "party-exit"
        ? chain.some((coalition) => coalition.start === event.date && event.parties.every((party) => !coalition.parties.some((own) => canonicalParty(own) === party)))
        : chain.some((coalition) => coalition.demissionairSince && coalition.demissionairSince <= event.date);
    if (known) continue;
    const open = chain.filter((coalition) => !coalition.end).sort((a, b) => a.start.localeCompare(b.start)).pop();
    const exited = event.kind === "party-exit" ? event.parties : [];
    const remaining = open ? open.parties.filter((party) => !exited.includes(canonicalParty(party))) : [];
    const problem = !sourceKnown
      ? `de bron ${sourceId} staat niet in data/sources.json`
      : !open
        ? `er is geen open kabinetsrecord voor ${slug} in data/coalitions.json`
        : event.date <= open.start
          ? `de datum ${event.date} ligt niet na het begin van ${open.id} (${open.start})`
          : event.kind === "party-exit" && (exited.some((party) => !open.parties.some((own) => canonicalParty(own) === party)) || remaining.length === 0)
            ? `de partijen ${exited.join(", ")} passen niet bij ${open.id} (${open.parties.join(", ")})`
            : null;
    if (problem) {
      drafts.push({ kind: "unclear-statement", event, problem });
      continue;
    }
    if (event.kind === "cabinet-resigned") {
      const patched = { ...open, demissionairSince: event.date };
      upserts.set(patched.id, patched);
      chain.splice(chain.indexOf(open), 1, patched);
      continue;
    }
    const closed = { ...open, end: event.date, demissionairSince: event.demissionair ? (open.demissionairSince ?? event.date) : open.demissionairSince };
    const base = open.name.replace(/ \(rompkabinet[^)]*\)$/, "");
    const romp = {
      id: nextRompId(slug, chain),
      government: open.government,
      name: `${base} (rompkabinet ${remaining.join("-")})`,
      parties: remaining,
      start: event.date,
      end: null,
      // A cabinet that was already demissionair stays so; otherwise only the page's own word makes it so.
      demissionairSince: event.demissionair || open.demissionairSince ? event.date : null,
      primeMinister: open.primeMinister ?? null,
      agreement: open.agreement ?? null,
      kind: "rompkabinet",
      notes:
        `Rompkabinet na het vertrek van de ${exited.join(", ")}-bewindspersonen op ${formatDateNL(event.date)} volgens ${sourceId}` +
        `${event.demissionair ? "; de minister-president en de overige bewindspersonen stelden hun functie ter beschikking, dus het kabinet is demissionair vanaf de eerste dag" : ""}. ` +
        `Automatisch toegevoegd door de live-run.`,
      source: sourceRef(sourceId, today),
    };
    upserts.set(closed.id, closed);
    upserts.set(romp.id, romp);
    chain.splice(chain.indexOf(open), 1, closed, romp);
  }
  return { upserts: [...upserts.values()], drafts };
}

/**
 * The text of the [ops] issue for a cabinet change that no official page states. The change it would make is
 * given as `coalitions.json` records, so a person can apply it in one step. `why` is one Dutch sentence.
 */
export function draftOpsText({ why, upserts = [] }) {
  const lines = [`Kabinetsstatus: ${why}`, ""];
  if (upserts.length > 0) {
    lines.push("Voorgestelde wijziging in data/coalitions.json (voeg een nieuw record toe, of pas `end` en `demissionairSince` van een bestaand record aan):", "", "```json", JSON.stringify(upserts, null, 2), "```", "");
  } else {
    lines.push("De run kan hier geen wijziging uit afleiden; pas data/coalitions.json zo nodig met de hand aan.", "");
  }
  lines.push("Er is niets geschreven voor het kabinet: alleen een officiële uitspraak op rijksoverheid.nl, niet het vertrek van bewindspersonen op zich, wordt als feit overgenomen.");
  return lines.join("\n");
}
