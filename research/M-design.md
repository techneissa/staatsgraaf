# M. Design and interaction research

What we learned about the design of the reference product (the CivLab Gov Graph) and which design decisions Staatsgraaf took from it. This note describes observable behaviour and our own requirements. It holds no markup, class names, stylesheet values, colour tables, SVG data or copy of the reference, and a builder does not need the reference open to use it. Staatsgraaf learns from the reference's information architecture; it does not reproduce its expression (`docs/adr/0026-reference-product-and-credit.md`).

Two things to hold in mind while reading.

- This is workstream M (design research). It writes only this file. It does not touch `web/`. The later build area M (homepage) is a different owner; the letter collision is intentional and the paths are disjoint.
- Our source of truth for design values is `shared/tokens.json` and the generated `web/app/generated/tokens.css`. This note never carries a value that belongs there. Never hand-write a colour into a component.

## Scope covered

- The reference sites as public pages: the United States federal graph, the San Francisco graph, and an earlier San Francisco version.
- The page shell, the breakpoints and the order of the columns.
- Typography, colour roles, spacing, radius, borders and elevation, in prose.
- The component inventory, mapped to the area names in `docs/06-build-plan.md` section 5.
- The glyph and relation vocabulary.
- Motion, the power map, and one rendering bug to avoid.

Out of scope: the graph layout algorithm (`web/lib/graph-layout.md`, `docs/adr/0015-graph-rebuild.md`), the data model (`docs/04-data-model.md`), and reader-facing Dutch copy (`docs/09-content-and-ai-policy.md`).

## Sources observed

Public pages, viewed in a browser on 18-09-2026. Working captures were kept on the maintainer's disk and are not part of the public repository.

| Page | What it showed |
| --- | --- |
| https://graph.civlab.org/us | The shell of the US graph, its components and its default dark theme |
| https://sfgov.civlab.org/sf | The San Francisco home page, fiscal tiles, featured people, trending topics |
| One United States department page | An entity page: title, links, officeholder card, tabs |
| One San Francisco commission page | An entity page with an extra budget tab |
| One San Francisco topic page | A topic page with a news tab and a responsibility tab |
| https://v2.sfgov.civlab.org | The earlier version, for contrast only |
| The studio case studies and the CivLab blog | Design intent, mobile-first framing, how the product evolved |

The stack is publicly described as Next.js, Tailwind CSS, Radix UI and D3 for part of the graph. We read this to know what not to over-build. Our stack is our own choice (`docs/06-build-plan.md` section 3).

## Design specification

### 1. Shell and layout

What the reference does. A full-viewport split: a scrolling editorial column on one side and a canvas that never scrolls on the other. The canvas stays mounted while the reader moves between pages. The editorial column is about two fifths of the width on wide screens. On narrow screens the canvas sits above the column.

What Staatsgraaf requires.

- Three columns from the `lg` breakpoint (1024 px): the page, the canvas, and a details panel for whatever is picked. Each side column can be folded and resized, and the choice is remembered (`web/components/panels/workspace.tsx`, `docs/adr/0018-shared-selection-and-side-panels.md`).
- Below `lg` one stack. The canvas is a band above the page. On the home page it is the page; on other pages it folds to one toolbar row until the reader opens it (`web/components/canvas-frame.tsx`).
- Breakpoints are the Tailwind defaults. Components inside a column use container queries, not viewport queries (`AGENTS.md` rule 13).
- Nothing scrolls sideways at any width from 320 px.

### 2. Typography

The reference uses one sans family for everything and small monospace labels for meta text, numbers and timestamps, with a handful of named text roles. Staatsgraaf uses the system sans stack and the system mono stack from `shared/tokens.json`, so no font is downloaded and no font licence applies. Our scale is the seven-step ramp in the same file, with `leading` and `tracking` tokens for line height and letter spacing.

### 3. Colour roles

