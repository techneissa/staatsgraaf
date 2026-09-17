# The Dutch government model

This is the domain reference for the Dutch state. It is the source of truth for what entities exist, how they relate, and which vocabulary maps to the reference system's node and edge types. The data model in `04-data-model.md` is the mechanical schema; this document is the meaning.

Everything here is a research target. Facts that change between kabinetten, verkiezingen, and reorganisaties are marked `(verify)`. No fact from this document ships in the product until a research workstream has confirmed it against an official source with a retrieval date.

## 1. Why the Dutch case is different from the US case

The US federal graph is one legal order with one constitution, one cabinet, and a clean legislative/executive/judicial split. The Dutch case has three properties the reference does not model well, and our schema must handle them from the start.

1. **The Kingdom has four countries.** The Netherlands, Aruba, Curaçao, and Sint Maarten are countries inside the Kingdom of the Netherlands. The Kingdom has its own organs (Rijksministerraad, Raad van State Kingdom division, Gevolmachtigde Ministers). The country "the Netherlands" also contains the Caribbean Netherlands (Bonaire, Sint Eustatius, Saba), which are not gemeenten but public bodies.

2. **The state is three tiers plus functional tiers.** Rijk (central), provincie, gemeente, and the functional tier of waterschappen. Each has its own elected body, its own executive, and its own day-to-day head. A person can appear at more than one tier over time, and bodies at one tier relate to bodies at another through toezicht, medebewind, and gemeenschappelijke regelingen.

3. **There is no single head of government body.** The King is head of state and part of the regering, but political responsibility rests with ministers. There is no elected president. The Minister-president is first among equals in the Ministerraad, not a chief executive with appointment power over the rest.

These three properties drive the vocabulary mapping in section 4 and the layout decisions in the build plan.

## 2. Scope: the full map of the Dutch state

The scope is the whole Kingdom, with the Netherlands as the deepest part. Ship the Rijk first behind one schema, then the decentrale overheid, then the Kingdom, then the functional and samenwerkingsverbanden layer.

### 2.1 The Kingdom

- The four countries: Nederland, Aruba, Curaçao, Sint Maarten `(verify current constitutional status)`.
- Kingdom organs: Rijksministerraad (Kingdom Council of Ministers), Raad van State Kingdom division, ministerie van BZK as coordinator of Koninkrijksrelaties.
- Per-country: the Gouverneur (Aruba, Curaçao, Sint Maarten), the Gevolmachtigde Minister in Den Haag, the country government, the Staten (parliament) of each country.
- The Caribbean Netherlands: the openbare lichamen Bonaire, Saba, and Sint Eustatius, each with an eilandsraad, a bestuurscollege, and a gezaghebber, plus the Rijksvertegenwoordiger for BES.

### 2.2 Central government (Rijk)

