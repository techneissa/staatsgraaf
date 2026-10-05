import { ViewTransition } from "react";
import { Avatar } from "@/components/avatar";
import { getMediaItem, mediaCreditInfo, mediaCreditLine, personPortraitId } from "@/lib/entity";
import { partyByDataset } from "@/lib/parties";
import type { Person } from "@/lib/types";
import { CreditPopover, CreditText } from "./credit-text";

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
  if (variant === "hidden") return <span className="sr-only"><CreditText credit={credit} /></span>;
  return <CreditPopover info={mediaCreditInfo(media)} />;
}
