"use client";

import Link from "next/link";
import { useId } from "react";
import type { ReactNode } from "react";
import { LocalCount } from "@/components/content/local-date";
import { useT } from "@/components/i18n/use-t";
import type { NowValue } from "@/lib/change-url-state";
import { ChangeKindGlyph } from "./change-glyph";

export type NowFigures = {
  /** Null when the dataset has no vacancy data yet. */
  vacantSeats: number | null;
  actingOfficials: number;
};

const CHIP_HREF: Record<NowValue, string> = {
  acting: "/wijzigingen/?now=acting",
  vacancy: "/wijzigingen/?now=vacancy",
};

const CHIP =
  "flex min-h-11 w-full min-w-0 items-center gap-2 rounded-md border px-3 py-1.5 text-left transition-fast focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus";

function Chip({
  id,
  value,
  label,
  hint,
  tipAlign,
  mode,
  pressed,
  onSelect,
}: {
  id: NowValue;
  value: ReactNode;
  label: string;
  /** What the figure counts: shown on hover, focus and tap, and read as the chip's description. */
  hint: string;
  tipAlign: string;
  mode: "link" | "control";
  pressed: boolean;
  onSelect?: (id: NowValue) => void;
}) {
  const t = useT("home");
  const tipId = useId();
  const body = (
    <>
      <span aria-hidden="true" className="inline-flex h-5 w-5 shrink-0 items-center justify-center [--color-canvas:var(--t-color-surface)]">
        <ChangeKindGlyph kind={id} size={15} />
      </span>
      <span className="sr-only">{t("chgNowLabel")}: </span>
      <span className="min-w-0 text-xs leading-tight text-ink-muted">
        <span className="text-base font-semibold tabular-nums tracking-tight text-ink">{value}</span> {label}
      </span>
    </>
  );
  const tone = pressed ? "border-accent/40 bg-accent-soft" : "border-line bg-surface hover:border-line-strong";
  return (
    <li className="group relative min-w-0 @[34rem]:w-auto">
      {mode === "link" ? (
        <Link href={CHIP_HREF[id]} aria-describedby={tipId} className={`${CHIP} ${tone}`}>
          {body}
        </Link>
      ) : (
        <button type="button" aria-pressed={pressed} aria-describedby={tipId} onClick={() => onSelect?.(id)} className={`${CHIP} ${tone}`}>
          {body}
        </button>
      )}
      <div
        id={tipId}
        role="tooltip"
        className={`pointer-events-none invisible absolute top-full z-30 mt-1 w-64 max-w-[calc(100vw-2rem)] rounded-md border border-line-strong bg-surface px-3 py-2 text-xs leading-snug text-ink-muted opacity-0 shadow-lg transition-opacity duration-150 group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100 ${tipAlign}`}
      >
        {hint}
      </div>
    </li>
  );
}

/**
 * The two figures that describe the state right now, in a group labelled
 * "Nu" (now): acting office holders and vacant seats. They do not depend on
 * any period, so they sit apart from the period control and its filter chips.
 * On /wijzigingen/ a chip is a button that opens its list (`mode="control"`),
 * on the home page a link to it. The definition shows as a tooltip on hover,
 * focus and tap and is the chip's accessible description.
 */
export function NowChips({
  figures,
  className = "",
  mode = "link",
  pressed = null,
  onSelect,
}: {
  figures: NowFigures;
  className?: string;
  mode?: "link" | "control";
  pressed?: NowValue | null;
  onSelect?: (id: NowValue) => void;
}) {
  const t = useT("home");
  const { vacantSeats, actingOfficials } = figures;
  const shared = { mode, onSelect } as const;
  return (
    <div className={`@container ${className}`.trim()}>
      <div className="flex flex-col gap-1.5 @[34rem]:flex-row @[34rem]:items-center @[34rem]:gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">{t("chgNowLabel")}</p>
        <ul aria-label={t("chgNowGroupAria")} className="grid grid-cols-2 gap-2 @[34rem]:flex @[34rem]:flex-wrap">
          <Chip
            {...shared}
            id="acting"
            pressed={pressed === "acting"}
            tipAlign="left-0"
            value={<LocalCount value={actingOfficials} />}
            label={t(actingOfficials === 1 ? "chgActingLabelOne" : "chgActingLabel")}
            hint={t("chgHintActing")}
          />
          <Chip
            {...shared}
            id="vacancy"
            pressed={pressed === "vacancy"}
            tipAlign="right-0 @[34rem]:left-0 @[34rem]:right-auto"
            value={vacantSeats === null ? "-" : <LocalCount value={vacantSeats} />}
            label={vacantSeats === null ? t("statVacantUnknownSub") : t(vacantSeats === 1 ? "chgVacancyLabelOne" : "chgVacancyLabel")}
            hint={t("chgHintVacancy")}
          />
        </ul>
      </div>
    </div>
  );
}
