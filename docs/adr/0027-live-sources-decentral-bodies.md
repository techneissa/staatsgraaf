# ADR 0027: live sources for provincies, gemeenten and waterschappen

- Date: 06-10-2026
- Status: accepted
- Supersedes: none. Amends ADR 0024 (its wave 2 note on the Overheid.nl register) and ADR 0006. Builds on ADR 0020 (unknown start), ADR 0022 (file budget) and ADR 0024 (the live framework and its guards).

## Context

The method page said that provinces, municipalities and water boards have no live source and are updated less often. The 342 gemeenten, 12 provincies and 21 waterschappen came from one-off research in September 2026, and their burgemeesters and dijkgraven from a Wikipedia list (`src:wiki-burgemeesters`, `src:wiki-dijkgraven`, confidence medium). On 06-10-2026 that list was already stale: 30 of 342 burgemeesters differ from the official register, and the six we checked against Rijksoverheid and municipal news were all real changes made in 2025 and 2026. The owner asked for official, openly licensed, machine-readable sources, wired into `bun run live`.

## Research

Everything below was fetched on 06-10-2026 with the project user agent (`StaatsgraafBot/0.1`). No source blocked us, none sent a rate-limit header, and every host got at most one request per second. The full run report is `research/qa/live-decentral-06-10-2026.md`.

| Source | Result | Licence | Decision |
| --- | --- | --- | --- |
| Register van Overheidsorganisaties, CSV exports (`organisaties.overheid.nl/export/*.csv` and `export-medewerkers/*.csv`) | 200. `robots.txt` disallows only `/*/correctieformulier`. No ETag, `Cache-Control: no-store`. Gemeenten: 0.95 MB and 2.6 MB (6.5 s). 342 gemeenten, 12 provincies, 21 waterschappen with the TOOI code, website, council seats and start date, and 14,492 office-holder rows | CC0 1.0 (`data.overheid.nl/dataset/overheidsorganisaties-xml`, updated daily) | Live: bodies and heads |
| TOOI organisation sets (`identifier.overheid.nl/tooi/id/gemeente?format=json`, and `waterschap`, `provincie`; the last two answer 302 first) | 200. JSON-LD. Gemeenten 2 MB (4.2 s): 605 codes, of which 263 ended, and 128 herindeling events (Samenvoeging 54, Uitbreiding 62, Herschikking 12) with predecessors, successors and dates. Last event 01-01-2023. Waterschappen: 32 codes, 5 Samenvoegingen. Provincies: 12 | No licence statement found on the sets or on `standaarden.overheid.nl/tooi` | Live: official codes, end dates and herindelingen. Recorded as licence `unknown` (facts only) until a statement exists |
| CBS StatLine OData, "Gebieden in Nederland 2026" (86247NED) | 200. `Cache-Control: public, max-age=1800`. 342 gemeenten with GM code and province (Code_28, 12 provinces). The catalog lists one table per year; the 2027 table appears in autumn | CC BY 4.0 | Live as an independent count and a province check |
| CBS 70072ned (Regionale kerncijfers) | 200. Holds the PV codes but adds no fact over 86247NED | CC BY 4.0 | Not used |
| CBS 80445ned (Waterschappen balans) | 200. Dimension WS01 to WS32 with prose such as "Opgeheven per 01-01-2016"; 21 active. Data end in 2024; its codes differ from TOOI | CC BY 4.0 | Not used: TOOI carries the same history as data |
| CBS 70739NED (Gebieden vanaf 1830) | 200. Stand 01-01-2024 | CC BY 4.0 | Not used: TOOI is current |
| PDOK Bestuurlijke Gebieden (OGC API) | 200. `gemeentegebied` features carry code, name and province, but also geometry (2 features are 135 KB, so about 23 MB for all), there is no `numberMatched`, and `properties` is not supported (400) | CC BY 4.0 | Not used |
| Rijksoverheid, overview of the commissarissen van de Koning | 200. A table of 12 rows: name, party, province, appointment date, birth date. The caption still says "Overzicht per 2025" while the Drenthe row (01-01-2026) is current | CC0 | Live: the commissarissen |
| data.overheid.nl (CKAN) | 200. Searches for burgemeester, commissaris, wethouder, gemeentelijke indeling and herindeling found no dataset of office holders or herindelingen | CC0 for the metadata | Nothing to use |
| Wikipedia, "Lijst van burgemeesters 2025-2029" | The current wikitext still lists Jolanda de Witte for Albrandswaard | CC BY-SA 4.0 | Cross-check only, never cited. Wikidata was not needed |
| Register API (`api-organisaties.overheid.nl`), XML dump (`archive/exportOO.xml`), SRU | The API has a Swagger page; the XML and SRU carry the same data as the CSV | CC0 | Not used: the CSV is simpler |

