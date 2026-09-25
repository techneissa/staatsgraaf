import type { CSSProperties } from "react";
import { LocalText } from "@/components/i18n/t";
import { PeekLink } from "@/components/peek/peek-link";
import { initialsFor } from "@/lib/initials";
import { personCardVars } from "@/lib/person-color";
import type { PersonEntry } from "./people-index";

/**
 * One person on the people index: a square portrait (initials on a tinted
 * square without one), the name, the main position in one line and the party
 * tag. Border and fill carry the person's colour (lib/person-color.ts). The
 * name link stretches over the whole card and opens the peek popover like
 * every person link on the site; cmd-click or no JavaScript navigates.
 *
 * The filter bar (people-filters.tsx) reads the data attributes on the item.
 */
export function PersonTile({ entry }: { entry: PersonEntry }) {
  return (
    <li
      data-person=""
      data-group={entry.group}
      data-party={entry.party?.key ?? ""}
      data-search={entry.search}
      data-reveal="pending"
      className="motion-rise"
    >
      <article
        style={personCardVars(entry.color) as CSSProperties}
        className="relative flex h-full min-w-0 flex-col gap-2 rounded-lg border border-[color-mix(in_oklab,var(--pc)_50%,var(--t-color-line))] bg-[color-mix(in_srgb,var(--pc)_7%,var(--t-color-surface))] p-2.5 transition-[border-color,background-color] duration-150 ease-out hover:border-[color-mix(in_oklab,var(--pc)_85%,var(--t-color-line))] hover:bg-[color-mix(in_srgb,var(--pc)_11%,var(--t-color-surface))] motion-reduce:transition-none"
      >
        <div className="flex min-w-0 items-start justify-between gap-1.5">
          <PortraitSquare entry={entry} />
          {entry.party ? <PartyTag party={entry.party} /> : null}
        </div>
        <h3 className="line-clamp-2 break-words text-sm font-semibold leading-snug text-ink">
          <PeekLink
            id={entry.id}
            href={`/personen/${entry.slug}/`}
            kind="person"
            variant="plain"
            title={entry.name}
            className="outline-none after:absolute after:inset-0 after:rounded-lg focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-focus"
          >
            {entry.name}
          </PeekLink>
        </h3>
        {entry.role ? (
          <p className="-mt-1 truncate text-xs text-ink-muted">
            <LocalText nl={entry.role.nl} en={entry.role.en} />
          </p>
        ) : null}
      </article>
    </li>
  );
}

function PortraitSquare({ entry }: { entry: PersonEntry }) {
  return (
    <span
      aria-hidden="true"
      className="relative block size-13 shrink-0 overflow-hidden rounded-md border border-[color-mix(in_oklab,var(--pc)_45%,var(--t-color-line))] bg-[color-mix(in_srgb,var(--pc)_22%,var(--t-color-surface-raised))]"
    >
      <span className="absolute inset-0 flex select-none items-center justify-center text-base font-semibold tracking-wide text-ink">
        {initialsFor(entry.name)}
      </span>
      {entry.portrait ? (
        // A plain image over the initials: when it fails to load, the empty alt
        // shows nothing and the initials stay visible, without client code.
        <img
          src={entry.portrait.url}
          alt=""
          title={entry.portrait.credit}
          width={52}
          height={52}
          loading="lazy"
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover object-top"
        />
      ) : null}
    </span>
  );
}

/** The party in its own colour, as on the party pill, but not a link: the whole card is. */
function PartyTag({ party }: { party: NonNullable<PersonEntry["party"]> }) {
  const color = party.color;
  return (
    <span
      className="inline-flex min-w-0 max-w-[60%] items-center gap-1 rounded-pill border border-line px-1.5 py-0.5 text-[11px] font-medium leading-tight text-ink"
      style={
        color
          ? {
              backgroundColor: `color-mix(in oklab, ${color} 16%, transparent)`,
              borderColor: `color-mix(in oklab, ${color} 55%, transparent)`,
            }
          : undefined
      }
      title={party.label}
    >
      <span
        aria-hidden="true"
        className="size-1.5 shrink-0 rounded-full"
        style={{ backgroundColor: color ?? "var(--t-color-line-strong)" }}
      />
      <span className="truncate">{party.label}</span>
    </span>
  );
}
