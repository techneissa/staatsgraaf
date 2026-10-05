# Workstream K: topics

This file explains `research/K-topics.json`. It defines the Dutch topic set, the responsible organizations and positions per topic, and the keyword lists the news linker uses. Raw snapshots live under `research/raw/K/`.

## Scope covered

In scope:

- The twelve starting topics, refined to twelve `topic:` records: wonen, zorg, toeslagen, klimaat en energie, asiel en migratie, onderwijs, veiligheid, openbaar bestuur en democratie, arbeidsmarkt, stikstof en landbouw, infrastructuur, koninkrijksrelaties.
- Per topic a list of responsible organizations (`org:` ids drawn from workstreams A to G), responsible positions (`pos:` ids from A and D G), and a keyword list for the linker.
- A keyword test set: per topic real article URLs from the feeds that workstream J fetched, with the matching keyword shown.

Out of scope, and left to the named owner:

- The production linker and topic assignment. Build area Q owns the fetcher, the linker, and topic assignment (`docs/06-build-plan.md`).
- The topic records in `data/topics.json`. The orchestrator merges `topics[]` at the Phase 2 gate.
- The alias gazetteer. Workstream J owns `aliases[]`. This file only supplies `topic:` keyword material for J's fallback.

Counts produced:

| Item | Count |
| --- | --- |
| Topics | 12 |
| Topics with at least three responsible organizations | 12 of 12 |
| Organizations referenced (unique) | 120 |
| Positions referenced (unique) | 25 |
| Keywords total | 268 |
| Source records added | 43 |
| Gaps | 8 |

## Sources fetched with dates

All pages below were fetched live on 18-09-2026 and snapshotted under `research/raw/K/`. The bewindspersonen pages state each bewindspersoon's portfolio, which is the primary evidence for the topic-to-organization mapping. The ministerie pages do the same at ministry level. The feeds were fetched by workstream J on 18-09-2026 and are reused here only to test keywords.

| Source | URL | Retrieved | Yield |
| --- | --- | --- | --- |
| Rijksoverheid, bewindspersonenoverzicht | https://www.rijksoverheid.nl/regering/bewindspersonen | 18-09-2026 | 28 bewindspersonen van het kabinet-Jetten |
| Rijksoverheid, ministerieoverzicht | https://www.rijksoverheid.nl/ministeries | 18-09-2026 | 12 ministeries |
| Rijksoverheid, 21 bewindspersonenpagina's | https://www.rijksoverheid.nl/regering/bewindspersonen/&lt;slug&gt; | 18-09-2026 | Portefeuilletaken per bewindspersoon; 21 pagina's onder `research/raw/K/bewindspersonen/` |
| Rijksoverheid, 12 ministeriepagina's | https://www.rijksoverheid.nl/ministeries/ministerie-van-&lt;slug&gt; | 18-09-2026 | Onderwerpen en taken per ministerie; 12 pagina's onder `research/raw/K/ministeries/` |
| NOS feed | https://feeds.nos.nl/nosnieuwsalgemeen | 18-09-2026 | 20 artikelen voor de keyword-testset |
| NU.nl feed | https://www.nu.nl/rss/Algemeen | 18-09-2026 | 30 artikelen |
| NRC feed | https://www.nrc.nl/rss/ | 18-09-2026 | 157 artikelen |
| AD feed | https://www.ad.nl/rss.xml | 18-09-2026 | 30 artikelen |
| de Volkskrant feed | https://www.volkskrant.nl/rss.xml | 18-09-2026 | 79 artikelen |
| Trouw feed | https://www.trouw.nl/rss.xml | 18-09-2026 | 103 artikelen |
| Het Parool feed | https://www.parool.nl/rss.xml | 18-09-2026 | 127 artikelen |
| FD feed | https://fd.nl/?rss | 18-09-2026 | 38 artikelen |
| RTL Nieuws feed | https://www.rtlnieuws.nl/rss.xml | 18-09-2026 | 845 artikelen |
| Binnenlands Bestuur feed | https://www.binnenlandsbestuur.nl/feeds/articles.rss | 18-09-2026 | 150 artikelen |

Per-topic primary source (the page that states the portfolio). Positions link to the same page as the org unless noted.

