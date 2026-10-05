"use client";

import { LocaleLabel } from "@/components/i18n/locale-label";
import { useT } from "@/components/i18n/use-t";

/** Subtype values the shared label tables do not translate yet. */
const OWN_LABELS: Record<string, string> = { koepel: "subtypeKoepel" };

/** An organisation subtype in the site language, with entries for the values the shared tables lack. */
export function SubtypeLabel({ value }: { value: string | null | undefined }) {
  const t = useT("entity");
  if (typeof value === "string" && OWN_LABELS[value] !== undefined) return <>{t(OWN_LABELS[value])}</>;
  return <LocaleLabel kind="subtype" value={value} />;
}

/** The explanation of a subtype that needs one, or null. */
export function SubtypeHint({ value }: { value: string | null | undefined }) {
  const t = useT("entity");
  return value === "koepel" ? <>{t("glossKoepel")}</> : null;
}
