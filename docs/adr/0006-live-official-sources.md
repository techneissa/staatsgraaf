# ADR 0006: live official sources for office holders and the parliaments

- Date: 18-09-2026
- Status: accepted. Amended 05-10-2026 (see the last section).
- Supersedes: none. Extends ADR 0002 (change semantics) and ADR 0004 (the scheduled refresh).

## Context

Until this decision the nightly refresh only re-merged the static research envelopes from Phase 1, refetched the news feeds, and re-derived the change feed. A new minister-president, a new bewindspersoon, a Kamerlid who leaves, or a fractie that changes size never reached the dataset unless a person edited a research file. The owner asked on 18-09-2026 for easy, standing connections to the official government sites so that a change of office holder, and anything related to the parliaments, updates properly and on its own.

The verified endpoints already exist in `research/00-endpoints.md`: the Rijksoverheid bewindspersonen pages (CC0), the Tweede Kamer OData v4 gegevensmagazijn, and the Eerste Kamer leden and personele mutaties pages.

## Decision

1. **A fetcher, not a hand edit.** `pipelines/refresh-official.mjs` refetches the current office holders from those endpoints on every run and writes them as research envelope `research/P-live-ambtsdragers.json`, workstream P. The envelope holds only people, tenures, memberships, and the sources it fetched, with url, retrieval date, and license per source.
2. **The live envelope is the freshest authority for the tenures and memberships it actually changes.** For those two record types, merge gives workstream P the top tier only when the fetched record differs from the other candidates on a substantive field (person, position, start, end, seat, acting, entry mode, appointed by, predecessor, successor, end reason, or, for a membership, organisation, seat number, fractie). When the fetched record is identical, it defers to the existing higher-tier source, so a nightly no-op does not churn the legal provenance of a tenure that a wet or a Kamerstuk already backs. When an office holder is no longer on the official list, the open tenure or membership is closed with the retrieval date as the end date and the fetched page as the source, which makes it a substantive change and therefore wins. The exact rule and its tests live in `pipelines/merge.mjs`, `pipelines/merge.test.mjs`, and `research/P-live-ambtsdragers.md`.
3. **Fetched, never derived.** A value the official page does not state is carried forward from the existing dataset, not computed. In the first run the Eerste Kamer page gave only an `Anciënniteit` in days and no start date, so EK membership starts were carried forward from Phase 1 data; the Tweede Kamer OData `Van` date was fetched and used.
4. **Identity is resolved against the existing ids.** A person, position, or organisation is matched by normalised name and alias to the ids already in `data/`. A high-confidence match reuses the id. A medium-confidence match is written to the run report for review and is not applied. No match creates a new person record with a new id and a source. The first run reused every id and minted none.
5. **Order in the refresh.** The nightly workflow runs official refresh, merge, news, changes, validate, test, build, deploy, in that order. The change feed therefore carries the new and closed tenures as dated, sourced changes the next morning.
6. **Cadence.** Office holders change rarely, so once a night is enough. The news layer has its own faster cadence (ADR 0007).
7. **Every run writes a report** under `research/qa/` with per-source status, counts, matches for review, and gaps. A run that would close more than a handful of tenures at once stops before writing `data/` and reports instead, because a broken page layout must never look like a mass resignation.

## Consequences

- A change of government reaches the site within a day, sourced to the official page, with the old tenure closed rather than deleted. History stays intact.
- The parliaments are covered at the level of seats and members. Votes, committees, and Kamerstukken remain Phase 7 work on the same OData source.
- Blocked hosts remain named gaps. Where a page cannot be fetched the previous tenure stays open and the run report says so; nothing is guessed.
- The tenures the Phase 1 research recorded without an end date are now closed by evidence over time, which reduces the 844 never-tenured positions only where the official source lists a holder.
- Medium-confidence matches need a human glance. That review queue is part of the Phase 6 operations cadence in `docs/10-operations-runbook.md`.

## Verification recorded at decision time

See the first run report `research/qa/refresh-official-18-09-2026.md` and the counts in `CHANGELOG.md`.

## Amendment of 05-10-2026

The owner asked that people, seats and office holders follow the official sources without a manual step. ADR 0024 records the whole design; this section lists what it changes in this ADR.

- **Point 7 is replaced by an event-aware guard.** The fixed stop at "more than a handful" of closures (`DEFAULT_MAX_CLOSURES = 5`) is gone. A source writes only when its own data is consistent (Tweede Kamer: 150 active seats, no duplicate seat or person, every member resolved, every fractie equal to `Fractie.AantalZetels`; Eerste Kamer: 75 members and matching fractie totals; bewindspersonen: 28 plus or minus 3). Up to 5 closures pass on their own; more need an event (a changed fractie, an election day or cabinet swearing-in inside 60 days). A source that fails writes nothing, the run lists it and exits with code 2, and the other sources still apply. The merger of GroenLinks-PvdA into PRO on 09-06-2026, at least 20 closures, is a passing test.
- **New sources.** The Tweede Kamer fetch now reads closed rows (the official end date `TotEnMet`), `Fractie`, open `FractieZetelVacature` and the Presidium rows, so the fractievoorzitter of each fractie, the Voorzitter and both ondervoorzitters of the Tweede Kamer are tenures. The Eerste Kamer fetch adds the fractie boards and the Voorzitter. Election dates come from the Kiesraad type pages.
- **Cursor state.** A small committed file, `research/P-live-state.json`, holds the `ApiGewijzigdOp` cursors, the Eerste Kamer page hashes and the map from a Tweede Kamer `Persoon.Id` to a person id. Rows are read by `ApiGewijzigdOp`, never by `Van`, so a late or backdated row is applied with its own dates.
- **Point 4, identity.** A Tweede Kamer person is keyed on `Persoon.Id` from the first match on. A new person gets a source and the name parts and birth date the source gives. A medium match (same surname and first letter) is created and listed as a possible duplicate in `research/qa/live-review-queue.md` instead of blocking the run.
- **Point 2, closing.** A closure takes the official end date of the row that closed it; only when none exists does it take the retrieval date, at confidence medium and with a review entry.
- **News is a trigger only.** A news item may make the official fetchers run early (`pipelines/news-trigger.mjs`); it never writes a fact.
- **Point 5, order.** `bun run live` replaces the `refresh-official` and `merge` steps of the nightly order for the office holders. It applies the live envelope to `data/` field by field, because a full `merge` is not idempotent on the committed dataset (ADR 0024, section 9).
- **Point 6, cadence.** The Tweede Kamer count poll is hourly, the Eerste Kamer hash check every 4 hours at most, the register (wave 2) daily; CI decides the schedule.
