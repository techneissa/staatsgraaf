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

/**
 * The news pipeline prefixes its plain summary with the publisher and the
 * headline ("Trouw bericht: \"Kop\""), so the card would repeat its own title.
 * This removes that prefix, leaving the article text.
 */
export function stripPublisherPrefix(text: string | null, title: string): string {
  if (text === null) return "";
  const titlePattern = title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replaceAll(/\s+/g, "\\s+");
  const prefix = new RegExp(
    `^\\s*[^:]{0,60}bericht:\\s*[\u201c"\u201d]?\\s*${titlePattern}\\s*[\u201c"\u201d]?\\s*`,
  );
  return text.replaceAll(/\s+/g, " ").replace(prefix, "").trim();
}

/** True when a summary holds nothing beyond the publisher-headline prefix. */
export function summaryIsPublisherEcho(text: string | null, title: string): boolean {
  if (text === null) return true;
  return stripPublisherPrefix(text, title) === "";
}

/** The length of the plain text inside an `<entity>` tag. */
function entitySurfaceLength(tag: string): number {
  return tag.replaceAll(/<[^>]*>/g, "").length;
}

/**
 * The pipeline links entities over headline and lede ("Kop — inleiding"), so a
 * card would render its own heading as the first words of its summary. This
 * returns the markup with the headline and the separating dash removed, so the
 * card shows the article text only. Null when nothing informative remains
 * (less than a sentence's worth) or when the markup does not start with the
 * headline followed by a dash.
 */
export function stripTitleFromMarkup(markup: string | null, title: string): string | null {
  if (markup === null) return null;
  const plain = plainMarkupText(markup) ?? "";
  const titlePattern = title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replaceAll(/\s+/g, "\\s+");
  const prefix = new RegExp(`^\\s*${titlePattern}\\s*[\\u2013\\u2014-]+\\s*`).exec(plain);
  if (prefix === null) {
    if (plain.replaceAll(/\s+/g, " ").trim() === title.replaceAll(/\s+/g, " ").trim()) return null;
    return plain.trim() === "" ? null : markup;
  }
  const cut = prefix[0].length;
  if (plain.length - cut < 24) return null;

  let plainIndex = 0;
  let result = "";
  let cursor = 0;
  const emitText = (text: string) => {
    if (plainIndex >= cut) result += text;
    else if (plainIndex + text.length >= cut) result += text.slice(cut - plainIndex);
    plainIndex += text.length;
  };
  for (const tag of markup.matchAll(/<entity id="[^"]*">[^<]*<\/entity>/g)) {
    emitText(markup.slice(cursor, tag.index));
    const surface = tag[0].replaceAll(/<[^>]*>/g, "");
    if (plainIndex >= cut) {
      result += tag[0];
    } else if (plainIndex + surface.length >= cut) {
      // A mention straddles the cut: keep the plain text after it and drop the link.
      result += surface.slice(cut - plainIndex);
    }
    plainIndex += surface.length;
    cursor = tag.index + tag[0].length;
  }
  emitText(markup.slice(cursor));
  const stripped = result.trim();
  return stripped === "" ? null : stripped;
}
