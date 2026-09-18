import Link from "next/link";
import { T } from "@/components/i18n/t";
import { KindBadge } from "@/components/kind-badge";
import { LabeledList } from "@/components/news/labeled-list";
import { branchColorVar } from "@/lib/branch-colors";
import { formatCount } from "@/lib/format";
import { getResponsibleOrganizations } from "@/lib/topics";
import type { Topic } from "@/lib/types";

const CHIP_LIMIT = 3;

export function TopicCard({
  topic,
  organizationCount,
}: {
  topic: Topic;
  organizationCount: number;
}) {
  const organizations = getResponsibleOrganizations(topic);
  const chipOrganizations = organizations.slice(0, CHIP_LIMIT);
  const restCount = organizations.length - chipOrganizations.length;

  return (
    <article className="flex h-full flex-col rounded-md border border-line bg-surface p-4 transition-fast hover:border-line-strong">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="text-sm font-semibold">
          <Link
            href={`/onderwerpen/${topic.slug}/`}
            className="text-ink underline-offset-2 hover:text-accent-text hover:underline"
          >
            {topic.name}
          </Link>
        </h3>
        {topic.trending === true ? (
          <KindBadge tone="accent">
            <T area="news" k="topicTrending" />
          </KindBadge>
        ) : null}
      </div>
      {topic.description !== null ? (
        <p className="mt-2 line-clamp-3 text-sm leading-normal text-ink-muted">
          {topic.description}
        </p>
      ) : null}
      {chipOrganizations.length > 0 ? (
        <LabeledList
          labelKey="responsibleHeading"
          className="mt-3 flex flex-wrap items-center gap-1.5"
        >
          {chipOrganizations.map((organization) => (
            <li key={organization.id}>
              <Link
                href={`/organisaties/${organization.slug}/`}
                className="inline-flex items-center gap-1.5 rounded-pill border border-line bg-surface-raised py-0.5 pl-2 pr-2.5 text-xs text-ink-muted transition-fast hover:border-line-strong hover:text-accent-text"
              >
                <span
                  aria-hidden="true"
                  className="h-1.5 w-1.5 shrink-0 rounded-pill"
                  style={{ backgroundColor: branchColorVar(organization.branch) }}
                />
                {organization.name}
              </Link>
            </li>
          ))}
          {restCount > 0 ? (
            <li className="text-xs text-ink-faint">
              <T area="news" k="topicMoreOrganizations" vars={{ count: restCount }} />
            </li>
          ) : null}
        </LabeledList>
      ) : null}
      <p className="mt-3 text-xs text-ink-faint">
        {formatCount(organizationCount)}{" "}
        <T
          area="news"
          k={organizationCount === 1 ? "topicOrgCountSingular" : "topicOrgCountPlural"}
        />
      </p>
      <p className="mt-2 text-sm">
        <Link
          href={`/onderwerpen/${topic.slug}/`}
          className="text-accent-text underline-offset-2 hover:underline"
        >
          <T area="news" k="topicViewLink" />
        </Link>
      </p>
    </article>
  );
}
