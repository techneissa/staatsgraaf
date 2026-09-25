"use client";

import type { ReactNode } from "react";
import { useLocale } from "./language-provider";
import { useT } from "./use-t";
import type { DictArea } from "@/lib/i18n/dicts";

/**
 * Client-translated dictionary string. Renders the Dutch default at build time
 * and swaps to the stored locale after hydration.
 */
export function T({
  area = "common",
  k,
  vars,
}: {
  area?: DictArea;
  k: string;
  vars?: Record<string, string | number>;
}) {
  const t = useT(area);
  return <>{t(k, vars)}</>;
}

/**
 * Escape hatch for one-off page copy: pass both translations from a server
 * component; the client component picks the rendered locale after hydration.
 */
export function L({ nl, en }: { nl: string; en: string }) {
  const locale = useLocale();
  return <>{locale === "en" ? en : nl}</>;
}

/**
 * An English gloss for a Dutch name (ADR 0012): rendered only in English, as
 * smaller secondary text. Nothing renders when no established gloss exists.
 */
export function Gloss({ text, className = "block text-xs text-ink-faint" }: { text: string | null | undefined; className?: string }) {
  const locale = useLocale();
  if (locale !== "en" || typeof text !== "string" || text === "") return null;
  return (
    <span lang="en" className={className}>
      {text}
    </span>
  );
}

/**
 * Two versions of a free text, Dutch and English, with the English one shown
 * only in English and only when it exists. Both stay in the HTML.
 */
export function LocalText({ nl, en, className }: { nl: string; en: string | null; className?: string }) {
  const locale = useLocale();
  const english = locale === "en" && en !== null;
  return (
    <span lang={english ? "en" : "nl"} className={className}>
      {english ? en : nl}
    </span>
  );
}

/** Content that exists only for English readers, such as a translation disclosure. */
export function EnglishOnly({ children }: { children: ReactNode }) {
  const locale = useLocale();
  return locale === "en" ? <>{children}</> : null;
}
