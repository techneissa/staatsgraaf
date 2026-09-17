# Workstream J: nieuwsbronnen en koppeling

This file explains `research/J-nieuwsbronnen.json`. It covers three tasks: verify the publisher RSS feeds, build the alias gazetteer that maps news surface forms to entity ids, and prototype the entity linker. Raw responses live under `research/raw/J/`.

## Scope covered

In scope:

- Verify at least three publisher RSS feeds and find correct paths for the feeds that failed in `research/00-endpoints.md` section 8.
- Build the alias gazetteer over every alias-able entity in workstreams A to I: organizations, positions, and people. The envelope carries it in `aliases[]`.
- Prototype the entity linker and run it on a sample of real articles.

Out of scope, and left to the named owner:

- Topics and topic keywords. Workstream K owns `research/K-*.json`. No `topics[]` records and no topic-alias targets are produced here. `research/K-*.json` did not exist at run time, so the topic fallback could not be tested.
- The production linker. Build area Q owns the fetcher, the linker, dedup, image handling, and topic assignment (`docs/06-build-plan.md` section 5). The rules below are a specification and a prototype, not the shipped node module.
- Full article text. Feeds carry teasers only. Paywalled bodies were not fetched and no paywall was evaded.

Counts produced:

| Item | Count |
| --- | --- |
| Verified feeds (HTTP 200, parsed) | 10 |
| Feeds blocked | 1 (BNR) |
| Alias entries | 5694 |
| Alias targets `org:` | 2981 |
| Alias targets `person:` | 1259 |
| Alias targets `pos:` | 1454 |
| Organizations covered | 1545 of 1545 unique ids |
| People covered | 870 of 870 unique ids |
| Positions covered | 1430 of 1430 unique ids |
| Ambiguous alias strings dropped | 11 |
| Feed items parsed | 358 |
| Items with at least one high-confidence link | 100 |
| NewsItems in the verification sample | 12 |

The raw A to I counts are 1546 organizations, 879 people, and 1431 positions. They differ because nine person records repeat the same id across workstreams and one organization and one position id repeat. Deduplicating by id gives the coverage denominators above.

## Sources fetched with dates

Feeds were fetched on 2026-09-18 with a browser-like User-Agent, one request per URL, no cookies, and a one-second pause between requests. Raw bodies are under `research/raw/J/feeds/`.

| Publisher | Working URL | Status | Raw snapshot | Retrieval |
| --- | --- | --- | --- | --- |
| NOS | https://feeds.nos.nl/nosnieuwsalgemeen | 200 | `feeds/nos.xml` | 2026-09-18 |
| NU.nl | https://www.nu.nl/rss/Algemeen | 200 | `feeds/nu.xml` | 2026-09-18 |
| NRC | https://www.nrc.nl/rss/ | 200 | `feeds/nrc.xml` | 2026-09-18 |
| AD | https://www.ad.nl/rss.xml | 200 | `feeds/ad.xml` | 2026-09-18 |
| de Volkskrant | https://www.volkskrant.nl/rss.xml | 200 | `feeds/volkskrant.xml` | 2026-09-18 |
| Trouw | https://www.trouw.nl/rss.xml | 200 | `feeds/trouw.xml` | 2026-09-18 |
| Het Parool | https://www.parool.nl/rss.xml | 200 | `feeds/parool.xml` | 2026-09-18 |
| FD | https://fd.nl/?rss | 200 | `feeds/fd.xml` | 2026-09-18 |
| RTL Nieuws | https://www.rtlnieuws.nl/rss.xml | 200 | `feeds/rtl.xml` | 2026-09-18 |
| Binnenlands Bestuur | https://www.binnenlandsbestuur.nl/feeds/articles.rss | 200 | `feeds/binnenlandsbestuur.xml` | 2026-09-18 |

Correct paths found for the feeds that failed on the Phase 0 probe:

- de Volkskrant, Trouw, and Het Parool: `/rss/` returns 403 but `/rss.xml` returns 200. All three are DPG Media feeds.
- FD: `/rss` and `/rss.xml` return 404, but `/?rss` returns 200.
- RTL Nieuws: `/rss`, `/service/rss/`, and `/node/feed` return 403, but `/rss.xml` returns 200.
- Binnenlands Bestuur: all guessed `/rss` variants return 404. The homepage carries `<link href="https://www.binnenlandsbestuur.nl/feeds/articles.rss">`, which returns 200.

Blocked:

- BNR: `https://www.bnr.nl/rss`, `https://www.bnr.nl/rss.xml`, and `https://www.bnr.nl/feeds/nieuws` all return 403 with a Cloudflare interstitial. The block was not evaded.

Entity data for the gazetteer came from the workstream files that already exist. They were read, not refetched:

| Source | File | Note |
| --- | --- | --- |
| Organizations, positions, people | `research/A-...json` through `research/I-...json` | Retrieval dates are those recorded by each workstream |
| Feed URL list and failed paths | `research/00-endpoints.md` section 8 | Probed 2026-09-17, re-verified 2026-09-18 |
| Envelope contract | `shared/output-envelope.schema.json` | `aliases[]` extension, field names |
| Alias application | `pipelines/merge.mjs` (`applyAliases`) | Confirms `alias` and `target` field names |
| Linker rules location | `docs/06-build-plan.md` section 6 item 5 | Gazetteer match, threshold, ambiguity, topic fallback |

## Decisions

### Gazetteer shape

- Each `aliases[]` entry is `{ "alias": string, "target": string, "confidence": "high" | "medium" | "low" }`. `target` is an entity id with an `org:`, `pos:`, `person:`, or `topic:` prefix, matching `shared/output-envelope.schema.json` and `pipelines/merge.mjs`.
- Surface forms are drawn from the entity's own `name` (organizations and people) or `title` (positions), from the record's `aliases` array where present, and from mechanical derivations listed below. Every alias therefore traces to a record field that already carries a source in its workstream.
- Alias keys are deduplicated by `trim().toLowerCase()` with collapsed whitespace, the same normalization `applyAliases` uses. In the emitted file there are zero duplicate keys and zero keys that point to two targets.

### Alias derivation rules

- Organization `name` and explicit `aliases` are copied verbatim.
- An ASCII-folded variant of the name is added at medium confidence where it differs (`Financiën` to `Financien`).
- A leading type word is stripped to a short form: `Ministerie van X` to `X`, `Gemeente X` to `X`, `Provincie X` to `X`, `Waterschap X` and `Hoogheemraadschap (van) X` to `X`, `Openbaar Lichaam X` to `X`.
- Organ types get a short form that keeps the type word: `Gemeenteraad van X` to `Gemeenteraad X`, `Provinciale Staten van X` to `Provinciale Staten X`, `Gedeputeerde Staten van X` to `Gedeputeerde Staten X`, `College van burgemeester en wethouders van X` to `College van B&W van X`, `Eilandsraad van X` to `Eilandsraad X`, `Vaste commissie voor X` to `Commissie X`, `Directoraat-generaal X` to `DG X`.
- Position titles are copied verbatim. Where a title repeats across organizations it is dropped as ambiguous and each holder gets a scope-qualified fallback: `Wethouder` becomes `Wethouder van Utrecht`, `Gedeputeerde` becomes `Gedeputeerde van Utrecht`, `Secretaris-generaal` becomes `Secretaris-generaal van het Ministerie van Financiën`.
- People get their full name and explicit aliases only. Derived surname-only aliases were deliberately not generated. In an early run, surname aliases such as `de man` and `leest` matched ordinary Dutch words and produced false links, so precision was chosen over recall. Surname matching is a research target for build area Q, where a capitalized-and-context rule can be tested.

### Conflict and collision policy