The reference ships a warm off-white light theme and a near-black dark theme, opens in dark, and uses one accent family plus a colour per branch. Staatsgraaf keeps the roles and uses its own values.

- Roles in `shared/tokens.json`: canvas, surface, raised surface, inset surface, line, strong line, ink, muted ink, faint ink, accent, accent text, accent soft, accent ink, focus, overlay, and one colour per sector.
- Dark is the default theme (`meta.defaultTheme`), light is opt-in, and the choice is remembered.
- The accent is Rijkshuisstijl oranje, with separate text and focus variants per theme so contrast holds (`bun run check:contrast`).
- Colour is never the only signal. Every kind has a shape and a text label.

### 4. Spacing, radius, border, elevation

The reference is mostly flat: cards are a surface colour with a hairline border, and shadows appear only on floating panels such as the legend, menus and detail pop-ups. Staatsgraaf does the same. It uses the `space`, `radius` (4, 6, 10, 14 px and pill) and `border` tokens, a global `:focus-visible` outline instead of per-control rings, and shadows only on overlays.

### 5. Component inventory

Each entry names the component by its area in `docs/06-build-plan.md` section 5 and says what it shows.

App shell (area L).

- Top bar: brand, the section links, search, history buttons, theme toggle and language toggle. Narrow screens collapse the sections into a menu (`web/components/top-bar.tsx`).
- Brand lockup: our own hub mark, the name, and a scope label (`web/components/brand-lockup.tsx`).
- History controls: back and forward buttons, disabled when there is no history.
- Theme toggle and language toggle.

Canvas frame (area L, behaviour by area O).

- A persistent canvas, kept mounted across navigation.
- A view toggle between the graph and the connections view (`web/components/canvas-controls.tsx`).
- A legend and filters dropdown: entity shapes, relation line styles, and branch checkboxes that hide and show a branch.
- A search overlay: one accessible combobox, a dimmed page behind it, results grouped under a heading, each result a link (`web/components/search/search-overlay.tsx`). The reference ships a second input for phones; we ship one.

Cards (area L, data from areas M, N and R).

- News card: a short summary with inline entity links and numbered source citations, clamped to a few lines with a toggle.
- Change card: a dated entry with a kind badge, a source link, the position, and an out row and an in row. Entries are grouped by day on a rail.
- Overview card: counts by type and by branch, with a footnote.
- Entity card: portrait or glyph, name, subtitle.
- Portrait strip: small overlapping circular portraits for the people in the news.
- Topic card and budget tile: a figure, its label, and a year-on-year change with an arrow and words.

Small parts.

- Kind badge: a small pill with text, neutral or accent toned (`web/components/kind-badge.tsx`), so the kind is always readable as words.
- Source link with an outbound arrow, opening in a new tab with `rel="noopener noreferrer"`.
- Date stamp in monospace. The "Laatst bijgewerkt" stamp is ours; the reference has none.
- Breadcrumb on pages (`web/components/breadcrumb.tsx`).
- Entity chip: a link in a small pill, used for "part of" rows and connection lists.

Empty, loading and error states.

- Search with no result says so, in Dutch and in English.
- Pages are statically generated, so loading shows static content or a skeleton, not a progress bar.
- The not-found page offers the home page and the sections (`web/app/not-found.tsx`).

### 6. Glyphs and relation vocabulary

The reference draws one distinct shape per node type and one line style per relation type, as inline SVG that follows the text colour. Staatsgraaf keeps the idea and draws its own shapes.

