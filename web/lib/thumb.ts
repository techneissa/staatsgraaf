/**
 * The small WebP copy of a portrait (scripts/build-thumbs.mjs), for places
 * that show it at avatar size. Anything that is not a portrait is returned
 * as it is.
 */
export function thumbUrl(url: string): string;
export function thumbUrl(url: string | null | undefined): string | null;
export function thumbUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const match = /^\/media\/portretten\/([^/]+)\.(?:jpe?g|png|webp)$/i.exec(url);
  return match ? `/media/portretten/klein/${match[1]}.webp` : url;
}
