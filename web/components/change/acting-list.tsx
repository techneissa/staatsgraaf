import { EmptyStateT } from "./empty-state-t";
import { PersonPortrait } from "../entity/person-portrait";
import { EntityPeekLink } from "../peek/entity-peek-link";
import { getSourceById } from "@/lib/data";
import { titleNamesBody, type ActingOfficial } from "@/lib/changes";
import { KindSourceLabel } from "./kind-source-label";
import { PeriodT } from "./local-date";
import { AriaLabelT } from "./aria-label-t";
import { ActingSortList, type ActingItem } from "./acting-sort-list";

/** Current acting officials, in the change rail language: glyph, portrait, peek links. Newest start first, sortable. */
export function ActingList({ officials }: { officials: ActingOfficial[] }) {
  if (officials.length === 0) {
    return <EmptyStateT title="actingEmptyTitle" />;
  }

  const items: ActingItem[] = officials.map((official) => {
    const source = getSourceById(official.tenure.source.source);
    const showBody =
      official.organization !== undefined && !titleNamesBody(official.position.title, official.organization.name);
    return {
      id: official.tenure.id,
      since: official.tenure.start,
      name: official.person.name,
      node: (
        <article className="flex min-w-0 gap-3">
          <PersonPortrait person={official.person} size={36} className="mt-0.5" peek />
          <div className="min-w-0 flex-1">
            <p>
              <KindSourceLabel
                kind="acting"
                href={source?.url}
                publisher={source?.publisher}
                retrieved={official.tenure.source.retrieved}
              />
            </p>
            <h3 className="mt-0.5 text-sm font-medium leading-snug">
              <EntityPeekLink id={official.person.id} variant="plain" />
            </h3>
            <p className="mt-0.5 text-sm leading-snug text-ink-muted [overflow-wrap:anywhere]">
              <EntityPeekLink id={official.position.id} variant="quiet" />
              {showBody && official.organization ? (
                <>
                  <span aria-hidden="true" className="px-1.5 text-ink-faint">
                    ·
                  </span>
                  <EntityPeekLink id={official.organization.id} variant="quiet" />
                </>
              ) : null}
            </p>
            <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-faint">
              <span>
                <PeriodT start={official.tenure.start} end={official.tenure.end} style="short" />
              </span>
            </p>
          </div>
        </article>
      ),
    };
  });

  return (
    <AriaLabelT k="actingListAria">
      <ActingSortList items={items} />
    </AriaLabelT>
  );
}
