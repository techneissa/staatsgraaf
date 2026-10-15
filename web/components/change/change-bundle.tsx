import { PersonPortrait } from "../entity/person-portrait";
import { EntityPeekLink } from "../peek/entity-peek-link";
import { T } from "@/components/i18n/t";
import { getOrganizationById, getPersonById, getPositionById, getSourceById } from "@/lib/data";
import { titleNamesBody, type FeedEntry } from "@/lib/changes";
import type { Change } from "@/lib/types";
import { KindSourceLabel } from "./kind-source-label";
import { QuietSource } from "./quiet-source";

function isCommittee(change: Change): boolean {
  const title = change.position !== null ? getPositionById(change.position)?.title : undefined;
  return title !== undefined && /commissie/i.test(title);
}

/** "Lid van 6 commissies" when every change is a committee seat, otherwise the plain count of the role. */
function bundleKey(entry: FeedEntry): string {
  if (entry.displayKind === "appointment") {
    return entry.changes.every(isCommittee) ? "chgBundleCommittees" : "chgBundleAppointed";
  }
  return entry.displayKind === "acting" ? "chgBundleActing" : "chgBundleDeparted";
}

/** One underlying change of a bundle: the position, its body when the title does not name it, and the source. */
function BundleRow({ change, showSource }: { change: Change; showSource: boolean }) {
  const position = change.position !== null ? getPositionById(change.position) : undefined;
  const organization = change.organization !== null ? getOrganizationById(change.organization) : undefined;
  const source = getSourceById(change.source.source);
  return (
    <li className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 text-sm leading-snug text-ink [overflow-wrap:anywhere]">
      {position ? <EntityPeekLink id={position.id} /> : <span lang="nl">{change.summary}</span>}
      {position && organization && !titleNamesBody(position.title, organization.name) ? (
        <span className="text-ink-muted">
          <EntityPeekLink id={organization.id} variant="quiet" />
        </span>
      ) : null}
      {showSource && source ? (
        <QuietSource href={source.url} publisher={source.publisher} retrieved={change.source.retrieved} variant="text" />
      ) : null}
    </li>
  );
}

/**
 * Several changes of one person on one day in the same role, as one entry:
 * "Lid van 6 commissies". The line reads like a single change; the changes
 * themselves, each with its own source, sit behind a native disclosure.
 */
export function ChangeBundle({ entry, compact = false }: { entry: FeedEntry; compact?: boolean }) {
  const person = entry.personId !== null ? getPersonById(entry.personId) : undefined;
  const kind = entry.displayKind;
  const n = entry.changes.length;
  const sources = new Set(entry.changes.map((change) => change.source.source));
  const shared = sources.size === 1 ? getSourceById(entry.changes[0].source.source) : undefined;
  const size = compact ? 32 : 36;
  return (
    <article className="flex min-w-0 gap-3">
      {person ? (
        <PersonPortrait person={person} size={size} className="mt-0.5" peek />
      ) : (
        <span aria-hidden="true" className="mt-0.5 shrink-0 rounded-pill border border-dashed border-line-strong" style={{ width: size, height: size }} />
      )}
      <div className="min-w-0 flex-1">
        <p>
          <KindSourceLabel
            kind={kind}
            href={shared?.url}
            publisher={shared?.publisher}
            retrieved={entry.changes[0].source.retrieved}
          />
        </p>
        <p className="mt-0.5 text-sm leading-snug text-ink [overflow-wrap:anywhere]">
          {person ? <EntityPeekLink id={person.id} variant="plain" className="font-medium" /> : null}
        </p>
        <p className="mt-0.5 text-sm leading-snug text-ink-muted">
          <T area="home" k={bundleKey(entry)} vars={{ n }} />
        </p>
        <details className="group mt-1">
          <summary className="inline-flex min-h-8 cursor-pointer list-none items-center gap-1.5 rounded-sm text-sm font-medium text-accent-text underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus pointer-coarse:min-h-11 [&::-webkit-details-marker]:hidden">
            <svg aria-hidden="true" viewBox="0 0 16 16" width="12" height="12" className="shrink-0 transition-transform group-open:rotate-90">
              <path d="M6 3.5 10.5 8 6 12.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="group-open:hidden">
              <T area="home" k="chgBundleShow" vars={{ n }} />
            </span>
            <span className="hidden group-open:inline">
              <T area="home" k="chgBundleHide" />
            </span>
          </summary>
          <ul className="mt-1 space-y-1.5 border-l border-line pb-1 pl-3">
            {entry.changes.map((change) => (
              <BundleRow key={change.id} change={change} showSource={sources.size !== 1} />
            ))}
          </ul>
        </details>
      </div>
    </article>
  );
}
