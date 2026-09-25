"use client";

import type { ReactNode } from "react";
import { useLocale } from "@/components/i18n/language-provider";
import { localizeCredit } from "@/lib/format";

/** A portrait credit in the site language: only the fixed words of the credit pattern change. */
export function CreditText({ credit }: { credit: string }) {
  const locale = useLocale();
  return <>{localizeCredit(credit, locale)}</>;
}

/** The info button of a portrait credit, named by the credit in the site language. */
export function CreditSummary({ credit, className, children }: { credit: string; className?: string; children: ReactNode }) {
  const locale = useLocale();
  const text = localizeCredit(credit, locale);
  return (
    <summary aria-label={text} title={text} className={className}>
      {children}
    </summary>
  );
}
