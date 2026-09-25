import type { CSSProperties } from "react";
import { T } from "@/components/i18n/t";
import { layoutArch } from "@/components/graph/arch";
import { ARCH_EK, ARCH_TK, archParams, type ArchParams, type ChamberSeats } from "@/lib/graph";
import type { SeatTally } from "@/lib/parliament";
import { partySlug } from "@/lib/parties";

/**
 * The seats of an elected chamber as a ∩ arch: concentric arcs over the top
 * continued as straight legs, the shape of the plenary hall. Same geometry as
 * the arches on the graph canvas (`web/lib/graph.ts`, `archSeats`), drawn
 * large with block labels and the majority line. Pure: it renders a resolved
 * tally from `web/lib/parliament.ts` and reads no data.
 *
 * Blocks run largest first from the left until the official zaalindeling is
 * sourced (plan decision P3); the caption says so. Colours come from the party
 * registry; a faction without a sourced colour renders neutral.
 */

const PITCH = 22;
const NEUTRAL = "var(--t-color-line-strong)";
const LABEL_MIN_SEATS = 9;

/** Arch parameters for a chamber of `total` seats, or null when no clean arch exists. */
export function archParamsFor(total: number): ArchParams | null {
  if (total === ARCH_TK.total) return ARCH_TK;
  if (total === ARCH_EK.total) return ARCH_EK;
  for (const rows of [3, 4, 5, 6, 2]) {
    for (const r0 of [2.5, 3, 2, 3.5]) {
      try {
        return archParams(total, rows, r0);
      } catch {
        // try the next shape
      }
    }
  }
  return null;
}

function toChamber(tally: SeatTally): ChamberSeats {
  return {
    total: tally.total,
    majority: tally.majority,
    entries: tally.entries.map((entry) => ({
      key: entry.key,
      label: entry.label,
      color: entry.color,
      splinter: entry.splinter,
      seats: entry.seats,
    })),
  };
}

