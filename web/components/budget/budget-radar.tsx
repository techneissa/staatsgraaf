"use client";

import { MinistryIcon } from "@/components/icons/ministry-icon";

import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { useLocale } from "@/components/i18n/language-provider";
import { useDict } from "@/components/i18n/use-t";
import { formatEuroCompact, formatShare } from "@/lib/budget-format";
import {
  axisAngle,
  amountTicks,
  AMOUNT_POWER,
  SHARE_POWER,
  estimateTextWidth,
  ministryShortLabel,
  polar,
  radarLayoutForLabels,
  radarPath,
  scaleFraction,
  shareTicks,
  sharesOf,
  wedgePath,
  type RadarData,
  type RadarScaleMode,
} from "@/lib/budget-radar";
import { orgEnGloss } from "@/lib/name-gloss";

/**
 * Series colours follow the selector slot, not the year. The first three
 * slots of the dataviz reference palette, validated all-pairs (lines cross on
 * a radar) against the site surfaces with validate_palette.js:
 * light on #FFFFFF: CVD worst ΔE 9.2, normal-vision worst ΔE 24.0, slot 3
 * below 3:1 contrast, relieved by the legend and the table view;
 * dark on #141419: CVD worst ΔE 9.4, normal-vision worst ΔE 20.9, all >= 3:1.
 */
const SERIES_STYLE = `
.sg-radar{--radar-1:#3987e5;--radar-2:#d95926;--radar-3:#199e70}
[data-theme="light"] .sg-radar{--radar-1:#2a78d6;--radar-2:#eb6834;--radar-3:#1baf7a}
`;
const SLOT_COLORS = ["var(--radar-1)", "var(--radar-2)", "var(--radar-3)"];
const DEFAULT_YEARS = [2025, 2026, 2027];
const FONT_SIZE = 11;

