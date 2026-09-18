# ADR 0004: hosting, delivery, and analytics

- Date: 2026-09-18
- Status: accepted
- Supersedes: none

## Context

The web client is a Next.js App Router static export in `web/out`. `docs/12` requires HTTPS and HSTS, a strict Content-Security-Policy, a `robots.txt` and a `sitemap.xml`, and leaves cookieless analytics as an owner choice. `docs/10` requires a scheduled refresh that refetches, normalizes, diffs, validates, and deploys, with an alert on failure and the last good release left in place. `docs/06` budgets the graph bundle and expects the host to negotiate a compressed encoding.

The owner chose the delivery target and the analytics posture on 2026-09-18.

## Decision

1. **Host: Cloudflare Pages**, project `staatsgraaf`, production branch `main`. Cloudflare Pages serves the static `web/out` directory, honors the `web/public/_headers` file (HSTS, CSP, and the other security headers), and negotiates Brotli for `graph.json`. This is what turns the recorded `P-01` graph-budget exception into a passing measurement: the 36.5 KiB Brotli transfer is inside the 46.9 KiB budget, and the gzip fallback is only a concern if Cloudflare stops negotiating Brotli.
2. **Repository: a private GitHub repository for now**, `techneissa/staatsgraaf`. The published site is public; the repository can be opened later without a rebuild. CI runs on GitHub Actions. (The context originally named `SpaciousTech`; that account is not reachable from the authenticated GitHub identity, so the owner chose `techneissa`.)
3. **Deploy path: Wrangler from GitHub Actions.** The scheduled workflow runs, in order, merge, news, changes, validate, test, build, and `wrangler pages deploy web/out`. `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` live in repository secrets only, never in data, pages, or logs. `NEXT_PUBLIC_SITE_URL` is set at build time so canonical URLs, `robots.txt`, and `sitemap.xml` carry absolute URLs. A failure stops the run and alerts; production stays on the last good deployment.
4. **Analytics: none.** The site sets no cookies and collects no personal data. It stores only the reader's theme choice in `localStorage`. There is therefore no consent banner and no analytics opt-in, and the `/privacy` statement says so plainly. This choice is revisited only if an analytics tool is added, at which point `docs/12` requires a matching privacy statement and, for anything non-essential, an accept and reject choice before it loads.

## Consequences

- `robots.txt` and `sitemap.xml` emit absolute URLs only when `NEXT_PUBLIC_SITE_URL` is set; the deploy build must set it. Until then they fall back to relative paths, which is a named gap, not a wrong fact.
- A hash-only `script-src` is not provably correct for this host: Next's static export emits thousands of per-page inline flight scripts that change on every data refresh, and CSP3 ignores `'unsafe-inline'` once a hash is present. The current policy uses `'unsafe-inline'` for scripts and styles and records the exact inline-script hashes and the verification commands in `web/public/_headers.md`. Moving to hashes needs a server that can mint a nonce, or a build that externalizes the inline scripts. This is a named gap.
- The repository is private, so the `ATTRIBUTION.md` and dataset-citation links from the site resolve only for readers with access until the repository is made public.
- Keeping analytics out leaves the running cost at static hosting plus scheduled CI, which is the low-cost posture `docs/01` asks for.
- Cloudflare Pages Free caps a deployment at 20,000 files. The unpruned export had 23,478 files, mostly `__next.*.txt` prefetch auxiliaries that the router does not need for navigation. `web/scripts/prune-export.mjs` removes those and keeps one `index.txt` per route, taking the export to 7,854 files, well under the cap and without a paid plan. The raised 100,000-file limit is a paid feature and was not needed.
