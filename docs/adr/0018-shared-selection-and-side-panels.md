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

## Amendment 3: the chambers as their plenary hall (25-09-2026)

The owner asked on 25-09-2026 for a seat chart in which every seat is the politician who holds it, to replace the circular chart of the Kamers, with the kabinet placed opposite the members and the ministries one level down. After comparing drawings of the hall, the owner chose the Tweede Kamer with its benches as a dome at the top and the chair and the kabinet in the opening below, and the Eerste Kamer in its own shape: two bench blocks facing each other, the chair between them at the bottom and the regeringstafel opposite the chair.

Decision:

1. **The hall comes from the chamber's own floor plan.** `data/chamber-plans.json` (schema `schema/v1/chamber-plan.schema.json`) holds one plan per chamber, with its source. The Tweede Kamer plan is the factsheet "Zetelverdeling plenaire zaal" of June 2026: 150 seats in five wedges, each seat with the fractie the factsheet colours it in (the counts equal its legend), plus the places of the chair, the griffier, the rostrum and vak-K. The Eerste Kamer plan is "Wie zit waar": all 75 seats with the member in each. The extraction is reproducible (`research/S-zaalindeling-plans.py`). A row and column are the position in the source's drawing or markup, never a seat number; `memberships.seatNumber` stays null (workstream S).
2. **Members fill the seats the source gives them.** In the Eerste Kamer each member sits in their published seat. In the Tweede Kamer, which publishes seats per fractie only, members fill their fractie's seats front row first in surname order (lib/seats.ts); this is recorded here and in `docs/04-data-model.md` section 23 rather than on the chart (owner, 25-09-2026). The chair of the Tweede Kamer sits at the desk and their fractie seat stays open. When a plan no longer matches the sitting members, the plan's seats are refilled by fractie blocks, largest first, and the chart says the plan is out of date. The validator checks the plan's references; the match with the members is checked at build time, because memberships change daily.
3. **Orientation is a rotation, never a mirror.** The Tweede Kamer plan is turned half a circle so the dome is at the top; vak-K stays on the chair's left as the chamber draws it. The Eerste Kamer is drawn as its page draws it.
4. **The kabinet sits on its bench, schematically.** Only the bench's place is sourced (vak-K, the regeringstafel), not who sits where, so the minister-president comes first, then the ministers and then the staatssecretarissen, each in the ring order of the ministries; that the order is schematic is recorded here, not on the chart (owner, 25-09-2026). Each seat has its ministry cluster colour. The ministry chart of amendment 2 is the "Kabinet" structure beside the Kamers.
5. **Faces on the seats, dots on request.** Every seat shows the member's portrait, or their initials in their party colour when no portrait is on record; an icon button in the bar switches to dots in the fractie colour, remembered in the browser. Hovering a seat with a mouse lights its fractie and shows the member's face and fractie; a click opens their focus. A tap shows the same card, with a way to step through the fractie and to open the profile.
6. **The legend replaces leader lines.** Beside the hall (from 760 px) or under it: coalition and opposition with their seat totals, each fractie with its colour, seat count and fractievoorzitter, and the majority. Hovering a fractie lights its seats; a click opens its card.
7. **The phone keeps its overview.** Where the hall does not fit, the chamber opens on the stacked cards as before. A "Zaal / Overzicht" switch shows the hall; choosing it on a phone opens the canvas full screen. The choice is remembered in the browser.
8. **The Tweede Kamer opens first** in the hierarchy view, since the kabinet can be reached from its bench.

Consequences: the seat chart shows who governs (the coalition fracties), who carries the kabinet and whether they have a majority in one picture, with the published seat plans as the source. Workstream S's gap is half closed: the Eerste Kamer seat of every member is now in the data, and the Tweede Kamer seat per fractie; the Tweede Kamer seat per member stays a named gap. The plans must be refreshed when a chamber publishes a new edition; until then, the fallback keeps the chart honest.

## Amendment 4: the page is first on tablet and computer (18-10-2026)

The owner asked on 18-10-2026 for an expanded webpage on iPad and computer: the left page column takes the full screen, with no graph beside it, and the editorial cards use that width (news two or three in a row).

Decision:

1. **Page-first from 48 rem.** On a phone the home page is still the graph, and other routes still fold the canvas to one toolbar row. From 768 px the page is first on every route, including home. The canvas starts closed. A "Toon grafiek" row (below lg) or an edge tab (from lg) brings it back. The choice is stored as `staatsgraaf.panels.canvas`; only a stored `open` restores the graph on the next visit.
2. **Closing the canvas expands the page.** From lg the workspace is still three columns, but a closed canvas gives the page `minmax(0, 1fr)` and lets `.sg-page-inner` grow, so the cards reflow. Opening the canvas restores the 32 rem page column beside the graph. The details panel is unchanged.
3. **Cards follow the column, not the window.** `main` is a container. News lists use one column below about 40 rem of that container, two from 40 rem, three from 64 rem. A 32 rem column beside the graph stays one card wide. Home places recent changes beside the overview from 48 rem of the column. No horizontal scrolling; the 390 / 820 / 1440 checks still apply.

Consequences: iPad and computer readers land on the editorial page, not the graph. The graph remains one control away and still expands to full screen. The phone home graph is unchanged.
