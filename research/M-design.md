# M. Design and interaction research

A reusable design specification of the CivLab Gov Graph reference, refined beyond `docs/02-reference-system-spec.md`. The goal is that a frontend implementer can build the NL Overheid Graph design system from this document alone, without opening the reference.

Two things to hold in mind while reading.

- This is workstream M (design research). It writes only this file and raw snapshots under `research/raw/M/`. It does not touch `web/`. The later build area M (homepage) is a different owner; the letter collision is intentional and the paths are disjoint.
- The reference values recorded here are provenance, not law. Our frozen source of truth is `shared/tokens.json`, and the generated `web/app/generated/tokens.css`. Where the two disagree, ours wins and this document says so in Decisions. Never hand-write a reference hex into a component.

## Scope covered

- The live reference sites: the US federal graph, the San Francisco graph (v3), and the earlier San Francisco v2.
- The layout grid, breakpoints, and the two-column shell.
- The type scale and typography families.
- Color tokens for light and dark, including surface, text, border, branch, party, and node-type colors.
- Spacing, radius, border weight, and elevation.
- The component inventory, mapped to the names already used in `docs/06-build-plan.md` section 5.
- The icon and glyph set, including one shape per node type and per edge type.
- Motion durations, easings, and which interactions animate.
- The SVG width and height bug to avoid.

Out of scope: the graph layout algorithm (that is build area O and `shared/graph-layout.md`), the data model (`docs/04-data-model.md`), and reader-facing Dutch copy (`docs/09-content-and-ai-policy.md`).

## Sources fetched with dates

All fetched on 18-09-2026. Raw snapshots are in `research/raw/M/`. Prose and code were read, not copied.

| Source | What it gave | Snapshot |
| --- | --- | --- |
| https://graph.civlab.org/us | US shell DOM, all component markup, the stylesheet, inline SVG glyph paths, the default dark theme script | `us.html`, `us-dom.html`, `us.css`, `app.js`, `chunk546.js`, `gov-page.js` |
| https://sfgov.civlab.org/sf | SF homepage DOM, fiscal tiles, People in Focus, Trending Topics | `sf.html`, `sf-dom.html` |
| https://graph.civlab.org/us/departments/us-department-of-justice | Entity page hero, pills, officeholder card, Radix tabs | `entity-us.html`, `entity-us-dom.html` |
| https://sfgov.civlab.org/sf/departments/ccsf-ethics-commission-2 | Entity page with the extra budget tab | `entity-sf.html`, `entity-sf-dom.html` |
| https://sfgov.civlab.org/sf/topics/housing | Topic page, News and Who is Responsible tabs | `topic-sf.html`, `topic-sf-dom.html` |
| https://v2.sfgov.civlab.org | The earlier v2 visual language, for historical contrast only | `v2.html`, `v2.css` |
| https://xxix.co/work/civlab | The studio case study: services, design intent, mobile-first framing | `xxix.html` |
| https://www.sanctuary.computer/work/civlab | The engineering studio case study: stack list, accessibility framing | `sanctuary.html` |
| https://civlab.substack.com/feed (RSS feed) | The CivLab blog posts with their full text: v1, v2, v3 rebuild notes | `feed.xml`, `archive.json`, `sitemap.xml`, `substack.html` |
| https://www.civlab.org/ | The org landing page: the projects list and the Substack pointer | `civlab-home.html` |

Stack facts confirmed by these sources: Next.js Pages Router, Tailwind CSS, Radix UI, and D3 for the graph (the Sanctuary case study lists "Next.js, D3, Tailwind CSS, Supabase, Vercel"; `app.js` contains `selectAll`, `attrTween`, and `transition().duration(750)`). This corrects the tentative "no d3" note in `docs/02-reference-system-spec.md` section 5.

## Design specification

### 1. Layout grid and the shell

The shell is a full-viewport two-column split. The page is `height: 100%` on `html`, `body`, and `#__next`. The left editorial column scrolls independently; the right canvas is sticky and never scrolls.

Outer grid, observed on both the homepage and entity pages:

- Base: `grid-cols-1`. One column, canvas first, editorial column second.
- At `lg` (1024px) and up: `grid-cols-[minmax(400px,40%)_1fr]`. Left column is at least 400px and at most 40% of the viewport; the canvas takes the rest. At 1280px wide this puts the left column at 512px, matching the observation in `docs/02-reference-system-spec.md` section 2.
- Left column: `order-2 lg:order-1`, with inner `id="page-panel"` and padding `pt-4 lg:pl-4 lg:pb-5`.
- Canvas column: `order-1 lg:order-2` with `relative`; inner wrapper `lg:p-4 sticky top-0 lg:h-screen flex flex-col justify-between`. So on mobile the canvas is on top and the editorial column below it. This slightly differs from `docs/12` Part 5, which says editorial first on mobile; see Decisions.
- Card vertical rhythm: cards stack with `mt-3` (12px) between them.

Breakpoints are Tailwind defaults: `sm` 640px, `md` 768px, `lg` 1024px, `xl` 1280px, `2xl` 1536px. There is also a `max-[360px]` guard for very narrow phones (the brand glyph is hidden below 360px).

The canvas holder keeps a fixed aspect ratio rather than a fixed height: `aspect-[10/11]` by default, `aspect-[16/15]` from `sm` up, and `lg:aspect-auto` with the canvas filling the sticky column height.

The content gutter is a single token, `--margin`: 16px below 48rem (768px), 24px from 48rem up. Cards use `px-margin pt-6 pb-7` (gutter horizontal, 24px top, 28px bottom).

### 2. Type scale

One sans family throughout: Inter, loaded as a variable font (weight 100 to 900) with a metrically adjusted Arial fallback (`size-adjust: 107.12%`). Monospace is used only for small meta labels, numbers, and timestamps.

The reference uses named type roles, not raw sizes. Reproduce these roles; they are the scale.

| Role | Size | Line height | Weight | Tracking | Used for |
| --- | --- | --- | --- | --- | --- |
| type-header-1 | 30px | 110% | 600 | normal | Entity page h1 |
| type-header-2 | 24px | 120% | 600 | normal | Section or page title |
| type-header-3 | 20px | 120% | 500 | normal | Large stat value (budget tiles) |
| type-header-4 | 16px | 120% | 600 | normal | Card heading, stat value, entity name |
| type-header-5 | 14px | 120% | 600 | normal | Tab label |
| type-paragraph-1 | 24px | 150% | 400 | -2% | Lead paragraph |
| type-paragraph-2 | 16px | 140% | 400 | -1% | Body copy, news summary |
| type-paragraph-3 | 14px | 130% | 400 | normal | Secondary body, pill links |
| type-paragraph-4 | 12px | 145% | 400 | 1% | Caption |
| type-ui-1 | 16px | inherited | 500 | normal | Overview row label and count |
| type-ui-2 | 14px | inherited | 500 | normal | Control label, change position |
| type-ui-3 | 12px | 130% | 500 | normal | Small control label, delta line |
| type-ui-4 | 10px | inherited | 400 | normal | Micro label, often uppercase |

Additional observed sizes, all monospace: 8.5px (histogram bubble), 9px (stat tile label and sublabel, timeline axis), 9.5px (change source link), 10px (citation superscript), 10.5px, 11px, 12px, 13px, 13.5px, 14px, 15px, 26px, 34px. Wide tracking is used on uppercase mono labels: `tracking-[0.1em]` for stat labels, `tracking-[0.13em]` for kind badges, `letter-spacing: 3px` for the power map heading. The uppercase micro style appears as `font-mono text-[9px] tracking-[0.1em] text-grey-3 uppercase`.

Our token map: `shared/tokens.json` `font.sans` is the system stack, not Inter. Our `text.*` scale is a generic 0.75 to 1.875rem ramp. Map header-1 to 3xl, header-2 to 2xl, header-3 to xl, header-4 to base, header-5 to sm, paragraph-2 to base, paragraph-3 to sm, paragraph-4/ui-3 to xs, ui-4 to a 10px extension. See Decisions.

### 3. Color tokens

The reference ships a light default in `:root` and a dark override in `:root[data-theme=dark]`. Dark is the product default; an inline script sets `data-theme="dark"` before paint unless `localStorage['civlab-theme']` is `light`. Both graphs share one stylesheet.

Core palette. Left is light, right is dark.

