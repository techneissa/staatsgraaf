import { EmptyStateT } from "./empty-state-t";
import { EntityPeekLink } from "../peek/entity-peek-link";
import { T } from "@/components/i18n/t";
import { getSourceById } from "@/lib/data";
import { formatCount } from "@/lib/format";
import { titleNamesBody, type VacancySummary } from "@/lib/changes";
import { CHANGE_KIND_KEY, CHANGE_LABEL_TONE, ChangeKindGlyph } from "./change-glyph";
import { QuietSource } from "./quiet-source";
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
                  <p className={`text-[11px] font-semibold uppercase leading-4 tracking-wider ${CHANGE_LABEL_TONE.vacancy}`}>
                    <T area="home" k={CHANGE_KIND_KEY.vacancy} />
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
                      <T
                        area="home"
                        k={vacancy.seats === 1 ? "vacancySeatsUnfilledOne" : "vacancySeatsUnfilled"}
                        vars={{ vacant: formatCount(vacancy.vacant), seats: formatCount(vacancy.seats) }}
                      />
                    </span>
                    {source ? (
                      <QuietSource href={source.url} publisher={source.publisher} retrieved={vacancy.source.retrieved} />
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
