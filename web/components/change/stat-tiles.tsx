"use client";

import Link from "next/link";
import { useId } from "react";
import type { ReactNode } from "react";
import { LocalCount } from "@/components/content/local-date";
import { T } from "@/components/i18n/t";
import { useT } from "@/components/i18n/use-t";
import { ChangeKindGlyph } from "./change-glyph";
import { LocalDate } from "./local-date";
import { TemplateT } from "./template-t";

export type ChangeTileFigures = {
  /** Null when the dataset has no vacancy data yet. */
  vacantSeats: number | null;
  actingOfficials: number;
  lastChangeDate: string | null;
  /** Days between the last change and the reference day. */
  lastChangeAge: number | null;
  appointments: { count: number; days: number; since: string; until: string };
};

export type ChipId = "vacancy" | "acting" | "last" | "appointment";

/** Where each chip goes on the home page, where it links to the changes page. */
const CHIP_HREF: Record<ChipId, string> = {
  vacancy: "/wijzigingen/?kind=vacancy",
  acting: "/wijzigingen/?kind=acting",
  last: "/wijzigingen/",
  appointment: "/wijzigingen/?kind=appointment",
};

function ClockIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" width="14" height="14" className="block text-ink-muted">
      <circle cx="8" cy="8" r="6.2" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 4.6V8l2.3 1.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

type ChipProps = {
  id: ChipId;
  icon: ReactNode;
  value: ReactNode;
  label: ReactNode;
  context?: ReactNode;
  /** What the chip counts, shown on hover, focus and tap, and read as its description. */
  hint: ReactNode;
  /** Where the hint sits so it stays inside a narrow column. */
  tipAlign: string;
  mode: "link" | "control";
  pressed: boolean;
  onSelect?: (id: ChipId) => void;
};

const CHIP =
  "flex min-h-11 w-full min-w-0 items-center gap-2 rounded-md border px-3 py-1.5 text-left transition-fast focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus";

function Chip({ id, icon, value, label, context, hint, tipAlign, mode, pressed, onSelect }: ChipProps) {
  const tipId = useId();
  const body = (
    <>
      <span aria-hidden="true" className="inline-flex h-5 w-5 shrink-0 items-center justify-center [--color-canvas:var(--t-color-surface)]">
        {icon}
      </span>
      {context ? <span className="sr-only">{context} </span> : null}
      <span className="min-w-0 text-xs leading-tight text-ink-muted">
        <span className="mr-1 text-base font-semibold tabular-nums tracking-tight text-ink">{value}</span>
        {label}
      </span>
    </>
  );
  const tone = pressed
    ? "border-accent/40 bg-accent-soft"
    : "border-line bg-surface hover:border-line-strong";
  return (
    <li className="group relative min-w-0">
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
 * The change figures as one slim row of four chips: icon, number, short
 * label. Each chip is a link to the changes page (home) or a button that
 * sets the explorer's filter (`mode="control"`, on /wijzigingen/). What a
 * figure counts shows as a tooltip on hover, keyboard focus and tap. Two chips
 * a row in a narrow column, four from about 40rem of container width.
 */
export function ChangeStatTiles({
  figures,
  className = "",
  mode = "link",
  pressed = null,
  onSelect,
}: {
  figures: ChangeTileFigures;
  className?: string;
  mode?: "link" | "control";
  pressed?: ChipId | null;
  onSelect?: (id: ChipId) => void;
}) {
  const t = useT("home");
  const { vacantSeats, actingOfficials, lastChangeDate, lastChangeAge: age, appointments } = figures;
  const shared = { mode, onSelect } as const;
  return (
    <div className={`@container ${className}`.trim()}>
      <ul aria-label={t("keyFigures")} className="grid grid-cols-2 gap-2 @[40rem]:grid-cols-4">
        <Chip
          {...shared}
          id="vacancy"
          pressed={pressed === "vacancy"}
          tipAlign="left-0"
          icon={<ChangeKindGlyph kind="vacancy" size={15} />}
          value={vacantSeats === null ? "-" : <LocalCount value={vacantSeats} />}
          label={<T area="home" k={vacantSeats === 1 ? "tileVacancyOne" : "tileVacancies"} />}
          hint={<T area="home" k={vacantSeats === null ? "statVacantUnknownSub" : "detailVacancy"} />}
        />
        <Chip
          {...shared}
          id="acting"
          pressed={pressed === "acting"}
          tipAlign="right-0 @[40rem]:left-0"
          icon={<ChangeKindGlyph kind="acting" size={15} />}
          value={<LocalCount value={actingOfficials} />}
          label={<T area="home" k="tileActing" />}
          hint={<T area="home" k="detailActing" />}
        />
        <Chip
          {...shared}
          id="last"
          pressed={false}
          tipAlign="left-0 @[40rem]:right-0"
          icon={<ClockIcon />}
          context={<T area="home" k="statLastChangeLabel" />}
          value={age === null ? "-" : age === 0 ? <T area="home" k="dayToday" /> : <LocalCount value={age} />}
          label={
            age === null ? (
              <T area="home" k="statLastChangeNone" />
            ) : age === 0 ? (
              <T area="home" k="tileLastChange" />
            ) : (
              <T area="home" k={age === 1 ? "tileDayAgo" : "tileDaysAgo"} />
            )
          }
          hint={
            lastChangeDate ? (
              <TemplateT k="detailLastChange" slots={{ date: <LocalDate iso={lastChangeDate} /> }} />
            ) : (
              <T area="home" k="statLastChangeNone" />
            )
          }
        />
        <Chip
          {...shared}
          id="appointment"
          pressed={pressed === "appointment"}
          tipAlign="right-0"
          icon={<ChangeKindGlyph kind="appointment" size={15} />}
          value={<LocalCount value={appointments.count} />}
          label={
            <T
              area="home"
              k={appointments.count === 1 ? "tileAppointmentOne" : "tileAppointments"}
              vars={{ days: appointments.days }}
            />
          }
          hint={
            <TemplateT
              k="detailAppointments"
              slots={{
                start: <LocalDate iso={appointments.since} />,
                end: <LocalDate iso={appointments.until} />,
              }}
            />
          }
        />
      </ul>
    </div>
  );
}
