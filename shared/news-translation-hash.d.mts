/** Types for shared/news-translation-hash.mjs. */
export function sha256Hex(text: string): string;
export function translationSourceHash(title: string, summaryMarkup: string | null | undefined): string;
export function entityTags(markup: string | null | undefined): string[];
export function newsLead(summaryMarkup: string | null | undefined, title: string): string | null;
export function translationTargetLanguage(item: { language?: string | null }): "nl" | "en";
