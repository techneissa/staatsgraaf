"use client";

import { useLocale } from "@/components/i18n/language-provider";
import { useT } from "@/components/i18n/use-t";

function Paragraphs({ text }: { text: string }) {
  return (
    <>
      {text
        .split(/\n\s*\n/)
        .map((part) => part.trim())
        .filter((part) => part !== "")
        .map((part, index) => (
          <p key={index} className={index > 0 ? "mt-2" : undefined}>
            {part}
          </p>
        ))}
    </>
  );
}

/**
 * An entity description in the site language. Both texts are in the page; the
 * one for the other language is hidden. The Dutch text stays the build-time
 * default and the English text appears only when a current translation exists.
 */
export function LocalizedDescription({
  nl,
  en,
  className = "",
}: {
  nl: string;
  en: string | null;
  className?: string;
}) {
  const locale = useLocale();
  const t = useT("entity");
  const showEnglish = locale === "en" && en !== null;
  return (
    <div className={className}>
      <div lang="nl" hidden={showEnglish}>
        <Paragraphs text={nl} />
      </div>
      {en !== null ? (
        <div lang="en" hidden={!showEnglish}>
          <Paragraphs text={en} />
          <p className="mt-1 text-xs text-ink-faint">{t("translatedFromDutch")}</p>
        </div>
      ) : null}
    </div>
  );
}