| Token | Light | Dark | Role |
| --- | --- | --- | --- |
| `--background` | #eceae4 | #161310 | Page and canvas background |
| `--white` | #ffffff | #211e1a | Card surface, raised panel |
| `--grey-lighter` | #f9f8f7 | #262220 | Alternate surface (change card) |
| `--grey-light` | #f4f2ef | #2b2723 | Hover fill, secondary surface |
| `--grey-mid` | #dddbd5 | #3a342e | Inactive tab fill, input fill |
| `--outline` | #edece9 | #2e2925 | Hairline border |
| `--grey-1` (foreground) | #1c1917 | #ede9e2 | Primary text |
| `--grey-2` | #383633 | #cfc9c0 | Secondary text |
| `--grey-3` | #57534e | #a29b90 | Tertiary text, labels |
| `--grey-4` | #98938e | #7e776c | Faint text, source stamp |
| `--brand` | #fd8055 | #fd8055 | Power map heat ring |
| `--orange` | #f27836 | #f27836 | Graph hub, constituency |
| `--blue` | #084ab4 | #85a8ee | Links, topic chips |
| `--blue-dim` | #e8f0fe | #212b3d | Topic chip fill |
| `--red` | #f2686f | #f2686f | Brand glyph, top progress bar |
| `--purple` | #826dc8 | #9c8bdb | Positive delta arrow |
| `--pink` | #f25ebf | #f25ebf | Graph accent family |
| `--orchid` | #c15ef2 | #c15ef2 | Graph accent family |

Semantic branch and party colors, light and dark. These are the link and glyph accents in the editorial column.

| Token | Light | Dark |
| --- | --- | --- |
| `--branch-legislative` | #e4573d | #dd4e35 |
| `--branch-executive` | #7a7ad0 | #8484dc |
| `--branch-judicial` | #ac7f14 | #c89c15 |
| `--party-democrat` | #084ab4 | #6d97e8 |
| `--party-republican` | #d1343b | #e0555c |
| `--party-independent` | #826dc8 | #9c8bdb |

Graph node-type colors. The shipped rule is: if a node carries a `sector`, the sector's branch color is used, otherwise the type color. A `dept_head` node inherits the branch color of the body it heads. The US sector layout therefore renders in branch colors; a layout without sectors falls back to these type colors. These are stable in both themes.

| Node type | Hex |
| --- | --- |
| elected | #F2686F |
| commission | #C15EF2 |
| department | #826DC8 |
| dept_head | #826DC8 |
| advisory | #F25EEF |
| constituency | #F27836 |

Graph surface themes, held in the graph code rather than the stylesheet.

| Graph token | Light | Dark |
| --- | --- | --- |
| canvas | #ECEAE4 | #161310 |
| nodeFill | #FFFFFF | #272220 |
| blendBase | #FFFFFF | #221E1A |
| seam | #C9C4BA | #3D362E |
| band | #D8D8D8 | #413A31 |
| inkMuted | #A3A3A3 | #8A8378 |
| inkGap | #8F8A80 | #9B9285 |
| tooltipBg | #FFFFFF | #2B2620 |
| accentInk | #FFFFFF | #1C1814 |

Graph fill alphas: territory 0.07 light, 0.13 dark; connected path 0.35 light, 0.55 dark; idle 0.26 dark only; band 0.15 light, 0.20 dark.

Legend panel palette, light then dark: ink #6F6F7A / #9B97A2; muted #8A8A95 / #84808A; text #1c1917 / #EDE9E2; hover #f4f2ef / #2B2723; panel #FFFFFF / #211E1A; swatch fill #FFFFFF / #2B2723; shadow `0 4px 18px rgba(28,25,23,0.12)` / `0 4px 18px rgba(0,0,0,0.45)`.

Our token map: `shared/tokens.json` already freezes canvas, surface, surface-raised, surface-inset, line, line-strong, ink, ink-muted, ink-faint, accent, accent-text, accent-soft, accent-ink, focus, and overlay for both themes. Our accent is Rijkshuisstijl oranje #E17000 with separate light and dark text and focus variants for contrast. The reference blue link color has no equivalent in our tokens; see Decisions and Open questions.

### 4. Spacing, radius, border, elevation

