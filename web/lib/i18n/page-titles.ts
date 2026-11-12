import { DICTS } from "@/lib/i18n/dict-registry";
import type { DictArea } from "@/lib/i18n/dicts";
import { SITE_NAME } from "@/lib/site";

/**
 * Tab titles come from Next's metadata in Dutch, as "Wijzigingen · Staatsgraaf".
 * The English name of a page is the English half of the dictionary entry its
 * Dutch name comes from (the nav labels, the page titles), so the language
 * switch can rename the tab without every page carrying a second title.
 */
const NAMED: [DictArea, string][] = [
  ["pages", "homeTitle"],
  ["common", "navChanges"],
  ["common", "navNews"],
  ["common", "navTopics"],
  ["common", "navBudget"],
  ["common", "navOrganizations"],
  ["common", "navPeople"],
  ["common", "navParties"],
  ["common", "navPositions"],
  ["pages", "aboutTitle"],
  ["pages", "datasetTitle"],
  ["pages", "privacyTitle"],
  ["pages", "accessTitle"],
  ["pages", "notFoundTitle"],
];

const ENGLISH_BY_DUTCH = new Map<string, string>(
  NAMED.map(([area, key]) => [DICTS[area][key].nl, DICTS[area][key].en]),
);

const BUDGET_NL = DICTS.common.navBudget.nl;
const BUDGET_EN = DICTS.common.navBudget.en;
const SUFFIX = ` · ${SITE_NAME}`;

/** One name in English: a page name, or "Begroting <organisation>" with the organisation kept. */
function nameInEnglish(dutch: string): string {
  const exact = ENGLISH_BY_DUTCH.get(dutch);
  if (exact !== undefined) return exact;
  if (dutch.startsWith(`${BUDGET_NL} `)) return `${BUDGET_EN} ${dutch.slice(BUDGET_NL.length + 1)}`;
  return dutch;
}

/**
 * The English tab title for a Dutch one, or null when there is nothing to
 * translate (a person, an organisation, a title that is already English).
 */
export function englishTitle(dutch: string): string | null {
  const suffixed = dutch.endsWith(SUFFIX);
  const name = suffixed ? dutch.slice(0, -SUFFIX.length) : dutch;
  const english = nameInEnglish(name);
  if (english === name) return null;
  return suffixed ? `${english}${SUFFIX}` : english;
}
