"use client";

import { useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from "react";
import { DateT } from "@/components/content/local-date";
import { useLocale } from "@/components/i18n/language-provider";
import { useT } from "@/components/i18n/use-t";
import { formatDateIn } from "@/lib/format";
import {
  SPARK_HEIGHT,
  SPARK_WIDTH,
  sparklinePlot,
  type SparklinePoint,
} from "@/lib/sparkline-layout";

function nearestIndex(clientX: number, svg: SVGSVGElement, xs: number[]): number {
  const rect = svg.getBoundingClientRect();
  if (rect.width <= 0 || xs.length === 0) return 0;
  const x = ((clientX - rect.left) / rect.width) * SPARK_WIDTH;
  let best = 0;
  let bestD = Infinity;
  for (let index = 0; index < xs.length; index += 1) {
    const d = Math.abs(xs[index] - x);
    if (d < bestD) {
      bestD = d;
      best = index;
    }
  }
  return best;
}

/**
 * The drawn line of a party's seats over elections. Every point is labelled
 * clear of the stroke, and a hover or focus names the election outside the plot.
 */
export function SeatSparklineChart({
  points,
  color,
}: {
  points: SparklinePoint[];
  color: string | null;
}) {
  const [active, setActive] = useState<number | null>(null);
  const locale = useLocale();
  const t = useT("entity");
  const plot = sparklinePlot(points);
  const stroke = color ?? "var(--t-color-ink-muted)";
  const last = points.length - 1;

  const announce = (index: number) => {
    const point = points[index];
    return t("seatSparklineHover", {
      date: formatDateIn(point.date, locale, "short"),
      seats: point.seats,
      total: point.total,
    });
  };

  const pick = (event: PointerEvent<SVGSVGElement>) => {
    setActive(nearestIndex(event.clientX, event.currentTarget, plot.xs));
  };

  const onKey = (event: KeyboardEvent<SVGSVGElement>) => {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      setActive((current) => (current === null ? 0 : Math.min(last, current + 1)));
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      setActive((current) => (current === null ? last : Math.max(0, current - 1)));
    } else if (event.key === "Escape") {
      setActive(null);
    }
  };

  const tip = active !== null ? points[active] : null;
  const tipPct = active !== null ? (plot.xs[active] / SPARK_WIDTH) * 100 : 0;
  const tipAlign = tipPct < 22 ? "start" : tipPct > 78 ? "end" : "middle";
  // Point in the upper half: tooltip under the chart. Point in the lower half: above.
  const tipBelow = active !== null && plot.ys[active] < SPARK_HEIGHT / 2;

  return (
    <div className="relative mt-1 min-w-0 w-full">
      <svg
        viewBox={`0 0 ${SPARK_WIDTH} ${SPARK_HEIGHT}`}
        role="img"
        aria-label={points.map((_, index) => announce(index)).join(". ")}
        tabIndex={0}
        onKeyDown={onKey}
        onPointerMove={pick}
        onPointerDown={pick}
        onPointerLeave={() => setActive(null)}
        overflow="visible"
        className="motion-grow block h-auto w-full cursor-pointer overflow-visible outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        data-reveal="pending"
      >
        <path
          className="grow-stroke pointer-events-none"
          pathLength={1}
          d={plot.path}
          fill="none"
          stroke={stroke}
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {points.map((point, index) => {
          const cx = plot.xs[index];
          const cy = plot.ys[index];
          const on = active === index;
          return (
            <g key={point.date} className="pointer-events-none">
              <circle
                className="grow-seat"
                style={{ "--d": `${Math.round((index / Math.max(1, last)) * 480)}ms` } as CSSProperties}
                cx={cx.toFixed(1)}
                cy={cy.toFixed(1)}
                r={on ? 5 : 3.5}
                fill={stroke}
              />
              <text
                x={cx.toFixed(1)}
                y={plot.labelYs[index].toFixed(1)}
                textAnchor={plot.anchors[index]}
                fill="var(--t-color-ink)"
                stroke="var(--t-color-surface)"
                strokeWidth={4}
                paintOrder="stroke"
                className="grow-fade tabular-nums"
                style={{ fontSize: 12, fontWeight: 600, "--d": "480ms" } as CSSProperties}
              >
                {point.seats}
              </text>
            </g>
          );
        })}
      </svg>
      {tip !== null && active !== null ? (
        <div
          role="tooltip"
          aria-live="polite"
          className="pointer-events-none absolute z-10 max-w-[calc(100%-0.5rem)] rounded-sm border border-line bg-surface px-2 py-1 text-xs text-ink shadow-md"
          style={{
            left: `${tipPct}%`,
            top: tipBelow ? "100%" : undefined,
            bottom: tipBelow ? undefined : "100%",
            marginTop: tipBelow ? 4 : undefined,
            marginBottom: tipBelow ? undefined : 4,
            transform:
              tipAlign === "start" ? "translateX(0)" : tipAlign === "end" ? "translateX(-100%)" : "translateX(-50%)",
          }}
        >
          <DateT
            area="entity"
            k="seatSparklineHover"
            dates={{ date: tip.date }}
            counts={{ seats: tip.seats, total: tip.total }}
            short
          />
        </div>
      ) : null}
    </div>
  );
}