| Topic | Primary sources (ids in `sources[]`) |
| --- | --- |
| Wonen | `src:k-bewindspersoon-elanor-boekholt-osullivan`, `src:k-ministerie-binnenlandse-zaken-en-koninkrijksrelaties` |
| Zorg | `src:k-bewindspersoon-sophie-hermans`, `src:k-bewindspersoon-mirjam-sterk`, `src:k-ministerie-volksgezondheid-welzijn-en-sport` |
| Toeslagen | `src:k-bewindspersoon-sandra-palmen-schlangen`, `src:k-bewindspersoon-eelco-heinen` (ministerie van Financiën), `src:k-ministerie-financien` |
| Klimaat en energie | `src:k-bewindspersoon-stientje-van-veldhoven`, `src:k-bewindspersoon-jo-annes-de-bat`, `src:k-bewindspersoon-heleen-herbert`, `src:k-ministerie-economische-zaken-en-klimaat` |
| Asiel en migratie | `src:k-bewindspersoon-bart-van-den-brink`, `src:k-ministerie-justitie-en-veiligheid` |
| Onderwijs | `src:k-bewindspersoon-rianne-letschert`, `src:k-bewindspersoon-judith-tielen`, `src:k-ministerie-onderwijs-cultuur-en-wetenschap` |
| Veiligheid | `src:k-bewindspersoon-david-van-weel`, `src:k-ministerie-justitie-en-veiligheid` |
| Openbaar bestuur en democratie | `src:k-bewindspersoon-pieter-heerma`, `src:k-bewindspersoon-rob-jetten`, `src:k-ministerie-binnenlandse-zaken-en-koninkrijksrelaties` |
| Arbeidsmarkt | `src:k-bewindspersoon-hans-vijlbrief`, `src:k-bewindspersoon-thierry-aartsen`, `src:k-ministerie-sociale-zaken-en-werkgelegenheid` |
| Stikstof en landbouw | `src:k-bewindspersoon-jaimi-van-essen`, `src:k-bewindspersoon-silvio-erkens`, `src:k-ministerie-landbouw-visserij-voedselzekerheid-en-natuur` |
| Infrastructuur | `src:k-bewindspersoon-vincent-karremans`, `src:k-bewindspersoon-annet-bertram`, `src:k-ministerie-infrastructuur-en-waterstaat` |
| Koninkrijksrelaties | `src:k-bewindspersoon-eric-van-der-burg`, `src:k-ministerie-binnenlandse-zaken-en-koninkrijksrelaties` |

### Keyword test set

Every topic's keyword list was run against the 1579 feed items in `research/raw/J/feeds/`. The table gives real matching articles. A title matches when at least one keyword of the topic appears as a whole word in title or teaser. Query date 18-09-2026.

