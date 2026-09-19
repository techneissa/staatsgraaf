# Graph layout specification (nl-tiers-v1)

This is the reproducible layout for the Staatsgraaf canvas. It is written so the web client and the later Swift client can produce identical positions from the same input. The implementation lives in `web/lib/graph.ts`, the interaction layer in `web/lib/pose.ts` and `web/lib/motion.ts`, the renderer in `web/components/graph/graph-canvas.tsx`. The input bundle is built by `web/scripts/build-graph.mjs` into `web/public/graph.json`.

The layout is deterministic. The same dataset always produces the same angle and radius for the same body. There is no physics, no randomness, no time-dependent seed. Sorting never depends on object key order: ties break on `name`, then `id`.

Version `nl-tiers-v1` replaces `nl-sectors-v3`, which copied the reference product's single ring system of wedges by branch. That geometry misread the Dutch state: distance from the centre read as rank and a wedge read as ownership, so the Staten-Generaal, the Hoge Colleges and the medeoverheden appeared as offices of a centre they are not subordinate to. The decision and the comparison that led here are in `docs/adr/0015-graph-rebuild.md` and `research/graph-variants/`.

## 1. What the picture says

- The **core** is the Grondwet and the Statuut, the text every body derives its powers from. It is drawn as a disc, never as a node, because a constitution is not an organ.
- **Tiers** are concentric bands by statutory function, not by rank: constitutional core, political core, ministries, execution and supervision and advice, decentralised authorities, Kingdom.
- **Sectors** divide a tier by group of organs, so related bodies stay together.
- The **frame** is the electorate. It is the outer ring that contains everything, and every `elects` edge runs inward from it, because in a parliamentary system the mandate comes from the voters and is handed inward.
- A body's **distance from the core** is its statutory distance, not its importance. A gemeente sits far out because it governs under its own autonomy, not because it matters less.

## 2. Input and output

Input is a graph bundle with:

- `nodes`: every organization, each with `id`, `slug`, `name`, `type`, `subtype`, `branch`, `level`, `degree`, `parent`.
- `edges`: every organization-to-organization relation, each with `from`, `to`, `type`.
- `hub`: the constituency organization drawn as the frame (`org:kiesgerechtigden-nederland`).
- `chambers`: seat blocks per elected chamber, for the arches (section 8).

Output is a laid-out graph: every node has `angle` (radians), `radius`, `x`, `y`, `tier`, `sector`, `glyph`, `glyphRadius`, `hidden`, `arch`, `orbit`, `collapsedInto`. The layout also carries `tiers`, `sectors`, `channels`, `coreRadius`, `frameRadius`, `maxRadius` and the fixed `viewBox`.

Canvas units are abstract. The renderer maps them to pixels with pan and zoom.

## 3. Coordinate system

- Origin `(0, 0)` is the core centre.
- Angle `0` points right. Angles increase clockwise on screen because SVG y grows downward.
- `START_ANGLE = -90deg` is straight up. Every tier lays its first sector from there, so the tiers line up on one radial seam and read as a single dial.
- `x = cos(angle) * radius`, `y = sin(angle) * radius`.
- The viewBox is `[-R, -R, 2R, 2R]` with `R = frameRadius + PUSH_RESERVE + FRAME_MARGIN`. `PUSH_RESERVE` is the room an open focus needs when the outer tiers step back (section 9), so an expanded neighbourhood never leaves the canvas at zoom 1.

## 4. The tier table

`TIER_TABLE` in `graph.ts` is the whole assignment rule. Every branch and subtype has exactly one place; a branch the table misses becomes its own sector in the outermost tier rather than being dropped.

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

A node whose `subtype` is in `COLLAPSE_CHILD` and whose parent's `subtype` is in `COLLAPSE_PARENT` is collapsed onto its parent: it keeps a position (fanned 32 degrees apart just outside the parent's glyph) but is marked `hidden`, and the parent carries `orbit` orbit marks instead. On focus the children fly out into the halo (section 9). Nothing is removed from the data and every body stays reachable from the list and the keyboard.

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
| `PUSH_RESERVE` | 96 | viewBox room for the step back of an open focus |
| `SELECTED_GROWTH` | 1.5 | extra glyph radius of the focused mark, reserved in the ring step |

## 8. The chambers: the ∩ arch

The Tweede Kamer and the Eerste Kamer are not marks. The `staten-generaal` sector reserves a block at the inner edge of the politieke kern and the two chambers are drawn in it as ∩ arches: concentric arcs over the top continued as straight legs, the shape of the plenary hall, never a plain semicircle.

`archParams(total, rows, r0Steps)` returns the parameters that give exactly `total` seats and throws otherwise, so a wrong chamber size fails the build instead of drawing 149 seats:

| Chamber | Rows | Arc seats | Legs | Total |
| --- | --- | --- | --- | --- |
| Tweede Kamer | 5 | 70 | 5 rows x 8 per side | 150 |
| Eerste Kamer | 3 | 33 | 3 rows x 7 per side | 75 |

Seat pitch is the same along the arc and down the legs. Seats are returned sorted along the path (left leg bottom, up, over the arch, down the right leg), so filling them in order gives one contiguous block per fractie. The dome faces outward and the opening faces the core, which is what makes the arch read as a parliament when the canvas turns it to the top (decision P2 of the plan, 19-09-2026).

