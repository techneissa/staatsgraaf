/**
 * Pure helpers for the news preview tile. No data access, so they run in the
 * client explorer and in tests alike.
 */

const STOP_WORDS = new Set(["de", "het", "een", "the", "van", "nl", "en"]);

/**
 * Two or three letters that stand for an outlet: "NOS", "NU", "dV" for
 * de Volkskrant, "BB" for Binnenlands Bestuur. Only the outlet name is used,
 * never an image from the outlet.
 */
export function newsMonogram(publisher: string): string {
  const words = publisher
    .replace(/\.(nl|com|org)\b/gi, "")
    .split(/[\s-]+/)
    .filter((word) => word.length > 0);
  const significant = words.filter((word) => !STOP_WORDS.has(word.toLowerCase()));
  const parts = significant.length > 0 ? significant : words;
  if (parts.length === 0) return "?";
  if (parts.length === 1) {
    const word = parts[0];
    return word.length <= 3 ? word.toUpperCase() : word.slice(0, 2).toUpperCase();
  }
  return parts
    .slice(0, 3)
    .map((word) => word.charAt(0))
    .join("")
    .toUpperCase();
}

/**
 * The credit line for a preview, or null when the tile is a monogram. Pure, so
 * server pages and the client explorer can call it.
 */
export function newsPreviewCaption(preview: {
  kind: string;
  caption?: string | null;
}): string | null {
  return preview.kind === "monogram" ? null : preview.caption ?? null;
}