Spot checks of the changes the register shows, against Rijksoverheid and municipal news: Albrandswaard (Cees Pille, 01-07-2025), Dordrecht (Nanning Mol, 05-06-2025), Haaksbergen (Gerard van den Hengel, 20-05-2025), Roerdalen (Jeffrey van Agtmaal, 01-07-2025), Oost Gelre (Gea Hofstede, 02-03-2026), Lisse (Jasper Nieuwenhuizen, 03-06-2025). Six of six confirmed. The register is the current source; the Wikipedia import was not.

## Decision

### 1. What is live

`bun run live` reads four more sources, each at most once a day (and again after 6 hours when a guard stopped it or the read failed), without a news trigger:

| Source key | Reads | Yields |
| --- | --- | --- |
| `gemeenten` | TOOI gemeenten, register export and medewerkers, CBS table | The 342 bodies and their council seats (organisation, position and `elects` relation), `established`, website, official name; the burgemeesters (also waarnemend); herindelingen (dissolved bodies, new bodies, `succeeded_by`) |
| `provincies` | TOOI provincies, register export, CBS table | A check that exactly 12 provincies exist and agree across three sources |
| `waterschappen` | TOOI waterschappen, register export and medewerkers | The 21 bodies, `established`, the dijkgraaf or watergraaf |
| `commissarissen` | Rijksoverheid overview | The 12 commissarissen van de Koning with the official date of appointment and birth date |

A daily run costs 12 requests (3 TOOI, 6 register, 2 CBS, 1 Rijksoverheid) and about 4 MB. The wethouders are implemented, but their write is off by default (`DEFAULT_OPTIONS.wethouders` in `pipelines/decentral-plan.mjs`, or `STAATSGRAAF_LIVE_WETHOUDERS=1`): see section 8.

### 2. Identity

- **Bodies** are keyed on the official code (`gm0363`, `ws0654`, `pv22`; the register, TOOI and CBS use the same codes for gemeenten and provincies). The map from code to org id lives in `research/P-live-state.json` under `decentral.<source>.codes`, together with the official name last seen. It starts from the CBS name (the dataset was built from it), then the TOOI and register names, with the type word and a leading "van" or "de" ignored. Two matches stop the source; an unmatched body in the dataset stops it too. The schema has no code field, so codes stay in the state file.
- **A name change** (the code stays, the official name moves) updates `name`, keeps the id, and keeps the old name as an alias, for the gemeente and its gemeenteraad. It is listed for review.
- **Office holders** have no person id in the sources, only a name such as "Dhr. mr. J.H.C. van Zanen". A form is matched in this order: the holder of the same position (surname decides, because the dataset often holds a call name: "Hein van der Loo" is W.H.J.M.); then, among people who hold or held a decentral office, the same surname with an initial that fits; then, for a surname-only form, the one person who left an office with that surname in the same run (a burgemeester who moves); otherwise a new person is created, named as the source gives it (initials and surname), with the register form as alias. A person who ends the run with two open offices is listed.
- **Two different people named as head of one body** (Scherpenzeel) change nothing for that body and are listed. A duplicate row of one person counts once, and a waarnemend row is ignored beside a regular one.

### 3. Guard rules (a source writes only when its own data is consistent, as in ADR 0024 section 5)

- **Bodies.** The number of current bodies is in a plausible range (gemeenten 300 to 400, provincies exactly 12, waterschappen 15 to 30). TOOI (codes without an end date), the register and, for gemeenten and provincies, CBS name exactly the same codes. For gemeenten TOOI and CBS agree on the province of each. Any difference stops the source with the codes named. Around 1 January one of the sources can lead by a few days; the source then stays stopped (retry every 6 hours) until they agree.
- **Heads.** The register names a burgemeester or dijkgraaf for at least 97 percent of the bodies, or the file is truncated or restructured.
- **Bulk.** Up to 5 percent of the bodies (at least 5) may lose their head in one run. More need an event: a herindeling event in TOOI inside the last 60 days, or the first read of a source that replaces a secondary one (`first-read`, once per source, recorded as `holdersBootstrapped` in the state). Herindelingen themselves (dissolved plus new bodies) count the same way against 5.
- **Commissarissen.** Exactly 12 rows, every province found in the dataset once, every row with an appointment date, at most 3 changes in a run.
- **A new waterschap or provincie** in the sources with no organisation in the dataset stops that source (only gemeenten are created automatically; the last waterschap merger was 2017).
- The exit codes, the review queue and `research/qa/live-run-latest.json` work as in ADR 0024.

### 4. Closing, dates and herindelingen

