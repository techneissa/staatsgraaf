# ADR 0012: English glosses for Dutch names, never replacements

Date: 19-09-2026
Status: accepted

## Context

Project rule 5 fixes Dutch names: entity names are Dutch and unchanged, code and keys are English. When the interface language is English, the graph, legend and power map still show those Dutch names, which the owner asked to fix by adding the English meaning as smaller text in parentheses, and by translating job titles where an established English form exists. Inventing translations would violate rule 10 (honest gaps beat guesses), so the gloss must be null when no established English form is known.

## Decision

`web/lib/name-gloss.ts` produces rule-based English glosses with two entry points:

- `positionEn(title)` translates Dutch position titles. Ministry portfolio names come from the official English names on government.nl/ministries (retrieved 19-09-2026); local and water-governance titles follow the patterned forms in the data ("Burgemeester van X" becomes "Mayor of X", "Dijkgraaf van Waterschap X" becomes "Chair of the water board of X"); parliamentary roles, committee roles and party leaders translate through the fixed official forms and the party registry from ADR 0011.
- `orgEnGloss(name)` translates organisation names: a curated map of national bodies with official English names (House of Representatives, Netherlands Court of Audit, Public Prosecution Service, Statistics Netherlands and others) plus patterns for the layered government forms ("Gemeenteraad van X" becomes "Municipal council of X", "Ministerie van X" becomes "Ministry of X", "Rechtbank X" becomes "District court of X", water boards, safety regions, courts, island councils). Entity names inside a gloss (municipalities, water board territories) stay Dutch on purpose.

Both return null when nothing established matches. A null is rendered as no gloss at all; it is never machine translated.

Rendering: in the power map the English gloss replaces the Dutch job title in the meta line when one exists (same truncation, so the layout is unchanged); in the graph the Dutch name stays the main label and the gloss renders as a smaller "(English)" line under it in neighbour labels and the selection popover, and as screen-reader text in the organisation list.

## Consequences

Coverage is a test, not a promise: `web/lib/name-gloss.test.ts` pins at least 90% of current position titles and 80% of organisation names glossed, with the honest-gap behaviour tested explicitly. New data patterns that fall outside the rules render Dutch in English mode until someone adds a pattern with a source; this is the intended failure mode.

## Amendment 16-10-2026: organisation page title in English

On an organisation entity page, when the interface is English and `orgEnGloss` returns a name, that gloss is the visible H1. The Dutch name and any aliases sit in an (i) on the same line. Without a gloss, the Dutch name stays the H1. The graph, JSON-LD, data files, search, and every other surface keep the Dutch name. This is presentation on that page only; it does not invent translations.
