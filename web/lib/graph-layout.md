# Graph layout specification (nl-tiers-v1)

This is the reproducible layout for the Staatsgraaf canvas. It is written so the web client and the later Swift client draw identical positions from the same file. The packer lives in `web/lib/graph-layout.ts` and runs once at build time in `web/scripts/build-graph.mjs`, which writes the coordinates into `web/public/graph.json`; the client module `web/lib/graph.ts` hydrates that file and never packs. The interaction layer is `web/lib/pose.ts` and `web/lib/motion.ts`, the renderer `web/components/graph/graph-canvas.tsx`. The machtskaart ships separately as `web/public/power-map.json` and is loaded only by the views that show it.

The layout is deterministic. The same dataset always produces the same angle and radius for the same body. There is no physics, no randomness, no time-dependent seed. Sorting never depends on object key order: ties break on `name`, then `id`.

Version `nl-tiers-v1` replaces `nl-sectors-v3`, which copied the reference product's single ring system of wedges by branch. That geometry misread the Dutch state: distance from the centre read as rank and a wedge read as ownership, so the Staten-Generaal, the Hoge Colleges and the medeoverheden appeared as offices of a centre they are not subordinate to. The decision and the comparison that led here are in `docs/adr/0015-graph-rebuild.md` and `research/graph-variants/`.

## 1. What the picture says

- The **core** is the Grondwet and the Statuut, the text every body derives its powers from. It is drawn as a disc, never as a node, because a constitution is not an organ.
- **Tiers** are concentric bands by statutory function, not by rank: constitutional core, political core, ministries, execution and supervision and advice, decentralised authorities, Kingdom.
- **Sectors** divide a tier by group of organs, so related bodies stay together.
- The **frame** is the electorate. It is the outer ring that contains everything, and every `elects` edge runs inward from it, because in a parliamentary system the mandate comes from the voters and is handed inward.
- A body's **distance from the core** is its statutory distance, not its importance. A gemeente sits far out because it governs under its own autonomy, not because it matters less.

## 2. Input and output

The packer's input (`LayoutInput` in `graph-layout.ts`) is:

- `nodes`: every organization, each with `id`, `slug`, `name`, `type`, `subtype`, `branch`, `level`, `degree`, `parent`.
- `edges`: every organization-to-organization relation, each with `from`, `to`, `type`, and `validFrom` and `validTo` when the data states them.
- `hub`: the constituency organization drawn as the frame (`org:kiesgerechtigden-nederland`).

The packer's output is a laid-out graph: every node has `angle` (radians), `radius`, `x`, `y`, `tier`, `sector`, `glyph`, `glyphRadius`, `hidden`, `arch`, `orbit`, `collapsedInto`. The layout also carries `tiers` (each with its `sectors`), `channels`, `coreRadius`, `frameRadius`, `maxRadius` and the fixed `viewBox`.

`graph.json` (schema `nl-graph-bundle-v2`) carries that output on the wire in a compact form: each node ships its plain fields plus `x`, `y`, `angle`, `radius`, `tier`, `sector`, and `hidden`, `arch`, `orbit`, `collapsedInto` only when they are set; `glyph` and `glyphRadius` are derived on the client from `subtype` and `degree`. The bundle also carries `tiers`, `channels`, `coreRadius`, `frameRadius`, `maxRadius`, `viewBox` and `chambers` (section 8). `hydrateLayout` in `graph.ts` turns it back into the layout above without packing anything; `web/lib/graph.test.mjs` proves the hydrated layout equals the packer's output field by field.

`power-map.json` carries `powerMap`, `entityPowerMap` and `personSlugs`, and is fetched only when the machtskaart is shown or a person is in focus.

Canvas units are abstract. The renderer maps them to pixels with pan and zoom.

## 3. Coordinate system

