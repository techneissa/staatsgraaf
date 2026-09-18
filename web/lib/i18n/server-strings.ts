import { pick } from "@/lib/i18n/dicts";
import type { DictArea } from "@/lib/i18n/dicts";
import { DICTS } from "@/lib/i18n/dict-registry";
import { DEFAULT_LOCALE } from "@/lib/i18n/locales";

/** Server-side lookup in the default locale (build-time copy stays Dutch). */
export function getS(area: DictArea, key: string): string {
  return pick(DICTS[area], key, DEFAULT_LOCALE);
}
