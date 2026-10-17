# ADR 0004: hosting, delivery, and analytics

- Date: 18-09-2026
- Status: accepted
- Supersedes: none

## Context

The web client is a Next.js App Router static export in `web/out`. `docs/12` requires HTTPS and HSTS, a strict Content-Security-Policy, a `robots.txt` and a `sitemap.xml`, and leaves cookieless analytics as an owner choice. `docs/10` requires a scheduled refresh that refetches, normalizes, diffs, validates, and deploys, with an alert on failure and the last good release left in place. `docs/06` budgets the graph bundle and expects the host to negotiate a compressed encoding.

The owner chose the delivery target and the analytics posture on 18-09-2026.

## Decision

1. **Host: Cloudflare Pages**, project `staatsgraaf`, production branch `main`. Cloudflare Pages serves the static `web/out` directory, honors the `web/public/_headers` file (HSTS, CSP, and the other security headers), and negotiates Brotli for `graph.json`. This is what turns the recorded `P-01` graph-budget exception into a passing measurement: the 36.5 KiB Brotli transfer is inside the 46.9 KiB budget, and the gzip fallback is only a concern if Cloudflare stops negotiating Brotli.
2. **Repository: a private GitHub repository for now**, `techneissa/staatsgraaf`. The published site is public; the repository can be opened later without a rebuild. CI runs on GitHub Actions. (The context originally named `SpaciousTech`; that account is not reachable from the authenticated GitHub identity, so the owner chose `techneissa`.)
3. **Deploy path: Wrangler from GitHub Actions.** The scheduled workflow runs, in order, merge, news, changes, validate, test, build, and `wrangler pages deploy web/out`. A push to `main` runs a separate `deploy` workflow that builds and deploys the committed dataset without refetching, so a code or data change publishes in about a minute instead of waiting for the schedule. `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` live in repository secrets only, never in data, pages, or logs. `NEXT_PUBLIC_SITE_URL` is set at build time so canonical URLs, `robots.txt`, and `sitemap.xml` carry absolute URLs. Every deploy workflow caches the Bun package store and the Next.js build directory; Next invalidates only the pages whose inputs changed, so the cache shortens the build without serving stale output. A failure stops the run and alerts; production stays on the last good deployment.
4. **Analytics: none.** The site sets no cookies and collects no personal data. It stores only the reader's theme choice in `localStorage`. There is therefore no consent banner and no analytics opt-in, and the `/privacy` statement says so plainly. This choice is revisited only if an analytics tool is added, at which point `docs/12` requires a matching privacy statement and, for anything non-essential, an accept and reject choice before it loads.

## Consequences

- `robots.txt` and `sitemap.xml` emit absolute URLs only when `NEXT_PUBLIC_SITE_URL` is set; the deploy build must set it. Until then they fall back to relative paths, which is a named gap, not a wrong fact.
- A hash-only `script-src` is not provably correct for this host: Next's static export emits thousands of per-page inline flight scripts that change on every data refresh, and CSP3 ignores `'unsafe-inline'` once a hash is present. The current policy uses `'unsafe-inline'` for scripts and styles and records the exact inline-script hashes and the verification commands in `web/public/_headers.md`. Moving to hashes needs a server that can mint a nonce, or a build that externalizes the inline scripts. This is a named gap.
- The repository is private, so the `ATTRIBUTION.md` and dataset-citation links from the site resolve only for readers with access until the repository is made public.
- Keeping analytics out leaves the running cost at static hosting plus scheduled CI, which is the low-cost posture `docs/01` asks for.
- Cloudflare Pages Free caps a deployment at 20,000 files. The unpruned export had 23,478 files, mostly `__next.*.txt` prefetch auxiliaries that the router does not need for navigation. `web/scripts/prune-export.mjs` removes those and keeps one `index.txt` per route, taking the export to 7,854 files, well under the cap and without a paid plan. The raised 100,000-file limit is a paid feature and was not needed.

## Amendment 05-10-2026: public repository, one 3-hourly workflow, commit-back

