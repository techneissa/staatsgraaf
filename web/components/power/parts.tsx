"use client";

import Link from "next/link";
import { Avatar } from "@/components/avatar";
import { useT } from "@/components/i18n/use-t";
import type { PowerNewsItem } from "@/lib/graph";
import { formatDutchDate, type EntityInfo, type TieView } from "./model";

/** A portrait or initials for a person, a tinted square with initials for a body. */
export function EntityMark({ info, size }: { info: EntityInfo; size: number }) {
  if (info.isOrg) {
    return (
      <span
        aria-hidden="true"
        className="inline-flex shrink-0 items-center justify-center rounded-md border font-semibold text-ink"
        style={{
          width: size,
          height: size,
          fontSize: Math.max(10, Math.round(size / 3)),
          backgroundColor: `color-mix(in srgb, ${info.color ?? "var(--t-color-line)"} 22%, var(--t-color-surface-raised))`,
          borderColor: info.color ?? "var(--t-color-line)",
        }}
      >
        {info.initials}
      </span>
    );
  }
  return (
    <span
      className="inline-flex shrink-0 rounded-pill"
      style={{ boxShadow: info.color ? `0 0 0 2px var(--t-color-surface-inset), 0 0 0 3.5px ${info.color}` : undefined }}
    >
      <Avatar name={info.name} url={info.image} color={info.color} size={size} />
    </span>
  );
}

/** The party of a person as a short label with its colour; text carries the identity, colour only repeats it. */
export function PartyChip({ info }: { info: EntityInfo }) {
  if (!info.party) return null;
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-sm border border-line px-1.5 py-px text-xs font-medium text-ink-muted">
      {info.color ? <span aria-hidden="true" className="h-2 w-2 rounded-pill" style={{ backgroundColor: info.color }} /> : null}
      {info.party}
    </span>
  );
}

/** Tie strength as five steps; the steps are text for screen readers. */
export function StrengthMeter({ level }: { level: number }) {
  const t = useT("power");
  return (
    <span role="img" aria-label={t("strength", { level })} title={t("strength", { level })} className="inline-flex shrink-0 items-end gap-0.5">
      {[1, 2, 3, 4, 5].map((step) => (
        <span
          key={step}
          className={`w-1 rounded-sm ${step <= level ? "bg-accent" : "bg-line"}`}
          style={{ height: 4 + step * 2 }}
        />
      ))}
    </span>
  );
}

/** The reasons of a tie as small chips; the title lists the evidence behind each. */
export function ReasonChips({ tie, compact = false }: { tie: TieView; compact?: boolean }) {
  return (
    <span className={`flex min-w-0 flex-wrap gap-1 ${compact ? "max-h-5 overflow-hidden" : ""}`}>
      {tie.reasons.map((reason) => (
        <span
          key={reason.key}
          title={reason.evidence || undefined}
          className={`max-w-full truncate rounded-sm px-1.5 py-px text-xs ${
            reason.key === "news" ? "bg-accent-soft text-accent-text" : "bg-surface-raised text-ink-muted"
          }`}
        >
          {reason.text}
        </span>
      ))}
    </span>
  );
}

/** The link to an entity's own page, where its sources are listed. */
export function ProfileLink({ info, className = "" }: { info: EntityInfo; className?: string }) {
  const t = useT("power");
  if (!info.href) return null;
  return (
    <Link
      href={info.href}
      aria-label={t("openProfileOf", { name: info.name })}
      className={`tap-target inline-flex shrink-0 items-center gap-1 rounded-sm border border-line bg-surface px-2 py-1 text-xs font-medium text-ink-muted hover:border-line-strong hover:text-ink ${className}`}
    >
      {t("openProfile")}
      <svg aria-hidden="true" viewBox="0 0 20 20" width="12" height="12">
        <path d="M7.5 4.5 13 10l-5.5 5.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </Link>
  );
}

/**
 * The news items that name the focus, newest first. A row picks the item
 * (the panels show it and the view lights up whom it names); the arrow opens
 * the article at its publisher, the source of the tie.
 */
export function NewsRows({
  items,
  picked,
  locale,
  onPick,
  clamp,
}: {
  items: readonly PowerNewsItem[];
  picked: string | null;
  locale: "nl" | "en";
  onPick: (id: string) => void;
  clamp: 1 | 2;
}) {
  const t = useT("power");
  return (
    <ul className="flex flex-col">
      {items.map((item) => {
        const title = locale === "en" && item.titleEn ? item.titleEn : item.title;
        const isPicked = item.id === picked;
        return (
          <li key={item.id} className="flex min-w-0 items-stretch gap-1 border-t border-line first:border-t-0">
            <button
              type="button"
              aria-pressed={isPicked}
              onClick={() => onPick(item.id)}
              className={`tap-row flex min-w-0 flex-1 flex-col justify-center rounded-sm px-2 py-1.5 text-left hover:bg-surface-raised ${
                isPicked ? "bg-accent-soft" : ""
              }`}
            >
              <span className="text-xs text-ink-faint">
                {formatDutchDate(item.date)}
                {item.publisher ? ` · ${item.publisher}` : ""}
              </span>
              <span
                lang={locale === "en" && item.titleEn ? "en" : "nl"}
                className={`text-sm leading-snug text-ink ${clamp === 1 ? "truncate" : "line-clamp-2"}`}
              >
                {title}
              </span>
            </button>
            {item.url ? (
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={t("openArticle", { publisher: item.publisher ?? "" })}
                title={t("openArticle", { publisher: item.publisher ?? "" })}
                className="tap-target flex w-9 shrink-0 items-center justify-center rounded-sm text-ink-faint hover:bg-surface-raised hover:text-ink"
              >
                <svg aria-hidden="true" viewBox="0 0 20 20" width="14" height="14">
                  <path
                    d="M8 4.5H4.5v11h11V12M11 3.5h5.5V9M16.5 3.5 9 11"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </a>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

/** The one quiet source line: which outlets and which window, and where the rest comes from. */
export function SourceNote({ text }: { text: string }) {
  return (
    <p className="line-clamp-2 px-3 py-1.5 text-xs text-ink-faint">
      <Link href="/nieuws/bronnen/" className="hover:text-ink hover:underline">
        {text}
      </Link>
    </p>
  );
}
