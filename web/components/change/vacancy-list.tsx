import Link from "next/link";
import { Card } from "../card";
import { EmptyStateT } from "./empty-state-t";
import { SourceLink } from "../source-link";
import { T } from "@/components/i18n/t";
import { getSourceById } from "@/lib/data";
import { formatCount } from "@/lib/format";
import type { VacancySummary } from "@/lib/changes";

export function VacancyList({ vacancies }: { vacancies: VacancySummary[] }) {
  if (vacancies.length === 0) {
    return <EmptyStateT title="vacancyEmptyTitle" description="vacancyEmptyBody" />;
  }

  return (
    <ul className="space-y-2">
      {vacancies.map((vacancy) => {
        const source = getSourceById(vacancy.source.source);
        return (
          <li key={vacancy.position.id}>
            <Card as="article">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <h3 className="text-sm font-semibold">
                  <Link
                    href={`/posities/${vacancy.position.slug}/`}
                    className="text-ink underline-offset-2 hover:text-accent-text hover:underline"
                  >
                    {vacancy.position.title}
                  </Link>
                </h3>
                <span className="text-xs tabular-nums text-ink-faint">
                  <T
                    area="home"
                    k={vacancy.seats === 1 ? "vacancySeatsUnfilledOne" : "vacancySeatsUnfilled"}
                    vars={{
                      vacant: formatCount(vacancy.vacant),
                      seats: formatCount(vacancy.seats),
                    }}
                  />
                </span>
              </div>
              {vacancy.organization ? (
                <p className="mt-1 text-sm text-ink-muted">
                  <Link
                    href={`/organisaties/${vacancy.organization.slug}/`}
                    className="underline-offset-2 hover:text-ink hover:underline"
                  >
                    {vacancy.organization.name}
                  </Link>
                </p>
              ) : null}
              {source ? (
                <div className="mt-2">
                  <SourceLink href={source.url} meta={source.publisher}>
                    {source.title}
                  </SourceLink>
                </div>
              ) : null}
            </Card>
          </li>
        );
      })}
    </ul>
  );
}
