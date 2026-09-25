import { getDataset, getPersonById, getSourceById } from "./data";
import { getMediaItem, personPortraitId } from "./entity";
import { partyByDataset } from "./parties";
import type { ActivityItem, ActivityKind, ActivityOutcome, ActivityRole, PersonActivity } from "./types";

/** Display order of the kinds on a person page. */
export const ACTIVITY_KIND_ORDER: readonly ActivityKind[] = [
  "motie",
  "amendement",
  "initiatiefwetsvoorstel",
  "wetsvoorstel",
  "schriftelijke-vragen",
];

export type ActivityPersonView = {
  key: string;
  name: string;
  href: string | null;
  portrait: string | null;
  party: string | null;
  color: string | null;
};

export type ActivityRowView = {
  id: string;
  kind: ActivityKind;
  role: ActivityRole;
  title: string;
  date: string;
  kamerstuk: string | null;
  outcome: ActivityOutcome | null;
  url: string;
  coSubmitters: ActivityPersonView[];
};

export type ActivityGroupView = {
  kind: ActivityKind;
  /** Every item of this kind in the period, also beyond the per-person cap. */
  total: number;
  items: ActivityRowView[];
};

export type PersonActivityView = {
  since: string;
  groups: ActivityGroupView[];
  source: { title: string; url: string; publisher: string; retrieved: string } | null;
};

/**
 * Group items by kind in display order, newest first inside a group. A kind
 * with a total but no item in the file (the cap took them) still gets a group.
 */
export function groupActivityItems<T extends { kind: ActivityKind; date: string; id: string }>(
  items: readonly T[],
  totals: Partial<Record<ActivityKind, number>> = {},
): { kind: ActivityKind; total: number; items: T[] }[] {
  const groups: { kind: ActivityKind; total: number; items: T[] }[] = [];
  for (const kind of ACTIVITY_KIND_ORDER) {
    const inKind = items
      .filter((item) => item.kind === kind)
      .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
    const total = Math.max(totals[kind] ?? 0, inKind.length);
    if (total === 0) continue;
    groups.push({ kind, total, items: inKind });
  }
  return groups;
}

export function getActivityForPerson(personId: string): PersonActivity | null {
  return getDataset().activitiesByPersonId.get(personId) ?? null;
}

function coSubmitterView(entry: ActivityItem["coSubmitters"][number]): ActivityPersonView {
  const person = entry.person !== null ? getPersonById(entry.person) : undefined;
  const portrait = person !== undefined ? getMediaItem(personPortraitId(person))?.url ?? null : null;
  return {
    key: entry.person ?? entry.name,
    name: person?.name ?? entry.name,
    href: person !== undefined ? `/personen/${person.slug}/` : null,
    portrait,
    party: entry.party,
    color: partyByDataset(entry.party)?.color ?? null,
  };
}

/** Everything the person page needs, resolved on the server; null when the person has no record. */
export function getPersonActivityView(personId: string): PersonActivityView | null {
  const record = getActivityForPerson(personId);
  if (record === null) return null;
  const rows: ActivityRowView[] = record.items.map((item) => ({
    id: item.id,
    kind: item.kind,
    role: item.role,
    title: item.title,
    date: item.date,
    kamerstuk: item.kamerstuk,
    outcome: item.outcome,
    url: item.url,
    coSubmitters: item.coSubmitters.map(coSubmitterView),
  }));
  const source = getSourceById(record.source.source);
  return {
    since: record.since,
    groups: groupActivityItems(rows, record.totals),
    source:
      source !== undefined
        ? { title: source.title, url: source.url, publisher: source.publisher, retrieved: record.source.retrieved }
        : null,
  };
}
