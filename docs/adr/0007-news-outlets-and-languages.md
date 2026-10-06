# ADR 0007: news outlets, cadence, entity links, and languages

- Date: 18-09-2026
- Status: accepted. The owner decided the two open questions on 18-09-2026: a full bilingual news section now, machine translation in a later phase.
- Supersedes: none. Extends `docs/09-content-and-ai-policy.md` section 5.
- Amended 05-10-2026: entity links are now filtered for relevance and precision, section blocklists exist, and items without a real mention sit behind a toggle (`docs/adr/0021-news-relevance.md`).
- Amended 06-10-2026: points 1, 6, 7 and 8 changed in fact. The registry grew from 14 to 29 enabled feeds, with Politiek sections and official bodies; an official body and a politics section count as relevant by source; the store keeps items the feeds drop (`docs/adr/0021-news-relevance.md`, amendment 1).
- Amended: point 4 is superseded by `docs/adr/0016-news-machine-translation.md` (24-09-2026). Headlines and leads are now machine translated, and the news run is hourly during the Dutch day (ADR 0016).

## Context

The news layer shipped at launch with ten Dutch newspaper and broadcaster feeds, one nightly fetch, and entity links to organisations, people, positions, and topics. The owner asked on 18-09-2026 for a news section that covers public broadcasters, political and TV news, national news such as NOS, and alternative outlets such as YouTube channels, Substack newsletters, and blogs that cover Dutch politics, refreshed hourly and daily, with links from key words to every person, place, position, event, and topic, and presented in Dutch and English. The owner also chose a full bilingual section and deferred machine translation.

Constraints that shape the answer: the site is a static export with no runtime fetches (`docs/06`), all rights reserved outlets may only contribute headline, deep link, and time (`research/O-licenses.md`), language models may not add a fact a source does not state (`docs/09`), and the repository is private, which caps GitHub Actions at the free minutes.

## Decision

1. **A feed registry.** `pipelines/feeds.json` lists every outlet with its URL, kind, language, license or rights note, the HTTP status and date of the last verification, and an enabled flag. A feed that cannot be fetched stays in the registry disabled, with its status, as a named gap. Outlets are only added after a live fetch.
2. **Kinds.** Each item carries `publisherKind`: publieke-omroep, krant, commerciele-omroep, online, video, nieuwsbrief, blog, vakmedia, or overheid. Official feeds from Rijksoverheid and the Kamers are news of kind overheid and never replace the official pages as the source of a tenure.
3. **Entity and place links.** The linker matches organisations, people, positions, topics, and now places, where a place is the gemeente or provincie organisation record. Matched alias strings are stored as `keywords` on the item so the reader can see why a link was made. Common-word municipality names use a stricter rule, documented in `research/J-nieuwsbronnen.md`. Events are not a record type in schema v1; an event layer is a Phase 7 proposal.
4. **Two languages, no machine translation yet.** Each item carries `language`, nl or en, set from the outlet. English coverage comes from outlets that publish in English about the Netherlands. On 18-09-2026 the owner chose to add machine translation in a later phase, not now, so it stays off. Adding it needs its own ADR that names the engine, the cost, and the disclosure, because `docs/09` forbids a language model from adding a fact a source does not state. Until then an English reader sees the English outlets only and the page says so.
5. **Two surface languages, two routes.** The owner chose a full bilingual news section on 18-09-2026. Dutch lives at `/nieuws/` and English at `/news/`, each with its own day archives (`/nieuws/[date]/`, `/news/[date]/`) and outlet pages (`/nieuws/bronnen/`, `/news/sources/`). The English view carries translated interface strings in `web/lib/news-i18n.ts`; the rest of the site stays Dutch. Both views keep the nl/en item filter, so a reader on either route can widen to all outlets.
6. **Cadence.** The nightly refresh keeps fetching news. A second workflow, `.github/workflows/news.yml`, runs the news fetch, validate, test, build, and deploy every six hours. Hourly is one line away in that file and is the target once the repository is public or the Actions minutes allow it. The page groups items as afgelopen uur, vandaag, gisteren, deze week, and eerder, so the hourly and daily views exist regardless of how often the build runs.
7. **What ships from an outlet.** Headline, deep link, publication time, publisher, and, for feeds whose license allows it, the lead. No images from all rights reserved outlets. Summaries stay a rendering of headline and lead, nothing beyond the feed, as `docs/09` section 5 requires.
8. **Alternative outlets are welcome once a feed is verified live.** The registry took two English outlets (DutchNews.nl, NL Times), a blog (Sargasso), and a newsletter (Stemvee) after a live fetch on 18-09-2026. The YouTube channel RSS endpoint returned 404 from the build environment, so no video feed is enabled; the channel id is recorded as a named gap in `pipelines/feeds.json` rather than guessed at.

