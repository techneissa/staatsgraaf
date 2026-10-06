# ADR 0021: news relevance, the section blocklist and linker precision

- Date: 05-10-2026
- Status: accepted. The owner decided on 05-10-2026 that news without a real mention of the Dutch state is hidden by default behind a "Toon al het nieuws" toggle.
- Extends: `docs/adr/0007-news-outlets-and-languages.md` (entity links), `docs/09-content-and-ai-policy.md` (no model writes a link).

## Context

On 01-10-2026 only 361 of 1,604 stored news items had an entity link and 643 had any link. 360 items were RTL `/boulevard/` celebrity news. Trouw had 0 links in 86 items. Many links that did exist were wrong: "Amsterdam" in a venue name linked to the gemeente (45 items), the outlet NOS linked to itself, the US network CBS linked to the Dutch statistics office, "regering-Trump" linked to the Dutch regering, and generic words such as "ziekenhuis" or "dijk" attached a topic. A relevance filter built on those links would have shown wrong items as relevant.

## Decision

1. **Relevance is derived, not stored.** `isRelevantNews` in `web/lib/news.ts` is true when an item has an entity (person, organisation, position), or a topic with evidence. The pipeline stores the keywords that produced each topic in the existing `keywords` field, so a topic without keywords is not relevant. No schema change.
2. **Default view.** `/nieuws/`, `/news/`, their day archives and the home band show relevant items. A native button with `aria-pressed`, "Toon al het nieuws" or "Show all news", reveals the rest. A status line states the split, for example "303 van 1.245 berichten noemen de overheid". The home band falls back to the newest items of any kind only when none is relevant.
3. **Section blocklist.** A feed in `pipelines/feeds.json` may carry `excludePaths`, each entry a URL path prefix with a reason. `isExcludedUrl` in `pipelines/news.mjs` drops matching items before they are stored. RTL `/boulevard/` is the first rule. A rule is added only for a section the owner names or a section that is wholly outside the subject.
4. **Linker precision.** Precision beats recall; a wrong link fails review. In `pipelines/link.mjs`:
   - A generic institution (regering, kabinet, politie, douane, defensie, de Kamer, Openbaar Ministerie, Raad van State, Rekenkamer, any `Ministerie van ...`) or a position title is dropped when the text points abroad (a foreign country, adjective, capital or leader, and no Dutch anchor such as Nederland or Tweede Kamer), and when a foreign adjective stands directly before it.
   - A bare place name is a government mention only with a cue that the municipality or province acts (gemeente, wethouder, burgemeester, provincie, gedeputeerde and so on), or in a government trade outlet (`publisherKind` vakmedia, today Binnenlands Bestuur). An explicit name such as "Gemeente Hoeksche Waard" always links.
   - A public broadcaster (NOS, NPO and the like) links only next to another state actor. The item's own publisher is never linked.
   - The acronym CBS links only as "het CBS" or next to a state actor.
   - Topic keywords that are everyday words or place names count only three at a time (or two policy terms when the text points abroad). Any other keyword attaches the topic alone.
   - A proper name with connector words ("Inspectie Gezondheidszorg en Jeugd") is a high-confidence alias and matches only as written, so the phrase "asiel en migratie" is not the ministry.
5. **Recall, only from the dataset.** Aliases come from `research/J-nieuwsbronnen.json` and point at records that exist in `data/` (a test checks every target). Title aliases such as "minister Heinen", "premier Jetten", "PVV-leider Wilders" and "burgemeester Halsema" are built at run time from the current tenures in `data/tenures.json` and `data/people.json`; an alias two people share is dropped. A model never writes a link.
6. **Recency.** Groups on `/nieuws/` are measured from the build clock, not the newest item, and each relative label carries its real date or time ("Vandaag, vrijdag 18 september"), so a page that outlives its build does not lie.
7. **Completeness.** Every relevant item is a card on the page, so filters on the default view are complete. Items that name nothing are cards for the newest ten per group and language; the rest are counted from compact rows, and the day archives and the "Eerdere dagen" list reach every item.

## Named gaps

