# Documentation index

This is the map of the project documentation. Read in order for a full picture, or jump to the file that matches the task.

| File | What it is | Read it when |
| --- | --- | --- |
| `../CONTRIBUTING.md` | Conventions for every contribution: the source rule, language, dates, checks, licenses | Before changing anything |
| `01-vision-and-goals.md` | Why we build this, what done looks like, principles | Need direction or a tie-breaker |
| `02-reference-system-spec.md` | The reference product: pages, information architecture, interactions, data model, stack | Studying the reference's information architecture (not its look or text) |
| `03-dutch-government-model.md` | The Dutch state: scope, entities, positions, sources, vocabulary mapping | Researching or modeling Dutch data |
| `04-data-model.md` | The canonical schema and integrity rules | Writing or reading data, changing the schema |
| `05-research-workstreams.md` | The parallel research plan, 15 workstreams | Running Phase 1 |
| `06-build-plan.md` | Architecture, stack, repo layout, build areas | Running Phase 3 |
| `07-workflow-and-roadmap.md` | The whole lifecycle, phase gates, ops after launch | Planning or orchestrating any phase |
| `08-acceptance-and-qa.md` | The pass or fail gate and the validator protocol | The end of a phase, or QA |
| `09-content-and-ai-policy.md` | How every sentence ships: descriptions, news summaries, AI use, review, corrections | Writing any reader-facing prose or using a model |
| `../.github/workflows/README.md` | The scheduled refresh, the push deploy, the CI gate, secrets, rollback | Running or maintaining the live product |
| `11-delivery-and-collaboration.md` | Git conventions, root files, work tracking, milestones, roles, ADRs | Organizing work, opening a PR, starting a milestone |
| `12-discovery-privacy-accessibility-security.md` | SEO, analytics and privacy, accessibility target, security, browser support | Building any public-facing surface |
| `13-graph-rebuild-plan.md` | The graph rebuild: polder layout, motion, seat chart, phases and status board | Any work on the graph canvas or the seat chart |
| `adr/` | Architecture decision records: licenses, graph and change semantics, the name, hosting and CI, the Bun toolchain, live official sources, news outlets and languages, portrait sources, the graph rebuild, news machine translation, peek popovers, shared selection and side panels, links for the Kingdom and the samenwerkingsverbanden, tenures with an unknown start, the public repository and its licenses | Checking why something is the way it is, or recording an owner decision | Recent: 0021 news relevance, 0022 delivery and caching, 0023 public repository, 0024 live data automation, 0025 photo credits, 0026 reference product and credit, 0027 live sources for provincies, gemeenten and waterschappen, 0028 translation with Claude Haiku 5.5 through OpenCode.

## How the files relate

- `01` sets direction. `07` turns it into phases. `08` decides when a phase passes.
- `03` says what exists in the world. `04` says how to write it down. `05` says who researches it.
- `02` says what the product looks like and does. `06` says how to build it.
- `00-index.md` (this file) is the way in when you are lost.

## The shortest path to orientation

1. Read `01-vision-and-goals.md`.
2. Skim `02-reference-system-spec.md` sections 1 and 6 for the product and the interaction list.
3. Read `07-workflow-and-roadmap.md` section 2 for the phase model.
4. Then follow the file that matches the phase you are in.

## Freshness rule

Anything marked `(verify)` is a research target, not a shipped fact. When a workstream confirms it, record the source and the retrieval date, and drop the marker. If a fact changes with the kabinet, the verkiezingen, or a reorganisatie, never treat a value in these documents as current without refetching it.

## Decision markers

Anything marked `(decide)` is a choice the project owner must make. A default is proposed next to it. Once decided, record the choice in an architecture decision record in `docs/adr/` (see `11-delivery-and-collaboration.md` section 8) and drop the marker.
