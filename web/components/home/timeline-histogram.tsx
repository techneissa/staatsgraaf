import type { DailyBucket } from "@/lib/home";
import { T } from "@/components/i18n/t";

/**
 * Small timeline axis: a count dot on every day, with a count bubble above
 * active days and a "d geleden ... vandaag" axis on the labelled ticks.
 */
export function TimelineHistogram({
  buckets,
  windowDays,
}: {
  buckets: DailyBucket[];
  windowDays: number;
}) {
  if (buckets.length === 0) return null;

  const lastIndex = buckets.length - 1;
  const pct = (index: number) => (lastIndex === 0 ? 50 : (index / lastIndex) * 100);
  const labelled = buckets
    .map((bucket, index) => ({ bucket, index }))
    .filter(({ bucket }) => bucket.label !== null);
  const active = buckets
    .map((bucket, index) => ({ bucket, index }))
    .filter(({ bucket }) => bucket.count > 0);
  const max = Math.max(1, ...buckets.map((bucket) => bucket.count));

  return (
    <figure className="mt-3">
      <figcaption className="sr-only">
        <T area="home" k="timelineCaption" vars={{ days: windowDays }} />
      </figcaption>
      <div className="relative mx-2 h-16" aria-hidden="true">
        <div className="absolute inset-x-0 bottom-5 border-t border-line" />
        {active.map(({ bucket, index }) => (
          <span
            key={bucket.date}
            className="absolute -translate-x-1/2"
            style={{ left: `${pct(index)}%`, bottom: `calc(1.25rem + ${(bucket.count / max) * 1.25}rem)` }}
          >
            <span className="block h-1.5 w-1.5 rounded-pill bg-accent" />
          </span>
        ))}
        {active.map(({ bucket, index }) => (
          <span
            key={`bubble-${bucket.date}`}
            className="absolute -translate-x-1/2 rounded-pill border border-accent/40 bg-accent-soft px-1.5 py-px text-[10px] font-medium leading-snug tabular-nums text-accent-text"
            style={{ left: `${pct(index)}%`, bottom: `calc(1.5rem + ${(bucket.count / max) * 1.25}rem)` }}
          >
            {bucket.count}
          </span>
        ))}
        {labelled.map(({ bucket, index }) => (
          <span
            key={`tick-${bucket.date}`}
            className="absolute -translate-x-1/2"
            style={{ left: `${pct(index)}%`, bottom: "1.125rem" }}
          >
            <span className="mx-auto block h-2.5 w-2.5 rounded-pill border border-line-strong bg-surface-raised" />
          </span>
        ))}
        {labelled.map(({ bucket, index }) => (
          <span
            key={`label-${bucket.date}`}
            className={`absolute -translate-x-1/2 whitespace-nowrap text-[10px] uppercase tracking-wide ${
              index === lastIndex ? "text-ink-muted" : "text-ink-faint"
            }`}
            style={{ left: `${pct(index)}%`, bottom: 0 }}
          >
            {bucket.label === "vandaag" ? <T area="home" k="timelineToday" /> : bucket.label}
          </span>
        ))}
      </div>
    </figure>
  );
}
