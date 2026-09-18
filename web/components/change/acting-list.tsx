import Link from "next/link";
import { Card } from "../card";
import { EmptyStateT } from "./empty-state-t";
import { KindBadge } from "../kind-badge";
import { PersonPortrait } from "../entity/person-portrait";
import { SourceLink } from "../source-link";
import { T } from "@/components/i18n/t";
import { getSourceById } from "@/lib/data";
import { formatPeriodShort } from "@/lib/format";
import type { ActingOfficial } from "@/lib/changes";

export function ActingList({ officials }: { officials: ActingOfficial[] }) {
  if (officials.length === 0) {
    return <EmptyStateT title="actingEmptyTitle" description="actingEmptyBody" />;
  }

  return (
    <ul className="space-y-2">
      {officials.map((official) => {
        const source = getSourceById(official.tenure.source.source);
        return (
          <li key={official.tenure.id}>
            <Card as="article" className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
              <div className="flex min-w-0 items-start gap-3">
                <PersonPortrait person={official.person} size={40} />
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold">
                    <Link
                      href={`/personen/${official.person.slug}/`}
                      className="text-ink underline-offset-2 hover:text-accent-text hover:underline"
                    >
                      {official.person.name}
                    </Link>
                  </h3>
                  <p className="mt-0.5 text-sm text-ink-muted">
                    <Link
                      href={`/posities/${official.position.slug}/`}
                      className="underline-offset-2 hover:text-ink hover:underline"
                    >
                      {official.position.title}
                    </Link>
                    {official.organization ? (
                      <>
                        {" "}
                        <span aria-hidden="true">·</span>{" "}
                        <Link
                          href={`/organisaties/${official.organization.slug}/`}
                          className="underline-offset-2 hover:text-ink hover:underline"
                        >
                          {official.organization.name}
                        </Link>
                      </>
                    ) : null}
                  </p>
                  {source ? (
                    <div className="mt-2">
                      <SourceLink href={source.url} meta={source.publisher}>
                        {source.title}
                      </SourceLink>
                    </div>
                  ) : null}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <KindBadge tone="accent">
                  <T area="home" k="filterActing" />
                </KindBadge>
                <span className="text-xs text-ink-faint">
                  {formatPeriodShort(official.tenure.start, official.tenure.end)}
                </span>
              </div>
            </Card>
          </li>
        );
      })}
    </ul>
  );
}
