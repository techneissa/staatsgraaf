import type { ReactNode } from "react";
import { T } from "@/components/i18n/t";
import { formatCount } from "@/lib/format";
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

function ClockIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" width="15" height="15" className="block text-ink-muted">
      <circle cx="8" cy="8" r="6.2" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 4.6V8l2.3 1.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Tile({ icon, value, label, context }: { icon: ReactNode; value: ReactNode; label: ReactNode; context?: ReactNode }) {
  return (
    <li className="flex min-w-0 items-center gap-3 rounded-md border border-line bg-surface px-3 py-2.5">
      <span
        aria-hidden="true"
        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-sm bg-surface-inset [--color-canvas:var(--t-color-surface-inset)]"
      >
        {icon}
      </span>
      <p className="min-w-0 leading-tight">
        {context ? <span className="sr-only">{context} </span> : null}
        <span className="block whitespace-nowrap text-2xl font-semibold tabular-nums tracking-tight text-ink">{value}</span>
        <span className="mt-0.5 block text-xs leading-snug text-ink-muted">{label}</span>
      </p>
    </li>
  );
}

/**
 * The change figures as four compact tiles: an icon, the number, a short
 * label. The dates and what each figure counts sit in one details row under
 * the tiles. Two tiles a row in a narrow column, four side by side from
 * about 40rem of container width.
 */
export function ChangeStatTiles({ figures, className = "" }: { figures: ChangeTileFigures; className?: string }) {
  const { vacantSeats, actingOfficials, lastChangeDate, lastChangeAge, appointments } = figures;
  const age = lastChangeAge;
  return (
    <div className={`@container ${className}`.trim()}>
      <ul className="grid grid-cols-2 gap-2 @[40rem]:grid-cols-4">
        <Tile
          icon={<ChangeKindGlyph kind="vacancy" size={16} />}
          value={vacantSeats === null ? "-" : formatCount(vacantSeats)}
          label={<T area="home" k={vacantSeats === 1 ? "tileVacancyOne" : "tileVacancies"} />}
        />
        <Tile
          icon={<ChangeKindGlyph kind="acting" size={16} />}
          value={formatCount(actingOfficials)}
          label={<T area="home" k="tileActing" />}
        />
        <Tile
          icon={<ClockIcon />}
          context={<T area="home" k="statLastChangeLabel" />}
          value={age === null ? "-" : age === 0 ? <T area="home" k="dayToday" /> : formatCount(age)}
          label={
            age === null ? (
              <T area="home" k="statLastChangeNone" />
            ) : age === 0 ? (
              <T area="home" k="tileLastChange" />
            ) : (
              <T area="home" k={age === 1 ? "tileDayAgo" : "tileDaysAgo"} />
            )
          }
        />
        <Tile
          icon={<ChangeKindGlyph kind="appointment" size={16} />}
          value={formatCount(appointments.count)}
          label={
            <T
              area="home"
              k={appointments.count === 1 ? "tileAppointmentOne" : "tileAppointments"}
              vars={{ days: appointments.days }}
            />
          }
        />
      </ul>

      <details className="group motion-disclosure mt-1.5 text-xs text-ink-muted">
        <summary className="inline-flex min-h-8 cursor-pointer list-none items-center gap-1 rounded-sm text-ink-faint transition-fast hover:text-ink pointer-coarse:min-h-11 [&::-webkit-details-marker]:hidden">
          <svg aria-hidden="true" viewBox="0 0 12 12" width="10" height="10" className="transition-fast group-open:rotate-90">
            <path d="M4.5 2.5 8 6l-3.5 3.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <T area="home" k="tileDetails" />
        </summary>
        <ul className="mt-1 space-y-1 pb-1 leading-snug">
          <li>
            <T area="home" k={vacantSeats === null ? "statVacantUnknownSub" : "detailVacancy"} />
          </li>
          <li>
            <T area="home" k="detailActing" />
          </li>
          {lastChangeDate ? (
            <li>
              <TemplateT k="detailLastChange" slots={{ date: <LocalDate iso={lastChangeDate} /> }} />
            </li>
          ) : null}
          <li>
            <TemplateT
              k="detailAppointments"
              slots={{
                start: <LocalDate iso={appointments.since} />,
                end: <LocalDate iso={appointments.until} />,
              }}
            />
          </li>
        </ul>
      </details>
    </div>
  );
}
