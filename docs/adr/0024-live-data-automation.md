# ADR 0024: live data automation

- Date: 05-10-2026
- Status: accepted
- Supersedes: none. Amends ADR 0006 (live official sources) and builds on ADR 0002 (change semantics), ADR 0020 (unknown start) and ADR 0022 (delivery).

## Context

On 05-10-2026 the owner asked that profiles and people in the government and candidates change on their own after recent news or an election: no manual update of the people, the seats of each party, the Kamerleden, the head of each party or the Kamervoorzitter. The research of the same day (`docs/superpowers/audits/2026-10-05-live-data-sources.md`) found that the official sources can carry most of this, that news is a poor trigger (3 real office-change headlines among 66 keyword hits in 30 days, while the Tweede Kamer recorded at least 6 seat changes that no headline mentioned), and that the old closure guard (`DEFAULT_MAX_CLOSURES = 5`) would have stopped the legitimate merger of GroenLinks-PvdA into PRO on 09-06-2026 and would stop every post-election refresh. The owner decided that CI commits refreshed data back to `main` as a bot, so the pipelines must be deterministic, idempotent, validated and safe to run unattended.

## Decision

### 1. One command

`bun run live` (`pipelines/live.mjs`) runs, in this order: the news trigger check, the Tweede Kamer change check and fetch, the Eerste Kamer hash check, the bewindspersonen fetch, the election dates, the apply step, the change feed and the validation. Every step is conditional: counts and hashes first, one request per second per host, the user agent `StaatsgraafBot/0.1 (+https://github.com/techneissa/staatsgraaf)`. When nothing changed, a run costs 7 requests (4 counts, 2 Eerste Kamer pages, the news sitemap), takes about 5 seconds and writes no file.

The result is machine readable: `research/qa/live-run-latest.json` (counts, closures, openings, sources stopped by a guard, gaps, review entries, request counts, apply and validation result). The weekly human glance reads `research/qa/live-review-queue.md`, which is appended and deduplicated; no entry blocks data and no manual step is required for data to flow.

### 2. Sources and what each yields

| Source | Read how | Yields |
| --- | --- | --- |
| Tweede Kamer OData (CC0) | `ApiGewijzigdOp` cursor per entity; one count per entity per run, a full read only when a count is above 0, on a trigger, after a guard stop, or once a day | Members with their fractie, closed rows with the official end date (`TotEnMet`), `Fractie.AantalZetels`, open vacancies, the fractievoorzitter of each fractie, the Voorzitter and both ondervoorzitters (Presidium) |
| Eerste Kamer pages (colofon terms) | hash of `/fracties` and `/personele_mutaties` every run; a full read when a hash changed or once a day | Members (75), fractie totals, fractievoorzitters ("Fractiebestuur"), the Voorzitter, the start date of a new member |
| Rijksoverheid (CC0) | the overview page once a day, or early on a trigger; the news sitemap every run as a trigger only | The bewindspersonen; a new holder gets an unknown start (ADR 0020), never `DCTERMS.available` (gap G16) |
| Kiesraad type pages (CC0) | weekly | The date of the next election per type (`data/upcoming-elections.json`) |

The Overheid.nl register (burgemeesters, dijkgraven) and the Kiesraad result and candidate ingest are wave 2 and out of scope here. The register, TOOI and CBS are live since 06-10-2026 for provincies, gemeenten and waterschappen: see ADR 0027. The Kiesraad ingest is still open.

### 3. Cadence recommendations (CI decides)

- Tweede Kamer: run `bun run live` hourly. An hourly run is the count poll; the full read happens on a change and once a day.
- Eerste Kamer: the same hourly run hashes the two pages; at least every 4 hours is enough, since the site has no change signal and the mutaties page lags.
- Register, TOOI and CBS for provincies, gemeenten and waterschappen: daily, read again after 6 hours when a guard stopped the source (ADR 0027). The register sends no ETag.
- Election dates: weekly (the command gates this itself).
- News sitemap: every run (the sitemap itself is cached for an hour).