- **Head of state and royal house.** The Koning as staatshoofd, the Koninklijk Huis, ministeriële verantwoordelijkheid, koninklijke besluiten, the Kanselarij der Nederlandse Orden `(verify)`.
- **Regering.** The Koning plus the ministers. The Ministerraad chaired by the Minister-president. The kabinet with ministers and staatssecretarissen. The regeerakkoord and the regeerprogramma.
- **Ministeries.** A current list to verify at recon. As of the 2024 kabinet the set is: Algemene Zaken (AZ), Binnenlandse Zaken en Koninkrijksrelaties (BZK), Buitenlandse Zaken (BZ), Defensie (DEF), Economische Zaken (EZ), Financiën (FIN), Infrastructuur en Waterstaat (IenW), Justitie en Veiligheid (J&V), Klimaat en Groene Groei (KGG), Landbouw, Visserij, Voedselzekerheid en Natuur (LVVN), Onderwijs, Cultuur en Wetenschap (OCW), Sociale Zaken en Werkgelegenheid (SZW), Volksgezondheid, Welzijn en Sport (VWS) `(verify exact set and portfolio names per current kabinet)`.
- **Internal ministry structure.** Secretaris-generaal (SG), directeuren-generaal (DG), directoraten, clusters, and the dienstonderdelen. Research down to the directorate level where the Staatsalmanak publishes it.
- **Agentschappen and rijksdiensten.** Bodies that execute policy under a ministry with no separate legal personality, for example Rijkswaterstaat, Rijksdienst voor Ondernemend Nederland (RVO), Dienst Uitvoering Onderwijs (DUO) `(verify status)`, Belastingdienst, Dienst Justitiële Inrichtingen (DJI), Justis. `(verify the full per-ministry list)`
- **ZBO's (zelfstandige bestuursorganen)** and **RWT's (rechtspersonen met een wettelijke taak)**. Independent bodies with a legal task, for example UWV, SVB, COA, Kadaster, RDW, CBR, CJIB, CAK, CIZ, and many more. A register is maintained under BZK `(verify register location and current list)`.
- **Toezichthouders and inspecties.** ACM, Autoriteit Persoonsgegevens (AP), AFM, DNB, Nederlandse Zorgautoriteit (NZa), ANVS, ILT, NVWA, SodM, and others. Each has a parent ministry and a legal basis `(verify each)`.
- **Politie en Openbaar Ministerie.** The Politie (national force), OM (Openbaar Ministerie), the College van procureurs-generaal.
- **Defensie.** The krijgsmachtonderdelen: Koninklijke Landmacht, Koninklijke Marine, Koninklijke Luchtmacht, Koninklijke Marechaussee, and the Defensie Materieel Organisatie.
- **Hoge Colleges van Staat.** Eerste Kamer, Tweede Kamer, Raad van State, Algemene Rekenkamer, Nationale ombudsman `(verify the constitutional list and articles)`.
- **Adviescolleges and planbureaus.** SER, WRR, Raad voor de leefomgeving en infrastructuur (Rli), Raad voor het Openbaar Bestuur (ROB), Onderwijsraad, Gezondheidsraad, Raad voor Volksgezondheid en Samenleving (RVS), Adviesraad Internationale Vraagstukken (AIV), ACVZ, AWTI, Adviesraad Migratie, CPB, PBL, SCP, Kiesraad `(verify against the Wet adviesstelsel and the Staatsalmanak)`.
- **Rechterlijke macht.** Hoge Raad, four gerechtshoven, eleven rechtbanken, Centrale Raad van Beroep (CRvB), College van Beroep voor het bedrijfsleven (CBb), Raad voor de rechtspraak. Bestuursrechtspraak also sits in a Raad van State division (Afdeling bestuursrechtspraak). Counts `(verify)`.
- **Staten-Generaal.** Eerste Kamer (75 zetels) and Tweede Kamer (150 zetels), fracties, vaste commissies, griffies.

### 2.3 Provincial government (provincies)

Twelve provinces: Groningen, Fryslân, Drenthe, Overijssel, Flevoland, Gelderland, Utrecht, Noord-Holland, Zuid-Holland, Zeeland, Noord-Brabant, Limburg. Each has:

- Provinciale Staten (the elected body), Gedeputeerde Staten (the daily executive), the Commissaris van de Koning (CvdK, appointed by the Crown), the provincie-secretaris and the griffie.
- Koepel: Interprovinciaal Overleg (IPO).

### 2.4 Municipal government (gemeenten)

About 340 gemeenten `(verify the current count via CBS)`. Each has:

- Gemeenteraad (elected), college van burgemeester en wethouders (B&W), the burgemeester (appointed by the Crown), the gemeentesecretaris, the griffie.
- Koepel: Vereniging van Nederlandse Gemeenten (VNG).
- Research down to the largest gemeenten first, then fill the rest. Every gemeente has them same shape, so the marginal cost drops after the first few hundred.

### 2.5 Waterschappen (regional water authorities)

About 21 waterschappen `(verify)` with a functional mandate that predates the modern state. Each has:

- Algemeen Bestuur (elected), Dagelijks Bestuur, the dijkgraaf (appointed by the Crown), the secretaris-directeur.
- Koepel: Unie van Waterschappen (UvW).

### 2.6 Samenwerkingsverbanden and regional bodies

Bodies formed by two or more decentrale overheden under the Wet gemeenschappelijke regelingen (Wgr):

