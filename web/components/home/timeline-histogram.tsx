import type { DailyBucket } from "@/lib/home";

export function TimelineHistogram({
  buckets,
  windowDays,
}: {
  buckets: DailyBucket[];
  windowDays: number;
}) {
  if (buckets.length === 0) return null;

  const max = Math.max(1, ...buckets.map((bucket) => bucket.count));
  const width = buckets.length * 8;
  const labels = buckets.filter((bucket) => bucket.label !== null);

  return (
    <figure className="mt-3">
      <figcaption className="sr-only">
        Histogram met het aantal wijzigingen per dag over de laatste {windowDays} dagen.
      </figcaption>
      <svg
        aria-hidden="true"
        viewBox={`0 0 ${width} 40`}
        width="100%"
        height="40"
        preserveAspectRatio="none"
        className="block"
      >
        {buckets.map((bucket, index) => {
          const height = Math.max(2, Math.round((bucket.count / max) * 32));
          return (
            <rect
              key={bucket.date}
              x={index * 8 + 1}
              y={40 - height}
              width={6}
              height={height}
              className={bucket.count > 0 ? "fill-accent" : "fill-line"}
            />
          );
        })}
      </svg>
      <div className="mt-1 flex justify-between text-xs uppercase tracking-wide text-ink-faint">
        {labels.map((bucket) => (
          <span key={bucket.date}>{bucket.label}</span>
        ))}
      </div>
    </figure>
  );
}
