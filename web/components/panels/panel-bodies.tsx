"use client";

import { useMemo, type ReactNode } from "react";
import { Amount } from "@/components/budget/amount";
import { useLocale } from "@/components/i18n/language-provider";
import { useDict } from "@/components/i18n/use-t";
import { PartyPill } from "@/components/party-pill";
import { branchColorVar } from "@/lib/branch-colors";
import { computeFocusPath } from "@/lib/graph";
import { EDGE_TYPE_LABELS_I18N, SECTOR_LABELS_I18N } from "@/lib/i18n/dict-graph";
import { renderSummaryMarkupWithHrefs } from "@/lib/news-summary";
import { partySlug, type PartyRecord } from "@/lib/parties";
import type { Selection } from "@/lib/selection";
import {
  ChangeRows,
  EntityRow,
  Facts,
  LimitedList,
  NewsRows,
  OpenPageLink,
  OrgMark,
  PeopleGrid,
  PersonRow,
  Section,
  SourceLine,
  usePanelFormat,
} from "./panel-parts";
import type { PanelIndex, PanelNewsRecord, PanelOrg, PanelPersonRecord, PanelTopic } from "./panel-data";
import { SelectLink } from "./select-link";
import { fractieOf, partyForKey, useClusterLabel } from "./use-selection-view";
import type { PanelLayout } from "./use-panel-data";

export type PanelVariant = "side" | "page";

const STACK = "space-y-5";

function nodeRef(layout: PanelLayout, id: string) {
  const node = layout.byId.get(id);
  return node ? { id: node.id, name: node.name, href: `/organisaties/${node.slug}/`, color: branchColorVar(node.branch) } : null;
}

function OrgRowById({ layout, id, sub, trailing }: { layout: PanelLayout; id: string; sub?: ReactNode; trailing?: ReactNode }) {
  const ref = nodeRef(layout, id);
  if (!ref) return null;
  return <EntityRow entity={ref} lead={<OrgMark color={ref.color} />} sub={sub} trailing={trailing} />;
}

function Links({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-center gap-x-4 gap-y-1">{children}</div>;
}

function ExternalLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      rel="noopener noreferrer"
      target="_blank"
      className="tap-row inline-flex min-h-8 items-center gap-1 text-xs font-medium text-accent-text hover:underline"
    >
      {children}
      <svg aria-hidden="true" viewBox="0 0 12 12" width="9" height="9">
        <path d="M4.5 2.5h5v5M9.5 2.5 3 9" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </a>
  );
}

/** A party's programme link, when lib/parties.ts records a sourced one. */
function programmeOf(party: PartyRecord | null): { url: string; retrieved: string | null } | null {
  const value = party ? (party as unknown as { program?: unknown }).program : undefined;
  if (typeof value === "string" && value.startsWith("http")) return { url: value, retrieved: null };
  if (value && typeof value === "object" && typeof (value as { url?: unknown }).url === "string") {
    const record = value as { url: string; retrieved?: unknown };
    return { url: record.url, retrieved: typeof record.retrieved === "string" ? record.retrieved : null };
  }
  return null;
}

function PartyLinks({ party }: { party: PartyRecord | null }) {
  const t = useDict("panels");
  const format = usePanelFormat();
  if (!party) return null;
  const programme = programmeOf(party);
  return (
    <Links>
      {!party.unlisted ? <OpenPageLink href={`/partijen/${partySlug(party)}/`} label={t("partyPage")} /> : null}
      {party.website ? <ExternalLink href={party.website}>{t("partySite")}</ExternalLink> : null}
      {programme ? (
        <span className="inline-flex items-baseline gap-1.5">
          <ExternalLink href={programme.url}>{t("programme")}</ExternalLink>
          {programme.retrieved ? <span className="text-xs text-ink-faint">{t("retrieved", { date: format.date(programme.retrieved) })}</span> : null}
        </span>
      ) : null}
    </Links>
  );
}

/* ------------------------------------------------------------------ */
/* Organisation                                                        */
/* ------------------------------------------------------------------ */

