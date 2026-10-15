"use client";

import Link from "next/link";
import { useId } from "react";
import type { ReactNode } from "react";
import { LocalCount } from "@/components/content/local-date";
import { useT } from "@/components/i18n/use-t";
import type { NowValue } from "@/lib/change-url-state";
import { CHANGE_LABEL_TONE, ChangeKindGlyph } from "./change-glyph";

export type NowFigures = {
  /** Null when the dataset has no vacancy data yet. */
  vacantSeats: number | null;
  actingOfficials: number;
};

const CHIP_HREF: Record<NowValue, string> = {
  acting: "/wijzigingen/?now=acting",
  vacancy: "/wijzigingen/?now=vacancy",
};

const HIT =
  "relative inline-flex min-h-8 items-center gap-1.5 rounded-sm text-left transition-fast pointer-coarse:min-h-11 pointer-coarse:after:absolute pointer-coarse:after:-inset-x-1 pointer-coarse:after:-inset-y-1 pointer-coarse:after:content-['']";

function Chip({
  id,
  value,
  label,
  hint,
  tipAlign,
  mode,
  pressed,
  dimmed,
  onSelect,
}: {
  id: NowValue;
  value: ReactNode;
  label: string;
  hint: string;
  tipAlign: string;
  mode: "link" | "control";
  pressed: boolean;
  dimmed: boolean;
  onSelect?: (id: NowValue) => void;
}) {
  const t = useT("home");
  const tipId = useId();
  const body = (
    <>
      <ChangeKindGlyph kind={id} size={14} />
      <span className="sr-only">{t("chgNowLabel")}: </span>
      <span className={`text-base font-semibold tabular-nums tracking-tight ${CHANGE_LABEL_TONE[id]}`}>{value}</span>
      <span className="text-xs text-ink-muted">{label}</span>
    </>
  );
  const tone = pressed ? "text-ink" : dimmed ? "opacity-45 hover:opacity-100" : "text-ink-muted hover:text-ink";
  return (
    <li className="group relative">
      {mode === "link" ? (
        <Link href={CHIP_HREF[id]} aria-describedby={tipId} className={`${HIT} ${tone}`}>
          {body}
        </Link>
      ) : (
        <button type="button" aria-pressed={pressed} aria-describedby={tipId} onClick={() => onSelect?.(id)} className={`${HIT} ${tone}`}>
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
 * Acting office holders and vacant seats as a quiet "now" row: a coloured
 * glyph, the number and a short word. No boxes. On /wijzigingen/ a figure
 * is a button that opens its list; on the home page a link to it.
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
    <div className={`flex flex-wrap items-center gap-x-4 gap-y-1 ${className}`.trim()}>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">{t("chgNowLabel")}</p>
      <ul aria-label={t("chgNowGroupAria")} className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <Chip
          {...shared}
          id="acting"
          pressed={pressed === "acting"}
          dimmed={pressed !== null && pressed !== "acting"}
          tipAlign="left-0"
          value={<LocalCount value={actingOfficials} />}
          label={t("tileActing")}
          hint={t("chgHintActing")}
        />
        <Chip
          {...shared}
          id="vacancy"
          pressed={pressed === "vacancy"}
          dimmed={pressed !== null && pressed !== "vacancy"}
          tipAlign="right-0 sm:left-0 sm:right-auto"
          value={vacantSeats === null ? "-" : <LocalCount value={vacantSeats} />}
          label={vacantSeats === null ? t("statVacantUnknownSub") : t(vacantSeats === 1 ? "tileVacancyOne" : "tileVacancies")}
          hint={t("chgHintVacancy")}
        />
      </ul>
    </div>
  );
}
