"use client";

import { useMemo } from "react";
import type { ClusterInfo, GraphBundle, GraphLayout, LaidOutNode } from "@/lib/graph";
import { computeFocusPath } from "@/lib/graph";
import { PARTIES, partySlug } from "@/lib/parties";
import { branchColorVar } from "@/lib/branch-colors";
import { useT } from "@/components/i18n/use-t";
import { useLocale } from "@/components/i18n/language-provider";
import {
  EDGE_TYPE_LABELS_I18N,
  ORG_SUBTYPE_LABELS_I18N,
  ORG_TYPE_LABELS_I18N,
  SECTOR_LABELS_I18N,
  TIER_LABELS_I18N,
} from "@/lib/i18n/dict-graph";
import { orgEnGloss } from "@/lib/name-gloss";

/** What the panel describes: whatever the reader last picked in the graph. */
export type DetailsTarget =
  | { kind: "node"; id: string }
  | { kind: "cluster"; id: string }
  | { kind: "fractie"; chamberId: string; index: number }
  | { kind: "sector"; id: string }
  | null;

type GraphDetailsProps = {
  layout: GraphLayout;
  chambers: GraphBundle["chambers"];
  target: DetailsTarget;
  openCluster: string | null;
  clusterLabel: (cluster: ClusterInfo) => string;
  onSelectNode: (id: string | null) => void;
  onSelectCluster: (id: string | null) => void;
  onSelectFractie: (chamberId: string, index: number) => void;
  onClear: () => void;
};

/** Most rows of a list before it is cut off, so the panel stays scannable. */
const MAX_ROWS = 14;

function localized(
  locale: "nl" | "en",
  map: Record<string, { nl: string; en: string }>,
  key: string | null | undefined,
): string {
  if (!key) return "";
  const entry = map[key];
  if (!entry) return key ?? "";
  return locale === "en" ? entry.en : entry.nl;
}

function Row({ label, onClick, colour }: { label: string; onClick: () => void; colour?: string | null }) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className="flex w-full items-center gap-1.5 rounded-sm px-1 py-0.5 text-start text-[11px] leading-snug text-ink-muted hover:bg-surface-inset hover:text-ink"
      >
        {colour ? <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full" style={{ background: colour }} /> : null}
        <span className="min-w-0 flex-1 truncate">{label}</span>
      </button>
    </li>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-3">
      <h4 className="text-[10px] font-semibold uppercase tracking-wider text-ink-faint">{title}</h4>
      <div className="mt-1">{children}</div>
    </section>
  );
}

/**
 * The details panel beside the graph.
 *
 * Every object on the canvas explains itself here: an organization with its
 * place, its relations and its path to the electorate; a group of dots with
 * the bodies it holds; a fractie with its seats; a sector with its size. The
 * canvas stays a picture and the words live in one place, which is also the
 * only place a reader can follow a relation by name.
 */
