"use client";

import { useDeferredValue, useMemo } from "react";
import { EntityCard } from "@/components/entity-card";
import { LabelledNav } from "@/components/entity/labelled-nav";
import { LocalCount } from "@/components/content/local-date";
import { LocaleLabel } from "@/components/i18n/locale-label";
import { useT } from "@/components/i18n/use-t";
import { branchColorVar } from "@/lib/branch-colors";
import { organizationSearchText, searchTerms, type OrganizationRow } from "@/lib/index-lists";
import type { OrgBranch } from "@/lib/types";
import { GroupedList, type ListGroup } from "./grouped-list";
import { NoScriptNote } from "./no-script-note";
import { ListStatus } from "./list-status";
import { IndexSearchField } from "./search-field";
import { useAnchorJump } from "./use-anchor-jump";
import { useIndexParams } from "./use-index-params";
import { useIndexRows } from "./use-index-rows";

const LIST_ID = "organisaties-lijst";
const PARAMS = ["q"] as const;

/**
 * The organisations index: a search field, the jump row of the groups
 * (staatsmacht) with their counts, and the cards per group. The server renders
 * the first screen; the whole list is one JSON file, searched here across
 * every row (?q= in the URL) and windowed as it scrolls
 * (components/index-list/windowed-grid.tsx).
 */
export function OrganizationsIndexView({
  initial,
  groups,
  total,
}: {
  initial: OrganizationRow[];
  groups: { key: OrgBranch; count: number }[];
  total: number;
}) {
  const t = useT("entity");
  const { rows, full, failed, retry } = useIndexRows("organisaties", initial);
  const { values, set, clear, ready } = useIndexParams(PARAMS);
  const query = useDeferredValue(values.q);
  const filtering = values.q.trim() !== "";

  const searchTexts = useMemo(() => rows.map(organizationSearchText), [rows]);
  const matches = useMemo(() => {
    if (!full && filtering) return null;
    const terms = searchTerms(query);
    if (terms.length === 0) return rows;
    return rows.filter((_, index) => terms.every((term) => searchTexts[index].includes(term)));
  }, [rows, searchTexts, query, full, filtering]);

  const sections = useMemo(() => {
    const list: ListGroup<OrganizationRow>[] = [];
    const byBranch = new Map<string, ListGroup<OrganizationRow>>();
    for (const row of matches ?? []) {
      let group = byBranch.get(row.b);
      if (!group) {
        group = { key: row.b, anchor: `groep-${row.b}`, heading: null, items: [] };
        byBranch.set(row.b, group);
        list.push(group);
      }
      group.items.push(row);
    }
    for (const group of list) group.heading = <GroupHeading branch={group.key as OrgBranch} count={group.items.length} />;
    return list;
  }, [matches]);

  const live = useMemo(() => (full && matches !== null ? new Set(sections.map((section) => section.key)) : null), [full, matches, sections]);
  const jump = useAnchorJump(sections);

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
      <GroupedList
        listId={LIST_ID}
        signature={query.trim()}
        groups={sections}
        defaultRowHeight={150}
        chunk={36}
        sectionClassName="mt-8"
        headingClassName="scroll-mt-20 border-b border-line pb-2 text-lg font-semibold tracking-tight text-ink"
        gridClassName="mt-3 grid list-none grid-cols-1 gap-3 p-0 sm:grid-cols-2 xl:grid-cols-3"
        keyOf={(row) => row.s}
        render={(row) => (
          <li className="min-w-0">
            <EntityCard row={row} />
          </li>
        )}
      />
    </>
  );
}

function GroupHeading({ branch, count }: { branch: OrgBranch; count: number }) {
  return (
    <>
      <LocaleLabel kind="branch" value={branch} />
      <span className="ms-2 text-sm font-normal tabular-nums text-ink-faint">
        <LocalCount value={count} />
      </span>
    </>
  );
}