- Origin `(0, 0)` is the core centre.
- Angle `0` points right. Angles increase clockwise on screen because SVG y grows downward.
- `START_ANGLE = -90deg` is straight up. Every tier lays its first sector from there, so the tiers line up on one radial seam and read as a single dial.
- `x = cos(angle) * radius`, `y = sin(angle) * radius`.
- The viewBox is `[-R, -R, 2R, 2R]` with `R = frameRadius + PUSH_RESERVE + FRAME_MARGIN`. `PUSH_RESERVE` is extra room outside the frame, kept from the first build so the layout id and the shipped coordinates did not change when the step back was withdrawn (section 9).

## 4. The tier table

`TIER_TABLE` in `graph-layout.ts` is the whole assignment rule. Every branch and subtype has exactly one place; a branch the table misses becomes its own sector in the outermost tier rather than being dropped.

| Tier | Sectors | Members |
| --- | --- | --- |
| `kern` | `hoge-colleges`, `rechterlijke-macht` | branch `hoge-colleges`; branch `rechterlijke-macht` |
| `politiek` | `staten-generaal`, `regering` | branch `staten-generaal`; branch `regering` with subtype `land-regering` or `commissie` |
| `ministeries` | `ministeries` | branch `regering`, subtype `ministerie` |
| `uitvoering` | `uitvoering`, `inspecties`, `zelfstandig`, `advies` | subtypes `agentschap` and `uitvoeringsorganisatie`; subtype `inspectie`; branch `zelfstandig` (zbo, rwt); branch `adviescolleges` |
| `decentraal` | `provincies`, `gemeenten`, `waterschappen`, `caribisch` | branches `decentraal-provinciaal`, `decentraal-lokaal`, `waterschap`, `caribisch-nederland` |
| `koninkrijk` | `koninkrijk` | branch `koninkrijk` |

Why the judiciary sits in the constitutional core and not in a tier of its own: it is independent by constitution and answers to no minister, which is the property the innermost tier expresses. Why the zbo's are a sector and not a depth ring of the ministries: the Kaderwet zbo puts them at arm's length, and nesting them inside a ministry would assert a hierarchy the law denies.

Measured on the snapshot of 19-09-2026 (1641 nodes, 1447 edges, layout in 7 ms):

| Tier | Bodies | Radii |
| --- | --- | --- |
| `kern` | 25 | 108 to 127 |
| `politiek` | 39 | 157 to 246 |
| `ministeries` | 12 | 276 to 296 |
| `uitvoering` | 332 | 326 to 416 |
| `decentraal` | 446 | 446 to 520 |
| `koninkrijk` | 30 | 550 to 566 |

## 5. Collapsed local triads

Every gemeente, provincie, waterschap and openbaar lichaam is three records: the body, its raad or staten or algemeen bestuur, and its commissie. Drawn one by one they are 1202 of 1640 marks and they swamp the picture.

**Clusters.** Inside one sector, a parent with `CLUSTER_MIN = 3` or more standing children gets one cluster instead of that many marks: the ministries' agentschappen, inspecties and zelfstandige bestuursorganen, and the two Kamers' commissies (20 clusters on the 19-09-2026 snapshot). A cluster is a grid of dots, `clusterGrid(count)` rows across the ring and columns along it (2 rows up to 6, 3 up to 15, 4 up to 32, 5 beyond), `CLUSTER_DOT_PITCH = 3` apart. Each dot is one member: the member keeps its dot position as its rest position, is marked `hidden` and carries `cluster`, and its name order in the grid is its name order on the ring when the cluster opens. A sector's items (marks and clusters) are ordered by the angle of the parent when the parent is on an inner tier, so a ministry's bodies sit near the ministry, then by name. In a sector of `CLUSTER_SECTOR_MIN = 40` or more members, the members without a parent are grouped too: by the standing body that `oversees` them when the data has that relation (the gemeenten under the interbestuurlijk toezicht of their provincie, 12 grids of 6 to 56), else by subtype (the 25 veiligheidsregio's, the 39 samenwerkingsverbanden). A cluster carries its `kind` (`children`, `oversight`, `subtype`) so the canvas can say what the grid is without implying a hierarchy the constitution does not have. 34 clusters on the 19-09-2026 snapshot.

**Rings.** `packRing` in `web/lib/ring-pack.ts` fills a sector with items of different widths: rings are opened outward until they hold everything, each ring takes the run of items whose share of the total demand falls in its share of the capacity, and the free arc on a ring is spread evenly between its items. The same function runs at build time and on the client, so the open state of a cluster (section 9) is as deterministic as the rest state. The sector's outer radius is reserved for the farthest any single open cluster reaches, so unpacking never enters the next tier.

**Collapsed children.** A node whose `subtype` is in `COLLAPSE_CHILD` and whose parent's `subtype` is in `COLLAPSE_PARENT` is collapsed onto its parent: it keeps a position (fanned 32 degrees apart just outside the parent's glyph) but is marked `hidden`, and the parent carries `orbit` orbit marks instead. When the parent is selected the children are revealed at those positions (section 9). Nothing is removed from the data and every body stays reachable from the list and the keyboard.