- Veiligheidsregio's (25 expected) `(verify)`, under the Wet veiligheidsregio's (Wvr), each with a bestuur chaired by a burgemeester.
- GGD'en (regionale gezondheidsdiensten) `(verify count)`.
- Omgevingsdiensten (regional environment services) `(verify count)`.
- Recreatieschappen, metropoolregio's, and other gemeenschappelijke regelingen `(verify)`.
- Openbaar vervoer authorities where separately organized `(verify)`.

Treat these as `department`-type bodies under `level: regionaal` with `oversees` or `part_of` edges to their participants. The web is genuinely a network, so an accurate model of these is also the clearest demonstration of the graph's value.

## 3. Positions and the officeholder model

For every organization we track not just the body but the positions inside it. This is where the Dutch case gets subtle, so the rules are explicit.

- A **position node** is a seat or role, not a person. "Minister van Financiën", "Burgemeester van Utrecht", "Dijkgraaf van Waterschap Amstel, Gooi en Vecht", "Lid Tweede Kamer" are positions.
- A **person** fills a position through a **tenure**, a dated interval. Store `start` and `end`. `end: null` means current.
- **Entry mode**: `benoemd` (appointed), `benoemd bij koninklijk besluit` (Crown appointment, a subtype), `gekozen` (elected), `waarnemend` (acting), `plaatsvervangend` (deputy).
- **Bodies with many seats** (Tweede Kamer, Eerste Kamer, Provinciale Staten, gemeenteraden, waterschapsbesturen) are modeled as one organization with `seatsCount` and a list of seat-level tenures. This mirrors the reference's chamber model (a members grid plus a seat count).
- **Ex officio** roles are edges, not tenures, where the law makes one body's head the chair of another. Examples: the Commissaris van de Koning chairs Provinciale Staten and is a member of Gedeputeerde Staten; the burgemeester chairs the gemeenteraad and B&W; the dijkgraaf chairs the Algemeen Bestuur and the Dagelijks Bestuur. Model these as `ex_officio` edges and also as a tenure where the person changes, so both views work.
- **Formatter and informateur** roles during kabinetsformatie are positions in their own right, worth modeling so the formation of a kabinet is visible on the timeline.

## 4. Vocabulary mapping (reference to Dutch)

The reference node types are too coarse for the Dutch case. Map as follows, adding Dutch subtypes where needed. The reference `type` stays as the mechanical field; a `subtype` carries the Dutch meaning.

| Reference `type` | Dutch meaning | Subtypes to add |
| --- | --- | --- |
| `constituency` | The electorate | `kiesgerechtigden-nederland`, `kiezers-caribisch-nederland`, plus per-election electorates |
| `elected` | Elected bodies | `tweede-kamer`, `eerste-kamer`, `provinciale-staten`, `gemeenteraad`, `algemeen-bestuur-waterschap`, `eilandsraad`, `europees-parlement` |
| `department` | All bodies, executive and judicial | `ministerie`, `agentschap`, `zbo`, `rwt`, `inspectie`, `toezichthouder`, `rechterlijke-instantie`, `hoge-college`, `provincie`, `gemeente`, `waterschap`, `openbaar-lichaam-bes`, `samenwerkingsverband`, `defensieonderdeel`, `koninkrijksorgaan`, `land-regering`, `staten-land` |
| `commission` | Temporary or standing committees with a mandate | `staatscommissie`, `commissie`, `raad-van-advies` where it is not an adviescollege |
| `advisory` | Adviescolleges and planbureaus | `adviescollege`, `planbureau`, `kiesraad` |
| `dept_head` | The head position of a body | `minister`, `staatssecretaris`, `minister-president`, `burgemeester`, `commissaris-van-de-koning`, `dijkgraaf`, `gezaghebber`, `gouverneur`, `sg`, `dg`, `voorzitter`, `president` |

Edge vocabulary mapping. Keep the reference names as the `type` and add Dutch-specific edges where the reference has no equivalent.