- Node shapes are generated from parameters in `web/components/graph/glyph.ts`: dot, small dot, diamond, triangle, shield, hexagon, capsule, square, pentagon, octagon, inverted triangle, star and a seat mark. Colour comes from the branch (sector) tokens.
- Relation types are a shared data vocabulary: appoints, advises, dept_head, oversees, elects, office, confirms, ex_officio and administers appear in both products, and our schema adds more (`schema/v1/relation.schema.json`). Our lines are all solid and differ by colour family, width and opacity (`web/components/graph/edge-styles.ts`), after an owner request on 25-09-2026 because dashes made the graph hard to read.
- A small shape per entity kind marks links in prose and lists: a disc for a person, a square for an organisation, a diamond for a position, a triangle for a topic and a pin for a place, filled with the kind colour (`web/components/kind-glyph.tsx`).
- Icons come from the lucide set and morphicons (`web/components/icons`).

### 7. Motion

The reference moves with short fades and slides on hover and a slower tween when the graph redraws. It has no reduced-motion handling. Staatsgraaf sets durations in `shared/tokens.json` (fast, base, slow), moves the graph with springs that can be interrupted, and honours `prefers-reduced-motion` globally (`web/app/globals.css`).

### 8. Graph canvas and the people view

Graph canvas, as observed. The layout is radial and deterministic, not a physics simulation. Nodes are small shapes on rings, edges are thin and dim until a node is picked, and picking a node draws its path to the hub. The canvas supports pan and zoom, and it re-centres on navigation instead of remounting.

Staatsgraaf's canvas is its own construction (`docs/13-graph-rebuild-plan.md`): tiers by branch with a seat chart for the two Kamers, plus a wheel form.

The people view. The reference shows the people named most in recent news as portraits scaled by how often they are named, joined by faint lines, with a detail panel on hover and a bottom sheet on phones. Staatsgraaf's counterpart is the connections view: the most connected people by role, a hierarchy or a network of ties, and a list of the ties with their reasons (`web/components/power/connections-view.tsx`). It presents people as ranked lists and diagrams, not as portraits scaled by how often they are named.

### 9. The SVG size bug to avoid

The live reference logs repeated console errors because some inline SVGs carry a width or height of `auto`, which is not a valid SVG length. What we do instead.

- Every inline SVG has a `viewBox` and either explicit `width` and `height` attributes or CSS sizing.
- Never `width="auto"` or `height="auto"` on an `<svg>`. A search of `web/components` and `web/app` finds none.
- Where an icon must scale with text, size it in CSS on a wrapper.

## Decisions

1. Design tokens come from `shared/tokens.json`. Nothing in this note overrides them.
2. Accent. Rijkshuisstijl oranje, the Dutch government's own identity colour, with contrast-safe text and focus variants per theme.
3. Type. System sans and mono stacks, no web font, no font licence dependency.
4. Radius. Our own scale: 4, 6, 10 and 14 px and a pill.
5. Dark is the default theme, light is opt-in.
6. Graph renderer. Inline SVG with our own deterministic layout and spring motion; no graph or d3 library (`docs/adr/0015-graph-rebuild.md`).
7. Motion. Our durations, and reduced motion honoured everywhere.
8. Glyphs. One shape per kind, generated from parameters, coloured by branch with a text label beside it.
9. Mobile order. The canvas sits above the page on narrow screens, folded to one row on pages other than the home page.
10. One search input, a proper combobox (`docs/12-discovery-privacy-accessibility-security.md` Part 3).
11. Flat elevation. Hairline borders, shadows only on overlays.

## Gaps

- The reference does not document its breakpoints, spacing or motion. What this note says about them is observed behaviour, so anything it does not mention is unknown, not zero.
- No accessible-name or ARIA audit of the reference was done. Our requirements come from `docs/12` Part 3, not from the reference.
- The case studies and blog posts were read for intent only; their media were not analysed.
- The earlier San Francisco version has a different visual language. It is recorded for history only and is not a model.

## Open questions

1. Icon size tokens. `shared/tokens.json` has no icon-size scale. Add one (for example 12, 14, 16, 20, 24 and 34 px) so icons stop being ad hoc and the SVG bug cannot return.
2. Topic chip emphasis. Decide whether trending topics get a filled chip, and check its contrast in both themes against the accent.
