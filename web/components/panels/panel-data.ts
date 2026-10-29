/**
 * The panel index: what the two selection panels (the details panel beside the
 * canvas and the profile at the top of the page column) know about a picked
 * organisation, person, news item or topic beyond the graph bundle.
 *
 * Built by web/scripts/build-panel-index.mjs into same-origin shards under
 * public/panels/, sharded with the peek hash so a pick loads one small file.
 * Pure module: the build script, the client loader and the tests share it.
 * Every value is copied from the dataset at build time; nothing is generated.
 * The graph structure (parent, children, relations, clusters, the fracties
 * and their members, the path to the electorate) is not repeated here: the panels read it from
 * /graph.json, which the canvas loads anyway.
 */

import { peekHash } from "../../lib/peek";
import type { PeekKind } from "../../lib/peek";
import type { ChangeDisplayKind } from "../../lib/changes";
import type { NewsLanguage, OrgBranch, OrgSubtype } from "../../lib/types";

export const PANEL_PATH = "/panels";
export const PANEL_INDEX_URL = `${PANEL_PATH}/index.json`;

/** More shards than the peek index: a panel record is richer, so each file stays near 20 KiB. */
export const PANEL_SHARDS = 256;

export function panelShard(id: string): string {
  return String(peekHash(id) % PANEL_SHARDS).padStart(3, "0");
}

export function panelShardUrl(id: string): string {
  return `${PANEL_PATH}/${panelShard(id)}.json`;
}

export type PanelRef = { id: string; name: string; href: string };

/** A person in a list: enough for a portrait disc, a name and a link. */
export type PanelPerson = PanelRef & {
  portrait: string | null;
  /** Sourced party colour, or null. */
  color: string | null;
  /** Party abbreviation, or null. */
  party: string | null;
};

export type PanelSource = { url: string; publisher: string; retrieved: string | null };

export type PanelNews = {
  id: string;
  title: string;
  url: string;
  publisher: string;
  published: string;
  language: NewsLanguage;
};

export type PanelChange = {
  id: string;
  date: string;
  kind: ChangeDisplayKind;
  person: PanelRef | null;
  position: PanelRef | null;
  organization: PanelRef | null;
  /** False when the position title already names the body. */
  showBody: boolean;
  /** The Dutch summary from the dataset, for kinds without a sentence template. */
  summary: string;
  source: string | null;
};

export type PanelHolder = {
  position: PanelRef & { gloss: string | null };
  person: PanelPerson;
  acting: boolean;
  start: string | null;
};

export type PanelBudget = {
  fiscalYear: number;
  previousFiscalYear: number | null;
  unit: string | null;
  spendingBudget: number | null;
  spendingActual: number | null;
  revenue: number | null;
  net: number | null;
  previousSpendingBudget: number | null;
  href: string;
  source: PanelSource | null;
};

export type PanelOrg = {
  kind: "org";
  id: string;
  name: string;
  href: string;
  gloss: string | null;
  subtype: OrgSubtype | null;
  branch: OrgBranch | null;
  description: string | null;
  /** English machine translation of the description, when current (ADR 0016). */
  descriptionEn?: string | null;
  website: string | null;
  /** Coat of arms (local) or official logo (loaded from the body's site) for the header mark (ADR 0029). */
  emblem?: { url: string; kind: "arms" | "logo" } | null;
  parent: PanelRef | null;
  holders: PanelHolder[];
  holderCount: number;
  positionCount: number;
  memberCount: number;
  budget: PanelBudget | null;
  news: PanelNews[];
  newsCount: number;
  changes: PanelChange[];
  /** People named in the same news as this body, most often first. */
  inTheNews: (PanelPerson & { count: number })[];
  source: PanelSource | null;
};

export type PanelRole = {
  position: PanelRef & { gloss: string | null };
  organization: PanelRef | null;
  acting: boolean;
  start: string | null;
};

