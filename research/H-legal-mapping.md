# Workstream H: legal source mapping

Article-level legal basis for the organizations and positions produced by workstreams A to G, mapped to wetten.overheid.nl.

## Scope covered

Read the JSON of workstreams A to G and enumerated the real subtypes and ids before mapping: 1.546 organizations and 1.431 positions. Every organization is now covered by a `subtype:` selector, an explicit `org:` mapping, or a named gap; every position without a `legalBasis` is covered by an explicit `pos:` mapping or a named gap.

- Organizations: 1.546 total. 771 fall under a class selector, 772 have an explicit id mapping or already carried a per-record `legalSource`, 3 are named gaps. No organization class is left silently unmapped.
- Positions: 1.431 total. 1.277 already carried a `legalBasis` from C, E, F or G. The remaining 137 received an explicit `pos:` mapping, plus 17 named gaps.
- `legalMappings`: 918 entries (12 selectors, 769 organizations, 137 positions).
- `sources`: 115 wet-records. `gaps`: 27. `endpointsUsed`: 146 law pages.

The boundary against other workstreams: this file adds no organizations, people, tenures or relations. It only supplies `legalSource` for organizations and `legalBasis` for positions. Per-body instellingswetten already sourced in C, E and F are preserved through explicit id mappings rather than overwritten by a generic class law.

Coverage by entity class (subtype, organizations, law):

| Class | Count | Legal source used |
| --- | --- | --- |
| ministerie | 12 | Grondwet art. 44 (selector) |
| provincie | 12 | Provinciewet art. 1 (selector) |
| gemeente | 342 | Gemeentewet art. 1 (selector) |
| waterschap | 21 | Waterschapswet art. 1 (selector) |
| openbaar-lichaam-bes | 3 | WolBES art. 1 (selector) |
| provinciale-staten | 12 | Provinciewet art. 7 (selector) |
| gemeenteraad | 342 | Gemeentewet art. 7 (selector) |
| algemeen-bestuur-waterschap | 21 | Waterschapswet art. 10 (selector) |
| eilandsraad | 3 | WolBES art. 10 (selector) |
| tweede-kamer / eerste-kamer | 2 | Grondwet art. 51 (selector) |
| kiesgerechtigden-nederland | 1 | Grondwet art. 54 (selector) |
| zbo | 179 | per-body instellingswet (reused) or Kaderwet ZBO's art. 1 |
| rwt | 66 | per-body sectorwet (curated) or Comptabiliteitswet 2016 art. 1.1 |
| commissie | 414 | per-tier law (reused) or Grondwet art. 71 for Kamercommissies |
| uitvoeringsorganisatie | 32 | per-body or Ambtenarenwet 2017 art. 1 |
| agentschap | 28 | Regeling agentschappen 2024 art. 1 |
| rechterlijke-instantie | 22 | Wet op de rechterlijke organisatie / indeling (reused) |
| inspectie | 16 | per-body sectorwet or Ambtenarenwet 2017 art. 1 |
| adviescollege | 10 | per-body instellingswet (reused) |
| hoge-college | 3 | Wet op de Raad van State, Comptabiliteitswet 2016, Wet Nationale ombudsman (reused) |
| planbureau | 3 | Aanwijzingen voor de Planbureaus (reused) |
| land-regering | 1 | Grondwet art. 42 |
| kiesraad | 1 | Kieswet (reused) |

## Sources fetched with dates

All fetched 2026-09-18 with plain HTTPS GET, browser-like User-Agent, one request per URL, no cookies. Raw HTML is cached under `research/raw/H/laws/<BWBR>.html`. 149 law pages were fetched; every distinct URL cited by a mapping or a source was re-probed and returned HTTP 200 (227 of 227).

| Source | Content | What it yielded |
| --- | --- | --- |
| wetten.overheid.nl BWBR0001840 | Grondwet | anchors for art. 42-47, 51-72, 73-78, 78a, 116-122; anchor check for all Grondwet mappings |
| wetten.overheid.nl BWBR0005645 | Provinciewet | anchors for art. 1 and art. 7 |
| wetten.overheid.nl BWBR0005416 | Gemeentewet | anchors for art. 1 and art. 7 |
| wetten.overheid.nl BWBR0005108 | Waterschapswet | anchors for art. 1 and art. 10 |
| wetten.overheid.nl BWBR0028142 | WolBES | anchors for art. 1 and art. 10 |
| wetten.overheid.nl BWBR0020495 | Kaderwet zelfstandige bestuursorganen | anchor for art. 1 |
| wetten.overheid.nl BWBR0039429 | Comptabiliteitswet 2016 | anchor for art. 1.1 |
| wetten.overheid.nl BWBR0001947 | Ambtenarenwet 2017 | anchor for art. 1 |
| wetten.overheid.nl BWBR0050264 | Regeling agentschappen 2024 | anchor for art. 1 |
| wetten.overheid.nl BWBR0027466 | Wet veiligheidsregio's | anchor for art. 8 |
| wetten.overheid.nl (146 law pages) | consolidated wetten | titles and base-page HTTP 200 for every law cited |

