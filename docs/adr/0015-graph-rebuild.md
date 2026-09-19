# ADR 0015: Graph rebuild, layout model, renderer and motion

Date: 19-09-2026
Status: proposed (accepted once P1 to P3 in `docs/13-graph-rebuild-plan.md` are decided)

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

## Consequences

- A new layout id (`nl-polder-v1` or the chosen variant's id), a rewritten `web/lib/graph-layout.md`, a replaced `graph-explorer.tsx`, and new invariant tests (poles disjoint, node in one pole, hemicycle exact).
- `graph.json` grows by four numbers per node and by the nine relation types now emitted; `power-map.json` is split off. Client JavaScript for the canvas shrinks by the layout code.
- Three research workstreams (elections, coalitions, zaalindeling) and one data pass (relation dates) precede the seat chart and the temporal view.
- `AGENTS.md` rule 6 is stale and is proposed for replacement (P4).
- The plan, its status board and the pending decisions live in `docs/13-graph-rebuild-plan.md`.
