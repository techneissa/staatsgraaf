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
- The first paint is lighter than before for the same page: cards are built when a group's "Toon meer" is opened.
- Cabinet changes need no alias edit for title aliases; they follow the tenures. Curated aliases still need a sourced record in `data/`.
- Stored translations whose source links changed are stale and are retranslated by the next news run.