- Spacing base is Tailwind `--spacing: 0.25rem` (4px), so `gap-2` is 8px, `p-3` is 12px, `p-4` is 16px, `mt-7` is 28px. The one custom spacing token is `--margin` (16px, 24px from 768px).
- Radius: `--radius-xs` 2px, `--radius-md` 6px, `--radius-lg` 8px, `--radius-xl` 12px, `--radius-2xl` 16px, plus `rounded-full`. Arbitrary values observed: 10px on the out and in container, 14px on the change card.
- Border weight: 1px hairline (`border`), 1.5px for dots and bubbles, 2px for focus rings (`ring-2`). The in-prose entity glyph uses `border-[1.5px]` only in timeline dots, not on glyphs.
- Elevation: the system is mostly flat. Cards are a surface color on the page background with a hairline border and no shadow. Shadows appear only on floating overlays: the legend panel (see above), the change card at `0 1px 2px rgba(0,0,0,0.04)` light and an inset highlight `inset 0 1px 0 rgba(255,255,255,0.03)` dark, the power map detail panel `0 8px 32px rgba(0,0,0,0.25)`, the power map bottom sheet `0 -8px 32px rgba(0,0,0,0.25)`, and Tailwind `shadow-sm`/`shadow-lg` on menus.
- Focus: `outline: 2px` is not used; the reference uses Tailwind `focus:ring-2 focus:ring-grey-4` on controls. Our tokens define `color.focus` and a global `:focus-visible` outline, which is an improvement.

Our token map: `space.*` (0.25 to 6rem) covers the reference scale; `radius.sm` 6px, `radius.md` 10px, `radius.lg` 14px, `radius.pill`; `border.hairline` 1px and `border.strong` 2px. Use our radii rather than the reference 12px and 16px. See Decisions.

### 5. Component inventory

Each entry names the component as `docs/06-build-plan.md` section 5 already names it, then the observed construction. Group names match that section.

App shell (build area L).

- Two-column spine. As in section 1. Left column `#page-panel` scrolls, canvas sticky.
- Top bar. Brand lockup `bg-white rounded-xl px-2.5 md:px-4 lg:px-6 py-2 min-h-[44px] flex items-center`. Brand glyph 20x20, viewBox 0 0 34 34, a starburst filled `currentColor` in `--red`. Wordmark: bold "CivLab" link, a slash separator, a Radix dropdown trigger labelled "Switch government graph" showing the current scope, and a breadcrumb tail ("Executive") on entity pages. Chevron is 10px wide, `text-grey-3`.
- Theme toggle. Container `bg-white rounded-xl overflow-hidden flex`; a 44x44 button with a 15x15 moon icon (viewBox 0 0 16 16, stroke currentColor 1.25). One button per theme, `aria-label="Switch to dark mode"` and `title="Dark mode"`.
- Back and forward controls. Container `bg-white rounded-xl overflow-hidden flex`; two 44x44 buttons, each with a 15px tall chevron (viewBox 0 0 9 16), one mirrored. Disabled when there is no history.

Canvas frame (build area L, behaviour by area O).

- Persistent canvas. `gov-graph-container data-viz-container` inside a 100 percent holder; the SVG is `gov-graph data-viz` at 100 percent width and height. It stays mounted across navigation.
- Graph / Power map toggle. Bottom right, `bg-white rounded-xl overflow-hidden`, two buttons `px-4 h-9 type-ui-2`; active is `bg-grey-mid text-grey-4`, inactive is `bg-white`. Mobile uses a combobox trigger `h-[44px]` instead.
- Legend control. Bottom left, a `gg-legend-trigger` button `height:36px` desktop and 44px mobile, `background:#FFFFFF`, `border-radius:12px`, label at 14px. A dropdown panel lists entity swatches and edge swatches in two columns, each row with 8px radius, 14px label, and a 10px uppercase column heading with 1.5px letter spacing. Rows toggle a kind on and off; off rows drop to 0.35 opacity.
- Search overlay. Trigger is a 44x44 white button with a 17x17 magnifier (viewBox 0 0 17 17). On open, a scrim `fixed inset-0 bg-background/25 backdrop-blur-xs` at z-40, and a results panel `bg-white rounded-xl px-4 max-h-[calc(100dvh-210px)] overflow-y-auto` with `id="search-results"`, headed Entities. The empty state is `type-header-4` plus `type-paragraph-3 text-grey-3 max-w-[280px]`. The reference ships two inputs (desktop and mobile); we ship one accessible combobox, per `docs/12` Part 3.

Cards (build area L, data by areas M, N, R).

