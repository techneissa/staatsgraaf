"use client";

import Link from "next/link";
import { useState } from "react";
import { Layers } from "lucide";
import { LucideIcon } from "@/components/icons/lucide-icon";
import { Gloss } from "@/components/i18n/t";
import { useT } from "@/components/i18n/use-t";
import type { OrganizationRow } from "@/lib/index-lists";
import { OrgVisual } from "./org-visual";

const LINK_CLASS =
  "block font-medium leading-snug underline-offset-2 outline-none break-words after:absolute after:inset-0 after:rounded-[inherit] hover:text-accent-text hover:underline focus-visible:after:outline-2 focus-visible:after:outline-offset-[-2px] focus-visible:after:outline-focus";

function Seats({ n }: { n: number }) {
  const tc = useT("common");
  return <span className="shrink-0 rounded-pill bg-surface-raised px-2 py-0.5 text-xs tabular-nums text-ink-muted">{tc("seatsOfLabel", { n })}</span>;
}

/**
 * One organisation as a compact card: its visual (coat of arms, logo or the
 * icon of its type in the colour of its group), the name, and at most one
 * meta element: the button that opens the bodies that belong to it (the
 * gemeenteraad and the college of a gemeente), else its seats. The name link
 * stretches over the card (one anchor, so find, focus and middle click work
 * as on any link); the nested bodies stay reachable from the organisation
 * page and the search as well.
 */
export function OrgCard({
  row,
  parts,
  label,
}: {
  row: OrganizationRow;
  parts: OrganizationRow[];
  /** A shorter name where the heading above says the rest ("Aa en Hunze" under Drenthe). The title keeps the full name. */
  label?: string;
}) {
  const t = useT("entity");
  const [open, setOpen] = useState(false);
  const partsId = `delen-${row.s}`;
  const seats = row.se != null && row.se > 0 ? row.se : null;
  return (
    <li className="min-w-0">
      <div className={`rounded-lg border bg-surface transition-fast hover:border-line-strong ${open ? "border-line-strong" : "border-line"}`}>
        <div className="relative flex min-h-12 items-center gap-3 rounded-lg px-2 py-1.5">
          <OrgVisual row={row} />
          <div className="min-w-0 flex-1">
            <Link href={`/organisaties/${row.s}/`} prefetch={false} title={row.ge ? `${row.n}\n${row.ge}` : row.n} className={`${LINK_CLASS} line-clamp-2 text-sm text-ink`}>
              {label ?? row.n}
            </Link>
            <Gloss text={row.ge} className="mt-0.5 block truncate text-xs text-ink-muted" />
          </div>
          {parts.length > 0 ? (
            <button
              type="button"
              aria-expanded={open}
              aria-controls={partsId}
              title={t("orgPartsCount", { n: parts.length })}
              onClick={() => setOpen((value) => !value)}
              className="relative z-10 inline-flex min-h-9 shrink-0 items-center gap-1 rounded-pill border border-line bg-surface-raised px-2 text-xs tabular-nums text-ink-muted transition-fast hover:border-line-strong hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-focus aria-expanded:border-line-strong aria-expanded:text-ink pointer-coarse:min-h-11 pointer-coarse:min-w-11 pointer-coarse:justify-center"
            >
              <LucideIcon icon={Layers} size={13} strokeWidth={2} />
              <span>
                {parts.length}
                <span className="sr-only"> {t("orgPartsOf", { name: row.n })}</span>
              </span>
              <svg aria-hidden="true" viewBox="0 0 16 16" width="12" height="12" className={`shrink-0 transition-transform ${open ? "rotate-180" : ""}`}>
                <path d="m3.5 6 4.5 4.5L12.5 6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          ) : seats !== null ? (
            <Seats n={seats} />
          ) : null}
        </div>
        {parts.length > 0 ? (
          <ul id={partsId} role="list" hidden={!open} className="list-none border-t border-line px-2 py-1">
            {open ? parts.map((part) => (
              <li key={part.s} className="relative flex min-h-11 items-center gap-2.5 rounded-md py-1">
                <OrgVisual row={part} size="sm" />
                <Link href={`/organisaties/${part.s}/`} prefetch={false} title={part.ge ? `${part.n}\n${part.ge}` : part.n} className={`${LINK_CLASS} line-clamp-2 min-w-0 flex-1 text-[13px] font-normal text-ink-muted`}>
                  {part.n}
                </Link>
                {part.se != null && part.se > 0 ? <Seats n={part.se} /> : null}
              </li>
            )) : null}
          </ul>
        ) : null}
      </div>
    </li>
  );
}
