# ADR 0001: Licenses for code and data

Date: 2026-09-17
Status: proposed (owner decision pending; input from workstream O)

## Context

The repo publishes both software (pipelines, validator, later the web app) and a dataset compiled from official sources. Downstream reuse needs explicit licenses. Source licenses vary; workstream O produces the per-source determination.

## Decision

Proposed defaults, to be confirmed by the owner after workstream O reports:

- Code: MIT (alternative: Apache-2.0 if a patent grant is wanted).
- Dataset: CC0 1.0 (alternative: CC BY 4.0 if attribution is wanted).

Workstream O has now reported (`research/O-licenses.md`) and recommends a change: keep code MIT, but license the dataset **CC BY 4.0 instead of CC0**. Reason: CBS requires attribution, CPB is CC BY 3.0 NL and PBL CC BY 4.0, and workstream G used nl.wikipedia lists (CC BY-SA 4.0 with a database-rights waiver on facts). Those rows make a CC0 grant either impossible or misleading. The dataset can only be CC0 if the Wikipedia burgemeester and dijkgraaf rows are re-sourced to KB/Staatscourant and every image without a recorded license is excluded. O also flags that Defensie.nl is CC BY-SA 4.0 and the Eerste Kamer requires the source URL, the extraction date, and an annotation.

Recommended: code MIT, dataset CC BY 4.0. Owner decision still pending.

No license files ship until the owner decides. Facts themselves are not copyrightable; the compiled dataset, descriptions, and summaries are the licensed work.

## Consequences

Until decided, `LICENSE` and `LICENSE-DATA` do not exist and the README states that nothing is offered for reuse. Workstream O's table (`research/O-licenses.md`) informs the final choice; the owner records the decision here and drops the proposed status. Until the license is applied per source, the launch gate is blocked and 606 of 702 `data/sources.json` records keep `license: null`.