| Reference edge | Dutch meaning | Notes |
| --- | --- | --- |
| `elects` | Kiesgerechtigden kiezen a body | The electorate to the elected body |
| `appoints` | Benoemt | Includes Crown appointments; carry a `by: "kroon" | "college" | "minister" | "raad"` in metadata |
| `oversees` | Houdt toezicht op | Ministry over an agency, inspectie over a sector, provincie over gemeenten |
| `advises` | Brengt advies uit aan | Adviescollege to a ministry or the regering |
| `office` | Bekleedt, a position belongs to a body | Position to body |
| `dept_head` | Is hoofd van, a head position heads a body | Position to body |
| `confirms` | Instemming or voordracht | Eerste Kamer involvement, appointment procedures with a voordracht |
| `ex_officio` | Van rechtswege voorzitter of lid | CvdK, burgemeester, dijkgraaf |
| `administers` | Voert uit voor, or medebewind | Agency administers a scheme for a ministry |

Add these Dutch-specific edges the reference lacks: `subsidises`, `is_verantwoording_schuldig_aan` (accountability, for the appropiation chain), `part_of`, `consists_of`, `succeeded_by` (for reorganisaties), and `gemeenschappelijke_regeling_deelnemer` (participant in a joint arrangement).

## 5. Entity inventory to research

This is the checklist the research phase must fill. Counts are current best estimates and must be verified.

- 1 Koning and the Koninklijk Huis `(verify scope)`.
- 1 regering and 1 Ministerraad; the current kabinet with all ministers and staatssecretarissen `(verify per kabinet)`.
- 13 ministeries `(verify)`.
- Several hundred dienstonderdelen across the ministeries, comprising agentschappen, directoraten, and inspecties `(verify the total)`.
- About 40 to 100 ZBO's and RWT's `(verify against the BZK register)`.
- About 15 to 25 adviescolleges and planbureaus `(verify)`.
- 2 Kamers, their fracties, and their vaste commissies.
- 5 Hoge Colleges van Staat `(verify list)`.
- About 25 rechterlijke instanties (Hoge Raad, 4 hoven, 11 rechtbanken, CRvB, CBb, RvR, bestuursrechtspraak) `(verify)`.
- 12 provincies with their three organs each.
- About 21 waterschappen with their three organs each.
- About 342 gemeenten with their four organs each `(verify count via CBS)`.
- 3 openbare lichamen BES plus the Rijksvertegenwoordiger.
- 3 landen plus their organs, gouverneurs, and Gevolmachtigde Ministers.
- About 25 veiligheidsregio's, about 25 GGD'en, about 29 omgevingsdiensten, and other samenwerkingsverbanden `(verify all counts)`.

## 6. Positions inventory

- 1 Minister-president; about 20 to 30 ministers en staatssecretarissen total `(verify per kabinet)`.
- 150 Tweede Kamerleden, 75 Eerste Kamerleden, with fracties.
- 12 Commissarissen van de Koning; about 342 burgemeesters; about 21 dijkgraven; 3 gezaghebbers.
- 5 Hoge College positions (presidenten and members) `(verify titles)`.
- SG's and DG's per ministerie where public, plus the boards of the larger ZBO's and toezichthouders.
- 3 Gouverneurs, 3 Gevolmachtigde Ministers, the Rijksvertegenwoordiger.
- Approximately 8,000 to 9,000 raadsleden and Statenleden in total across gemeenten, provincies, and waterschappen `(verify; this is the long tail and can be phased)`.

## 7. Source map for the Dutch case

Fetch machine-readable sources first. Only scrape HTML when no endpoint exists. Every URL is `(verify)` until a research workstream has fetched it successfully and recorded the retrieval date.

### Legal and legislative

- `wetten.overheid.nl`: the consolidated law texts, per article. Look for the Basiswettenbestand (BWB) XML.
- `repository.overheid.nl` and its SRU interface: bulk metadata for wetten and bekendmakingen.
- `officielebekendmakingen.nl`: Staatsblad, Staatscourant, Tractatenblad. The KB's that appoint ministers, burgemeesters, CdK's, and dijkgraven are here. The **Staatsalmanak** is published here and is the official organogram of the state `(verify the current publication and format)`.

### Parliament

