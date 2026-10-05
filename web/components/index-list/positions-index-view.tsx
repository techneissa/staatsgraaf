"use client";

import { useDeferredValue, useMemo } from "react";
import { LocalCount } from "@/components/content/local-date";
import { useLocale } from "@/components/i18n/language-provider";
import { LocaleLabel } from "@/components/i18n/locale-label";
import { useT } from "@/components/i18n/use-t";
import { positionSearchText, searchTerms, type PositionRow } from "@/lib/index-lists";
import type { OrgType } from "@/lib/types";
import { GroupedList, type ListGroup } from "./grouped-list";
import { ListStatus } from "./list-status";
import { NoScriptNote } from "./no-script-note";
import { PositionCard } from "./position-card";
import { IndexSearchField } from "./search-field";
import { useIndexParams } from "./use-index-params";
import { useIndexRows } from "./use-index-rows";
import { formatCountIn } from "@/lib/format";

const LIST_ID = "posities-lijst";
const PARAMS = ["q", "groep"] as const;

const CHIP =
  "inline-flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-pill border px-3 text-sm transition-[border-color,background-color,color] duration-150 motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus pointer-coarse:h-11";

/**
 * The positions index: a search field, one chip per type with its count, and
 * the position cards per type. Same pattern as the people index: the server
 * renders the first screen, the whole list is one JSON file filtered here
 * across every row, the choice lives in the URL (?q=, ?groep=), and a group
 * with no match leaves no heading.
 */
export function PositionsIndexView({
  initial,
  groups,
  total,
}: {
  initial: PositionRow[];
  groups: { key: OrgType; count: number }[];
  total: number;
}) {
  const t = useT("entity");
  const locale = useLocale();
  const { rows, full, failed, retry } = useIndexRows("posities", initial);
  const { values, set, clear, ready } = useIndexParams(PARAMS);
  const query = useDeferredValue(values.q);
  const filtering = values.q.trim() !== "" || values.groep !== "";

  const searchTexts = useMemo(() => rows.map(positionSearchText), [rows]);
  const matches = useMemo(() => {
    if (!full && filtering) return null;
    const terms = searchTerms(query);
    if (terms.length === 0 && values.groep === "") return rows;
    const out: PositionRow[] = [];
    for (let index = 0; index < rows.length; index += 1) {
      if (values.groep !== "" && rows[index].t !== values.groep) continue;
      if (terms.length > 0 && !terms.every((term) => searchTexts[index].includes(term))) continue;
      out.push(rows[index]);
    }
    return out;
  }, [rows, searchTexts, query, values.groep, full, filtering]);

  const sections = useMemo(() => {
    const list: ListGroup<PositionRow>[] = [];
    const byType = new Map<string, ListGroup<PositionRow>>();
    for (const row of matches ?? []) {
      let group = byType.get(row.t);
      if (!group) {
        group = { key: row.t, anchor: `type-${row.t}`, heading: null, items: [] };
        byType.set(row.t, group);
        list.push(group);
      }
      group.items.push(row);
    }
    for (const group of list) {
      group.heading = (
        <>
          <LocaleLabel kind="type" value={group.key} />
          <span className="ms-2 text-sm font-normal tabular-nums text-ink-faint">
            <LocalCount value={group.items.length} />
          </span>
        </>
      );
    }
    return list;
  }, [matches]);

  return (
    <>
      <div className="mt-6 flex flex-col gap-2 @xl:flex-row @xl:items-center">
        <IndexSearchField
          value={values.q}
          onChange={(value) => set("q", value)}
          label={t("idxSearchPositions")}
          placeholder={t("idxSearchPositionsPlaceholder")}
          className="@xl:w-72"
        />
        <div className="scroll-row min-w-0 flex-1 gap-1.5 py-0.5 ps-0.5 pe-4" role="group" aria-label={t("idxTypeFilterLabel")}>
          {groups.map((group) => {
            const active = values.groep === group.key;
            return (
              <button
                key={group.key}
                type="button"
                aria-pressed={active}
                onClick={() => set("groep", active ? "" : group.key)}
                className={`${CHIP} ${
                  active ? "border-ink bg-surface-raised text-ink" : "border-line bg-surface text-ink-muted hover:border-line-strong hover:text-ink"
                }`}
              >
                <LocaleLabel kind="type" value={group.key} />
                <span className="text-xs tabular-nums text-ink-muted">{formatCountIn(group.count, locale)}</span>
              </button>
            );
          })}
        </div>
      </div>

      <ListStatus
        noun="Positions"
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
        signature={`${query.trim()}|${values.groep}`}
        groups={sections}
        defaultRowHeight={84}
        chunk={48}
        sectionClassName="mt-8"
        headingClassName="scroll-mt-20 border-b border-line pb-2 text-lg font-semibold tracking-tight text-ink"
        gridClassName="mt-3 grid list-none grid-cols-1 gap-2 p-0 sm:grid-cols-2 xl:grid-cols-3"
        keyOf={(row) => row.s}
        render={(row) => (
          <li className="min-w-0">
            <PositionCard row={row} />
          </li>
        )}
      />
    </>
  );
}
