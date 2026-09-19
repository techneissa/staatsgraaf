import type { LocString } from "./locales";

/**
 * Owned by the graph canvas area. Extend with graph-specific strings only.
 * Branch, type, subtype, and glyph-shape names are exported as small typed
 * maps so graph components can render both locales without touching the
 * shared labels.ts.
 */
export const GRAPH_DICT = {
  graphHint: {
    nl: "Netwerk van Nederlandse overheidsorganisaties. Gebruik de pijltjestoetsen om te bladeren, Enter om te openen en Escape om te wissen.",
    en: "Network of Dutch government organizations. Use the arrow keys to browse, Enter to open and Escape to clear.",
  },
  graphInstructions: {
    nl: "De grafiek toont de staat als ringen rond de Grondwet: hoe verder naar buiten, hoe zelfstandiger het orgaan. De buitenste cirkel zijn de kiesgerechtigden. Klik een orgaan om de kaart te draaien tot het bovenaan staat en zijn verbindingen uit te klappen; klik een ring of sector om die te selecteren. Pijltjestoetsen verplaatsen de selectie, spatie klapt verbindingen uit of in, Enter opent de organisatie, Escape klapt in en wist daarna de selectie. De blokhaken draaien de kaart, plus en min zoomen, nul herstelt het beeld. Slepen buiten de buitenste ring draait de kaart als een knop.",
    en: "The graph shows the state as rings around the constitution: the farther out, the more autonomous the body. The outer circle is the electorate. Click a body to turn the map until it sits at the top and to expand its connections; click a ring or sector to select it. Arrow keys move the selection, space expands or collapses connections, Enter opens the organization, Escape collapses and then clears the selection. The bracket keys turn the map, plus and minus zoom, zero resets the view. Dragging outside the outer ring turns the map like a dial.",
  },
  coreTitle: {
    nl: "Grondwet",
    en: "Constitution",
  },
  coreSubtitle: {
    nl: "en Statuut",
    en: "and Charter",
  },
  haloShow: {
    nl: "Toon {n} verbonden organen",
    en: "Show {n} connected bodies",
  },
  haloHide: {
    nl: "Verberg verbonden organen",
    en: "Hide connected bodies",
  },
  haloStatus: {
    nl: "{n} verbonden organen uitgeklapt rond {name}.",
    en: "{n} connected bodies expanded around {name}.",
  },
  sectorStatus: {
    nl: "{name} geselecteerd, {n} organen.",
    en: "{name} selected, {n} bodies.",
  },
  noSelection: {
    nl: "Geen organisatie geselecteerd.",
    en: "No organization selected.",
  },
  hubStatus: {
    nl: "{name}, de kiesgerechtigden van Nederland.",
    en: "{name}, the electorate of the Netherlands.",
  },
  connections: {
    nl: "{n} verbindingen",
    en: "{n} connections",
  },
  connectionsOne: {
    nl: "1 verbinding",
    en: "1 connection",
  },
  connectionAria: {
    nl: "Verbindingen van {name}",
    en: "Connections of {name}",
  },
  listTitle: {
    nl: "Lijst van organisaties",
    en: "Organization list",
  },
  edgeOut: {
    nl: "{verb} {neighbour}",
    en: "{verb} {neighbour}",
  },
  edgeIn: {
    nl: "{neighbour} {verb} dit orgaan",
    en: "{neighbour} {verb} this body",
  },
  sectorLegendTitle: {
    nl: "Sectoren",
    en: "Sectors",
  },
  entityLegendTitle: {
    nl: "Entiteiten",
    en: "Entities",
  },
  relationshipLegendTitle: {
    nl: "Relaties",
    en: "Relationships",
  },
  shapeShield: {
    nl: "Ministerie en defensieonderdeel",
    en: "Ministry and defence unit",
  },
  shapeHex: {
    nl: "Agentschap, uitvoering of inspectie",
    en: "Agency, executive body or inspectorate",
  },
  shapeCapsule: {
    nl: "Zbo, rwt of toezichthouder",
    en: "Independent body, legal entity or regulator",
  },
  shapeDiamond: {
    nl: "Rechterlijke instantie, hoge college of kiesraad",
    en: "Judicial body, high council or electoral board",
  },
  shapeTriangle: {
    nl: "Adviescollege, planbureau of staatscommissie",
    en: "Advisory body, planning bureau or state commission",
  },
  shapeSeat: {
    nl: "Gekozen orgaan",
    en: "Elected body",
  },
  shapeDot: {
    nl: "Decentrale of monarchale organisatie",
    en: "Decentralized or monarch-related body",
  },
  shapeSmallDot: {
    nl: "Commissie",
    en: "Committee",
  },
  zoomIn: {
    nl: "Inzoomen",
    en: "Zoom in",
  },
  zoomOut: {
    nl: "Uitzoomen",
    en: "Zoom out",
  },
  zoomReset: {
    nl: "Beeld herstellen",
    en: "Reset view",
  },
  selectionDetails: {
    nl: "Details van de geselecteerde organisatie",
    en: "Details of the selected organization",
  },
  viewToggleGroup: {
    nl: "Weergave van de grafiek",
    en: "Graph view switch",
  },
} as const satisfies Record<string, LocString>;

