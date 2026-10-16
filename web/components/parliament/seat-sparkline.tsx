import { T } from "@/components/i18n/t";
import { partySeatHistory } from "@/lib/elections";
import { DateT, LocalDate } from "@/components/content/local-date";
import { SeatSparklineChart } from "./seat-sparkline-chart";

/**
 * A party's seats in one chamber across elections: a full-width line, a
 * labelled dot per election, and the same numbers in an accessible table.
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
  const latest = points[points.length - 1];

  return (
    <figure className="mt-3 min-w-0">
      <figcaption className="text-xs text-ink-faint">
        <DateT
          area="entity"
          k="seatSparklineLabel"
          dates={{ from: points[0].date, to: latest.date }}
          vars={{ n: points.length }}
        />
      </figcaption>
      <SeatSparklineChart points={points} color={color} />
      <details className="motion-disclosure mt-1 text-xs text-ink-muted">
        <summary className="inline-flex cursor-pointer items-center text-ink-faint pointer-coarse:min-h-11">
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
                    <LocalDate iso={point.date} />
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
