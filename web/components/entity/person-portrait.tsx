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
 */
export function PersonPortrait({
  person,
  size = 64,
  className = "",
  labelled = false,
}: {
  person: Person;
  size?: number;
  className?: string;
  labelled?: boolean;
}) {
  const media = getMediaItem(personPortraitId(person));
  return (
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
