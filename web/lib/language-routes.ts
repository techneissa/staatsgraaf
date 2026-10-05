/**
 * Routes that exist in both languages. Most pages are one route whose text the
 * language switch swaps in the browser; the news pages also have an English
 * twin under /news/ with its own title, description and language alternates
 * (ADR 0007). The language toggle uses this table to move between the twins
 * instead of flipping the text under the wrong address, and a page passes the
 * same pair to `pageMetadata({ alternateLanguages })` for its hreflang links.
 *
 * To give another section an English twin, add one rule here.
 */

export type LanguageTwin = { nl: string; en: string };

const DATE = "\\d{4}-\\d{2}-\\d{2}";

const RULES: { nl: RegExp; en: RegExp; toEn: (m: RegExpMatchArray) => string; toNl: (m: RegExpMatchArray) => string }[] = [
  { nl: /^\/nieuws\/$/, en: /^\/news\/$/, toEn: () => "/news/", toNl: () => "/nieuws/" },
  { nl: /^\/nieuws\/bronnen\/$/, en: /^\/news\/sources\/$/, toEn: () => "/news/sources/", toNl: () => "/nieuws/bronnen/" },
  {
    nl: new RegExp(`^/nieuws/(${DATE})/$`),
    en: new RegExp(`^/news/(${DATE})/$`),
    toEn: (m) => `/news/${m[1]}/`,
    toNl: (m) => `/nieuws/${m[1]}/`,
  },
];

function withSlash(pathname: string): string {
  return pathname.endsWith("/") ? pathname : `${pathname}/`;
}

/** The Dutch and English route of this page when it has both, else null. */
export function languageTwin(pathname: string | null): LanguageTwin | null {
  if (pathname === null) return null;
  const path = withSlash(pathname);
  for (const rule of RULES) {
    const dutch = path.match(rule.nl);
    if (dutch) return { nl: path, en: rule.toEn(dutch) };
    const english = path.match(rule.en);
    if (english) return { nl: rule.toNl(english), en: path };
  }
  return null;
}

/** True on the English twin of a page (the address says English, whatever the stored choice is). */
export function isEnglishRoute(pathname: string | null): boolean {
  const twin = languageTwin(pathname);
  return twin !== null && pathname !== null && withSlash(pathname) === twin.en;
}
