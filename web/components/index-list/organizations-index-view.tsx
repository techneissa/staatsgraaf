"use client";

import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { Handshake, X } from "lucide";
import { LucideIcon } from "@/components/icons/lucide-icon";
import { LabelledNav } from "@/components/entity/labelled-nav";
import { LocalCount } from "@/components/content/local-date";
import { useLocale } from "@/components/i18n/language-provider";
import { LocaleLabel } from "@/components/i18n/locale-label";
import { useT } from "@/components/i18n/use-t";
import { branchColorVar } from "@/lib/branch-colors";
import { formatCountIn } from "@/lib/format";
import {
  dominantSubtype,
  organizationSearchText,
  organizationTree,
  OTHER_SUBGROUP,
  searchTerms,
  type OrganizationGroup,
  type OrganizationRow,
  type OrganizationSubgroup,
} from "@/lib/index-lists";
import type { OrgBranch } from "@/lib/types";
import { ministryIcon } from "@/components/icons/ministry-icon";
import { NoScriptNote } from "./no-script-note";
import { ListStatus } from "./list-status";
import { OrgCard } from "./org-card";
import { ArmsImage, GROUP_CLUSTERS, GROUP_META, IconTile, type GroupCluster } from "./org-visual";
import { IndexSearchField } from "./search-field";
import { useAnchorJump } from "./use-anchor-jump";
import { useIndexParams } from "./use-index-params";
import { useIndexRows } from "./use-index-rows";

const PARAMS = ["q"] as const;

const CLUSTER_KEY: Record<GroupCluster, string> = {
  national: "orgOverviewNational",
  decentral: "orgOverviewDecentral",
  distance: "orgOverviewDistance",
};

/** One short line per group in the overview: what the group is. */
const LINE_KEY: Record<OrgBranch, string> = {
  "staten-generaal": "orgLineStatenGeneraal",
  regering: "orgLineRegering",
  "rechterlijke-macht": "orgLineRechterlijkeMacht",
  "hoge-colleges": "orgLineHogeColleges",
  adviescolleges: "orgLineAdviescolleges",
  "decentraal-provinciaal": "orgLineProvincies",
  "decentraal-lokaal": "orgLineGemeenten",
  waterschap: "orgLineWaterschappen",
  "caribisch-nederland": "orgLineCaribischNederland",
  zelfstandig: "orgLineZelfstandig",
  koninkrijk: "orgLineKoninkrijk",
};

const GRID_CLASS = "grid list-none grid-cols-1 items-start gap-1.5 p-0 @xl:grid-cols-2 @5xl:grid-cols-3";

const FOCUS_CLASS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus";

/** The rows of a group (or a subgroup) as cards, the nested bodies under their parent, the type the group is named after first. */
function CardGrid({ rows, nest, shortGemeente = false }: { rows: OrganizationRow[]; nest: boolean; shortGemeente?: boolean }) {
  const { tops, children } = useMemo(() => {
    if (!nest) return { tops: rows, children: new Map<string, OrganizationRow[]>() };
    const tree = organizationTree(rows);
    const dominant = dominantSubtype(tree.tops);
    const ordered = dominant === null ? tree.tops : [...tree.tops.filter((row) => row.st === dominant), ...tree.tops.filter((row) => row.st !== dominant)];
    for (const parts of tree.children.values()) parts.sort((a, b) => Number((b.se ?? 0) > 0) - Number((a.se ?? 0) > 0));
    return { tops: ordered, children: tree.children };
  }, [rows, nest]);
  const wide = tops.some((row) => !row.w && row.lg);
  return (
    <div className="@container">
      <ul role="list" className={GRID_CLASS}>
        {tops.map((row) => (
          <OrgCard
            key={row.s}
            row={row}
            parts={children.get(row.s) ?? []}
            wide={wide}
            label={shortGemeente && row.st === "gemeente" ? row.n.replace(/^Gemeente\s+/u, "") : undefined}
          />
        ))}
      </ul>
    </div>
  );
}

