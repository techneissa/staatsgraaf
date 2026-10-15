import { DateT } from "@/components/content/local-date";
import { EmptyStateT } from "./empty-state-t";
import { EntityPeekLink } from "../peek/entity-peek-link";
import { getSourceById } from "@/lib/data";
import { titleNamesBody, type VacancySummary } from "@/lib/changes";
import { ChangeKindGlyph } from "./change-glyph";
import { KindSourceLabel } from "./kind-source-label";
import { RailItem, RailList } from "./rail";
import { AriaLabelT } from "./aria-label-t";

/** Positions with an empty seat, in the change rail language. */
export function VacancyList({ vacancies }: { vacancies: VacancySummary[] }) {
  if (vacancies.length === 0) {
    return <EmptyStateT title="vacancyEmptyTitle" description="vacancyEmptyBody" />;
  }

  return (
    <AriaLabelT k="vacancyListAria">
      <RailList>
        {vacancies.map((vacancy, index) => {
          const source = getSourceById(vacancy.source.source);
          const showBody =
            vacancy.organization !== undefined && !titleNamesBody(vacancy.position.title, vacancy.organization.name);
          return (
            <RailItem
              key={vacancy.position.id}
              mark={<ChangeKindGlyph kind="vacancy" />}
              first={index === 0}
              last={index === vacancies.length - 1}
              markTop={8}
            >
              <article className="flex min-w-0 gap-3">
                <span
                  aria-hidden="true"
                  className="mt-0.5 h-9 w-9 shrink-0 rounded-pill border border-dashed border-line-strong"
                />
                <div className="min-w-0 flex-1">
                  <p>
                    <KindSourceLabel
                      kind="vacancy"
                      href={source?.url}
                      publisher={source?.publisher}
                      retrieved={vacancy.source.retrieved}
                    />
                  </p>
                  <h3 className="mt-0.5 text-sm font-medium leading-snug [overflow-wrap:anywhere]">
                    <EntityPeekLink id={vacancy.position.id} variant="plain" />
                  </h3>
                  {showBody && vacancy.organization ? (
                    <p className="mt-0.5 text-sm text-ink-muted">
                      <EntityPeekLink id={vacancy.organization.id} variant="quiet" />
                    </p>
                  ) : null}
                  <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-faint">
                    <span className="tabular-nums">
                      <DateT
                        area="home"
                        k={vacancy.seats === 1 ? "vacancySeatsUnfilledOne" : "vacancySeatsUnfilled"}
                        counts={{ vacant: vacancy.vacant, seats: vacancy.seats }}
                      />
                    </span>
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
