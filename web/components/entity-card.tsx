"use client";

import Link from "next/link";
import { branchColorClass } from "@/lib/branch-colors";
import { DateT } from "@/components/content/local-date";
import { useLocale } from "@/components/i18n/language-provider";
import { LocaleLabel } from "@/components/i18n/locale-label";
import { Gloss } from "@/components/i18n/t";
import type { OrganizationRow } from "@/lib/index-lists";

/**
 * One organisation on the organisations index. The name link stretches over
 * the whole card (a single anchor, so find, focus and middle click work as on
 * any link) and goes straight to the organisation: on an index the click is
 * for navigating, the peek popover is for mentions in running text (ADR 0017;
 * index lists navigate, decision EN-15 of 05-10-2026). Long names wrap; clipped text keeps its full text in a tooltip.
 */
export function EntityCard({ row }: { row: OrganizationRow }) {
  const locale = useLocale();
  const seats = row.se ?? null;
  const employees = row.em ?? null;
  const english = locale === "en" && row.de != null;
  const description = english ? row.de : (row.dn ?? null);
  return (
    <article className="relative flex h-full min-w-0 flex-col overflow-hidden rounded-md border border-line border-l-4 bg-surface p-3 pr-4 transition-fast hover:border-line-strong">
      <span aria-hidden="true" className={`absolute inset-y-0 left-0 w-1 ${branchColorClass(row.b, "bg")}`} />
      <h3 className="min-w-0 text-sm font-semibold [overflow-wrap:anywhere]">
        <Link
          href={`/organisaties/${row.s}/`}
          prefetch={false}
          // The link covers the card, so the tooltip of the clipped description lives here.
          title={description !== null ? `${row.n}\n${description}` : undefined}
          className="text-ink underline-offset-2 outline-none after:absolute after:inset-0 hover:text-accent-text hover:underline focus-visible:after:outline-2 focus-visible:after:outline-offset-[-2px] focus-visible:after:outline-focus pointer-coarse:flex pointer-coarse:min-h-11 pointer-coarse:min-w-11 pointer-coarse:items-center"
        >
          {row.n}
        </Link>
      </h3>
      <Gloss text={row.ge} className="mt-0.5 block text-xs text-ink-faint [overflow-wrap:anywhere]" />
      {/* The branch is the heading of the section this card sits in; only the type is per card. */}
      <p className="mt-1 text-xs text-ink-muted">
        <LocaleLabel kind="subtype" value={row.st} />
      </p>
      {description !== null ? (
        <p
          lang={english ? "en" : "nl"}
          title={description}
          className="mt-1.5 line-clamp-2 text-sm leading-normal text-ink-muted [overflow-wrap:anywhere]"
        >
          {description}
        </p>
      ) : null}
      {seats !== null || employees !== null ? (
        <p className="mt-auto pt-2 text-xs tabular-nums text-ink-faint">
          {seats !== null ? <DateT area="common" k="seatsOfLabel" counts={{ n: seats }} /> : null}
          {seats !== null && employees !== null ? " · " : null}
          {employees !== null ? <DateT area="entity" k="employeesShort" counts={{ n: employees }} /> : null}
        </p>
      ) : null}
    </article>
  );
}
