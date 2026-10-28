# Staatsgraaf: web app

The Next.js App Router client for Staatsgraaf, built as a static export with TypeScript, Tailwind CSS, and Radix primitives. This is build area L: the app shell and the design system. The feature areas (canvas, search, change feed, news, topics, budgets) mount into it later.

Read `../docs/06-build-plan.md` sections 3 to 5 for the stack and the ownership split, and `../docs/12-discovery-privacy-accessibility-security.md` for the accessibility and security requirements this app follows from the start.

## Run

Requires Bun 1.2 or newer (the repo pins 1.4.2 in `../.bun-version`) and Node 20.9 or newer. Bun installs packages and runs the scripts; Node is only needed because Next.js and tsc execute on it.

```sh
bun install
bun run dev
```

The dev server runs at http://localhost:3000.

## Build

```sh
bun run build
bun run typecheck
bun run check:contrast
```

`bun run build` produces a fully static site in `out/`. Serve it with any static file server, for example:

```sh
bunx serve out
```

`bun run tokens` regenerates the Tailwind theme from `../shared/tokens.json`. `bun run prepare-data` runs it together with the graph bundle, the search index, and the dataset build; it runs automatically before `dev` and `build`.

## Data

Every page is generated at build time from the JSON dataset in `../data`. There are no runtime fetches and no runtime database. `lib/data.ts` reads the files once per build, indexes them, and derives the `Laatst bijgewerkt` stamp from the latest `retrieved` date in `data/sources.json`. Missing fields render as nothing or as an explicit Dutch empty state, never as a placeholder fact.

## Design tokens

`../shared/tokens.json` is the single source of truth for colour, type, spacing, radius, border weight, and motion. `scripts/build-tokens.mjs` generates `app/generated/tokens.css` (raw custom properties plus the Tailwind `@theme` mapping). Do not hand-write token values in components. `bun run check:contrast` verifies the WCAG AA pairs for both themes.

The accent is Rijkshuisstijl oranje `#E17000`, with separate text and focus variants per theme so links, badges, and focus rings keep their contrast. The default theme is dark; the theme toggle sets `data-theme` on the root element and persists the choice in `localStorage`.

## Layout, routes, and mounting points

- Two-column spine: a scrollable editorial column on the left and a persistent canvas frame on the right. Below the `lg` breakpoint the canvas frame moves under the editorial column instead of being hidden.
- `data-search-mount` in the top bar, where the search overlay (build area O) mounts.
- `data-graph-mount` in the canvas frame, where the SVG graph and the power map (build area O) mount.
- The canvas frame is a placeholder with disabled Grafiek, Machtskaart, and Legenda controls. It is an `aside` with no focusable children, so it never blocks keyboard use.
- Routes: `/`, `/organisaties/[slug]/`, `/personen/[slug]/`, `/posities/[slug]/`, plus the stubs `/methodiek/`, `/privacy/`, and `/toegankelijkheid/`.
- All UI strings are Dutch; slugs and code keys are English.

## Environment

`NEXT_PUBLIC_SITE_URL` sets the base for canonical and Open Graph URLs. While the domain is undecided it can stay unset; canonical links are then omitted instead of pointing at a guessed host.

## Accessibility baseline

One `h1` per page, ordered headings, `header`/`nav`/`main`/`aside`/`footer` landmarks, a skip link to `#inhoud`, visible focus rings, no colour-only meaning, a system font stack only, and a global `prefers-reduced-motion` reset. The welcome banner (`components/welcome-banner.tsx`) scrolls its text only when motion is allowed, pauses on hover and focus (WCAG 2.2.2), and its close button hides it for good (`staatsgraaf.welcome-banner` in `localStorage`). The contrast script and these rules are the floor, not the finished statement: axe checks in CI and a manual keyboard and screen reader pass still belong to the QA gate.
