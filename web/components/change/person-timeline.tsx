import type { ReactNode } from "react";
import { PersonPortrait } from "@/components/entity/person-portrait";
import { EntityPeekLink } from "@/components/peek/entity-peek-link";
import { T } from "@/components/i18n/t";
import { CHANGE_KIND_KEY, CHANGE_LABEL_TONE, ChangeKindGlyph } from "./change-glyph";
import { DayLabel, LocalDate } from "./local-date";
import { PersonRail, type PersonRailItem } from "./person-rail";
import { QuietSource } from "./quiet-source";
import { TemplateT } from "./template-t";
import {
  changeDisplayKind,
  titleNamesBody,
  vacancySeatCounts,
  type ChangeDisplayKind,
  type PersonChangeGroup,
} from "@/lib/changes";
import {
  getOrganizationById,
  getPersonById,
  getPositionById,
  getSourceById,
  getTenuresForPerson,
} from "@/lib/data";
import type { Change, Person } from "@/lib/types";

const SENTENCE_KEY: Partial<Record<ChangeDisplayKind, string>> = {
  appointment: "peopleAppointed",
  acting: "peopleActing",
  departure: "peopleDeparted",
};

/** How a change reads for one person: the one who came in, or the one who went out. */
export function roleFor(change: Change, personId: string | null): ChangeDisplayKind {
  if (personId !== null && change.out?.person === personId && change.in?.person !== personId) return "departure";
  return changeDisplayKind(change);
}

/** "{position} bij {body}" slots for a change; null when the position record is missing. */
function positionSlots(change: Change): Record<string, ReactNode> | null {
  const position = change.position !== null ? getPositionById(change.position) : undefined;
  if (!position) return null;
  const organization = change.organization !== null ? getOrganizationById(change.organization) : undefined;
  const slots: Record<string, ReactNode> = { position: <EntityPeekLink id={position.id} /> };
  if (organization && !titleNamesBody(position.title, organization.name)) {
    slots.body = <EntityPeekLink id={organization.id} />;
  }
  return slots;
}

/**
 * One event, without the person's name (the card header has it). A change
 * whose records cannot be resolved reads as its Dutch summary.
 */
function eventSentence(change: Change, role: ChangeDisplayKind): ReactNode {
  const key = SENTENCE_KEY[role];
  const slots = key !== undefined ? positionSlots(change) : null;
  if (key !== undefined && slots !== null) {
    return <TemplateT k={"body" in slots ? key : `${key}NoBody`} slots={slots} />;
  }
  if (role === "vacancy") return <T area="home" k="peopleVacantEvent" />;
  return <span lang="nl">{change.summary}</span>;
}

function EventRow({ change, personId }: { change: Change; personId: string | null }) {
  const role = roleFor(change, personId);
  const source = getSourceById(change.source.source);
  const counts = role === "vacancy" ? vacancySeatCounts(change) : null;
  return (
    <div className="min-w-0">
      <p className="text-sm leading-snug text-ink [overflow-wrap:anywhere]">{eventSentence(change, role)}</p>
      <p className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-ink-faint">
        <span className={`font-semibold ${CHANGE_LABEL_TONE[role]}`}>
          <T area="home" k={CHANGE_KIND_KEY[role]} />
        </span>
        <span className="tabular-nums">
          <LocalDate iso={change.date} style="short" />
        </span>
        {counts !== null && counts.seats >= 2 ? (
          <span>
            <T area="home" k="changeSeatsFilled" vars={{ filled: counts.filled, seats: counts.seats }} />
          </span>
        ) : null}
        {source ? (
          <QuietSource href={source.url} publisher={source.publisher} retrieved={change.source.retrieved} />
        ) : null}
      </p>
    </div>
  );
}

/** What a person holds now, from their open tenures; empty when none is on record. */
function CurrentPositions({ person }: { person: Person }) {
  const open = getTenuresForPerson(person.id).filter((tenure) => tenure.end === null);
  const shown = open.slice(0, 2).flatMap((tenure) => {
    const position = getPositionById(tenure.position);
    if (!position) return [];
    const organization = getOrganizationById(position.organization);
    const slots: Record<string, ReactNode> = { position: <EntityPeekLink id={position.id} /> };
    const body =
      organization && !titleNamesBody(position.title, organization.name) ? (
        <>
          {" "}
          <span aria-hidden="true" className="text-ink-faint">·</span> <EntityPeekLink id={organization.id} variant="quiet" />
        </>
      ) : null;
    return [{ id: tenure.id, slots, body }];
  });
  if (shown.length === 0) return null;
  return (
    <>
      {shown.map((item) => (
        <p key={item.id} className="mt-0.5 text-sm leading-snug text-ink-muted [overflow-wrap:anywhere]">
          <TemplateT k="peopleNow" slots={item.slots} />
          {item.body}
        </p>
      ))}
    </>
  );
}

