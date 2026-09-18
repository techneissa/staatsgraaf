# Graph layout specification (nl-sectors-v1)

This is the reproducible layout for the NL Overheid Graph canvas. It is written before the implementation so the web client and the later Swift client can reproduce the same positions from the same input. The implementation lives in `web/lib/graph.ts`. The precomputed input lives in `web/public/graph.json`, built by `web/scripts/build-graph.mjs`.

The layout is deterministic. The same dataset always produces the same angle and radius for the same node. There is no physics simulation, no randomness, and no time-dependent seed. Sorting never depends on object key order: ties break on `name`, then `id`.

## 1. Input and output

Input is a graph bundle with:

- `nodes`: every organization, each with `id`, `slug`, `name`, `type`, `subtype`, `branch`, `level`, `degree`, `parent`.
- `edges`: every organization-to-organization relation, each with `id`, `from`, `to`, `type`.
- `hub`: the constituency organization that sits at the center (`org:kiesgerechtigden-nederland`).

Output is a laid-out graph: every node has `angle` (radians), `radius` (canvas units), `x`, `y`, and a `glyph` class. Every edge is a quadratic Bezier path. The view is a single fixed `viewBox` centered on the origin.

Canvas units are abstract. The renderer maps them to pixels with pan and zoom. A constant unit is roughly one CSS pixel at zoom 1 on a 1000-unit-wide viewport.

## 2. Coordinate system

- Origin `(0, 0)` is the hub center.
- Angle `0` points right (positive x). Angles increase clockwise on screen because SVG y grows downward.
- The first sector starts at `-90deg` (top) and sectors run clockwise.
- `x = cos(angle) * radius`, `y = sin(angle) * radius`.
- The default viewBox is `[-R, -R, 2R, 2R]` where `R = maxRadius + 120` padding.

## 3. Sectors (branch)

Sectors correspond to the organization `branch` field. The hub is removed from sectoring and drawn at the center. A branch with no organizations gets no sector.

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

A branch's span is proportional to `sqrt(count)`, not `count`. This keeps a branch with a thousand small bodies (the municipalities) from swallowing the circle while still giving it the largest share.

Constants:

| Constant | Value | Meaning |
| --- | --- | --- |
| `SECTOR_GUTTER_DEG` | 4 | gap between sectors |
| `SUBSECTOR_GUTTER_DEG` | 2 | gap between subtypes inside a sector |

Computation:

```
weights = sqrt(count(sector)) for each sector
usable = 360deg - SECTOR_GUTTER_DEG * sectorCount - SUBSECTOR_GUTTER_DEG * subsectorCount
span(sector) = usable * weight(sector) / sum(weights)
```

Sectors are laid end to end clockwise from `-90deg`, each separated by `SECTOR_GUTTER_DEG`.

## 4. Sub-sectors (subtype)

Inside a sector, nodes are grouped by `subtype`. Sub-sectors use the same `sqrt` weighting over the sector's span minus the sub-sector gutters. Sub-sectors run clockwise in the fixed order given by the `SUB_SECTOR_ORDER` table in `graph.ts`, with any subtype not in the table appended in name order so a new subtype cannot silently drop nodes.

## 5. Rings and angular slots

Within a sub-sector, nodes are sorted by `depth` ascending, then `name`, then `id`. Depth is the length of the `parent` chain within the dataset, capped at `MAX_DEPTH = 6`. This is the parent-derived part of the layout: a child is always taken after its parent and lands on the same ring or an outer one.

Nodes fill concentric sub-rings inside the sub-sector:

```
baseRadius = HUB_RADIUS + minDepth(subSector) * RING_GAP
ringIndex  = 0
i          = 0
while i < nodes.length:
  radius = baseRadius + ringIndex * SUBRING_GAP
  capacity = clamp(floor(subSpan / (MIN_SPACING / radius)), 1, MAX_PER_RING)
  take = min(capacity, nodes.length - i)
  ringNodes = nodes[i .. i+take)
  for j in 0..take-1:
    angle = subStart + SUBSUBSECTOR_GUTTER/2 + ((j + 0.5) / take) * (subSpan - gutter)
  i += take
  ringIndex += 1
```

