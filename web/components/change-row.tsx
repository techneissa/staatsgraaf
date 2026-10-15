import type { ReactNode } from "react";
import { PersonPortrait } from "./entity/person-portrait";
import { EntityPeekLink } from "./peek/entity-peek-link";
import { T } from "@/components/i18n/t";
import { ChangeKindGlyph } from "@/components/change/change-glyph";
import { KindSourceLabel } from "@/components/change/kind-source-label";
import { TemplateT } from "@/components/change/template-t";
import { changeDisplayKind, titleNamesBody, vacancySeatCounts, type ChangeDisplayKind } from "@/lib/changes";
import { DateT } from "@/components/content/local-date";
import { getOrganizationById, getPersonById, getPositionById, getSourceById } from "@/lib/data";
import type { Change, Person } from "@/lib/types";

/** The mark a change hangs on the rail: its kind glyph. */
export function ChangeMark({ change }: { change: Change }) {
  return <ChangeKindGlyph kind={changeDisplayKind(change)} />;
}

const SENTENCE_KEY: Partial<Record<ChangeDisplayKind, string>> = {
  appointment: "changeAppointed",
  acting: "changeActing",
  departure: "changeDeparted",
  vacancy: "changeVacant",
};

/** The person a change is about: the new holder, or the one who left. */
function subjectPerson(change: Change, kind: ChangeDisplayKind): Person | undefined {
  const id = kind === "departure" ? change.out?.person : kind === "vacancy" ? null : change.in?.person;
  return id ? getPersonById(id) : undefined;
}

/**
 * "{person} werd {position} bij {body}" built from the structured change, with
 * peek links. Returns null when the structure is missing, so the caller falls
 * back to the Dutch summary.
 */
function buildSentence(change: Change, kind: ChangeDisplayKind, person: Person | undefined): ReactNode | null {
  const key = SENTENCE_KEY[kind];
  if (key === undefined) return null;
  const position = change.position !== null ? getPositionById(change.position) : undefined;
  if (!position) return null;
  if (kind !== "vacancy" && !person) return null;
  const organization = change.organization !== null ? getOrganizationById(change.organization) : undefined;
  const showBody = organization !== undefined && !titleNamesBody(position.title, organization.name);
  const slots: Record<string, ReactNode> = {
    position: <EntityPeekLink id={position.id} />,
  };
  if (person) slots.person = <EntityPeekLink id={person.id} variant="plain" className="font-medium" />;
  if (showBody) slots.body = <EntityPeekLink id={organization.id} />;
  return <TemplateT k={showBody ? key : `${key}NoBody`} slots={slots} />;
}

/**
 * OUT -> IN: two people. A vacancy has no people; its sentence already says a
 * seat is vacant, so it shows only how many seats are filled, built from the
 * counts of the record in the reader's language.
 */
function BeforeAfter({ change, kind }: { change: Change; kind: ChangeDisplayKind }) {
  if (kind === "vacancy") {
    const counts = vacancySeatCounts(change);
    if (counts === null || counts.seats < 2) return null;
    return (
      <p className="mt-1 text-xs leading-relaxed text-ink-muted">
        <DateT area="home" k="changeSeatsFilled" counts={{ filled: counts.filled, seats: counts.seats }} />
      </p>
    );
  }
  const out = change.out;
  const into = change.in;
  if (!out || !into) return null;
  if (!(out.person && into.person && out.person !== into.person)) return null;
  const outPerson = getPersonById(out.person);
  const inPerson = getPersonById(into.person);
  if (!outPerson || !inPerson) return null;
  return (
    <p className="mt-1 flex flex-wrap items-baseline gap-x-1.5 text-xs leading-relaxed text-ink-muted">
      <span className="min-w-0">
        <EntityPeekLink id={outPerson.id} variant="quiet" />
      </span>
      <span aria-hidden="true" className="text-ink-faint">
        →
      </span>
      <span className="sr-only">
        <T area="home" k="changeReplacedBy" />
      </span>
      <span className="min-w-0">
        <EntityPeekLink id={inPerson.id} variant="quiet" />
      </span>
    </p>
  );
}

/**
 * One change on the rail: kind label (the source, when there is one),
 * portrait or initials, a one-line sentence with peek links, a before -> after
 * line. Hangs inside a RailItem; the kind glyph is the rail mark (ChangeMark).
 */
export function ChangeRow({ change, compact = false }: { change: Change; compact?: boolean }) {
  const kind = changeDisplayKind(change);
  const person = subjectPerson(change, kind);
  const source = getSourceById(change.source.source);
  const size = compact ? 32 : 36;
  const sentence = buildSentence(change, kind, person);

  return (
    <article className="flex min-w-0 gap-3">
      {person ? (
        <PersonPortrait person={person} size={size} className="mt-0.5" peek />
      ) : (
        <span
          aria-hidden="true"
          className="mt-0.5 shrink-0 rounded-pill border border-dashed border-line-strong"
          style={{ width: size, height: size }}
        />
      )}
      <div className="min-w-0 flex-1">
        <p>
          <KindSourceLabel
            kind={kind}
            href={source?.url}
            publisher={source?.publisher}
            retrieved={change.source.retrieved}
          />
        </p>
        <p className="mt-0.5 text-sm leading-snug text-ink [overflow-wrap:anywhere]">
          {sentence !== null ? sentence : <span lang="nl">{change.summary}</span>}
        </p>
        <BeforeAfter change={change} kind={kind} />
      </div>
    </article>
  );
}
