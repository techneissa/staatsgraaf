# Graph layout specification (nl-sectors-v3)

This is the reproducible layout for the Staatsgraaf canvas. It is written before the implementation so the web client and the later Swift client can reproduce the same positions from the same input. The implementation lives in `web/lib/graph.ts`. The precomputed input lives in `web/public/graph.json`, built by `web/scripts/build-graph.mjs`.

The layout is deterministic. The same dataset always produces the same angle and radius for the same node. There is no physics simulation, no randomness, and no time-dependent seed. Sorting never depends on object key order: ties break on `name`, then `id`.

Version 2 replaces the fixed `MIN_SPACING` capacity model of version 1 with glyph footprints. A slot now reserves the real half-width of the glyph plus a gap on each side, so neighboring marks cannot touch regardless of shape or degree. Version 1 packed by a uniform 7-unit spacing, which overlapped 1378 of 1570 pairs in the 18-09-2026 snapshot.

Version 3 fixes the rim labels. In version 2 a label was drawn at one shared `labelRadius`, centered on its sector mid-angle, but horizontal text extends sideways: a long label near the left or right edge of the circle reached back into the glyph and satellite rings (11 text-over-glyph collisions in the browser measurement of 18-09-2026). Version 3 gives every sector its own label radius, computed from the estimated text box and the sector angle, so the whole box clears every glyph. It also raises `GLYPH_GAP` from 2.5 to 3 and includes the label boxes in the `viewBox`.

## 1. Input and output

Input is a graph bundle with:

- `nodes`: every organization, each with `id`, `slug`, `name`, `type`, `subtype`, `branch`, `level`, `degree`, `parent`.
- `edges`: every organization-to-organization relation, each with `id`, `from`, `to`, `type`.
- `hub`: the constituency organization that sits at the center (`org:kiesgerechtigden-nederland`).

Output is a laid-out graph: every node has `angle` (radians), `radius` (canvas units), `x`, `y`, and a `glyph` class. The layout also carries `maxRadius`, `labelRadius`, and the fixed `viewBox`. Every sector carries its own `labelRadius`, `labelWidth`, and `labelHeight` (section 6). Every edge is a quadratic Bezier path.

Canvas units are abstract. The renderer maps them to pixels with pan and zoom. A constant unit is roughly one CSS pixel at zoom 1 on a 1000-unit-wide viewport.

## 2. Coordinate system

- Origin `(0, 0)` is the hub center.
- Angle `0` points right (positive x). Angles increase clockwise on screen because SVG y grows downward.
- The first sector starts at `-90deg` (top) and sectors run clockwise.
- `x = cos(angle) * radius`, `y = sin(angle) * radius`.
- The viewBox is `[-R, -R, 2R, 2R]` where `R = max(maxReach + VIEW_PADDING, labelReach + LABEL_MARGIN)`, `maxReach` is the farthest glyph edge, `labelReach` is the farthest label box edge, `VIEW_PADDING = 200`, and `LABEL_MARGIN = 32`.

## 3. Sectors (branch)

Sectors correspond to the organization `branch` field. The hub is removed from sectoring and drawn at the center. A branch with no organizations gets no sector. Satellites (section 6) count toward the sector's node count but are not packed inside its wedge.

The sector order is fixed so the rim labels never jump between builds:

1. `staten-generaal`
2. `regering`
3. `rechterlijke-macht`
4. `hoge-colleges`
5. `adviescolleges`
6. `decentraal-provinciaal`
7. `decentraal-lokaal`
8. `waterschap`
9. `caribisch-nederland`
10. `zelfstandig`
11. `koninkrijk`

A branch's span is proportional to the square root of its arc demand. Arc demand is the sum over its nodes of the glyph footprint plus `GLYPH_GAP`. Square root weighting keeps a branch with a thousand small bodies (the municipalities) from swallowing the circle while still giving it the largest share. Pure `sqrt(count)` starves sectors made of large glyphs, and pure demand proportionality crushes narrow mid-size sub-sectors, so version 2 uses `sqrt(demand)` at both levels.