The repository becomes public (ADR 0023), so GitHub Actions minutes on standard runners are free and the earlier cost cap no longer decides the cadence. The consequence for point 2 above: the repository is no longer private, and the `ATTRIBUTION.md` and dataset-citation links from the site resolve for everyone.

Changes to the delivery path (point 3):

1. **One scheduled workflow, every 3 hours** (`15 */3 * * *`, `.github/workflows/news.yml`). It runs the official refresh, merge, news, translation, change feed, validation, and tests. The nightly `refresh.yml` was removed because the 3-hourly run does everything it did. `workflow_dispatch` stays; the `nightly-refresh` concurrency group is kept and shared with `deploy.yml`.
2. **Skip when unchanged.** `scripts/data-changed.mjs` compares the refreshed files with `HEAD`, ignoring `generatedAt`. If nothing changed, the run ends successfully before any commit, build, contract check, or deploy.
3. **Commit-back.** If something changed, `scripts/commit-refresh.sh` commits `data/` and the refresh by-products to `main` as `github-actions[bot]` (`data: refresh <ISO date> [skip ci]`), rebasing and retrying the push when it loses a race. Deploy runs in a second job, only after the commit succeeded, from the pushed commit. `contents: write` exists only in the refresh job; the deploy job has read-only repository access and holds the Cloudflare secrets. The data therefore advances in git instead of living only in the deployed site.
4. **Push deploys skip documentation-only pushes** (`paths-ignore` for `docs/**`, `research/qa/**`, `**/*.md`). `research/*.json` and `LICENSE*` are not ignored because the build reads them. Bot commits made with `GITHUB_TOKEN` do not start `deploy.yml` (GitHub does not create workflow runs for events caused by that token).
5. **Next.js build cache** keyed on the lockfile hash and the ISO week, not on the data hash, saved only in the job that builds. GitHub documents that a cache cannot be changed once its key exists and that the cap is 10 GB per repository, with entries not accessed for 7 days evicted (docs.github.com, "Dependency caching reference", read 05-10-2026). A per-run key would fill the cap; a lockfile-only key would freeze at the first build.
6. **Hygiene for a public repository:** third-party actions pinned to full commit SHAs, `permissions: {}` at workflow level with per-job grants, no workflow runs on forks, `persist-credentials: false` on checkouts that do not push.

Limits and facts verified on 05-10-2026:

- Cloudflare Pages Free (developers.cloudflare.com/pages/platform/limits/, page dated 05-09-2026): 500 builds per month, 20,000 files per site, 25 MiB per file, 100 `_headers` rules. The 500-build figure is documented for builds Pages runs from a Git push; this project uploads prebuilt output with Wrangler, so it is not expected to count, and the worst case (8 deploys a day) is about 248 a month. The export has 9,621 files after pruning (measured 05-10-2026).
- GitHub (docs.github.com, "Disable and enable workflows", read 05-10-2026): in a public repository, scheduled workflows are automatically disabled when no repository activity has occurred in 60 days. The documentation does not define "activity", so it is not verified that a bot commit made with `GITHUB_TOKEN` counts. The refresh commits on most runs, which is the expected keep-alive; the operator notes say how to re-enable the schedule.

## Amendment 17-10-2026: self-hosted runner, repository stays private

The owner is not publishing the repository yet (ADR 0023 purge still outstanding). Hosted GitHub Actions minutes on the private repo were hitting the free-plan cap. From 17-10-2026 the four workflows run on a self-hosted runner on the maintainer's Mac, label `staatsgraaf`. GitHub does not charge minutes for self-hosted runners.

Point 2 of the decision (private repository for now) stands. The 05-10-2026 amendment's "repository becomes public" line is not in effect until the purged-history migration runs.

Limits: one runner, so jobs queue. The Mac must be awake for `news.yml` (every 3 hours) and `link-check.yml` (Mondays). A sleeping machine skips the schedule. Operator notes are in `.github/workflows/README.md`.
