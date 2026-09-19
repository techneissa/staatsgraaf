import { T } from "@/components/i18n/t";
import { partySeatHistory } from "@/lib/elections";
import { formatDate } from "@/lib/format";

/**
 * A party's seats in one chamber across elections: one line, one dot per
 * election, the last value labelled. Small on purpose; the numbers live in the
 * accessible table beneath it, which is the same data.
 */
export function SeatSparkline({
  partyKey,
  organizationId,
  color,
}: {
  partyKey: string;
  organizationId: string;
  color: string | null;
}) {
  const points = partySeatHistory(partyKey, organizationId);
  if (points.length < 2) return null;

  const width = 240;
  const height = 56;
  const padX = 6;
  const padY = 8;
  const max = Math.max(1, ...points.map((point) => point.seats));
  const first = Date.parse(points[0].date);
  const last = Date.parse(points[points.length - 1].date);
  const span = Math.max(1, last - first);
  const x = (date: string) => padX + ((Date.parse(date) - first) / span) * (width - 2 * padX);
  const y = (seats: number) => height - padY - (seats / max) * (height - 2 * padY);
  const path = points.map((point, index) => `${index === 0 ? "M" : "L"} ${x(point.date).toFixed(1)} ${y(point.seats).toFixed(1)}`).join(" ");
  const stroke = color ?? "var(--t-color-ink-muted)";
  const latest = points[points.length - 1];
  const peak = points.reduce((best, point) => (point.seats > best.seats ? point : best), points[0]);

  return (
    <figure className="mt-3">
      <figcaption className="text-xs text-ink-faint">
        <T
          area="entity"
          k="seatSparklineLabel"
          vars={{ from: formatDate(points[0].date), to: formatDate(latest.date), n: points.length }}
        />
      </figcaption>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={points.map((point) => `${point.date.slice(0, 4)}: ${point.seats}`).join(", ")}
        className="mt-1 h-auto w-full max-w-[240px]"
      >
        <path d={path} fill="none" stroke={stroke} strokeWidth={1.6} strokeLinejoin="round" strokeLinecap="round" />
        {points.map((point) => (
          <circle key={point.date} cx={x(point.date).toFixed(1)} cy={y(point.seats).toFixed(1)} r={2} fill={stroke}>
            <title>{`${formatDate(point.date)}: ${point.seats}`}</title>
          </circle>
        ))}
        <text
          x={(x(latest.date) - 4).toFixed(1)}
          y={(y(latest.seats) - 5).toFixed(1)}
          textAnchor="end"
          fill="var(--t-color-ink)"
          style={{ fontSize: 10, fontWeight: 600 }}
        >
          {latest.seats}
        </text>
        {peak.date !== latest.date ? (
          <text
            x={x(peak.date).toFixed(1)}
            y={(y(peak.seats) - 5).toFixed(1)}
            textAnchor="middle"
            fill="var(--t-color-ink-faint)"
            style={{ fontSize: 9 }}
          >
            {peak.seats}
          </text>
        ) : null}
      </svg>
      <details className="mt-1 text-xs text-ink-muted">
        <summary className="cursor-pointer text-ink-faint">
          <T area="entity" k="seatSparklineTable" />
        </summary>
        <table className="mt-1 text-xs tabular-nums">
          <tbody>
            {points
              .slice()
              .reverse()
              .map((point) => (
                <tr key={point.date}>
                  <td className="pe-3 text-ink-faint">
                    <time dateTime={point.date}>{formatDate(point.date)}</time>
                  </td>
                  <td className="text-ink">
                    {point.seats}/{point.total}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