Each branch also has a floor: the sub-sector gutters it needs plus the sum of its sub-sector minimums (section 4). The floor guarantees that a small sub-sector of large glyphs still gets enough arc to place its widest mark.

Constants:

| Constant | Value | Meaning |
| --- | --- | --- |
| `SECTOR_GUTTER` | 3deg | gap between sectors |
| `SUBSECTOR_GUTTER` | 1deg | gap between subtypes inside a sector |

Computation:

```
weight(sector) = sqrt(sum of arc demand over its nodes)
floor(sector)  = subSectorCount * SUBSECTOR_GUTTER
               + sum of sub-sector minimums
usable         = 360deg - SECTOR_GUTTER * sectorCount
               - SUBSECTOR_GUTTER * subSectorCount
span(sector)   = allocateSpans(weights, floors, usable)
```

`allocateSpans` gives each entry a span proportional to its weight, raises anything below its minimum, then repeatedly shrinks the above-minimum entries by the excess, proportional to their headroom. If the minimums alone exceed the total, every minimum is scaled down by the same factor, so the layout degrades gracefully instead of dropping nodes.

Sectors are laid end to end clockwise from `-90deg`, each separated by `SECTOR_GUTTER`.

## 4. Sub-sectors (subtype)

Inside a sector, nodes are grouped by `subtype`. Sub-sectors use the same `sqrt(demand)` weighting and `allocateSpans` over the sector's span minus the sub-sector gutters. Sub-sectors run clockwise in the fixed order given by the `SUB_SECTOR_ORDER` table in `graph.ts`, with any subtype not in the table appended in name order so a new subtype cannot silently drop nodes.

Each sub-sector has a minimum span: the diameter of its widest glyph plus `GLYPH_GAP`, divided by a target radius. The target is `MIN_SPAN_RADIUS_SMALL = 550` when the sub-sector has four or fewer nodes and `MIN_SPAN_RADIUS = 900` otherwise. The two-tier target is what keeps single-node sub-sectors of large glyphs close to the hub while still reserving a wide enough arc for them.

```
minimum(subSector) = (2 * max(glyphFootprint(node)) + GLYPH_GAP) / target
```

Within a sub-sector, nodes are sorted by `depth` ascending, then `name`, then `id`. Depth is the length of the `parent` chain within the dataset, capped at `MAX_DEPTH = 6`. This is the parent-derived part of the layout: a child is always taken after its parent and lands on the same ring or an outer one.

## 5. Rings and angular slots

Nodes fill concentric rings inside the sub-sector. The first ring starts outside a hub clearance zone, so no glyph can touch the hub:

```
baseRadius = HUB_RADIUS + HUB_CLEARANCE + minDepth(subSector) * RING_GAP
```

Each sub-sector uses its own radial step, derived from its widest glyph. A wedge of small dots steps 15 units per ring; a wedge of capsules steps 30 or more. Paying the worst-case spacing everywhere was the main reason version 1 needed such large radii.

```
ringStep(subSector) = clamp(ceil((2 * max(glyphFootprint) + GLYPH_GAP + 2 * SELECTED_GROWTH) / 5) * 5,
                            MIN_RING_STEP, MAX_RING_STEP)
```

The `2 * SELECTED_GROWTH` term reserves room for the growth of a focused glyph, so growing a mark on selection can never collide with the ring behind or in front of it.

A ring is packed by arc reservation, not by even division. The cursor starts at the inner edge of the sub-sector. Each node claims half of its own footprint plus half of `GLYPH_GAP` on entry, so adjacent glyphs keep a full `GLYPH_GAP` between their edges:

```
cursor = innerStart
for each node in sorted order:
  halfLead = (glyphFootprint(node) + GLYPH_GAP / 2) / radius
  angle    = cursor + halfLead
  if angle + halfLead > innerEnd or placed >= MAX_PER_RING: stop
  place node at angle
  cursor = angle + halfLead
```

