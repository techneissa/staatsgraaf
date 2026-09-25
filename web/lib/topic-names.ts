/**
 * English names for the topics in data/topics.json. Topics are this project's
 * own grouping, not the name of a body, so unlike organisation and position
 * names they get a plain English equivalent. Browser-safe: no dataset import.
 */
export const TOPIC_NAME_EN: Readonly<Record<string, string>> = Object.freeze({
  arbeidsmarkt: "Labour market",
  "asiel-en-migratie": "Asylum and migration",
  infrastructuur: "Infrastructure",
  "klimaat-en-energie": "Climate and energy",
  koninkrijksrelaties: "Kingdom relations",
  onderwijs: "Education",
  "openbaar-bestuur-en-democratie": "Public administration and democracy",
  "stikstof-en-landbouw": "Nitrogen and agriculture",
  toeslagen: "Benefits",
  veiligheid: "Security",
  wonen: "Housing",
  zorg: "Health care",
});

/** The English name of a topic, or the Dutch name when none is recorded. */
export function topicNameEn(slug: string, dutch: string): string {
  return TOPIC_NAME_EN[slug] ?? dutch;
}
