"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
import { useLocale } from "@/components/i18n/language-provider";
import { initialsFor } from "@/lib/initials";
import type { PersonRow } from "@/lib/index-lists";
import { personCardVars } from "@/lib/person-color";

/**
 * One person on the people index: a square portrait (initials on a tinted
 * square without one), the name, the main position in one line and the party
 * tag. Border and fill carry the person's colour (lib/person-color.ts). The
 * name link stretches over the whole card and goes straight to the person:
 * on an index the click is for navigating, the peek popover is for mentions
 * in running text (ADR 0017; index lists navigate, decision EN-15 of 05-10-2026).
 */
export function PersonTile({ row }: { row: PersonRow }) {
  const locale = useLocale();
  const en = locale === "en" && row.re != null;
  const role = en ? row.re : (row.r ?? null);
  return (
    <li className="min-w-0">
      <article
        style={personCardVars(row.c ?? null) as CSSProperties}
        className="relative flex h-full min-w-0 flex-col gap-2 rounded-lg border border-[color-mix(in_oklab,var(--pc)_50%,var(--t-color-line))] bg-[color-mix(in_srgb,var(--pc)_7%,var(--t-color-surface))] p-2.5 transition-[border-color,background-color] duration-150 ease-out hover:border-[color-mix(in_oklab,var(--pc)_85%,var(--t-color-line))] hover:bg-[color-mix(in_srgb,var(--pc)_11%,var(--t-color-surface))] motion-reduce:transition-none"
      >
        <div className="flex min-w-0 items-start justify-between gap-1.5">
          <PortraitSquare row={row} />
          {row.p ? <PartyTag label={row.p} color={row.pc ?? null} /> : null}
        </div>
        <h3 className="line-clamp-2 break-words text-sm font-semibold leading-snug text-ink [overflow-wrap:anywhere]">
          <Link
            href={`/personen/${row.s}/`}
            prefetch={false}
            title={role ? `${row.n}\n${role}` : row.n}
            className="text-ink no-underline outline-none after:absolute after:inset-0 after:rounded-lg hover:underline focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-focus"
          >
            {row.n}
          </Link>
        </h3>
        {role ? (
          <p lang={en ? "en" : "nl"} title={role} className="-mt-1 truncate text-xs text-ink-muted">
            {role}
          </p>
        ) : null}
      </article>
    </li>
  );
}

function PortraitSquare({ row }: { row: PersonRow }) {
  return (
    <span
      aria-hidden="true"
      className="relative block size-13 shrink-0 overflow-hidden rounded-md border border-[color-mix(in_oklab,var(--pc)_45%,var(--t-color-line))] bg-[color-mix(in_srgb,var(--pc)_22%,var(--t-color-surface-raised))]"
    >
      <span className="absolute inset-0 flex select-none items-center justify-center text-base font-semibold tracking-wide text-ink">
        {initialsFor(row.n)}
      </span>
      {row.t ? (
        // A plain image over the initials: when it fails to load, the empty alt
        // shows nothing and the initials stay visible, without client code.
        <img
          src={row.t}
          alt=""
          title={row.cr ?? undefined}
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
function PartyTag({ label, color }: { label: string; color: string | null }) {
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
      title={label}
    >
      <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full" style={{ backgroundColor: color ?? "var(--t-color-line-strong)" }} />
      <span className="truncate">{label}</span>
    </span>
  );
}
