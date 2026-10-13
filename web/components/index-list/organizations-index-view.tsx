"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { LabelledNav } from "@/components/entity/labelled-nav";
import { LocalCount } from "@/components/content/local-date";
import { LocaleLabel } from "@/components/i18n/locale-label";
import { T } from "@/components/i18n/t";
import { useT } from "@/components/i18n/use-t";
import { branchColorVar } from "@/lib/branch-colors";
import {
  dominantSubtype,
  organizationSearchText,
  organizationTree,
  searchTerms,
  startsFolded,
  type OrganizationRow,
} from "@/lib/index-lists";
import type { OrgBranch } from "@/lib/types";
import { NoScriptNote } from "./no-script-note";
import { ListStatus } from "./list-status";
import { OrgRow } from "./org-row";
import { IndexSearchField } from "./search-field";
import { useAnchorJump } from "./use-anchor-jump";
import { useIndexParams } from "./use-index-params";
import { useIndexRows } from "./use-index-rows";

const PARAMS = ["q"] as const;

type Section = {
  key: OrgBranch;
  anchor: string;
  count: number;
  /** Rows that sit on their own: all matches while searching, else the bodies without a parent in the group. */
  tops: OrganizationRow[];
  children: Map<string, OrganizationRow[]>;
  dominant: OrganizationRow["st"] | null;
  emblems: boolean;
  /** Bodies on their own in the whole group (the "show all" count), known before the list arrives. */
  topCount: number;
  foldable: boolean;
};

/**
 * The organisations index: a search field, the jump row of the groups
 * (staatsmacht) with their counts, and one compact row per body.
 *
 * Bodies that belong to another body of their group (the gemeenteraad and the
 * college under their gemeente) fold under that row, and a large group starts
 * folded to its main bodies behind a "Toon alle" button, so the page stays
 * short. The server renders exactly that folded state; the whole list is one
 * JSON file, searched here across every row (?q= in the URL). A search shows
 * every match flat, in its group, folded or not.
 */
