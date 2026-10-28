/**
 * The record counts on the Dataset page. A data file has a count only when it
 * is a list; an object (meta.json) has no natural "record", so it gets none
 * rather than a made-up number.
 */

/** Number of records in a parsed data file; null when the file is not a list. */
export function recordCount(value: unknown): number | null {
  return Array.isArray(value) ? value.length : null;
}

/** Number of files a parsed manifest.json lists; null when it has no file list. */
export function manifestFileCount(value: unknown): number | null {
  if (typeof value !== "object" || value === null) return null;
  const files = (value as { files?: unknown }).files;
  return Array.isArray(files) ? files.length : null;
}
