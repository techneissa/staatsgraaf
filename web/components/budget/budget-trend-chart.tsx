"use client";

import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { useLocale } from "@/components/i18n/language-provider";
import { useDict } from "@/components/i18n/use-t";
import { DisclosureChevron } from "./disclosure-chevron";
import { formatBudgetAmountExact, formatEuroCompact } from "@/lib/budget-format";
import { estimateTextWidth } from "@/lib/budget-radar";
import { nearestPoint, trendLayout, trendTicks, type TrendMeasure, type TrendSeries } from "@/lib/budget-trend";
import { orgEnGloss } from "@/lib/name-gloss";

const HEIGHT = 196;
const COLOR = "var(--t-color-sector-regering)";
const FONT = 11;

/** A short legend key: solid for realized, dashed with a hollow dot for budgeted. */
function LegendKey({ measure }: { measure: TrendMeasure }) {
  return (
    <svg aria-hidden="true" width="26" height="10" viewBox="0 0 26 10" className="shrink-0">
      <line
        x1="1"
        y1="5"
        x2="25"
        y2="5"
        stroke={COLOR}
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray={measure === "budget" ? "5 4" : undefined}
      />
      <circle cx="13" cy="5" r="3" fill={measure === "budget" ? "var(--t-color-surface)" : COLOR} stroke={COLOR} strokeWidth="1.6" />
    </svg>
  );
}

/**
 * Spending over the years as one line: realized years solid, budgeted years
 * dashed with hollow dots, on an axis that starts at zero. The first and last
 * values are written on the line; hover, touch or the arrow keys read any
 * year. With several series a selector picks one (all ministries combined, or
 * one ministry); colour stays one hue, because the selection is the entity.
 * The same figures sit in a table under the chart.
 */
