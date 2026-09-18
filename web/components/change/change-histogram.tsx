"use client";

import { useT } from "@/components/i18n/use-t";
import { formatDateShort } from "@/lib/format";
import type { TimelineBucket } from "@/lib/changes";

export function ChangeHistogram({
  buckets,
  days,
  total,
}: {
  buckets: TimelineBucket[];
  days: number;
  total: number;
}) {
  const t = useT("home");
  const max = Math.max(1, ...buckets.map((bucket) => bucket.count));
  const barWidth = 6;
  const gap = 1;
  const height = 40;
  const width = Math.max(1, buckets.length) * (barWidth + gap);

  const axisLabels = [
    t("timelineDaysAgo", { n: days }),
    `${Math.round((days * 2) / 3)}d`,
    `${Math.round(days / 3)}d`,
    t("timelineToday"),
  ];

  const nonEmpty = buckets.filter((bucket) => bucket.count > 0);

  return (
    <figure className="rounded-md border border-line bg-surface p-4">
      <figcaption className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-xs font-medium uppercase tracking-wider text-ink-faint">
          {t("timelineLabel")}
        </span>
        <span className="text-sm text-ink-muted">
          {total === 1
            ? t("changesInWindowOne")
            : t("changesInWindow", { n: total })}
        </span>
      </figcaption>
      <svg
        role="img"
        aria-label={
          total === 1
            ? t("histogramAriaOne", { days })
            : t("histogramAria", { n: total, days })
        }
        viewBox={`0 0 ${width} ${height}`}
        className="mt-3 h-16 w-full"
        preserveAspectRatio="none"
      >
        {buckets.map((bucket, index) => {
          const barHeight = bucket.count === 0 ? 0.75 : Math.max(2, (bucket.count / max) * (height - 2));
          const x = index * (barWidth + gap);
          return (
            <rect
              key={bucket.date}
              x={x}
              y={height - barHeight}
              width={barWidth}
              height={barHeight}
              rx="1"
              className={bucket.count === 0 ? "fill-line" : "fill-accent"}
            />
          );
        })}
      </svg>
      <div className="mt-1.5 flex justify-between text-xs text-ink-faint">
        {axisLabels.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>
      <ul className="sr-only">
        {nonEmpty.map((bucket) => (
          <li key={bucket.date}>
            {bucket.count === 1
              ? t("srChangesEntryOne", { date: formatDateShort(bucket.date) })
              : t("srChangesEntry", {
                  date: formatDateShort(bucket.date),
                  n: bucket.count,
                })}
          </li>
        ))}
      </ul>
    </figure>
  );
}
