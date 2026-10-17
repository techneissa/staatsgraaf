"use client";

import type { ReactNode } from "react";
import { InfoTip } from "@/components/info-tip";
import { useLocale } from "@/components/i18n/language-provider";
import { useT } from "@/components/i18n/use-t";
import { formatDateIn, localizeCredit } from "@/lib/format";
import type { MediaCreditInfo } from "@/lib/entity";

/** The closing statement of changes `mediaCreditLine` writes (lib/entity.ts, MEDIA_CHANGES_NL). A runtime import of lib/entity would pull the dataset reader into the client bundle. */
const CHANGES_SUFFIX = /, verkleind en bijgesneden$/;

/** A credit line in the site language, including the closing statement of changes. */
export function localizeMediaCredit(credit: string, locale: "nl" | "en"): string {
  const text = localizeCredit(credit, locale);
  return locale === "en" ? text.replace(CHANGES_SUFFIX, ", resized and cropped") : text;
}

/** A portrait credit in the site language: only the fixed words of the credit pattern change. */
export function CreditText({ credit }: { credit: string }) {
  const locale = useLocale();
  return <>{localizeMediaCredit(credit, locale)}</>;
}

/** The info button of a portrait credit, named by the credit in the site language. */
export function CreditSummary({ credit, className, children }: { credit: string; className?: string; children: ReactNode }) {
  const locale = useLocale();
  const text = localizeMediaCredit(credit, locale);
  return (
    <summary aria-label={text} title={text} className={className}>
      {children}
    </summary>
  );
}

const LINK = "text-accent-text underline underline-offset-2 hover:no-underline focus-visible:rounded-xs";

/**
 * The (i) of a portrait: author, licence (linked to its text) and the page the
 * image came from, by site name and link. Shares InfoTip so the note stays
 * inside the viewport the same way as the name (i).
 */
export function CreditPopover({ info, kind = "photo" }: { info: MediaCreditInfo; kind?: "photo" | "emblem" | "logo" }) {
  const t = useT("entity");
  const locale = useLocale();
  const credit = localizeMediaCredit(info.credit, locale);
  const LICENSE_KEYS: Record<string, string> = {
    "publiek-domein": "creditPublicDomain",
    "logo-embed": "logoEmbedLicense",
    "logo-voorbehouden": "logoReservedLicense",
  };
  const license = LICENSE_KEYS[info.license] !== undefined ? t(LICENSE_KEYS[info.license]) : info.licenseLabel;
  return (
    <InfoTip
      label={t(kind === "emblem" ? "emblemCreditButton" : kind === "logo" ? "logoCreditButton" : "creditButton", { credit })}
      panelClassName="w-56 text-[11px]"
    >
      <p className="mb-1.5 font-semibold text-ink">{t(kind === "emblem" ? "emblemCreditHeading" : kind === "logo" ? "logoCreditHeading" : "creditHeading")}</p>
      <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-2 gap-y-1">
        <dt className="text-ink-faint">{t("creditAuthor")}</dt>
        <dd className="break-words">{info.author ?? t("creditAuthorUnknown")}</dd>
        <dt className="text-ink-faint">{t("creditLicense")}</dt>
        <dd className="break-words">
          {info.licenseUrl !== null ? (
            <a href={info.licenseUrl} target="_blank" rel="noopener noreferrer" className={`${LINK} inline-flex items-center pointer-coarse:min-h-11`}>
              {license}
            </a>
          ) : (
            license
          )}
        </dd>
        {info.sourceUrl !== null && info.siteName !== null ? (
          <>
            <dt className="text-ink-faint">{t("creditSource")}</dt>
            <dd className="break-words">
              <a href={info.sourceUrl} target="_blank" rel="noopener noreferrer" className={`${LINK} inline-flex items-center pointer-coarse:min-h-11`}>
                {info.siteName}
              </a>
            </dd>
          </>
        ) : null}
        {info.changed ? (
          <>
            <dt className="text-ink-faint">{t("creditChanges")}</dt>
            <dd className="break-words">{t("creditChangesText")}</dd>
          </>
        ) : null}
        {info.retrieved !== null ? (
          <>
            <dt className="text-ink-faint">{t("creditRetrieved")}</dt>
            <dd>
              <time dateTime={info.retrieved}>{formatDateIn(info.retrieved, locale, "short")}</time>
            </dd>
          </>
        ) : null}
      </dl>
      {info.shareAlike ? (
        <p className="mt-1.5 break-words">
          {t("creditShareAlike", { license: info.licenseLabel })}{" "}
          {info.licenseUrl !== null ? (
            <a href={info.licenseUrl} target="_blank" rel="noopener noreferrer" className={`${LINK} inline-flex items-center pointer-coarse:min-h-11`}>
              {t("creditShareAlikeLink")}
            </a>
          ) : null}
        </p>
      ) : null}
    </InfoTip>
  );
}
