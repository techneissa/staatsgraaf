"use client";

import { useLocale } from "@/components/i18n/language-provider";
import { InfoTip } from "@/components/info-tip";

/** The (i) beside "Recent news": items in the other language are machine translated. */
export function TranslationInfo() {
  const english = useLocale() === "en";
  return (
    <InfoTip label={english ? "About translation" : "Over vertaling"}>
      <p>{english ? "Items in another language are machine translated." : "Anderstalige berichten zijn automatisch vertaald."}</p>
      <a
        href="/methodiek/#machinevertaling"
        className="mt-1.5 inline-flex items-center text-accent-text underline underline-offset-2 hover:no-underline pointer-coarse:min-h-11"
      >
        {english ? "How we translate" : "Hoe we vertalen"}
      </a>
    </InfoTip>
  );
}
