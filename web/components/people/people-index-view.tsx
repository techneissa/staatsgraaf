"use client";

import { useDeferredValue, useMemo } from "react";
import { GroupedList, type ListGroup } from "@/components/index-list/grouped-list";
import { ListStatus } from "@/components/index-list/list-status";
import { useAnchorJump } from "@/components/index-list/use-anchor-jump";
import { useIndexParams } from "@/components/index-list/use-index-params";
import { useIndexRows } from "@/components/index-list/use-index-rows";
import { personSearchText, searchTerms, type PersonRow } from "@/lib/index-lists";
import { PeopleFilters } from "./people-filters";
import { PersonTile } from "./person-tile";

const LIST_ID = "personen-lijst";
const PARAMS = ["q", "groep", "partij"] as const;

type Props = {
  /** The first screen of rows, rendered on the server. */
  initial: PersonRow[];
  groups: { key: string; nl: string; en: string; count: number }[];
  parties: { key: string; label: string; color: string | null; count: number }[];
  letters: string[];
  total: number;
};

/**
 * The people index: a sticky filter bar over person tiles in A-Z sections.
 * The server renders the first screen; the whole list arrives as one small
 * JSON file and is filtered here, across every row, with the choice kept in
 * the URL (?q=, ?groep=, ?partij=). Tiles mount as they near the screen
 * (components/index-list/windowed-grid.tsx), so the page stays light with all
 * people on it. Clicking a tile goes straight to the person.
 */
export function PeopleIndexView({ initial, groups, parties, letters, total }: Props) {
  const { rows, full, failed, retry } = useIndexRows("personen", initial);
  const { values, set, clear, ready } = useIndexParams(PARAMS);
  const query = useDeferredValue(values.q);
  const filtering = values.q.trim() !== "" || values.groep !== "" || values.partij !== "";

  const searchTexts = useMemo(() => rows.map(personSearchText), [rows]);
  const matches = useMemo(() => {
    if (!full && filtering) return null;
    const terms = searchTerms(query);
    const out: PersonRow[] = [];
    for (let index = 0; index < rows.length; index += 1) {
      const row = rows[index];
      if (values.groep !== "" && row.g !== values.groep) continue;
      if (values.partij !== "" && row.pk !== values.partij) continue;
      if (terms.length > 0 && !terms.every((term) => searchTexts[index].includes(term))) continue;
      out.push(row);
    }
    return out;
  }, [rows, searchTexts, query, values.groep, values.partij, full, filtering]);

  const sections = useMemo(() => {
    const list: ListGroup<PersonRow>[] = [];
    for (const row of matches ?? []) {
      const last = list[list.length - 1];
      if (last && last.key === row.l) last.items.push(row);
      else list.push({ key: row.l, anchor: `letter-${row.l}`, heading: row.l, items: [row] });
    }
    return list;
  }, [matches]);

  const liveLetters = useMemo(() => (full && matches !== null ? new Set(sections.map((section) => section.key)) : null), [full, matches, sections]);

  const jump = useAnchorJump(sections);

  const signature = `${query.trim()}|${values.groep}|${values.partij}`;

  return (
    <>
      <PeopleFilters
        targetId={LIST_ID}
        groups={groups}
        parties={parties}
        letters={letters}
        liveLetters={liveLetters}
        query={values.q}
        group={values.groep}
        party={values.partij}
        onQuery={(value) => set("q", value)}
        onGroup={(value) => set("groep", value)}
        onParty={(value) => set("partij", value)}
        onJump={(letter) => jump(`letter-${letter}`)}
      />
      <ListStatus
        noun="People"
        shown={matches?.length ?? null}
        total={total}
        filtering={filtering && ready}
        loading={!full && filtering && !failed}
        failed={failed}
        onClear={clear}
        onRetry={retry}
      />
      <div id={LIST_ID}>
        <GroupedList
          listId={LIST_ID}
          signature={signature}
          groups={sections}
          defaultRowHeight={118}
          sectionClassName="mt-5"
          headingClassName="mb-2 scroll-mt-36 text-sm font-semibold tabular-nums text-ink-faint"
          gridClassName="grid list-none grid-cols-[repeat(auto-fill,minmax(8.5rem,1fr))] gap-2 p-0 @lg:grid-cols-[repeat(auto-fill,minmax(9.5rem,1fr))]"
          keyOf={(row) => row.s}
          render={(row) => <PersonTile row={row} />}
        />
      </div>
    </>
  );
}