| Topic | Matching article URL | Keyword(s) that matched |
| --- | --- | --- |
| Wonen | https://www.binnenlandsbestuur.nl/ruimte-en-milieu/kabinet-steekt-tot-2035-zeven-miljard-extra-in-woningbouw | woningbouw, bouw |
| Wonen | https://www.binnenlandsbestuur.nl/ruimte-en-milieu/maatregelen-lagere-huren-kosten-corporaties-4-miljard-euro | huur, corporaties |
| Wonen | https://www.binnenlandsbestuur.nl/ruimte-en-milieu/enexis-heeft-voor-86000-nieuwe-woningen-niet-direct-ruimte | woningen |
| Wonen | https://www.ad.nl/economie/het-was-een-prima-deal-maar-nu-de-saldering-stopt-gaat-woninghuurder-geld-toeleggen-op-zonnepanelen~a27fca04/ | huurders |
| Zorg | https://www.binnenlandsbestuur.nl/sociaal/ruim-750-jongeren-met-een-op-een-jeugdzorg | jeugdzorg |
| Zorg | https://www.binnenlandsbestuur.nl/sociaal/gezamenlijke-excuses-aan-slachtoffers-gesloten-jeugdzorg | jeugdzorg |
| Zorg | https://www.ad.nl/binnenland/zorgfraudeurs-strijken-ieder-jaar-miljarden-op-wordt-bijna-net-zo-veel-mee-verdiend-als-met-cocaine~ab956df1/ | zorg |
| Zorg | https://www.binnenlandsbestuur.nl/sociaal/kwetsbare-huishoudens-geraakt-door-kabinetsbeleid | zorg |
| Toeslagen | https://www.binnenlandsbestuur.nl/sociaal/toeslagenouder-bij-gemeente-moet-advocaat-zelf-betalen | toeslagen |
| Toeslagen | https://www.binnenlandsbestuur.nl/sociaal/atr-kraakt-onderbouwing-nieuwe-regels-voor-schuldhulp | schuldhulp |
| Toeslagen | https://www.rtl.nl/boulevard/artikel/5652538/schuld-ferry-doedens-bij-belastingdienst-blijkt-omvangrijk | belastingdienst |
| Klimaat en energie | https://nos.nl/l/2631389 | energie |
| Klimaat en energie | https://www.binnenlandsbestuur.nl/ruimte-en-milieu/een-crisis-en-herstelwet-voor-netcongestie-komt-er-nu-aan | netcongestie |
| Klimaat en energie | https://www.rtl.nl/nieuws/economie/artikel/5651661/politiek-haalt-tempo-uit-energietransitie-klimaatdoelen-praktisch | energietransitie, klimaatdoelen |
| Klimaat en energie | https://www.rtl.nl/nieuws/economie/artikel/5651522/energierekening-zon-140-euro-omhoog-volgend-jaar | energierekening |
| Asiel en migratie | https://nos.nl/l/2631449 | azc, asiel |
| Asiel en migratie | https://www.nrc.nl/nieuws/2026/09/17/epe-houdt-vast-aan-dwangsom-coa-en-legt-reguliere-asielopvang-stil-zolang-noodopvang-open-blijft-a4936993 | coa, asielopvang, noodopvang, dwangsom |
| Asiel en migratie | https://www.binnenlandsbestuur.nl/sociaal/meer-gemeenten-onder-toezicht-om-te-weinig-asielopvang | asielopvang |
| Asiel en migratie | https://www.binnenlandsbestuur.nl/bestuur-en-organisatie/terneuzen-doet-nieuwe-poging-om-azc-door-raad-te-krijgen | azc |
| Onderwijs | https://www.nrc.nl/nieuws/2026/09/10/het-praktische-brein-leert-anders-zadel-leerlingen-niet-op-met-dictees-en-rijtjes-sommen-a4936239 | leerlingen |
| Onderwijs | https://www.rtl.nl/nieuws/binnenland/artikel/5651556/schimmel-op-basisschool-franeker-leerlingen-tijdelijk-thuis-les | basisschool, leerlingen |
| Onderwijs | https://www.rtl.nl/nieuws/editienl/video/a0daebad-8f7a-49ac-a816-581ef4f7bc7c/tientallen-studies-nog-geen-keuze-dit | studie |
| Onderwijs | https://www.rtl.nl/nieuws/binnenland/artikel/5652739/student-universiteit-leiden-kreeg-punt-aftrek-te-laat-ingeleverd | student, universiteit |
| Veiligheid | https://nos.nl/l/2631403 | verdachte |
| Veiligheid | https://www.binnenlandsbestuur.nl/digitaal/politie-en-om-doe-aangifte-bij-cybercrime-en-betaal-niet | politie, cybercrime, aangifte |
| Veiligheid | https://www.binnenlandsbestuur.nl/bestuur-en-organisatie/van-weel-werkwijze-inlichtingenteam-politie-wordt-aangepast | politie |
| Veiligheid | https://www.binnenlandsbestuur.nl/bestuur-en-organisatie/positioneer-de-veiligheidsdriehoek-steviger | veiligheid |
| Openbaar bestuur en democratie | https://nos.nl/l/2631431 | debat, kabinet |
| Openbaar bestuur en democratie | https://www.binnenlandsbestuur.nl/bestuur-en-organisatie/verkiezingswinnaars-staan-in-39-gemeenten-buitenspel | verkiezingen, gemeenten |
| Openbaar bestuur en democratie | https://www.binnenlandsbestuur.nl/bestuur-en-organisatie/ik-heb-niet-veel-spannends-gehoord | debat, kabinet |
| Openbaar bestuur en democratie | https://www.binnenlandsbestuur.nl/bestuur-en-organisatie/borsele-wil-net-als-sluis-hoger-salaris-voor-college | gemeente |
| Arbeidsmarkt | https://www.rtl.nl/nieuws/economie/artikel/5651639/looneis-fnv-55-procent-plus-80-euro-bruto | fnv, cao, loon |
| Arbeidsmarkt | https://www.rtl.nl/nieuws/economie/artikel/5650477/cnv-eist-3-tot-55-procent-loonsverhoging | cnv, loonsverhoging |
| Arbeidsmarkt | https://www.nu.nl/economie/6410123/massale-staking-schoonmakers-hotel-vliegtuig-of-station-wat-maakt-het-uit.html | staking |
| Arbeidsmarkt | https://www.rtl.nl/nieuws/economie/artikel/5651628/schiphol-en-stations-blijven-vies-schoonmakers-staken-hele-week | staking |
| Stikstof en landbouw | https://www.binnenlandsbestuur.nl/ruimte-en-milieu/eerste-anderhalf-miljard-uit-het-stikstoffonds-komt-vrij | stikstof |
| Stikstof en landbouw | https://www.binnenlandsbestuur.nl/ruimte-en-milieu/stikstofplannen-geven-zicht-op-verlichting-crisis | stikstof |
| Stikstof en landbouw | https://www.rtl.nl/nieuws/binnenland/video/53a8e977-e514-4a47-afcf-f02d9331c856/demonstrerende-boer-met-koe | boer |
| Infrastructuur | https://www.binnenlandsbestuur.nl/ruimte-en-milieu/nijkerk-investeer-in-cruciale-infrastructuur | infrastructuur |
| Infrastructuur | https://www.nrc.nl/nieuws/2026/09/16/opnieuw-probleem-met-brug-rijkswaterstaat-sluit-a15-richting-maasvlakte-deels-om-scheurtjes-suurhoffbrug-a4936847 | brug, rijkswaterstaat, verkeer |
| Infrastructuur | https://www.rtl.nl/nieuws/binnenland/artikel/5652808/verkeer-over-suurhoffbrug-naar-maasvlakte-nog-weken-over | verkeer, brug |
| Infrastructuur | https://www.rtl.nl/nieuws/binnenland/artikel/5652283/weinig-camerabeelden-van-sabotageacties-prinsjesdag-spoor-stalen | spoor |
| Koninkrijksrelaties | https://www.binnenlandsbestuur.nl/bestuur-en-organisatie/1-miljoen-voor-versterking-lokale-democratie | koninkrijksrelaties |
| Koninkrijksrelaties | https://www.nu.nl/binnenland/6410149/klm-vlucht-naar-curacao-keert-om-vanwege-brandende-powerbank.html | curaçao |