If a ring cannot take a single node, the ring radius grows by the step and packing retries, so a narrow sub-sector never loops forever. Because the step grows with the glyphs in that sub-sector, this cannot collide radially either.

Constants:

| Constant | Value | Meaning |
| --- | --- | --- |
| `HUB_RADIUS` | 96 | radius of the center hub glyph |
| `HUB_CLEARANCE` | 34 | free band between the hub edge and the first packed ring |
| `RING_GAP` | 40 | radial step per depth level |
| `SUBRING_GAP` | 30 | radial step of the satellite halo only |
| `GLYPH_GAP` | 3 | minimum edge-to-edge gap between two glyphs |
| `MAX_PER_RING` | 160 | cap so one huge ring stays drawable |
| `MAX_DEPTH` | 6 | cap on the parent chain length |
| `MIN_RING_STEP` | 15 | lower bound on a sub-sector's ring step |
| `MAX_RING_STEP` | 40 | upper bound on a sub-sector's ring step |

The last node placed sets `maxRadius`.

## 6. Isolated nodes and satellites

A node with organization-to-organization `degree` of zero cannot be placed by relation. These are satellites, matching the reference's use of the term for small bodies outside the main radial layout. Satellites are sorted by `branch`, then `name`, then `id`, and packed by the same `placeRing` reservation over the full circle, starting at `maxRadius + SUBRING_GAP`. When a full circle no longer fits them, a new halo ring opens `SUBRING_GAP` farther out. They keep their real glyph and are still keyboard reachable and listable. Because each satellite glyph radius is small, the halo costs little.

Satellites never share a radius with the sector labels: every label is placed outside `maxReach`, the farthest satellite glyph edge, as described under label placement above.

### Label placement

The renderer draws each sector label horizontally, centered on the sector mid-angle, at the sector's own `labelRadius`, with `textAnchor="middle"` and `dominantBaseline="middle"`. Because the text box is horizontal, its extent along the radius depends on the angle: a label at the top or bottom is shallow, a label at the left or right reaches inward by half its width.

The text box is estimated, not measured, so the layout stays deterministic and available before paint:

```
text       = ORG_BRANCH_LABELS[branch].toUpperCase()
halfW      = text.length * LABEL_CHAR_WIDTH / 2
halfH      = LABEL_FONT_SIZE / 2
support    = halfW * abs(cos(mid)) + halfH * abs(sin(mid))
labelRadius = maxReach + support + LABEL_CLEARANCE
```

`maxReach` is the largest `radius + glyphFootprint` over every laid-out node, satellites included, so labels clear both the packed sectors and the satellite halo. The `support` term is the half-extent of the box in the outward radial direction; subtracting it is what guarantees the whole box stays outside `maxReach`.

Constants:

| Constant | Value | Meaning |
| --- | --- | --- |
| `LABEL_FONT_SIZE` | 18 | label font size in canvas units |
| `LABEL_CHAR_WIDTH` | 11 | upper-bound advance per uppercase character |
| `LABEL_CLEARANCE` | 14 | radial gap between `maxReach` and the label box |
| `LABEL_MARGIN` | 32 | margin between the label boxes and the viewBox edge |

`web/lib/graph.test.mjs` checks the boxes against every glyph footprint and against each other using the same approximation, so a stale constant or a new long branch label fails the suite instead of overlapping on screen.

## 7. Node sizing and glyphs

Size depends on degree, not on importance, so the result is stable and explainable:

```
glyphRadius = clamp(5 + 1.1 * sqrt(degree), 5, 10)
selected glyphRadius = glyphRadius + 1.5
```

The base radius is larger than a raw pixel size because the whole layout is drawn in a viewBox of several hundred units and then fit to the canvas, so a glyph is roughly half these units on screen at zoom 1.

Each glyph has a footprint, the radius of the circle that contains it. The footprint drives packing. A circle glyph uses its radius; a rectangle glyph uses the distance from its center to a corner.