- A candidate alias that resolves to two or more targets is dropped unless a curated or preferred target exists. This is the collision rule that keeps the gazetteer collision-free.
- Curated resolutions where the news sense is dominant:
  - `het kabinet` to `org:regering`, low confidence. Workstream A models `org:regering` and `org:ministerraad`, but not the kabinet (ministers and staatssecretarissen) as a distinct organization. The alternative, `org:ministerraad`, was not taken because the news word covers staatssecretarissen too.
  - `de regering` and `de ministerraad` to `org:regering` and `org:ministerraad`.
  - `de Kamer` to `org:tweede-kamer` (also an explicit alias on that record), `de Tweede Kamer`, `Staten-Generaal`; `de Eerste Kamer` and `de Senaat` to `org:eerste-kamer`.
- Preferred resolutions where a duplicate pair exists:
  - The short names and codes of the ministeries win over the same-named Tweede and Eerste Kamer committee aliases (`Financiën`, `DEF`, `FIN`, `J&V`, `LVVN`, `OCW`, `SZW`, `VWS`, and the full ministry names). Workstream D records those committee aliases too, so without this choice every ministry word would be ambiguous in news.
  - `Kiesraad` and `Nederlandse Emissieautoriteit` pick the non-`zbo-` organization id when both exist.
  - `SER` to `org:sociaal-economische-raad`, `RvR` to `org:raad-voor-de-rechtspraak`, `RvS` to `org:raad-van-state`, `Nationale Politie` to `org:politie`, `Nationale ombudsman` to the organization, `NEa` and `SGM` to their primary ids.
  - Three people exist under two ids with the same name: `Marjan van Kampen-Nouwen`, `Wendy Verkleij-Eimers`, and `José van Egmond`. The bare name points to the id without the city suffix. The other id remains a target for its qualified fallback and is a gap for the merge.

Dropped as ambiguous (11 strings). Each is either a genuine ambiguity or is covered by a qualified fallback:

`IMG`, `cluster`, `SBB`, `AM`, `BIZA`, `Groningen`, `Utrecht`, `Limburg`, and the bare position titles `Secretaris-generaal`, `Gedeputeerde`, `Wethouder`.

`IMG` (Inspectie Militaire Gezondheidszorg against Instituut Mijnbouwschade Groningen), `SBB` (Samenwerkingsorganisatie Beroepsonderwijs Bedrijfsleven against Staatsbosbeheer), `AM`, and `BIZA` have no dominant sense. `cluster` is an alias on 65 ZBO records. `Groningen`, `Utrecht`, and `Limburg` each name both a provincie and a gemeente or waterschap.

### Linker rules (for build area Q)

These rules belong in the news linker per `docs/06-build-plan.md` section 6 item 5. The prototype here implements them.

1. Gazetteer match. Normalize the article text with lowercase, whitespace collapse, and Unicode NFC. Match alias keys on word boundaries (`(?<![\p{L}\p{N}])alias(?![\p{L}\p{N}])`), longest alias first, one match per alias per article. A match inside an earlier match is skipped.
2. Case sensitivity. Acronym-like aliases (two to six characters, all uppercase in the gazetteer) match case-sensitively. This stops `NA` (Nationaal Archief) from matching `na`, and `OM` (Openbaar Ministerie) from matching `om`. All other aliases match case-insensitively.
3. Length floor. Single-token non-acronyms need at least five characters, multi-token aliases at least eight. Function words are skipped. This stops `de man` and similar strings from linking.
4. Confidence threshold. High confidence requires a multi-token alias of at least eight characters, an acronym of at least three characters, or a single word of at least six characters. Everything else is medium. The sample populates `entities[]` from high-confidence hits only, per the brief.
5. Ambiguous aliases. The gazetteer contains no alias pointing at two ids, so ambiguity is resolved before the linker runs. The one deliberate ambiguity is `het kabinet`, which is pinned to `org:regering` at low confidence and should be re-pointed when a distinct kabinet entity exists.
6. No match. If no entity alias matches, the linker falls back to topic keywords from workstream K. That fallback is unimplemented here because no K file exists yet. If both fail, the article keeps an empty `entities[]`. Never guess a link.

