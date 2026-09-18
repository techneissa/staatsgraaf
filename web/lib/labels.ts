import type {
  ChangeKind,
  EndReason,
  EntryMode,
  FillMethod,
  OrgBranch,
  OrgLevel,
  OrgSubtype,
  OrgType,
} from "./types";

export const ORG_LEVEL_LABELS: Record<OrgLevel, string> = {
  rijk: "Rijk",
  provinciaal: "Provinciaal",
  regionaal: "Regionaal",
  lokaal: "Lokaal",
  caribisch: "Caribisch",
  koninkrijk: "Koninkrijk",
};

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

/** English label maps for client-side locale switching. Dutch constants above stay the build-time default. */
export const ORG_TYPE_LABELS_EN: Record<OrgType, string> = {
  department: "Departments and bodies",
  elected: "Elected bodies",
  commission: "Commissions",
  advisory: "Advisory bodies",
  dept_head: "Head positions",
  constituency: "Electoral college",
};

export const ORG_SUBTYPE_LABELS_EN: Record<OrgSubtype, string> = {
  "kiesgerechtigden-nederland": "Dutch electorate",
  "kiezers-caribisch-nederland": "Caribbean Netherlands electorate",
  "tweede-kamer": "House of Representatives",
  "eerste-kamer": "Senate",
  "provinciale-staten": "Provincial council",
  gemeenteraad: "Municipal council",
  "algemeen-bestuur-waterschap": "Water board general board",
  eilandsraad: "Island council",
  "europees-parlement": "European Parliament",
  ministerie: "Ministry",
  agentschap: "Agency",
  uitvoeringsorganisatie: "Implementing organization",
  inspectie: "Inspectorate",
  zbo: "Independent administrative authority",
  rwt: "Legal entity with statutory task",
  toezichthouder: "Regulator",
  "rechterlijke-instantie": "Judicial body",
  "hoge-college": "High council of state",
  adviescollege: "Advisory council",
  planbureau: "Planning bureau",
  kiesraad: "Electoral council",
  provincie: "Province",
  gemeente: "Municipality",
  waterschap: "Water board",
  "openbaar-lichaam-bes": "Public entity BES",
  samenwerkingsverband: "Collaborative arrangement",
  veiligheidsregio: "Safety region",
  defensieonderdeel: "Defence unit",
  koninkrijksorgaan: "Kingdom body",
  "land-regering": "Government",
  "staten-land": "Parliament",
  staatscommissie: "State commission",
  commissie: "Commission",
  "raad-van-advies": "Council of advice",
};

export const ORG_BRANCH_LABELS_EN: Record<OrgBranch, string> = {
  regering: "Government",
  "staten-generaal": "States General",
  "rechterlijke-macht": "Judiciary",
  "hoge-colleges": "High councils of state",
  adviescolleges: "Advisory councils",
  "decentraal-provinciaal": "Provinces",
  "decentraal-lokaal": "Municipalities",
  waterschap: "Water boards",
  "caribisch-nederland": "Caribbean Netherlands",
  koninkrijk: "Kingdom",
  zelfstandig: "Independent bodies",
};

export const ORG_LEVEL_LABELS_EN: Record<OrgLevel, string> = {
  rijk: "National",
  provinciaal: "Provincial",
  regionaal: "Regional",
  lokaal: "Local",
  caribisch: "Caribbean",
  koninkrijk: "Kingdom",
};

export const FILL_METHOD_LABELS_EN: Record<FillMethod, string> = {
  verkiezing: "Election",
  "koninklijk-besluit": "Royal decree",
  "benoeming-door-college": "Appointment by a council",
  "benoeming-door-minister": "Appointment by a minister",
  "van-rechtswege": "Ex officio",
  cooptatie: "Co-optation",
};

export const ENTRY_MODE_LABELS_EN: Record<EntryMode, string> = {
  benoemd: "Appointed",
  "benoemd-bij-kb": "Appointed by royal decree",
  gekozen: "Elected",
  waarnemend: "Acting",
  plaatsvervangend: "Substitute",
  "van-rechtswege": "Ex officio",
};

export const END_REASON_LABELS_EN: Record<EndReason, string> = {
  aftreden: "Resigned",
  ontslag: "Dismissed",
  "einde-termijn": "End of term",
  overlijden: "Deceased",
  reorganisatie: "Reorganisation",
};

export const CHANGE_KIND_LABELS_EN: Record<ChangeKind, string> = {
  "tenure-between": "Handover",
  appointment: "Appointment",
  departure: "Departure",
  structural: "Structural change",
  vacancy: "Vacancy",
  rename: "Rename",
  move: "Move",
};