/** The label and the visual of a subgroup: the provincie with its arms, the ministerie with its icon. */
function useSubgroupFace(group: OrganizationGroup, subgroup: OrganizationSubgroup, size: "md" | "sm") {
  const t = useT("entity");
  const other = subgroup.key === OTHER_SUBGROUP;
  const label = other ? t(group.key === "decentraal-lokaal" ? "orgOtherLokaal" : "orgOtherGroup") : subgroup.label;
  const visual =
    !other && subgroup.w ? (
      <ArmsImage url={subgroup.w} size={size} />
    ) : !other && group.by === "ministerie" && subgroup.id !== null ? (
      // The ministry's own icon, in the colour of the government it belongs to.
      <IconTile color={branchColorVar("regering")} icon={ministryIcon(subgroup.id)} size={size} />
    ) : (
      <IconTile color={branchColorVar(group.key)} icon={other && group.key === "decentraal-lokaal" ? Handshake : GROUP_META[group.key].icon} size={size} />
    );
  return { label, visual };
}

const panelIdOf = (group: OrganizationGroup, subgroup: OrganizationSubgroup) => `deel-${group.key}-${subgroup.key}`;

/** A provincie of the gemeenten, a ministerie of the zelfstandige organen: a tile that opens its cards below the tiles. */
function SubgroupTile({ group, subgroup, open, onToggle }: { group: OrganizationGroup; subgroup: OrganizationSubgroup; open: boolean; onToggle: () => void }) {
  const t = useT("entity");
  const locale = useLocale();
  const { label, visual } = useSubgroupFace(group, subgroup, "md");
  const color = branchColorVar(group.key);
  return (
    <li className={`min-w-0 ${subgroup.key === OTHER_SUBGROUP ? "col-span-full" : ""}`}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelIdOf(group, subgroup)}
        onClick={onToggle}
        title={label}
        className={`flex h-full min-h-12 w-full items-center gap-2.5 rounded-lg border p-1.5 pe-2.5 text-start text-ink transition-fast hover:border-line-strong hover:bg-surface-raised ${FOCUS_CLASS} ${open ? "" : "border-line bg-surface"}`}
        style={open ? { borderColor: color, backgroundColor: `color-mix(in srgb, ${color} 12%, transparent)` } : undefined}
      >
        {visual}
        <span className="line-clamp-2 min-w-0 flex-1 text-sm font-medium leading-snug">{label}</span>
        <span className="shrink-0 text-xs tabular-nums text-ink-muted">
          <span aria-hidden="true">{formatCountIn(subgroup.count, locale)}</span>
          <span className="sr-only">{t("orgSubgroupCount", { n: formatCountIn(subgroup.count, locale) })}</span>
        </span>
      </button>
    </li>
  );
}

/** The cards of an opened subgroup, under its own heading, with a button that closes it again. */
function SubgroupPanel({
  group,
  subgroup,
  rows,
  open,
  onClose,
}: {
  group: OrganizationGroup;
  subgroup: OrganizationSubgroup;
  /** Null while the whole list is still on its way. */
  rows: OrganizationRow[] | null;
  open: boolean;
  onClose: () => void;
}) {
  const t = useT("entity");
  const locale = useLocale();
  const { label, visual } = useSubgroupFace(group, subgroup, "sm");
  const panelId = panelIdOf(group, subgroup);
  const ref = useRef<HTMLDivElement>(null);
  // An opened panel sits below the tiles: bring its top into view, without moving focus.
  useEffect(() => {
    if (open) ref.current?.scrollIntoView({ block: "nearest" });
  }, [open]);
  return (
    <div ref={ref} id={panelId} hidden={!open} className="mt-3 scroll-mt-20 rounded-lg border border-line bg-surface-inset p-2">
      {open ? (
        <>
          <div className="flex min-h-11 items-center gap-2.5 px-1 pb-2">
            {visual}
            <h3 className="m-0 flex min-w-0 flex-1 items-baseline gap-2 text-base font-semibold text-ink">
              <span className="min-w-0 break-words">{label}</span>
              <span className="shrink-0 text-xs font-normal tabular-nums text-ink-muted">
                <span aria-hidden="true">{formatCountIn(subgroup.count, locale)}</span>
                <span className="sr-only">{t("orgSubgroupCount", { n: formatCountIn(subgroup.count, locale) })}</span>
              </span>
            </h3>
            <button
              type="button"
              aria-controls={panelId}
              aria-expanded
              onClick={onClose}
              className={`inline-flex min-h-9 min-w-9 shrink-0 items-center justify-center rounded-pill text-ink-muted transition-fast hover:bg-surface-raised hover:text-ink pointer-coarse:min-h-11 pointer-coarse:min-w-11 ${FOCUS_CLASS}`}
            >
              <LucideIcon icon={X} size={16} strokeWidth={2} />
              <span className="sr-only">{t("orgCloseSubgroup", { name: label })}</span>
            </button>
          </div>
          {rows === null ? <p className="px-1 py-2 text-sm text-ink-muted">{t("idxLoading")}</p> : <CardGrid rows={rows} nest shortGemeente={group.by === "provincie"} />}
        </>
      ) : null}
    </div>
  );
}

