# ADR 0009: Sourced party colours

Date: 18-09-2026
Status: accepted

## Context

People and members carry a `party` value (`data/people.json`, `data/memberships.json`). The reference product colour-codes officials by party. British convention would be to guess colours; project rule 3 requires a source per fact, so party colours are researched data, not design choice. Dataset spellings are messy: `CU` and `ChristenUnie`, `GL` and `GroenLinks` both occur, plus seven one-member splinter factions and `partijloos` independents.

## Decision

`web/lib/parties.ts` is a sourced data table (researched 18-09-2026, see `research/party-colours-2026-09-18.md`): each record carries the official hex, the source URL, a retrieval date and a confidence, plus the party website or Wikipedia entry for linking. Details that matter:

- `partijloos` and splinter factions (`Fractie-*`, `Lid Keijzer`) have no sourced colour; they render neutral grey. No invented values.
- `ALIAS_KEYS` normalises `ChristenUnie` to `CU` and `GroenLinks` to `GL`.
- `PRO` is Progressief Nederland (the 2026 GroenLinks-PvdA fusion), not "Partij voor de Regio".
- NSC's colour comes from Wikipedia's dark blue `#13123B`; `nsc.nl` is a construction company and is not linked.

`components/party-badge.tsx` renders the coloured dot, abbreviation and outbound link. Entity-scoped people also get party-coloured rings in the power map (`web/lib/power-map-layout.ts` consumers only; the map shows colours, never invents one).

## Consequences

Colours can be challenged and corrected by editing `web/lib/parties.ts` with a better source; the confidence column keeps the audit trail. Colour is metadata, not a graph edge: parties do not become graph nodes.
