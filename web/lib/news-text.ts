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

/**
 * Where to cut a summary so it ends at a sentence, never mid-word. Returns the
 * cut length, or null when the text fits. A cut lands on the last sentence end
 * before `max` when that keeps at least forty percent of the budget; otherwise
 * on the last word boundary, which the caller marks with an ellipsis.
 */
export function sentenceCut(text: string, max: number): { at: number; clean: boolean } | null {
  if (text.length <= max) return null;
  const head = text.slice(0, max);
  let last = -1;
  for (const match of head.matchAll(/[.!?](?=\s|$)/g)) last = (match.index ?? 0) + 1;
  if (last >= max * 0.4) return { at: last, clean: true };
  const space = head.lastIndexOf(" ");
  return { at: space > 0 ? space : max, clean: false };
}

/** A plain summary cut at a sentence (see `sentenceCut`), with an ellipsis only when a sentence was broken. */
export function clampSentences(text: string, max = 260): string {
  const cut = sentenceCut(text, max);
  if (cut === null) return text;
  const head = text.slice(0, cut.at).trimEnd();
  return cut.clean ? head : `${head}\u2026`;
}

const ENTITY_TAG_SPLIT = /(<entity id="[^"]*">[^<]*<\/entity>)/g;

/**
 * The same cut for summary markup. The cut is found on the plain text and then
 * mapped back onto the markup, and it never lands inside an entity tag: if it
 * would, the whole tag is dropped so no link is left half open.
 */
export function clampMarkupSentences(markup: string, max = 260): string {
  const plain = plainMarkupText(markup) ?? "";
  const cut = sentenceCut(plain, max);
  if (cut === null) return markup;
  let seen = 0;
  let out = "";
  for (const token of markup.split(ENTITY_TAG_SPLIT)) {
    if (token === "") continue;
    const isTag = token.startsWith("<entity ");
    const visible = isTag ? (plainMarkupText(token) ?? "") : token;
    if (seen + visible.length <= cut.at) {
      out += token;
      seen += visible.length;
      continue;
    }
    if (!isTag) out += token.slice(0, cut.at - seen);
    break;
  }
  out = out.trimEnd();
  // Dropping a whole tag at the cut breaks the sentence even when the cut was clean.
  const kept = (plainMarkupText(out) ?? "").length;
  return cut.clean && kept >= cut.at - 1 ? out : `${out}\u2026`;
}

/** A plain lead cut at a sentence or a word (see `sentenceCut`); `clamped` says whether anything was left out. */
export function clampLead(text: string, max: number): { text: string; clamped: boolean } {
  return { text: clampSentences(text, max), clamped: sentenceCut(text, max) !== null };
}

/** The same for summary markup; the reader can expand to the whole lead when `clamped`. */
export function clampLeadMarkup(markup: string, max: number): { markup: string; clamped: boolean } {
  const plain = plainMarkupText(markup) ?? "";
  return { markup: clampMarkupSentences(markup, max), clamped: sentenceCut(plain, max) !== null };
}

export type LeadSegment =
  | { type: "text"; text: string }
  /** `first` is true for the first mention of an entity in the lead; later mentions render as plain text. */
  | { type: "mention"; id: string; text: string; first: boolean };

/** Summary markup as text and mention segments, with the first mention of each entity marked. */
export function leadSegments(markup: string): LeadSegment[] {
  const segments: LeadSegment[] = [];
  const seen = new Set<string>();
  let cursor = 0;
  for (const match of markup.matchAll(/<entity id="([^"]+)">([^<]*)<\/entity>/g)) {
    const index = match.index ?? 0;
    if (index > cursor) segments.push({ type: "text", text: markup.slice(cursor, index) });
    segments.push({ type: "mention", id: match[1], text: match[2], first: !seen.has(match[1]) });
    seen.add(match[1]);
    cursor = index + match[0].length;
  }
  if (cursor < markup.length) segments.push({ type: "text", text: markup.slice(cursor) });
  return segments;
}