Two caveats on the test set:

- The one-day sample under-covers koninkrijksrelaties and toeslagen. Koninkrijksrelaties has two matches and neither is a substantive Kingdom story. This is a data-coverage gap, not evidence that the keywords are wrong.
- Generic keywords such as `koninkrijk`, `terugkeer`, `bouw` and `auto` also match articles outside the policy field, for example `Verenigd Koninkrijk`. The linker must weight general terms lower or require a second signal. This is recorded as a gap and an open question. `terugkeer` was dropped from the asiel keyword list for that reason.

## Decisions

1. **Twelve topics, stable slugs.** Each topic has `id: topic:<slug>` and a matching `slug`. Names are Dutch, slugs English (`CONTRIBUTING.md` section 6). No topic was split or added: the starting set fits the bewindspersonen portefeuilles one-to-one, except that toeslagen and koninkrijksrelaties are small enough to stay single topics.
2. **The parent organization is the ministry that holds the portfolio, not a separate KGG or VRO ministry.** Rijksoverheid lists twelve ministeries. Klimaat en Groene Groei and Volkshuisvesting en Ruimtelijke Ordening have a minister but no separate ministerie page, so those topics point at `org:ministerie-van-economische-zaken-en-klimaat` and `org:ministerie-van-binnenlandse-zaken-en-koninkrijksrelaties`. The alternative, inventing a KGG ministry, was not taken. This matches the Phase 0 snapshot section 2.
3. **Responsible organizations are `org:` ids that already exist in workstreams A to G.** No new organization was created. Where a suitable body exists in a lower workstream (for example `org:zbo-...` from C or `org:gemeente-...` from G), it is used rather than the ministry alone, because that is the body that actually executes the policy.
4. **Responsible positions are the bewindslieden plus, where meaningful, the executive head of the implementing body.** The minister and staatssecretaris positions come from workstream A; `pos:korpschef-politie`, `pos:voorzitter-college-van-procureurs-generaal`, `pos:president-hoge-raad` and `pos:nationale-ombudsman` come from E and F. Committee seats in workstream D were not attached to topics, because a topic's responsible actor is the executive, not the parliamentary scrutiny.
5. **Keyword selection is evidence-based.** A candidate keyword was kept when it matched at least one real feed article in the J sample, except for a small set of canonical core terms (`toeslagen`, `toeslag`, `woningcorporaties`, etc.) that carry the topic name. Single high-frequency Dutch words that only produce noise were dropped (`om`, `staten`, `wilde`, `terugkeer`).
6. **The topic schema has no `sources` field.** `schema/v1/topic.schema.json` sets `additionalProperties: false` and allows only `id`, `slug`, `name`, `description`, `organizations`, `positions`, `keywords`, `trending`. The task asked for `sources[]` on each topic. To pass `node scripts/validate.mjs --research`, the topic records follow the frozen schema and the per-topic sources live in `sources[]` and in the per-topic table above. A schema change is proposed under Gaps. The alternative, adding `sources` and failing validation, was not taken because the schema change process in `docs/04-data-model.md` section 18 must run first.
7. **The test set is recorded in markdown, not in JSON.** The envelope has no test-set field and the schema forbids extra keys, so the keyword-to-article proof is in the table above and the article URLs are not added as `src:` records (they are news, owned by build area Q).

