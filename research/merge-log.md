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

## Phase 2 merge

No entries yet.
