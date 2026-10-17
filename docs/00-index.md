# Documentation index

This is the map of the project documentation. Read in order for a full picture, or jump to the file that matches the task.

| File | What it is | Read it when |
| --- | --- | --- |
| `../CONTRIBUTING.md` | The project does not accept contributions | If you were about to send a change |
| `01-vision-and-goals.md` | Why we build this, what done looks like, principles | Need direction or a tie-breaker |
| `02-reference-system-spec.md` | The reference product: pages, information architecture, interactions, data model, stack | Studying the reference's information architecture (not its look or text) |
| `03-dutch-government-model.md` | The Dutch state: scope, entities, positions, sources, vocabulary mapping | Researching or modeling Dutch data |
| `04-data-model.md` | The canonical schema and integrity rules | Writing or reading data, changing the schema |
| `09-content-and-ai-policy.md` | How every sentence ships: descriptions, news summaries, AI use, review, corrections | Writing any reader-facing prose or using a model |
| `../.github/workflows/README.md` | The scheduled refresh, the push deploy, the CI gate, secrets, rollback | Running or maintaining the live product |
| `12-discovery-privacy-accessibility-security.md` | SEO, analytics and privacy, accessibility target, security, browser support | Building any public-facing surface |
| `adr/` | Architecture decision records: licenses, graph and change semantics, the name, hosting and CI, the Bun toolchain, live official sources, news outlets and languages, portrait sources, the graph rebuild, news machine translation, peek popovers, shared selection and side panels, links for the Kingdom and the samenwerkingsverbanden, tenures with an unknown start, the public repository and its licenses, official logos and coats of arms | Checking why something is the way it is, or recording an owner decision | Recent: 0021 news relevance, 0022 delivery and caching, 0023 public repository, 0024 live data automation, 0025 photo credits, 0026 reference product and credit, 0027 live sources for provincies, gemeenten and waterschappen, 0028 translation with Claude Haiku 5.5 through OpenCode, 0029 official logos and coats of arms under a verified free licence.

## How the files relate

- `01` sets direction. `03` says what exists in the world. `04` says how to write it down.
- `02` says what the product looks like and does. `09` and `12` say how public pages are written and secured.
- `00-index.md` (this file) is the way in when you are lost.
- Research plans, the build plan, the runbook and other maintainer notes stay on the maintainer's disk (ADR 0023).

## The shortest path to orientation

1. Read `01-vision-and-goals.md`.
2. Skim `02-reference-system-spec.md` sections 1 and 6 for the product and the interaction list.
3. Then follow the file that matches the task.

## Freshness rule

Anything marked `(verify)` is a research target, not a shipped fact. When a workstream confirms it, record the source and the retrieval date, and drop the marker. If a fact changes with the kabinet, the verkiezingen, or a reorganisatie, never treat a value in these documents as current without refetching it.

## Decision markers

Anything marked `(decide)` is a choice the project owner must make. A default is proposed next to it. Once decided, record the choice in an architecture decision record in `docs/adr/` and drop the marker.