- A head who is no longer named gets `end` = the retrieval date, confidence medium, and a review entry, as in ADR 0024 section 7. A new head gets an unknown start (ADR 0020): the register names no date. The predecessor and successor links are set when the change is one for one.
- A commissaris van de Koning is dated from the Rijksoverheid table (high); the predecessor ends the day before the successor's date (medium).
- A gemeente or waterschap that TOOI ends is dissolved on the official end date (`dissolved` on the body and its raad and college), its office holders end that day with `endReason: reorganisatie` (high), and `succeeded_by` relations point to the successors from the TOOI event. A gemeente that TOOI, the register and CBS all name and the dataset lacks is created with its gemeenteraad, college, three positions and the usual relations; its head follows from the register.
- `established` is filled from the register start date (or TOOI) when empty, and never overwritten. Council seats follow the register (39 gemeenten differ today).

### 5. Apply

`pipelines/live-apply.mjs` now also applies organisations: new ones are inserted, an existing one changes only name, aliases, seats, `established`, `dissolved` and website and gains source references. An existing position changes only `seatsCount`, an existing relation only `seatsAppointed` and `validTo`. A tenure that the register confirms and that cited the Wikipedia list is rewritten once with the register as its source (the planner names these ids; the people gain the reference), so the dataset cites the source that now confirms the fact. Unchanged records stay as they are, and a second run changes nothing in tenures, people or organisations.

### 6. Provenance

Every new source record carries its URL, retrieval date and licence: `src:koop-medewerkers-<level>` and `src:koop-<level>` (CC0-1.0), `src:tooi-<level>` (`unknown`, facts only), `src:cbs-<table>-live` (CC-BY-4.0 with the credit line in `ATTRIBUTION.md`), and the existing `src:rijksoverheid-cvdk-overzicht`. A person created from the register has the register as the only source and no birth date or party.

### 7. Privacy

The register holds personal data of office holders (KB of 16 July 1859, notified to the AP as m1368142); `research/O-licenses.md` section 1.4 already limits us to persons with a modelled public function. We store the name as the source gives it (initials and surname), no address, party or birth date, and nothing from the many non-political rows (Woo-contactpersoon, secretariaat, teamleider).

### 8. Named gaps

1. **Raadsleden** (8.6 thousand rows): initials and surname only, no fractie, no person id, and a page per person does not fit the file budget (ADR 0022: 20,000 files, now about 9,600 after pruning). Not ingested until the export has people without a page or an open source with fractie (Kiesraad results) is added.
2. **Wethouders** (1.4 thousand rows in 341 of 342 gemeenten): the source is good enough and the planner and tests are written, but the write is off. It would add about 1.4 thousand people and about 2.8 thousand files, and make the people list page several times heavier (4.3 MiB today). The owner of `web/` decides; then flip the option.
3. **Gedeputeerden and Statenleden**: the register fills Gedeputeerde Staten for 7 of 12 provincies and holds stale rows (Zuid-Holland lists two voorzitters); the provincial sites are not machine-readable or openly licensed.
4. **Algemeen en dagelijks bestuur of the waterschappen**: no open register names them.
5. **Start dates of new burgemeesters and dijkgraven**: the register has none. The Rijksoverheid items "Nieuwe burgemeester in X" carry dates but are not structured; a later step can date the unknown starts from them.
6. **Scherpenzeel**: the register lists two burgemeesters (W. Jaeger, M.C. Teunissen); nothing changed, and a review entry says so.
7. **TOOI licence**: no statement was found; the records say `unknown`.
8. **Not modelled**: locoburgemeester, griffier, gemeentesecretaris, secretaris-directeur (below the political tier, `docs/03-dutch-government-model.md` section on the person floor).
9. **Party of a burgemeester or dijkgraaf**: none of the live sources gives it; new people have none.
10. **Hilversum and Wijdemeren**: the Kiesraad announces herindelingsverkiezingen on 18-11-2026, so a merger is expected on 01-01-2027. Nothing is applied before TOOI, the register and CBS show it.

## Consequences

- On the first run (06-10-2026) 27 burgemeesterstenures closed and 29 opened (2 gemeenten had none), 27 people were created, 9 waarnemend flags changed, 39 council sizes and 168 organisation records were updated, 123 gemeenten and 6 waterschappen got an `established` date, and about 310 tenures now cite the register instead of Wikipedia. `research/qa/live-review-queue.md` lists each.
- The methodology page can say that provincies, gemeenten and waterschappen follow official sources daily, with the limits above (recommended wording is in the changelog entry of 06-10-2026).
- The change feed grows with the first run only.
- A herindeling is now a data event: the next one (Hilversum and Wijdemeren) should need no person.
- The decision about wethouders and raadsleden belongs to the web owner and the file budget, not to the pipeline.
