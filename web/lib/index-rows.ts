/**
 * Server side of the index lists (lib/index-lists.ts): turns the dataset into
 * compact rows, in display order. Used by the pages for the first screen and
 * by scripts/build-peek-index.mjs for the JSON files, so both read the same
 * loaders.
 */

import { getPeopleIndex } from "@/components/people/people-index";
import { getDataset, getOrganizationById, getOrganizations, getPersonById, getPositions, getTenuresForPosition } from "./data";
import { getMediaItem, mediaNeedsChangeNote, organizationImages, organizationParentId } from "./entity";
import {
  organizationTree,
  OTHER_SUBGROUP,
  type OrganizationGroup,
  type OrganizationRow,
  type OrganizationSubgroup,
  type PersonRow,
  type PositionRow,
} from "./index-lists";
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
  /** Branches in display order, with their counts and, for the large ones, their subgroups. */
  groups: OrganizationGroup[];
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

/** The type of body a group is named after, counted for its line in the overview. */
const GROUP_UNIT: Partial<Record<OrgBranch, Organization["subtype"]>> = {
  "decentraal-provinciaal": "provincie",
  "decentraal-lokaal": "gemeente",
  waterschap: "waterschap",
};

/** Groups too long for one list, split by the provincie of a gemeente or the ministerie of a zbo. */
const SPLIT_BY: Partial<Record<OrgBranch, "provincie" | "ministerie">> = {
  "decentraal-lokaal": "provincie",
  zelfstandig: "ministerie",
};

const LABEL_PREFIX = { provincie: /^Provincie\s+/u, ministerie: /^Ministerie van\s+/u };

export function buildOrganizationRows(): OrganizationsIndexData {
  const dataset = getDataset();
  const organizations = [...getOrganizations()].sort((a, b) => a.name.localeCompare(b.name, "nl"));
  const counts = new Map<OrgBranch, number>();
  for (const organization of organizations) counts.set(organization.branch, (counts.get(organization.branch) ?? 0) + 1);
  const known = SECTOR_ORDER.filter((branch) => counts.has(branch));
  const rest = [...counts.keys()].filter((branch) => !SECTOR_ORDER.includes(branch)).sort((a, b) => a.localeCompare(b, "nl"));
  const order = [...known, ...rest];

  const byId = new Map(organizations.map((organization) => [organization.id, organization]));
  // The provincie that oversees a gemeente, and the body a parentless one is part of
  // (the ministries of Aruba, Curaçao and Sint Maarten under their regering).
  const provincieOf = new Map<string, string>();
  const partOf = new Map<string, string>();
  for (const relation of dataset.relations) {
    if (relation.validTo != null) continue;
    const from = byId.get(relation.from);
    const to = byId.get(relation.to);
    if (!from || !to) continue;
    if (relation.type === "oversees" && from.subtype === "provincie" && to.subtype === "gemeente") provincieOf.set(to.id, from.id);
    if (relation.type === "part_of" && from.subtype === "ministerie" && to.subtype === "land-regering" && !partOf.has(from.id)) partOf.set(from.id, to.id);
  }
  const parentOf = (organization: Organization): Organization | undefined => {
    const parent = organizationParentId(organization) ?? partOf.get(organization.id) ?? null;
    return parent !== null ? byId.get(parent) : undefined;
  };
  // The subgroup of a body: its provincie or ministerie; a nested body follows its parent.
  const subgroupOf = (organization: Organization): Organization | null => {
    const by = SPLIT_BY[organization.branch];
    if (by === undefined) return null;
    const parent = parentOf(organization);
    if (parent !== undefined && parent.branch === organization.branch) return subgroupOf(parent);
    const id = by === "provincie" ? provincieOf.get(organization.id) : parent?.subtype === "ministerie" ? parent.id : undefined;
    return id !== undefined ? (byId.get(id) ?? null) : null;
  };

  const rank = new Map(order.map((branch, index) => [branch, index]));
  const sorted = [...organizations].sort((a, b) => (rank.get(a.branch) ?? 0) - (rank.get(b.branch) ?? 0));
  const subgroupBody = new Map<string, Organization>();
  const rows: OrganizationRow[] = sorted.map((organization) => {
    const parent = parentOf(organization);
    // A body nests only under a parent of its own group; a zbo under its ministry stays in its own group.
    const nested = parent !== undefined && parent.branch === organization.branch;
    const split = SPLIT_BY[organization.branch] !== undefined;
    const body = split ? subgroupOf(organization) : null;
    if (body !== null) subgroupBody.set(body.slug, body);
    return {
      s: organization.slug,
      n: organization.name,
      ge: orgEnGloss(organization.name),
      st: organization.subtype,
      t: organization.type,
      b: organization.branch,
      pa: nested ? parent.slug : null,
      sg: split ? (body?.slug ?? OTHER_SUBGROUP) : null,
      se: organization.seatsCount,
      w: emblemUrl(organization),
    };
  });

  const groups: OrganizationGroup[] = order.map((branch) => {
    const inGroup = rows.filter((row) => row.b === branch);
    const { tops } = organizationTree(inGroup);
    const unit = GROUP_UNIT[branch];
    const by = SPLIT_BY[branch] ?? null;
    let subgroups: OrganizationSubgroup[] | undefined;
    if (by !== null) {
      const size = new Map<string, number>();
      for (const row of tops) size.set(row.sg ?? OTHER_SUBGROUP, (size.get(row.sg ?? OTHER_SUBGROUP) ?? 0) + 1);
      subgroups = [...size.entries()]
        .map(([key, count]) => {
          const body = subgroupBody.get(key);
          return {
            key,
            label: body ? body.name.replace(LABEL_PREFIX[by], "") : "",
            id: body?.id ?? null,
            w: body ? emblemUrl(body) : null,
            count,
          };
        })
        .sort((a, b) => Number(a.key === OTHER_SUBGROUP) - Number(b.key === OTHER_SUBGROUP) || a.label.localeCompare(b.label, "nl"));
    }
    return {
      key: branch,
      count: counts.get(branch) ?? 0,
      top: tops.length,
      units: unit !== undefined ? inGroup.filter((row) => row.st === unit).length : null,
      by,
      ...(subgroups !== undefined ? { subgroups } : {}),
    };
  });
  return { rows, groups, total: rows.length };
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
    const current = getTenuresForPosition(position.id).filter((tenure) => tenure.end === null);
    const holder = current.length > 0 ? (getPersonById(current[0].person)?.name ?? null) : null;
    return {
      s: position.slug,
      n: position.title,
      ge: positionEn(position.title),
      t: position.type,
      o: organization?.name ?? null,
      oe: organization?.name ? orgEnGloss(organization.name) : null,
      b: organization?.branch ?? null,
      se: position.seatsCount,
      h: holder,
      hc: current.length > 1 ? current.length - 1 : null,
    };
  });
  return { rows, groups: order.map((key) => ({ key, count: counts.get(key) ?? 0 })), total: rows.length };
}
