# ADR 0001: Licenses for code and data

Date: 17-09-2026
Status: accepted (owner decision 18-09-2026: code MIT, dataset CC BY 4.0)

## Context

The repo publishes both software (pipelines, validator, later the web app) and a dataset compiled from official sources. Downstream reuse needs explicit licenses. Source licenses vary; workstream O produces the per-source determination.

## Decision

Proposed defaults, to be confirmed by the owner after workstream O reports:

- Code: MIT (alternative: Apache-2.0 if a patent grant is wanted).
- Dataset: CC0 1.0 (alternative: CC BY 4.0 if attribution is wanted).

Workstream O has now reported (`research/O-licenses.md`) and recommends a change: keep code MIT, but license the dataset **CC BY 4.0 instead of CC0**. Reason: CBS requires attribution, CPB is CC BY 3.0 NL and PBL CC BY 4.0, and workstream G used nl.wikipedia lists (CC BY-SA 4.0 with a database-rights waiver on facts). Those rows make a CC0 grant either impossible or misleading. The dataset can only be CC0 if the Wikipedia burgemeester and dijkgraaf rows are re-sourced to KB/Staatscourant and every image without a recorded license is excluded. O also flags that Defensie.nl is CC BY-SA 4.0 and the Eerste Kamer requires the source URL, the extraction date, and an annotation.

Recommended: code MIT, dataset CC BY 4.0. Owner decision still pending.

## Owner decision (18-09-2026)

The owner accepts the recommendation. Code is MIT. The dataset, descriptions, and summaries are CC BY 4.0. Attribution to the project and to the underlying source is required on reuse.

Applied per source in the Wave 2 pass (`pipelines/licenses.mjs`): every source gets an SPDX value from the `research/O-licenses.md` determination, with `unknown` for the O-declared gaps and `all-rights-reserved` for the news and site-prose hosts. Sources whose reuse right is a custom attribution right with no SPDX id (Eerste Kamer, rechtspraak.nl) are represented as `CC-BY-4.0`; the Eerste Kamer credit line is carried in the source notes. The full per-source list is `ATTRIBUTION.md`.

No license files ship until the owner decides. Facts themselves are not copyrightable; the compiled dataset, descriptions, and summaries are the licensed work.

## Consequences

Once decided, `LICENSE` and `LICENSE-DATA` ship and the README states the terms. Workstream O's table (`research/O-licenses.md`) informs the per-source application; the launch gate stays blocked until that application fills `data/sources.json` and 2129 `license: null` records are resolved.