The prototype lives in the run script (not committed as a repo file; build area Q owns the shipped module). Its matching core:

```js
const re = new RegExp(`(?<![\\p{L}\\p{N}])${escapeRe(alias)}(?![\\p{L}\\p{N}])`, flags);
// flags "giu" for normal aliases, "gu" for acronym-like aliases
```

Summary markup keeps the matched surface text and wraps it once per high-confidence entity:

```
... <entity id="org:politie">politie</entity> ...
```

### News verification sample and the envelope

The frozen `shared/output-envelope.schema.json` sets `additionalProperties: false` and has no `news[]` array; `pipelines/merge.mjs` does not read news from envelopes. The 12 fetched NewsItems are therefore recorded as `src:j-news-01` through `src:j-news-12` in the envelope `sources[]` (type `news`, with publisher, published, and retrieved) and reproduced in full below. Build area Q owns the eventual `data/news.json`. This deviation from the brief is recorded as a gap.

Verification sample (12 real articles, one to two per publisher, all fetched 2026-09-18, ISO `published` normalized from the feed). `entities[]` lists high-confidence matches only; `topics[]` is empty because workstream K owns topics.

| id | Publisher | Title | entities |
| --- | --- | --- | --- |
| news:j-sample-1 | Binnenlands Bestuur | Kwetsbare huishoudens geraakt door kabinetsbeleid | org:regering, org:ministerie-van-volksgezondheid-welzijn-en-sport, org:ministerie-van-sociale-zaken-en-werkgelegenheid |
| news:j-sample-2 | AD | Burgemeester Overasselt roept kabinet op zware criminaliteit harder aan te pakken | person:joerie-minses, org:gemeente-heumen, org:regering |
| news:j-sample-3 | Binnenlands Bestuur | G4 luidt noodklok om daklozenproblematiek | org:gemeente-amsterdam, org:gemeente-rotterdam, org:regering |
| news:j-sample-4 | NOS | Nabestaanden van Goeloe doen aangifte van doodslag tegen politie | org:politie, org:gemeente-rotterdam, org:rwt-nederlandse-omroep-stichting-nos |
| news:j-sample-5 | AD | Bijna zestig aanhoudingen rond tegendemonstratie van Israël-manifestatie op de Dam | org:politie, org:gemeente-amsterdam |
| news:j-sample-6 | FD | De man van 2,9% | pos:minister-van-financien, person:eelco-heinen |
| news:j-sample-7 | NOS | Meer dan tien aanhoudingen bij anti-azc-protest in Opheusden, ME ingezet | org:politie, org:gemeente-neder-betuwe |
| news:j-sample-8 | NRC | Epe houdt vast aan dwangsom COA en legt reguliere asielopvang stil | org:zbo-centraal-orgaan-opvang-asielzoekers, org:gemeente-epe |
| news:j-sample-9 | NRC | Jetten: 'Gigantische beweging gemaakt' wat betreft bezuinigingen op sociale vangnet | person:rob-jetten, org:regering |
| news:j-sample-10 | NU.nl | Bloedbank Sanquin test in 9 provincies donoren individueel op westnijlvirus | org:provincie-fryslan, org:provincie-drenthe |
| news:j-sample-11 | NU.nl | Geen begrotingssteun vanuit oppositie na Prinsjesdag: premier Jetten terug bij af | org:tweede-kamer, person:rob-jetten |
| news:j-sample-12 | RTL Nieuws | Tientallen aanhoudingen bij Israël-manifestatie op Dam | org:politie, org:gemeente-amsterdam |

Three worked examples of `summaryMarkup`:

