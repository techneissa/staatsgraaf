# Schema v1

The frozen data contract, derived from `docs/04-data-model.md` and the vocabulary tables in `docs/03-dutch-government-model.md` section 4. This directory is the source of truth for shapes, enums, id patterns, and referential integrity. The loaders, the validator (`scripts/validate.mjs`), the web app, and the iOS app all read this contract.

## Files and their data

| Schema file | Data file | Root shape |
| --- | --- | --- |
| `common.schema.json` | defs only | `$defs` referenced by the other schemas |
| `government.schema.json` | `data/governments.json` | array of scopes (`slug` is the key, no id prefix) |
| `organization.schema.json` | `data/organizations.json` | array |
| `position.schema.json` | `data/positions.json` | array |
| `person.schema.json` | `data/people.json` | array |
| `tenure.schema.json` | `data/tenures.json` | array |
| `membership.schema.json` | `data/memberships.json` | array |
| `relation.schema.json` | `data/relations.json` | array |
| `change.schema.json` | `data/changes.json` | array |
| `news-item.schema.json` | `data/news.json` | array |
| `news-translation.schema.json` | `data/news-translations.json` (optional) | array |
| `topic.schema.json` | `data/topics.json` | array |
| `budget.schema.json` | `data/budgets.json` | array |
| `source.schema.json` | `data/sources.json` | array |
| `media.schema.json` | `data/media.json` | array |
| `election.schema.json` | `data/elections.json` | array |
| `coalition.schema.json` | `data/coalitions.json` | array |

Every `data/*.json` file is a plain JSON array. The published contract under `/data/v1/...` and `/api/v1/...` is generated from these arrays at build time.

## What the validator enforces

`scripts/validate.mjs` runs the schemas plus the referential integrity rules from `docs/04-data-model.md` section 17:

1. every `org.parent`, `org.partOf`, `pos.organization`, `tenure.person`, `tenure.position`, `membership.organization`, `membership.person`, and relation `from`/`to` resolves
2. no duplicate slugs for organizations, positions, people, topics
3. every tenure and membership has a start
4. every end date is after its start date
5. every provenance entry resolves to a `src:` id
6. every organization, position, person, tenure, membership, relation, change, news item, budget, media item, and government carries at least one source
7. changes reference existing positions and, where present, existing persons and tenures
8. budgets reference existing organizations
9. relation `validTo` is after `validFrom`, `supersededBy` resolves, and no two open relations share `from`, `to` and `type`
10. election seats sum to `seatsTotal`, no party is listed twice, the body resolves, and party keys exist in `web/lib/parties.ts`
11. coalition `end` is after `start`, `government`, `primeMinister` and `agreement` resolve, and party keys exist in `web/lib/parties.ts`

## Notes on the freeze

- Enums for `subtype` follow `docs/03` section 4. Two additions were needed by the workstreams: `uitvoeringsorganisatie` (workstream B) and `veiligheidsregio` (workstream G). They are Dutch meanings already implied by that section and go through the section 18 process at the merge gate.
- `governments.json` uses `slug` as the stable key because `docs/04` section 16 defines no id prefix for scopes.
- Computed structures (power map, change stats, adjacency) are never stored in `data/`; the build computes them.
- Changing anything here follows `docs/04-data-model.md` section 18: proposal in the workstream markdown, orchestrator decision in `research/merge-log.md`, then one commit updating the document, this schema, and the validator together.