`capacity` is the number of glyphs that fit on a ring at that radius without the arc spacing dropping below `MIN_SPACING`. Because it grows with radius, outer rings hold more nodes, which is what makes a dense wedge read as a fanned spiral rather than a single overplotted ring. The last node taken sets `maxRadius`.

Constants:

| Constant | Value | Meaning |
| --- | --- | --- |
| `HUB_RADIUS` | 96 | radius of the center hub glyph |
| `RING_GAP` | 40 | radial step per depth level |
| `SUBRING_GAP` | 26 | radial step between packed sub-rings |
| `MIN_SPACING` | 7 | minimum arc distance between two glyph centers |
| `MAX_PER_RING` | 96 | cap so one huge sub-ring stays drawable |
| `MAX_DEPTH` | 6 | cap on the parent chain length |

## 6. Isolated nodes and satellites

A node with organization-to-organization `degree` of zero cannot be placed by relation. These are satellites, matching the reference's use of the term for small bodies outside the main radial layout. Satellites are sorted by `branch`, then `name`, then `id`, and placed on one outer halo ring just outside `maxRadius` of the sector layout, evenly spaced across the full circle at `satelliteRadius = sectorMaxRadius + SUBRING_GAP`. They keep their real glyph and are still keyboard reachable and listable.

## 7. Node sizing and glyphs

Size depends on degree, not on importance, so the result is stable and explainable:

```
glyphRadius = clamp(5 + 1.1 * sqrt(degree), 5, 11)
selected glyphRadius = glyphRadius + 2
```

The base radius is larger than a raw pixel size because the whole layout is drawn in a viewBox of several hundred units and then fit to the canvas, so a glyph is roughly half these units on screen at zoom 1.

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

The focused node and every node on the path carry the accent. Direct neighbors of the focused node get the neighbor edge state and a raised label. The floating label shows the focused node's name, branch, and subtype; it links to the organization page.

## 10. Pan and zoom

- The SVG has a fixed `viewBox` and a single `<g>` transform `translate(tx ty) scale(s)`.
- Wheel zooms around the pointer, clamped to `[0.25, 8]`. Drag pans. Zoom buttons and `+` / `-` / `0` keys zoom and reset.
- The transform is applied without animation when `prefers-reduced-motion` is set, and with a short transition otherwise.
- Keyboard never depends on the pointer: arrow keys move the selection through the deterministic node order, `Enter` focuses, `Escape` clears, `+` and `-` zoom, `0` resets.

## 11. Performance budget

The target is a few thousand nodes on a mid-range laptop without jank at the top-level view.

- Layout is computed once per bundle with `useMemo`, in one pass over nodes and edges. Target under 30 ms for 1600 nodes and 1500 edges.
- Edges are merged into a small number of `<path>` elements, one per edge state per edge type, so 1500 edges do not become 1500 DOM nodes. Target under 40 merged paths.
- Nodes render as `<g>` marks with one delegated click handler on the container. No per-node React event handler.
- The accessible list alternative renders its items only when opened, so a closed `<details>` costs nothing.
- `graph.json` budget: under 640 KB uncompressed, under 96 KB gzip. The build script prints the measured node count, edge count, and byte size on every run. The measured bundle for the 2026-09-18 snapshot is 1570 nodes, 1420 edges, 521.7 KiB uncompressed, and 47.0 KiB gzip. Values are recorded in the build script output when the bundle changes.
- Added client JavaScript budget for area O: under 30 KB gzip.

## 12. Reproducibility checklist

- No `Math.random`, no `Date.now`, no locale-sensitive sort. Use `localeCompare` only with `"nl"` fixed, or plain `<` on ids. The implementation uses fixed string comparison on `name` then `id`.
- The bundle carries `schema` and `layout` version strings. A change to constants or order bumps the layout string and is noted here first.