- Sample 1: `... het <entity id="org:ministerie-van-volksgezondheid-welzijn-en-sport">ministerie van Volksgezondheid, Welzijn en Sport</entity> (<entity id="org:ministerie-van-volksgezondheid-welzijn-en-sport">VWS</entity>) en het <entity id="org:ministerie-van-sociale-zaken-en-werkgelegenheid">ministerie van Sociale Zaken en Werkgelegenheid</entity> (<entity id="org:ministerie-van-sociale-zaken-en-werkgelegenheid">SZW</entity>)`
- Sample 2: `Burgemeester <entity id="person:joerie-minses">Joerie Minses</entity> van de Gelderse <entity id="org:gemeente-heumen">gemeente Heumen</entity> heeft <entity id="org:regering">het kabinet</entity> opgeroepen`
- Sample 8: `Epe houdt vast aan dwangsom <entity id="org:zbo-centraal-orgaan-opvang-asielzoekers">COA</entity> ... wil de <entity id="org:gemeente-epe">gemeente Epe</entity> nu zorgen dat de locatie alsnog sluit.`

The full 12 NewsItem records as emitted by the prototype:

```json
[
  { "id": "news:j-sample-1", "publisher": "Binnenlands Bestuur", "published": "2026-09-17T17:10:00.000Z", "entities": ["org:regering", "org:ministerie-van-volksgezondheid-welzijn-en-sport", "org:ministerie-van-sociale-zaken-en-werkgelegenheid"], "sources": ["src:j-news-01"] },
  { "id": "news:j-sample-2", "publisher": "AD", "published": "2026-09-17T19:35:00.000Z", "entities": ["person:joerie-minses", "org:gemeente-heumen", "org:regering"], "sources": ["src:j-news-02"] },
  { "id": "news:j-sample-3", "publisher": "Binnenlands Bestuur", "published": "2026-09-16T11:00:00.000Z", "entities": ["org:gemeente-amsterdam", "org:gemeente-rotterdam", "org:regering"], "sources": ["src:j-news-03"] },
  { "id": "news:j-sample-4", "publisher": "NOS", "published": "2026-09-17T17:39:16.000Z", "entities": ["org:politie", "org:gemeente-rotterdam", "org:rwt-nederlandse-omroep-stichting-nos"], "sources": ["src:j-news-04"] },
  { "id": "news:j-sample-5", "publisher": "AD", "published": "2026-09-17T21:38:04.000Z", "entities": ["org:politie", "org:gemeente-amsterdam"], "sources": ["src:j-news-05"] },
  { "id": "news:j-sample-6", "publisher": "FD", "published": "2026-09-17T22:30:01.000Z", "entities": ["pos:minister-van-financien", "person:eelco-heinen"], "sources": ["src:j-news-06"] },
  { "id": "news:j-sample-7", "publisher": "NOS", "published": "2026-09-17T22:17:25.000Z", "entities": ["org:politie", "org:gemeente-neder-betuwe"], "sources": ["src:j-news-07"] },
  { "id": "news:j-sample-8", "publisher": "NRC", "published": "2026-09-17T22:58:13.000Z", "entities": ["org:zbo-centraal-orgaan-opvang-asielzoekers", "org:gemeente-epe"], "sources": ["src:j-news-08"] },
  { "id": "news:j-sample-9", "publisher": "NRC", "published": "2026-09-17T15:28:44.000Z", "entities": ["person:rob-jetten", "org:regering"], "sources": ["src:j-news-09"] },
  { "id": "news:j-sample-10", "publisher": "NU.nl", "published": "2026-09-17T20:02:21.000Z", "entities": ["org:provincie-fryslan", "org:provincie-drenthe"], "sources": ["src:j-news-10"] },
  { "id": "news:j-sample-11", "publisher": "NU.nl", "published": "2026-09-17T17:50:45.000Z", "entities": ["org:tweede-kamer", "person:rob-jetten"], "sources": ["src:j-news-11"] },
  { "id": "news:j-sample-12", "publisher": "RTL Nieuws", "published": "2026-09-17T19:26:58.000Z", "entities": ["org:politie", "org:gemeente-amsterdam"], "sources": ["src:j-news-12"] }
]
```

`topics: []` is implied on each record. The `summary` and `summaryMarkup` for each record are in the run output and use the feed teaser; the markup is reproduced above for three of the twelve.

### Facts that are not high confidence