- News card. Card shell `bg-white rounded-xl px-margin pt-6 pb-7`. Heading `type-header-4`. Body `type-paragraph-2`, clamped `line-clamp-4 md:line-clamp-6`. Inline entity links carry a 1em inline glyph colored by branch and a `decoration-branch-*` underline. Citations are `sup.text-[10px]` with a semibold, underlined, `text-grey-4` link and `aria-label="<source> - article N"`.
- Change card. Card at `rounded-[14px] border border-outline bg-white p-4`, with a left rail (`w-4` column, a 12x12 dot at 1.5px border colored by branch, and a fading connector line). Day header `type-ui-4 uppercase tracking-wider text-grey-3` plus a hairline and a count. Kind badge, source link, position, and out and in rows follow (see small parts).
- Overview card. `bg-white rounded-xl mt-3 px-margin pt-6 pb-7`, heading `type-header-4`, intro `type-paragraph-2 text-grey-2`, and a two-column grid `grid-cols-1 @md:grid-cols-[3fr_2fr] gap-x-8 gap-y-8` of By Type and By Branch lists. Each row is `type-ui-1` label plus `type-ui-1 tabular-nums` count. Footer `type-paragraph-3 text-grey-3` above a hairline.
- Entity card. Entity list item `min-h-[56px] border border-outline rounded-xl py-1 px-1.25 flex items-center gap-x-1`, with a square portrait `aspect-square rounded-lg ring-1 ring-offset-2 ring-outline`.
- Portrait card. Small circular portraits in the Who is in the news strip: `w-6 h-6 rounded-full ring-2 ring-white` with overlap via z-index. People in Focus (SF) uses larger cards: fixed width 250px, image `aspect-[2.6/2]`, text block `bg-grey-light`.
- Topic card. Trending and topic chip `rounded-xl px-4 py-2 bg-blue-dim border border-blue-dim` with a `type-header-4 text-blue` label. The topic grid uses the same shape at a larger size.
- Budget tile. Fiscal grid `grid-cols-2 @md:grid-cols-3 gap-x-4 gap-y-7`. Label `type-ui-2 text-grey-2` (or `type-ui-1` with a 20px entity glyph), value `type-header-3 text-grey-1 mt-1.5`, delta `type-ui-3 text-grey-3` with a colored arrow (up `text-purple`, down `text-blue`) at opacity 0.75 and the words "from last year". Stat tile: `rounded-xl bg-background px-3 py-2.5` with the count lists.

Small parts (build area L).

- Kind badge. `px-1.5 py-0.5 font-mono text-[9px] tracking-[0.13em] uppercase rounded-md`, colored by kind: text #E4573D on #E4573D1F for an appointment, and the equivalent pair for a departure. Color is never the only signal; the badge carries text.
- Source link with outbound arrow. `font-mono text-[9.5px] text-grey-4`, showing a date and a glyph, `title="Source"`, `target="_blank" rel="noopener noreferrer"`.
- Date stamp. Monospace, 9 to 9.5px, `text-grey-4`. Timeline axis labels use 9px.
- "Laatst bijgewerkt" stamp. Our addition, per `docs/06` section 6 item 6; the reference has no equivalent. Render as the same monospace stamp style with `aria` text rather than a tooltip.
- Seat count. `type-ui-1` with `tabular-nums` in app; on fiscal tiles `type-header-3`.
- Out and in rows. Container `rounded-[10px] border border-outline/70 bg-background/70 p-3 dark:bg-black/25`, each row `flex items-baseline gap-2` with a `type-ui-4 w-7 uppercase tracking-wider text-grey-4` label and a `type-paragraph-3` value. Empty values are italic `text-grey-4`.
- Year-over-year delta arrow. A unicode arrow plus a percentage in `type-ui-3`, colored by direction, followed by a muted "from last year".
- Breadcrumb. In the top bar and on the canvas: bold scope, separator, current scope dropdown, separator, truncated current section.
- Entity chip. The Part of row and connection lists; chips are links using the topic chip shape at a smaller padding, text in `text-grey-3` with `hover:text-grey-1`.

Node glyphs (area L shapes, area O renders). See section 6.

Empty, loading, error states (build area L).