## Consequences

- Readers get one page for Dutch government news across outlet kinds, with every mentioned person, organisation, place, and topic one click away.
- The outlet list is transparent on `/nieuws/bronnen/` and `/news/sources/`, including what is taken from each outlet and under which rights.
- The six-hourly build adds roughly five deploys a day. Cost stays within the free tier (the repository is public since 05-10-2026, so Actions minutes are free, ADR 0023); going hourly is a scheduling change, not a design change.
- Machine translation stays an open future phase. It is no longer an open question about whether, only about engine, cost, and disclosure, which a later ADR will record.

## Verification recorded at decision time

See `research/qa/news-outlets-18-09-2026.md` for the registry verification table and the per-outlet, per-kind, and per-language counts, and `CHANGELOG.md` for the shipped routes.

## Amendment 1 (06-10-2026): the registry, the store and the cadence

The owner reported on 06-10-2026 that the news was a few days old and thin. The facts below replace what points 1, 6, 7 and 8 stated. The relevance rule and its numbers are in `docs/adr/0021-news-relevance.md`, amendment 1; the feed tests are in `research/qa/news-scope-06-10-2026.md`.

- **Point 1, the registry.** An entry may carry `scope: "politiek"` (a feed or section wholly about Dutch politics and government), `datesAreAmsterdamLocal` (Amsterdam wall-clock time under a UTC label) and `format: "news-sitemap"` (a Google News sitemap instead of RSS). Several entries may share one publisher. The registry lists 31 feeds, 29 enabled. A feed that cannot be fetched, is stale, or that robots.txt disallows is disabled with its status, or is a named gap in `gaps`. A feed whose robots.txt disallows its path for all agents is not read: DutchNews.nl `/feed/` (`Disallow: /feed/`, 06-10-2026) is off and its Politics section feed replaces it.
- **Point 2, kinds.** `overheid` now has five feeds: Rijksoverheid.nl (news sitemap, CC0), Tweede Kamer, Autoriteit Persoonsgegevens, CPB (CC BY 3.0 NL) and CBS (CC BY 4.0). An item of kind `overheid` is relevant by source. It still never replaces the official page as the source of a tenure.
- **Point 6, cadence.** The refresh runs every 3 hours (`15 */3 * * *`, ADR 0004 amendment of 05-10-2026), not every six hours. Each run keeps the items the feeds no longer show, for 30 days (7 days for items that are not relevant), so a feed that holds 20 items no longer limits the site to its last six hours.
- **Point 7, what ships.** Unchanged: headline, deep link, time, and the lead the feed supplies. Some of the new outlets supply no lead (de Volkskrant, Trouw, the Rijksoverheid sitemap); those cards show the headline only. Images come only from hosts in the CSP `img-src`.
- **Point 8, alternative outlets.** Stemvee is off (newest item 29-10-2025). Joop (BNNVARA), Follow the Money, Elsevier Weekblad, EenVandaag and NPO Radio 1 joined after a live fetch on 06-10-2026. De Telegraaf is a named gap: its feed answers, but its robots.txt reserves all rights against text and data mining and automatic data collection. NRC, FD and RTL Nieuws carry the same kind of reservation and stay in the registry until the owner decides.
