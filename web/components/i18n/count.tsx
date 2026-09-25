"use client";

import { useLocale } from "./language-provider";
import { formatCountIn } from "@/lib/format";

/** A whole number in the reader's language: 1.641 in Dutch, 1,641 in English. */
export function Count({ value }: { value: number }) {
  const locale = useLocale();
  return <>{formatCountIn(value, locale === "en" ? "en" : "nl")}</>;
}
