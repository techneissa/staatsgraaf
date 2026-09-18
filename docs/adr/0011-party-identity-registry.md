# ADR 0011: Party names, symbols and colours are one registry

Date: 19-09-2026
Status: accepted

## Context

The owner asked for party names, symbols and colours that are easy to maintain and update. ADR 0009 already fixed colours as a sourced registry (`web/lib/parties.ts`); names in Dutch and English and a link target were added there later. What remained open was the symbol: party emblems exist, but hotlinking party logos or storing image files creates licence risk (party logos are copyrighted), link rot and per-party asset maintenance. The reference infographic the owner supplied shows logo-plus-colour rows, but its colours are the author's choices, not official values, so it is a reference for layout only, not a data source.

## Decision

The registry stays the single source for party identity. One row per party carries: key, abbreviation, Dutch and English name, colour (sourced, with confidence and retrieval date), website and Wikipedia link. Every field is verified against the party's own site or its Wikipedia entry (retrieval dates 18-09-2026 and 19-09-2026; sources sit in each record).

Symbols are rendered as typographic badges, not logos: a disc in the party colour (neutral grey when no sourced colour exists) with the abbreviation inside or beside it (`components/party-badge.tsx`, already in production). This keeps the symbol zero-maintenance: adding a party is one registry row with text fields, no image assets, and no licence questions.

Official party logos are therefore not shown. Named gap: the product has no emblem graphics; if that changes, only Wikimedia Commons files with a verifiable free licence would be added as a per-party `emblem` field, with the Commons source URL and retrieval date in the record.

## Consequences

English party names (`name.en`) now surface wherever the interface runs in English, including the power map meta line through `lib/name-gloss.ts`. Updating any party detail is a one-row edit with a new source URL and retrieval date; tests pin the coverage rules. The typographic badge stays readable at the small sizes the power map and people strip use, where most logos would break down.
