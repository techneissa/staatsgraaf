const longDate = new Intl.DateTimeFormat("nl-NL", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

const shortDate = new Intl.DateTimeFormat("nl-NL", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

const dateTime = new Intl.DateTimeFormat("nl-NL", {
  day: "numeric",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const clockTime = new Intl.DateTimeFormat("nl-NL", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Amsterdam",
});

const dateTimeAmsterdam = new Intl.DateTimeFormat("nl-NL", {
  day: "numeric",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Amsterdam",
});

const number = new Intl.NumberFormat("nl-NL");

function parse(iso: string): Date {
  return new Date(`${iso.slice(0, 10)}T00:00:00Z`);
}

export function formatDate(iso: string): string {
  return longDate.format(parse(iso));
}

export function formatDateShort(iso: string): string {
  return shortDate.format(parse(iso));
}

export function formatDateTime(iso: string): string {
  return dateTime.format(new Date(iso));
}

export function formatCount(value: number): string {
  return number.format(value);
}

export function formatPeriod(start: string | null, end: string | null): string {
  // A start the source does not give (ADR 0020): "Huidig", or only the end.
  if (start === null) return end === null ? "Huidig" : `Tot ${formatDate(end)}`;
  if (end === null) return `Sinds ${formatDate(start)}`;
  return `${formatDate(start)} tot ${formatDate(end)}`;
}

export function formatPeriodShort(start: string | null, end: string | null): string {
  if (start === null) return end === null ? "Huidig" : `Tot ${formatDateShort(end)}`;
  if (end === null) return `Sinds ${formatDateShort(start)}`;
  return `${formatDateShort(start)} tot ${formatDateShort(end)}`;
}

/** Wall-clock time in Nederland (Europe/Amsterdam) for an ISO timestamp, for example "09:00". */
export function formatClockTime(iso: string): string {
  return clockTime.format(new Date(iso));
}

/** Full date and wall-clock time in Nederland (Europe/Amsterdam) for an ISO timestamp. */
export function formatDateTimeLocal(iso: string): string {
  return dateTimeAmsterdam.format(new Date(iso));
}

/** Site locale for the locale-aware formatters below; mirrors lib/i18n/locales. */
export type FormatLocale = "nl" | "en";

const localeFormatters = new Map<string, Intl.DateTimeFormat>();

function dateFormatterFor(locale: FormatLocale, style: "long" | "short"): Intl.DateTimeFormat {
  const key = `${locale}-${style}`;
  let formatter = localeFormatters.get(key);
  if (formatter === undefined) {
    formatter = new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "nl-NL", {
      day: "numeric",
      month: style,
      year: "numeric",
      timeZone: "UTC",
    });
    localeFormatters.set(key, formatter);
  }
  return formatter;
}

/** A calendar date in the site locale: "18 september 2026" or "18 September 2026". */
export function formatDateIn(iso: string, locale: FormatLocale, style: "long" | "short" = "long"): string {
  return dateFormatterFor(locale, style).format(parse(iso));
}

/** A period in the site locale: "Sinds 3 jan 2024" or "Since 3 Jan 2024", "A tot B" or "A to B". */
export function formatPeriodIn(
  start: string | null,
  end: string | null,
  locale: FormatLocale,
  style: "long" | "short" = "long",
): string {
  // A start the source does not give (ADR 0020): "Current", or only the end.
  if (start === null) {
    if (end === null) return locale === "en" ? "Current" : "Huidig";
    const until = formatDateIn(end, locale, style);
    return locale === "en" ? `Until ${until}` : `Tot ${until}`;
  }
  const from = formatDateIn(start, locale, style);
  if (end === null) return locale === "en" ? `Since ${from}` : `Sinds ${from}`;
  const to = formatDateIn(end, locale, style);
  return locale === "en" ? `${from} to ${to}` : `${from} tot ${to}`;
}

/** A count in the site locale: "12.345" or "12,345". */
export function formatCountIn(value: number, locale: FormatLocale): string {
  return new Intl.NumberFormat(locale === "en" ? "en-GB" : "nl-NL").format(value);
}

/**
 * A portrait or coat of arms credit in the site locale. Credits follow one
 * fixed Dutch pattern ("Foto: maker, licentie, via ...", "Wapen: ..."); in English
 * only the fixed words of that pattern change. The maker, the licence and any
 * names stay exactly as recorded.
 */
const CREDIT_PHRASES_EN: Array<[RegExp, string]> = [
  [/^Foto: /, "Photo: "],
  [/^Wapen: /, "Coat of arms: "],
  [/^Logo: getoond vanaf /, "Logo: shown from "],
  [/^Logo: auteursrecht voorbehouden, te zien op /, "Logo: copyright reserved, see "],
  [/, via het Open Data Portaal van de Tweede Kamer/, ", via the Open Data Portal of the Tweede Kamer"],
  [/, publiek-domein,/, ", public domain,"],
  [/auteur niet vermeld/, "author not stated"],
  [/vrijgegeven door/, "released by"],
  [/hergebruik volgens/, "reuse under"],
  [/Houder van het auteursrecht/, "Copyright holder"],
  [/, verkleind en bijgesneden$/, ", resized and cropped"],
];

export function localizeCredit(credit: string, locale: FormatLocale): string {
  if (locale !== "en") return credit;
  let out = credit;
  for (const [pattern, replacement] of CREDIT_PHRASES_EN) out = out.replace(pattern, replacement);
  return out;
}
