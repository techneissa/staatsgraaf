import { EmptyStateT } from "./empty-state-t";
import { PersonPortrait } from "../entity/person-portrait";
import { EntityPeekLink } from "../peek/entity-peek-link";
import { T } from "@/components/i18n/t";
import { getSourceById } from "@/lib/data";
import { titleNamesBody, type ActingOfficial } from "@/lib/changes";
import { CHANGE_KIND_KEY, CHANGE_LABEL_TONE, ChangeKindGlyph } from "./change-glyph";
import { PeriodT } from "./local-date";
import { QuietSource } from "./quiet-source";
import { RailItem, RailList } from "./rail";
import { AriaLabelT } from "./aria-label-t";

/** Current acting officials, in the change rail language: glyph, portrait, peek links, quiet source. */
export function ActingList({ officials }: { officials: ActingOfficial[] }) {
  if (officials.length === 0) {
    return <EmptyStateT title="actingEmptyTitle" description="actingEmptyBody" />;
  }

  return (
    <AriaLabelT k="actingListAria">
      <RailList>
        {officials.map((official, index) => {
          const source = getSourceById(official.tenure.source.source);
          const showBody =
            official.organization !== undefined &&
            !titleNamesBody(official.position.title, official.organization.name);
          return (
            <RailItem
              key={official.tenure.id}
              mark={<ChangeKindGlyph kind="acting" />}
              first={index === 0}
              last={index === officials.length - 1}
              markTop={8}
            >
              <article className="flex min-w-0 gap-3">
                <PersonPortrait person={official.person} size={36} className="mt-0.5" />
                <div className="min-w-0 flex-1">
                  <p className={`text-xs font-semibold leading-4 ${CHANGE_LABEL_TONE.acting}`}>
                    <T area="home" k={CHANGE_KIND_KEY.acting} />
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
                    {source ? (
                      <QuietSource href={source.url} publisher={source.publisher} retrieved={official.tenure.source.retrieved} />
                    ) : null}
                  </p>
                </div>
              </article>
            </RailItem>
          );
        })}
      </RailList>
    </AriaLabelT>
  );
}
