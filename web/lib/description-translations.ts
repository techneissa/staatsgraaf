import { createHash } from "node:crypto";
import { readOptionalDataFile } from "./data";
import type { DescriptionFlag, DescriptionTranslation } from "./types";

/**
 * English descriptions and provenance flags for Dutch descriptions. Server
 * only: it reads the dataset and hashes with node:crypto at build time.
 *
 * The hash formula is the shared contract in
 * shared/description-translation-hash.mjs (descriptionSourceHash): the first
 * 12 hex characters of sha256(description) over UTF-8.
 * web/lib/description-translations.test.mjs checks that both agree.
 */
export function descriptionHash(description: string): string {
  return createHash("sha256").update(description, "utf8").digest("hex").slice(0, 12);
}

let translations: Map<string, DescriptionTranslation> | null = null;
let flags: Set<string> | null = null;

function translationIndex(): Map<string, DescriptionTranslation> {
  if (translations) return translations;
  translations = new Map();
  for (const record of readOptionalDataFile<DescriptionTranslation>("description-translations.json")) {
    if (!record || typeof record.id !== "string" || record.language !== "en") continue;
    if (record.field !== "description" || typeof record.text !== "string" || record.text.trim() === "") continue;
    if (typeof record.sourceHash !== "string") continue;
    translations.set(record.id, record);
  }
  return translations;
}

function flagIndex(): Set<string> {
  if (flags) return flags;
  flags = new Set();
  for (const record of readOptionalDataFile<DescriptionFlag>("description-flags.json")) {
    if (record && typeof record.id === "string" && record.provenanceOnly === true) flags.add(record.id);
  }
  return flags;
}

/** True when the description of `id` only says where it came from, so it is not shown. */
export function isProvenanceOnly(id: string): boolean {
  return flagIndex().has(id);
}

/**
 * The English text for the Dutch description of `id`, or null when there is
 * none or when the Dutch text changed after it was translated.
 */
export function englishDescription(id: string, dutch: string | null | undefined): string | null {
  if (typeof dutch !== "string" || dutch.trim() === "") return null;
  const record = translationIndex().get(id);
  if (!record) return null;
  if (record.sourceHash !== descriptionHash(dutch)) return null;
  return record.text.trim();
}

export type DescriptionPair = { nl: string; en: string | null };

/** The description to show for an entity: null when absent or flagged as provenance only. */
export function descriptionFor(id: string, dutch: string | null | undefined): DescriptionPair | null {
  if (typeof dutch !== "string" || dutch.trim() === "") return null;
  if (isProvenanceOnly(id)) return null;
  return { nl: dutch.trim(), en: englishDescription(id, dutch) };
}