- Parties (VVD, D66, PVV and others) are not records in `data/`, so a party name is not an entity and an item that names only a party stays behind the toggle. Adding party records is a data-model change and needs its own decision.
- A surname without a title ("Jetten begint zijn toespraak") is not linked. "Jetten" is also the surname of a second person in the dataset, and bare surnames of ministers collide with common words and foreign officials. Titles (minister, staatssecretaris, premier, burgemeester, fractievoorzitter, leider, Kamerlid) are the safe form.
- Foreign detection is a word list. A story about a country or leader that is not on the list can still link a Dutch institution; the spot checks record the residual rate.
- A police or court mention in routine crime news counts as relevant, because the Politie is a body in the dataset. If the owner wants crime reports behind the toggle, that is a one-line change to `GENERIC_INSTITUTIONS` and a new decision.

## Consequences

- The default news view is smaller and truer: on 01-10-2026, 296 of 1,245 stored items (after the blocklist) are relevant, 259 through an entity.
- The page ships fewer cards in its HTML, because a group builds its "Toon meer" cards only when opened. `/nieuws/` is 849 KB of HTML (164 KB gzip) against 973 KB (132 KB gzip) before; the largest day archive fell from 2.5 MB to 0.9 MB.
- Cabinet changes need no alias edit for title aliases; they follow the tenures. Curated aliases still need a sourced record in `data/`.
- Stored translations whose source links changed are stale and are retranslated by the next news run.

## Amendment 1: relevance by source, a longer store and a wider registry (06-10-2026)

- Date: 06-10-2026
- Status: accepted. The owner reported on 06-10-2026 that the news looked a few days old and thin, although Dutch outlets publish plenty of political news every day. Freshness was a failed refresh commit (fixed in 961825d). This amendment is the second cause, scope.
- Extends: points 1, 2 and 7 above. Points 3 to 6 stand unchanged. `research/qa/news-scope-06-10-2026.md` holds the feed tests and the numbers.

### Context

The 06-10-2026 data (13:32 UTC) held 1,209 items, of which 242 were relevant. Three things kept it thin:

1. **The store was rebuilt from the feeds alone.** A feed lists only its newest items: NOS 20 items (six hours), NU.nl 30, AD 30. Each run wrote exactly what the feeds still showed, so an item vanished from the site when it left its feed, a day or less later. The 30-day retention window never had anything to retain. On 06-10-2026 the store held 259 items from that day and 96 from 04-10-2026.
2. **The registry was mostly all-topic feeds**, so the political share was small, and it had no official body besides the trade outlet Binnenlands Bestuur.
3. **Relevance needed a link.** A Kamerdebat story that names only parties or surnames ("Jetten", "Vijlbrief", "VVD", "box 3") sits behind the toggle because parties are not records and surnames are not linked (named gaps above). On 06-10-2026, 73 items of the Politiek sections and the trade outlet tested below had no entity and no topic; the ones read were Dutch political or administrative stories.

### Decision

1. **Relevance by source.** `isRelevantNews` has two more routes next to the entity and the topic with evidence: the item has `scope: "politiek"`, or its `publisherKind` is `overheid`. Both are derived from stored fields, so records written before this amendment stay valid.
   - `scope` is a new optional field of a news item with one value, `politiek` (`schema/v1/news-item.schema.json`, `docs/04-data-model.md` section 10). The feed registry marks a feed or section that is wholly about Dutch politics and government with `scope: "politiek"`, and the news run copies it onto an item. A feed's content never sets it.
   - The news run withholds `scope` from an item whose title and lead point abroad: the linker's own test (`pointsAbroad` in `pipelines/link.mjs`: a foreign country, adjective, capital or leader, and no Dutch anchor such as Nederland or Tweede Kamer). A Politiek section also carries EU and foreign politics, and precision beats recall. Such an item is relevant only through an entity or a topic, as before.
   - **Links are untouched.** The source route adds no entity, no topic and no keyword. A linked item keeps exactly the links the linker rules of point 4 gave it; an item relevant by source and without links has none. The card shows the same "Genoemd" list as before.
   - `publisherKind` `overheid` needs no foreign test: an official body of the Dutch state is the subject.