## Gaps

Mirrors the `gaps[]` array in the JSON.

1. **`topic.sources` ontbreekt in het schema.** `schema/v1/topic.schema.json` staat `additionalProperties: false` en kent geen `sources`-veld, terwijl de opdracht per topic een `sources[]` vraagt. Endpoint: `schema/v1/topic.schema.json`. Resume: besluit nemen in een ADR of `topic.sources` wordt toegevoegd; tot dan staat de bron per topic in dit markdownbestand en in `sources[]`.
2. **Geen zelfstandige organisatie voor het kabinet.** Workstream A modelleert `org:regering` en `org:ministerraad`, niet het kabinet van ministers en staatssecretarissen. Endpoint: https://www.rijksoverheid.nl/regering. Resume: `org:kabinet` toevoegen en de nieuwsalias daarheen verplaatsen.
3. **Rijksministerraad, Gevolmachtigde Ministers en Gouverneurs ontbreken.** Deze koninkrijksorganen en -posities zijn in A tot en met G niet gemodelleerd. Endpoint: https://www.rijksoverheid.nl/onderwerpen/koninkrijksrelaties. Resume: de koninkrijkslaag modelleren in een latere fase en aan `topic:koninkrijksrelaties` koppelen.
4. **Rijksdienst Caribisch Nederland ontbreekt als organisatie.** Endpoint: https://www.rijksdienstcn.com/. Resume: het record toevoegen en aan `topic:koninkrijksrelaties` koppelen.
5. **Veiligheidsregio's ontbreken als organisaties.** Workstream G modelleert de 25 veiligheidsregio's niet, terwijl ze onder veiligheid vallen. Endpoint: https://www.rijksoverheid.nl/themas/recht-veiligheid-en-defensie/veiligheidsregios-en-crisisbeheersing/veiligheidsregios. Resume: de regio's modelleren en aan `topic:veiligheid` koppelen.
6. **Koepels VNG, IPO en Unie van Waterschappen ontbreken.** Endpoint: https://vng.nl/. Resume: koepelorganisaties modelleren in een latere fase.
7. **De nieuwssteekproef dekt koninkrijksrelaties en toeslagen maar dun.** De feeds van 18-09-2026 bevatten vrijwel geen artikelen over het Koninkrijk en weinig over toeslagen. Endpoint: https://www.rijksoverheid.nl/onderwerpen/koninkrijksrelaties. Resume: meer feeds of een langere periode toevoegen en de testset opnieuw draaien.
8. **Algemene keywords geven valse positieven.** Woorden als `koninkrijk`, `terugkeer`, `bouw` en `auto` komen ook buiten het beleidsterrein voor, bijvoorbeeld `Verenigd Koninkrijk` en sport. Endpoint: `research/raw/J/feeds/`. Resume: de nieuwslinker moet context of een langere term gebruiken en algemene keywords laag wegen.

## Open questions

- Should the topic model grow a `sources[]` field, and does each topic then carry its own retrieval record? The orchestrator decides; this workstream recommends yes, because the topic-to-organization mapping is a sourced fact.
- Should `topic:openbaar-bestuur-en-democratie` include the Tweede en Eerste Kamer as "responsible" organizations, or only the executive? They are included now because the topic covers the democratic order, not only policy execution. Workstream D and the orchestrator can narrow this.
- Should `topic:veiligheid` list the rechterlijke macht as responsible? Courts are independent, not responsible to the minister. They are represented only through positions (`pos:president-hoge-raad`) and indirectly; workstream E or the orchestrator can decide whether to drop the judicial organizations entirely.
- Who owns the topic keyword weighting rule? Topic keywords are a fallback for the news linker (`docs/06-build-plan.md` section 6 item 5). Build area Q owns the threshold and the context rule; this workstream only supplies the terms.
