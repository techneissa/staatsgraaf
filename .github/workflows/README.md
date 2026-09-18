# Workflow operator notes

Two GitHub Actions workflows run the pipeline and the gate. Host and deploy path are fixed in `docs/adr/0004-hosting-ci-and-analytics.md`: Cloudflare Pages, project `staatsgraaf`, production branch `main`, Wrangler deploy from GitHub Actions.

## Workflows

### `refresh.yml`

Runs nightly at 03:00 UTC, and on demand with **Run workflow**. Steps run in this fixed order:

1. checkout
2. setup Node
3. `npm ci`
4. `npm run merge`
5. `node pipelines/news.mjs`
6. `node pipelines/changes.mjs`
7. `npm run validate`
8. `npm test`
9. `cd web && npm ci && npm run build` (with `NEXT_PUBLIC_SITE_URL`)
10. `npx wrangler pages deploy web/out --project-name=staatsgraaf --branch=main`

Validation and tests gate the deploy: a failed step stops the run, so production stays on the last good deployment. The job has `timeout-minutes: 60`, and the `nightly-refresh` concurrency group prevents two runs from overlapping (a new run waits; it does not cancel an active one). On any failure the job opens or comments on one `ops` issue; if the issue API is unreachable it prints the same summary in the log.

### `ci.yml`

Runs on every pull request and on pushes to `main`. Steps:

1. checkout
2. setup Node
3. `npm ci`
4. `npm run validate`
5. `node scripts/validate.mjs --research`
6. `npm test`
7. `cd web && npm ci && npx tsc --noEmit`

No deploy. This is the required status check to protect `main`.

## Secrets and variables

Set these in **Settings > Secrets and variables > Actions**.

| Name | Kind | Purpose |
| --- | --- | --- |
| `CLOUDFLARE_API_TOKEN` | repository secret | Wrangler deploy. Cloudflare API token with Pages edit permission. |
| `CLOUDFLARE_ACCOUNT_ID` | repository secret | Cloudflare account for the Pages project. |
| `NEXT_PUBLIC_SITE_URL` | repository variable | Absolute base URL for canonical, `robots.txt`, and `sitemap.xml`. |
| `GITHUB_TOKEN` | automatic | Used by the failure step to open or comment on the `ops` issue. Do not set it yourself. |

`NEXT_PUBLIC_SITE_URL` is optional: if the variable is unset, the workflow falls back to `https://staatsgraaf.pages.dev`. **This is the pending value**, because the production URL is not chosen yet. Set the variable once the domain is fixed.

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

1. **Cloudflare account and project do not exist yet.** The owner must create the Cloudflare account, create the Pages project named `staatsgraaf`, and add `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` before the first deploy. Until then the `refresh` deploy step cannot succeed.
2. **No root `package-lock.json`.** The repo currently commits only `web/package-lock.json`. Both workflows run `npm ci` at the root, which fails without a committed lockfile. Add a root `package-lock.json` (build area K owns `package.json`) before either workflow can pass.