export function ArchChart({
  tally,
  highlightKey = null,
  compact = false,
}: {
  tally: SeatTally;
  /** Registry key of one party to draw at full strength while the rest fade. */
  highlightKey?: string | null;
  /** Smaller chart without block labels, for a party page. */
  compact?: boolean;
}) {
  const params = archParamsFor(tally.total);
  if (params === null || tally.total === 0) return null;
  const pitch = compact ? PITCH * 0.6 : PITCH;
  const arch = layoutArch(toChamber(tally), params, pitch);
  const seatRadius = arch.seatRadius;
  const outer = (params.r0Steps + params.rows - 1) * pitch;
  // Room for the block labels beside the legs and above the dome. A label is
  // estimated at 0.62 em per character of the label font, never measured, so
  // the box is the same on the server and in the browser.
  const labelFont = pitch * 0.62;
  const widestLabel = compact
    ? 0
    : Math.max(0, ...tally.entries.filter((entry) => entry.seats >= LABEL_MIN_SEATS).map((entry) => `${entry.label} ${entry.seats}`.length)) *
      labelFont *
      0.62;
  const pad = compact ? 6 : pitch * 1.1 + widestLabel + 8;
  const minX = arch.box.minX - pad;
  const maxX = arch.box.maxX + pad;
  const minY = arch.box.minY - (compact ? 6 : pitch * 1.6);
  const maxY = arch.box.maxY + 6;
  const width = maxX - minX;
  const height = maxY - minY;

  const blocks = tally.entries.map((entry) => {
    const marks = arch.marks.filter((mark) => mark.label === entry.label);
    const mid = marks[Math.floor(marks.length / 2)] ?? null;
    let label: { x: number; y: number; anchor: "start" | "middle" | "end" } | null = null;
    if (!compact && mid && entry.seats >= LABEL_MIN_SEATS) {
      // A block whose middle sits on the dome is labelled radially above it;
      // one on a leg, or at either end of the dome where a centred label would
      // run back into the outer column, is labelled beside the leg instead.
      if (mid.arc && mid.t > 0.18 && mid.t < 0.82) {
        const angle = Math.PI + mid.t * Math.PI;
        const radius = outer + pitch * 0.9;
        label = { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius, anchor: "middle" };
      } else {
        const side = Math.sign(mid.x) || 1;
        label = { x: side * (outer + pitch * 1.1), y: mid.y, anchor: side < 0 ? "end" : "start" };
      }
    }
    return { entry, marks, label };
  });

  // Seats fill the arch block by block, left to right, in about half a second.
  const seatDelay = (index: number) => `${Math.round((index / Math.max(1, tally.total)) * 420)}ms`;
  let seatOffset = 0;

  const highlighted = highlightKey ? tally.entries.find((entry) => entry.key === highlightKey) ?? null : null;
  const description = tally.entries.map((entry) => `${entry.label} ${entry.seats}`).join(", ");

  return (
    <figure className={compact ? "mt-2" : "mt-4"}>
      {!compact ? (
        <figcaption className="text-sm font-medium text-ink-muted">
          <T area="entity" k="seatChartLabel" />
        </figcaption>
      ) : null}
      <svg
        viewBox={`${minX.toFixed(1)} ${minY.toFixed(1)} ${width.toFixed(1)} ${height.toFixed(1)}`}
        role="img"
        aria-label={`${description}. ${tally.majority}/${tally.total}.`}
        className={`motion-grow ${compact ? "mt-1 h-auto w-full max-w-[220px]" : "mt-2 h-auto w-full max-w-xl"}`}
        data-reveal="pending"
      >
        {blocks.map(({ entry, marks, label }) => {
          const faded = highlighted !== null && entry.key !== highlightKey;
          const fill = entry.color ?? NEUTRAL;
          const first = seatOffset;
          seatOffset += marks.length;
          const seats = marks.map((mark, index) => (
            <circle
              key={index}
              className="grow-seat"
              style={{ "--d": seatDelay(first + index) } as CSSProperties}
              cx={mark.x.toFixed(2)}
              cy={mark.y.toFixed(2)}
              r={seatRadius.toFixed(2)}
              fill={fill}
              opacity={faded ? 0.22 : 1}
              stroke={entry.splinter ? "var(--t-color-ink-muted)" : "none"}
              strokeWidth={entry.splinter ? 0.8 : 0}
            />
          ));
          const text = label ? (
            <text
              x={label.x.toFixed(1)}
              y={label.y.toFixed(1)}
              textAnchor={label.anchor}
              dominantBaseline="central"
              fill="var(--t-color-ink)"
              opacity={faded ? 0.4 : 0.9}
              className="grow-fade"
              style={{ fontSize: labelFont, fontWeight: 600, "--d": "360ms" } as CSSProperties}
            >
              {`${entry.label} ${entry.seats}`}
            </text>
          ) : null;
          const title = <title>{`${entry.label}: ${entry.seats}`}</title>;
          // An SVG anchor, not next/link: the link lives inside the drawing.
          return entry.party !== null && !entry.party.unlisted ? (
            <a key={entry.label} href={`/partijen/${partySlug(entry.party)}/`} className="cursor-pointer">
              {title}
              {seats}
              {text}
            </a>
          ) : (
            <g key={entry.label}>
              {title}
              {seats}
              {text}
            </g>
          );
        })}
        {!compact ? (
          <text
            x={0}
            y={(-(params.r0Steps * pitch) * 0.42).toFixed(1)}
            textAnchor="middle"
            dominantBaseline="central"
            fill="var(--t-color-ink-muted)"
            style={{ fontSize: pitch * 0.55, fontWeight: 500 }}
          >
            {tally.majority}/{tally.total}
          </text>
        ) : null}
      </svg>
      <p className="mt-1.5 text-xs text-ink-muted">
        {highlighted !== null ? (
          <T
            area="entity"
            k="seatChartHighlight"
            vars={{ label: highlighted.label, n: highlighted.seats, total: tally.total }}
          />
        ) : (
          <T area="entity" k="seatChartMajorityLine" vars={{ n: tally.majority, total: tally.total }} />
        )}
      </p>
      {!compact ? (
        <p className="mt-0.5 text-xs text-ink-faint">
          <T area="entity" k="seatChartOrderNote" />
        </p>
      ) : null}
    </figure>
  );
}