Article anchors were verified against the fetched HTML, not recalled: 0 of the 182 distinct mapping URLs has an anchor that is absent from its cached page.

Sample of ten mappings, each a live wetten.overheid.nl article URL (HTTP 200, anchor present in the fetched page):

| target | legal source | URL |
| --- | --- | --- |
| subtype:ministerie | Grondwet art. 44 | https://wetten.overheid.nl/BWBR0001840#Hoofdstuk2_Paragraaf2_Artikel44 |
| subtype:provincie | Provinciewet art. 1 | https://wetten.overheid.nl/BWBR0005645#TiteldeelI_Artikel1 |
| subtype:gemeente | Gemeentewet art. 1 | https://wetten.overheid.nl/BWBR0005416#TiteldeelI_Artikel1 |
| subtype:waterschap | Waterschapswet art. 1 | https://wetten.overheid.nl/BWBR0005108#TiteldeelI_HoofdstukI_Artikel1 |
| subtype:openbaar-lichaam-bes | WolBES art. 1 | https://wetten.overheid.nl/BWBR0028142#HoofdstukI_Artikel1 |
| subtype:eilandsraad | WolBES art. 10 | https://wetten.overheid.nl/BWBR0028142#HoofdstukIII_AfdelingII_Artikel10 |
| subtype:gemeenteraad | Gemeentewet art. 7 | https://wetten.overheid.nl/BWBR0005416#TiteldeelII_HoofdstukII_Artikel7 |
| org:regering | Grondwet art. 42 | https://wetten.overheid.nl/BWBR0001840 |
| pos:voorzitter-tweede-kamer | Grondwet art. 61 | https://wetten.overheid.nl/BWBR0001840#Hoofdstuk3_Paragraaf1_Artikel61 |
| pos:voorzitter-tweede-kamer-commissie-def | Grondwet art. 71 | https://wetten.overheid.nl/BWBR0001840#Hoofdstuk3_Paragraaf2_Artikel71 |

The 146 `endpointsUsed` entries are the dedicated law pages fetched for this workstream, separate from the A-G source lists.

## Decisions

1. **Selectors only where one law truly governs the whole class.** Twelve `subtype:` selectors cover ministeries, provincies, gemeenten, waterschappen, the openbare lichamen BES, the four elected body types, the two Kamers and the national electorate. The alternative, one selector per class regardless of fit, was rejected because it would overwrite per-body laws. No `subtype:veiligheidsregio` selector is included because G produced no veiligheidsregio organizations; the class is named as a gap with Wet veiligheidsregio's art. 8 as its intended source.
2. **Explicit ids where the source differs.** ZBO's, RWT's, adviescolleges, planbureaus, rechterlijke instanties and Hoge Colleges each have their own instellingswet, so they are mapped by explicit `org:` id and the per-body law from C, E and F is reused, canonicalised to the wetten.overheid.nl base form. The alternative, `subtype:zbo` or `subtype:adviescollege` with one generic law, was rejected because it would erase the specific instellingswet.
3. **Canonical wetten URL form.** Every URL is `https://wetten.overheid.nl/<BWBR>` with the article anchor where the site uses one. Legacy `cgi-bin/deeplink` and `jci1.3` links in A-G were resolved to their BWB id and rewritten. The two non-wetten legal sources in C (a CRvB and a Raad van State uitspraak) are not laws and are named as gaps instead of being carried forward as a legal basis.
4. **Article numbering follows the fetched consolidation.** The current Grondwet has art. 76-78 for the Algemene Rekenkamer and art. 78a for de Nationale ombudsman. Arts. 78b to 78f do not exist in the 2023-02-22 text. The reference list in docs/05 is treated as outdated on this point and the gap records it.
5. **Kamercommissies use Grondwet art. 71.** The 34 committee organizations in D had no legal source. They are mapped, with their voorzitter, ondervoorzitter and lid positions, to Grondwet art. 71 (the Kamers stellen een reglement van orde vast). The concrete Reglement van Orde is not published in the Wettenbank and stays a source note. Committee chairs are `Grondwet art. 71`, the two chamber chairs are `Grondwet art. 61`.
6. **Fractievoorzitters have no public-law basis.** A fractie is not a public body, so the 17 fractievoorzitter positions are named gaps rather than assigned a wet. The alternative, mapping them to Grondwet art. 71, would assert a statutory basis that does not exist.
7. **Class fallback for RWT and ZBO.** Where C had no specific law, an RWT keeps the Comptabiliteitswet 2016 art. 1.1 definition of a rechtspersoon met een wettelijke taak and a ZBO keeps the Kaderwet ZBO's art. 1 definition, both at confidence medium, and the missing per-body instellingswet is a separate gap. This yields a real, sourced legal basis without inventing an instellingswet.
8. **Ambtelijke koppen.** SG-, DG- and directeursfuncties in A and the defensie-inspecties in B have no article-level statutory basis of their own. Where the owning body already had a legal source it is reused at confidence medium; otherwise Ambtenarenwet 2017 art. 1 is used as the framework and the per-ministry Organisatiebesluit is a gap.
9. **Sources are deduplicated across workstreams.** Where an A-G source record already covers a BWB id, the mapping points at that existing `src:` id (for example `src:wet-ro`). Only laws not yet declared anywhere are added as new `src:wet-<bwbr>` records, 115 in total.
10. **No records were edited.** This workstream writes only its own JSON and markdown plus raw HTML. The merge injects `legalSource` or `legalBasis` from `legalMappings[]`; that is why the arrays in this envelope are empty.

