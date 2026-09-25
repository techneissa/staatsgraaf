"use client";

import type { CSSProperties } from "react";
import { useLocale } from "@/components/i18n/language-provider";
import { useT } from "@/components/i18n/use-t";
import type { TimelineBucket } from "@/lib/changes";
import { formatIsoDate } from "./local-date";

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
  const locale = useLocale();
  const formatDateShort = (iso: string) => formatIsoDate(iso, locale, "short");
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
    <figure className="min-w-0">
      <figcaption className="text-sm tabular-nums text-ink-muted">
        {total === 1 ? t("dayCountOne") : t("dayCount", { n: total })}
      </figcaption>
      <svg
        role="img"
        aria-label={
          total === 1
            ? t("histogramAriaOne", { days })
            : t("histogramAria", { n: total, days })
        }
        viewBox={`0 0 ${width} ${height}`}
        className="motion-grow mt-2 block h-12 w-full"
        data-reveal="pending"
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
              className={`grow-y ${bucket.count === 0 ? "fill-line" : "fill-accent"}`}
              style={{ "--d": `${Math.round((index / Math.max(1, buckets.length)) * 280)}ms` } as CSSProperties}
            />
          );
        })}
      </svg>
      <div aria-hidden="true" className="mt-1 flex justify-between border-t border-line pt-1 text-[11px] tabular-nums text-ink-faint">
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
