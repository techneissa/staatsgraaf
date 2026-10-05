import Link from "next/link";
import { L, T } from "@/components/i18n/t";
import { LocalizedDescription } from "@/components/entity/localized-description";
import { englishDescription } from "@/lib/description-translations";
import { topicNameEn } from "@/lib/topic-names";
import { KindBadge } from "@/components/kind-badge";
import { LabeledList } from "@/components/news/labeled-list";
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
    <article className="relative flex h-full min-w-0 flex-col rounded-md border border-line bg-surface p-4 transition-fast hover:border-line-strong">
      <div className="flex flex-wrap items-start justify-between gap-2">
        {/* The title link stretches over the whole card and goes straight to the topic (ADR 0017; index lists navigate, decision EN-15 of 05-10-2026). */}
        <h3 className="min-w-0 text-sm font-semibold [overflow-wrap:anywhere]">
          <Link
            href={`/onderwerpen/${topic.slug}/`}
            prefetch={false}
            className="text-ink underline-offset-2 outline-none after:absolute after:inset-0 hover:text-accent-text hover:underline focus-visible:after:outline-2 focus-visible:after:outline-offset-[-2px] focus-visible:after:outline-focus pointer-coarse:flex pointer-coarse:min-h-11 pointer-coarse:min-w-11 pointer-coarse:items-center"
          >
            <L nl={topic.name} en={topicNameEn(topic.slug, topic.name)} />
          </Link>
        </h3>
        {topic.trending === true ? (
          <KindBadge tone="accent">
            <T area="news" k="topicTrending" />
          </KindBadge>
        ) : null}
      </div>
      {topic.description !== null ? (
        <LocalizedDescription
          nl={topic.description}
          en={englishDescription(topic.id, topic.description)}
          className="mt-2 line-clamp-3 text-sm leading-normal text-ink-muted [overflow-wrap:anywhere]"
        />
      ) : null}
      {chipOrganizations.length > 0 ? (
        <LabeledList
          labelKey="responsibleHeading"
          className="mt-3 text-xs leading-relaxed text-ink-faint"
        >
          {chipOrganizations.map((organization, index) => (
            <li key={organization.id} className="inline">
              <span lang="nl" title={organization.name}>
                {organization.name}
              </span>
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
    </article>
  );
}
