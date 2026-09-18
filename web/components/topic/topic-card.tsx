import Link from "next/link";
import { KindBadge } from "@/components/kind-badge";
import { formatCount } from "@/lib/format";
import type { Topic } from "@/lib/types";

export function TopicCard({
  topic,
  organizationCount,
}: {
  topic: Topic;
  organizationCount: number;
}) {
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
        {topic.trending === true ? <KindBadge tone="accent">In het nieuws</KindBadge> : null}
      </div>
      {topic.description !== null ? (
        <p className="mt-2 line-clamp-4 text-sm leading-normal text-ink-muted">
          {topic.description}
        </p>
      ) : null}
      <p className="mt-3 text-xs text-ink-faint">
        {formatCount(organizationCount)}{" "}
        {organizationCount === 1 ? "verantwoordelijke organisatie" : "verantwoordelijke organisaties"}
      </p>
      <p className="mt-2 text-sm">
        <Link
          href={`/onderwerpen/${topic.slug}/`}
          className="text-accent-text underline-offset-2 hover:underline"
        >
          Bekijk onderwerp
        </Link>
      </p>
    </article>
  );
}