Blocks are filled largest fractie first from the left (order H6 of the plan) until the real zaalindeling is sourced; `memberships.seatNumber` is the field that will replace it, and the chart always states which order it is using. Colours come from the sourced party registry (`web/lib/parties.ts`, ADR 0009) through `bundle.chambers`; a fractie with no sourced colour renders neutral and never gets an invented one. A dashed line marks the majority: seat 76 of 150, seat 38 of 75.

## 9. Interaction: turn, gather, step back

The interaction layer is `web/lib/pose.ts`. A pose is a pure function of (layout, focus, visibility); the renderer interpolates between the rest layout and the pose with one scalar, so an interaction can be interrupted, reversed or replayed without leaving state behind. Collapse is the same functions at scalar 0, which is the rest layout itself.

**Turn.** `alignRotation(angle, previous)` returns the frame rotation that brings a focused body or a selected sector to `START_ANGLE`, straight above the core, expressed as the value nearest `previous` so the canvas always turns the short way and never unwinds a whole circle. A turn under 0.05 rad is not made at all, so selecting a neighbour does not nudge the canvas. One rotation applies to the whole frame, so nothing inside it can collide by turning.

**Gather.** The focused body's collapsed children come first, then its children in the data, then its direct relations, capped at `MAX_HALO = 36` and sorted by name then id so the cap cuts the same marks every run. They are summoned onto a halo arc centred on the focus just outside its tier, placed in the order of their home angle so the tethers never cross. A mark summoned from farther than `TETHER_MIN_TRAVEL` leaves a ghost at home and a dotted tether to it, so the reader never loses where it came from.

**Step back.** Every mark beyond the focused tier moves outward by one distance, `push`. The map `radius -> radius + push for radius > tier outer` is monotone in radius and constant in angle, so no two marks can approach each other: every gap is unchanged or wider. That is what makes the halo band provably free at any body, with no angular window to tune and no edge case where the window ends. The tier gap is free already, so `push` only covers what the halo needs beyond it, and the electorate frame grows with it.

**Choreography.** Changing focus while a halo is open plays close, turn, open: the pose swaps only once the previous one has folded, so nothing collides mid-flight.

Motion is one critically damped spring per animated scalar (`web/lib/motion.ts`), not a timed tween, because retargeting mid-flight is the normal case here and a spring has no schedule to cancel. `prefers-reduced-motion` snaps every spring instead.

## 10. Edges

Only organization-to-organization edges are drawn.

- Inside one sector: a quadratic Bezier bowing away from the centre, `BOW = 0.14`.
- Between sectors: `routedEdgePath` goes radially to the channel between the two tiers, along the channel the short way round, then radially to the target. A channel is the mid-line of a tier gap. Of the 611 cross-sector edges in the 19-09-2026 snapshot, none crosses the core; as straight chords 107 would, and the canvas would read as a hairball.

Edge states: default dim; neighbour of the focus in the accent colour with an arrow head; the path from the focus to the electorate in the accent colour at double width; hidden when either end's branch is filtered out.

Edges whose ends move while a pose is open are redrawn every frame in three merged paths (base, neighbour, path). Everything else is merged into one path per relation type and never moves.

## 11. Pan, zoom and the dial

- The SVG has a fixed `viewBox`; one group carries `translate(tx ty) scale(s)` and one inner group carries `rotate(deg)`.
- Wheel zooms around the pointer, clamped to `[0.25, 8]`. Dragging inside the outermost tier pans. Dragging outside it turns the canvas like a dial.
- Selecting a body also frames it: the zoom and pan ease to a view that holds the core and the focused neighbourhood at once, never more than 2.4x.
- Keyboard: arrows move the selection, `Home` and `End` jump to the ends, `Enter` opens the organization page, `Space` expands or collapses the halo, `Escape` collapses and then clears, `[` and `]` turn the canvas, `+` `-` `0` zoom and reset.
- The transform is written by one animation frame straight to the DOM through refs. React renders the structure once; it does not reconcile 1600 elements per pointer move.

## 12. Performance budget

- Layout is computed once per bundle with `useMemo`: 7 ms for 1641 nodes and 1447 edges on the 19-09-2026 snapshot.
- 882 marks are drawn at rest; 756 are collapsed onto their body.
- Static edges are merged into one path per relation type. Live edges are three paths.
- Only the marks in the current pose are written per frame, which is at most one tier's worth plus the halo.
- `graph.json` budget: under 700 KB uncompressed. The measured bundle for 19-09-2026 is 1641 nodes, 1447 edges, 576 KiB, and the build script prints it on every run.

## 13. Reproducibility checklist

- No `Math.random`, no `Date.now`, no locale-sensitive sort. Use plain `<` on names and ids.
- The bundle carries `schema` and `layout` version strings. A change to the constants or the order bumps the layout string and is written here first.
- `web/lib/graph.test.mjs` guards the invariants on the real bundle: every node in exactly one tier and sector, sectors never overlapping and keeping their gutter, tiers ordered outward, no two drawn footprints overlapping, nothing inside the core, rings spread evenly over their arc and filled to a comparable fraction, routed edges clear of the core, arch seat counts exact, the turn taking the short way, everything inside the viewBox, and the whole layout deterministic.
- `web/lib/pose.test.mjs` guards the interaction: an expansion is pure, the halo respects its cap, scalar 0 is exactly the rest layout, the step back is uniform in angle and monotone in radius, an open halo overlaps nothing, nothing enters the core, a summoned mark never dips inside both its endpoints mid-flight, and the auto frame keeps the core and the focus on screen.
