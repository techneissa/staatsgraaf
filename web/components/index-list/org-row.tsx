"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { Gloss } from "@/components/i18n/t";
import { useLocale } from "@/components/i18n/language-provider";
import { LocaleLabel } from "@/components/i18n/locale-label";
import { useT } from "@/components/i18n/use-t";
import { foldText, type OrganizationRow } from "@/lib/index-lists";
import { ORG_SUBTYPE_LABELS, ORG_SUBTYPE_LABELS_EN } from "@/lib/labels";

/**
 * The leader and seats of a body, one muted line. The type is left out when
 * the group heading already says it (`showType` is false then).
 */
function Secondary({ row, showType, parentName }: { row: OrganizationRow; showType: boolean; parentName: string | null }) {
  const locale = useLocale();
  const t = useT("entity");
  const tc = useT("common");
  const lead = locale === "en" ? (row.he ?? row.hd ?? null) : (row.hd ?? null);
  const seats = row.se != null && row.se > 0 ? tc("seatsOfLabel", { n: row.se }) : null;
  const parts: ReactNode[] = [];
  // A type that is the name ("Kiesgerechtigden Nederland") or its gloss says nothing more.
  const typeLabel = (locale === "en" ? ORG_SUBTYPE_LABELS_EN : ORG_SUBTYPE_LABELS)[row.st] ?? ORG_SUBTYPE_LABELS[row.st] ?? "";
  if (showType && parentName === null && foldText(typeLabel) !== foldText(row.n) && !(locale === "en" && row.ge != null && foldText(typeLabel) === foldText(row.ge))) parts.push(<LocaleLabel key="type" kind="subtype" value={row.st} />);
  if (parentName !== null) parts.push(`${t("partOfTitle")} ${parentName}`);
  if (seats !== null) parts.push(seats);
  if (lead !== null) parts.push(lead);
  if (parts.length === 0) return null;
  return (
    <p className="mt-0.5 line-clamp-2 text-xs text-ink-muted [overflow-wrap:anywhere]">
      {parts.map((part, index) => (
        <span key={index}>
          {index > 0 ? " · " : null}
          {part}
        </span>
      ))}
    </p>
  );
}

const LINK_CLASS =
  "block text-sm font-medium leading-snug text-ink underline-offset-2 outline-none [overflow-wrap:anywhere] after:absolute after:inset-0 hover:text-accent-text hover:underline focus-visible:after:outline-2 focus-visible:after:outline-offset-[-2px] focus-visible:after:outline-focus";

/**
 * One organisation as a compact row: the name on one or two lines, a muted
 * line under it. The name link stretches over the row (one anchor, so find,
 * focus and middle click work as on any link). Bodies that belong to it (the
 * gemeenteraad and the college of a gemeente) fold under a button; they stay
 * reachable from the organisation page as well.
 */
export function OrgRow({
  row,
  parts,
  emblemSlot,
  showType,
  parentName = null,
}: {
  row: OrganizationRow;
  parts: OrganizationRow[];
  /** Reserve the emblem column, so the names of the group line up. */
  emblemSlot: boolean;
  showType: boolean;
  parentName?: string | null;
}) {
  const t = useT("entity");
  const [open, setOpen] = useState(false);
  const partsId = `delen-${row.s}`;
  return (
    <li className="min-w-0">
      <div className="relative flex min-h-11 items-center gap-3 border-b border-line py-1.5">
        {emblemSlot ? (
          <span aria-hidden="true" className="flex h-8 w-9 shrink-0 items-center justify-center">
            {row.w ? <img src={row.w} alt="" width={36} height={32} loading="lazy" decoding="async" className="max-h-8 max-w-9 object-contain" /> : null}
          </span>
        ) : null}
        <div className="min-w-0 flex-1">
          <Link href={`/organisaties/${row.s}/`} prefetch={false} title={row.ge ? `${row.n}\n${row.ge}` : row.n} className={`${LINK_CLASS} line-clamp-3`}>
            {row.n}
          </Link>
          <Gloss text={row.ge} className="mt-0.5 block text-xs text-ink-muted [overflow-wrap:anywhere]" />
          <Secondary row={row} showType={showType} parentName={parentName} />
        </div>
        {parts.length > 0 ? (
          <button
            type="button"
            aria-expanded={open}
            aria-controls={partsId}
            onClick={() => setOpen((value) => !value)}
            className="relative z-10 -my-1 inline-flex min-h-9 shrink-0 items-center gap-1 rounded-md px-2 text-xs tabular-nums text-ink-muted transition-fast hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-focus pointer-coarse:min-h-11"
          >
            <span>
              {t("orgPartsCount", { n: parts.length })}
              <span className="sr-only"> {t("orgPartsOf", { name: row.n })}</span>
            </span>
            <svg aria-hidden="true" viewBox="0 0 16 16" width="12" height="12" className={`shrink-0 transition-transform ${open ? "rotate-180" : ""}`}>
              <path d="m3.5 6 4.5 4.5L12.5 6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        ) : null}
      </div>
      {parts.length > 0 ? (
        <ul id={partsId} role="list" hidden={!open} className="mb-1 ms-4 list-none border-s border-line p-0 ps-3">
          {parts.map((part) => (
            <li key={part.s} className="relative flex min-h-11 flex-col justify-center border-b border-line py-1.5 last:border-b-0">
              <Link href={`/organisaties/${part.s}/`} prefetch={false} title={part.ge ? `${part.n}\n${part.ge}` : part.n} className={`${LINK_CLASS} line-clamp-2`}>
                {part.n}
              </Link>
              <Gloss text={part.ge} className="mt-0.5 block text-xs text-ink-muted [overflow-wrap:anywhere]" />
              <Secondary row={part} showType={false} parentName={null} />
            </li>
          ))}
        </ul>
      ) : null}
    </li>
  );
}
