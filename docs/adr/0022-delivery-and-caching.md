# ADR 0022: delivery, caching, and the prefetch 404

- Date: 05-10-2026
- Status: accepted
- Supersedes: none (extends ADR 0004)

## Context

The performance baseline of 05-10-2026 (`docs/superpowers/audits/2026-10-05-perf-baseline.md`, offenders 3, 6 and 8) found three delivery problems on the Cloudflare Pages deployment:

1. `web/public/_headers` set no `Cache-Control`, so Pages served `public, max-age=0, must-revalidate` for everything, including content-hashed chunks.
2. Every `Link` prefetch requested `/<route>/__next._tree.txt?_rsc=...`. `web/scripts/prune-export.mjs` deletes those files to stay under the file cap, so each request returned the 404 page (36,511 bytes raw, about 7 KB compressed, `no-store`): 8 on the home page, 10 on `/nieuws/`, 14 on `/organisaties/`, 9 on a person page.
3. A `polyfills-*.js` chunk of 113 KB raw and 40 KB gzip appears in the build output.

## Decision

### Cache headers

Cloudflare joins the values of every matching `_headers` rule with a comma, so a path must match exactly one `Cache-Control` rule and `/*` carries none. Anything not listed keeps the Pages default, so a new route fails safe.

| Paths | `Cache-Control` | Why |
| --- | --- | --- |
| `/_next/static/*` | `public, max-age=31536000, immutable` | File names carry a content hash, so a changed file has a new URL. |
| `/media/*` | `public, max-age=86400, stale-while-revalidate=604800` | Portraits and thumbnails are named by person slug (`/media/portretten/klein/<slug>.webp`), not by hash. A replaced portrait must show within a day. |
| `/data/v1/*`, `/graph.json`, `/hierarchy.json`, `/power-map.json`, `/search-index.json`, `/peek/*`, `/panels/*` | `public, max-age=300, stale-while-revalidate=3600` | Data refreshes every 4 to 6 hours. Five minutes fresh keeps repeat views off the network; the hour of revalidation keeps a returning reader from waiting. Worst case a reader sees data about 65 minutes older than the newest deploy, and only when they fetched it within the hour. |
| `/`, `/index.txt`, the 13 route directories, `/robots.txt`, `/sitemap.xml` | `public, max-age=300` | HTML and `index.txt` match each other. No `stale-while-revalidate`: a page that outlives a deploy points at chunk files that no longer exist on the production alias, so an hour of stale HTML could break hydration. Five minutes is the bound; Next also forces a full navigation when the build id of a payload differs from the loaded page. |

Every security header and the CSP are unchanged, including the `img-src` host list. The file now has 27 path rules against the 100 allowed.

### Prefetch 404

Next 16 offers no global switch to disable `Link` prefetch; it is the `prefetch` prop on each link. Each prefetch also sends a `HEAD` request for the page before the tree request. The options were:

- (a) keep the segment files. A prefetch needs four files per route (`_tree`, `_index`, the page segment, `_full`). The unpruned export has 26,165 files, over the 20,000 cap. Keeping them only for the index routes leaves every entity link (most links) dead. The page segment of a person is about 149 KB, so a successful viewport prefetch of 20 links would move about 3 MB. Rejected.
- (b) `prefetch={false}` on the shared link components. This is the right long-term fix and it is a component change, owned by another agent (prefetch on intent). Not done here.
- (c) answer the request cheaply. Chosen.

`web/public/_redirects` rewrites `/__next._tree.txt`, `/:a/__next._tree.txt` and `/:a/:b/__next._tree.txt` (all routes are at most two segments deep) to `/__prefetch-miss.txt`, a one byte file, with status 200. The router treats an undecodable tree as a miss, rejects the entry for 10 seconds and navigates normally on click, so behavior is unchanged. The cost per link falls from a 404 of about 7 KB with `no-store` to one byte that the cache rules above can store. Cloudflare allows one splat per line and none mid-path, hence the placeholders. This uses 3 of the 100 dynamic redirects.

The wasted requests do not disappear: each link still sends a `HEAD` and a tree request. When the component agent sets `prefetch={false}` on viewport links and prefetches on intent, remove this rewrite only if intent prefetch is also dropped, because intent prefetch uses the same tree request. Navigation stays cold either way: a click still pays about 2.7 round trips (273 ms at 100 ms RTT).

### Polyfills

The 113 KB `polyfills-*.js` is Next's nomodule bundle. The HTML loads it as `<script src=".../polyfills-....js" noModule="">`, so a browser that supports ES modules never requests it. Measured with Chromium 1228: 0 requests for it on 5 pages. Adding a `browserslist` (last 2 versions of Chrome, Edge, Firefox and Safari, plus iOS Safari 16.4 and later) left every chunk byte-identical in a webpack build, and Next has no switch to stop emitting the file. No `browserslist` was added, and the offender is closed as not a transfer cost for the supported browsers: Chrome, Edge, Firefox and Safari releases from 2023 onward, and iOS Safari 16.4 and later, which is also the floor Next 16 itself targets. The Turbopack build that Cloudflare runs was not measured; the same `noModule` attribute is in the HTML it emits.

### File count guard

`prune-export.mjs` already fails above 20,000 files. It now also warns at 15,000 files, so growth is visible well before the cap. The export has 9,621 files after pruning (26,165 before). This change adds 2 (`_redirects` and `__prefetch-miss.txt`), so 9,623. Each new route costs two files (`index.html`, `index.txt`); a feature that adds a page per entity of a 1,600-record type would add 3,200.

## Cloudflare Pages Free limits (developers.cloudflare.com/pages/platform/limits/, fetched 05-10-2026)

| Limit | Value | What the project does |
| --- | --- | --- |
| Builds per month | 500 | CI builds in GitHub Actions and uploads with `wrangler pages deploy`, so Cloudflare's own build count stays at 0. Every GitHub Actions deploy counts against GitHub minutes, not this limit. |
| Files per site | 20,000 | `prune-export.mjs` deletes 16,544 RSC auxiliary files, fails above 20,000 and warns above 15,000. |
| Size per file | 25 MiB | The largest files are the RSC `index.txt` of the listing pages (about 2.3 MB) and `data/v1/*.json`; far under. |
| Header rules | 100 (2,000 characters per line) | 27 rules; the CSP line is under the line limit. |
| Redirects | 2,000 static, 100 dynamic | 3 dynamic. |

## Consequences

- Hashed chunks stop being revalidated on every visit. Returning visits skip most requests.
- A data refresh shows within about five minutes to an hour, never a day. A new portrait file shows within a day.
- Header values were verified with `wrangler pages dev` (Wrangler 4.147.0) on the pruned export, not on the live host. Check the live response after the first deploy with the commands in `docs/10-operations-runbook.md` section 13.
- The `_redirects` rewrite inherited the source path's `Cache-Control` locally; whether Cloudflare production does the same is not verified.
