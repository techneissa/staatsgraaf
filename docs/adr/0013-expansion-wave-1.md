# ADR 0013: Expansion wave 1 scope and modelling choices

Date: 19-09-2026
Status: accepted

## Context

Phase 7 (docs/07-workflow-and-roadmap.md section 10) was seeded but not implemented: the samenwerkingsverbanden beyond the veiligheidsregio's, the Kingdom countries, and several scheduled data gaps were still open. The owner asked to implement the remaining Phase 7 features; this ADR records what wave 1 shipped and the modelling choices behind it.

## Decision

1. **Samenwerkingsverbanden enter as organisations, not as new organ types.** GGD'en and omgevingsdiensten are organisations of `subtype: samenwerkingsverband`, `level: regionaal`, `branch: decentraal-lokaal`, sourced per organisation from the KOOP register of regionale samenwerkingsorganen, with legal basis "Wet publieke gezondheid art. 14" (BWBR0024705) for GGD'en and "Omgevingswet art. 18.21" (BWBR0037885) for omgevingsdiensten. Their boards and member municipalities are not modelled; that is a named gap.
2. **Combined regions are not duplicated.** VGGM (Veiligheids- en Gezondheidsregio Gelderland-Midden) and VRLN are the same legal entities as the already-modelled veiligheidsregio's, so the KOOP full names are added as aliases on the existing records instead of new organisations.
3. **The Kingdom countries are scopes on the same schema.** Regering van Aruba, Curaçao en Sint Maarten are `subtype: land-regering`, `level: koninkrijk`, `branch: koninkrijk`, with per-country `country` values, legal source "Statuut voor het Koninkrijk art. 1" (BWBR0002154). Gouverneur and Gevolmachtigde Minister are head positions with dated tenures from the official governor and cabinet sites. English glosses for these offices come from the official English forms ("Governor of Aruba", "Minister Plenipotentiary").
4. **Koepels were already modelled and stay as they are.** VNG, IPO and UvW exist as `subtype: koepel`; wave 1 verified their sources and websites instead of re-modelling them.
5. **Scheduled gap fixes.** D-15: the dijkgraaf legal basis was wrong; verified against BWBR0005108, art. 10 and art. 46, it is now "Waterschapswet art. 46". D-16: the Culemborg appointment change now names its predecessor through an added acting tenure for Gerard Renkema (sourced from rijksoverheid.nl, 13-11-2025). D-11, D-13, D-14 and D-17 were already fixed in the live data.
6. **Positions without a tenure stay as modelled.** The 800-plus unfilled seat positions (raadsleden, bestuursleden, etc.) are real seats that exist on paper; they are kept as positions without holders and recorded as a standing gap, not removed. Filling them is ordered later work, not a schema change.

## Consequences

The dataset grows to 1614 organisations, 1434 positions, 875 people. Workstream letter M is used by a data workstream file (research/M-samenwerking-koninkrijk.json); the earlier M-design.md is prose only, so the merge glob is unaffected. The next expansion cycles follow the ordered plan in research/M-samenwerking-koninkrijk.md.
