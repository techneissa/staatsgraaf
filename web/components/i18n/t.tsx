"use client";

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