export type PanelMembership = {
  organization: PanelRef;
  /** The fractie as in the dataset, for example "D66" or "Groep Markuszower". */
  fractie: string | null;
  /** The chamber entry key in graph.json for that fractie. */
  fractieKey: string | null;
  start: string | null;
};

export type PanelPersonRecord = {
  kind: "person";
  id: string;
  name: string;
  href: string;
  portrait: { url: string; credit: string } | null;
  color: string | null;
  /** Registry key of the party, to look up the website and the programme in lib/parties.ts. */
  partyKey: string | null;
  party: { abbrev: string; name: string; href: string | null } | null;
  description: string | null;
  /** English machine translation of the description, when current (ADR 0016). */
  descriptionEn?: string | null;
  roles: PanelRole[];
  memberships: PanelMembership[];
  news: PanelNews[];
  newsCount: number;
  /** People named in the same news items, most often first. */
  coMentioned: (PanelPerson & { count: number })[];
  changes: PanelChange[];
  source: PanelSource | null;
};

export type PanelEntity = PanelRef & { kind: PeekKind; portrait: string | null; color: string | null };

export type PanelNewsRecord = PanelNews & {
  kind: "news";
  summaryMarkup: string | null;
  entities: PanelEntity[];
  /** A machine translation into the other interface language (), or null. */
  translation: { language: NewsLanguage; title: string; lead: string | null } | null;
  source: PanelSource | null;
};

export type PanelTopic = {
  kind: "topic";
  id: string;
  name: string;
  href: string;
  description: string | null;
  organizations: PanelRef[];
  positions: PanelRef[];
  news: PanelNews[];
  newsCount: number;
  source: PanelSource | null;
};

export type PanelRecord = PanelOrg | PanelPersonRecord | PanelNewsRecord | PanelTopic;

export type PanelShard = { version: 1; records: Record<string, PanelRecord> };

/** The quiet default of the details panel when nothing is picked. */
export type PanelIndex = {
  version: 1;
  changes: PanelChange[];
  inTheNews: (PanelPerson & { count: number })[];
  /** The news window the counts cover, in days, or null. */
  newsWindowDays: number | null;
  /** The date of the dataset snapshot behind the lists ("Gegevens per"), when the build knows it. */
  snapshot?: string | null;
};

const EMPTY_LISTS = [
  "holders",
  "news",
  "changes",
  "inTheNews",
  "roles",
  "memberships",
  "coMentioned",
  "entities",
  "organizations",
  "positions",
] as const;

/**
 * Restores what the build script drops to keep the shards small: empty lists,
 * nulls and zero counts. Callers can then read every field without a check.
 */
export function normalizePanelRecord(raw: Record<string, unknown>): PanelRecord {
  const record: Record<string, unknown> = { ...raw };
  for (const key of EMPTY_LISTS) {
    if (!Array.isArray(record[key])) record[key] = [];
  }
  for (const key of ["holderCount", "positionCount", "memberCount", "newsCount"]) {
    if (typeof record[key] !== "number") record[key] = 0;
  }
  for (const key of [
    "gloss",
    "subtype",
    "branch",
    "description",
    "descriptionEn",
    "website",
    "parent",
    "budget",
    "source",
    "portrait",
    "color",
    "partyKey",
    "party",
    "summaryMarkup",
    "translation",
  ]) {
    if (record[key] === undefined) record[key] = null;
  }
  if (record.kind === "news" && typeof record.language !== "string") record.language = "nl";
  return record as unknown as PanelRecord;
}

/** Drops empty values (null, false, 0, empty lists) at every depth; normalizePanelRecord restores the top level. */
export function compactValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(compactValue);
  if (value === null || typeof value !== "object") return value;
  const out: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (entry === null || entry === undefined || entry === false || entry === 0) continue;
    if (Array.isArray(entry) && entry.length === 0) continue;
    out[key] = compactValue(entry);
  }
  return out;
}