The command gates each source by its own state, so a more frequent schedule never reads more than the cadence above.

### 4. State

`research/P-live-state.json` is the only state: the cursors, the Eerste Kamer hashes, the last full read per source, the last counts, the colofon reading, the election dates and the map from a Tweede Kamer `Persoon.Id` to a person id in `data/people.json` (`tk.personMap`). It holds no secret and no personal data beyond the public ids the Tweede Kamer itself publishes. It is written only when it changes, and only after the run validated. A cursor moves only for a source that was applied; a source stopped by its guard is read again on the next run.

### 5. The event-aware guard (replaces the fixed closure guard)

A source writes anything only when its own data is consistent. Then small changes flow, and big ones flow only with an event.

- **Tweede Kamer.** Exactly 150 active seats (or fewer, when open vacancy rows younger than 60 days explain the gap), no seat used twice, no person on two seats, no duplicate seat number inside a fractie, every active member resolved to a person, and every fractie's active members equal `Fractie.AantalZetels`. Stale vacancy rows (the BBB row open since 05-02-2025) do not count.
- **Eerste Kamer.** 75 members, a fractie seat sum of 75, every fractie total equal to its member count.
- **Bewindspersonen.** 28 plus or minus 3 on the overview page; a position is matched only among the positions of Dutch ministries.
- **Bulk.** Up to 5 closures (3 for the bewindspersonen) pass on their own. More need an event: a fractie that appeared, disappeared or changed activity inside 60 days, an election day in `data/elections.json` or announced on a Kiesraad page within the last 60 days, a cabinet swearing-in (the start of a coalition) within 60 days, or, for the bewindspersonen, a new cabinet slug on the overview page.

When the invariants hold, the changes are applied and a review entry names the bulk event. When they do not hold, or a bulk has no event, the source contributes nothing: its earlier records stay, the run lists it under `stoppedByGuard`, writes the review entry, and exits with code 2. The other sources still apply. The merger of GroenLinks-PvdA into PRO is a passing test (`pipelines/tk-changes.test.mjs`) built from the real rows: 20 closures, 20 openings, allowed because a fractie changed.

### 6. Identity

A Tweede Kamer person is keyed on `Persoon.Id`. The map starts from an exact normalised name (with the birth date as a second fact when both sides have one) and from then on is keyed on the id, so a changed name does not break it. No match creates a new person record with the source URL, the name parts and the birth date from the source (the birth date of an office holder is published by the source; nothing else of the person is stored). An ambiguous name stops the source. A near match (same surname and first letter) is created and listed for review as a possible duplicate. A departed member is linked to the closed row on the exact full name only to find the `Persoon.Id`, and that link is listed.

### 7. Closing, never deleting

A record that is no longer current is closed, never deleted. The end date is the official one of the row that closed it (`TotEnMet`), found in the changed rows or by a targeted look-up by `Persoon.Id`. When no row exists, the end is the retrieval date with confidence medium and a review entry; the Eerste Kamer pages name no end date, so a replaced fractievoorzitter ends the day before the successor's "sinds" date, also medium and listed. A fractie change closes the old membership and opens a new one, so the history stays.

### 8. News is a trigger, never a fact

`shouldRunEarly(newsItems, lastRun)` (`pipelines/news-trigger.mjs`) returns true when a news item newer than the last run carries a trigger word (beëdigd, treedt af, aftreden, ontslag, benoemd, nieuwe minister, staatssecretaris, verkiezingen, kabinet, fractievoorzitter, Kamervoorzitter) and links to a known entity or comes from an official outlet. It only makes the fetchers run now; the reason is logged and written to the summary. Nothing in a news item is written to the dataset.

### 9. Apply, not merge

