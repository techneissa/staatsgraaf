/**
 * Comparability notes for budget records: where a year-on-year change in the
 * source is a change in what the chapter contains, not in what is spent.
 * Dataset-free, so tests and client components can import it. Each note names
 * its source; the figures come from research/L-budget-en-financien.md
 * ("Like-for-like check Infrastructuur en Waterstaat").
 */
export type BudgetComparabilityNote = {
  nl: string;
  en: string;
  /** Source id in data/sources.json that backs the note. */
  sourceId: string;
};

const NOTES: Record<string, BudgetComparabilityNote> = {
  "org:ministerie-van-infrastructuur-en-waterstaat": {
    nl:
      "Het bedrag voor 2026 is niet vergelijkbaar met 2025. In 2025 telde dit hoofdstuk nog artikel 26 " +
      "\"Bijdrage investeringsfondsen\" mee (€ 10,5 mld); vanaf 2026 staat dat artikel in de bron op 0. " +
      "Zonder dat artikel was het begrote bedrag voor 2025 € 4,11 mld, tegen € 4,10 mld in 2026. " +
      "De fondsen zelf zijn eigen begrotingshoofdstukken (2026: Mobiliteitsfonds € 11,2 mld, Deltafonds € 2,0 mld) " +
      "en zijn hier niet aan het ministerie toegerekend. Waarom het artikel is vervallen volgt niet uit de gegevens.",
    en:
      "The 2026 amount is not comparable with 2025. In 2025 this chapter still included article 26 " +
      "\"Contribution to investment funds\" (€10.5B); from 2026 that article is 0 in the source. " +
      "Without that article the 2025 budget was €4.11B, against €4.10B in 2026. " +
      "The funds themselves are separate budget chapters (2026: Mobility Fund €11.2B, Delta Fund €2.0B) " +
      "and are not counted under the ministry here. The data does not say why the article was dropped.",
    sourceId: "src:rijksfinancien-begrotingsstaten-2013-2027",
  },
};

export function budgetComparabilityNote(organizationId: string): BudgetComparabilityNote | null {
  return NOTES[organizationId] ?? null;
}
