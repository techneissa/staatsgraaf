"use client";

import type { IconNode } from "lucide";
import { useLocale } from "@/components/i18n/language-provider";
import { useT } from "@/components/i18n/use-t";
import { LucideIcon } from "@/components/icons/lucide-icon";
import { formatCountIn } from "@/lib/format";
import { CountUp } from "./motion";

/**
 * A count with a small icon in place of its unit word, to keep the card's right
 * column narrow. The word stays for screen readers and the tooltip.
 */
export function CountBadge({ value, icon, wordKey }: { value: number; icon: IconNode; wordKey: string }) {
  const locale = useLocale();
  const word = useT("pages")(wordKey);
  return (
    <span title={`${formatCountIn(value, locale)} ${word}`} className="inline-flex items-center gap-1">
      <LucideIcon icon={icon} size={12} strokeWidth={2} className="shrink-0" />
      <span className="font-medium text-ink-muted">
        <CountUp value={value} />
      </span>
      <span className="sr-only">{word}</span>
    </span>
  );
}
