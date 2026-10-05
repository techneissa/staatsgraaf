import type { Metadata } from "next";

export const SITE_NAME = "Staatsgraaf";
export const SCOPE_LABEL = "NL Rijk";
export const SITE_TAGLINE =
  "Een open, bronvaste kaart van de Nederlandse rijksoverheid: organisaties, posities, personen en hun verbindingen.";

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/+$/, "");

export const THEME_STORAGE_KEY = "staatsgraaf-theme";

export const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem(${JSON.stringify(
  THEME_STORAGE_KEY,
)});if(t==="light"||t==="dark"){document.documentElement.setAttribute("data-theme",t)}}catch(e){}})();`;

export function absoluteUrl(path: string): string | undefined {
  return SITE_URL ? `${SITE_URL}${path}` : undefined;
}

export function canonical(path: string): { canonical: string } | undefined {
  const url = absoluteUrl(path);
  return url ? { canonical: url } : undefined;
}

/** The Dutch and English route of a page that exists in both; see lib/language-routes.ts. */
export type AlternateLanguages = { nl: string; en: string };

/**
 * `<link rel="alternate" hreflang>` entries for a page with an English twin:
 * both languages, and the Dutch route as the default for everyone else. Like
 * the canonical link they need an absolute address, so they appear when the
 * site URL is known (production).
 */
export function languageAlternates(pair: AlternateLanguages): Record<string, string> | undefined {
  const nl = absoluteUrl(pair.nl);
  const en = absoluteUrl(pair.en);
  if (nl === undefined || en === undefined) return undefined;
  return { "nl-NL": nl, "en-GB": en, "x-default": nl };
}

export type PageMetadataOptions = {
  title: string;
  description: string;
  path: string;
  absoluteTitle?: boolean;
  snapshotDate?: string | null;
  /** Set on pages that exist in Dutch and English at two routes (the news pages): emits hreflang alternates. */
  alternateLanguages?: AlternateLanguages;
};

export function pageMetadata({
  title,
  description,
  path,
  absoluteTitle = false,
  snapshotDate = null,
  alternateLanguages,
}: PageMetadataOptions): Metadata {
  const url = absoluteUrl(path);
  const languages = alternateLanguages ? languageAlternates(alternateLanguages) : undefined;
  const alternates = canonical(path);
  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    alternates: languages !== undefined && alternates !== undefined ? { ...alternates, languages } : alternates,
    openGraph: {
      type: "website",
      locale: "nl_NL",
      siteName: SITE_NAME,
      title,
      description,
      ...(url !== undefined ? { url } : {}),
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
    ...(snapshotDate !== null && snapshotDate !== ""
      ? { other: { "dcterms.modified": snapshotDate } }
      : {}),
  };
}