- Feed `published` values are the feed's own timestamps, normalized to ISO 8601. Some feeds omit a timezone or a seconds field; the value is converted as published, not recomputed.
- Two feed items were truncated by the feed itself (the NOS and NRC `description` fields end mid-sentence). The truncation is the publisher's, not ours.
- The gazetteer derives surface forms from names. A derived form such as `Heumen` from `Gemeente Heumen` is a documented derivation, not an official alias.

## Gaps

Mirrors `gaps[]` in the JSON.

1. BNR RSS feed. `bnr.nl` returns 403 with a Cloudflare interstitial for `/rss`, `/rss.xml`, and `/feeds/nieuws`. The block was respected and not evaded. Endpoint: https://www.bnr.nl/rss. Resume: find a BNR path that is not behind the challenge or license the feed, then record the working URL.
2. Other news sources without a verified feed. Telegraaf, de Correspondent, Follow the Money, Nieuwe Revu, and Openbaar Bestuur were not probed. Endpoints: publisher homepages. Resume: probe each homepage for `<link rel="alternate" type="application/rss+xml">` and record the feed or a named gap.
3. VNG as an entity. The Vereniging van Nederlandse Gemeenten is not an organization in workstreams A to I, so there is no id for the required `VNG` alias. Endpoint: https://vng.nl/. Resume: add a koepel or samenwerkingsverband organization and point the alias at it.
4. IPO, Unie van Waterschappen, veiligheidsregio's, GGD'en, omgevingsdiensten. These are outside workstream G and not modeled in A to I. Endpoints: https://www.ipo.nl/, https://www.uvw.nl/, the veiligheidsregio list on rijksoverheid.nl. Resume: model the samenwerkingsverbanden in a later phase and add their aliases.
5. A distinct organization for `het kabinet`. A models `org:regering` and `org:ministerraad`, not the kabinet of ministers and staatssecretarissen. Endpoint: https://www.rijksoverheid.nl/regering. Resume: add `org:kabinet` and move the alias.
6. No `news[]` array in the output envelope. `shared/output-envelope.schema.json` forbids extra keys and `pipelines/merge.mjs` does not read news. Endpoint: `shared/output-envelope.schema.json`. Resume: let build area Q fill `data/news.json`; the verification sample is in the envelope `sources[]` and in this markdown.
7. Topic fallback keywords. Workstream K has no file yet, so there are no topic ids or keywords. Endpoint: `research/K-*.json`. Resume: read `research/K-topics.json` when it exists and complete the fallback in the linker.
8. `pos:` aliases are not applied by the merge. `applyAliases` in `pipelines/merge.mjs` only attaches aliases to `org:` and `person:` targets; `pos:` and `topic:` targets are counted as skipped aliases. Endpoint: `pipelines/merge.mjs`. Resume: have build area K index the gazetteer for positions and topics, or read `aliases[]` directly in the news linker.
9. Full alias coverage for people with the same name. Three people have two ids with the same name. Endpoint: `research/G-decentraal.json` and `research/I-personen-en-benoemingen.json`. Resume: reconcile the duplicate people at the merge gate (`docs/07-workflow-and-roadmap.md` section 5 step 5) and point the gazetteer at the merged id.

## Open questions

- Should the container `org:regering` carry the news sense of `het kabinet`, or does workstream A add a distinct `org:kabinet`? Workstream A or the orchestrator decides. Until then the alias stands at low confidence.
- Should the gazetteer keep short ministry names when workstream D's committee records also claim them? The choice here prefers the ministerie; a merge-level reconciliation of those committee aliases may change this. Orchestrator decides.
- What is the target shape for the news linker, a shipped module in `pipelines/` or build area Q's `web/` code? `docs/06-build-plan.md` section 5 assigns the linker to Q. The rules above should move there unchanged.
- Do we add documented surname aliases once a capitalized-and-context rule can be tested? The prototype drops them for precision. Build area Q decides.
- Which additional publishers should the nightly fetcher include, and under what license? Workstream O owns the license determination per source.