This takes the canvas from 1640 marks to 882.

## 6. Sector spans

Inside a tier, the full circle minus one `SECTOR_GUTTER` per sector is divided by `allocateSpans`:

```
demand(sector) = sum over its bodies of (2 * glyphFootprint + GLYPH_GAP)
weight(sector) = sqrt(demand)
minimum(sector) = 3 * widest glyph diameter / tier inner radius
                  (or the arch block width, for the Staten-Generaal)
span(sector)   = allocateSpans(weights, minimums, usable)
```

Square-root weighting is what keeps a sector of four hundred gemeenten larger than a sector of three hoge colleges without letting it swallow the ring: a branch of the state that holds more bodies gets more of the circle, but proportionally to the square root of what it would need, not to the raw count. The minimum guarantees that a sector of three large marks still gets an arc wide enough to place them.

`allocateSpans` gives each sector a span proportional to its weight, raises anything under its minimum, then shrinks the sectors above their minimum in proportion to their headroom. If the minimums alone exceed the circle, every minimum is scaled by one factor, so the layout degrades evenly instead of dropping a sector.

## 7. Filling a sector: evenly spread rings

This is the rule that decides where a mark actually lands, and the property it guarantees is that **a ring is spread over its sector's whole arc**, never packed against one edge with the rest of the arc left empty.

```
pitch    = 2 * widest glyph footprint in the sector + GLYPH_GAP
step     = clamp(ceil((2 * widest + GLYPH_GAP + 2 * SELECTED_GROWTH) / 5) * 5,
                 MIN_RING_STEP, MAX_RING_STEP)
```

Rings open outward from the tier's inner radius until their combined capacity holds every body, where `capacity(ring) = floor(span * radius / pitch)`. The bodies are then distributed over the rings in proportion to each ring's capacity, by the largest-remainder method with ties broken on ring index, and each ring places its share at

```
angle(i) = start + span * (i + 0.5) / count
```

so the gap between two neighbours on a ring is the same everywhere, the marks are centred in the arc with half a gap at each end, and every ring of a sector is filled to the same fraction of its capacity. `web/lib/graph.test.mjs` pins all three properties.

Constants:

| Constant | Value | Meaning |
| --- | --- | --- |
| `CORE_RADIUS` | 62 | radius of the Grondwet disc |
| `CORE_CLEARANCE` | 46 | band between the core and the first tier; carries the first tier's label lanes |
| `TIER_GAP` | 30 | radial gap between two tiers; edges and labels travel in it |
| `SECTOR_GUTTER` | 3deg | angular gap between two sectors of a tier |
| `GLYPH_GAP` | 3 | minimum edge-to-edge gap between two glyphs |
| `MIN_RING_STEP` | 15 | lower bound on a sector's ring step |
| `MAX_RING_STEP` | 40 | upper bound on a sector's ring step |
| `FRAME_CLEARANCE` | 34 | band between the outermost tier and the electorate frame |
| `PUSH_RESERVE` | 96 | extra viewBox room outside the frame, kept for a stable layout id |
| `SELECTED_GROWTH` | 1.5 | extra glyph radius of the focused mark, reserved in the ring step |