| Glyph | Footprint | Note |
| --- | --- | --- |
| `dot`, `diamond`, `triangle`, `shield` | `r` | circumscribed circle |
| `small-dot` | `0.68 * r` | drawn smaller |
| `hex` | `0.87 * r` | flat-to-flat vs point-to-point |
| `capsule` | `hypot(r, 0.6 * r)` | half width `r`, half height `0.6 * r` |
| `seat` | `hypot(r, 0.38 * r)` | long axis horizontal |

Glyph shape is chosen by subtype so type is readable without color. Sizing and shape are never the only signal: the floating label, the list alternative, and the legend all carry the subtype name as text.

| Glyph | Subtypes |
| --- | --- |
| `shield` | `ministerie`, `defensieonderdeel` |
| `hex` | `agentschap`, `uitvoeringsorganisatie`, `inspectie` |
| `capsule` | `zbo`, `rwt`, `toezichthouder` |
| `diamond` | `rechterlijke-instantie`, `hoge-college`, `kiesraad` |
| `triangle` | `adviescollege`, `planbureau`, `staatscommissie`, `raad-van-advies` |
| `seat` | `tweede-kamer`, `eerste-kamer`, `provinciale-staten`, `gemeenteraad`, `algemeen-bestuur-waterschap`, `eilandsraad`, `europees-parlement`, `staten-land` |
| `dot` | `gemeente`, `provincie`, `waterschap`, `veiligheidsregio`, `openbaar-lichaam-bes`, `samenwerkingsverband`, `koninkrijksorgaan`, `land-regering`, `kiesgerechtigden-nederland`, `kiezers-caribisch-nederland` |
| `small-dot` | `commissie` |

The hub uses the `dot` glyph at hub size, drawn with the accent ring.

## 8. Edge routing

Only organization-to-organization edges are drawn. Position-anchored relations are not drawn as organization edges.

Every edge is a quadratic Bezier:

```
mid  = ((x1+x2)/2, (y1+y2)/2)
d    = (x2-x1, y2-y1)
len  = hypot(d)
n    = normalize(-d.y, d.x)
side = sign(dot(mid, n)) || 1
ctrl = mid + n * side * len * BOW
path = M x1,y1 Q ctrl.x,ctrl.y x2,y2
```

`BOW = 0.14`. The sign is chosen from the midpoint so the curve bows away from the center in a consistent direction for a given pair. The result is a thin curved line, dim by default.

Edge states:

- default: `stroke: var(--color-line-strong)`, `stroke-width: 0.75`, opacity `0.35`
- neighbor of the focused node: `var(--color-accent-text)`, width `1`, opacity `0.7`
- selected path: `var(--color-accent)`, width `2`, opacity `1`
- hidden when either endpoint's branch is filtered out by the legend

## 9. Selection path

Selection resolves as follows:

1. Resolve the current organization route (`/organisaties/<slug>/`) to a node id by slug. A click or keyboard activation on a node sets the same selection.
2. Run a breadth-first search over the undirected organization edge graph from the selected node to the hub. Neighbors at each step are visited in `id` order, so the path is deterministic when several shortest paths exist. If a path exists, that is the accent path.
3. If no path exists (the organization is in a separate component, which is common in this dataset), fall back to the containment spine: walk `parent` from the node to its root, cycle-safe and capped at `MAX_DEPTH`. The accent path is the spine. The hub is still highlighted as the origin, and no synthetic edge is drawn, because drawing one would assert a relation the data does not contain.

The focused node and every node on the path carry the accent. A focused glyph grows by `SELECTED_GROWTH = 1.5`, sized into the ring step so it cannot collide. Direct neighbors of the focused node get the neighbor edge state and a raised label. The floating label shows the focused node's name, branch, and subtype; it links to the organization page.

## 10. Pan and zoom