/** The heading band of a group: its colour, its icon, its name and count. */
function GroupHeading({ group, anchor, count }: { group: OrganizationGroup; anchor: string; count: number }) {
  const color = branchColorVar(group.key);
  return (
    <div
      className="flex items-center gap-3 rounded-lg border-s-4 px-3 py-2"
      style={{ borderColor: color, backgroundColor: `color-mix(in srgb, ${color} 10%, transparent)` }}
    >
      <IconTile color={color} icon={GROUP_META[group.key].icon} size="md" />
      <h2 id={anchor} className="flex min-w-0 flex-1 scroll-mt-20 items-baseline justify-between gap-3 text-lg font-semibold tracking-tight text-ink">
        <span className="min-w-0">
          <LocaleLabel kind="branch" value={group.key} />
        </span>{" "}
        <span className="shrink-0 text-sm font-normal tabular-nums text-ink-muted">
          <LocalCount value={count} />
        </span>
      </h2>
    </div>
  );
}

/**
 * The overview of the Dutch state: one tile per group (staatsmacht) in the
 * colour of its sector in the graph, with its icon, its number of bodies and
 * one line on what it is, arranged as national, decentral, and at arm's
 * length with the Kingdom. A tile jumps to its group.
 */
function Overview({ groups, onJump }: { groups: OrganizationGroup[]; onJump: (key: OrgBranch) => void }) {
  const t = useT("entity");
  const locale = useLocale();
  return (
    <LabelledNav area="entity" k="groupNavLabel" className="mt-3 @container">
      <div className="grid gap-5 @5xl:grid-cols-3 @5xl:gap-4">
        {GROUP_CLUSTERS.map((cluster) => {
          const members = groups.filter((group) => (GROUP_META[group.key]?.cluster ?? "distance") === cluster);
          if (members.length === 0) return null;
          const labelId = `overzicht-${cluster}`;
          return (
            <div key={cluster} className="min-w-0">
              <p id={labelId} className="text-xs font-semibold uppercase tracking-wider text-ink-faint">
                {t(CLUSTER_KEY[cluster])}
              </p>
              <ul aria-labelledby={labelId} className="mt-2 grid list-none grid-cols-1 gap-2 p-0 @lg:grid-cols-2 @5xl:grid-cols-1">
                {members.map((group) => {
                  const color = branchColorVar(group.key);
                  const anchor = `groep-${group.key}`;
                  return (
                    <li key={group.key} className="min-w-0">
                      <a
                        href={`#${anchor}`}
                        onClick={(event) => {
                          if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
                          event.preventDefault();
                          onJump(group.key);
                        }}
                        className={`relative flex h-full min-h-14 items-center gap-3 overflow-hidden rounded-lg border border-line bg-surface py-2 ps-3.5 pe-3 transition-fast hover:border-line-strong hover:bg-surface-raised ${FOCUS_CLASS}`}
                      >
                        <span aria-hidden="true" className="absolute inset-y-0 start-0 w-1" style={{ backgroundColor: color }} />
                        <IconTile color={color} icon={GROUP_META[group.key]?.icon ?? GROUP_META.zelfstandig.icon} size="md" />
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-semibold leading-tight text-ink">
                            <LocaleLabel kind="branch" value={group.key} />
                          </span>
                          <span className="mt-0.5 block text-xs leading-snug text-ink-muted">
                            {t(LINE_KEY[group.key] ?? "", { n: formatCountIn(group.units ?? 0, locale) })}
                          </span>
                        </span>
                        <span className="shrink-0 self-start pt-0.5 text-sm font-semibold tabular-nums text-ink">
                          <LocalCount value={group.count} />
                        </span>
                      </a>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
    </LabelledNav>
  );
}

/**
 * The organisations index: a search field, an overview of the groups
 * (staatsmacht) as coloured tiles, and per group a heading band and a grid of
 * cards, one per body, each with its coat of arms, logo or icon.
 *
 * Bodies that belong to another body of their group (the gemeenteraad and the
 * college under their gemeente) fold inside its card. The two long groups are
 * split: the gemeenten by provincie, the zelfstandige organen by ministerie,
 * each a closed heading with its count. The server renders exactly that
 * state; the whole list is one JSON file, searched here across every row
 * (?q= in the URL). A search shows every match as a card in its group.
 */
export function OrganizationsIndexView({ initial, groups, total }: { initial: OrganizationRow[]; groups: OrganizationGroup[]; total: number }) {
  const t = useT("entity");
  const { rows, full, failed, retry } = useIndexRows("organisaties", initial);
  const { values, set, clear, ready } = useIndexParams(PARAMS);
  const query = useDeferredValue(values.q);
  const filtering = values.q.trim() !== "";
  const [opened, setOpened] = useState<ReadonlySet<string>>(() => new Set());

  const searchTexts = useMemo(() => rows.map(organizationSearchText), [rows]);
  const searching = useMemo(() => searchTerms(query).length > 0, [query]);
  const matches = useMemo(() => {
    if (!full && filtering) return null;
    const terms = searchTerms(query);
    if (terms.length === 0) return rows;
    return rows.filter((_, index) => terms.every((term) => searchTexts[index].includes(term)));
  }, [rows, searchTexts, query, full, filtering]);

  /** Rows per group, and per subgroup within a split group. */
  const byGroup = useMemo(() => {
    const map = new Map<string, OrganizationRow[]>();
    for (const row of matches ?? []) {
      const list = map.get(row.b);
      if (list) list.push(row);
      else map.set(row.b, [row]);
    }
    return map;
  }, [matches]);
  const bySubgroup = useMemo(() => {
    const map = new Map<string, OrganizationRow[]>();
    if (!full) return map;
    for (const row of rows) {
      if (row.sg == null) continue;
      const key = `${row.b}:${row.sg}`;
      const list = map.get(key);
      if (list) list.push(row);
      else map.set(key, [row]);
    }
    return map;
  }, [rows, full]);

  const shownGroups = useMemo(() => (searching ? groups.filter((group) => byGroup.has(group.key)) : groups), [searching, groups, byGroup]);
  const jump = useAnchorJump(shownGroups);

  const toggle = (key: string) =>
    setOpened((current) => {
      const next = new Set(current);
      if (!next.delete(key)) next.add(key);
      return next;
    });

  return (
    <>
      <div className="mt-6">
        <IndexSearchField
          value={values.q}
          onChange={(value) => set("q", value)}
          label={t("idxSearchOrganizations")}
          placeholder={t("idxSearchOrganizationsPlaceholder")}
          className="sm:max-w-sm"
        />
      </div>

      <ListStatus
        noun="Organizations"
        shown={matches?.length ?? null}
        total={total}
        filtering={filtering && ready}
        loading={!full && filtering && !failed}
        failed={failed}
        onClear={clear}
        onRetry={retry}
      />

      {filtering ? null : <Overview groups={groups} onJump={(key) => jump(`groep-${key}`)} />}

      <NoScriptNote />
      {shownGroups.map((group) => {
        const anchor = `groep-${group.key}`;
        const items = byGroup.get(group.key) ?? [];
        const split = !searching && (group.subgroups?.length ?? 0) > 0;
        return (
          <section key={group.key} data-group={group.key} aria-labelledby={anchor} className="mt-10">
            <GroupHeading group={group} anchor={anchor} count={searching ? items.length : group.count} />
            {split ? (
              <>
                <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-ink-faint">{t(group.by === "ministerie" ? "orgByMinisterie" : "orgByProvincie")}</p>
                <div className="mt-2 @container">
                  <ul
                    role="list"
                    className={`grid list-none gap-2 p-0 ${group.by === "ministerie" ? "grid-cols-1 @lg:grid-cols-2 @4xl:grid-cols-3" : "grid-cols-2 @2xl:grid-cols-3 @5xl:grid-cols-4"}`}
                  >
                    {(group.subgroups ?? []).map((subgroup) => {
                      const key = `${group.key}:${subgroup.key}`;
                      return <SubgroupTile key={key} group={group} subgroup={subgroup} open={opened.has(key)} onToggle={() => toggle(key)} />;
                    })}
                  </ul>
                </div>
                {(group.subgroups ?? []).map((subgroup) => {
                  const key = `${group.key}:${subgroup.key}`;
                  return (
                    <SubgroupPanel
                      key={key}
                      group={group}
                      subgroup={subgroup}
                      rows={full ? (bySubgroup.get(key) ?? []) : null}
                      open={opened.has(key)}
                      onClose={() => toggle(key)}
                    />
                  );
                })}
              </>
            ) : (
              <div className="mt-3">
                <CardGrid rows={items} nest={!searching} />
              </div>
            )}
          </section>
        );
      })}
    </>
  );
}