## 8. The chambers: the ∩ arch

The Tweede Kamer and the Eerste Kamer are not marks. The `staten-generaal` sector reserves a block at the inner edge of the politieke kern and the two chambers are drawn in it as ∩ arches: concentric arcs over the top continued as straight legs, the shape of the plenary hall, never a plain semicircle.

`archParams(total, rows, r0Steps)` returns the parameters that give exactly `total` seats and throws otherwise, so a wrong chamber size fails the build instead of drawing 149 seats:

| Chamber | Rows | Arc seats | Legs | Total |
| --- | --- | --- | --- | --- |
| Tweede Kamer | 5 | 70 | 5 rows x 8 per side | 150 |
| Eerste Kamer | 3 | 33 | 3 rows x 7 per side | 75 |

On the canvas each arch is one target: a block the size of the arch carries the chamber's id, so a click anywhere on the chamber selects it, and the block tints under the pointer and in the accent colour when selected. The seats inside are decoration at 0.7 opacity and take no clicks; past 2x zoom they show at full opacity. The two arches sit `ARCH_TK_OFFSET = -26` and `ARCH_EK_OFFSET = 34` from the block's centre, 14 units apart, so they read as two objects. Seat pitch is the same along the arc and down the legs. Seats are returned sorted along the path (left leg bottom, up, over the arch, down the right leg), so filling them in order gives one contiguous block per fractie. The dome faces outward and the opening faces the core, which is what makes the arch read as a parliament when the canvas turns it to the top (decision P2 of the plan, 19-09-2026).

Blocks are filled largest fractie first from the left (order H6 of the plan) until the real zaalindeling is sourced; `memberships.seatNumber` is the field that will replace it, and the chart always states which order it is using. Colours come from the sourced party registry (`web/lib/parties.ts`, ADR 0009) through `bundle.chambers`; a fractie with no sourced colour renders neutral and never gets an invented one. A dashed line marks the majority: seat 76 of 150, seat 38 of 75.

## 9. Interaction: turn, highlight, unpack, frame

The interaction layer is `web/lib/pose.ts`, `web/lib/ring-pack.ts` and `web/lib/label-placement.ts`. A body leaves its place for one reason only: the cluster it is a dot of is opened. Selecting a body turns the canvas, highlights it, its path to the electorate and its direct relations where they are, and moves the camera; nothing else moves. This follows the reference product: CivLab keeps every body in its ring and unpacks one dot grid at a time in place, with the neighbours on that ring sliding aside. This replaced the gather and step back of the first rebuild on 19-09-2026 (ADR 0015, amendment 2): summoning relations onto a halo read as marks piling on top of each other, and a body that had moved could no longer be found where the reader had seen it.

**Turn.** `alignRotation(angle, previous)` returns the frame rotation that brings a focused body or a selected sector to `START_ANGLE`, straight above the core, expressed as the value nearest `previous` so the canvas always turns the short way and never unwinds a whole circle. A turn under 0.05 rad is not made at all, so selecting a neighbour does not nudge the canvas. One rotation applies to the whole frame, so nothing inside it can collide by turning. The rotation rides `SPRING_TURN` (about 1.1 s to settle), slower than the zoom and pan, so the turn reads as deliberate rather than rushed. The reader can switch the turn off with the ↻ button under the zoom buttons; the choice is kept in `localStorage` (`staatsgraaf.graph.turn`) and the view still frames the selection.

