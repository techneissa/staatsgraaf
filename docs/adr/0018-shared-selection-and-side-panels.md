# ADR 0018: one shared selection, side panels, and seats as people

- Date: 25-09-2026
- Status: accepted. The owner asked on 25-09-2026 for collapsible and wider side panels, for the page column to describe what is picked on the graph and the power map, for a way back after picking a profile on the power map, for news-based connections between people, and for the seats of the Kamers to be the politicians who hold them.

## Context

Each canvas kept its own idea of what was picked: the graph held the selected body, the fractie, and the open group; the power map held a focused person in the canvas frame; the details panel was drawn inside the graph. The page column could not know what the reader had picked, the power map had no way back, and every new panel would have had to be wired to every canvas.

## Decision

1. **One selection, one seam.** `web/lib/selection.ts` defines what can be picked (organisation, person, group of dots, fractie, sector, news item, topic), which canvas picked it, and a history with a way back, as a pure reducer with its own tests. `web/components/selection/selection-provider.tsx` holds it for the whole page. Canvases publish every pick to it and follow it; panels only read it and pick through it. Neither side imports the other.
2. **Side panels.** The details panel is its own column beside the canvas instead of part of the drawing. It can be collapsed and resized; the page column can be collapsed to give the canvas the full width. Both choices are remembered in the browser.
3. **The page column describes the pick.** When something is picked, the top of the page column shows a fuller profile of it than the side panel can hold, with a way back and a way to close it.
4. **Seats are people.** Each seat of the Tweede Kamer and the Eerste Kamer stands for a member, from `data/memberships.json`. Neither chamber publishes a seat per member (workstream S), so members fill their fractie's block in name order, and the panel says so.
5. **Connections on the power map are derived, not invented.** Links between people come from shared news items, shared memberships, and tenures in the dataset, each with its reason and the ids that prove it. They show only for the current pick.
6. **Party programmes are sourced.** A party's programme link appears only when it was found on the party's own site, with the retrieval date; otherwise it is a named gap.

## Consequences

- A new panel or a new canvas needs only the selection interface. That makes the Swift client's port of the same behaviour a matter of one reducer.
- The graph, the power map and both panels always agree on what is picked, and "back" means the same thing everywhere.
- Seat order within a fractie is not a real seating plan. It is labelled as such until a chamber publishes one.

## Amendment 1: the power map becomes "Verbanden / Connections" (25-09-2026)

The owner asked on 25-09-2026 for the power map to be renamed and redesigned so it no longer resembles the reference product. The view is now called "Verbanden" in Dutch and "Connections" in English, which says what it shows without a claim about power. Internal ids (`power`, `surface: "power"`, `power-map.json`) are unchanged.

The bubble map is replaced by an ego view. With nothing picked, it ranks the most connected people in three columns (kabinet, Kamerleden, others). With a pick, the person or body sits in the centre and its ties are grouped by kind (office and bodies, kabinet, fractie, shared news), with strength shown by line weight and distance and the reason on every tie. Below about 620 px of width the same groups are a list. Ties are scored at build time for every sitting minister and staatssecretaris as well as for the people in the news, and a Kamerlid without scored ties gets their fractie colleagues. News is a compact list, not floating bubbles.

## Amendment 2: a hierarchy view is the default in Connections (25-09-2026)

The owner asked on 25-09-2026 for a hierarchical view, modelled on a circular organisation chart, as the default in Connections, with the ego view kept behind a toggle ("Hiërarchie | Netwerk"). The hierarchy has three structures: the kabinet (the minister-president in the centre, the Koning as head of state beside the centre, one hub per ministry with an icon and its bewindspersonen), the Tweede Kamer and the Eerste Kamer (the chair in the centre, fracties as hubs in party colour sized by seats). Clicking a person opens a focus layout: their portrait in the centre and their ties around it as portrait tiles, grouped by office, kabinet, fractie and news. The data is built at build time into `web/public/hierarchy.json`, loaded only when the view opens, with a source for every person. The layout follows the owner's circular organisation chart: a large centre circle inside a thick ring cut into coloured segments, thick bars from each segment to an outlined hub with an icon (a ministry) or its seat count (a fractie), and members attached to their hub with name and role. Ministries are grouped into six clusters with one validated colour each (economie en financiën, ruimte en landbouw, bestuur, zorg, werk en onderwijs, veiligheid en recht, buitenland), because eleven hues would exceed the categorical palette; fracties use their sourced party colour and their segment is sized by seats. The person focus follows the owner's second concept: the person in a double ring, bars left and right to the heads of the two strongest groups, vertical chains of members from each head, further groups as compact rows and a legend. Below about 480 px of canvas width both stack into cards, and a full-screen button shows the chart when the column is too narrow.
