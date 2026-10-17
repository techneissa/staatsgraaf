"use client";

import { useDeferredValue, useMemo } from "react";
import {
  parsePositionSortDir,
  parsePositionSortKey,
  parsePositionWrap,
  positionSearchText,
  searchTerms,
  sortPositionRows,
  type PositionRow,
  type PositionSortKey,
} from "@/lib/index-lists";
import type { OrgType } from "@/lib/types";
import { ListStatus } from "./list-status";
import { NoScriptNote } from "./no-script-note";
import { PositionFilters } from "./position-filters";
import { PositionSortHeader, PositionTable } from "./position-table";
import { useIndexParams } from "./use-index-params";
import { useIndexRows } from "./use-index-rows";

const PARAMS = ["q", "groep", "sort", "dir", "wrap"] as const;

/**
 * The positions index: a sticky search, type grid and sortable column
 * headers, then one windowed table of clickable rows. The server renders the
 * first screen; the whole list is one JSON file filtered here, and the choice
 * lives in the URL (?q=, ?groep=, ?sort=, ?dir=, ?wrap=).
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
  const { values, set, ready } = useIndexParams(PARAMS);
  const query = useDeferredValue(values.q);
  const filtering = values.q.trim() !== "" || values.groep !== "";
  const sort = parsePositionSortKey(values.sort);
  const dir = parsePositionSortDir(values.dir);
  const wrap = parsePositionWrap(values.wrap);

  const searchTexts = useMemo(() => rows.map(positionSearchText), [rows]);
  const matches = useMemo(() => {
    const terms = searchTerms(query);
    if (terms.length === 0 && values.groep === "") return sortPositionRows(rows, sort, dir);
    const out: PositionRow[] = [];
    for (let index = 0; index < rows.length; index += 1) {
      if (values.groep !== "" && rows[index].t !== values.groep) continue;
      if (terms.length > 0 && !terms.every((term) => searchTexts[index].includes(term))) continue;
      out.push(rows[index]);
    }
    return sortPositionRows(out, sort, dir);
  }, [rows, searchTexts, query, values.groep, sort, dir]);

  const onSort = (key: PositionSortKey) => {
    if (key === sort) {
      const nextDir = dir === "asc" ? "desc" : "asc";
      set("dir", nextDir === "asc" ? "" : "desc");
      if (key === "title" && nextDir === "asc") set("sort", "");
      return;
    }
    set("sort", key === "title" ? "" : key);
    set("dir", "");
  };

  const clearFilters = () => {
    set("q", "");
    set("groep", "");
  };

  return (
    <>
      <PositionFilters
        query={values.q}
        group={values.groep}
        groups={groups}
        total={total}
        onQuery={(value) => set("q", value)}
        onGroup={(value) => set("groep", value)}
        toolbar={<PositionSortHeader sort={sort} dir={dir} wrap={wrap} onSort={onSort} onWrap={(value) => set("wrap", value ? "" : "0")} />}
      />

      <ListStatus
        noun="Positions"
        shown={full ? matches.length : filtering ? null : matches.length}
        total={total}
        filtering={filtering && ready}
        loading={!full && filtering && !failed}
        failed={failed}
        onClear={clearFilters}
        onRetry={retry}
      />

      <NoScriptNote />
      <PositionTable rows={matches} wrap={wrap} signature={`${query.trim()}|${values.groep}|${sort}|${dir}|${wrap ? "wrap" : "line"}`} />
    </>
  );
}