- The SVG has a fixed `viewBox` and a single `<g>` transform `translate(tx ty) scale(s)`.
- Wheel zooms around the pointer, clamped to `[0.25, 8]`. Drag pans. Zoom buttons and `+` / `-` / `0` keys zoom and reset.
- The transform is applied without animation when `prefers-reduced-motion` is set, and with a short transition otherwise.
- Keyboard never depends on the pointer: arrow keys move the selection through the deterministic node order, `Enter` focuses, `Escape` clears, `+` and `-` zoom, `0` resets.

## 11. Performance budget

The target is a few thousand nodes on a mid-range laptop without jank at the top-level view.

- Layout is computed once per bundle with `useMemo`, in one pass over nodes and edges. Target under 30 ms for 1600 nodes and 1500 edges. The 18-09-2026 snapshot lays out 1570 nodes in about 4 ms. In version 3 the same snapshot reaches `maxRadius = 640`, largest label radius 776, and a viewBox half-size of 895.
- Edges are merged into a small number of `<path>` elements, one per edge state per edge type, so 1500 edges do not become 1500 DOM nodes. Target under 40 merged paths.
- Nodes render as `<g>` marks with one delegated click handler on the container. No per-node React event handler.
- The accessible list alternative renders its items only when opened, so a closed `<details>` costs nothing.
- `graph.json` budget: under 640 KB uncompressed, under 96 KB gzip. The build script prints the measured node count, edge count, and byte size on every run. The measured bundle for the 18-09-2026 snapshot is 1570 nodes, 1420 edges, 521.7 KiB uncompressed, and 47.0 KiB gzip. Values are recorded in the build script output when the bundle changes.
- Added client JavaScript budget for area O: under 30 KB gzip.

## 12. Power map layout (machtskaart)

The machtskaart is the second canvas view. It ranks the people most mentioned in the news window (`bundle.powerMap.people`) and draws each as a portrait with a three-line label.

- Seed positions: rank 1 sits at the origin; rank `i` sits at angle `i * 2.399963229728653` and radius `40 + 26 * sqrt(i)`, the same golden-angle spiral the view always used.
- Each card is a portrait circle of radius 26 with three label lines under it: name (12px, baseline y 40), party and function (10px, y 55), mention count (10px, y 68).
- Text is estimated at 7 units per character for the name and 5.8 for the other lines. The name is capped at 20 characters and the party/function line at 24, both with an ellipsis. The full text stays available in the SVG tooltip and the screen-reader list. The card half-width is the largest estimate, with a floor of the portrait radius, so a card box spans `x - halfWidth .. x + halfWidth` and `y - 26 .. y + 74`.
- Collision resolution treats each card as a circle around its box centre (`y + 24`) with radius `hypot(halfWidth, 50)`, which circumscribes the box, plus a 2 unit gap. Overlapping pairs are pushed apart along the centre-to-centre vector; rank 1 is pinned and never moves. 240 passes alternate pushing with a 5 percent pull back to the seed, then 120 pure push passes. Circumscribed circles mean that when the algorithm finishes, no two boxes can overlap, while the cloud keeps its spiral shape.
- The viewBox covers the layout bounds plus 24 units on every side, plus 56 extra units at the top for the overlay header.
- Constants live in `web/lib/power-map-layout.ts`. `web/lib/power-map-layout.test.mjs` guards zero box overlap, rank 1 at the origin, bounds containment, and determinism on the real bundle.

## 13. Reproducibility checklist

- No `Math.random`, no `Date.now`, no locale-sensitive sort. Use `localeCompare` only with `"nl"` fixed, or plain `<` on ids. The implementation uses fixed string comparison on `name` then `id`.
- The bundle carries `schema` and `layout` version strings. A change to constants or order bumps the layout string and is noted here first.
- `web/lib/graph.test.mjs` guards the invariants on the real bundle: every non-hub node is laid out, no two footprints overlap, no glyph enters the hub clearance band, every label box clears every glyph and every other label box, labels and glyphs stay inside the viewBox, and the layout is deterministic. A constant change that breaks packing fails the test suite.