export type DictAreaKey = keyof typeof GRAPH_DICT;

/** Bilingual labels for the eleven top-level branches (Dutch names unchanged). */
export const BRANCH_LABELS_I18N: Record<string, LocString> = {
  regering: { nl: "Regering", en: "Government" },
  "staten-generaal": { nl: "Staten-Generaal", en: "States General" },
  "rechterlijke-macht": { nl: "Rechterlijke macht", en: "Judiciary" },
  "hoge-colleges": { nl: "Hoge colleges van staat", en: "High councils of state" },
  adviescolleges: { nl: "Adviescolleges", en: "Advisory councils" },
  "decentraal-provinciaal": { nl: "Provincies", en: "Provinces" },
  "decentraal-lokaal": { nl: "Gemeenten", en: "Municipalities" },
  waterschap: { nl: "Waterschappen", en: "Water boards" },
  "caribisch-nederland": { nl: "Caribisch Nederland", en: "Caribbean Netherlands" },
  koninkrijk: { nl: "Koninkrijk", en: "Kingdom" },
  zelfstandig: { nl: "Zelfstandige organen", en: "Independent bodies" },
};

/** Bilingual labels for the six organisation types. */
/** The six concentric tiers of the layout, by statutory function. */
export const TIER_LABELS_I18N: Record<string, LocString> = {
  kern: { nl: "Grondwettelijke kern", en: "Constitutional core" },
  politiek: { nl: "Politieke kern", en: "Political core" },
  ministeries: { nl: "Ministeries", en: "Ministries" },
  uitvoering: { nl: "Uitvoering, toezicht en advies", en: "Execution, supervision and advice" },
  decentraal: { nl: "Decentrale overheden", en: "Decentralised authorities" },
  koninkrijk: { nl: "Koninkrijk", en: "Kingdom" },
};

/** Sectors inside the tiers. A sector the table misses falls back to its branch label. */
export const SECTOR_LABELS_I18N: Record<string, LocString> = {
  "hoge-colleges": { nl: "Hoge Colleges van Staat", en: "High Councils of State" },
  "rechterlijke-macht": { nl: "Rechterlijke macht", en: "Judiciary" },
  "staten-generaal": { nl: "Staten-Generaal", en: "States General" },
  regering: { nl: "Regering en kabinet", en: "Government and cabinet" },
  ministeries: { nl: "Ministeries", en: "Ministries" },
  uitvoering: { nl: "Uitvoering", en: "Execution" },
  inspecties: { nl: "Inspecties", en: "Inspectorates" },
  zelfstandig: { nl: "Op afstand (zbo en rwt)", en: "At arm's length (zbo and rwt)" },
  advies: { nl: "Advies en planbureaus", en: "Advisory councils and planning bureaus" },
  provincies: { nl: "Provincies", en: "Provinces" },
  gemeenten: { nl: "Gemeenten", en: "Municipalities" },
  waterschappen: { nl: "Waterschappen", en: "Water boards" },
  caribisch: { nl: "Caribisch Nederland", en: "Caribbean Netherlands" },
  koninkrijk: { nl: "Landen van het Koninkrijk", en: "Countries of the Kingdom" },
};

export const ORG_TYPE_LABELS_I18N: Record<string, LocString> = {
  department: { nl: "Departementen en organen", en: "Departmental bodies" },
  elected: { nl: "Gekozen organen", en: "Elected bodies" },
  commission: { nl: "Commissies", en: "Commissions" },
  advisory: { nl: "Adviesorganen", en: "Advisory bodies" },
  dept_head: { nl: "Hoofdposities", en: "Head positions" },
  constituency: { nl: "Kiesgerechtigden", en: "Constituency" },
};

