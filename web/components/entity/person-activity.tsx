"use client";

import Link from "next/link";
import { useId, useState, type ReactNode } from "react";
import { Avatar } from "@/components/avatar";
import { LocalDate } from "@/components/content/local-date";
import { L } from "@/components/i18n/t";
import { useLocale } from "@/components/i18n/language-provider";
import { PartyPill } from "@/components/party-pill";
import { formatCountIn } from "@/lib/format";
import type { ActivityGroupView, ActivityPersonView, ActivityRowView, PersonActivityView } from "@/lib/activities";
import type { ActivityKind, ActivityOutcome } from "@/lib/types";

/** Rows shown per kind before the disclosure. */
const INITIAL_ROWS = 8;
/** Co-submitters shown per row; the rest are counted. */
const CO_SUBMITTERS_SHOWN = 3;

const KIND_LABEL: Record<ActivityKind, { nl: string; en: string }> = {
  motie: { nl: "Moties", en: "Motions" },
  amendement: { nl: "Amendementen", en: "Amendments" },
  initiatiefwetsvoorstel: { nl: "Initiatiefwetsvoorstellen", en: "Private member's bills" },
  wetsvoorstel: { nl: "Wetsvoorstellen", en: "Bills" },
  "schriftelijke-vragen": { nl: "Schriftelijke vragen", en: "Written questions" },
};

const KIND_SINGULAR: Record<ActivityKind, { nl: string; en: string }> = {
  motie: { nl: "Motie", en: "Motion" },
  amendement: { nl: "Amendement", en: "Amendment" },
  initiatiefwetsvoorstel: { nl: "Initiatiefwetsvoorstel", en: "Private member's bill" },
  wetsvoorstel: { nl: "Wetsvoorstel", en: "Bill" },
  "schriftelijke-vragen": { nl: "Schriftelijke vragen", en: "Written questions" },
};

const KIND_COLOR: Record<ActivityKind, string> = {
  motie: "var(--t-color-sector-regering)",
  amendement: "var(--t-color-sector-hoge-colleges)",
  initiatiefwetsvoorstel: "var(--t-color-sector-decentraal-provinciaal)",
  wetsvoorstel: "var(--t-color-sector-decentraal-lokaal)",
  "schriftelijke-vragen": "var(--t-color-sector-zelfstandig)",
};

const OUTCOME_LABEL: Record<ActivityOutcome, { nl: string; en: string }> = {
  aangenomen: { nl: "aangenomen", en: "adopted" },
  verworpen: { nl: "verworpen", en: "rejected" },
  aangehouden: { nl: "aangehouden", en: "held over" },
  ingetrokken: { nl: "ingetrokken", en: "withdrawn" },
  vervallen: { nl: "vervallen", en: "lapsed" },
};

const OUTCOME_COLOR: Partial<Record<ActivityOutcome, string>> = {
  aangenomen: "var(--t-color-sector-adviescolleges)",
  verworpen: "var(--t-color-sector-staten-generaal)",
};

const TOUCH = "pointer-coarse:min-h-11";
/** A 44 px hit area around a small pill without changing the layout. */
const HIT_AREA = "relative after:absolute after:inset-x-0 after:-inset-y-3.5 after:content-['']";

/** An outside link with the ↗ arrow, 44 px tall on touch screens. */
function OutLink({ href, children, className = "" }: { href: string; children: ReactNode; className?: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`tap-row inline-flex items-center gap-1 underline-offset-2 hover:text-accent-text hover:underline ${className}`.trim()}
    >
      <span>{children}</span>
      <svg aria-hidden="true" viewBox="0 0 20 20" width="12" height="12" className="shrink-0">
        <path d="M6 14 14 6M8 6h6v6" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className="sr-only">
        <L nl="(opent in een nieuw tabblad)" en="(opens in a new tab)" />
      </span>
    </a>
  );
}

function KindMark({ kind }: { kind: ActivityKind }) {
  return (
    <span
      aria-hidden="true"
      className="inline-block h-2.5 w-2.5 shrink-0 rounded-[3px]"
      style={{ backgroundColor: KIND_COLOR[kind] }}
    />
  );
}

function CoSubmitter({ entry }: { entry: ActivityPersonView }) {
  const face = <Avatar name={entry.name} url={entry.portrait} color={entry.color} size={20} />;
  return (
    <li className="tap-row flex min-w-0 max-w-full items-center gap-1.5">
      {entry.href !== null ? (
        <Link
          href={entry.href}
          className={`inline-flex min-w-0 items-center gap-1.5 text-ink-muted underline-offset-2 hover:text-ink hover:underline ${TOUCH}`}
        >
          {face}
          <span className="truncate">{entry.name}</span>
        </Link>
      ) : (
        <span className="inline-flex min-w-0 items-center gap-1.5 text-ink-muted">
          {face}
          <span className="truncate">{entry.name}</span>
        </span>
      )}
      {entry.party !== null ? <PartyPill party={entry.party} className={`shrink-0 ${HIT_AREA}`} /> : null}
    </li>
  );
}

