"use client";

import { useLocale } from "@/components/i18n/language-provider";
import { orgEnGloss } from "@/lib/name-gloss";

/**
 * A ministry name as the reader's language wants it. Dutch readers see the
 * canonical Dutch name only. English readers see the established English
 * gloss as the main label and the Dutch name, unchanged, as smaller secondary
 * text (ADR 0012). Without a gloss the Dutch name stands alone.
 */
export function BudgetOrgName({
  name,
  variant = "stacked",
  secondaryClassName = "text-xs font-normal text-ink-faint",
}: {
  name: string;
  /** "stacked" puts the Dutch name on its own line; "plain" shows only the main label. */
  variant?: "stacked" | "plain";
  secondaryClassName?: string;
}) {
  const locale = useLocale();
  const gloss = locale === "en" ? orgEnGloss(name) : null;
  if (gloss === null) return <>{name}</>;
  if (variant === "plain") return <span lang="en">{gloss}</span>;
  return (
    <>
      <span lang="en">{gloss}</span>
      <span lang="nl" className={`mt-0.5 block ${secondaryClassName}`}>
        {name}
      </span>
    </>
  );
}
