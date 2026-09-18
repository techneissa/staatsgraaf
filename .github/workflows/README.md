# Workflow operator notes

Three GitHub Actions workflows run the pipeline, the news cadence, and the gate. Host and deploy path are fixed in `docs/adr/0004-hosting-ci-and-analytics.md`: Cloudflare Pages, project `staatsgraaf`, production branch `main`, Wrangler deploy from GitHub Actions.

## Workflows

### `refresh.yml`

Runs nightly at 03:00 UTC, and on demand with **Run workflow**. Steps run in this fixed order:

1. checkout
2. setup Bun (`oven-sh/setup-bun@v2`, version from `.bun-version`)
3. setup Node 24 (`actions/setup-node@v4`, for Next.js and Wrangler only)
4. `bun run refresh-official` (office holders from Rijksoverheid, Tweede Kamer, and Eerste Kamer; `docs/adr/0006-live-official-sources.md`)
5. `bun run merge`
6. `bun run news`
7. `bun run changes`
8. `bun run validate`
9. `bun test pipelines web/lib`
10. `cd web && bun install --frozen-lockfile && bun run build` (with `NEXT_PUBLIC_SITE_URL`)
11. ensure the Pages project `staatsgraaf` exists with `bunx wrangler pages project list`, creating it with `bunx wrangler pages project create` if it is missing
12. `bunx wrangler pages deploy web/out --project-name=staatsgraaf --branch=main`

There is no root install step: the root package has no dependencies, so Bun runs the pipelines, the validator, and the tests straight from the checkout. `web/bun.lock` is the only lockfile, and `bun install --frozen-lockfile` in `web/` fails if it is out of date. The toolchain choice is recorded in `docs/adr/0005-bun-toolchain.md`.

Validation and tests gate the deploy: a failed step stops the run, so production stays on the last good deployment. The job has `timeout-minutes: 60`, and the `nightly-refresh` concurrency group prevents two runs from overlapping (a new run waits; it does not cancel an active one). On any failure the job opens or comments on one `ops` issue; if the issue API is unreachable it prints the same summary in the log.

### `news.yml`

Runs every six hours at 30 minutes past the hour, and on demand. It shares the `nightly-refresh` concurrency group, so it never overlaps the nightly run. Steps: checkout, setup Bun, setup Node, `bun run news`, `bun run validate`, `bun test pipelines web/lib`, the web build, and the Wrangler deploy. It does not refetch office holders or re-derive the change feed; that is the nightly run's job. To go hourly, change the cron to `0 * * * *`; the cost trade-off is in `docs/adr/0007-news-outlets-and-languages.md`. On failure it opens or comments on one `ops` issue titled "Nieuwsrun mislukt".

### `ci.yml`

Runs on every pull request and on pushes to `main`. Steps:

1. checkout
2. setup Bun (`oven-sh/setup-bun@v2`, version from `.bun-version`)
3. setup Node 24 (`actions/setup-node@v4`, for Next.js and tsc only)
4. `bun run validate`
5. `python3 scripts/format-dates.py --check` over every markdown file outside `research/raw/` and `ATTRIBUTION.md` (AGENTS.md rule 8: dates in documents are dd-MM-YYYY)
6. `bun run research:check`
7. `bun test pipelines web/lib`
8. `cd web && bun install --frozen-lockfile && bun run typecheck`

No deploy. This is the required status check to protect `main`.

## Secrets and variables

Set these in **Settings > Secrets and variables > Actions**.

| Name | Kind | Purpose |
| --- | --- | --- |
| `CLOUDFLARE_API_TOKEN` | repository secret | Wrangler deploy. Cloudflare API token with Pages edit permission. |
| `CLOUDFLARE_ACCOUNT_ID` | repository secret | Cloudflare account for the Pages project. |
| `NEXT_PUBLIC_SITE_URL` | repository variable | Absolute base URL for canonical, `robots.txt`, and `sitemap.xml`. |
| `GITHUB_TOKEN` | automatic | Used by the failure step to open or comment on the `ops` issue. Do not set it yourself. |

`NEXT_PUBLIC_SITE_URL` is optional: if the variable is unset, the workflow falls back to `https://staatsgraaf.pages.dev`, which is the live production URL. Set the repository variable to that URL, or rely on the fallback, so canonical, `robots.txt`, and `sitemap.xml` use absolute URLs.

Never echo a secret. The workflows pass Cloudflare credentials only as step-level environment variables, and no step prints them.

## Run a manual refresh

1. Go to **Actions > refresh**.
2. Choose **Run workflow**, select `main`, and confirm.
3. Watch the run. On green the site is redeployed; on red read the failure summary and the `ops` issue.

## Roll back

Cloudflare Pages keeps every deployment as an immutable artifact. Two paths:

- **Redeploy the previous artifact.** Cloudflare dashboard > Pages > `staatsgraaf` > Deployments, find the last good deployment, and **Rollback to this deployment** (or redeploy it). This is the fastest path and does not touch the repo.
- **Restore the previous data commit.** Revert the data change with a new commit (`git revert <sha>`), then run the refresh workflow to rebuild and redeploy from that dataset. A bad fact is corrected with a new commit and a changelog entry, never a silent edit (`docs/10` section 5, `docs/09` section 8).

## Named gaps

1. **No confirmed green workflow run.** The workflows are committed and the scripts they call pass locally, but a green `ci` or `refresh` run in GitHub Actions is not yet confirmed.
2. **Repository secrets and variables are not verifiable from the checkout.** The Cloudflare account and the Pages project `staatsgraaf` exist and the site is live at https://staatsgraaf.pages.dev, but this checkout cannot confirm that `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, and `NEXT_PUBLIC_SITE_URL` are set in the repository.
