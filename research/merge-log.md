# Merge log

Every conflict, schema addition, and count decision from the Phase 0 seed and the Phase 2 merge is recorded here, with the rule applied and the alternative that was not taken. Format: date, item, decision, rationale.

## 2026-09-17: seed build (orchestrator)

1. **Schema addition: subtype `uitvoeringsorganisatie`.** Needed by workstream B for uitvoeringsorganisaties that are not agentschappen. Added to `schema/v1/organization.schema.json` per the docs/04 section 18 process; to be confirmed at merge.
2. **Schema addition: subtype `veiligheidsregio`.** Needed by workstream G for the 25 veiligheidsregio's, which are neither provincies nor gemeenten. Added to `schema/v1/organization.schema.json` per the docs/04 section 18 process; to be confirmed at merge.
3. **Governments keyed by slug, no id prefix.** `governments.json` rows use `slug` as the key with no `id` field, unlike the other entity files. Convention documented in `schema/README.md`.
4. **Person slug derivation.** `translit()` applied to the display name: NFD deaccent, ş→s, ğ→g, ı→i, ø→o, æ→ae, œ→oe, ß→ss, apostrophes stripped, lowercase, non-alphanumeric to hyphen. Collisions get `-2`, `-3`. Official page slugs are kept in source URLs and are not required to equal our slug.
5. **EK membership start dates derived.** Start = retrieval date (2026-09-17) minus the "Anciënniteit: N dagen" value on each EK member card. Marked confidence medium in the seed. Workstream D confirms exact dates; if it cannot, the derivation stays and is documented on the site.
6. **TK seatNumber left null.** The OData FractieZetel.Gewicht semantics are unverified; guessing a seat number would be an invented fact. Workstream D verifies or leaves the gap.
7. **Source typo normalized.** The Heerma page writes "Koninkrijkrelaties"; the dataset stores "Koninkrijksrelaties". Source text stays readable at the source URL.
8. **Jetten portfolio collapsed to one position.** Seed stores position "Minister-president" at Algemene Zaken. His full portfolio ("minister-president en minister van Algemene Zaken") and the viceminister-president roles are not modeled in the seed; workstreams A and I model them from the kabinet decision.
9. **Staatssecretaris edge type.** Position-to-ministerie relations use `office` for staatssecretarissen and `dept_head` for ministers. Consistent with the reference vocabulary.
10. **Parliament fracktie strings kept as published.** TK fractie = OData `Afkorting`; EK fractie = the party string printed on the member card. Normalization to party entities is workstream D's job.
11. **EK person names kept with honorifics.** Names as displayed on the EK member cards ("prof. dr. ...", "MA" suffix) are stored as-is in the seed. Workstream D normalizes where a primary source gives a plainer name.
12. **Dilan Yeşilgöz-Zegerius title corrected during seed build.** An early parse classified her as "Minister-president" because her meta description contains the substring "viceminister-president". The parser was fixed to strip " en viceminister-president" and to anchor the MP match; she is Minister van Defensie. Recorded here because it is exactly the class of error the merge gate exists to catch.
13. **EK fractie parse corrected during seed build.** An early parse stored "Anciënniteit: N dagen" as the fractie for 75 memberships. Fixed to read the party div; the 20 EK fracties now match the EK fracties page exactly.

## Phase 2 merge (2026-09-18, orchestrator)

Inputs: the 15 workstream files `research/A-..O-` plus the Phase 0 seed. Merge run by `pipelines/merge.mjs`; machine conflict list in `research/merge-log.entries.jsonl`. Merge rule: source-tier preference (primary legal text > official register > government site > secondary > news), then alphabetical workstream filename; the seed sits behind all research.

14. **Merged totals.** organizations 1570, positions 1430, people 870, tenures 1236, memberships 225, relations 2338, topics 12, budgets 36, sources 702, media 0, changes 0, news 0; total 8421 records. `npm run validate` passes clean.

