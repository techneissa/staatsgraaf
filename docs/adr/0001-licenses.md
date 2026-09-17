# ADR 0001: Licenses for code and data

Date: 2026-09-17
Status: proposed (owner decision pending; input from workstream O)

## Context

The repo publishes both software (pipelines, validator, later the web app) and a dataset compiled from official sources. Downstream reuse needs explicit licenses. Source licenses vary; workstream O produces the per-source determination.

## Decision

Proposed defaults, to be confirmed by the owner after workstream O reports:

- Code: MIT (alternative: Apache-2.0 if a patent grant is wanted).
- Dataset: CC0 1.0 (alternative: CC BY 4.0 if attribution is wanted).

No license files ship until the owner decides. Facts themselves are not copyrightable; the compiled dataset, descriptions, and summaries are the licensed work.

## Consequences

Until decided, `LICENSE` and `LICENSE-DATA` do not exist and the README states that nothing is offered for reuse. Workstream O's table (`research/O-licenses.md`) informs the final choice; the owner records the decision here and drops the proposed status.
