"use client";

import { useCallback } from "react";
import { useT } from "@/components/i18n/use-t";

/**
 * "11 wijzigingen (4 personen)": the changes, and the people they are about
 * when those are fewer than the changes (a person with six committee seats on
 * one day is one person, six changes). The same text in the day headers, the
 * chart caption and its tooltip.
 */
export function useCountsText() {
  const t = useT("home");
  return useCallback(
    (changes: number, people: number) => {
      const text = changes === 1 ? t("dayCountOne") : t("dayCount", { n: changes });
      if (people === 0 || people >= changes) return text;
      return t("chgWithPeople", { changes: text, people: people === 1 ? t("chgPeopleOne") : t("chgPeople", { n: people }) });
    },
    [t],
  );
}

export function CountsText({ changes, people }: { changes: number; people: number }) {
  const text = useCountsText();
  return <>{text(changes, people)}</>;
}