## Gaps

Mirrors `gaps[]` in the JSON.

1. **Dienst van het Koninklijk Huis, Kabinet van de Koning, Kanselarij der Nederlandse Orden** (3 organizations). No public instellingswet or article-level basis was located. Endpoint: https://wetten.overheid.nl/. Resume: search the Wettenbank and the Staatsalmanak for a grondslag, or close these as hofdiensten without a wet.
2. **Argonaut Advies B.V. and FMMU Advies B.V.** (2 ZBO register entries). Their only legal source in C is a court ruling, which is not a wet. Endpoint: https://organisaties.overheid.nl/Zelfstandige_bestuursorganen/. Resume: read the register's wettelijke grondslag and replace with the instellingswet, if one exists.
3. **Fractievoorzitters** (17 positions). No public-law basis; the roles rest on a fractiereglement. Endpoint: https://wetten.overheid.nl/BWBR0001840#Hoofdstuk3_Paragraaf2_Artikel71. Resume: confirm the intended treatment or record them as non-statutory.
4. **Organisatiebesluit per ministerie** for ambtelijke dienstonderdelen in B without a specific law. Endpoint: https://wetten.overheid.nl/. Resume: search per ministerie and add explicit mappings.
5. **Sectorale instellingswet per RWT** that received only the Comptabiliteitswet class ground. Endpoint: https://organisaties.overheid.nl/. Resume: walk the register and read each wettelijke taak.
6. **Instellingswet per ZBO** that received only the Kaderwet ZBO's class ground. Endpoint: https://organisaties.overheid.nl/Zelfstandige_bestuursorganen/. Resume: read each entry's wettelijke grondslag.
7. **Grondwet 78b-78f do not exist.** The current text has art. 78a only. Endpoint: https://wetten.overheid.nl/BWBR0001840#Hoofdstuk4_Artikel78a. Resume: drop the outdated article range at the next refresh.
8. **Veiligheidsregio's not mapped as a class.** G produced no veiligheidsregio organizations and named the relations as a gap, so a `subtype:veiligheidsregio` selector would match zero records and register as an unmatched mapping. Endpoint: https://wetten.overheid.nl/BWBR0027466#Paragraaf3_Artikel8. Resume: when G adds the 25 veiligheidsregio's, add the selector to Wet veiligheidsregio's art. 8.

## Open questions

1. Should the schema gain a dedicated field for a categorial RWT or ZBO class ground so it can sit next to the per-body instellingswet? Now the merge stores one `legalSource`. Owner decides (docs/04 section 18).
2. Is `Ambtenarenwet 2017 art. 1` acceptable as the recorded basis for ambtelijke koppen, or must every such position wait for its Organisatiebesluit article? The merge has one slot; the orchestrator decides whether medium-confidence class grounds ship.
3. The `notes` field is written on every mapping but `pipelines/merge.mjs` does not copy it. If the intent is to surface the class-ground reasoning on the entity page, merge needs a small change. Build area K owns that decision.
