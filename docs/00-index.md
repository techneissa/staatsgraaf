# Documentation index

This is the map of the project documentation. Read in order for a full picture, or jump to the file that matches the task.

| File | What it is | Read it when |
| --- | --- | --- |
| `../AGENTS.md` | Operating law and router | Always, first |
| `../STAATSGRAAF-PROMPT.md` | The kickoff prompt that starts the project | Starting the whole project |
| `../NEXT-SESSION-PROMPT.md` | The paste-ready prompt that launches a session of parallel agents | Running the work with parallel subagents |
| `01-vision-and-goals.md` | Why we build this, what done looks like, principles | Need direction or a tie-breaker |
| `02-reference-system-spec.md` | The reference product: pages, look, interactions, data model, stack | Building anything that must match the reference |
| `03-dutch-government-model.md` | The Dutch state: scope, entities, positions, sources, vocabulary mapping | Researching or modeling Dutch data |
| `04-data-model.md` | The canonical schema and integrity rules | Writing or reading data, changing the schema |
| `05-research-workstreams.md` | The parallel research plan, 15 workstreams | Running Phase 1 |
| `06-build-plan.md` | Architecture, stack, repo layout, build areas | Running Phase 3 |
| `07-workflow-and-roadmap.md` | The whole lifecycle, phase gates, ops after launch | Planning or orchestrating any phase |
| `08-acceptance-and-qa.md` | The pass or fail gate and the validator protocol | The end of a phase, or QA |
| `09-content-and-ai-policy.md` | How every sentence ships: descriptions, news summaries, AI use, review, corrections | Writing any reader-facing prose or using a model |
| `10-operations-runbook.md` | Environments, pipelines, the nightly refresh, monitoring, rollback, incidents | Running or maintaining the live product |
| `11-delivery-and-collaboration.md` | Git conventions, root files, work tracking, milestones, roles, ADRs | Organizing work, opening a PR, starting a milestone |
| `12-discovery-privacy-accessibility-security.md` | SEO, analytics and privacy, accessibility target, security, browser support | Building any public-facing surface |
| `adr/` | Architecture decision records: licenses, graph and change semantics, the name, hosting and CI, the Bun toolchain, live official sources, news outlets and languages, portrait sources | Checking why something is the way it is, or recording an owner decision |

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