On the committed dataset a full `bun run merge` is not idempotent: it rebuilds every record from the research envelopes and drops what later pipelines wrote straight into `data/`. Measured on 05-10-2026 with no live change at all: 367 person descriptions and 150 organisation descriptions lost, the source references that back them lost (349 people, 131 organisations), and 400 source notes, 265 licences and 44 retrieval dates rewritten from older envelopes; `bun run validate` then fails on stale description translations. The live run therefore applies only what the live envelope says (`pipelines/live-apply.mjs`): tenures and memberships are inserted or replaced on a substantive difference (the same fields merge uses), people gain a source reference only when their tenure or membership changes, positions and relations are inserted when new, sources are inserted or get a newer retrieval date. The envelope `research/P-live-ambtsdragers.json` still carries every closed record, so the nightly `merge` cannot reopen what the live run closed.

The nightly workflow (`.github/workflows/refresh.yml`) still runs `merge` and is affected by the finding above. Replacing its `refresh-official` and `merge` steps by `bun run live` is the recommended fix, and so is making `merge` carry `description` and the `src:desc-*`, `src:portret-*` and `src:ek-fractie-*` references forward.

### 10. CI recipe and exit codes

```
bun run live
code=$?
# 0: ok, also when nothing changed.
# 2: a source was stopped by its guard; what passed is written and valid.
# 1: hard error; nothing was kept.
if [ "$code" -le 2 ]; then
  git add data ATTRIBUTION.md research/P-live-ambtsdragers.json research/P-live-ambtsdragers.md \
    research/P-live-state.json research/qa/live-review-queue.md research/qa/refresh-official-*.md research/raw/P
  if ! git diff --cached --quiet; then
    git commit -m "data: live refresh"
    git push origin main
  fi
fi
# For a code other than 0: open an ops issue that quotes research/qa/live-run-latest.json.
```

`research/qa/live-run-latest.json` changes on every run and is best kept as a workflow artifact instead of a commit.

### 11. Privacy

The sources publish the party membership and the fractie of an office holder; the dataset stores the fractie label that belongs to a seat and nothing beyond what an office needs: no home town, no candidate data, no birth place. A birth date is stored only for a person created from the Tweede Kamer source, where the source publishes it, and is used to tell namesakes apart. Candidate and home-town data are out of scope in wave 1. The state file holds only public identifiers.

### 12. Named gaps

- G10: the annotation text the Eerste Kamer colofon announces ("Als annotatie wordt daarbij het volgende vermeld:") is missing from the page. Every Eerste Kamer source record carries the URL and the extraction date the colofon asks for, in its notes, and the run reports the gap until the text appears. No Eerste Kamer image is read or stored.
- G13: Baudet's benoeming of 26-08-2026 without a seat row. A Staatscourant benoeming is not a seat, so nothing is applied.
- A fractie page without a "Fractiebestuur" block (a one-member fractie such as Fractie-Van Gasteren) leaves its fractievoorzitter unchanged and is a gap.
- Party leaders have no official source; the fractievoorzitter is the sourced proxy. Whether a vacancy row of the Tweede Kamer appears on the day a member leaves is not known; a missing seat with no fresh vacancy row stops the Tweede Kamer source until the replacement is sworn in.
- A new fractie gets a fractievoorzitter position and, in the review queue, the note that `web/lib/parties.ts` has no colour for it (neutral grey until a sourced colour is added). The dataset has no organisation record per fractie, so none is created.

## Consequences

- After an election, a merger or a swearing-in the people, seats, fractievoorzitters and the Voorzitter follow the official sources within one cadence, with the old records closed and sourced. Nothing needs a person, unless a guard stopped a source, which opens an ops issue.
- The bot commits real changes only. A quiet run writes nothing, and a run on a new day changes mostly retrieval dates.
- The next election dates are available as `data/upcoming-elections.json` for the web ("Volgende verkiezing"); `data/elections.json` needs seat results and cannot hold a future election without a schema change.
- The Kiesraad ingest of results and candidates, the Overheid.nl register and the Staatscourant confirmer (wave 2) can reuse the guard, the review queue, the state file and the apply step.