- `tweedekamer.nl` and `api.tweedekamer.nl` / `opendata.tweedekamer.nl`: leden, fracties, commissies, stemmingen, kamerstukken, moties. An OData-style API `(verify)`.
- `eerstekamer.nl`: leden, fracties, commissies, and open data pages `(verify)`.
- `kiesraad.nl`: verkiezingsuitslagen, zetelverdeling, and open data downloads `(verify)`.
- `parlement.com`: a high-quality secondary source for formation history and biographies. Use it to cross-check, never to copy prose.

### Executive and oversight

- `rijksoverheid.nl`: ministeries, organisaties, nieuws, and the organogram. RSS feeds for nieuws `(verify)`.
- `raadvanstate.nl`, `rekenkamer.nl`, `nationaleombudsman.nl`: Hoge Colleges.
- `rechtspraak.nl`, `hogeraad.nl`, `rechtspraak.nl/Organisatie-en-contact`: gerechten and officials.
- `politie.nl`, `om.nl`: Politie and OM.
- `defensie.nl`: krijgsmachtonderdelen and command.

### Independent and advisory bodies

- `ser.nl`, `wrr.nl`, `rli.nl`, `rob-rfv.nl`, `onderwijsraad.nl`, `gezondheidsraad.nl`, `raadrvs.nl`, `adviesraadinternationale...` (AIV), `adviesraad-migratie.nl`, `awti.nl`, `cpb.nl`, `pbl.nl`, `scp.nl`, `kiesraad.nl`: identity, board, mandate, legal basis.
- The BZK register of ZBO's and RWT's `(verify location)`.

### Decentral

- `cbs.nl` and its open data: gemeente counts, inwoners, indelingen (gemeentelijke indeling per year).
- `ipo.nl`, `vng.nl`, `uvw.nl`: koepels and member lists.
- Individual provincie, gemeente, and waterschap sites: organs, officeholders, and legal basis. Governance data is often in the raadsinformatiesystemen (iBabs, Notubiz, GO) and in `openraadsinformatie.nl`.
- `waarstaatjegemeente.nl` and `allecijfers.nl`: aggregated per-gemeente data `(verify licenses)`.

### Caribbean

- `rijksdienstcn.com`, `rijksoverheid.nl/onderwerpen/caribische...`: openbare lichamen BES, gezaghebbers, eilandsraden.
- The government sites of Aruba, Curaçao, and Sint Maarten, and the Kingdom relations pages of BZK.

### Budget and money

- `rijksfinancien.nl`: the Rijksbegroting, per ministerie, with history `(verify API)`.
- `openstate` style open spending and `data.overheid.nl` datasets `(verify)`.
- The Algemene Rekenkamer for audit findings.

### News

- NOS, NRC, de Volkskrant, Trouw, Het Parool, AD, Telegraaf, FD, RTL Nieuws, Nieuwe Revu, NU.nl, BNR, De Correspondent, Follow the Money, Openbaar Bestuur, Binnenlands Bestuur, and the political desks of each. RSS where available `(verify feeds)`.
- ANP as the wire feed if licensable; otherwise rely on publishers that carry ANP.

### Media and portraits

- Wikimedia Commons for portraits, with license and attribution per file.
- Rijksoverheid and organization press pages for official portraits.

## 8. License and privacy constraints

- Government texts and most public registers are open. Check each source's license; most are CC0 or a comparable open license, but exceptions exist.
- `parlement.com` and news images are not reusable. Use them only to verify facts.
- Portraits come from Commons or official government sources with a recorded license and credit line.
- Scope personal data to people in a public function, and only for facts the government itself publishes. Keep birth dates, party, and portraits where officially public. Do not collect contact details or private addresses.
- Ship a clear disclaimer: this project is not affiliated with the Dutch government or any official body.

## 9. Naming, slugs, and language

- UI language is Dutch (`nl-NL`). Entity names stay in Dutch. Code, data keys, and slugs are English.
- Slugs are lowercase ASCII with hyphens, prefixed by type: `tweede-kamer`, `ministerie-van-financien`, `provincie-utrecht`, `gemeente-utrecht`, `waterschap-amstel-gooi-en-vecht`, `zbo-uwv`, `persoon-mark-rutte`. Transliterate diacritics (Fryslân to `fryslan`), and keep an `aliases` array for the accented and informal forms.
- Dates are ISO 8601. Locale formatting happens only in the UI.
- The fiscal year for the Rijk is the calendar year, not the US October start, so any budget axis must not assume a US fiscal calendar. Dutch decentrale overheden use their own programme cycles; record the actual year from the source.