function ActivityRow({ row }: { row: ActivityRowView }) {
  const locale = useLocale();
  const shown = row.coSubmitters.slice(0, CO_SUBMITTERS_SHOWN);
  const rest = row.coSubmitters.slice(CO_SUBMITTERS_SHOWN);
  const outcomeColor = row.outcome !== null ? OUTCOME_COLOR[row.outcome] : undefined;
  return (
    <li className="border-t border-line py-3 first:border-t-0 first:pt-0">
      <div className="flex items-start gap-2.5">
        <span className="mt-[0.4rem]">
          <KindMark kind={row.kind} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm leading-snug text-ink break-words">
            <span className="sr-only">
              <L nl={`${KIND_SINGULAR[row.kind].nl}: `} en={`${KIND_SINGULAR[row.kind].en}: `} />
            </span>
            {row.title}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-ink-faint">
            <LocalDate iso={row.date} short />
            {row.kamerstuk !== null ? (
              <span>
                <L nl="Kamerstuk" en="Parliamentary paper" /> {row.kamerstuk}
              </span>
            ) : null}
            {row.role === "medeindiener" ? (
              <span>
                <L nl="medeindiener" en="co-submitter" />
              </span>
            ) : null}
            {row.outcome !== null ? (
              <span className="font-medium" style={outcomeColor !== undefined ? { color: outcomeColor } : undefined}>
                <L nl={OUTCOME_LABEL[row.outcome].nl} en={OUTCOME_LABEL[row.outcome].en} />
              </span>
            ) : null}
            <OutLink href={row.url}>
              {row.url.startsWith("https://www.tweedekamer.nl/") ? "tweedekamer.nl" : (
                <L nl="Gegevensmagazijn" en="Open data record" />
              )}
            </OutLink>
          </div>
          {shown.length > 0 ? (
            <ul className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs pointer-coarse:mt-0 pointer-coarse:gap-y-0">
              {shown.map((entry) => (
                <CoSubmitter key={entry.key} entry={entry} />
              ))}
              {rest.length > 0 ? (
                <li className="text-ink-faint" title={rest.map((entry) => entry.name).join(", ")}>
                  +{formatCountIn(rest.length, locale)}
                  <span className="sr-only">: {rest.map((entry) => entry.name).join(", ")}</span>
                </li>
              ) : null}
            </ul>
          ) : null}
        </div>
      </div>
    </li>
  );
}

function ActivityGroup({ group }: { group: ActivityGroupView }) {
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const listId = useId();
  const headingId = useId();
  const rows = open ? group.items : group.items.slice(0, INITIAL_ROWS);
  const capped = group.items.length < group.total;
  return (
    <section aria-labelledby={headingId} className="rounded-md border border-line bg-surface p-4">
      <h3 id={headingId} className="flex items-center gap-2 text-sm font-semibold tracking-tight text-ink">
        <KindMark kind={group.kind} />
        <L nl={KIND_LABEL[group.kind].nl} en={KIND_LABEL[group.kind].en} />
        <span className="ms-auto text-xs font-normal tabular-nums text-ink-faint">
          {group.items.length === 0 ? (
            <L
              nl={`${formatCountIn(group.total, "nl")}, geen bij de recentste`}
              en={`${formatCountIn(group.total, "en")}, none among the most recent`}
            />
          ) : capped ? (
            <L
              nl={`${formatCountIn(group.items.length, "nl")} recentste van ${formatCountIn(group.total, "nl")}`}
              en={`${formatCountIn(group.items.length, "en")} most recent of ${formatCountIn(group.total, "en")}`}
            />
          ) : (
            formatCountIn(group.total, locale)
          )}
        </span>
      </h3>
      {rows.length > 0 ? (
        <ul id={listId} className="mt-3">
          {rows.map((row) => (
            <ActivityRow key={row.id} row={row} />
          ))}
        </ul>
      ) : null}
      {group.items.length > INITIAL_ROWS ? (
        <button
          type="button"
          aria-expanded={open}
          aria-controls={listId}
          onClick={() => setOpen((value) => !value)}
          className="mt-2 inline-flex min-h-11 items-center rounded-sm text-sm font-medium text-accent-text underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        >
          {open ? (
            <L nl="Toon minder" en="Show fewer" />
          ) : (
            <L
              nl={`Toon alle (${formatCountIn(group.items.length, "nl")})`}
              en={`Show all (${formatCountIn(group.items.length, "en")})`}
            />
          )}
        </button>
      ) : null}
    </section>
  );
}

/**
 * Proposals, motions and written questions a person submitted or co-submitted
 * in the Tweede Kamer, grouped by kind, from data/activities.json.
 */
export function PersonActivity({ view }: { view: PersonActivityView }) {
  const locale = useLocale();
  const total = view.groups.reduce((sum, group) => sum + group.total, 0);
  return (
    <div>
      <h2 id="voorstellen-paneel-titel" className="text-base font-semibold tracking-tight text-ink">
        <L nl="Voorstellen en moties" en="Proposals and motions" />
      </h2>
      <p className="mt-1 text-xs text-ink-faint">
        {total > 0 ? (
          <>
            {formatCountIn(total, locale)} <L nl="sinds" en="since" /> <LocalDate iso={view.since} />
          </>
        ) : (
          <>
            <L
              nl="Geen moties, amendementen, wetsvoorstellen of schriftelijke vragen sinds"
              en="No motions, amendments, bills or written questions since"
            />{" "}
            <LocalDate iso={view.since} />
          </>
        )}
      </p>
      {view.groups.length > 0 ? (
        <div className="mt-3 space-y-3">
          {view.groups.map((group) => (
            <ActivityGroup key={group.kind} group={group} />
          ))}
        </div>
      ) : null}
      {view.source !== null ? (
        <p className="mt-3 text-xs text-ink-faint">
          <L nl="Bron:" en="Source:" />{" "}
          <OutLink href={view.source.url}>
            <L nl="Gegevensmagazijn van de Tweede Kamer" en="Tweede Kamer open data" />
          </OutLink>{" "}
          <span>
            {view.source.publisher}, CC0 1.0, <LocalDate iso={view.source.retrieved} />
          </span>
        </p>
      ) : null}
    </div>
  );
}
