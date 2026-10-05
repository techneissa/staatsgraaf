/**
 * Server side of the index lists (lib/index-lists.ts): turns the dataset into
 * compact rows, in display order. Used by the pages for the first screen and
 * by scripts/build-peek-index.mjs for the JSON files, so both read the same
 * loaders.
 */

import { getPeopleIndex } from "@/components/people/people-index";
import { descriptionFor } from "./description-translations";
import { getOrganizationById, getOrganizations, getPositions } from "./data";
import { clipText, type OrganizationRow, type PersonRow, type PositionRow } from "./index-lists";
import { SECTOR_ORDER } from "./graph";
import { orgEnGloss, positionEn } from "./name-gloss";
import { thumbUrl } from "./thumb";
import type { Organization, OrgBranch, OrgType, Position } from "./types";

const DESCRIPTION_MAX = 180;

export type PeopleIndexData = {
  rows: PersonRow[];
  groups: { key: string; nl: string; en: string; count: number }[];
  parties: { key: string; label: string; color: string | null; count: number }[];
  letters: string[];
  total: number;
};

export function buildPeopleRows(): PeopleIndexData {
  const { sections, groups, parties, total } = getPeopleIndex();
  const rows: PersonRow[] = [];
  for (const section of sections) {
    for (const entry of section.people) {
      rows.push({
        s: entry.slug,
        n: entry.name,
        l: section.letter,
        r: entry.role?.nl ?? null,
        re: entry.role?.en ?? null,
        g: entry.group,
        p: entry.party?.label ?? null,
        pk: entry.party?.key ?? null,
        pc: entry.party?.color ?? null,
        c: entry.color,
        t: entry.portrait ? thumbUrl(entry.portrait.url) : null,
        cr: entry.portrait?.credit ?? null,
        a: entry.aliases.length > 0 ? entry.aliases.join(" ") : null,
      });
    }
  }
  return { rows, groups, parties, letters: sections.map((section) => section.letter), total };
}

export type OrganizationsIndexData = {
  rows: OrganizationRow[];
  /** Branches in display order with their row counts. */
  groups: { key: OrgBranch; count: number }[];
  total: number;
};

function employeeCountOf(organization: Organization): number | null {
  return organization.employeeCount?.actual ?? organization.employeeCount?.budgeted ?? null;
}

export function buildOrganizationRows(): OrganizationsIndexData {
  const organizations = [...getOrganizations()].sort((a, b) => a.name.localeCompare(b.name, "nl"));
  const counts = new Map<OrgBranch, number>();
  for (const organization of organizations) counts.set(organization.branch, (counts.get(organization.branch) ?? 0) + 1);
  const known = SECTOR_ORDER.filter((branch) => counts.has(branch));
  const rest = [...counts.keys()].filter((branch) => !SECTOR_ORDER.includes(branch)).sort((a, b) => a.localeCompare(b, "nl"));
  const order = [...known, ...rest];

  const rank = new Map(order.map((branch, index) => [branch, index]));
  const sorted = [...organizations].sort((a, b) => (rank.get(a.branch) ?? 0) - (rank.get(b.branch) ?? 0));
  const rows: OrganizationRow[] = sorted.map((organization) => {
    const description = descriptionFor(organization.id, organization.description);
    return {
      s: organization.slug,
      n: organization.name,
      ge: orgEnGloss(organization.name),
      st: organization.subtype,
      b: organization.branch,
      dn: description ? clipText(description.nl, DESCRIPTION_MAX) : null,
      de: description?.en && description.en !== description.nl ? clipText(description.en, DESCRIPTION_MAX) : null,
      se: organization.seatsCount,
      em: employeeCountOf(organization),
    };
  });
  return { rows, groups: order.map((key) => ({ key, count: counts.get(key) ?? 0 })), total: rows.length };
}

const TYPE_ORDER: OrgType[] = ["elected", "dept_head", "commission"];

export type PositionsIndexData = {
  rows: PositionRow[];
  groups: { key: OrgType; count: number }[];
  total: number;
};

export function buildPositionRows(): PositionsIndexData {
  const positions = [...getPositions()].sort((a, b) => a.title.localeCompare(b.title, "nl"));
  const counts = new Map<OrgType, number>();
  for (const position of positions) counts.set(position.type, (counts.get(position.type) ?? 0) + 1);
  const order = [...TYPE_ORDER, ...[...counts.keys()].filter((type) => !TYPE_ORDER.includes(type))].filter((type) => counts.has(type));
  const rank = new Map(order.map((type, index) => [type, index]));
  const sorted = [...positions].sort((a: Position, b: Position) => (rank.get(a.type) ?? 0) - (rank.get(b.type) ?? 0));
  const rows: PositionRow[] = sorted.map((position) => {
    const organization = getOrganizationById(position.organization);
    return {
      s: position.slug,
      n: position.title,
      ge: positionEn(position.title),
      t: position.type,
      o: organization?.name ?? null,
      b: organization?.branch ?? null,
      se: position.seatsCount,
    };
  });
  return { rows, groups: order.map((key) => ({ key, count: counts.get(key) ?? 0 })), total: rows.length };
}
