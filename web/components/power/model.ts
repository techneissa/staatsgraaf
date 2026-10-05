import type { PowerMapBundle, PowerNewsItem } from "@/lib/graph";
import type { PowerLink } from "@/lib/power-connections";
import { connectionsOf } from "@/lib/power-connections";
import { REASON_WEIGHT } from "@/lib/power-connections";
import { groupTies, strengthLevel, type TieGroup, type TieKind } from "@/lib/power-map-layout";
import { partyByDataset } from "@/lib/parties";
import { orgEnGloss, positionEn } from "@/lib/name-gloss";
import { branchColorVar } from "@/lib/branch-colors";
import { initialsFor } from "@/lib/initials";

/** A name for an id the connections bundle does not carry, from the graph bundle (bodies, seated members). */
export type NameResolver = (id: string) => { name: string; image: string | null; slug: string | null } | null;

/** The fractie a seated member sits in, from the seat blocks in graph.json. */
export type FractieInfo = { label: string; chamber: string; color: string | null; members: readonly string[] };
export type FractieResolver = (id: string) => FractieInfo | null;

export type EntityInfo = {
  id: string;
  isOrg: boolean;
  name: string;
  /** Job, English gloss of a body, or the fractie of a seated member. */
  meta: string | null;
  party: string | null;
  color: string | null;
  image: string | null;
  initials: string;
  href: string | null;
};

export type ReasonView = { key: string; text: string; evidence: string };
export type TieView = { other: string; kind: TieKind; weight: number; level: number; reasons: ReasonView[]; news: string[] };
export type GroupView = { kind: TieKind; ties: TieView[] };

type T = (key: string, vars?: Record<string, string | number>) => string;

/** The site writes dates as dd-MM-YYYY in both languages (CONTRIBUTING.md section 6). */
export function formatDutchDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const [year, month, day] = iso.slice(0, 10).split("-");
  if (!year || !month || !day) return iso;
  return `${day}-${month}-${year}`;
}

export function entityInfo(
  id: string,
  bundle: PowerMapBundle,
  locale: "nl" | "en",
  resolveName?: NameResolver,
  fractieOf?: FractieResolver,
): EntityInfo {
  const isOrg = id.startsWith("org:");
  const person = bundle.people[id];
  const body = bundle.bodies[id];
  const resolved = person || body ? null : resolveName?.(id) ?? null;
  const name = person?.name ?? body?.name ?? resolved?.name ?? id.replace(/^[a-z]+:/, "");
  const slug = person?.slug ?? body?.slug ?? resolved?.slug ?? null;
  let meta: string | null = null;
  let party: string | null = null;
  let color: string | null = null;
  if (isOrg) {
    meta = locale === "en" ? orgEnGloss(name) : null;
    color = body ? branchColorVar(body.branch) : null;
  } else {
    const job = person?.job ?? null;
    meta = job ? (locale === "en" ? positionEn(job) ?? job : job) : null;
    const record = partyByDataset(person?.party ?? null);
    const fractie = fractieOf?.(id) ?? null;
    party = record?.abbrev ?? person?.party ?? fractie?.label ?? null;
    color = record?.color ?? fractie?.color ?? null;
    if (!meta && fractie) meta = locale === "en" ? orgEnGloss(fractie.chamber) ?? fractie.chamber : fractie.chamber;
  }
  return {
    id,
    isOrg,
    name,
    meta,
    party,
    color,
    image: person?.image ?? resolved?.image ?? null,
    initials: initialsFor(name),
    href: slug ? (isOrg ? `/organisaties/${slug}/` : `/personen/${slug}/`) : null,
  };
}

/**
 * Every tie of the focus, with the fractie of a seated member added from the
 * seat blocks when the bundle scored none: the same `fractie` reason and
 * weight as lib/power-connections.ts gives it, from the same memberships.
 */