function VacantRing({ size = 40 }: { size?: number }) {
  return (
    <span
      aria-hidden="true"
      className="flex shrink-0 items-center justify-center rounded-pill border border-dashed border-line-strong"
      style={{ width: size, height: size }}
    >
      <ChangeKindGlyph kind="vacancy" size={16} />
    </span>
  );
}

/** The body a seat belongs to, quietly, when the title does not already name it. */
function SeatBody({ positionId }: { positionId: string }) {
  const position = getPositionById(positionId);
  const organization = position ? getOrganizationById(position.organization) : undefined;
  if (!position || !organization || titleNamesBody(position.title, organization.name)) return null;
  return (
    <p className="mt-0.5 text-sm leading-snug text-ink-muted [overflow-wrap:anywhere]">
      <EntityPeekLink id={organization.id} variant="quiet" />
    </p>
  );
}

/**
 * The status of a seat, read from the changes themselves: the date of the
 * earliest vacancy record shown ("recorded", since a record carries no start
 * date and the seat may have been vacant before it), and filled only when
 * `filler` (a later appointment to the same position in the data) says so.
 */
function SeatStatus({ group, filler }: { group: PersonChangeGroup; filler: Change | null }) {
  const vacancies = group.events.filter((event) => event.kind === "vacancy");
  if (vacancies.length === 0) return null;
  const since = vacancies[vacancies.length - 1].date;
  const fillerPerson = filler?.in?.person ? getPersonById(filler.in.person) : undefined;
  const counts = vacancySeatCounts(vacancies[0]);
  return (
    <div className="mt-3 space-y-0.5 rounded-sm bg-surface-inset px-3 py-2 text-sm leading-snug text-ink-muted">
      <p className="font-medium text-ink">
        <TemplateT k="peopleVacantSince" slots={{ date: <LocalDate iso={since} style="long" /> }} />
      </p>
      {filler && fillerPerson ? (
        <p>
          <TemplateT
            k={counts !== null && counts.vacant > 1 ? "peopleFilledOne" : "peopleFilledBy"}
            slots={{
              person: <EntityPeekLink id={fillerPerson.id} variant="plain" className="font-medium" />,
              date: <LocalDate iso={filler.date} style="long" />,
            }}
          />
        </p>
      ) : null}
    </div>
  );
}

/**
 * One card per person (or per seat) with a rail of their changes: kind glyph,
 * a short sentence with peek links, the date and a quiet source. Three events
 * show; the rest sit behind "show more". A seat group says "vacant since" and
 * "filled by" only when the data shows it. Built from Change records alone.
 */
export function PersonTimeline({
  group,
  reference,
  filler = null,
}: {
  group: PersonChangeGroup;
  reference: string;
  /** A later appointment to this seat's position, found in the data; null when none. */
  filler?: Change | null;
}) {
  const person = group.personId !== null ? getPersonById(group.personId) : undefined;
  const position = group.positionId !== null ? getPositionById(group.positionId) : undefined;
  const latest = group.events[0];
  const items: PersonRailItem[] = group.events.map((change) => ({
    id: change.id,
    mark: <ChangeKindGlyph kind={roleFor(change, group.personId)} />,
    node: <EventRow change={change} personId={group.personId} />,
  }));
  const name = person?.name ?? position?.title ?? "";
  return (
    <article className="min-w-0 rounded-md border border-line bg-surface p-4">
      <div className="flex min-w-0 items-start gap-3">
        {person ? <PersonPortrait person={person} size={40} /> : <VacantRing />}
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold leading-snug text-ink [overflow-wrap:anywhere]">
            {person ? (
              <EntityPeekLink id={person.id} variant="plain" />
            ) : position ? (
              <EntityPeekLink id={position.id} variant="plain" />
            ) : group.positionId === null ? (
              <T area="home" k="peopleUnlinked" />
            ) : (
              <span lang="nl">{latest.summary}</span>
            )}
          </h3>
          {person ? <CurrentPositions person={person} /> : null}
          {!person && position ? <SeatBody positionId={position.id} /> : null}
          <p className="mt-0.5 text-xs text-ink-faint">
            <TemplateT k="peopleLatest" slots={{ day: <DayLabel date={latest.date} reference={reference} /> }} />
          </p>
        </div>
      </div>
      <SeatStatus group={group} filler={filler} />
      <PersonRail items={items} labelKey={person ? "peopleEventsAria" : "peopleSeatEventsAria"} labelName={name} />
    </article>
  );
}
