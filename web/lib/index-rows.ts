/**
 * Server side of the index lists (lib/index-lists.ts): turns the dataset into
 * compact rows, in display order. Used by the pages for the first screen and
 * by scripts/build-peek-index.mjs for the JSON files, so both read the same
 * loaders.
 */

import { getPeopleIndex } from "@/components/people/people-index";
import { descriptionFor } from "./description-translations";
import { getDataset, getOrganizationById, getOrganizations, getPositions } from "./data";
import { getMediaItem, mediaNeedsChangeNote, organizationImages, organizationParentId } from "./entity";
import { leadOf, ORG_FOLD_PREVIEW, organizationTree, startsFolded, type OrganizationRow, type PersonRow, type PositionRow } from "./index-lists";
import { SECTOR_ORDER } from "./graph";
import { orgEnGloss, positionEn } from "./name-gloss";
import { thumbUrl } from "./thumb";
import type { Organization, OrgBranch, OrgType, Position } from "./types";

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
  /** Branches in display order: all bodies in the group, and how many of them are rows of their own (the rest nest). */
  groups: { key: OrgBranch; count: number; top: number }[];
  total: number;
};

/** The small local coat of arms of an organisation, when it needs no attribution (public domain or CC0). */
function emblemUrl(organization: Organization): string | null {
  for (const id of organizationImages(organization)) {
    const media = getMediaItem(id);
    if (media?.type === "logo" && media.url.startsWith("/media/wapens/") && !mediaNeedsChangeNote(media.license)) return media.url;
  }
  return null;
}

/**
 * How much is on record about a body: current office holders and members,
 * and the seats of the bodies nested under it. Orders the main bodies of a
 * large group; ties fall back to the name.
 */
function weightOf(organizations: Organization[]): Map<string, number> {
  const dataset = getDataset();
  const own = new Map<string, number>();
  const bump = (id: string, by: number) => own.set(id, (own.get(id) ?? 0) + by);
  for (const tenure of dataset.tenures) {
    if (tenure.end !== null) continue;
    const position = dataset.positionsById.get(tenure.position);
    if (position) bump(position.organization, 1);
  }
  for (const membership of dataset.memberships) if (membership.end === null) bump(membership.organization, 1);
  const weight = new Map<string, number>();
  for (const organization of organizations) {
    const seats = organization.seatsCount ?? 0;
    const parent = organizationParentId(organization);
    const mine = Math.max(own.get(organization.id) ?? 0, seats);
    weight.set(organization.id, (weight.get(organization.id) ?? 0) + mine);
    if (parent !== null) weight.set(parent, (weight.get(parent) ?? 0) + mine);
  }
  return weight;
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
  const byId = new Map(organizations.map((organization) => [organization.id, organization]));
  const rows: OrganizationRow[] = sorted.map((organization) => {
    const description = descriptionFor(organization.id, organization.description);
    const parent = organizationParentId(organization);
    const parentOrganization = parent !== null ? byId.get(parent) : undefined;
    // A body nests only under a parent of its own group; a zbo under its ministry stays in its own group.
    const nested = parentOrganization !== undefined && parentOrganization.branch === organization.branch;
    return {
      s: organization.slug,
      n: organization.name,
      ge: orgEnGloss(organization.name),
      st: organization.subtype,
      b: organization.branch,
      pa: nested ? parentOrganization.slug : null,
      hd: leadOf(organization.description),
      he: description?.en ? leadOf(description.en) : null,
      se: organization.seatsCount,
      w: emblemUrl(organization),
    };
  });

  // Mark the main bodies of every group that starts folded.
  const weight = weightOf(organizations);
  const slugWeight = new Map(organizations.map((organization) => [organization.slug, weight.get(organization.id) ?? 0]));
  const tops: number[] = [];
  for (const branch of order) {
    const group = rows.filter((row) => row.b === branch);
    const { tops: topRows } = organizationTree(group);
    tops.push(topRows.length);
    if (!startsFolded(topRows.length)) continue;
    const main = [...topRows].sort((a, b) => (slugWeight.get(b.s) ?? 0) - (slugWeight.get(a.s) ?? 0) || a.n.localeCompare(b.n, "nl")).slice(0, ORG_FOLD_PREVIEW);
    for (const row of main) row.m = 1;
  }
  return { rows, groups: order.map((key, index) => ({ key, count: counts.get(key) ?? 0, top: tops[index] })), total: rows.length };
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