export function focusLinks(bundle: PowerMapBundle, id: string, fractieOf?: FractieResolver): { other: string; link: PowerLink }[] {
  const ties = connectionsOf(bundle.links, id, Number.POSITIVE_INFINITY);
  const fractie = id.startsWith("person:") ? fractieOf?.(id) ?? null : null;
  if (!fractie) return ties;
  const known = new Set(ties.map((tie) => tie.other));
  const prominence = new Map(bundle.powerMap.people.map((entry) => [entry.person, entry.total]));
  const peers = fractie.members
    .filter((member) => member !== id && !known.has(member))
    .map((member, index) => ({ member, index }))
    .sort((x, y) => (prominence.get(y.member) ?? 0) - (prominence.get(x.member) ?? 0) || x.index - y.index)
    .map(({ member }) => ({
      other: member,
      link: { a: id, b: member, weight: REASON_WEIGHT.fractie, reasons: ["fractie"], fractie: fractie.label } satisfies PowerLink,
    }));
  return [...ties, ...peers];
}

export function reasonViews(
  link: PowerLink,
  t: T,
  bundle: PowerMapBundle,
  newsById: ReadonlyMap<string, PowerNewsItem>,
  nameOf: (id: string) => string,
  locale: "nl" | "en",
): ReasonView[] {
  const views: ReasonView[] = [];
  for (const reason of link.reasons) {
    if (reason === "news") {
      const n = link.newsCount ?? link.news?.length ?? 0;
      const evidence = (link.news ?? [])
        .map((id) => newsById.get(id))
        .filter((item): item is PowerNewsItem => Boolean(item))
        .map((item) => `${formatDutchDate(item.date)} ${item.publisher ?? ""}: ${locale === "en" && item.titleEn ? item.titleEn : item.title}`)
        .join("\n");
      views.push({ key: "news", text: n === 1 ? t("reasonNews1") : t("reasonNews", { n }), evidence });
    } else if (reason === "tenure") {
      views.push({ key: "tenure", text: t("reasonTenure"), evidence: "" });
    } else if (reason === "kabinet") {
      views.push({ key: "kabinet", text: bundle.kabinet?.name ?? t("reasonKabinet"), evidence: "" });
    } else if (reason === "fractie") {
      views.push({ key: "fractie", text: t("reasonFractie", { fractie: link.fractie ?? "" }), evidence: "" });
    } else if (reason === "organisation") {
      const orgs = link.orgs ?? [];
      views.push({
        key: "organisation",
        text: orgs.length === 1 ? nameOf(orgs[0]) : orgs.length > 1 ? t("reasonOrganisations", { n: orgs.length }) : t("reasonOrganisation"),
        evidence: orgs.map(nameOf).join("\n"),
      });
    }
  }
  return views;
}

export function groupViews(
  ties: readonly { other: string; link: PowerLink }[],
  reasonsOf: (link: PowerLink) => ReasonView[],
): { groups: GroupView[]; raw: TieGroup[]; fractie: string | null } {
  const raw = groupTies(ties);
  const party = raw.find((group) => group.kind === "party");
  return {
    raw,
    fractie: party ? sharedFractie(party.ties) : null,
    groups: raw.map((group) => ({
      kind: group.kind,
      ties: group.ties.map(({ other, link }) => ({
        other,
        kind: group.kind,
        weight: link.weight,
        level: strengthLevel(link.weight),
        // The group heading already says "position" or "cabinet"; the chip would only repeat it.
        reasons: reasonsOf(link).filter((reason) => reason.key !== HIDDEN_REASON[group.kind]),
        news: link.news ?? [],
      })),
    })),
  };
}

const HIDDEN_REASON: Record<TieKind, string | null> = { office: "tenure", cabinet: "kabinet", party: "fractie", news: null };

/** The fractie the party group's ties share, for its heading; null when they differ. */
export function sharedFractie(ties: readonly { link: PowerLink }[]): string | null {
  const labels = new Set(ties.map((tie) => tie.link.fractie ?? null));
  const [only] = [...labels];
  return labels.size === 1 && only ? only : null;
}

export const KIND_LABEL_KEY: Record<TieKind, string> = {
  office: "kindOffice",
  cabinet: "kindCabinet",
  party: "kindParty",
  news: "kindNews",
};