function LineKey({ color }: { color: string }) {
  return (
    <svg aria-hidden="true" width="16" height="8" viewBox="0 0 16 8" className="shrink-0">
      <line x1="1" y1="4" x2="15" y2="4" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function BudgetRadar({ data }: { data: RadarData }) {
  const t = useDict("news");
  const locale = useLocale() === "en" ? "en" : "nl";
  const id = useId();
  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(358);
  const [mode, setMode] = useState<RadarScaleMode>("share");
  const [active, setActive] = useState<number | null>(null);

  const available = data.years.map((entry) => entry.year);
  // Three selector slots; the second and third can be switched off ("Geen"),
  // so the chart can compare one, two or three years. Colour follows the slot.
  const [slotYears, setSlotYears] = useState<(number | null)[]>(() =>
    DEFAULT_YEARS.every((year) => available.includes(year)) ? DEFAULT_YEARS : available.slice(-3),
  );
  const years = slotYears.filter((year): year is number => year !== null);

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

  // A tap outside the chart closes the tooltip on touch screens.
  useEffect(() => {
    if (active === null) return;
    const close = (event: globalThis.PointerEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) setActive(null);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [active]);

  const count = data.ministries.length;
  const shortLabels = useMemo(
    () => data.ministries.map((ministry) => ministryShortLabel(ministry.name, locale, orgEnGloss(ministry.name))),
    [data.ministries, locale],
  );
  const layout = useMemo(
    () =>
      radarLayoutForLabels(
        width,
        data.ministries.map((ministry) =>
          ministryShortLabel(ministry.name, locale, orgEnGloss(ministry.name), { breakable: true }),
        ),
        { fontSize: FONT_SIZE, gap: 22 },
      ),
    [width, data.ministries, locale],
  );

  const measureOf = (year: number) => data.years.find((entry) => entry.year === year)?.measure ?? "actual";

  const series = slotYears.flatMap((year, slot) => {
    if (year === null) return [];
    const values = data.ministries.map((ministry) => ministry.values[String(year)] ?? null);
    return [{ year, slot, values, shares: sharesOf(values), measure: measureOf(year) }];
  });

  const share = shareTicks(Math.max(0, ...series.flatMap((entry) => entry.shares.map((value) => value ?? 0))));
  const amount = amountTicks(series.flatMap((entry) => entry.values));
  const domain = { shareMax: share.max, amountMax: amount.max };
  const { cx, cy, radius } = layout;

  const fractions = series.map((entry) =>
    (mode === "share" ? entry.shares : entry.values).map((value) => scaleFraction(value, mode, domain)),
  );
  const pointsOf = (slot: number) =>
    fractions[slot].map((fraction, index) =>
      fraction === null ? null : polar(cx, cy, radius * fraction, axisAngle(index, count)),
    );

  // Each ring's value label gets its own gap between two axes, so the numbers
  // sit at different angles instead of stacking along one line. Gaps where the
  // data reaches least far come first (the lines cover the label least there),
  // and no two labels take neighbouring gaps while a free one is further away.
  const wedgeFill = Array.from({ length: count }, (_, index) =>
    Math.max(0, ...fractions.flatMap((values) => [values[index] ?? 0, values[(index + 1) % count] ?? 0])),
  );
  const byFill = [...wedgeFill.keys()].sort((a, b) => wedgeFill[a] - wedgeFill[b] || a - b);
  const labelWedges: number[] = [];
  const apart = (a: number, b: number) => Math.min((a - b + count) % count, (b - a + count) % count) >= 2;
  for (const wedge of byFill) if (labelWedges.every((taken) => apart(wedge, taken))) labelWedges.push(wedge);
  for (const wedge of byFill) if (!labelWedges.includes(wedge)) labelWedges.push(wedge);

  const rings =
    mode === "share"
      ? share.ticks.map((value) => ({
          fraction: (value / share.max) ** SHARE_POWER,
          label: new Intl.NumberFormat(locale === "en" ? "en-GB" : "nl-NL", {
            style: "percent",
            maximumFractionDigits: 0,
          }).format(value / 100),
        }))
      : amount.ticks.map((value) => ({
          fraction: (value / amount.max) ** AMOUNT_POWER,
          // The note under the chart says the amounts are in euros, so the
          // ring values drop the sign: "75 mld" / "75B" keeps the scale compact.
          label: formatEuroCompact(value, locale).replace(/^−?€\s?/, ""),
        }));

  // Ring values read as one scale: they all sit along the same line, through
  // the gap where the data reaches least far. Where two values or a value and
  // a ministry badge would touch, the value is nudged sideways (alternating
  // sides, a little further each try) or slightly inward, never moved to
  // another part of the chart. A value with no room is left out; the ring and
  // the table still carry it.
  const ringLabels: { ring: (typeof rings)[number]; at: { x: number; y: number } }[] = [];
  // A small chart gets slightly smaller ring values so all of them fit.
  const ringFont = radius < 130 ? 9 : 10;
  // A near-vertical line keeps the values stacked one above the other, where a
  // diagonal line would make neighbouring values bump sideways.
  // The values read as a scale going up and slightly left: along the gap
  // between the first axis (straight up) and the last one, so the column
  // always sits in the same, familiar place.
  const scaleAngle = axisAngle(count - 0.5, count);
  const badgeCentres = Array.from({ length: count }, (_, index) => polar(cx, cy, radius, axisAngle(index, count)));
  const placedBoxes: { x0: number; y0: number; x1: number; y1: number }[] = [];
  const across = { x: -Math.sin(scaleAngle), y: Math.cos(scaleAngle) };
  rings.forEach((ring, ringIndex) => {
    const halfW = estimateTextWidth(ring.label, ringFont) / 2 + 4;
    const lean = ringIndex % 2 === 0 ? 1 : -1;
    const nudges = [0, 8, -8, 16, -16, 24, -24, 32, -32, 40, -40, 48, -48].map((step) => step * lean);
    for (const inset of [0, 6, 12, 18, 24]) {
      for (const nudge of nudges) {
        const base = polar(cx, cy, Math.max(0, radius * ring.fraction - inset), scaleAngle);
        const at = { x: base.x + across.x * nudge, y: base.y + across.y * nudge };
        const box = { x0: at.x - halfW, y0: at.y - ringFont + 2, x1: at.x + halfW, y1: at.y + ringFont - 2 };
        const clearOfBadges = badgeCentres.every((c) => {
          const dx = Math.max(box.x0 - c.x, 0, c.x - box.x1);
          const dy = Math.max(box.y0 - c.y, 0, c.y - box.y1);
          return Math.hypot(dx, dy) > 12;
        });
        const clearOfLabels = placedBoxes.every(
          (o) => box.x1 < o.x0 - 1 || box.x0 > o.x1 + 1 || box.y1 < o.y0 || box.y0 > o.y1,
        );
        if (clearOfBadges && clearOfLabels) {
          placedBoxes.push(box);
          ringLabels.push({ ring, at });
          return;
        }
      }
    }
  });

  const missing = [...new Set(years)]
    .map((year) => ({
      year,
      names: data.ministries
        .filter((ministry) => (ministry.values[String(year)] ?? null) === null)
        .map((ministry) => ministryShortLabel(ministry.name, locale, orgEnGloss(ministry.name))),
    }))
    .filter((entry) => entry.names.length > 0);

  const measureLabel = (year: number) =>
    measureOf(year) === "budget" ? t("budgetMeasureBudget") : t("budgetMeasureActual");

  const onPointer = (index: number) => (event: PointerEvent) => {
    if (event.pointerType === "mouse") setActive(index);
  };
  const onKeyDown = (event: KeyboardEvent<SVGSVGElement>) => {
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      event.preventDefault();
      setActive((current) => ((current ?? -1) + 1) % count);
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      event.preventDefault();
      setActive((current) => ((current ?? 0) - 1 + count) % count);
    } else if (event.key === "Escape") {
      setActive(null);
    }
  };

  // Tooltip anchored at the outermost point on the active axis, kept inside the column.
  const tooltip = (() => {
    if (active === null) return null;
    const outer = Math.max(0.35, ...fractions.map((values) => values[active] ?? 0));
    const anchor = polar(cx, cy, radius * outer, axisAngle(active, count));
    const tipWidth = Math.min(224, width);
    const left = Math.max(0, Math.min(width - tipWidth, anchor.x - tipWidth / 2));
    const below = anchor.y < cy;
    return { left, top: below ? anchor.y + 14 : anchor.y - 14, below, tipWidth };
  })();

  const noteKey = mode === "share" ? "budgetRadarNoteShare" : "budgetRadarNoteAmount";
  const noteId = `${id}-note`;

  return (
    <div className="sg-radar">
      <style>{SERIES_STYLE}</style>

      <div className="grid grid-cols-3 gap-2">
        {slotYears.map((year, slot) => (
          <div key={slot} className="min-w-0">
            <div className="flex items-center gap-1.5">
              <LineKey color={year === null ? "var(--t-color-line-strong)" : SLOT_COLORS[slot]} />
              <select
                aria-label={t("budgetRadarSeries", { number: slot + 1 })}
                value={year === null ? "" : year}
                onChange={(event) => {
                  const next = [...slotYears];
                  next[slot] = event.target.value === "" ? null : Number(event.target.value);
                  setSlotYears(next);
                }}
                className="min-h-11 w-full min-w-0 rounded-sm border border-line bg-surface px-2 text-sm font-medium tabular-nums text-ink hover:border-line-strong"
              >
                {slot > 0 ? <option value="">{t("budgetRadarNoYear")}</option> : null}
                {[...available].reverse().map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
            <p className="mt-1 pl-[22px] text-[11px] leading-tight text-ink-faint">{year === null ? "\u00a0" : measureLabel(year)}</p>
          </div>
        ))}
      </div>

      <div
        role="group"
        aria-label={t("budgetRadarScaleGroup")}
        className="mt-3 inline-flex rounded-sm border border-line bg-surface-inset p-0.5"
      >
        {(["share", "amount"] as const).map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={mode === option}
            onClick={() => setMode(option)}
            className={`min-h-11 rounded-[4px] px-3 text-sm transition-fast ${
              mode === option ? "bg-surface font-medium text-ink shadow-sm" : "text-ink-muted hover:text-ink"
            }`}
          >
            {option === "share" ? t("budgetRadarScaleShare") : t("budgetRadarScaleAmount")}
          </button>
        ))}
      </div>

      <div ref={wrapRef} className="relative mt-2 w-full">
        <svg
          width={layout.width}
          height={layout.height}
          viewBox={`0 0 ${layout.width} ${layout.height}`}
          className="block max-w-full touch-manipulation select-none focus-visible:outline-offset-4"
          tabIndex={0}
          role="img"
          aria-label={t("budgetRadarAria", { years: years.join(", ") })}
          aria-describedby={noteId}
          onKeyDown={onKeyDown}
          onBlur={() => setActive(null)}
          onPointerLeave={(event) => {
            if (event.pointerType === "mouse") setActive(null);
          }}
        >
          {rings.map((ring) => (
            <circle
              key={ring.label}
              cx={cx}
              cy={cy}
              r={radius * ring.fraction}
              fill="none"
              stroke="var(--t-color-line)"
              strokeWidth="1"
            />
          ))}
          {data.ministries.map((ministry, index) => {
            const end = polar(cx, cy, radius, axisAngle(index, count));
            return (
              <line
                key={ministry.id}
                x1={cx}
                y1={cy}
                x2={end.x}
                y2={end.y}
                stroke={active === index ? "var(--t-color-line-strong)" : "var(--t-color-line)"}
                strokeWidth="1"
              />
            );
          })}

          {series.map((entry, index) => {
            const { d, closed } = radarPath(pointsOf(index));
            return (
              <path
                key={entry.slot}
                d={d}
                fill={closed ? SLOT_COLORS[entry.slot] : "none"}
                fillOpacity={closed ? 0.08 : undefined}
                stroke={SLOT_COLORS[entry.slot]}
                strokeWidth="2"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            );
          })}

          {ringLabels.map(({ ring, at }) => {
            return (
            <text
              key={`label-${ring.label}`}
              x={at.x}
              y={at.y}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={ringFont}
              fill="var(--t-color-ink-faint)"
              stroke="var(--t-color-surface)"
              strokeWidth="3"
              paintOrder="stroke"
              className="tabular-nums"
            >
              {ring.label}
            </text>
            );
          })}

          {active !== null
            ? series.map((entry, index) => {
                const point = pointsOf(index)[active];
                return point ? (
                  <circle
                    key={`dot-${entry.slot}`}
                    cx={point.x}
                    cy={point.y}
                    r="4"
                    fill={SLOT_COLORS[entry.slot]}
                    stroke="var(--t-color-surface)"
                    strokeWidth="2"
                  />
                ) : null;
              })
            : null}

          {layout.labels.map((label, index) => (
            <text
              key={data.ministries[index].id}
              x={label.x}
              y={label.y}
              textAnchor={label.anchor}
              fontSize={FONT_SIZE}
              fill={active === index ? "var(--t-color-ink)" : "var(--t-color-ink-muted)"}
              fontWeight={active === index ? 600 : 400}
            >
              {label.lines.map((line, lineIndex) => (
                <tspan key={lineIndex} x={label.x} dy={lineIndex === 0 ? 0 : 13}>
                  {line}
                </tspan>
              ))}
            </text>
          ))}

          {data.ministries.map((ministry, index) => {
            // Each ministry's icon sits in a small badge on the outer ring, at
            // the end of its axis, so the axis is recognisable at a glance.
            const at = polar(cx, cy, radius, axisAngle(index, count));
            const lit = active === index;
            return (
              <g key={`badge-${ministry.id}`} aria-hidden="true" pointerEvents="none">
                <circle
                  cx={at.x}
                  cy={at.y}
                  r={10}
                  fill="var(--t-color-surface)"
                  stroke={lit ? "var(--t-color-ink)" : "var(--t-color-line-strong)"}
                  strokeWidth={1.2}
                />
                <g style={{ color: lit ? "var(--t-color-ink)" : "var(--t-color-ink-muted)" }}>
                  <MinistryIcon orgId={ministry.id} size={12} strokeWidth={2} x={at.x - 6} y={at.y - 6} />
                </g>
              </g>
            );
          })}

          {data.ministries.map((ministry, index) => (
            <path
              key={`hit-${ministry.id}`}
              d={wedgePath(cx, cy, radius + 28, index, count)}
              fill="transparent"
              onPointerEnter={onPointer(index)}
              onPointerMove={onPointer(index)}
              onPointerUp={(event) => {
                if (event.pointerType !== "mouse") setActive((current) => (current === index ? null : index));
              }}
            />
          ))}
        </svg>

        <div aria-live="polite" className="sr-only">
          {active !== null
            ? `${data.ministries[active].name}: ${series
                .map((entry) => {
                  const value = entry.values[active];
                  return `${entry.year} ${measureLabel(entry.year)} ${
                    value === null ? t("budgetNotReported") : formatEuroCompact(value, locale)
                  }`;
                })
                .join("; ")}`
            : ""}
        </div>

        {tooltip !== null && active !== null ? (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute z-10 rounded-md border border-line bg-surface-raised px-3 py-2 text-xs shadow-md"
            style={{
              left: tooltip.left,
              top: tooltip.top,
              width: tooltip.tipWidth,
              transform: tooltip.below ? undefined : "translateY(-100%)",
            }}
          >
            <p className="font-semibold leading-snug text-ink">
              {locale === "en" ? (orgEnGloss(data.ministries[active].name) ?? data.ministries[active].name) : data.ministries[active].name}
            </p>
            <ul className="mt-1.5 space-y-1">
              {series.map((entry, index) => {
                const value = entry.values[active];
                const shareValue = entry.shares[active];
                const amount = value === null ? t("budgetNotReported") : formatEuroCompact(value, locale);
                const shareText = shareValue === null ? null : formatShare(shareValue, locale);
                const [primary, secondary] =
                  mode === "share" && shareText !== null ? [shareText, amount] : [amount, shareText];
                return (
                  <li key={entry.slot} className="flex items-center gap-2">
                    <LineKey color={SLOT_COLORS[entry.slot]} />
                    <span className="font-semibold tabular-nums text-ink">{primary}</span>
                    {secondary !== null ? (
                      <span className="tabular-nums text-ink-muted">{secondary}</span>
                    ) : null}
                    <span className="ml-auto tabular-nums text-ink-faint">{entry.year}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}
      </div>

      <p id={noteId} className="mt-1 text-xs leading-relaxed text-ink-faint">
        {t(noteKey)}
        {missing.map((entry) => (
          <span key={entry.year}> {t("budgetRadarMissing", { names: entry.names.join(", "), year: entry.year })}</span>
        ))}
      </p>

      <details className="group mt-2">
        <summary className="flex min-h-11 cursor-pointer list-none items-center gap-1.5 text-sm font-medium text-accent-text [&::-webkit-details-marker]:hidden">
          <svg aria-hidden="true" viewBox="0 0 12 12" width="12" height="12" className="transition-fast group-open:rotate-90">
            <path d="M4.5 2.5 8 6l-3.5 3.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {t("budgetRadarTableSummary")}
        </summary>
        <table className="mt-1 w-full table-fixed border-collapse text-xs">
          <caption className="sr-only">{t("budgetRadarTableCaption")}</caption>
          <thead>
            <tr className="border-b border-line text-left align-bottom">
              <th scope="col" className="w-[34%] py-2 pe-2 font-medium text-ink-faint">
                {t("budgetRadarTableMinistry")}
              </th>
              {series.map((entry, index) => (
                <th key={entry.slot} scope="col" className="py-2 ps-2 text-right font-medium text-ink-faint">
                  <span className="inline-flex items-center gap-1 tabular-nums text-ink">
                    <LineKey color={SLOT_COLORS[entry.slot]} />
                    {entry.year}
                  </span>
                  <span className="block font-normal">{measureLabel(entry.year)}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.ministries.map((ministry, index) => (
              <tr key={ministry.id} className="border-b border-line last:border-b-0">
                <th scope="row" className="py-2 pe-2 text-left font-normal leading-snug text-ink-muted">
                  {shortLabels[index]}
                </th>
                {series.map((entry) => {
                  const value = entry.values[index];
                  const shareValue = entry.shares[index];
                  return (
                    <td key={entry.slot} className="py-2 ps-2 text-right tabular-nums">
                      {value === null ? (
                        <span className="text-ink-faint">{t("budgetNotReported")}</span>
                      ) : (
                        <>
                          <span className="block whitespace-nowrap text-ink">{formatEuroCompact(value, locale)}</span>
                          {shareValue !== null ? (
                            <span className="block text-ink-faint">{formatShare(shareValue, locale)}</span>
                          ) : null}
                        </>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}
