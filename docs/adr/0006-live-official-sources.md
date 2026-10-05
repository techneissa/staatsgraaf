# ADR 0006: live official sources for office holders and the parliaments

- Date: 18-09-2026
- Status: accepted
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
- Medium-confidence matches need a human glance. That review queue is part of the Phase 6 operations cadence described in `.github/workflows/README.md`.

## Verification recorded at decision time

See the first run report `research/qa/refresh-official-18-09-2026.md` and the counts in `CHANGELOG.md`.
