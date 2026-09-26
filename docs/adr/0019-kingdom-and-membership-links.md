# ADR 0019: links for the Kingdom, the hoge colleges and the samenwerkingsverbanden

- Date: 25-09-2026
- Status: accepted. On 25-09-2026 the owner reported that several bodies had no links when picked on either graph form, among them the countries of the Kingdom, and asked for a thorough check of how all bodies connect.

## Context

A count on `data/relations.json` and the `parent` field found 73 organisations with no relation at all. The governments, Staten and ministries of Aruba, Curaçao and Sint Maarten were only linked inside their own land, so they read as islands on both the rings and the wheel. ADR 0013 decision 1 had left the member gemeenten of GGD'en and omgevingsdiensten out as a named gap, and the veiligheidsregio's had no members either.

## Decision

1. **Workstream V adds the missing links from official texts.** `research/V-verbindingen-koninkrijk-en-samenwerking.json` and its report hold 1286 relations, 3 organisations, 73 sources and 5 gaps, all fetched on 25-09-2026. Nothing is inferred from memory.
2. **The Kingdom gets its own bodies.** The Rijksministerraad (Statuut art. 7), the College financieel toezicht Curaçao en Sint Maarten (Rijkswet financieel toezicht) and the Interparlementair Koninkrijksoverleg (Kamerstuk 33845 nr. 61) join as `subtype: koninkrijksorgaan` or `toezichthouder` with `branch: koninkrijk` and `country: koninkrijk`. Each land's regering takes part in the Rijksministerraad through its Gevolmachtigde Minister, and the Rijksministerraad holds the waarborgfunctie over them (Statuut art. 43 and 50). The Staten advise the Kamers on ontwerpen van rijkswet (Statuut art. 15 to 18).
3. **Membership of a gemeenschappelijke regeling is `joint_arrangement_member`, dated by the register.** This supersedes the gap in ADR 0013 decision 1. Each of the 64 veiligheidsregio's, GGD'en and omgevingsdiensten links every deelnemer that its regeling lists in the Register van Overheidsorganisaties, with the join date as `validFrom`.
4. **Membership of a koepel is `part_of` with `metadata.rol: lid`.** A koepel is a vereniging, not a gemeenschappelijke regeling. The IPO has the twelve provincies and the VNG all 342 gemeenten.
5. **The wheel draws the new types.** It draws `appoints`, `confirms` and `joint_arrangement_member` ties and leaves out any type it has no line for, instead of failing. Bodies of the Kingdom as a whole get a Koninkrijk cell beside the three lands. A land ministry finds its land through its `part_of` edge, and the Caribisch Nederland cell draws every body there without a parent, so the Rijksvertegenwoordiger shows.
6. **Data enters additively.** The records were added to `data/` by id without re-running the full merge. Run as of 25-09-2026, the merge drops portrait sources that a later pipeline wrote, so that problem is left for its own fix.

## Consequences

- Every drawn body on the wheel now has at least one tie. Only the Unie van Waterschappen has no relation in the data, and that is a named gap.
- The graph bundle grows from 938 KiB to 1075 KiB, mostly the gemeente membership edges.
- Appeal and cassation between courts are still not modelled, so the Gemeenschappelijk Hof van Justitie waits for a decision on a relation type for the rechtsgang.
- `pipelines/qa.test.mjs` counts 1644 organisations. `web/lib/graph.test.mjs` scopes its "no dated edge before 2009" check to relations dated by a besluit, because register join dates can be older.
