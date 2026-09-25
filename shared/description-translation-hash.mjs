/**
 * The shared contract between data/description-translations.json and every
 * reader of it. Pure JavaScript, the same SHA-256 as the news contract, so the
 * pipelines, the validator and the web app compute the same value.
 *
 * - descriptionSourceHash: the first 12 hex characters of
 *   sha256(description), UTF-8, of the Dutch description of an organization
 *   or person. A translation is only shown while its sourceHash equals this
 *   value for the current description.
 */
import { sha256Hex } from "./news-translation-hash.mjs";

export { sha256Hex };

/** The sourceHash a translation of this description must carry. */
export function descriptionSourceHash(description) {
  return sha256Hex(String(description ?? "")).slice(0, 12);
}
