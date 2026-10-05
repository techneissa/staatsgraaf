// Test helpers: the real-shape Tweede Kamer fixtures and a dataset that already holds what they say.
import { readFileSync } from "node:fs";

import { normalizeFractie, normalizeFzpRow, normalizePresidiumRow, normalizeVacature } from "../../tk-changes.mjs";
import { slugify } from "../../live-util.mjs";

export const TODAY = "2026-10-05";

export function fx(name) {
  return JSON.parse(readFileSync(new URL(`./${name}`, import.meta.url), "utf8"));
}

export function snapshotFromFixtures() {
  return {
    rows: fx("tk-fzp-open.json").value.map(normalizeFzpRow),
    fracties: fx("tk-fractie-active.json").value.map(normalizeFractie),
    vacatures: fx("tk-vacature-open.json").value.map(normalizeVacature),
    presidium: fx("tk-presidium-rows.json").value.map(normalizePresidiumRow),
  };
}

export const OLD_SOURCE = { source: "src:tk-odata-fractiezetelpersonen", retrieved: "2026-09-17", confidence: "high" };

/** A dataset that already holds exactly what the snapshot says (the state after the last refresh). */
export function datasetFor(snapshot, { relabel = (label) => label } = {}) {
  const people = new Map();
  const personOf = (row) => {
    const id = `person:${slugify(row.name)}`;
    if (!people.has(id)) people.set(id, { id, slug: id.slice(7), name: row.name, birthDate: null, sources: [OLD_SOURCE] });
    return id;
  };
  const memberships = [];
  const tenures = [];
  const positions = new Map();
  const addPosition = (id, title) => {
    if (!positions.has(id)) positions.set(id, { id, slug: id.slice(4), title, organization: "org:tweede-kamer", type: "elected", seatsCount: 1, sources: [OLD_SOURCE] });
  };
  for (const row of snapshot.rows.filter((entry) => !entry.totEnMet)) {
    const personId = personOf(row);
    const label = relabel(row.fractie);
    memberships.push({
      id: `membership:tweede-kamer-${slugify(row.name)}`,
      organization: "org:tweede-kamer",
      person: personId,
      seatNumber: null,
      fractie: label,
      start: row.van,
      end: null,
      source: OLD_SOURCE,
    });
    if (row.functie === "Fractievoorzitter") {
      const positionId = `pos:fractievoorzitter-${slugify(label)}`;
      addPosition(positionId, `Fractievoorzitter ${label}`);
      tenures.push({
        id: `tenure:fvp-fractievoorzitter-${slugify(label)}-${slugify(row.name)}-${row.van.replace(/-/g, "")}`,
        person: personId,
        position: positionId,
        start: row.van,
        end: null,
        acting: false,
        entryMode: "gekozen",
        source: OLD_SOURCE,
      });
    }
  }
  addPosition("pos:voorzitter-tweede-kamer", "Voorzitter van de Tweede Kamer der Staten-Generaal");
  const voorzitter = snapshot.presidium.find((row) => row.functie === "Voorzitter");
  tenures.push({
    id: "tenure:voorzitter-tweede-kamer-oud",
    person: personOf(voorzitter),
    position: "pos:voorzitter-tweede-kamer",
    start: voorzitter.van,
    end: null,
    acting: false,
    entryMode: "gekozen",
    source: OLD_SOURCE,
  });
  return {
    organizations: [{ id: "org:tweede-kamer" }],
    people: [...people.values()],
    positions: [...positions.values()],
    tenures,
    memberships,
    relations: [],
    sources: [],
  };
}