/** Bilingual labels for every organisation subtype. */
export const ORG_SUBTYPE_LABELS_I18N: Record<string, LocString> = {
  "kiesgerechtigden-nederland": { nl: "Kiesgerechtigden Nederland", en: "Netherlands electorate" },
  "kiezers-caribisch-nederland": { nl: "Kiezers Caribisch Nederland", en: "Caribbean Netherlands electorate" },
  "tweede-kamer": { nl: "Tweede Kamer", en: "House of Representatives" },
  "eerste-kamer": { nl: "Eerste Kamer", en: "Senate" },
  "provinciale-staten": { nl: "Provinciale Staten", en: "Provincial council" },
  gemeenteraad: { nl: "Gemeenteraad", en: "Municipal council" },
  "algemeen-bestuur-waterschap": { nl: "Algemeen bestuur waterschap", en: "Water board assembly" },
  eilandsraad: { nl: "Eilandsraad", en: "Island council" },
  "europees-parlement": { nl: "Europees Parlement", en: "European Parliament" },
  ministerie: { nl: "Ministerie", en: "Ministry" },
  agentschap: { nl: "Agentschap", en: "Agency" },
  uitvoeringsorganisatie: { nl: "Uitvoeringsorganisatie", en: "Executive organization" },
  inspectie: { nl: "Inspectie", en: "Inspectorate" },
  zbo: { nl: "Zelfstandig bestuursorgaan", en: "Independent administrative body" },
  rwt: { nl: "Rechtspersoon met wettelijke taak", en: "Legal entity with statutory task" },
  toezichthouder: { nl: "Toezichthouder", en: "Regulator" },
  "rechterlijke-instantie": { nl: "Rechterlijke instantie", en: "Judicial body" },
  "hoge-college": { nl: "Hoge college van staat", en: "High council of state" },
  adviescollege: { nl: "Adviescollege", en: "Advisory council" },
  planbureau: { nl: "Planbureau", en: "Planning bureau" },
  kiesraad: { nl: "Kiesraad", en: "Electoral council" },
  provincie: { nl: "Provincie", en: "Province" },
  gemeente: { nl: "Gemeente", en: "Municipality" },
  waterschap: { nl: "Waterschap", en: "Water board" },
  "openbaar-lichaam-bes": { nl: "Openbaar lichaam BES", en: "Public body BES" },
  samenwerkingsverband: { nl: "Samenwerkingsverband", en: "Cooperation body" },
  veiligheidsregio: { nl: "Veiligheidsregio", en: "Safety region" },
  defensieonderdeel: { nl: "Defensieonderdeel", en: "Defence unit" },
  koninkrijksorgaan: { nl: "Koninkrijksorgaan", en: "Kingdom body" },
  "land-regering": { nl: "Regering", en: "Government" },
  "staten-land": { nl: "Staten van het land", en: "Island council of the land" },
  staatscommissie: { nl: "Staatscommissie", en: "State commission" },
  commissie: { nl: "Commissie", en: "Committee" },
  "raad-van-advies": { nl: "Raad van advies", en: "Council of advice" },
};

/** Bilingual verbs for the edge types shown in the neighbour fan-out and list. */
export const EDGE_TYPE_LABELS_I18N: Record<string, LocString> = {
  advises: { nl: "adviseert", en: "advises" },
  elects: { nl: "kiest", en: "elects" },
  consists_of: { nl: "bestaat uit", en: "consists of" },
  oversees: { nl: "houdt toezicht op", en: "oversees" },
  part_of: { nl: "maakt deel uit van", en: "is part of" },
  appoints: { nl: "benoemt", en: "appoints" },
  office: { nl: "geeft leiding aan", en: "leads" },
  dept_head: { nl: "heeft als departementshoofd", en: "heads as department head" },
  confirms: { nl: "bevestigt", en: "confirms" },
  ex_officio: { nl: "zit van rechtswege in", en: "sits in ex officio" },
  administers: { nl: "beheert", en: "administers" },
  subsidises: { nl: "subsidieert", en: "subsidises" },
  accountable_to: { nl: "is verantwoording verschuldigd aan", en: "is accountable to" },
  succeeded_by: { nl: "wordt opgevolgd door", en: "is succeeded by" },
  joint_arrangement_member: { nl: "doet mee in", en: "takes part in" },
};