export function GraphDetails({
  layout,
  chambers,
  target,
  openCluster,
  clusterLabel,
  onSelectNode,
  onSelectCluster,
  onSelectFractie,
  onClear,
}: GraphDetailsProps) {
  const t = useT("graph");
  const tCommon = useT("common");
  const locale = useLocale();

  const node = target?.kind === "node" ? layout.byId.get(target.id) ?? null : null;
  const cluster = target?.kind === "cluster" ? layout.clusterById.get(target.id) ?? null : null;
  const sector = target?.kind === "sector" ? layout.sectors.find((entry) => entry.id === target.id) ?? null : null;
  const chamber = target?.kind === "fractie" ? chambers[target.chamberId] ?? null : null;
  const fractie = chamber && target?.kind === "fractie" ? chamber.entries[target.index] ?? null : null;

  const gloss = (name: string) => (locale === "en" ? orgEnGloss(name) : null);

  /** The selected body's relations, by type, as text the reader can follow. */
  const relations = useMemo(() => {
    if (!node) return [];
    const list: { id: string; verb: string; name: string; outgoing: boolean }[] = [];
    for (const edge of layout.edges) {
      const outgoing = edge.from === node.id;
      if (!outgoing && edge.to !== node.id) continue;
      const other = layout.byId.get(outgoing ? edge.to : edge.from);
      if (!other) continue;
      list.push({
        id: other.id,
        verb: localized(locale, EDGE_TYPE_LABELS_I18N, edge.type) || edge.type,
        name: other.name,
        outgoing,
      });
    }
    return list.sort((a, b) => (a.verb !== b.verb ? (a.verb < b.verb ? -1 : 1) : a.name < b.name ? -1 : 1));
  }, [layout, node, locale]);

  const path = useMemo(() => (node ? computeFocusPath(layout, node.id).slice(1) : []), [layout, node]);

  const heading =
    node?.name ??
    (cluster ? clusterLabel(cluster) : null) ??
    (fractie ? fractie.label : null) ??
    (sector ? localized(locale, SECTOR_LABELS_I18N, sector.id) || sector.id : null) ??
    t("detailsTitle");

  const accent = node
    ? branchColorVar(node.branch)
    : cluster
      ? branchColorVar((layout.sectors.find((entry) => entry.id === cluster.sector)?.branch ?? "regering") as LaidOutNode["branch"])
      : fractie
        ? fractie.color ?? "var(--t-color-line-strong)"
        : sector
          ? branchColorVar(sector.branch)
          : "var(--t-color-line)";

  const party = fractie ? PARTIES.find((entry) => entry.key === fractie.key) ?? null : null;
  const chamberId = target?.kind === "fractie" ? target.chamberId : null;
  const otherChambers = fractie
    ? Object.entries(chambers)
        .filter(([id]) => id !== chamberId)
        .map(([id, other]) => {
          const index = other.entries.findIndex((entry) => entry.key !== null && entry.key === fractie.key);
          return index === -1 ? null : { id, index, seats: other.entries[index].seats, name: layout.byId.get(id)?.name ?? id };
        })
        .filter((entry): entry is { id: string; index: number; seats: number; name: string } => entry !== null)
    : [];

  return (
    <aside
      aria-label={t("detailsTitle")}
      className="flex max-h-56 min-h-0 shrink-0 flex-col border-t border-line bg-surface sm:max-h-none sm:w-52 sm:border-s sm:border-t-0 xl:w-60"
    >
      <div className="flex items-center justify-between gap-2 border-b border-line px-3 py-2">
        <h3 className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">{t("detailsTitle")}</h3>
        {target ? (
          <button type="button" onClick={onClear} className="text-[10px] font-medium text-accent-text underline underline-offset-2">
            {t("detailsClear")}
          </button>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2.5">
        {!target ? <p className="text-[11px] leading-relaxed text-ink-faint">{t("detailsEmpty")}</p> : null}

        {target ? (
          <>
            <div className="border-s-2 ps-2" style={{ borderColor: accent }}>
              <p className="text-sm font-semibold leading-tight text-ink">{heading}</p>
              {node && gloss(node.name) ? <p className="text-[10px] text-ink-faint">({gloss(node.name)})</p> : null}
            </div>

            <div className="mt-2 flex flex-wrap gap-1">
              {node ? (
                <>
                  <span
                    className="rounded-pill border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide"
                    style={{ borderColor: accent, color: accent }}
                  >
                    {localized(locale, ORG_SUBTYPE_LABELS_I18N, node.subtype)}
                  </span>
                  <span className="rounded-pill border border-line px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-ink-muted">
                    {localized(locale, TIER_LABELS_I18N, node.tier)}
                  </span>
                  <span className="rounded-pill border border-line px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-ink-muted">
                    {localized(locale, ORG_TYPE_LABELS_I18N, node.type)}
                  </span>
                </>
              ) : null}
              {fractie ? (
                <span
                  className="rounded-pill border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide"
                  style={{ borderColor: accent, color: fractie.color ?? undefined }}
                >
                  {t("detailsFractieChip")}
                </span>
              ) : null}
              {sector ? (
                <span className="rounded-pill border border-line px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-ink-muted">
                  {localized(locale, TIER_LABELS_I18N, sector.tier)}
                </span>
              ) : null}
            </div>

            {/* An organization: where it sits, what it touches, how far it is from the vote. */}
            {node ? (
              <>
                {node.parent && layout.byId.get(node.parent) ? (
                  <p className="mt-2 text-[11px] text-ink-muted">
                    {t("parentOf", { parent: "" })}
                    <button
                      type="button"
                      onClick={() => onSelectNode(node.parent)}
                      className="font-medium text-accent-text underline underline-offset-2"
                    >
                      {layout.byId.get(node.parent)?.name}
                    </button>
                  </p>
                ) : null}

                {node.cluster && layout.clusterById.get(node.cluster) ? (
                  <p className="mt-1 text-[11px]">
                    <button
                      type="button"
                      onClick={() => onSelectCluster(node.cluster)}
                      className="text-start text-ink-muted underline underline-offset-2 hover:text-ink"
                    >
                      {clusterLabel(layout.clusterById.get(node.cluster) as ClusterInfo)}
                    </button>
                  </p>
                ) : null}

                {chambers[node.id] ? (
                  <Section title={t("detailsFracties")}>
                    <p className="mb-1 text-[11px] text-ink-muted">
                      {t("detailsSeatsTotal", { total: chambers[node.id].total })} · {t("detailsMajority", { n: chambers[node.id].majority })}
                    </p>
                    <ul>
                      {chambers[node.id].entries.map((entry, index) => (
                        <Row
                          key={`${entry.label}-${index}`}
                          colour={entry.color}
                          label={`${entry.label} · ${entry.seats}`}
                          onClick={() => onSelectFractie(node.id, index)}
                        />
                      ))}
                    </ul>
                  </Section>
                ) : null}

                {relations.length > 0 ? (
                  <Section title={`${t("detailsRelations")} (${relations.length})`}>
                    <ul>
                      {relations.slice(0, MAX_ROWS).map((relation, index) => (
                        <Row
                          key={`${relation.id}-${index}`}
                          label={
                            relation.outgoing
                              ? t("edgeOut", { verb: relation.verb, neighbour: relation.name })
                              : t("edgeIn", { verb: relation.verb, neighbour: relation.name })
                          }
                          onClick={() => onSelectNode(relation.id)}
                        />
                      ))}
                    </ul>
                    {relations.length > MAX_ROWS ? (
                      <p className="mt-1 px-1 text-[10px] text-ink-faint">{t("detailsMore", { n: relations.length - MAX_ROWS })}</p>
                    ) : null}
                  </Section>
                ) : null}

                {path.length > 0 ? (
                  <Section title={t("detailsPathToVoters")}>
                    <ul>
                      {path.map((id) => {
                        const step = layout.byId.get(id);
                        const name = step?.name ?? layout.frame?.name ?? id;
                        return step ? (
                          <Row key={id} label={name} onClick={() => onSelectNode(id)} />
                        ) : (
                          <li key={id} className="px-1 py-0.5 text-[11px] text-ink-faint">
                            {layout.frame?.name ?? id}
                          </li>
                        );
                      })}
                    </ul>
                  </Section>
                ) : null}

                <a
                  href={`/organisaties/${node.slug}/`}
                  className="mt-3 inline-block text-[11px] font-medium text-accent-text underline underline-offset-2"
                >
                  {tCommon("openOrgPage")}
                </a>
              </>
            ) : null}

            {/* A group of dots: which bodies it folds together. */}
            {cluster ? (
              <>
                <button
                  type="button"
                  onClick={() => onSelectCluster(openCluster === cluster.id ? null : cluster.id)}
                  className="mt-2 rounded-sm border border-line px-2 py-1 text-[11px] font-medium text-ink-muted hover:text-ink"
                >
                  {openCluster === cluster.id ? t("detailsFoldGroup") : t("detailsOpenGroup")}
                </button>
                {cluster.parent && layout.byId.get(cluster.parent) ? (
                  <p className="mt-2 text-[11px]">
                    <button
                      type="button"
                      onClick={() => onSelectNode(cluster.parent)}
                      className="text-start font-medium text-accent-text underline underline-offset-2"
                    >
                      {layout.byId.get(cluster.parent)?.name}
                    </button>
                  </p>
                ) : null}
                <Section title={t("detailsMembers")}>
                  <ul>
                    {cluster.members.map((id) => (
                      <Row key={id} label={layout.byId.get(id)?.name ?? id} onClick={() => onSelectNode(id)} />
                    ))}
                  </ul>
                </Section>
              </>
            ) : null}

            {/* A fractie: its seats here, and in the other chamber. */}
            {fractie && chamber && target?.kind === "fractie" ? (
              <>
                <p className="mt-2 text-[11px] text-ink-muted">
                  {t("detailsSeatsOf", { n: fractie.seats, total: chamber.total })}
                </p>
                <p className="mt-1 text-[11px]">
                  <button
                    type="button"
                    onClick={() => onSelectNode(target.chamberId)}
                    className="text-start font-medium text-accent-text underline underline-offset-2"
                  >
                    {layout.byId.get(target.chamberId)?.name ?? target.chamberId}
                  </button>
                </p>
                {otherChambers.length > 0 ? (
                  <Section title={t("detailsOtherChamber")}>
                    <ul>
                      {otherChambers.map((other) => (
                        <Row
                          key={other.id}
                          colour={fractie.color}
                          label={`${other.name} · ${other.seats}`}
                          onClick={() => onSelectFractie(other.id, other.index)}
                        />
                      ))}
                    </ul>
                  </Section>
                ) : null}
                {party ? (
                  <a
                    href={`/partijen/${partySlug(party)}/`}
                    className="mt-3 inline-block text-[11px] font-medium text-accent-text underline underline-offset-2"
                  >
                    {t("detailsPartyPage")}
                  </a>
                ) : null}
                <p className="mt-3 text-[10px] leading-relaxed text-ink-faint">{t("detailsNoSeatOrder")}</p>
              </>
            ) : null}

            {/* A sector: how much of the state it holds. */}
            {sector ? <p className="mt-2 text-[11px] text-ink-muted">{t("detailsSectorBodies", { n: sector.count })}</p> : null}
          </>
        ) : null}
      </div>
    </aside>
  );
}
