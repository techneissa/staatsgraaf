/**
 * Pure text helpers over the news summary markup. No data access, so they run
 * in the client explorer and on server pages alike.
 */

/** The text of a summaryMarkup string with the entity tags stripped. */
export function plainMarkupText(markup: string | null): string | null {
  if (markup === null) return null;
  return markup.replaceAll(/<entity id="[^"]*">([^<]*)<\/entity>/g, "$1");
}

/** True when a summary text is the headline (or near enough) rather than new information. */
export function summaryRepeatsTitle(text: string | null, title: string): boolean {
  if (text === null) return true;
  const normalize = (value: string): string => value.replaceAll(/\s+/g, " ").trim();
  const plain = normalize(text);
  if (plain.length === 0) return true;
  return plain === normalize(title);
}
