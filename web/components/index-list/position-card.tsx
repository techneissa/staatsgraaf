"use client";

import Link from "next/link";
import { DateT } from "@/components/content/local-date";
import { Gloss } from "@/components/i18n/t";
import { branchColorVar } from "@/lib/branch-colors";
import type { PositionRow } from "@/lib/index-lists";

/**
 * One position on the positions index. The title link stretches over the
 * whole card and goes straight to the position (ADR 0017; index lists navigate, decision EN-15 of 05-10-2026); the
 * organisation is a line of text, because a second link inside a card that is
 * one link only invites mis-taps, and the position page links to it.
 */
export function PositionCard({ row }: { row: PositionRow }) {
  const accent = row.b != null ? branchColorVar(row.b) : null;
  const seats = row.se ?? null;
  return (
    <article className="relative flex h-full min-w-0 flex-col overflow-hidden rounded-md border border-line bg-surface p-3 pl-4 transition-fast hover:border-line-strong">
      {accent !== null ? <span aria-hidden="true" className="absolute inset-y-0 left-0 w-1" style={{ backgroundColor: accent }} /> : null}
      <h3 className="min-w-0 text-sm font-medium [overflow-wrap:anywhere]">
        <Link
          href={`/posities/${row.s}/`}
          prefetch={false}
          className="text-ink underline-offset-2 outline-none after:absolute after:inset-0 hover:text-accent-text hover:underline focus-visible:after:outline-2 focus-visible:after:outline-offset-[-2px] focus-visible:after:outline-focus pointer-coarse:flex pointer-coarse:min-h-11 pointer-coarse:min-w-11 pointer-coarse:items-center"
        >
          {row.n}
        </Link>
      </h3>
      <Gloss text={row.ge} className="block text-xs text-ink-faint [overflow-wrap:anywhere]" />
      {row.o != null ? (
        <p lang="nl" title={row.o} className="mt-0.5 line-clamp-2 text-xs text-ink-muted [overflow-wrap:anywhere]">
          {row.o}
        </p>
      ) : null}
      {/* A single seat is the norm; the count only says something when there are more. */}
      {seats !== null && seats > 1 ? (
        <p className="mt-auto pt-1.5 text-xs tabular-nums text-ink-faint">
          <DateT area="entity" k="seatMany" counts={{ n: seats }} />
        </p>
      ) : null}
    </article>
  );
}
