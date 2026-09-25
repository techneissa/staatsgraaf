import Link from "next/link";
import { PeekLink } from "@/components/peek/peek-link";
import { peekKindFor } from "@/lib/peek";
import { T } from "@/components/i18n/t";
import { KindBadge } from "@/components/kind-badge";
import { LabeledList } from "@/components/news/labeled-list";
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
        <p lang="nl" className="mt-2 line-clamp-3 text-sm leading-normal text-ink-muted">
          {topic.description}
        </p>
      ) : null}
      {chipOrganizations.length > 0 ? (
        <LabeledList
          labelKey="responsibleHeading"
          className="mt-3 text-xs leading-relaxed text-ink-faint"
        >
          {chipOrganizations.map((organization, index) => (
            <li key={organization.id} className="inline">
              <PeekLink
                id={organization.id}
                href={`/organisaties/${organization.slug}/`}
                kind={peekKindFor(organization.id, organization.subtype) ?? "organization"}
                variant="quiet"
                glyph
                lang="nl"
              >
                {organization.name}
              </PeekLink>
              {index < chipOrganizations.length - 1 || restCount > 0 ? (
                <span aria-hidden="true" className="px-1.5">
                  ·
                </span>
              ) : null}{" "}
            </li>
          ))}
          {restCount > 0 ? (
            <li className="inline">
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
    </article>
  );
}
