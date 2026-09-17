import type {
  ChangeKind,
  EndReason,
  EntryMode,
  FillMethod,
  OrgBranch,
  OrgSubtype,
  OrgType,
} from "./types";

export const ORG_TYPE_LABELS: Record<OrgType, string> = {
  department: "Departementen en organen",
  elected: "Gekozen organen",
  commission: "Commissies",
  advisory: "Adviesorganen",
  dept_head: "Hoofdposities",
  constituency: "Kiesgerechtigden",
};

export const ORG_SUBTYPE_LABELS: Record<OrgSubtype, string> = {
  "kiesgerechtigden-nederland": "Kiesgerechtigden Nederland",
  "kiezers-caribisch-nederland": "Kiezers Caribisch Nederland",
  "tweede-kamer": "Tweede Kamer",
  "eerste-kamer": "Eerste Kamer",
  "provinciale-staten": "Provinciale Staten",
  gemeenteraad: "Gemeenteraad",
  "algemeen-bestuur-waterschap": "Algemeen bestuur waterschap",
  eilandsraad: "Eilandsraad",
  "europees-parlement": "Europees Parlement",
  ministerie: "Ministerie",
  agentschap: "Agentschap",
  uitvoeringsorganisatie: "Uitvoeringsorganisatie",
  inspectie: "Inspectie",
  zbo: "Zelfstandig bestuursorgaan",
  rwt: "Rechtspersoon met wettelijke taak",
  toezichthouder: "Toezichthouder",
  "rechterlijke-instantie": "Rechterlijke instantie",
  "hoge-college": "Hoge college van staat",
  adviescollege: "Adviescollege",
  planbureau: "Planbureau",
  kiesraad: "Kiesraad",
  provincie: "Provincie",
  gemeente: "Gemeente",
  waterschap: "Waterschap",
  "openbaar-lichaam-bes": "Openbaar lichaam BES",
  samenwerkingsverband: "Samenwerkingsverband",
  veiligheidsregio: "Veiligheidsregio",
  defensieonderdeel: "Defensieonderdeel",
  koninkrijksorgaan: "Koninkrijksorgaan",
  "land-regering": "Regering",
  "staten-land": "Staten van het land",
  staatscommissie: "Staatscommissie",
  commissie: "Commissie",
  "raad-van-advies": "Raad van advies",
};

export const ORG_BRANCH_LABELS: Record<OrgBranch, string> = {
  regering: "Regering",
  "staten-generaal": "Staten-Generaal",
  "rechterlijke-macht": "Rechterlijke macht",
  "hoge-colleges": "Hoge colleges van staat",
  adviescolleges: "Adviescolleges",
  "decentraal-provinciaal": "Provincies",
  "decentraal-lokaal": "Gemeenten",
  waterschap: "Waterschappen",
  "caribisch-nederland": "Caribisch Nederland",
  koninkrijk: "Koninkrijk",
  zelfstandig: "Zelfstandige organen",
};

export const FILL_METHOD_LABELS: Record<FillMethod, string> = {
  verkiezing: "Verkiezing",
  "koninklijk-besluit": "Koninklijk besluit",
  "benoeming-door-college": "Benoeming door een college",
  "benoeming-door-minister": "Benoeming door een minister",
  "van-rechtswege": "Van rechtswege",
  cooptatie: "Cooptatie",
};

export const ENTRY_MODE_LABELS: Record<EntryMode, string> = {
  benoemd: "Benoemd",
  "benoemd-bij-kb": "Benoemd bij koninklijk besluit",
  gekozen: "Gekozen",
  waarnemend: "Waarnemend",
  plaatsvervangend: "Plaatsvervangend",
  "van-rechtswege": "Van rechtswege",
};

export const END_REASON_LABELS: Record<EndReason, string> = {
  aftreden: "Afgetreden",
  ontslag: "Ontslag",
  "einde-termijn": "Einde termijn",
  overlijden: "Overlijden",
  reorganisatie: "Reorganisatie",
};

export const CHANGE_KIND_LABELS: Record<ChangeKind, string> = {
  "tenure-between": "Overdracht",
  appointment: "Aanstelling",
  departure: "Vertrek",
  structural: "Structuurwijziging",
  vacancy: "Vacature",
  rename: "Naamswijziging",
  move: "Verplaatsing",
};

export function labelFor<T extends string>(
  map: Partial<Record<T, string>>,
  key: T | null | undefined,
): string | null {
  if (!key) return null;
  return map[key] ?? key;
}
