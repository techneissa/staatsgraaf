# NL Overheid Graph

A public, source-backed, explorable graph of the Dutch state, modeled on the CivLab government graph for the United States (https://graph.civlab.org/us). The project maps the Rijk, the decentrale overheden, and the people who hold office, with every fact traceable to an official source.

## Status

Phase 0 (recon, schema freeze, snapshot) is complete. The dataset is a seed built from the current kabinet, the ministeries, and the parlement; full research runs in Phase 1. There is no web app yet.

- `docs/` is the product documentation: vision, reference spec, Dutch government model, data model, research workstreams, build plan, roadmap, acceptance, policy, operations, delivery, and discovery.
- `schema/v1/` is the frozen data contract (JSON Schema).
- `data/` holds the merged dataset (seed today).
- `research/` holds workstream output, raw snapshots, the endpoint list, and the merge log.
- `shared/` holds the cross-client contract (output envelope, workstream template, later tokens and the graph layout spec).

## The one hard rule

Every fact ships with a source: URL, retrieval date, confidence. Fetch, never recall. When a source cannot be reached, a named gap is recorded instead of a value. Nothing unsourced is published.

## Cadence

Planned: nightly refresh from official sources, with a reviewed diff per run and a change feed on the site. Not live yet.

## Licenses

Code license and data license are pending the owner's decision; see `docs/adr/0001-licenses.md`. Until decided, nothing in this repo is offered for reuse.

## Disclaimer

This project is not affiliated with, endorsed by, or connected to the Dutch government. See `DISCLAIMER.md`.

## Run

Node.js 20 or newer, no dependencies.

```
node scripts/validate.mjs
```

Validates `data/` against `schema/v1/` and checks referential integrity. Exits non-zero on any failure.
