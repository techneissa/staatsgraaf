# ADR 0007: news outlets, cadence, entity links, and languages

- Date: 18-09-2026
- Status: accepted. The owner decided the two open questions on 18-09-2026: a full bilingual news section now, machine translation in a later phase.
- Supersedes: none. Extends `docs/09-content-and-ai-policy.md` section 5.

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
- The six-hourly build adds roughly five deploys a day. Cost stays within the free tier while the repository is private; going hourly is a scheduling change, not a design change.
- Machine translation stays an open future phase. It is no longer an open question about whether, only about engine, cost, and disclosure, which a later ADR will record.

## Verification recorded at decision time

See `research/qa/news-outlets-18-09-2026.md` for the registry verification table and the per-outlet, per-kind, and per-language counts, and `CHANGELOG.md` for the shipped routes.