/** Where a body sits and what it touches, from the graph bundle: the part both panels share. */
export function OrgStructure({ id, layout, variant }: { id: string; layout: PanelLayout; variant: PanelVariant }) {
  const t = useDict("panels");
  const locale = useLocale() === "en" ? "en" : "nl";
  const format = usePanelFormat();
  const clusterLabel = useClusterLabel();
  const node = layout.byId.get(id) ?? null;

  const children = useMemo(
    () =>
      layout.nodes
        .filter((candidate) => candidate.parent === id)
        .sort((a, b) => a.name.localeCompare(b.name, "nl"))
        .map((candidate) => candidate.id),
    [layout, id],
  );

  const relationGroups = useMemo(() => {
    const groups = new Map<string, { verb: string; ids: string[] }>();
    for (const edge of layout.edges) {
      const outgoing = edge.from === id;
      if (!outgoing && edge.to !== id) continue;
      const other = outgoing ? edge.to : edge.from;
      if (!layout.byId.has(other)) continue;
      // Parent and parts are listed on their own.
      if (edge.type === "part_of" && (other === node?.parent || children.includes(other))) continue;
      const verb = EDGE_TYPE_LABELS_I18N[edge.type]?.[locale] ?? edge.type;
      const key = `${outgoing ? "out" : "in"}:${edge.type}`;
      const label = outgoing ? verb : t("relationIncoming", { verb });
      const group = groups.get(key) ?? { verb: label, ids: [] };
      if (!group.ids.includes(other)) group.ids.push(other);
      groups.set(key, group);
    }
    return [...groups.values()]
      .map((group) => ({ ...group, ids: group.ids.sort((a, b) => (layout.byId.get(a)?.name ?? "").localeCompare(layout.byId.get(b)?.name ?? "", "nl")) }))
      .sort((a, b) => b.ids.length - a.ids.length || a.verb.localeCompare(b.verb));
  }, [layout, id, locale, node?.parent, children]);

  const path = useMemo(() => computeFocusPath(layout, id).slice(1), [layout, id]);
  const chamber = layout.chambers[id];
  const cluster = node?.cluster ? layout.clusterById.get(node.cluster) ?? null : null;
  const sector = node ? layout.sectors.find((entry) => entry.id === node.sector) ?? null : null;
  const limit = variant === "page" ? 10 : 8;

  if (!node) return null;
  return (
    <div className={STACK}>
      {/* Where it sits: parent, group and sector, each a pick. */}
      <ul className="-mx-1.5">
        {node.parent ? <OrgRowById layout={layout} id={node.parent} /> : null}
        {cluster ? (
          <li>
            <SelectLink
              selection={{ kind: "cluster", id: cluster.id, surface: "graph" }}
              className="group flex min-h-9 w-full items-center gap-2.5 rounded-sm px-1.5 py-1 text-[13px] text-ink-muted transition-fast hover:bg-surface-inset hover:text-ink pointer-coarse:min-h-11"
            >
              <DotsMark />
              <span className="min-w-0 group-hover:underline decoration-1 underline-offset-2">{clusterLabel(layout, cluster)}</span>
            </SelectLink>
          </li>
        ) : null}
        {sector ? (
          <li>
            <SelectLink
              selection={{ kind: "sector", id: sector.id, surface: "graph" }}
              className="group flex min-h-9 w-full items-center gap-2.5 rounded-sm px-1.5 py-1 text-[13px] text-ink-muted transition-fast hover:bg-surface-inset hover:text-ink pointer-coarse:min-h-11"
            >
              <span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-full border-2" style={{ borderColor: branchColorVar(sector.branch) }} />
              <span className="min-w-0 group-hover:underline decoration-1 underline-offset-2">
                {SECTOR_LABELS_I18N[sector.id]?.[locale] ?? sector.id}
              </span>
            </SelectLink>
          </li>
        ) : null}
      </ul>

      {chamber ? (
        <Section title={t("fracties")} size={variant === "page" ? "md" : "sm"}>
          <SeatBar entries={chamber.entries} total={chamber.total} majority={chamber.majority} />
          <p className="mt-1.5 text-xs text-ink-muted">{t("seatsTotal", { total: chamber.total, majority: chamber.majority })}</p>
          <ul className="-mx-1.5 mt-1">
            {chamber.entries.map((entry, index) => (
              <li key={`${entry.label}-${index}`}>
                <SelectLink
                  selection={{ kind: "fractie", chamberId: id, index, surface: "graph" }}
                  href={partyForKey(entry.key) ? `/partijen/${partySlug(partyForKey(entry.key) as PartyRecord)}/` : undefined}
                  className="group flex min-h-8 w-full items-center gap-2.5 rounded-sm px-1.5 py-0.5 transition-fast hover:bg-surface-inset pointer-coarse:min-h-11"
                >
                  <span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: entry.color ?? "var(--t-color-line-strong)" }} />
                  <span className="min-w-0 flex-1 text-[13px] text-ink group-hover:underline decoration-1 underline-offset-2">{entry.label}</span>
                  <span className="shrink-0 text-xs tabular-nums text-ink-muted">{format.count(entry.seats)}</span>
                </SelectLink>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {children.length > 0 ? (
        <Section title={t("parts")} count={children.length} size={variant === "page" ? "md" : "sm"}>
          <LimitedList
            items={children}
            limit={limit}
            className="-mx-1.5"
            render={(childId) => <OrgRowById key={childId} layout={layout} id={childId} />}
          />
        </Section>
      ) : null}

      {relationGroups.length > 0 ? (
        <Section title={t("relations")} size={variant === "page" ? "md" : "sm"}>
          <div className="space-y-3">
            {relationGroups.map((group) => (
              <div key={group.verb}>
                <p className="px-0 text-xs text-ink-faint">
                  {group.verb} <span className="tabular-nums">({format.count(group.ids.length)})</span>
                </p>
                <LimitedList
                  items={group.ids}
                  limit={5}
                  className="-mx-1.5 mt-0.5"
                  render={(otherId) => <OrgRowById key={otherId} layout={layout} id={otherId} />}
                />
              </div>
            ))}
          </div>
        </Section>
      ) : null}

      {path.length > 0 ? (
        <Section title={t("pathToVoters")} size={variant === "page" ? "md" : "sm"}>
          <PathToVoters layout={layout} path={path} />
        </Section>
      ) : null}
    </div>
  );
}

function DotsMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 10 10" width="10" height="10" className="shrink-0 fill-current text-ink-faint">
      {[2, 5, 8].flatMap((x) => [2, 5, 8].map((y) => <circle key={`${x}-${y}`} cx={x} cy={y} r="1" />))}
    </svg>
  );
}

/** The chain from a body to the voters: a real sequence, drawn as one. */
function PathToVoters({ layout, path }: { layout: PanelLayout; path: string[] }) {
  return (
    <ol className="relative ms-1.5 border-s border-line-strong ps-0">
      {path.map((stepId) => {
        const ref = nodeRef(layout, stepId);
        return (
          <li key={stepId} className="relative -ms-px">
            <span
              aria-hidden="true"
              className="absolute -start-[4px] top-1/2 h-[7px] w-[7px] -translate-y-1/2 rounded-full border border-canvas"
              style={{ backgroundColor: ref?.color ?? "var(--t-color-accent)" }}
            />
            {ref ? (
              <ul className="ms-2">
                <EntityRow entity={ref} />
              </ul>
            ) : (
              <p lang="nl" className="ms-2 px-1.5 py-1.5 text-[13px] font-medium text-accent-text">
                {layout.frame?.name ?? stepId}
              </p>
            )}
          </li>
        );
      })}
    </ol>
  );
}

/** The seats of a chamber as one bar of fractie blocks, with the majority marked. */
function SeatBar({
  entries,
  total,
  majority,
  highlight,
}: {
  entries: { label: string; color: string | null; seats: number }[];
  total: number;
  majority: number;
  highlight?: number;
}) {
  if (total <= 0) return null;
  return (
    <div aria-hidden="true" className="relative mt-1">
      <div className="flex h-2.5 w-full overflow-hidden rounded-pill bg-surface-inset">
        {entries.map((entry, index) => (
          <span
            key={`${entry.label}-${index}`}
            className="h-full border-e border-canvas last:border-e-0"
            style={{
              width: `${(entry.seats / total) * 100}%`,
              backgroundColor: entry.color ?? "var(--t-color-line-strong)",
              opacity: highlight === undefined || highlight === index ? 1 : 0.28,
            }}
          />
        ))}
      </div>
      <span className="absolute -top-1 bottom-[-4px] w-px bg-ink" style={{ left: `${(majority / total) * 100}%` }} />
    </div>
  );
}

function BudgetBlock({ budget }: { budget: NonNullable<PanelOrg["budget"]> }) {
  const t = useDict("panels");
  const rows: { key: string; label: string; value: number | null }[] = [
    { key: "spending", label: t("budgetSpending"), value: budget.spendingBudget ?? null },
    { key: "revenue", label: t("budgetRevenue"), value: budget.revenue ?? null },
    { key: "net", label: t("budgetNet"), value: budget.net ?? null },
  ];
  if (budget.previousFiscalYear && budget.spendingActual) {
    rows.push({ key: "actual", label: t("budgetActual", { year: budget.previousFiscalYear }), value: budget.spendingActual });
  }
  return (
    <Section title={t("budgetTitle", { year: budget.fiscalYear })} size="md">
      <dl className="divide-y divide-line border-y border-line">
        {rows
          .filter((row) => row.value !== null && row.value !== undefined)
          .map((row) => (
            <div key={row.key} className="flex items-baseline justify-between gap-3 py-1.5">
              <dt className="min-w-0 text-[13px] text-ink-muted">{row.label}</dt>
              <dd className="shrink-0 whitespace-nowrap text-sm font-medium tabular-nums text-ink">
                <Amount value={row.value} unit={budget.unit} />
              </dd>
            </div>
          ))}
      </dl>
      <div className="mt-1.5 flex flex-wrap items-center justify-between gap-x-4">
        <SourceLine source={budget.source} />
        <OpenPageLink href={budget.href} label={t("budgetOpen")} />
      </div>
    </Section>
  );
}

function HolderRows({ holders, limit, total }: { holders: PanelOrg["holders"]; limit: number; total: number }) {
  const t = useDict("panels");
  return (
    <LimitedList
      items={holders}
      limit={limit}
      total={total}
      className="-mx-1.5"
      render={(holder) => (
        <PersonRow
          key={`${holder.position.id}-${holder.person.id}`}
          person={holder.person}
          sub={
            <span lang="nl">
              {holder.position.name}
              {holder.acting ? <span lang={undefined}>, {t("actingRole")}</span> : null}
            </span>
          }
        />
      )}
    />
  );
}

export function OrgBody({
  id,
  record,
  layout,
  variant,
  withStructure,
}: {
  id: string;
  record: PanelOrg | null;
  layout: PanelLayout | null;
  variant: PanelVariant;
  withStructure: boolean;
}) {
  const t = useDict("panels");
  const node = layout?.byId.get(id) ?? null;
  const degree = layout ? (layout.adjacency.get(id)?.length ?? 0) : null;
  const childCount = layout ? layout.nodes.filter((candidate) => candidate.parent === id).length : null;

  if (variant === "side") {
    return (
      <div className={STACK}>
        <Facts
          items={[
            { key: "connections", label: t("factConnections"), value: degree },
            { key: "parts", label: t("factParts"), value: childCount },
            { key: "positions", label: t("factPositions"), value: record?.positionCount ?? null },
            { key: "members", label: t("factMembers"), value: record?.memberCount ?? null },
            { key: "news", label: t("factNews"), value: record?.newsCount ?? null },
          ]}
        />
        {record && record.holders.length > 0 ? (
          <Section title={t("keyPositions")} count={record.holderCount > record.holders.length ? record.holderCount : null}>
            <HolderRows holders={record.holders} limit={4} total={record.holderCount} />
          </Section>
        ) : null}
        {layout && node ? <OrgStructure id={id} layout={layout} variant="side" /> : null}
        <Footer source={record?.source ?? null} href={record?.href ?? (node ? `/organisaties/${node.slug}/` : null)} />
      </div>
    );
  }

  return (
    <div className={STACK}>
      {record?.description ? <p lang="nl" className="max-w-prose text-sm leading-relaxed text-ink-muted">{record.description}</p> : null}
      {record?.budget ? <BudgetBlock budget={record.budget} /> : null}
      {record && record.holders.length > 0 ? (
        <Section title={t("keyPositions")} count={record.holderCount} size="md">
          <HolderRows holders={record.holders} limit={6} total={record.holderCount} />
        </Section>
      ) : null}
      {record && record.news.length > 0 ? (
        <Section title={t("news")} count={record.newsCount} size="md">
          <NewsRows items={record.news} />
        </Section>
      ) : null}
      {record && record.inTheNews.length > 0 ? (
        <Section title={t("namedWith")} size="md">
          <PeopleGrid people={record.inTheNews} limit={6} />
        </Section>
      ) : null}
      {record && record.changes.length > 0 ? (
        <Section title={t("changes")} size="md">
          <ChangeRows changes={record.changes} />
        </Section>
      ) : null}
      {withStructure && layout && node ? <OrgStructure id={id} layout={layout} variant="page" /> : null}
      <Footer source={record?.source ?? null} href={record?.href ?? null} website={record?.website ?? null} />
    </div>
  );
}

function Footer({ source, href, website }: { source: PanelOrg["source"]; href: string | null; website?: string | null }) {
  const t = useDict("panels");
  return (
    <div className="space-y-1 border-t border-line pt-3">
      <SourceLine source={source} />
      <Links>
        {href ? <OpenPageLink href={href} /> : null}
        {website ? <ExternalLink href={website}>{t("website")}</ExternalLink> : null}
      </Links>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Person                                                              */
/* ------------------------------------------------------------------ */

export function PersonBody({
  selection,
  record,
  layout,
  variant,
}: {
  selection: Extract<Selection, { kind: "person" }>;
  record: PanelPersonRecord | null;
  layout: PanelLayout | null;
  variant: PanelVariant;
}) {
  const t = useDict("panels");
  const size = variant === "page" ? "md" : "sm";
  const seat = selection.seat ? fractieOf(layout, { kind: "fractie", chamberId: selection.seat.chamberId, index: selection.seat.fractieIndex, surface: "graph" }) : null;
  const chamberMembership = record?.memberships.find((membership) => layout?.chambers[membership.organization.id]) ?? null;
  const party = partyForKey(record?.partyKey);

  if (!record) return null;
  return (
    <div className={STACK}>
      {variant === "page" && record.description ? (
        <p lang="nl" className="max-w-prose text-sm leading-relaxed text-ink-muted">{record.description}</p>
      ) : null}

      {record.roles.length > 0 ? (
        <Section title={t("roles")} size={size}>
          <ul className="-mx-1.5">
            {record.roles.map((role) => (
              <EntityRow
                key={role.position.id}
                entity={role.position}
                sub={
                  <>
                    {role.organization ? <span lang="nl">{role.organization.name}</span> : null}
                    {role.acting ? <>{role.organization ? ", " : ""}{t("actingRole")}</> : null}
                  </>
                }
              />
            ))}
          </ul>
        </Section>
      ) : null}

      {record.party || seat || chamberMembership ? (
        <Section title={t("party")} size={size}>
          <div className="flex flex-wrap items-center gap-2">
            {record.party ? <PartyPill party={record.party.abbrev} /> : null}
            {record.party ? <span lang="nl" className="text-xs text-ink-muted">{record.party.name}</span> : null}
          </div>
          {seat ? (
            <p className="mt-2 text-xs text-ink-muted">
              <SelectLink
                selection={{ kind: "fractie", chamberId: seat.chamberId, index: selection.seat?.fractieIndex ?? 0, surface: "graph" }}
                  className="underline decoration-1 underline-offset-2 hover:text-ink"
              >
                {t("seatIn", { fractie: seat.entry.label, chamber: seat.chamberName })}
              </SelectLink>
            </p>
          ) : chamberMembership?.fractie ? (
            <p className="mt-2 text-xs text-ink-muted">
              {t("seatIn", { fractie: chamberMembership.fractie, chamber: chamberMembership.organization.name })}
            </p>
          ) : null}
          {variant === "page" ? (
            <div className="mt-1.5">
              <PartyLinks party={party} />
            </div>
          ) : null}
        </Section>
      ) : null}

      {record.memberships.length > 0 ? (
        <Section title={t("memberOf")} size={size}>
          <ul className="-mx-1.5">
            {record.memberships.map((membership) => (
              <EntityRow
                key={membership.organization.id}
                entity={membership.organization}
                lead={<OrgMark color={layout?.byId.get(membership.organization.id) ? branchColorVar(layout.byId.get(membership.organization.id)!.branch) : null} />}
                sub={membership.fractie ? <span lang="nl">{membership.fractie}</span> : undefined}
              />
            ))}
          </ul>
        </Section>
      ) : null}

      {variant === "side" && record.newsCount > 0 ? (
        <Facts items={[{ key: "news", label: t("factNews"), value: record.newsCount }]} />
      ) : null}

      {variant === "page" && record.news.length > 0 ? (
        <Section title={t("news")} count={record.newsCount} size="md">
          <NewsRows items={record.news} />
        </Section>
      ) : null}
      {variant === "page" && record.coMentioned.length > 0 ? (
        <Section title={t("namedWith")} size="md">
          <PeopleGrid people={record.coMentioned} limit={6} />
        </Section>
      ) : null}
      {variant === "page" && record.changes.length > 0 ? (
        <Section title={t("changes")} size="md">
          <ChangeRows changes={record.changes} />
        </Section>
      ) : null}

      <Footer source={record.source} href={record.href} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Fractie, cluster, sector                                            */
/* ------------------------------------------------------------------ */

export function FractieBody({
  selection,
  layout,
  variant,
}: {
  selection: Extract<Selection, { kind: "fractie" }>;
  layout: PanelLayout | null;
  variant: PanelVariant;
}) {
  const t = useDict("panels");
  const fractie = fractieOf(layout, selection);
  if (!layout || !fractie) return null;
  const { chamber, entry, party } = fractie;
  const members = (entry.members ?? []).flatMap((personId) => {
    const person = layout.seatPeople?.[personId];
    return person ? [{ id: personId, name: person.name, href: `/personen/${person.slug}/`, portrait: person.image, color: entry.color }] : [];
  });
  const others = Object.entries(layout.chambers)
    .filter(([id]) => id !== selection.chamberId)
    .flatMap(([id, other]) => {
      const index = other.entries.findIndex((candidate) => candidate.key !== null && candidate.key === entry.key);
      return index === -1 ? [] : [{ id, index, seats: other.entries[index].seats, name: layout.byId.get(id)?.name ?? id }];
    });
  const size = variant === "page" ? "md" : "sm";
  return (
    <div className={STACK}>
      <div>
        <p className="text-sm text-ink">
          <span className="font-semibold tabular-nums">{t("seatsOf", { n: entry.seats, total: chamber.total })}</span>
        </p>
        <SeatBar entries={chamber.entries} total={chamber.total} majority={chamber.majority} highlight={selection.index} />
        <p className="mt-1.5 text-xs text-ink-muted">
          <SelectLink selection={{ kind: "org", id: selection.chamberId, surface: "graph" }} href={nodeRef(layout, selection.chamberId)?.href} className="underline decoration-1 underline-offset-2 hover:text-ink">
            <span lang="nl">{fractie.chamberName}</span>
          </SelectLink>
          {", "}
          {t("seatsTotal", { total: chamber.total, majority: chamber.majority })}
        </p>
      </div>
      {members.length > 0 ? (
        <Section title={t("fractieMembers")} count={members.length} size={size}>
          {variant === "page" ? <PeopleGrid people={members} limit={18} /> : (
            <LimitedList items={members} limit={10} className="-mx-1.5" render={(person) => <PersonRow key={person.id} person={person} size={24} />} />
          )}
          <p className="mt-2 text-xs leading-relaxed text-ink-faint">{t("seatOrderNote")}</p>
        </Section>
      ) : null}
      {others.length > 0 ? (
        <Section title={t("otherChamber")} size={size}>
          <ul className="-mx-1.5">
            {others.map((other) => (
              <li key={other.id}>
                <SelectLink
                  selection={{ kind: "fractie", chamberId: other.id, index: other.index, surface: "graph" }}
                      className="group flex min-h-9 w-full items-center gap-2.5 rounded-sm px-1.5 py-1 transition-fast hover:bg-surface-inset pointer-coarse:min-h-11"
                >
                  <span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: entry.color ?? "var(--t-color-line-strong)" }} />
                  <span lang="nl" className="min-w-0 flex-1 text-[13px] text-ink group-hover:underline decoration-1 underline-offset-2">{other.name}</span>
                  <span className="shrink-0 text-xs tabular-nums text-ink-muted">{t("seatsOf", { n: other.seats, total: layout.chambers[other.id].total })}</span>
                </SelectLink>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}
      <div className="border-t border-line pt-3">
        <PartyLinks party={party} />
      </div>
    </div>
  );
}

export function ClusterBody({ id, layout, variant }: { id: string; layout: PanelLayout | null; variant: PanelVariant }) {
  const t = useDict("panels");
  const cluster = layout?.clusterById.get(id);
  if (!layout || !cluster) return null;
  return (
    <div className={STACK}>
      {cluster.parent ? (
        <ul className="-mx-1.5">
          <OrgRowById layout={layout} id={cluster.parent} />
        </ul>
      ) : null}
      <Section title={t("groupMembers")} count={cluster.members.length} size={variant === "page" ? "md" : "sm"}>
        <LimitedList
          items={cluster.members}
          limit={variant === "page" ? 16 : 12}
          className="-mx-1.5"
          render={(memberId) => <OrgRowById key={memberId} layout={layout} id={memberId} />}
        />
      </Section>
    </div>
  );
}

export function SectorBody({ id, layout, variant }: { id: string; layout: PanelLayout | null; variant: PanelVariant }) {
  const t = useDict("panels");
  const format = usePanelFormat();
  const clusterLabel = useClusterLabel();
  const sector = layout?.sectors.find((entry) => entry.id === id);
  const largest = useMemo(
    () =>
      layout
        ? layout.nodes
            .filter((node) => node.sector === id)
            .map((node) => ({ id: node.id, degree: layout.adjacency.get(node.id)?.length ?? 0 }))
            .sort((a, b) => b.degree - a.degree)
            .slice(0, 12)
        : [],
    [layout, id],
  );
  if (!layout || !sector) return null;
  const clusters = layout.clusters.filter((cluster) => cluster.sector === id);
  return (
    <div className={STACK}>
      <p className="text-sm font-semibold tabular-nums text-ink">{t("sectorBodies", { n: format.count(sector.count) })}</p>
      <Section title={t("sectorLargest")} size={variant === "page" ? "md" : "sm"}>
        <LimitedList
          items={largest}
          limit={variant === "page" ? 12 : 8}
          className="-mx-1.5"
          render={(entry) => <OrgRowById key={entry.id} layout={layout} id={entry.id} trailing={entry.degree > 0 ? format.count(entry.degree) : null} />}
        />
      </Section>
      {clusters.length > 0 ? (
        <Section title={t("sectorGroups")} count={clusters.length} size={variant === "page" ? "md" : "sm"}>
          <ul className="-mx-1.5">
            {clusters.map((cluster) => (
              <li key={cluster.id}>
                <SelectLink
                  selection={{ kind: "cluster", id: cluster.id, surface: "graph" }}
                      className="group flex min-h-9 w-full items-center gap-2.5 rounded-sm px-1.5 py-1 text-[13px] text-ink transition-fast hover:bg-surface-inset pointer-coarse:min-h-11"
                >
                  <DotsMark />
                  <span className="min-w-0 group-hover:underline decoration-1 underline-offset-2">{clusterLabel(layout, cluster)}</span>
                </SelectLink>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* News and topic                                                      */
/* ------------------------------------------------------------------ */

export function NewsBody({ record, variant }: { record: PanelNewsRecord | null; variant: PanelVariant }) {
  const t = useDict("panels");
  const format = usePanelFormat();
  const locale = useLocale() === "en" ? "en" : "nl";
  if (!record) return null;
  const translated = record.translation && record.translation.language === locale ? record.translation : null;
  const markup = translated?.lead ?? record.summaryMarkup;
  const kinds = new Map(record.entities.map((entity) => [entity.id, entity]));
  const people = record.entities.filter((entity) => entity.kind === "person");
  const others = record.entities.filter((entity) => entity.kind !== "person");
  return (
    <div className={STACK}>
      <p className="text-xs text-ink-muted">
        {record.publisher}, <time dateTime={record.published}>{format.date(record.published)}</time>
        {translated ? <>, {t("machineTranslation").toLocaleLowerCase(locale)}</> : null}
      </p>
      {markup ? (
        <p lang={translated ? translated.language : record.language} className={`leading-relaxed text-ink-muted ${variant === "page" ? "text-sm" : "text-[13px]"}`}>
          {renderSummaryMarkupWithHrefs(markup, (id) => {
            const entity = kinds.get(id);
            return entity ? { href: entity.href, kind: entity.kind } : null;
          })}
        </p>
      ) : null}
      {record.entities.length > 0 ? (
        <Section title={t("named")} size={variant === "page" ? "md" : "sm"}>
          <ul className="-mx-1.5">
            {people.map((person) => (
              <PersonRow key={person.id} person={person} />
            ))}
            {others.map((entity) => (
              <EntityRow key={entity.id} entity={entity} lead={<OrgMark color={`var(--kind-${entity.kind})`} />} />
            ))}
          </ul>
        </Section>
      ) : null}
      <div className="space-y-1 border-t border-line pt-3">
        <SourceLine source={record.source} />
        <ExternalLink href={record.url}>{t("readArticle", { publisher: record.publisher })}</ExternalLink>
      </div>
    </div>
  );
}

export function TopicBody({ record, variant }: { record: PanelTopic | null; variant: PanelVariant }) {
  const t = useDict("panels");
  if (!record) return null;
  const size = variant === "page" ? "md" : "sm";
  return (
    <div className={STACK}>
      {record.description ? <p lang="nl" className="text-sm leading-relaxed text-ink-muted">{record.description}</p> : null}
      {record.organizations.length > 0 ? (
        <Section title={t("responsible")} count={record.organizations.length} size={size}>
          <LimitedList items={record.organizations} limit={8} className="-mx-1.5" render={(org) => <EntityRow key={org.id} entity={org} lead={<OrgMark />} />} />
        </Section>
      ) : null}
      {variant === "page" && record.positions.length > 0 ? (
        <Section title={t("positions")} count={record.positions.length} size={size}>
          <LimitedList items={record.positions} limit={6} className="-mx-1.5" render={(position) => <EntityRow key={position.id} entity={position} />} />
        </Section>
      ) : null}
      {record.news.length > 0 ? (
        <Section title={t("news")} count={record.newsCount} size={size}>
          <NewsRows items={variant === "page" ? record.news : record.news.slice(0, 3)} />
        </Section>
      ) : null}
      <Footer source={record.source} href={record.href} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Nothing picked                                                      */
/* ------------------------------------------------------------------ */

export function DefaultBody({ index, layout }: { index: PanelIndex | null; layout: PanelLayout | null }) {
  const t = useDict("panels");
  const format = usePanelFormat();
  const locale = useLocale() === "en" ? "en" : "nl";
  const sectors = layout ? [...layout.sectors].sort((a, b) => b.count - a.count).slice(0, 6) : [];
  return (
    <div className={STACK}>
      {index && index.inTheNews.length > 0 ? (
        <Section title={t("defaultInTheNews")}>
          {index.newsWindowDays ? <p className="-mt-1 mb-1 text-xs text-ink-faint">{t("defaultInTheNewsWindow", { n: index.newsWindowDays })}</p> : null}
          <ul className="-mx-1.5">
            {index.inTheNews.slice(0, 5).map((person) => (
              <PersonRow key={person.id} person={person} trailing={person.count ? format.count(person.count) : null} />
            ))}
          </ul>
        </Section>
      ) : null}
      {sectors.length > 0 ? (
        <Section title={t("defaultSectors")}>
          <ul className="-mx-1.5">
            {sectors.map((sector) => (
              <li key={sector.id}>
                <SelectLink
                  selection={{ kind: "sector", id: sector.id, surface: "graph" }}
                      className="group flex min-h-9 w-full items-center gap-2.5 rounded-sm px-1.5 py-1 transition-fast hover:bg-surface-inset pointer-coarse:min-h-11"
                >
                  <span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-full border-2" style={{ borderColor: branchColorVar(sector.branch) }} />
                  <span className="min-w-0 flex-1 text-[13px] text-ink group-hover:underline decoration-1 underline-offset-2">
                    {SECTOR_LABELS_I18N[sector.id]?.[locale] ?? sector.id}
                  </span>
                  <span className="shrink-0 text-xs tabular-nums text-ink-muted">{format.count(sector.count)}</span>
                </SelectLink>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}
      {index && index.changes.length > 0 ? (
        <Section title={t("defaultChanges")}>
          <ChangeRows changes={index.changes.slice(0, 4)} />
        </Section>
      ) : null}
    </div>
  );
}