## 10. Open domain questions to resolve at recon

- The exact current kabinet, its ministers and staatssecretarissen, and the portfolio names `(fetch fresh)`.
- The exact current list of ministeries and their codes.
- The current gemeente count and the current gemeentelijke indeling `(CBS)`.
- The current waterschappen list and the current veiligheidsregio list.
- The location and format of the BZK ZBO and RWT register.
- Whether the Staatsalmanak is available in a structured form this year.
- The precise legal basis per entity type, down to article level, for the mapping in `04-data-model.md`.
- How the Eerste Kamer and Tweede Kamer APIs expose fracties and committee membership as of the current period.

## 11. Glossary of Dutch terms

Short definitions so a non-Dutch reader and a fresh agent share the vocabulary. Use the Dutch term in the UI, the English gloss in code comments and doc notes only.

| Term | Meaning |
| --- | --- |
| Rijk | The central state: the regering, the ministeries, and the national services |
| Regering | The King and the ministers together, the constitutional government |
| Ministerraad | The council of all ministers, chaired by the Minister-president |
| Kabinet | The ministers and staatssecretarissen of one term |
| Staatssecretaris | A junior minister with a defined portfolio, accountable to a minister |
| Kamer | A chamber of the Staten-Generaal; context decides which one |
| Staten-Generaal | The two chambers together, the national parliament |
| Fractie | A parliamentary group of one party |
| Griffie | The parliamentary support staff of a chamber or a council |
| Provinciale Staten | The elected council of a provincie |
| Gedeputeerde Staten | The daily executive of a provincie |
| Commissaris van de Koning | The Crown-appointed head of a provincie, chairs Staten and GS |
| Gemeenteraad | The elected council of a gemeente |
| College van B&W | The daily executive of a gemeente: burgemeester and wethouders |
| Wethouder | An alderman, a member of the college |
| Burgemeester | The Crown-appointed head of a gemeente, chairs raad and college |
| Algemeen Bestuur | The elected council of a waterschap |
| Dagelijks Bestuur | The daily executive of a waterschap |
| Dijkgraaf | The Crown-appointed head of a waterschap |
| Waterschap | A regional water authority with its own tax and elections |
| ZBO | Zelfstandig bestuursorgaan, an independent body with a legal task |
| RWT | Rechtspersoon met een wettelijke taak, a body with a statutory duty |
| Agentschap | An executive agency within a ministerie |
| Dienstonderdeel | A service unit of a ministerie |
| Hoge College van Staat | A constitutionally independent high body, for example the Raad van State |
| Adviescollege | A statutory advisory council |
| Planbureau | An analysis bureau, for example CPB or PBL |
| Medebewind | A lower tier executing national law on behalf of the Rijk |
| Toezicht | Supervision of one body by another |
| Gemeenschappelijke regeling | A joint arrangement between decentrale overheden under the Wgr |
| Veiligheidsregio | A regional safety body under the Wvr |
| Omgevingsdienst | A regional environment service |
| Openbaar lichaam | A public body with legal personality; also the BES designation |
| BES | Bonaire, Sint Eustatius, Saba, the Caribbean Netherlands |
| Gezaghebber | The Crown-appointed head of a BES openbaar lichaam |
| Eilandsraad | The elected council of a BES openbaar lichaam |
| Rijksvertegenwoordiger | The Rijk's representative for the BES islands |
| Gouverneur | The Crown-appointed representative in Aruba, Curaçao, or Sint Maarten |
| Gevolmachtigde Minister | A Kingdom-country minister in the Rijksministerraad |
| Rijksministerraad | The Kingdom Council of Ministers |
| Staatsalmanak | The official organogram and register of the state |
| Staatsblad, Staatscourant | The official publications where appointments are gazetted |
