# Workstream D: Parlement

## Scope covered

The Tweede Kamer and the Eerste Kamer as organizations, every current lid, every fractie, the vaste commissies, the griffies, and the elections that produced the current samenstelling.

Covered:

- Tweede Kamer: 150 zetels, 17 fracties, 150 leden.
- Eerste Kamer: 75 zetels, 20 fracties, 75 leden.
- 18 vaste commissies van de Tweede Kamer and 16 commissies van de Eerste Kamer.
- Positions: lid van de Kamer (TK 150, EK 75), 17 fractievoorzitters, voorzitter en griffier per Kamer, voorzitter/ondervoorzitter/lid per TK-vaste commissie, voorzitter/ondervoorzitter per EK-commissie.
- Constituency: kiesgerechtigden voor de Tweede Kamer.
- Verkiezingsdata: Tweede Kamer 29 oktober 2025, Eerste Kamer 30 mei 2023.

Counts produced: organizations 37, positions 86, people 227, tenures 598, memberships 225, relations 121, sources 112, gaps 7.

Boundary against neighbouring workstreams: workstream I owns predecessor chains and the full personnel file, so this workstream stops at the current membership. Workstream H owns the article-level legal basis. Workstream G owns the Provinciale Staten and the kiescolleges, which form the Eerste Kamer electorate. Non-vaste TK commissies (contactgroepen, interparlementaire delegaties, tijdelijke commissies, presidium, commissie voor de Rijksuitgaven, commissie voor de Werkwijze, commissie voor de Verzoekschriften en Burgerinitiatieven) are not in this pass; they are a named gap.

## Sources fetched with dates

Tweede Kamer, gegevensmagazijn OData, retrieved 17-09-2026:

- https://gegevensmagazijn.tweedekamer.nl/OData/v4/2.0, base, paging notes.
- `.../Fractie?$filter=DatumInactief eq null and AantalZetels ne null`, 17 active fracties, 150 zetels.
- `.../FractieZetel?$select=Id,Gewicht,Fractie_Id`, seat to fractie link.
- `.../FractieZetelPersoon?$filter=Verwijderd eq false and TotEnMet eq null`, 150 current members with start date and Functie.
- `.../Persoon`, names, initials, birth dates.
- `.../Commissie?$filter=Verwijderd eq false`, committee register.
- `.../CommissieZetelVastPersoon?$filter=Verwijderd eq false and TotEnMet eq null&$expand=CommissieZetel($expand=Commissie)`, 818 current committee seats, 595 in vaste commissies.

Tweede Kamer website, retrieved 18-09-2026:

- https://www.tweedekamer.nl/kamerleden_en_commissies/commissies, overzicht commissies.
- https://www.tweedekamer.nl/kamerleden-en-commissies/voorzitter, Thom van Campen gekozen op 18 november 2025.
- https://www.tweedekamer.nl/kamerleden_en_commissies/presidium, samenstelling presidium.
- https://www.tweedekamer.nl/ambtelijke-ondersteuning/organogram/griffier-van-de-tweede-kamer-der-staten-generaal, Griffier Peter Oskam, beeindigd 19 december 2023.
- https://www.tweedekamer.nl/ambtelijke-ondersteuning/organogram/over-de-diensten, diensten onder de Griffier.

Eerste Kamer, retrieved 17-09-2026:

- https://www.eerstekamer.nl/alle_leden, 75 leden, fractie en ancienniteit.
- https://www.eerstekamer.nl/fracties, 20 fracties en zetelaantallen.
- 75 persoonspagina's onder https://www.eerstekamer.nl/persoon/<slug>, loopbaanperiodes met exacte data en de rol Voorzitter of Ondervoorzitter.

Eerste Kamer, retrieved 18-09-2026:

- https://www.eerstekamer.nl/commissies, 16 commissies.
- https://www.eerstekamer.nl/commissies/<slug>, per commissie de voorzitter, ondervoorzitter, griffier en ledenlijst.
- https://www.eerstekamer.nl/begrip/ambtelijke_organisatie, griffie, managementteam en Griffier Remco Nehmelman.

Kiesraad, retrieved 18-09-2026:

- https://www.verkiezingsuitslagen.nl/, recente uitslagen: Tweede Kamer 29 oktober 2025, opkomst 78,3 procent, en Eerste Kamer 30 mei 2023, opkomst 100 procent.
- https://www.kiesraad.nl/verkiezingen/tweede-kamer, kiesstelsel en laatste verkiezingsdatum.
- https://www.kiesraad.nl/verkiezingen/eerste-kamer, Eerste Kamer gekozen door Provinciale Staten en de kiescolleges.

Reused cache from the cancelled run and Phase 0: the 75 EK persoonspagina's, `ek-alle-leden.out`, `ek-fracties.out`, `tk-fractiezetelpersonen.json`, `tk-fractiezetels.json`, `tk-fracties-full.json`, `tk-personen-th.json`, `tk-personen-missing.json`, `tk-czvp-p1.json` tot en met `tk-czvp-p4.json`, all under `research/raw/`.

## Decisions

1. **Eerste Kamer start dates corrected.** The Phase 0 seed derived each start date as 17-09-2026 minus the ancienniteit in days, at medium confidence. That derivation is wrong for members who had a break, because the Eerste Kamer counts ancienniteit cumulatively over all periods. This run reads the loopbaan line on each persoonspagina, rebuilds the contiguous chain of periods that ends at the current period, and takes the earliest start of that chain. Six dates changed, each with a source: A.J.M. van Kesteren 12-12-2023 (was 26-09-2017), Bgen (b.d.) drs. A.J.A. Beukering 18-11-2025 (was 16-11-2021), drs. M.C.T. Fiers 12-10-2021 (was 04-08-2020), drs. M.J. van Rooijen 11-06-2019 (was 28-08-2017), mr. C.A.H. van de Sanden LL.M. 24-09-2024 (was 09-06-2024), drs. P.V.A. Walenkamp MA 23-09-2025 (was 02-02-2025). A fractie switch creates a new loopbaanperiode but not a break; the chain merge keeps the original membership start for those members, which is why dr. M.L. Vos keeps 11-06-2019 even though the page shows a period from 9 september 2026. All 75 memberships now carry a person-page source at high confidence. The derived dates are dropped.

2. **Fracties are not organizations.** The schema has no `fractie` or `partij` subtype, and the reference product itself carries the party as a string on the person, not as a node. Every fractie is represented through `memberships[].fractie` and through a `pos:fractievoorzitter-<fractie>` seat, of which there are 17 in the Tweede Kamer. The alternative, inventing `org:fractie-*` records under a wrong subtype, was rejected. The schema addition is proposed as a gap.

3. **Griffies.** The schema has no `griffie` subtype. The Griffier is modeled as a `dept_head` position on each Kamer, and the official dienstenlijst is recorded in the markdown only. The alternative, forcing the griffie into `subtype: commissie`, was rejected.

4. **Committee membership uses tenures, not memberships.** The canonical model reserves `membership` for the large elected bodies. A committee seat is a position in a `commission` organization, so each TK committee has one lid-position, plus a voorzitter and ondervoorzitter position where the current OData record has such a Functie. Each current `CommissieZetelVastPersoon` record becomes a tenure with its `Van` date and `TotEnMet: null`. That yields 595 tenures across the 18 vaste commissies. Only 7 of the 18 committees have a current voorzitter record in the query; the rest are a gap.

5. **Eerste Kamer committees carry no dated tenure.** The committee pages give the chair, deputy and clerk, and a member list, but no appointment date per committee seat. Because `tenure.start` and `membership.start` are required, this run creates the committee organizations and the chair and deputy positions, and records the names in the organization description. The dated EK committee seats are a gap.

6. **Ids and slugs.** The 225 kamerleden reuse the Phase 0 person ids and membership ids so the merge deduplicates. Committee organizations are named `org:tweede-kamer-commissie-<afkorting>` and `org:eerste-kamer-commissie-<slug>`. Underscores in EK url slugs are replaced with hyphens to satisfy the id pattern.

7. **Constituency.** One `constituency` organization, `org:kiesgerechtigden-nederland`, with an `elects` relation to the Tweede Kamer (150 seats, Grondwet art. 51 and 54). The Eerste Kamer is chosen indirectly by Provinciale Staten and the kiescolleges (Grondwet art. 55). Those bodies belong to workstream G, so the EK electorate is not modeled here and is a gap.

