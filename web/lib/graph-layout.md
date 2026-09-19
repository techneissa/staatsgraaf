# Graph layout specification (nl-tiers-v5)

This is the reproducible layout for the Staatsgraaf canvas. It is written so the web client and the later Swift client draw identical positions from the same file. The packer lives in `web/lib/graph-layout.ts` and runs once at build time in `web/scripts/build-graph.mjs`, which writes the coordinates into `web/public/graph.json`; the client module `web/lib/graph.ts` hydrates that file and never packs. The interaction layer is `web/lib/pose.ts` and `web/lib/motion.ts`, the renderer `web/components/graph/graph-canvas.tsx`. The machtskaart ships separately as `web/public/power-map.json` and is loaded only by the views that show it.

The layout is deterministic. The same dataset always produces the same angle and radius for the same body. There is no physics, no randomness, no time-dependent seed. Sorting never depends on object key order: ties break on `name`, then `id`.

Version `nl-tiers-v5` replaces `nl-sectors-v3`, which copied the reference product's single ring system of wedges by branch. That geometry misread the Dutch state: distance from the centre read as rank and a wedge read as ownership, so the Staten-Generaal, the Hoge Colleges and the medeoverheden appeared as offices of a centre they are not subordinate to. The decision and the comparison that led here are in `docs/adr/0015-graph-rebuild.md` and `research/graph-variants/`.

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
- The viewBox is `[-R, -R, 2R, 2R]` with `R = frameRadius + PUSH_RESERVE + FRAME_MARGIN`. `PUSH_RESERVE` is extra room outside the frame; it is zero, so the canvas fills its box.

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

**Clusters.** Inside one sector, a parent with `CLUSTER_MIN = 3` or more standing children gets one cluster instead of that many marks: the ministries' agentschappen, inspecties and zelfstandige bestuursorganen, and the two Kamers' commissies (20 clusters on the 19-09-2026 snapshot). A cluster is a grid of dots, `clusterGrid(count)` rows across the ring and columns along it (2 rows up to 6, 3 up to 15, 4 up to 32, 5 beyond), `CLUSTER_DOT_PITCH = 3` apart. Each dot is one member: the member keeps its dot position as its rest position, is marked `hidden` and carries `cluster`, and its name order in the grid is its name order on the ring when the cluster opens. A sector's items (marks and clusters) are ordered by the angle of the parent when the parent is on an inner tier, so a ministry's bodies sit near the ministry, then by name. In a sector of `CLUSTER_SECTOR_MIN = 40` or more members, the members without a parent are grouped too: by the standing body that `oversees` them when the data has that relation (the gemeenten under the interbestuurlijk toezicht of their provincie, 12 grids of 6 to 56), else by subtype (the 25 veiligheidsregio's, the 39 samenwerkingsverbanden). A cluster carries its `kind` (`children`, `oversight`, `subtype`) so the canvas can say what the grid is without implying a hierarchy the constitution does not have. A sector that seats a chamber packs its items outside the seats (section 8), so the commissies of a Kamer ring their own chamber. 34 clusters on the 19-09-2026 snapshot.

**Rings.** `packRing` in `web/lib/ring-pack.ts` fills a sector with items of different widths: rings are opened outward until they hold everything, each ring takes the run of items whose share of the total demand falls in its share of the capacity, and the free arc on a ring is spread evenly between its items. The same function runs at build time and on the client, so the open state of a cluster (section 9) is as deterministic as the rest state. The sector's outer radius is reserved for the farthest any single open cluster reaches, so unpacking never enters the next tier.

**Collapsed children.** A node whose `subtype` is in `COLLAPSE_CHILD` and whose parent's `subtype` is in `COLLAPSE_PARENT` is collapsed onto its parent: it keeps a position (fanned 32 degrees apart just outside the parent's glyph) but is marked `hidden`, and the parent carries `orbit` orbit marks instead. When the parent is selected the children are revealed at those positions (section 9). Nothing is removed from the data and every body stays reachable from the list and the keyboard.

This takes the canvas from 1640 marks to 882.

## 6. Sector spans

Inside a tier, the full circle minus one `SECTOR_GUTTER` per sector is divided by `allocateSpans`:

```
demand(sector) = sum over its bodies of (2 * glyphFootprint + GLYPH_GAP)
weight(sector) = sqrt(demand)
minimum(sector) = 3 * widest glyph diameter / tier inner radius
                  (or the seating arc, for a sector that seats a chamber)
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
| `PUSH_RESERVE` | 0 | extra viewBox room outside the frame; none, so the canvas fills its box |
| `BENCH_ROWS` | 3 | rows of seats across the ring, per chamber (section 8) |
| `BENCH_GUTTER` | 3 | blank columns between two chambers on one ring |
| `BENCH_MIN_COLUMN` | 3.4 | narrowest column, which sets a seating sector's minimum arc |
| `BENCH_MAX_COLUMN` | 6.5 | widest column, which caps seat size and bench depth |
| `BENCH_CLEARANCE` | 10 | radial room between the outermost seat row and the first ring packed outside it |
| `SELECTED_GROWTH` | 1.5 | extra glyph radius of the focused mark, reserved in the ring step |

## 8. The chambers: benches on the ring

The Staten-Generaal consist of the Tweede Kamer and the Eerste Kamer (Grondwet art. 51, https://wetten.overheid.nl/BWBR0001840#Hoofdstuk3_Paragraaf1_Artikel51). They are not a body above the two chambers, so the canvas draws no mark for the Staten-Generaal: the `staten-generaal` sector's own arc is the seating. Each chamber is one stretch of that arc, and the two are separated by a gutter of blank columns and carry their own name on an arc just outside their seats, so neither can be mistaken for the other.

`web/lib/bench.ts` lays them out, entirely from the sector's arc:

- Seats sit in `BENCH_ROWS = 3` rows across the ring and in columns along it. A fractie takes a whole number of columns, `ceil(seats / rows)`, so every party group is one contiguous wedge with a straight edge and no two fracties share a column. A column that is not full carries its seats centred across the rows, so a one-seat fractie reads as one seat in the middle of the band.
- The column width is the sector's arc divided by every chamber's columns plus `BENCH_GUTTER = 3` between them, capped at `BENCH_MAX_COLUMN = 6.5`; the sector's minimum arc is that same demand at `BENCH_MIN_COLUMN = 3.4`. A wider sector therefore gives bigger seats, never a broken bench. The rows are as deep as a column is wide, so the whole bench is `rows` columns deep: 19.5 units on the 19-09-2026 snapshot, against the 60 of the ∩ arch it replaced, which is why the politieke kern is no longer the thickest tier.
- Seat counts come from `bundle.chambers`, so a chamber whose seats are unknown is simply packed as an ordinary mark instead of seated.

On the canvas each fractie's seats are one merged path and one wedge over them: hovering names the fractie with its seats, clicking picks it out and fills the details panel. The band behind the seats and the chamber's name are the chamber's own target. There is no majority line: on the canvas it read as an unexplained dash, and the majority is stated in words in the details panel and drawn with its legend on the chamber pages.

Blocks are filled largest fractie first (order H6 of the plan) until the real zaalindeling is sourced; `memberships.seatNumber` is the field that will replace it, and the panel says the seat order within a fractie is not published. Colours come from the sourced party registry (`web/lib/parties.ts`, ADR 0009) through `bundle.chambers`; a fractie with no sourced colour renders neutral and never gets an invented one.

The ∩ arch stays on the chamber and party pages (`web/components/parliament/arch-chart.tsx`, `archParams`, `archSeats`), where there is room for it and its majority line carries a legend. This reverses decision P2 for the canvas only (ADR 0015 amendment 4).

## 9. Interaction: turn, highlight, unpack, frame

The interaction layer is `web/lib/pose.ts`, `web/lib/ring-pack.ts` and `web/lib/label-placement.ts`. A body leaves its place for one reason only: the cluster it is a dot of is opened. Selecting a body turns the canvas, highlights it, its path to the electorate and its direct relations where they are, and moves the camera; nothing else moves. This follows the reference product: CivLab keeps every body in its ring and unpacks one dot grid at a time in place, with the neighbours on that ring sliding aside. This replaced the gather and step back of the first rebuild on 19-09-2026 (ADR 0015, amendment 2): summoning relations onto a halo read as marks piling on top of each other, and a body that had moved could no longer be found where the reader had seen it.

**Turn.** `alignRotation(angle, previous)` returns the frame rotation that brings a focused body or a selected sector to `START_ANGLE`, straight above the core, expressed as the value nearest `previous` so the canvas always turns the short way and never unwinds a whole circle. A turn under 0.05 rad is not made at all, so selecting a neighbour does not nudge the canvas. One rotation applies to the whole frame, so nothing inside it can collide by turning. The rotation rides `SPRING_TURN` (about 1.1 s to settle), slower than the zoom and pan, so the turn reads as deliberate rather than rushed. The reader can switch the turn off with the ↻ button under the zoom buttons; the choice is kept in `localStorage` (`staatsgraaf.graph.turn`) and the view still frames the selection.

**Select.** One thing is selected at a time: a body, a group of dots, a fractie or a sector. Whatever it is, the details panel beside the canvas describes it (section 8a), and the canvas picks it out. Clicking a grid, clicking one of its dots, or selecting one of its members from the list or the keyboard, opens it. `sectorPose(layout, clusterId)` opens the cluster in place first: `pushPack` puts the members on the grid's own ring, centred where the grid was, and pushes only the neighbours on that ring that are in the way, each just far enough to clear the next, out to the ends of the arc. Nothing on another ring moves. When that ring cannot hold the members the sector is packed again from scratch (`packSectorArcs` on the sector's shipped `items`), which is what the build reserved room for. One cluster is open at a time. Every change is one flight: each mark and grid involved starts where it is at that moment, at its current size, and goes to its target or back to rest on one snappy spring (`SPRING_SNAPPY`, about 350 ms), so switching between clusters, or clicking mid-move, is a single motion and nothing snaps. A click on a dot selects that body straight away and opens its grid; a click on the grid's edge opens or folds it; the background folds it. The view never zooms or pans on its own: the reader owns it through the wheel, the buttons and the drag, and only the turn (below) moves the canvas.

**Highlight.** The selected mark grows by `SELECTED_GROWTH` and gets a ring; its path to the electorate is drawn in the accent colour; each direct relation gets a thin ring; every other mark dims. A collapsed child (section 5) is revealed at its fanned position when its body is selected, or when it is selected itself from the list or the keyboard.

**Marks and hover.** Every mark is an outline in its branch colour with a translucent fill (`fillOpacity` 0.22), so rings and edges stay visible through it. The fill deepens as the mark matters more: 0.3 as an unpacked member, 0.4 as a relation, 0.55 under the pointer, 0.5 on the path and 0.75 as the selection, the last two in the accent colour. Hover is not React state: the pointer crosses hundreds of hit targets per second, so the tint is written to one overlay element and the tooltip is its own component with its own state; the canvas never re-renders on hover. The mark or grid under the pointer gets a tooltip beside it: the name, its gloss in English, the subtype in the branch colour, the tier, the parent body and the number of relations; for a grid, the parent, the count and the dominant subtype, and whether a click unpacks or folds it.

**View.** There is no automatic frame: selecting or unpacking never changes the zoom or the pan. The canvas is one fixed picture the reader zooms and pans by hand, so the viewBox has no reserve margin (`PUSH_RESERVE = 0`) and the glyphs are sized for reading at zoom 1 (radius 6 to 11 by degree, dots of 1.2 at a pitch of 3.4).

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
- Selecting a body does not move the view; only the turn (section 9) moves the canvas, and it can be switched off.
- The details panel is a column beside the canvas (`web/components/graph/graph-details.tsx`), under it on a narrow screen. It names what is selected and gives what the picture cannot: an organization with its subtype, tier, parent, group, relations by verb and its path to the electorate, each row a button that selects that body; a group with the bodies it folds and a fold or unpack button; a fractie with its seats, the same party in the other chamber and a link to the party page; a chamber with its fracties and its majority; a sector with its size. It replaced the floating card over the canvas, which could only ever hold a name and two chips.
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
- `web/lib/bench.test.mjs` guards the chambers: a bench per chamber inside its sector, the gutter between them whole columns wide, every seat drawn and inside its bench without overlap, each fractie one contiguous wedge, and the layout deterministic.
- `web/lib/ring-pack.test.mjs` guards the packing: order kept, no overlap, even free arc, rings filled to a comparable fraction, a wide item opening its own ring, determinism.
- `web/lib/pose.test.mjs` guards the pose: every open cluster unpacks into marks that overlap nothing and stay inside the reserved sector, members keep their name order, scalar zero is the rest layout, the interpolation stays on the ring, at least four in five clusters open in place without moving anything on another ring, the reach of a focus covers its farthest relation and stays bounded, a filtered branch does not stretch it, and the pose is deterministic. `web/lib/label-placement.test.mjs` guards the names: placed labels never overlap each other or a labelled mark, priority wins a slot, the order is reproducible, and a crowded field hides names instead of stacking them.
