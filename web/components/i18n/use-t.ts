"use client";

import { useCallback, useMemo } from "react";
import { DICTS } from "@/lib/i18n/dict-registry";
import type { DictArea, Dicts } from "@/lib/i18n/dicts";
import { interpolate } from "@/lib/i18n/locales";
import { useLocale } from "./language-provider";

export function useT<Area extends DictArea>(
  area: Area,
): (key: string, vars?: Record<string, string | number>) => string {
  const locale = useLocale();
  return useMemo(() => {
    const table: Dicts[Area] = DICTS[area];
    return (key: string, vars?: Record<string, string | number>) => {
      const entry = table[key];
      const template = entry ? (locale === "en" ? entry.en : entry.nl) : key;
      return interpolate(template, vars);
    };
  }, [area, locale]);
}

/** Typo-safe shared table helper: same as useT but keeps the table in scope. */
export function useDict<Area extends DictArea>(area: Area) {
  const locale = useLocale();
  const table = DICTS[area];
  return useCallback(
    (key: keyof Dicts[Area] & string, vars?: Record<string, string | number>) => {
      const entry = table[key];
      const template = entry ? (locale === "en" ? entry.en : entry.nl) : key;
      return interpolate(template, vars);
    },
    [table, locale],
  );
}