2. **The status line says what it counts.** "N van M berichten gaan over of noemen de overheid" and "N of M items are about or mention the government" replace "noemen de overheid", because an item relevant by source need not name anything. The empty-state text, the noscript note and the source table label say the same. The toggle "Toon al het nieuws" is unchanged. `isRelevantNews` stays one pure function, and the page counts, the day counts, the source rows and the home band all call it, so they agree. `web/lib/news.test.mjs` also checks that the pipeline's copy of the rule (`isRelevantStored`, used to age out items) agrees with it on every combination.
3. **The store keeps what the feeds drop.** `runNewsPipeline` reads the previous `data/news.json` and keeps an item the feeds no longer show when all of these hold: it is inside the 30-day window, its outlet is still an enabled feed in the registry, no `excludePaths` rule drops it, its time is not in the future, and its source records still exist. It keeps the id and the links it was stored with, so translation records stay valid (the translation hash covers the headline and the marked-up lead, which do not change). An item that is not relevant (point 1) is kept for 7 days only, so the large all-topic RTL feed (about 830 items a week) does not fill the store; relevant items stay for 30 days. An outlet that leaves the registry takes its stored items with it. A story an outlet retracts stays for the window; its deep link may then be dead.
4. **A wider registry.** The 14 feeds became 29 enabled ones: Politiek sections of NOS, NU.nl, AD, de Volkskrant, Trouw and RTL Nieuws and the Politics section of DutchNews.nl, all with `scope: "politiek"` (Binnenlands Bestuur, a trade outlet for public administration, gets it too); the official feeds of Rijksoverheid.nl (news sitemap), Tweede Kamer, Autoriteit Persoonsgegevens, CPB and CBS (theme Overheid en politiek) with kind `overheid`; and EenVandaag, NPO Radio 1, Elsevier Weekblad, Joop and Follow the Money. Two feeds are switched off: the DutchNews.nl `/feed/` feed, because the outlet's robots.txt disallows `/feed/` for all agents, and Stemvee, whose newest item is from 29-10-2025. A feed whose robots.txt disallows its path is not read. The unreachable and the held-back candidates are named gaps in `pipelines/feeds.json` (Rijksoverheid RSS, Eerste Kamer, Raad van State, Rechtspraak, a Politiek feed of NRC, FD, Parool and NL Times, De Telegraaf). Several feeds may share one `publisher`.
5. **Dates are real.** A feed that writes Amsterdam wall-clock time with a UTC label (NPO Radio 1: "15:17:00 Z" two hours ahead of the real clock) carries `datesAreAmsterdamLocal` in the registry and is read as Amsterdam time. An item dated more than an hour ahead of the run is dropped, because it is not a publication time. The card shows date and time in Europe/Amsterdam from the stored instant.
6. **The home band.** It shows the newest 6 relevant items across outlets (it showed 3), at most 2 from one outlet, newest first. When fewer outlets have relevant news, the newest skipped items fill the band, and when none is relevant it falls back to the newest items of any kind. The cap applies to the home band only; `/nieuws/` lists every relevant item by time.

### Named gaps

- Parties and bare surnames are still not linked, so an item that names only them is relevant only through its source. A Dutch story in an outlet's general feed that names only a party stays behind the toggle.
- The foreign test is a word list. "De Vietnamese politie" in a NOS item still links the Dutch Politie (the word is not on the list), and so counts as relevant. Spot checks stay part of the news QA.
- A section feed is only as precise as the outlet's own section: a Politiek item about a Dutch topic that carries a foreign word and no Dutch anchor is left out, and an item about Brussels with no foreign word is kept.
- `bun run translate` takes the newest items first, so a long backlog of untranslated items delays the English version of political items behind irrelevant ones. Ordering by relevance is a change in `pipelines/translate.mjs`, not made here.
- Rijksoverheid.nl publishes news only in a Google News sitemap that lists the last two days; the RSS host `feeds.rijksoverheid.nl` no longer resolves.

### Consequences

- On the 06-10-2026 data (13:56 UTC, offline copy of the committed data plus one fetch of the new registry): 1,209 items stored became 1,479; relevant items 242 became 463 (371 with the new feeds and the old rule, 463 with the source rule: 73 Politiek items with no link and 19 official items). Relevant items per day for the last seven days went from 35, 26, 7, 7, 15, 26, 31 to 53, 56, 13, 13, 40, 51, 57. The store gains items from the longer window only from the second run on, so the effect of point 3 is not in these numbers.
- Each run fetches 29 feeds with a 1,000 ms throttle: about 60 seconds, against about 40 before.
- Items from official feeds with trigger words (kabinet, benoemd) can start the early official-source fetch of ADR 0006 and 0024 more often. The trigger only decides when the official sources are read, as before.
- Images from the new outlets are shown only when their host is in the CSP `img-src` of `web/public/_headers`; the run leaves out the others (81 items on 06-10-2026). Adding a host is a separate decision.
