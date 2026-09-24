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
 * Credit and license for a portrait, ready to place under the image. Renders
 * nothing when the person has no portrait, so callers do not need a check.
 */
export function PersonPortraitCredit({
  person,
  className = "",
}: {
  person: Person;
  className?: string;
}) {
  const media = getMediaItem(personPortraitId(person));
  if (media === null) return null;
  return <span className={className.trim()}>{mediaCreditLine(media)}</span>;
}
