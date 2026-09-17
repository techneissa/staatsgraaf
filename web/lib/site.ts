export const SITE_NAME = "NL Overheid Graph";
export const SCOPE_LABEL = "NL Rijk";
export const SITE_TAGLINE =
  "Een open, bronvaste kaart van de Nederlandse rijksoverheid: organisaties, posities, personen en hun verbindingen.";

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/+$/, "");

export const THEME_STORAGE_KEY = "nl-overheid-graph-theme";

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
