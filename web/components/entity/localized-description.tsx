"use client";

import type { ReactNode } from "react";
import { useLocale } from "@/components/i18n/language-provider";

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
  const showEnglish = locale === "en" && en !== null;
  return (
    <div className={className}>
      <div lang="nl" hidden={showEnglish}>
        <Paragraphs text={nl} />
      </div>
      {en !== null ? (
        <div lang="en" hidden={!showEnglish}>
          <Paragraphs text={en} />
        </div>
      ) : null}
    </div>
  );
}

/**
 * The same locale switch as LocalizedDescription, for copy that already holds
 * inline links. Both languages stay in the page.
 */
export function LocalizedRich({
  nl,
  en,
  className = "",
}: {
  nl: ReactNode;
  en: ReactNode;
  className?: string;
}) {
  const locale = useLocale();
  const showEnglish = locale === "en";
  return (
    <div className={className}>
      <p lang="nl" hidden={showEnglish} className="max-w-prose leading-relaxed">
        {nl}
      </p>
      <p lang="en" hidden={!showEnglish} className="max-w-prose leading-relaxed">
        {en}
      </p>
    </div>
  );
}
