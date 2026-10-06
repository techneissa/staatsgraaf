/**
 * Whether an error message says that a script file of the site could not be
 * loaded. After a deploy the old files are gone, so a tab left open from before
 * it fails on the next click or the next lazy import; the cure is a reload.
 */
const CHUNK_ERROR = /ChunkLoadError|Loading chunk [\w-]+ failed|Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed|Failed to load chunk/i;

export function isChunkLoadError(message: unknown): boolean {
  return typeof message === "string" && CHUNK_ERROR.test(message);
}

/** One automatic reload per window, so a file that is really missing cannot loop. */
export const CHUNK_RELOAD_WINDOW_MS = 30_000;

export function shouldReloadForChunkError(lastReloadAt: number | null, now: number): boolean {
  return lastReloadAt === null || now - lastReloadAt > CHUNK_RELOAD_WINDOW_MS;
}