8. **Elections recorded, uitslagen not yet.** The databank confirms Tweede Kamer 29 oktober 2025 and Eerste Kamer 30 mei 2023. The current seat distribution per fractie comes from the TK OData and the EK fractiepagina, which is the current samenstelling, not the original uitslag. The per-partij uitslag is a gap.

9. **Party label discrepancy.** The EK committee pages label several PRO members as GroenLinks-PvdA, the former name of that fractie. The Kiesraad reports that PvdA and GroenLinks ceased to exist and that Progressief Nederland (PRO) was registered. This run keeps the current fractie name PRO on the memberships and strips the party label from the committee descriptions, leaving the person names only.

## Gaps

1. Startdata van de EK-commissielidmaatschappen en van de EK-commissievoorzitters. The committee pages name the voorzitter, ondervoorzitter and griffier and list the leden, but give no appointment date per committee seat, and `start` is required. Endpoint: https://www.eerstekamer.nl/commissies/<slug> and https://www.eerstekamer.nl/persoon/<slug>/commissies. Resume: fetch the per-persoon subpage "Lid van commissies" or the Staatscourant besluit.

2. Detailuitslag per partij van de Tweede Kamerverkiezing 29-10-2025 en de Eerste Kamerverkiezing 30-05-2023. The databank shows turnout and total votes on the landing page; the per-partij figures need a query per verkiezing. Endpoint: https://www.verkiezingsuitslagen.nl/. Resume: query the databank per verkiezing and record zetels and stemmen per partij, including the kiescollege split for the EK.

3. Fracties en politieke partijen als entiteiten. The schema has no fractie or partij subtype. Endpoint: docs/04-data-model.md. Resume: orchestrator decision to add a subtype or to accept the string form in `membership.fractie`.

4. Griffie als organisatie. The schema has no griffie subtype. Endpoint: https://www.tweedekamer.nl/ambtelijke-ondersteuning/organogram/over-de-diensten and https://www.eerstekamer.nl/begrip/ambtelijke_organisatie. Resume: orchestrator decision to add a subtype or to model the diensten as `commissie` or `agentschap`.

5. Startdata van de fractievoorzitters in de Tweede Kamer. The OData record gives Functie Fractievoorzitter and the seat start but not the start of the fractievoorzitterschap. Endpoint: https://gegevensmagazijn.tweedekamer.nl/OData/v4/2.0/FractieZetelPersoon. Resume: search the wissel per fractie or read earlier FractieZetelPersoon records with Functie Fractievoorzitter.

6. Benoemingsdatum van de Griffier van de Eerste Kamer (Remco Nehmelman). The page names the function and the person but not the date. Endpoint: https://www.eerstekamer.nl/begrip/ambtelijke_organisatie. Resume: search the Staatscourant or the persbericht of the Eerste Kamer.

7. Ledenlijsten per EK-commissie als gestructureerde membershiprecords. The list is on the committee page but without a start date per seat. Endpoint: https://www.eerstekamer.nl/commissies/<slug>. Resume: fetch the persoonspagina subroute "Lid van commissies".

## Open questions

1. Add `fractie` and `partij` as organization subtypes, or keep the party as a string on the person and the membership? The reference keeps it a string; a full party graph would want a node. Best answered by the orchestrator with docs/02 and docs/04.
2. Add `griffie` as an organization subtype, or treat the griffie as staff that does not need a node? Best answered by the orchestrator with docs/03 section 2.2.
3. Should non-vaste commissies (presidium, commissie voor de Rijksuitgaven, commissie voor de Werkwijze, commissie voor de Verzoekschriften en Burgerinitiatieven, contactgroepen, interparlementaire delegaties, tijdelijke commissies) be a second pass? They appear in the OData register and the website. This workstream treated them as a named gap. Best answered by the orchestrator.
4. Does the Eerste Kamer electorate need its own constituency node, or does workstream G supply the Provinciale Staten and kiescolleges as the `elects` source? Best answered by workstream G and the orchestrator.
5. Are the 595 current vaste-commissiezittingen stable between runs, or does the OData `CommissieZetelVastPersoon` set change with every commissiewissel? The scheduled refresh (`.github/workflows/README.md`) handles this; this workstream records the snapshot date.