export function BudgetTrendChart({
  series,
  defaultId,
  selectable,
  note,
}: {
  series: TrendSeries[];
  defaultId: string;
  selectable: boolean;
  /** Extra sourced notes (for example a named gap) under the chart. */
  note?: React.ReactNode;
}) {
  const t = useDict("news");
  const locale = useLocale() === "en" ? "en" : "nl";
  const id = useId();
  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(358);
  const [selected, setSelected] = useState(defaultId);
  const [active, setActive] = useState<number | null>(null);

  useEffect(() => {
    const node = wrapRef.current;
    if (!node) return;
    const observer = new ResizeObserver((entries) => {
      const next = Math.floor(entries[0]?.contentRect.width ?? 0);
      if (next > 0) setWidth(next);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (active === null) return;
    const close = (event: globalThis.PointerEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) setActive(null);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [active]);

  const nameOf = (entry: TrendSeries) =>
    entry.name === null ? t("budgetTrendTotal") : locale === "en" ? (orgEnGloss(entry.name) ?? entry.name) : entry.name;

  const current = series.find((entry) => entry.id === selected) ?? series[0];
  const layout = useMemo(() => {
    // The left margin follows the widest value label, so none is cut off.
    const top = Math.max(0, ...current.points.map((point) => point.value ?? 0));
    const widest = Math.max(
      ...trendTicks(top).map((value) => estimateTextWidth(formatEuroCompact(value, locale).replace(/^−?€\s?/, ""), FONT)),
    );
    return trendLayout({
      points: current.points,
      width,
      height: HEIGHT,
      padLeft: Math.ceil(widest) + 12,
      padRight: 14,
      padTop: 22,
      padBottom: 24,
    });
  }, [current, width, locale]);
  const plotted = layout.plotted;
  const measureLabel = (measure: TrendMeasure) => (measure === "budget" ? t("budgetMeasureBudget") : t("budgetMeasureActual"));
  const compact = (value: number) => formatEuroCompact(value, locale);
  const axisLabel = (value: number) => formatEuroCompact(value, locale).replace(/^−?€\s?/, "");

  const first = plotted[0];
  const last = plotted[plotted.length - 1];
  const activePoint = active !== null ? (plotted[active] ?? null) : null;

  // Year labels: the first and the last, and as many in between as fit.
  const yearLabelStep = Math.max(1, Math.ceil(layout.years.length / Math.max(2, Math.floor((width - 60) / 44))));
  const yearLabels = layout.years.filter((year, index) => index === 0 || index === layout.years.length - 1 || index % yearLabelStep === 0)
    // Drop an in-between label that would touch the last one.
    .filter((year, index, all) => index === 0 || year === all[all.length - 1] || layout.x(all[all.length - 1]) - layout.x(year) >= 48);

  const onMove = (event: PointerEvent<SVGSVGElement>) => {
    if (event.pointerType !== "mouse") return;
    const box = event.currentTarget.getBoundingClientRect();
    const hit = nearestPoint(plotted, ((event.clientX - box.left) / box.width) * width);
    setActive(hit === null ? null : plotted.indexOf(hit));
  };
  const onUp = (event: PointerEvent<SVGSVGElement>) => {
    if (event.pointerType === "mouse") return;
    const box = event.currentTarget.getBoundingClientRect();
    const hit = nearestPoint(plotted, ((event.clientX - box.left) / box.width) * width);
    const index = hit === null ? null : plotted.indexOf(hit);
    setActive((currentIndex) => (currentIndex === index ? null : index));
  };
  const onKeyDown = (event: KeyboardEvent<SVGSVGElement>) => {
    const count = plotted.length;
    if (count === 0) return;
    if (event.key === "ArrowRight" || event.key === "ArrowUp") {
      event.preventDefault();
      setActive((index) => (index === null ? 0 : Math.min(count - 1, index + 1)));
    } else if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
      event.preventDefault();
      setActive((index) => (index === null ? count - 1 : Math.max(0, index - 1)));
    } else if (event.key === "Home") {
      event.preventDefault();
      setActive(0);
    } else if (event.key === "End") {
      event.preventDefault();
      setActive(count - 1);
    } else if (event.key === "Escape") {
      setActive(null);
    }
  };

  const tipWidth = 168;
  const tooltip =
    activePoint === null
      ? null
      : {
          left: Math.max(0, Math.min(width - tipWidth, activePoint.x - tipWidth / 2)),
          top: activePoint.y < HEIGHT / 2 ? activePoint.y + 14 : activePoint.y - 14,
          below: activePoint.y < HEIGHT / 2,
        };

  const summary = plotted.length
    ? t("budgetTrendAria", { name: nameOf(current), from: plotted[0].year, to: plotted[plotted.length - 1].year })
    : t("budgetTrendEmpty");
  const hasBudget = plotted.some((point) => point.measure === "budget");
  const hasActual = plotted.some((point) => point.measure === "actual");

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        {selectable ? (
          <label className="flex min-w-0 max-w-full items-center gap-2 text-sm text-ink-muted">
            <span className="shrink-0">{t("budgetTrendSelect")}</span>
            <select
              value={selected}
              onChange={(event) => {
                setSelected(event.target.value);
                setActive(null);
              }}
              className="min-h-11 min-w-0 max-w-full rounded-sm border border-line bg-surface px-2 text-sm font-medium text-ink hover:border-line-strong"
            >
              {series.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {nameOf(entry)}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <span />
        )}
        <ul className="flex items-center gap-3 text-xs text-ink-muted">
          {hasActual ? (
            <li className="flex items-center gap-1.5">
              <LegendKey measure="actual" />
              {t("budgetMeasureActual")}
            </li>
          ) : null}
          {hasBudget ? (
            <li className="flex items-center gap-1.5">
              <LegendKey measure="budget" />
              {t("budgetMeasureBudget")}
            </li>
          ) : null}
        </ul>
      </div>

      <div ref={wrapRef} className="relative mt-1 w-full" style={{ height: HEIGHT }}>
        {plotted.length > 0 ? (
          <svg
            width={width}
            height={HEIGHT}
            viewBox={`0 0 ${width} ${HEIGHT}`}
            className="block max-w-full touch-manipulation select-none focus-visible:outline-offset-2"
            tabIndex={0}
            role="img"
            aria-label={summary}
            aria-describedby={`${id}-note`}
            onKeyDown={onKeyDown}
            onBlur={() => setActive(null)}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerLeave={(event) => {
              if (event.pointerType === "mouse") setActive(null);
            }}
          >
            {layout.budgetFrom !== null ? (
              <g>
                <rect
                  x={layout.budgetFrom - (layout.x(layout.years[1] ?? layout.years[0]) - layout.x(layout.years[0])) / 2}
                  y={layout.topY - 6}
                  width={Math.max(0, layout.right + 8 - (layout.budgetFrom - (layout.x(layout.years[1] ?? layout.years[0]) - layout.x(layout.years[0])) / 2))}
                  height={layout.bottomY - layout.topY + 6}
                  fill="var(--t-color-surface-inset)"
                  opacity="0.7"
                />
              </g>
            ) : null}
            {layout.ticks.map((tick) => (
              <g key={tick.value}>
                <line
                  x1={layout.left}
                  x2={layout.right}
                  y1={tick.y}
                  y2={tick.y}
                  stroke={tick.value === 0 ? "var(--t-color-line-strong)" : "var(--t-color-line)"}
                  strokeWidth="1"
                />
                <text x={layout.left - 6} y={tick.y} textAnchor="end" dominantBaseline="central" fontSize={FONT} fill="var(--t-color-ink-faint)" className="tabular-nums">
                  {axisLabel(tick.value)}
                </text>
              </g>
            ))}
            {yearLabels.map((year) => (
              <text
                key={year}
                x={layout.x(year)}
                y={layout.bottomY + 15}
                textAnchor={year === layout.years[0] ? "start" : year === layout.years[layout.years.length - 1] ? "end" : "middle"}
                fontSize={FONT}
                fill="var(--t-color-ink-faint)"
                className="tabular-nums"
              >
                {year}
              </text>
            ))}

            {activePoint ? (
              <line x1={activePoint.x} x2={activePoint.x} y1={layout.topY} y2={layout.bottomY} stroke="var(--t-color-line-strong)" strokeWidth="1" />
            ) : null}

            {layout.actualPath ? (
              <path d={layout.actualPath} fill="none" stroke={COLOR} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
            ) : null}
            {layout.budgetPath ? (
              <path
                d={layout.budgetPath}
                fill="none"
                stroke={COLOR}
                strokeWidth="2"
                strokeLinejoin="round"
                strokeLinecap="round"
                strokeDasharray="5 4"
              />
            ) : null}

            {plotted.map((point, index) => (
              <circle
                key={point.year}
                cx={point.x}
                cy={point.y}
                r={activePoint === point ? 5 : plotted.length > 16 ? 2.5 : 3.5}
                fill={point.measure === "budget" ? "var(--t-color-surface)" : COLOR}
                stroke={point.measure === "budget" ? COLOR : "var(--t-color-surface)"}
                strokeWidth={point.measure === "budget" ? 1.8 : 1.5}
                data-index={index}
              />
            ))}

            {/* Direct labels on the first and last value; the hover layer carries every other year. */}
            {[first, last]
              .filter((point, index, all) => point && (index === 0 || point !== all[0]))
              .map((point, index) => (
                <text
                  key={`end-${point.year}`}
                  x={point.x}
                  y={point.y - 9}
                  textAnchor={index === 0 ? "start" : "end"}
                  fontSize={FONT}
                  fontWeight={600}
                  fill="var(--t-color-ink)"
                  stroke="var(--t-color-surface)"
                  strokeWidth="3"
                  paintOrder="stroke"
                  className="tabular-nums"
                >
                  {compact(point.value)}
                </text>
              ))}

            {layout.budgetFrom !== null ? (
              <text x={layout.right} y={layout.topY - 10} textAnchor="end" fontSize={10} fill="var(--t-color-ink-faint)">
                {measureLabel("budget")}
              </text>
            ) : null}
          </svg>
        ) : (
          <p className="pt-6 text-sm text-ink-muted">{t("budgetTrendEmpty")}</p>
        )}

        <div aria-live="polite" className="sr-only">
          {activePoint ? `${nameOf(current)} ${activePoint.year}, ${measureLabel(activePoint.measure)}: ${compact(activePoint.value)}` : ""}
        </div>

        {tooltip !== null && activePoint !== null ? (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute z-10 rounded-md border border-line bg-surface-raised px-2.5 py-1.5 text-xs shadow-md"
            style={{
              left: tooltip.left,
              top: tooltip.top,
              width: tipWidth,
              transform: tooltip.below ? undefined : "translateY(-100%)",
            }}
          >
            <p className="flex items-baseline justify-between gap-2">
              <span className="font-semibold tabular-nums text-ink">{activePoint.year}</span>
              <span className="text-ink-faint">{measureLabel(activePoint.measure)}</span>
            </p>
            <p className="mt-0.5 font-semibold tabular-nums text-ink">{compact(activePoint.value)}</p>
          </div>
        ) : null}
      </div>

      <p id={`${id}-note`} className="mt-1 text-xs leading-relaxed text-ink-faint">
        {t("budgetTrendNote")}
      </p>
      {note}

      <details className="group mt-1">
        <summary className="flex min-h-11 cursor-pointer list-none items-center gap-1.5 text-sm font-medium text-accent-text [&::-webkit-details-marker]:hidden">
          <DisclosureChevron />
          {t("budgetRadarTableSummary")}
        </summary>
        <table className="mt-1 w-full border-collapse text-sm tabular-nums">
          <caption className="sr-only">{t("budgetTrendTableCaption", { name: nameOf(current) })}</caption>
          <thead>
            <tr className="border-b border-line text-start">
              <th scope="col" className="py-2 pe-3 text-start text-xs font-medium text-ink-faint">
                {t("budgetTableYear")}
              </th>
              <th scope="col" className="py-2 pe-3 text-end text-xs font-medium text-ink-faint">
                {t("budgetSpendingShort")}
              </th>
              <th scope="col" className="py-2 text-end text-xs font-medium text-ink-faint">
                {t("budgetTableMeasure")}
              </th>
            </tr>
          </thead>
          <tbody>
            {current.points.map((point) => (
              <tr key={point.year} className="border-b border-line last:border-b-0">
                <th scope="row" className="py-1.5 pe-3 text-start font-normal text-ink-muted">
                  {point.year}
                </th>
                <td className="whitespace-nowrap py-1.5 pe-3 text-end text-ink">
                  {point.value === null ? (
                    <span className="text-ink-faint">{t("budgetNotReported")}</span>
                  ) : (
                    formatBudgetAmountExact(point.value, null, locale)
                  )}
                </td>
                <td className="py-1.5 text-end text-ink-muted">{point.value === null ? "" : measureLabel(point.measure)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}