- Search empty state. `type-header-4` "No results found" plus `type-paragraph-3 text-grey-3 max-w-[280px]`, with a suggestion to use a common name. We localize to Dutch and point at popular topics, per `docs/12`.
- Power map empty state. When fewer than three people qualify: a centered `type-paragraph-2 text-grey-3 max-w-[44ch]` explaining that not enough people cleared the threshold. There is also a no-data message.
- Card loading. The reference uses a top progress bar (`bprogress`, 5px, `--red` #f2686f). We prefer skeleton or static content because our pages are statically generated.
- Error. `_error` page exists; not design-rich. We define our own, matching the empty-state typography.

### 6. Icon and glyph set

All glyphs are inline SVG with a `viewBox` and `currentColor` where possible. They are drawn at 20px or 21px in the graph and at 1em inline in prose. The editorially colored inline glyph (prose and count lists) uses the branch colors, not the node-type colors: a filled shape at `fill-opacity:0.5` over a solid `--white` base with a `stroke` of the same branch color, in `viewBox 0 0 21 22` (circle) or `0 0 21 21` (rect).

Node type glyphs, from the legend swatch set. All in `viewBox 0 0 16 16` unless noted.

| Node type | Shape | Geometry |
| --- | --- | --- |
| elected | circle | center 8,8 radius 5.5 |
| department | rounded square | rect 2.5,2.5 11x11 radius 2.5 |
| dept_head | person over body | rect 3,5.6 10x8.4 radius 2 plus circle center 8,5.6 radius 3 |
| commission | diamond | rect 4,4 8x8 radius 2 rotated 45 degrees about 8,8 |
| advisory | hexagon | 6-point polygon radius 6 centered 8,8 |
| court | pentagon | 5-point polygon radius 6 centered 8,8.5 |
| corporation | square in square | rect 2.5,2.5 11x11 radius 2.5 plus inner rect 5.6x5.6 radius 1.4 |
| quasi | octagon | 8-point polygon radius 6.4 centered 8,8 |
| sub-agency | triad | three rects 4.4x4.4 radius 1.2 at (2.2,8.2), (9.4,8.2), (5.8,2.8) |

The full-canvas node glyphs (`viewBox 0 0 21 22`) are the same ideas at scale: a circle family (elected and constituency), a rotated rounded rect (commission), a triangular/hexagonal path (advisory), a rounded rect (department), and a rounded rect with a circle (dept_head). The reference draws a glyph per node type, not per subtype; see Decisions for our subtype plan.

Edge glyphs, drawn as a 26x12 swatch. Each combines a line and an arrow or curve.

| Edge | Line | Arrow or curve |
| --- | --- | --- |
| elects | straight | two solid triangles |
| appoints | straight | one solid triangle |
| confirms | straight | one outlined triangle |
| oversees | curved | two chevrons |
| administers | curved | two chevrons |
| advises | curved | one chevron |
| dept_head | dashed | none |
| office | dotted | none |
| ex_officio | dotted | none |

UI icons, with their `viewBox`.

| Icon | viewBox | Notes |
| --- | --- | --- |
| Chevron down | 0 0 18 10 | Scope dropdown, legend, select |
| Chevron left and right | 0 0 9 16 | Back and forward |
| Arrow right | 0 0 20 20 | Callout and read-more |
| Close | 0 0 14 14 | Dismiss |
| Check | 0 0 14 14 | Selected option |
| Moon | 0 0 16 16 | Theme toggle (dark) |
| Search | 0 0 17 17 | Search trigger |
| External link | small | Source links |
| Brand starburst | 0 0 34 34 | Filled `--red` |

Proposed mapping of our Dutch subtypes to the nine reference shapes. This is a recommendation for area L, not a sourced reference fact; the reference has no Dutch subtypes.

- `type: elected` (tweede-kamer, eerste-kamer, provinciale-staten, gemeenteraad, algemeen-bestuur-waterschap, eilandsraad, europees-parlement) maps to the circle.
- `type: constituency` maps to the circle with the orange hub treatment.
- `type: commission` (staatscommissie, commissie) maps to the diamond.
- `type: advisory` (adviescollege, planbureau, kiesraad) maps to the hexagon.
- `type: dept_head` (minister, staatssecretaris, minister-president, burgemeester, commissaris-van-de-koning, dijkgraaf, gezaghebber, gouverneur, sg, dg, voorzitter, president) maps to the person-over-body mark.
- `type: department` needs more than one shape because our subtype list is long. Proposal: ministerie to the rounded square; agentschap, inspectie, and uitvoeringsorganisatie to the sub-agency triad; zbo and rwt to the octagon; rechterlijke-instantie to the pentagon; hoge-college to the square-in-square; provincie, gemeente, waterschap, and openbaar-lichaam-bes to a shape family to be drawn; defensieonderdeel and koninkrijksorgaan likewise. Because our graph colors by `type`, the shape is the subtype signal, so this mapping needs care. Recorded as an open question.

### 7. Motion

The reference has no `prefers-reduced-motion` media query in its stylesheet and no keyframe animation beyond a loading pulse. Its motion is entirely transitions. This is a gap we close, because `docs/12` Part 3 requires us to respect reduced motion.

Observed values.

| Motion | Duration | Easing |
| --- | --- | --- |
| Tailwind default transition (colors, opacity, transform) | 150ms | cubic-bezier(0.4, 0, 0.2, 1) |
| Select trigger and some controls | 100ms | default |
| Legend background color | 100ms | ease |
| Legend chevron rotate and row opacity | 140ms | ease |
| Graph layout and path animation (D3) | 750ms | default D3 ease |
| Power map hover-out hide | 160ms delay | none |

Additional transition effects: `transition-transform group-hover:translate-x-0.5` on the power map callout arrow, `hover:opacity-70` on links and chips, and `hover:bg-grey-light` on controls. The graph draws and re-draws paths with a D3 transition of 750ms; the reference's ring rotation is also animated.

Our values: `shared/tokens.json` defines duration fast 120ms, base 180ms, slow 320ms, and easing standard `cubic-bezier(0.2,0,0,1)` and decelerate `cubic-bezier(0,0,0.2,1)`. Use our durations, cap graph transitions at `slow` or turn them off under reduced motion, and honour `prefers-reduced-motion` globally (already wired in `web/app/globals.css`).

### 8. Graph canvas and power map

Graph canvas.

- Layout is radial and deterministic, not a physics simulation. The US graph uses sectors (LEGISLATIVE, EXECUTIVE, JUDICIAL, with OVERSIGHT and ADMINISTRATION functional rings); the SF graph uses concentric rings (elected, commission, advisory, department). The exact algorithm is build area O's work; see `docs/06` section 6 item 1.
- Nodes are small vector glyphs on concentric rings, drawn by type or by branch. Edges are thin curved lines, dim by default, with the selected path drawn in the branch or accent color at higher opacity. On navigation the canvas re-centers and redraws the path rather than remounting.
- The hub is the constituency node, labeled with the electorate and colored orange. A floating entity label sits near the bottom center.
- Pan and zoom are supported; clicking a node focuses it, reveals its label and neighbors, and draws its path to the hub.
- The legend panel is the only chrome on the canvas besides the view toggle and search.

Power map.

- Heading: `fontSize:11, fontWeight:600, letterSpacing:3, uppercase, text-grey-2`, text "Power Map: who is in the news". Subtitle `type-ui-3 text-grey-3 mt-0.5` states the count, the article count, the source count, and the window in days.
- Faces are circular portraits. Diameter scales with the square root of the article count between a minimum of 40px and a maximum of 120px on desktop (phone min is `round(44 * 0.4 * width / 128)`). `docs/02` records an observed 44px face; treat 40 to 120 as the true range. The detail panel shows a 48px face.
- Each face has a label below: name `fontSize:13` semibold `line-clamp-2`, party and role `fontSize:11-12` `text-grey-3`, article count `fontSize:11` `text-grey-2`, and recency `fontSize:11` in `text-brand`.
- A heat ring around a face uses `stroke: var(--brand)` with strokeWidth 10 and a computed `strokeOpacity`. Connecting lines are faint; line labels are 11px on a `bg-background` pill.
- A hover detail panel is `absolute z-10 rounded-xl bg-white shadow-[0_8px_32px_rgba(0,0,0,0.25)] border border-outline p-4`, width 288px, max height 400px. On mobile it becomes a bottom sheet: `fixed inset-x-0 bottom-0 z-[60]`, `bg-white rounded-t-2xl shadow-[0_-8px_32px_rgba(0,0,0,0.25)]`, with a scrim `bg-background/40` and an Escape-to-close handler.

### 9. The SVG width and height bug to avoid

The live site logs repeated console errors of the form `<svg> attribute width/height: Expected length, "auto"`. The cause is inline SVG with invalid dimension attributes: `width="100%" height="auto"` on the chevrons, and `width="auto" height="100%"` on the back and forward icons. Ten such SVGs render on the US homepage alone. `auto` is not a valid SVG length.

What we do instead.

- Give every inline SVG a `viewBox` plus either explicit `width` and `height` attributes or CSS sizing (`width: 1em; height: 1em`, `class="h-4 w-4"`). Never `width="auto"` or `height="auto"` on an `<svg>`.
- Where an icon must scale to a text size, control it entirely in CSS on a wrapper, as the reference does correctly for its entity glyphs (`[&>svg]:w-[1em] [&>svg]:h-[1em]`).
- Our generated `shared/tokens.json` has no icon sizes yet; area L should add a small icon-size scale so this stays consistent.

## Decisions

1. Design tokens come from `shared/tokens.json`, not the reference. The reference values in this document are provenance and a mapping guide. Where they differ, ours wins.
2. Accent. We use Rijkshuisstijl oranje #E17000 instead of the reference's distributed accent set (link blue #084ab4, brand coral #fd8055, graph orange #f27836). Rationale is in the token file: it is the Dutch government's own identity color and both themes carry contrast-safe text and focus variants.
3. Type. We keep the system sans stack in `shared/tokens.json` rather than shipping Inter, to avoid a font payload and a licence dependency. The reference uses Inter variable. Our scale is a generic ramp mapped from the reference's named roles (header-1 to 3xl, header-4 to base, paragraph-3 to sm, ui-4 to a 10px extension).
4. Radius. Use our radius scale (sm 6px, md 10px, lg 14px) rather than the reference's 12px `rounded-xl` and 16px `rounded-2xl`.
5. Dark default. Match the reference: dark is the default theme, light is opt-in. Already set in `shared/tokens.json` (`defaultTheme: dark`).
6. Graph renderer. Adopt the reference's D3-assisted SVG approach for animation, but keep layout deterministic as build area O specifies. This corrects `docs/02` section 5's tentative "no d3" conclusion.
7. Motion. Use our durations (120/180/320ms) and honour `prefers-reduced-motion`, which the reference does not. The reference's 750ms graph transition is capped.
8. Glyphs. Keep the reference's one-shape-per-type idea, extend it to our subtypes using the mapping in section 6, and colour by `type` with branch colours available as a secondary scheme, mirroring the reference's split between the US sector layout (branch) and the SF ring layout (type).
9. Mobile order. Follow the reference and put the canvas first on mobile, behind a control, unless the accessibility review in `docs/12` Part 5 prefers editorial first. Flagged as an open question because the two documents disagree.
10. One search input. The reference ships a duplicate desktop and mobile input; we ship one accessible combobox per `docs/12` Part 3.
11. Flatter elevation. Keep our surfaces flat with hairlines; reserve shadows for overlays only, as the reference does.

## Gaps

- The CivLab blog media host `writing.civlab.org` timed out on direct fetch. Its posts are covered through the publisher RSS feed at `civlab.substack.com/feed`, which carries full post text. Any embedded images and video in those posts are not captured.
- The XXIX and Sanctuary case studies are client-rendered; their text was read from embedded JSON payloads and the search index, not from rendered pages. Video and image assets are named but not analysed.
- The reference does not document its breakpoints, spacing, or motion; all values in this document are read from the shipped CSS and inline styles, so any value not listed is unknown rather than zero.
- The exact graph layout algorithm, node radius, and edge width constants are only partly extracted. They are build area O's deliverable and out of scope here.
- No accessible-name or ARIA audit of the reference was performed; we rely on `docs/12` Part 3 for our requirements, not the reference.
- The v2 graph (`v2.sfgov.civlab.org`) uses a different visual language (purple #8f48d2 primary, orange #ff7242 accent, a graph-first sidebar of entity lists). It is recorded for history only and should not be cloned.

## Open questions

1. Subtype glyphs. Nine reference shapes cannot cover our full `department` subtype list (ministerie, agentschap, zbo, rwt, inspectie, rechterlijke-instantie, hoge-college, provincie, gemeente, waterschap, openbaar-lichaam-bes, defensieonderdeel, koninkrijksorgaan, and more). Area L must decide whether to draw a larger glyph family or to encode subtype with a shape modifier on a smaller base set. Proposed default: base shape by `type`, modifier by subtype.
2. Link color. The reference uses a dedicated blue for links and topic chips. Our tokens define only an accent. Decide whether to map links and topic chips to `accent` or to add a dedicated info token with light and dark pairs.
3. Mobile column order. `docs/12` Part 5 says editorial first, the reference renders canvas first. Confirm which wins at the QA gate.
4. Icon size tokens. No icon-size scale exists in `shared/tokens.json`. Add one (for example 12/14/16/20/24/34px) so icons stop being ad hoc and the SVG bug cannot return.
5. Face-diameter range. The power map diameter ranges 40 to 120px on desktop in the shipped code; `docs/02` records 44px. Confirm the intended visual weight for our dataset, which has fewer articles.
6. Topic chip emphasis. SF uses a filled `--blue-dim` chip for trending topics. Confirm the Dutch equivalent and its contrast in both themes against our accent.
7. Reference font fallback. If we later choose Inter, confirm the licence and the self-hosted subset; the reference loads seven unicode-range subsets.