export function OrganizationsIndexView({
  initial,
  groups,
  total,
}: {
  initial: OrganizationRow[];
  groups: { key: OrgBranch; count: number; top: number }[];
  total: number;
}) {
  const t = useT("entity");
  const { rows, full, failed, retry } = useIndexRows("organisaties", initial);
  const { values, set, clear, ready } = useIndexParams(PARAMS);
  const query = useDeferredValue(values.q);
  const filtering = values.q.trim() !== "";
  const [opened, setOpened] = useState<ReadonlySet<string>>(() => new Set());

  const searchTexts = useMemo(() => rows.map(organizationSearchText), [rows]);
  const matches = useMemo(() => {
    if (!full && filtering) return null;
    const terms = searchTerms(query);
    if (terms.length === 0) return rows;
    return rows.filter((_, index) => terms.every((term) => searchTexts[index].includes(term)));
  }, [rows, searchTexts, query, full, filtering]);
  const bySlug = useMemo(() => new Map(rows.map((row) => [row.s, row])), [rows]);
  const searching = useMemo(() => searchTerms(query).length > 0, [query]);

  const sections = useMemo(() => {
    const byBranch = new Map<string, OrganizationRow[]>();
    for (const row of matches ?? []) {
      const list = byBranch.get(row.b);
      if (list) list.push(row);
      else byBranch.set(row.b, [row]);
    }
    const list: Section[] = [];
    for (const group of groups) {
      const items = byBranch.get(group.key);
      if (!items) continue;
      // A search lists every match on its own; otherwise the bodies nest under their parent.
      const tree = searching ? { tops: items, children: new Map<string, OrganizationRow[]>() } : organizationTree(items);
      // The type the group is named after comes first; the other kinds of body follow, each in name order.
      const dominant = dominantSubtype(tree.tops);
      const tops = dominant === null || searching ? tree.tops : [...tree.tops.filter((row) => row.st === dominant), ...tree.tops.filter((row) => row.st !== dominant)];
      for (const parts of tree.children.values()) parts.sort((a, b) => Number((b.se ?? 0) > 0) - Number((a.se ?? 0) > 0));
      list.push({
        key: group.key,
        anchor: `groep-${group.key}`,
        count: group.count,
        tops,
        children: tree.children,
        dominant,
        emblems: tops.some((row) => row.w),
        topCount: group.top,
        foldable: !searching && startsFolded(group.top),
      });
    }
    return list;
  }, [matches, groups, searching]);

  const live = useMemo(() => (full && matches !== null ? new Set(sections.map((section) => section.key)) : null), [full, matches, sections]);
  const jump = useAnchorJump(sections);

  const open = (key: string) => setOpened((current) => (current.has(key) ? current : new Set(current).add(key)));
  const toggle = (key: string) =>
    setOpened((current) => {
      const next = new Set(current);
      if (!next.delete(key)) next.add(key);
      return next;
    });

  // A link to /organisaties/#groep-... opens that group as well as scrolling to it.
  useEffect(() => {
    const fromHash = () => {
      const match = /^#groep-(.+)$/.exec(window.location.hash);
      if (match) open(decodeURIComponent(match[1]));
    };
    fromHash();
    window.addEventListener("hashchange", fromHash);
    return () => window.removeEventListener("hashchange", fromHash);
  }, []);

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

      <LabelledNav area="entity" k="groupNavLabel" className="mt-4">
        <ul className="flex flex-wrap gap-2">
          {groups.map((group) => {
            const alive = live === null || live.has(group.key);
            return (
              <li key={group.key}>
                <a
                  href={`#groep-${group.key}`}
                  aria-disabled={alive ? undefined : true}
                  tabIndex={alive ? undefined : -1}
                  onClick={(event) => {
                    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
                    event.preventDefault();
                    open(group.key);
                    jump(`groep-${group.key}`);
                  }}
                  className={`inline-flex items-center gap-1.5 rounded-pill border border-line bg-surface px-3 py-1 text-xs font-medium transition-fast pointer-coarse:min-h-11 ${
                    alive ? "text-ink-muted hover:border-line-strong hover:text-ink" : "pointer-events-none text-ink-faint opacity-40"
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className="inline-block h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-line"
                    style={{ backgroundColor: branchColorVar(group.key) }}
                  />
                  <LocaleLabel kind="branch" value={group.key} />
                  <span className="tabular-nums text-ink-faint">
                    <LocalCount value={group.count} />
                  </span>
                </a>
              </li>
            );
          })}
        </ul>
      </LabelledNav>

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

      <NoScriptNote />
      {sections.map((section) => {
        const expanded = !section.foldable || opened.has(section.key);
        const shown = expanded ? section.tops : section.tops.filter((row) => row.m === 1);
        const listId = `lijst-${section.key}`;
        const toggleLabel = (
          <>
            {expanded ? <T area="entity" k="orgShowFewer" /> : <T area="entity" k="orgShowAll" vars={{ n: section.topCount }} />}
            <span className="sr-only">
              {" "}
              <LocaleLabel kind="branch" value={section.key} />
            </span>
          </>
        );
        return (
          <section key={section.key} data-group={section.key} aria-labelledby={section.anchor} className="mt-8">
            <div className="flex min-h-11 items-end justify-between gap-3 border-b border-line pb-2">
              <h2 id={section.anchor} className="scroll-mt-20 text-lg font-semibold tracking-tight text-ink">
                <LocaleLabel kind="branch" value={section.key} />
                <span className="ms-2 text-sm font-normal tabular-nums text-ink-faint">
                  <LocalCount value={section.count} />
                </span>
              </h2>
              {section.foldable && expanded ? (
                <button
                  type="button"
                  aria-expanded
                  aria-controls={listId}
                  onClick={() => toggle(section.key)}
                  className="inline-flex min-h-9 items-center text-sm text-accent-text underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-focus pointer-coarse:min-h-11"
                >
                  {toggleLabel}
                </button>
              ) : null}
            </div>
            <div className="@container">
              <ul id={listId} role="list" className="grid list-none grid-cols-1 items-start gap-x-8 p-0 @xl:grid-cols-2 @4xl:grid-cols-3">
                {shown.map((row) => (
                  <OrgRow
                    key={row.s}
                    row={row}
                    parts={section.children.get(row.s) ?? []}
                    emblemSlot={section.emblems}
                    showType={row.st !== section.dominant}
                    parentName={searching && row.pa != null ? (bySlug.get(row.pa)?.n ?? null) : null}
                  />
                ))}
              </ul>
              {section.foldable ? (
                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1">
                  <button
                    type="button"
                    aria-expanded={expanded}
                    aria-controls={listId}
                    onClick={() => {
                      toggle(section.key);
                      if (expanded) document.getElementById(section.anchor)?.scrollIntoView({ block: "start" });
                    }}
                    className="inline-flex min-h-10 items-center rounded-pill border border-line bg-surface px-4 text-sm font-medium text-ink transition-fast hover:border-line-strong focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-focus pointer-coarse:min-h-11"
                  >
                    {toggleLabel}
                  </button>
                  {expanded ? null : (
                    <p className="text-xs text-ink-faint">
                      <T area="entity" k="orgFoldNote" />
                    </p>
                  )}
                </div>
              ) : null}
            </div>
          </section>
        );
      })}
    </>
  );
}