15. **Schema addition `uitvoeringsorganisatie` confirmed.** Needed by B (28 orgs) and kept in `schema/v1/organization.schema.json`.
16. **Schema addition `veiligheidsregio` confirmed and applied.** G's completion pass first stored the 25 regio's as `samenwerkingsverband`; the schema has a dedicated `veiligheidsregio` subtype, so all 25 (`org:veiligheidsregio-*`) were changed to that subtype in `research/G-decentraal.json`. Count gate: 25. `samenwerkingsverband` is now unused but kept in the enum for future gemeenschappelijke regelingen.
17. **Budget records keyed by organization + fiscalYear.** The first merge keyed budgets by organization only and dropped 24 of L's 36 records, because one org has three fiscal years. `pipelines/merge.mjs` now uses `${organization}|${fiscalYear}` (and `scripts/validate.mjs` uses the same composite key). L thereby keeps all 36 records: 12 ministeries x 2025/2026/2027.
18. **Topics and budgets are separate data files, not workstream K/L collisions.** Research workstream K is the topic set (`topics.json`, 12 records) and research workstream L is the budget set (`budgets.json`, 36 records). Build areas K and L own code, not research letters. No conflict.
19. **Stale position id corrected in K.** One topic referenced `pos:directeur-generaal-rijkswaterstaat`; B publishes `pos:rijkswaterstaat-directeur-generaal`. The topic file was corrected before the final merge.
20. **Alias gazetteer built from J and applied by the merge.** 5694 aliases: 2981 to organizations, 1259 to people, 1454 to positions. The merge appends aliases to org and person records; position and topic targets are skipped because those frozen schemas have no `aliases` field, so 1454 position aliases stay in the gazetteer only. Zero alias collisions after merge.
21. **legalMappings from H applied.** 918 mappings (12 subtype selectors + 769 explicit org + 137 explicit position) set `legalSource`/`legalBasis` where the entity did not already carry one. 0 unmatched targets. The `veiligheidsregio` class has no selector yet because H ran before G added the 25 regio's; they carry `Wet veiligheidsregio's art. 8` on the record itself, so nothing is unsourced, and a selector is a named follow-up.
22. **Predecessor direction from I.** I could not edit A's current tenure (one writer per file), so it stored the link as `successor` on the older tenure. The merge kept that as-is; the graph derives the inverse. No conflict, but the validator's successor parity is a known asymmetry to check in Phase 4.
23. **Source conflicts (11) and research-vs-research record conflicts (11) resolved by tier.** All are recorded in `research/merge-log.entries.jsonl` with both candidates; the tier order picked the primary-law or official-register record every time. No unresolved conflict remains.
24. **Seed records replaced by research (7717 field-level conflicts).** Expected: the seed was a first pass at A and D, and every workstream supersedes it. Logged rather than silent; zero seed value survives where research has a value.

**Gate: pass.** Validator clean, all Phase 0 headline counts match, zero unresolved conflicts, gazetteer built, counts recorded above.

## Phase 2 validator findings (2026-09-18, independent validator)

The independent validator (`research/validation-report.md`) reports 0 FAIL, 4 WARN, 6 GAP. Disposition of each item the orchestrator owns:

25. **WARN: M, N, O have no `.json` envelope.** These workstreams produce study output (design spec, reference model, license table), not entity arrays. `docs/05` rule 1 was amended to say entity-producing workstreams A to L write the two files and study workstreams M to O write markdown plus raw snapshots. No data is missing.
26. **WARN: 126 people have no tenure.** A person is now accepted with a tenure or a membership (`docs/08` data acceptance amended), because Tweede and Eerste Kamer leden are modelled as seat memberships, not tenures. 52 people with neither role nor dated function stay as named gaps: 36 are workstream B directors whose start date the source does not publish, the rest are named in the C and E gap lists. This is a Phase 4 data-depth item, not a Phase 2 blocker.
27. **WARN: no nightly refresh or staleness control.** Correct and expected; the diff engine exists (`pipelines/diff.mjs`) and scheduling is Phase 6.
28. **WARN: 606 of 702 source records have `license: null`.** The determination is in `research/O-licenses.md`; the owner decision and per-source application are the launch gate, recorded in `docs/adr/0001-licenses.md` (recommended: code MIT, dataset CC BY 4.0). Not a Phase 2 blocker.
29. **GAP: topic records carry no source.** `topic.schema.json` has no `sources` field; K records provenance in the envelope and markdown. A schema change is proposed for v1.1 and tracked in the research K gap list.
30. **GAP: `src:j-news-10` returns 403.** One NU.nl sample article; the feed itself is verified and the other 11 samples resolve. Recorded, not evaded.
31. **GAP: koepels and remaining bodies** (VNG, IPO, Unie van Waterschappen, GGD'en, omgevingsdiensten, the three landen, gouverneurs and Gevolmachtigde Ministers) are named in the J, K and G gap lists and belong to the Phase 7 expansion wave, not to the Phase 2 gate.

**Gate remains pass: zero open FAIL.**
