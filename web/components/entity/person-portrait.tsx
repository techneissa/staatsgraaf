import { ViewTransition } from "react";
import { Avatar } from "@/components/avatar";
import { getMediaItem, mediaCreditLine, personPortraitId } from "@/lib/entity";
import { partyByDataset } from "@/lib/parties";
import type { Person } from "@/lib/types";

/** The sourced party colour of a person, or null when none is on record. */
export function personColor(person: Person): string | null {
  return partyByDataset(person.party)?.color ?? null;
}

/**
 * A person's portrait from media.json, or an initials disc tinted with the
 * party colour when no licensed portrait is on record. Decorative by default,
 * because it nearly always sits next to the visible name; pass `labelled`
 * where the portrait stands alone (the person page header).
 *
 * With `morph`, the portrait is a shared element between pages: from the
 * people index or the home strip into the person page header it moves and
 * grows instead of being replaced (globals.css, `.sg-morph`). Use it only
 * where the person appears once on the page, since a view transition name
 * must be unique.
 */
export function PersonPortrait({
  person,
  size = 64,
  className = "",
  labelled = false,
  morph = false,
}: {
  person: Person;
  size?: number;
  className?: string;
  labelled?: boolean;
  morph?: boolean;
}) {
  const media = getMediaItem(personPortraitId(person));
  const avatar = (
    <Avatar
      name={person.name}
      url={media?.url ?? null}
      color={personColor(person)}
      size={size}
      labelled={labelled}
      className={className}
      title={media ? mediaCreditLine(media) : undefined}
    />
  );
  if (!morph) return avatar;
  return (
    <ViewTransition name={`portrait-${person.slug}`} share="sg-morph" default="none">
      {avatar}
    </ViewTransition>
  );
}

/**
 * Credit and license for a portrait. The credit is never printed as a line of
 * text under a photo: in lists it is there for screen readers only (the image
 * carries it as a tooltip too), and on a profile it sits behind a small info
 * button next to the photo. CC BY and CC BY-SA require the attribution to be
 * reachable from the work, which both forms keep.
 */
export function PersonPortraitCredit({
  person,
  variant = "hidden",
}: {
  person: Person;
  /** Unused, kept so older call sites still compile. */
  className?: string;
  variant?: "hidden" | "info";
}) {
  const media = getMediaItem(personPortraitId(person));
  if (media === null) return null;
  const credit = mediaCreditLine(media);
  if (variant === "hidden") return <span className="sr-only">{credit}</span>;
  return (
    <details className="group relative inline-block">
      <summary
        aria-label={credit}
        title={credit}
        className="tap-target flex h-5 w-5 cursor-pointer list-none items-center justify-center rounded-pill text-[11px] text-ink-faint transition-fast hover:text-ink [&::-webkit-details-marker]:hidden"
      >
        <svg aria-hidden="true" viewBox="0 0 16 16" width="13" height="13">
          <circle cx="8" cy="8" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.3" />
          <path d="M8 7.2v4M8 4.9v.1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </summary>
      <p className="absolute left-0 top-6 z-20 w-56 rounded-md border border-line bg-surface p-2 text-[11px] leading-snug text-ink-muted shadow-lg">
        {credit}
      </p>
    </details>
  );
}
