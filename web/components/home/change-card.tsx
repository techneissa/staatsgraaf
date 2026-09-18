import Link from "next/link";
import { DateStamp } from "@/components/date-stamp";
import { PersonPortrait } from "@/components/entity/person-portrait";
import { SourceLink } from "@/components/source-link";
import { T } from "@/components/i18n/t";
import { getOrganizationById, getPersonById, getPositionById, getSourceById } from "@/lib/data";
import type { Change, ChangeKind, ChangeSide } from "@/lib/types";

/** Token-backed tone per change kind; no hardcoded hexes. */
const KIND_TONE: Record<ChangeKind, { dot: string; text: string }> = {
  appointment: { dot: "bg-accent", text: "text-accent-text" },
  departure: { dot: "bg-sector-staten-generaal", text: "text-sector-staten-generaal" },
  vacancy: { dot: "bg-ink-faint", text: "text-ink-muted" },
  structural: {
    dot: "bg-sector-decentraal-provinciaal",
    text: "text-sector-decentraal-provinciaal",
  },
  "tenure-between": { dot: "bg-sector-hoge-colleges", text: "text-sector-hoge-colleges" },
  rename: { dot: "bg-sector-waterschap", text: "text-sector-waterschap" },
  move: { dot: "bg-sector-waterschap", text: "text-sector-waterschap" },
};

const KIND_KEY: Record<ChangeKind, string> = {
  appointment: "appointed",
  departure: "departure",
  vacancy: "vacancy",
  structural: "structuralChange",
  "tenure-between": "transfer",
  rename: "renameLabel",
  move: "moveLabel",
};

function SideRow({ label, side }: { label: string; side: ChangeSide }) {
  const person = side.person !== null ? getPersonById(side.person) : undefined;
  return (
    <div className="flex items-center gap-2.5">
      <span className="w-8 shrink-0 text-[10px] font-semibold uppercase tracking-wider text-ink-faint">
        <T area="home" k={label} />
      </span>
      {person ? (
        <Link
          href={`/personen/${person.slug}/`}
          className="inline-flex min-w-0 items-center gap-1.5 text-sm text-ink underline-offset-2 transition-fast hover:text-accent-text hover:underline"
        >
          <PersonPortrait person={person} size={20} />
          <span className="truncate">{person.name}</span>
        </Link>
      ) : (
        <span className="min-w-0 truncate text-sm text-ink-muted">{side.label}</span>
      )}
    </div>
  );
}

export function ChangeCard({ change, date }: { change: Change; date?: string }) {
  const position = change.position !== null ? getPositionById(change.position) : undefined;
  const organization =
    change.organization !== null ? getOrganizationById(change.organization) : undefined;
  const source = getSourceById(change.source.source);
  const tone = KIND_TONE[change.kind];

  return (
    <article className="rounded-md border border-line bg-surface-inset p-3 transition-fast hover:border-line-strong">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span
          className={`inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider ${tone.text}`}
        >
          <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-pill ${tone.dot}`} />
          <T area="common" k={KIND_KEY[change.kind]} />
        </span>
        {source ? (
          <SourceLink href={source.url} meta={source.publisher} className="text-xs">
            <time dateTime={change.date}>{date ?? change.date}</time>
          </SourceLink>
        ) : (
          <DateStamp date={change.date} />
        )}
      </div>
      <p className="mt-1.5 text-sm leading-snug text-ink">{change.summary}</p>
      {position ? (
        <p className="mt-1 text-xs text-ink-muted">
          <Link
            href={`/posities/${position.slug}/`}
            className="underline-offset-2 hover:text-ink hover:underline"
          >
            {position.title}
          </Link>
          {organization ? (
            <>
              {" "}
              <span aria-hidden="true">·</span>{" "}
              <Link
                href={`/organisaties/${organization.slug}/`}
                className="underline-offset-2 hover:text-ink hover:underline"
              >
                {organization.name}
              </Link>
            </>
          ) : null}
        </p>
      ) : null}
      <div className="mt-2.5 border-t border-line pt-2.5">
        {change.kind === "vacancy" && change.in ? (
          <SideRow label="seatsLabel" side={change.in} />
        ) : (
          <>
            {change.out ? <SideRow label="outLabel" side={change.out} /> : null}
            {change.in ? <SideRow label="inLabel" side={change.in} /> : null}
          </>
        )}
      </div>
    </article>
  );
}
