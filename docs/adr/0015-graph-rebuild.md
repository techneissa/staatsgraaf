# ADR 0015: Graph rebuild, layout model, renderer and motion

Date: 19-09-2026
Status: accepted 19-09-2026 (amended the same day; every owner decision except P4 is recorded in `docs/13-graph-rebuild-plan.md` section 5.2)

## Context

The canvas copies the reference's geometry (`nl-sectors-v3`: one hub, one ring system, wedges by branch). On 19-09-2026 the owner and the orchestrator reviewed the reference implementation (graph.civlab.org/us: React page, D3-driven SVG, client-side ring layout, 750 ms polar tweens, frame rotation to bring the selection to the top, ring splicing to open a gap, department heads orbiting their body) and the Staatsgraaf code (React-rendered SVG, deterministic packer, pan and zoom through React state, selection without motion, 5 of 14 relation types drawn, layout computed on the client, no dates on relations in code).

Two conclusions drove this record. First, the reference's geometry misreads the Dutch state: distance from the centre reads as rank and a wedge reads as ownership, so the Hoge Colleges, the Staten-Generaal and the medeoverheden appear as offices of a centre they are not subordinate to. Second, the canvas component has no place for motion, and its pan and zoom re-render the whole tree on every pointer event.

## Decision

1. **Rebuild the map, not the product.** The layout spec, the bundle contract and the canvas component are replaced. The dataset, the schema, the pipelines, the packer, the invariant tests, the glyphs, the colours, the dictionaries and the accessible list carry over.
2. **The electorate stays at the centre; the constitution is a frame.** The centre is the source of every mandate (`org:kiesgerechtigden-nederland`), as it is in the reference. The Grondwet and the Statuut are drawn, if at all, as the boundary that contains everything, never as nodes.
3. **Constitutional organs are poles, not rings.** The organs with a direct mandate or a constitutional guarantee of independence sit at fixed angles and equal distance from the centre. Depth rings exist only inside a pole, where `part_of` chains are real. Bodies at arm's length (zbo, rwt) sit on an explicit ring tied by `oversees`, not nested. The exact variant (A, A1 to A3, D in the plan) is chosen from rendered comparisons, not argument.
4. **No force-directed layouts.** ForceAtlas2 and similar are rejected: positions would move between nightly builds and the iOS client could not reproduce them. The multi-polar idea is kept; the physics is not.
5. **Concentric shells by constitutional distance are rejected** as the main layout: outward reads as lesser, which is the reading this record exists to remove.
6. **Renderer: SVG with an imperative motion layer.** Sigma.js with graphology is the designated upgrade path, adopted only when people and positions become canvas nodes or a full-graph time scrubber ships. Cosmograph is rejected (force simulation as its premise; licence to be checked before any reconsideration).
7. **Layout at build time.** Coordinates are emitted into the bundle; the client does not run the layout. The layout code remains the build-time truth and the test subject.
8. **Motion model.** One critically damped spring for every animated scalar. Pose is a pure function of (layout, focus, visibility). One scalar interpolates rest to pose in polar coordinates. Turn brings the focus to the reading angle by the shortest way with a tolerance. Gather summons a focus's children then direct relations onto a halo arc in home-angle order, with ghosts and tethers. Step back moves every node beyond the focus radius outward by one uniform amount, which is monotone in radius and constant in angle and therefore collision free. Changing focus while open plays close, turn, open. Reduced motion snaps.
9. **Temporal data enters the schema now.** Relations get `validFrom`, `validTo`, `supersededBy`. Elections and coalitions become data files with Kiesraad and Rijksoverheid sources. Seat numbers come from the official zaalindeling where published.
10. **The Tweede Kamer is a hemicycle.** The Staten-Generaal pole draws the Tweede Kamer as a ∩ of 150 seats and the Eerste Kamer as a ∩ of 75 nested inside it; the same component serves the chamber and party pages. Orientation and seat order are pending decisions (P2, P3), compared on rendered variants.
11. **Sources for this work** are primary legal texts, the Kiesraad, the two Kamers, Rijksoverheid, CBS, then PDC's parlement.com at medium confidence, then Wikipedia at low confidence and never for a majority-deciding number. Diagrams shared as inspiration are not sources.

## Amendment of 19-09-2026: the owner chose the concentric tier layout

After the phase 1 renders the owner chose the concentric tier layout (variant B, "Thorbecke shells") over the polder poles. Decisions 3 and 5 above are superseded as follows:

- **Tiers, not poles.** Six concentric rings by statutory function: grondwettelijke kern (Hoge Colleges van Staat, rechterlijke macht), politieke kern (Staten-Generaal, regering en kabinet), ministeries, uitvoering en toezicht en advies (agentschappen, uitvoeringsorganisaties, inspecties, zbo's and rwt's, adviescolleges and planbureaus), decentrale overheden (provincies, gemeenten, waterschappen, Caribisch Nederland), Koninkrijk. Sectors inside each ring keep groups together. Every branch and subtype has a curated place; nothing falls to a leftover band.
- **The known weakness is answered, not ignored.** Outer tiers read as lesser; the tier labels name statutory function, not rank, and the decentrale overheden keep their own `elects` edges to the electorate (once the mandate research lands) so their mandate is visible.
- **Edges never cross the centre.** Cross-sector edges are routed radially to the channel between the two tiers, along the channel, and radially in. With straight chords 191 of 611 cross-sector edges would pass through the centre; routed, none do.
- **Collapsed local triads** (decision P6) are part of the layout: a gemeente, provincie, waterschap or openbaar lichaam is one mark with orbit dots for its raad and commissie, which open on focus.
- **The ∩ arch.** The chambers are drawn as arches with straight legs, the shape of the plenary hall, never as semicircles. The arch parameters are asserted to give exactly 150 and 75 seats.
- **The electorate is the frame, the Grondwet is the core** (P7, decided 19-09-2026). This supersedes decision 2 above: the core disc carries the Grondwet and the Statuut, the outer ring is the electorate, and `elects` edges run inward from it.
- **The arch opens toward the core** (P2, decided 19-09-2026): the dome faces outward, so a chamber turned to the top reads as a parliament.
- **Fractie blocks, largest first from the left** (P3, decided 19-09-2026) until the zaalindeling is sourced; the chart states which order it uses.

The layout id becomes `nl-tiers-v1`. The motion model (decision 8) is unchanged: turn, gather and step back work on one centre and a radius, which the tier model has.

## Consequences

- A new layout id (`nl-tiers-v1`), a rewritten `web/lib/graph-layout.md`, a replaced `graph-explorer.tsx`, and new invariant tests (node in one tier and sector, sectors disjoint, routed edges clear of the centre, arch seat counts exact).
- `graph.json` grows by four numbers per node and by the nine relation types now emitted; `power-map.json` is split off. Client JavaScript for the canvas shrinks by the layout code.
- Three research workstreams (elections, coalitions, zaalindeling) and one data pass (relation dates) precede the seat chart and the temporal view.
- `AGENTS.md` rule 6 is stale and is proposed for replacement (P4).
- The plan, its status board and the pending decisions live in `docs/13-graph-rebuild-plan.md`.

## Amendment 2 (19-09-2026): no gather, no step back; the turn stays

The owner reviewed the built canvas and found that the gather read as bodies moving on top of each other and overlapping, and that the names were hard to read. Decision 8 is amended: a body never leaves its place. Selecting one highlights it, its path and its direct relations in place, reveals its collapsed children at their fanned positions, and eases the camera to hold them and the core. The turn to the reading angle stays, on a slower spring (about 1.1 s) so it reads as deliberate. Names are drawn upright at one size on screen for the selection, its path, its relations and the mark under the pointer, placed per frame without overlap (`web/lib/label-placement.ts`). The spring motion model, the reduced-motion behaviour and the pure-function rule are unchanged. `web/lib/graph-layout.md` section 9 records the new behaviour.

## Amendment 3 (19-09-2026): clusters that unpack in place

The owner asked for the reference product's behaviour: a body with many children draws them as a compact grid of dots, and clicking the grid unpacks it in place while the neighbours on that ring slide aside, so the zoomed view never overlaps. Decided: inside one sector, a parent with three or more standing children gets a cluster (the ministries' agentschappen, inspecties and ZBOs; the Kamers' commissies). One cluster is open at a time. The open state is the same ring packer the build ran (`web/lib/ring-pack.ts`), run on the client for that one sector, and the sector's outer radius is reserved at build time for its widest open cluster, so nothing enters the next tier. Marks became outlines with a translucent fill that deepens under the pointer and on selection, with a tooltip. The turn to the selection stays and gets a reader toggle. Layout id `nl-tiers-v2`. Gemeenten have no parent in the data and stay individual; how to group them is an open question recorded in `docs/13` section 9.
