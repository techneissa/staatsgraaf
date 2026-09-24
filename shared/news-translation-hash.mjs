/**
 * The shared contract between data/news-translations.json and every reader of
 * it. Pure JavaScript with no Node or browser APIs beyond TextEncoder, so the
 * pipelines, the validator, and the web app (server or client) compute the
 * same values.
 *
 * - translationSourceHash: the first 12 hex characters of
 *   sha256(title + "\n" + (summaryMarkup ?? "")), UTF-8. A translation is only
 *   shown while its sourceHash equals this value for the current news item.
 * - newsLead: the lead of a news item, meaning summaryMarkup with the headline
 *   prefix removed. A port of stripTitleFromMarkup in web/lib/news-text.ts;
 *   pipelines/translate.test.mjs checks that both agree on every news item.
 * - entityTags: every <entity id="...">...</entity> tag in a markup string.
 */

const K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

/** SHA-256 of a UTF-8 string, as lowercase hex. */
export function sha256Hex(text) {
  const bytes = new TextEncoder().encode(text);
  const bitLength = bytes.length * 8;
  const padded = new Uint8Array((((bytes.length + 9 + 63) >> 6) << 6));
  padded.set(bytes);
  padded[bytes.length] = 0x80;
  const view = new DataView(padded.buffer);
  view.setUint32(padded.length - 8, Math.floor(bitLength / 0x100000000));
  view.setUint32(padded.length - 4, bitLength >>> 0);

  const h = new Uint32Array([
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ]);
  const w = new Uint32Array(64);
  const rotr = (x, n) => (x >>> n) | (x << (32 - n));
  for (let offset = 0; offset < padded.length; offset += 64) {
    for (let i = 0; i < 16; i += 1) w[i] = view.getUint32(offset + i * 4);
    for (let i = 16; i < 64; i += 1) {
      const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
      const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
    }
    let [a, b, c, d, e, f, g, hh] = h;
    for (let i = 0; i < 64; i += 1) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const t1 = (hh + S1 + ch + K[i] + w[i]) >>> 0;
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const t2 = (S0 + maj) >>> 0;
      hh = g;
      g = f;
      f = e;
      e = (d + t1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (t1 + t2) >>> 0;
    }
    h[0] = (h[0] + a) >>> 0;
    h[1] = (h[1] + b) >>> 0;
    h[2] = (h[2] + c) >>> 0;
    h[3] = (h[3] + d) >>> 0;
    h[4] = (h[4] + e) >>> 0;
    h[5] = (h[5] + f) >>> 0;
    h[6] = (h[6] + g) >>> 0;
    h[7] = (h[7] + hh) >>> 0;
  }
  return Array.from(h, (x) => x.toString(16).padStart(8, "0")).join("");
}

/** The sourceHash a translation of this news item must carry. */
export function translationSourceHash(title, summaryMarkup) {
  return sha256Hex(`${title}\n${summaryMarkup ?? ""}`).slice(0, 12);
}

const ENTITY_TAG = /<entity id="[^"]*">[^<]*<\/entity>/g;

/** Every entity tag in a markup string, in order, as the exact source bytes. */
export function entityTags(markup) {
  if (typeof markup !== "string") return [];
  return markup.match(ENTITY_TAG) ?? [];
}

function plainMarkupText(markup) {
  return markup.replaceAll(/<entity id="[^"]*">([^<]*)<\/entity>/g, "$1");
}

/**
 * The lead of a news item: summaryMarkup without the "Kop — " prefix. Null
 * when nothing informative remains. Mirrors stripTitleFromMarkup in
 * web/lib/news-text.ts line for line; keep them in step.
 */
export function newsLead(summaryMarkup, title) {
  if (summaryMarkup === null || summaryMarkup === undefined) return null;
  const markup = summaryMarkup;
  const plain = plainMarkupText(markup);
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
  const emitText = (text) => {
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
      result += surface.slice(cut - plainIndex);
    }
    plainIndex += surface.length;
    cursor = tag.index + tag[0].length;
  }
  emitText(markup.slice(cursor));
  const stripped = result.trim();
  return stripped === "" ? null : stripped;
}

/** The target language for a news item: nl items get en, en items get nl. */
export function translationTargetLanguage(item) {
  return (item.language ?? "nl") === "en" ? "nl" : "en";
}
