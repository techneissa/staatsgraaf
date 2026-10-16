"use client";

import type { ReactNode } from "react";
import { DateT } from "@/components/content/local-date";
import { useLocale } from "@/components/i18n/language-provider";
import { T } from "@/components/i18n/t";
import { useT } from "@/components/i18n/use-t";
import { InfoTip } from "@/components/info-tip";
import { BuildingIcon } from "@/components/entity/icons";

/**
 * (i) on the organisation title. English UI with a gloss: Dutch name and
 * aliases. Dutch UI, or English with no gloss: aliases only. Hidden when
 * there is nothing to show.
 */
export function OrgNameTip({
  name,
  englishName,
  aliases,
}: {
  name: string;
  englishName: string | null;
  aliases: string[];
}) {
  const locale = useLocale();
  const t = useT("entity");
  const showDutch = locale === "en" && englishName !== null;
  if (!showDutch && aliases.length === 0) return null;
  return (
    <InfoTip label={t("nameTipLabel")}>
      {showDutch ? (
        <>
          <p className="text-[10px] font-medium uppercase tracking-wide text-ink-faint">{t("dutchNameLabel")}</p>
          <p lang="nl" className="mt-0.5 font-medium text-ink">
            {name}
          </p>
        </>
      ) : null}
      {aliases.length > 0 ? (
        <p className={showDutch ? "mt-2" : undefined}>
          <span className="text-[10px] font-medium uppercase tracking-wide text-ink-faint">{t("factAliases")}</span>
          <span lang="nl" className="mt-0.5 block text-ink">
            {aliases.join(", ")}
          </span>
        </p>
      ) : null}
    </InfoTip>
  );
}

/** Count of bodies under this one; opens a list and a jump to #onderdelen. */
export function OrgChildrenTip({ count, children }: { count: number; children: ReactNode }) {
  const t = useT("entity");
  return (
    <InfoTip
      label={t("childrenTitle")}
      trigger={
        <>
          <BuildingIcon width={14} height={14} className="shrink-0" />
          <span>
            <DateT area="entity" k={count === 1 ? "childrenShortOne" : "childrenShortMany"} counts={{ n: count }} />
          </span>
        </>
      }
    >
      {children}
      <p className="mt-2 border-t border-line pt-2">
        <a href="#onderdelen" className="text-accent-text underline-offset-2 hover:underline">
          <T area="entity" k="childrenOpenAll" vars={{ n: count }} />
        </a>
      </p>
    </InfoTip>
  );
}