**Unpack.** Clicking a cluster, or selecting one of its members from the list or the keyboard, opens it. `sectorPose(layout, clusterId)` packs that one sector again with the cluster replaced by its members as full marks (`packRing` on the sector's shipped `items`), so the members take the arc they need and the other items of the sector, marks and grids alike, slide along the ring to make room. Only that sector moves; every mark slides along its ring (`posePosition`, short arc) and the open grid's dots grow from dot to glyph. One cluster is open at a time: opening another folds the first (fold, swap, unpack, the pose changes only once the previous one has closed). Clicking the background, or the open grid's parent area, folds it. The camera frames the open cluster (`clusterFocus`) or the selection inside it.

**Highlight.** The selected mark grows by `SELECTED_GROWTH` and gets a ring; its path to the electorate is drawn in the accent colour; each direct relation gets a thin ring; every other mark dims. A collapsed child (section 5) is revealed at its fanned position when its body is selected, or when it is selected itself from the list or the keyboard.

**Marks and hover.** Every mark is an outline in its branch colour with a translucent fill (`fillOpacity` 0.22), so rings and edges stay visible through it. The fill deepens as the mark matters more: 0.3 as an unpacked member, 0.4 as a relation, 0.55 under the pointer, 0.5 on the path and 0.75 as the selection, the last two in the accent colour. Hover is not React state: the pointer crosses hundreds of hit targets per second, so the tint is written to one overlay element and the tooltip is its own component with its own state; the canvas never re-renders on hover. The mark or grid under the pointer gets a tooltip beside it: the name, its gloss in English, the subtype in the branch colour, the tier, the parent body and the number of relations; for a grid, the parent, the count and the dominant subtype, and whether a click unpacks or folds it.

**Frame.** `focusReach(layout, id, hiddenBranches)` is the distance from the focus to its farthest visible relation plus a margin, clamped to `[MIN_REACH, MAX_REACH]`. `frameFor(layout, focus, rotation)` returns the view transform that holds the core and that neighbourhood on screen at once, never more than 2.4x. The dial and the bracket keys turn the canvas by hand as well.

**Names.** Only the selection, its path, its direct relations (at most `MAX_LABELS = 80`) and the mark under the pointer carry a name. Labels sit outside the view and rotation groups, so they stay upright and keep one size on the reader's screen (12 CSS pixels, 13.5 for the selection) at any zoom. `placeLabels` runs every frame in screen coordinates: labels are placed in priority order (hover, selection, path, relations) into the first free slot of right, left, above, below, keeping clear of every labelled mark and every label placed before; a name that fits nowhere is hidden rather than drawn over another.

Motion is one critically damped spring per animated scalar (`web/lib/motion.ts`), not a timed tween, because retargeting mid-flight is the normal case here and a spring has no schedule to cancel. `prefers-reduced-motion` snaps every spring instead.

## 10. Edges

Only organization-to-organization edges are drawn.

- Inside one sector: a quadratic Bezier bowing away from the centre, `BOW = 0.14`.
- Between sectors: `routedEdgePath` goes radially to the channel between the two tiers, along the channel the short way round, then radially to the target. A channel is the mid-line of a tier gap. Of the 611 cross-sector edges in the 19-09-2026 snapshot, none crosses the core; as straight chords 107 would, and the canvas would read as a hairball.

Edge states: default dim; neighbour of the focus in the accent colour with an arrow head; the path from the focus to the electorate in the accent colour at double width; hidden when either end's branch is filtered out.

The relations of the selection and its path are merged into one path each, in their rest shape. Everything else is merged into one path per relation type. No edge ever moves.

## 11. Pan, zoom and the dial

- The SVG has a fixed `viewBox`; one group carries `translate(tx ty) scale(s)` and one inner group carries `rotate(deg)`.
- Wheel zooms around the pointer, clamped to `[0.25, 8]`. Dragging inside the outermost tier pans. Dragging outside it turns the canvas like a dial.
- Selecting a body also frames it: the zoom and pan ease to a view that holds the core, the body and its direct relations at once, never more than 2.4x.
- Keyboard: arrows move the selection, `Home` and `End` jump to the ends, `Enter` opens the organization page, `Escape` clears the selection, `[` and `]` turn the canvas, `+` `-` `0` zoom and reset.
- The transform is written by one animation frame straight to the DOM through refs. React renders the structure once; it does not reconcile 1600 elements per pointer move.

## 12. Performance budget

- The layout is computed once, at build time: 7 ms for 1641 nodes and 1447 edges on the 19-09-2026 snapshot. The client hydrates it in a `useMemo` and ships no packer code (`graph-layout.ts` is absent from the client chunks; the build checks this by grepping them).
- 882 marks are drawn at rest; 756 are collapsed onto their body. At rest the marks are merged into one path per sector and glyph (16 paths on the 19-09-2026 snapshot) with one transparent hit circle each; a mark gets an element of its own only while it is selected, on the path, a direct relation or revealed, and folds back into the merged path when the selection clears.
- Static edges are merged into one path per relation type; the highlighted edges are two more. While a cluster is open, the marks of its sector and the edges with an end in it are redrawn per frame (three merged live edge paths; edges that do not touch the selection or the open members refresh every sixth frame). Nothing else is redrawn per frame except the view transform, the tooltip and the labels (at most about 160 text elements).
- Measured on 19-09-2026 in headless Chrome at 1280 x 900 with software rasterisation (no GPU), sampling `requestAnimationFrame` intervals: idle and wheel zoom 16.7 ms per frame; focusing a ministry under the earlier gather motion (18 summoned marks, 811 stepping back) 17 to 19 ms average, p95 30 to 33 ms, an upper bound for the in-place highlight that replaced it; a full turn of the canvas to a far sector 23 to 24 ms average, p95 34 ms, about 8 frames over 33 ms in a 900 ms turn. The turn cost is the rasterisation of the whole rotated scene and did not move with the element count (merging the marks and hiding the edge layer changed it by under 1 ms), so on a machine with GPU rasterisation it is expected to be well inside the budget; that measurement is still to be taken.
- `graph.json` budget: under 100 KiB gzip (the uncompressed size is not what the client downloads). Measured for 19-09-2026 with clusters and the 1840 edges of phase 3: 856 KiB, 90 KiB gzip. The coordinates cost about 36 KiB gzip over the packer-free bundle of the previous layout; that is the price of one file every client can draw, and it replaces the packer code the client used to ship.
- `power-map.json`: 31 KiB, 4.6 KiB gzip, loaded only on demand.
- The build script prints both sizes on every run.

## 13. Reproducibility checklist

- No `Math.random`, no `Date.now`, no locale-sensitive sort. Use plain `<` on names and ids.
- The bundle carries `schema` and `layout` version strings. A change to the constants or the order bumps the layout string and is written here first.
- `web/lib/graph.test.mjs` guards the invariants on the real bundle: every node in exactly one tier and sector, sectors never overlapping and keeping their gutter, tiers ordered outward, no two drawn footprints overlapping, nothing inside the core, rings spread evenly over their arc and filled to a comparable fraction, routed edges clear of the core, arch seat counts exact, the turn taking the short way, everything inside the viewBox, and the whole layout deterministic, every cluster holding every standing child of its parent in the sector, grids overlapping nothing, and clusters hydrating exactly.
- `web/lib/ring-pack.test.mjs` guards the packing: order kept, no overlap, even free arc, rings filled to a comparable fraction, a wide item opening its own ring, determinism.
- `web/lib/pose.test.mjs` guards the pose and the camera: every open cluster unpacks into marks that overlap nothing and stay inside the reserved sector, members keep their name order, scalar zero is the rest layout, the interpolation stays on the ring, the reach of a focus covers its farthest relation and stays bounded, a filtered branch does not stretch it, and the auto frame keeps the core and the focus on screen at any rotation. `web/lib/label-placement.test.mjs` guards the names: placed labels never overlap each other or a labelled mark, priority wins a slot, the order is reproducible, and a crowded field hides names instead of stacking them.
