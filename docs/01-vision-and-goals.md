# Vision and goals

This document says what we are building, why, and what done looks like. It is the first thing a new agent reads and the tie-breaker when a later document is ambiguous.

## 1. The one-sentence goal

Build a public, source-backed, explorable graph of the Dutch state, inspired by the CivLab Gov Graph, which maps the United States federal government, so anyone can see who governs, who they answer to, how power flows between bodies, and what changed today.

## 2. The reference and the gap

The reference is CivLab's Gov Graph at https://graph.civlab.org/us (and its San Francisco sibling at https://sfgov.civlab.org/sf). It is a complete data model of the US federal government rendered as an interactive graph with editorial pages on top. Nothing equivalent exists for the Netherlands.

The Dutch case is not a translation of the US case. It is harder and more interesting:

- The country sits inside a Kingdom of four countries.
- The state has three tiers (Rijk, provincie, gemeente) plus a functional tier (waterschappen).
- There is no elected head of government, and responsibility is collective.
- There is a dense web of shared arrangements (gemeenschappelijke regelingen, veiligheidsregio's, omgevingsdiensten) that a tree cannot capture but a graph can.

A faithful Dutch graph is therefore more valuable than a translated one, because the Dutch structure is exactly the kind that a graph explains and a hierarchy hides.

## 3. What we build

A web product with four things:

1. **A dataset.** A normalized, sourced model of the Dutch state: organizations, positions, people, tenures, and the legal relationships between them, plus changes, news, topics, and budgets.
2. **A graph.** A persistent, explorable map of that dataset that always reflects the entity you are looking at.
3. **Editorial pages.** Homepage, entity, position, person, and topic pages that read like a source, not a dashboard.
4. **A change feed.** A dated stream of appointments, departures, and structural changes, each linked to a source.

## 4. What done looks like

Done is a live public URL where:

- A reader can start at the homepage, see what changed today, and click through to the exact official source.
- A reader can open any ministerie, provincie, gemeente, waterschap, ZBO, or court and see what it is, its legal basis, its head, and what it connects to.
- A reader can open any person and see every position they hold or held, with dates.
- A journalist can download the data and trust it because every fact is sourced.
- The graph visibly reflects the real Dutch structure, including the tiers and the shared arrangements.
- A refresh runs nightly and the site stays current without manual effort.

## 5. Principles

1. **Sources or it does not ship.** Every fact carries a source. No exceptions.
2. **Fetch, never recall.** No fact is written from memory. If a source cannot be reached, it is a named gap, not a guess.
3. **Time is explicit.** Tenures have starts and, when real, ends. Current is a fact, not an assumption.
4. **One model, many scopes.** The Rijk, the decentrale overheid, the Caribbean Netherlands, and the Kingdom countries share one schema, so growth is additive.
5. **Dutch meaning, English keys.** The product speaks Dutch. The data and code speak a consistent English vocabulary.
6. **Honest about limits.** Gaps are named in public. Corrections are logged. The disclaimer is clear.
7. **Cheap to run for years.** The value compounds over time, so the cost must stay low.

## 6. Non-goals

- Not a government service and not affiliated with the Dutch government.
- Not a real-time system. Near-real-time at daily cadence is the target.
- Not a user-generated or editable wiki. The pipeline and the sources are the authority.
- Not a copy of the reference. We learn from its information architecture and its interaction ideas; we do not reproduce its markup, styling, assets, text or data. See `docs/adr/0026-reference-product-and-credit.md`.
- Not a scraper that republishes copyrighted prose or images. We write original descriptions and use open media.

## 7. Who it is for

- **Citizens and students** who want to understand how the Dutch state actually fits together.
- **Journalists and researchers** who need a sourced map and a downloadable dataset.
- **Civil servants and politicians** who want a neutral picture of the whole system and what changed.
- **Civic technologists** who want to build on top of it.

## 8. Success measures

- Coverage: the whole Rijk plus the decentrale overheid, with every entity sourced.
- Freshness: the change feed is current to within a day.
- Trust: a spot audit of facts finds sources, and corrections are rare and logged.
- Use: the dataset is downloaded and cited by people outside the project.
- Longevity: the pipeline runs unattended for months at low cost.

## 9. The rule for every future decision

When two options are close, pick the one that keeps facts sourced, keeps time explicit, keeps the model able to grow to more scopes, and keeps the running cost low. Everything else follows from those four.

## 10. Working name and identity

The project needs a name before launch. The reference's top-left lockup is a brand line with a switchable scope label. Ours has the same kind of structure, a brand line and a scope label, with our own name and art.

- Name: Staatsgraaf, decided on 18-09-2026 in `docs/adr/0003-project-name.md`. "NL Overheid Graph" was the working name.
- Domain: not chosen `(decide)`. Pick a name that is clearly independent and clearly not a government service.
- Scope label: "NL Rijk" for the central tier, to be joined later by "NL Decentraal", "Caribisch Nederland", and the Kingdom countries.
- Lockup: brand line plus scope label, with original art.
- Logo and glyph direction are part of workstream M in `05-research-workstreams.md`, not a separate project.

Two naming rules follow from the principles. The name must not imply government affiliation, and it must not pin the product to one tier or one country, because the schema is built to grow to more scopes.
