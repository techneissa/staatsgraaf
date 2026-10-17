"use client";

import { useDeferredValue, useMemo } from "react";
import { LocalCount } from "@/components/content/local-date";
import { L } from "@/components/i18n/t";
import { LocaleLabel } from "@/components/i18n/locale-label";
import { positionSearchText, positionSections, searchTerms, type PositionRow, type PositionSectionItem } from "@/lib/index-lists";
import type { OrgType } from "@/lib/types";
import { GroupedList, type ListGroup } from "./grouped-list";
import { ListStatus } from "./list-status";
import { NoScriptNote } from "./no-script-note";
import { PositionCard } from "./position-card";
import { PositionFilters } from "./position-filters";
import { useIndexParams } from "./use-index-params";
import { useIndexRows } from "./use-index-rows";

const LIST_ID = "posities-lijst";
const PARAMS = ["q", "groep"] as const;

/**
 * The positions index: a sticky search and type grid, then directory rows
 * grouped by type and by repeated office stems (burgemeester, minister,
 * fractievoorzitter). The server renders the first screen, the whole list is
 * one JSON file filtered here, and the choice lives in the URL (?q=, ?groep=).
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
  const { rows, full, failed, retry } = useIndexRows("posities", initial);
  const { values, set, clear, ready } = useIndexParams(PARAMS);
  const query = useDeferredValue(values.q);
  const filtering = values.q.trim() !== "" || values.groep !== "";

  const searchTexts = useMemo(() => rows.map(positionSearchText), [rows]);
  const matches = useMemo(() => {
    const terms = searchTerms(query);
    if (terms.length === 0 && values.groep === "") return rows;
    const out: PositionRow[] = [];
    for (let index = 0; index < rows.length; index += 1) {
      if (values.groep !== "" && rows[index].t !== values.groep) continue;
      if (terms.length > 0 && !terms.every((term) => searchTexts[index].includes(term))) continue;
      out.push(rows[index]);
    }
    return out;
  }, [rows, searchTexts, query, values.groep]);

  const sections = useMemo(() => {
    const list: ListGroup<PositionSectionItem>[] = [];
    for (const section of positionSections(matches)) {
      const typeLabel = <LocaleLabel kind="type" value={section.type} />;
      list.push({
        key: section.key,
        anchor: section.family ? `type-${section.type}-${section.family.key}` : `type-${section.type}`,
        heading: section.family ? (
          <>
            <span className="mb-0.5 block text-xs font-medium uppercase tracking-wide text-ink-faint">{typeLabel}</span>
            <L nl={section.family.label.nl} en={section.family.label.en} />{" "}
            <span className="text-sm font-normal tabular-nums text-ink-faint">
              <LocalCount value={section.items.length} />
            </span>
          </>
        ) : (
          <>
            {typeLabel}{" "}
            <span className="text-sm font-normal tabular-nums text-ink-faint">
              <LocalCount value={section.items.length} />
            </span>
          </>
        ),
        items: section.items,
      });
    }
    return list;
  }, [matches]);

  return (
    <>
      <PositionFilters
        query={values.q}
        group={values.groep}
        groups={groups}
        total={total}
        onQuery={(value) => set("q", value)}
        onGroup={(value) => set("groep", value)}
      />

      <ListStatus
        noun="Positions"
        shown={full ? matches.length : filtering ? null : matches.length}
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
        defaultRowHeight={64}
        chunk={48}
        sectionClassName="mt-8"
        headingClassName="scroll-mt-28 border-b border-line pb-2 text-lg font-semibold tracking-tight text-ink"
        gridClassName="mt-3 grid list-none grid-cols-1 gap-1.5 p-0 @lg:grid-cols-2"
        keyOf={(item) => item.row.s}
        render={(item) => (
          <li className="min-w-0">
            <PositionCard row={item.row} label={item.label} />
          </li>
        )}
      />
    </>
  );
}
