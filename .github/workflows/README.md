# Workflow operator notes

Four GitHub Actions workflows run the refresh, the push deploy, the CI gate, and the weekly link check. Host and deploy path are fixed in `docs/adr/0004-hosting-ci-and-analytics.md` (including its amendment of 05-10-2026): Cloudflare Pages, project `staatsgraaf`, production branch `main`, Wrangler deploy from GitHub Actions.

Jobs run on a self-hosted runner on the maintainer's Mac (`runs-on: [self-hosted, staatsgraaf]`). GitHub does not charge minutes for that. The repository stays private. Every third-party action is pinned to a full commit SHA with its version in a comment; bump them by hand or with Dependabot. The machine must be awake for the 3-hourly refresh and the weekly link check; a sleeping Mac skips the schedule until the next tick.

## Workflows

### `news.yml` (the scheduled refresh)

The only scheduled workflow besides the weekly link check. It runs every 3 hours at 15 minutes past (`15 */3 * * *`) and on demand with **Run workflow**. The file keeps its old name; it now does the whole refresh. It never runs on a fork, and it only publishes from `main`.

Job `refresh` (permission: `contents: write`):

1. checkout, setup Bun (`.bun-version`), restore the Bun package cache
2. `bun run refresh-official` (office holders from Rijksoverheid, Tweede Kamer, and Eerste Kamer; `docs/adr/0006-live-official-sources.md`)
3. `bun run merge`
4. `bun run news`
5. restore the translation cache, `bun install --frozen-lockfile`, `bun run translate` (never fails the run), save the cache
6. `bun run changes`
7. `bun run validate`, then `bun test pipelines web/lib`
8. `bun scripts/data-changed.mjs ...`: is there a real change? Differences in `generatedAt` alone do not count
9. only if something changed: `bash scripts/commit-refresh.sh` commits `data/`, `ATTRIBUTION.md`, `research/P-live-ambtsdragers.json`, `research/P-live-ambtsdragers.md`, and `research/merge-log.entries.jsonl` to `main` as `github-actions[bot]` with the message `data: refresh <ISO date> [skip ci]`. If the push loses a race it rebases with `git pull --rebase` and retries, up to 5 times. A rebase conflict fails the run and publishes nothing; the next run starts from the new `main`.

Job `deploy` (permission: `contents: read`, runs only when job `refresh` committed a change): checks out the pushed commit, restores the Bun and Next.js caches, validates again, builds the web app (with `NEXT_PUBLIC_SITE_URL`), runs the contract check on `web/out/data/v1`, makes sure the Pages project `staatsgraaf` exists, and deploys with `bunx wrangler pages deploy web/out --project-name=staatsgraaf --branch=main`. When nothing changed, the whole run ends after step 8 with a green result: no commit, no build, no deploy.

Job `report-failure` (permission: `issues: write`): on any failure it opens or comments on one `ops` issue titled "Refresh mislukt"; if the issue API is unreachable it prints the same summary in the log.

The `nightly-refresh` concurrency group is shared with `deploy.yml`: two deployments never overlap, a queued run waits, and GitHub keeps only the newest pending run. The nightly `refresh.yml` was removed on 05-10-2026 because the 3-hourly run does everything it did.

### `deploy.yml`

Runs on a push to `main` and on demand. This is the fast path: it builds and deploys the committed dataset and does not refetch office holders or news. Steps: checkout, setup Bun and Node, restore the Bun and Next.js caches, `bun run validate`, `bun test pipelines web/lib`, the web build, the contract check, and the Wrangler deploy. It ignores pushes that only touch `docs/**`, `research/qa/**`, markdown files, or the workflow README (`paths-ignore`). It does not ignore `research/*.json` (the search index build reads it) or `LICENSE*` (the build serves them as `/data/v1/LICENSE*.txt`). The data commits that `news.yml` pushes do not start this workflow: GitHub does not create workflow runs for events caused by `GITHUB_TOKEN`, so the refresh run deploys its own commit.

### `ci.yml`

Runs on every pull request and on pushes to `main`. Steps:

1. checkout, setup Bun and Node 24 (Node only for Next.js and tsc)
2. `bun run validate`
3. `python3 scripts/format-dates.py --check` over every markdown file outside `research/raw/` and `ATTRIBUTION.md` (dates in documents are dd-MM-YYYY)
4. `bun run research:check`
5. `bun test pipelines web/lib`
6. `cd web && bun install --frozen-lockfile && bun run typecheck && bun run build`
7. `bun run contract web/public/data/v1`

No deploy, no secrets. It is the required status check to protect `main`.

### `link-check.yml`

Runs weekly (Mondays 04:23 UTC) and on demand. It builds the site and checks every internal link in the export and every source URL in `data/sources.json`. Reports go to the run artifacts; a persistent failure opens an `ops` issue. A moved source means the fetcher gets fixed, not that the fact is dropped.

## Caches

The Bun package cache is keyed on `web/bun.lock`. The Next.js build cache (`web/.next/cache`) is keyed on `web/bun.lock` plus the ISO week, with the lockfile-only and the bare prefixes as restore keys. It is restored and saved only in the job that builds. The reason, from the GitHub Actions documentation (docs.github.com, "Dependency caching reference", read 05-10-2026):

- a cache cannot be changed once its key exists ("You cannot change the contents of an existing cache"), so a key made only of the lockfile hash would freeze the cache at its first build;
- the cache total is capped at 10 GB per repository by default, and entries not accessed for 7 days are evicted, so a key per run (8 runs a day) would fill the cap and evict the translation cache.

One entry per week keeps the cache fresh and the total small. The data hash is deliberately not in the key: `data/` changes on almost every refresh, and Next invalidates only the pages whose inputs changed.

## Secrets and variables

Set these in **Settings > Secrets and variables > Actions**.

| Name | Kind | Purpose |
| --- | --- | --- |
| `CLOUDFLARE_API_TOKEN` | repository secret | Wrangler deploy. Cloudflare API token with Pages edit permission. |
| `CLOUDFLARE_ACCOUNT_ID` | repository secret | Cloudflare account for the Pages project. |
| `OPENCODE_API_KEY` | repository secret | News translation through OpenCode with Claude Haiku 5.5 (first choice). |
| `DEEPSEEK_API_KEY` | repository secret | News translation through DeepSeek direct (second choice). |
| `ANTHROPIC_API_KEY` | repository secret | News translation through Anthropic (third choice). |
| `NEXT_PUBLIC_SITE_URL` | repository variable | Absolute base URL for canonical, `robots.txt`, and `sitemap.xml`. Falls back to `https://staatsgraaf.pages.dev`. |
| `TRANSLATE_PROVIDER` | repository variable | Optional override of the translation provider. |
| `TRANSLATE_MODEL` | repository variable | Optional override of the translation model. |
| `GITHUB_TOKEN` | automatic | Pushes the data commit and opens the `ops` issue. Do not set it yourself. |

Never echo a secret. The workflows pass secrets only as step-level environment variables, and no step prints them. The Cloudflare credentials appear only in the Pages steps of the `deploy` job, which has read-only repository access.

## Self-hosted runner

The runner lives outside the repository, in `~/actions-runner`, with the label `staatsgraaf`. It is a LaunchAgent for the logged-in user. `~/actions-runner/.path` must be a single colon-separated PATH (the service script assigns the file to `PATH` as-is); include `/usr/bin` and `/opt/homebrew/bin` so `tar` and Homebrew `git` resolve. Apple's Xcode `git` hangs `git version` inside the service, so `brew install git` is required.

```sh
cd ~/actions-runner
./svc.sh status    # is it running?
./svc.sh stop      # stop taking jobs
./svc.sh start     # take jobs again
```

GitHub Settings > Actions > Runners shows it as Idle or Active. After a Mac reboot, log in once so launchd starts the agent. If a run sits on "Waiting for a runner", the machine is asleep or the service is down.

## Repository settings the workflows rely on

- **Actions > General > Workflow permissions:** read and write for `GITHUB_TOKEN` (the refresh job asks for `contents: write`, the report jobs for `issues: write`; every workflow starts from `permissions: {}`).
- **Branch protection on `main`:** require the `ci` check on pull requests, and allow `github-actions[bot]` to push without a pull request (the refresh commits straight to `main`).
- **Fork pull requests:** require approval for all outside contributors before their workflows run.
- Scheduled workflows on a public repository are automatically disabled when the repository has no activity for 60 days (GitHub documentation, "Disable and enable workflows", read 05-10-2026). The documentation does not say whether a commit pushed with `GITHUB_TOKEN` counts as activity, so this is not verified here. The refresh commits to `main` on most runs, which is the expected keep-alive; if the schedule is ever found disabled, enable it again under **Actions > refresh > Enable workflow** and look at the **Actions** tab banner.

## Run a manual refresh

1. Go to **Actions > refresh**.
2. Choose **Run workflow**, select `main`, and confirm.
3. Watch the run. On green with a deploy job the site is redeployed; on green without one nothing changed; on red read the failure summary and the `ops` issue.

To publish a code or data change without refetching, push to `main` (the `deploy` workflow runs) or use **Actions > deploy > Run workflow**.

## Roll back

Cloudflare Pages keeps every deployment as an immutable artifact. Two paths:

- **Redeploy the previous artifact.** Cloudflare dashboard > Pages > `staatsgraaf` > Deployments, find the last good deployment, and **Rollback to this deployment** (or redeploy it). This is the fastest path and does not touch the repo. The next scheduled run deploys the current `main` again, so also fix `main`.
- **Restore the previous data commit.** Revert the data change with a new commit (`git revert <sha>`); the push runs the `deploy` workflow. A bad fact is corrected with a new commit and a changelog entry, never a silent edit (`docs/09-content-and-ai-policy.md` section 8).

## Cloudflare Pages Free limits that matter

From https://developers.cloudflare.com/pages/platform/limits/ (page dated 05-09-2026, read 05-10-2026):

| Limit | Free plan | This project |
| --- | --- | --- |
| Builds per month | 500 | Cloudflare documents this for builds Pages runs from a Git push. This project deploys prebuilt output with Wrangler (direct upload), so Cloudflare runs no build. Worst case for the count anyway: 8 refresh deploys a day is about 248 a month, plus code pushes. |
| Files per site | 20,000 | 9,621 after `web/scripts/prune-export.mjs` (measured 05-10-2026; 26,165 before the prune). |
| File size | 25 MiB per file | The largest exported file is `personen/index.html` at 4.3 MiB (measured 05-10-2026). |
| `_headers` rules | 100 | `web/public/_headers` has 1 rule (`/*`). |

## Named gaps

1. **The Mac must be awake.** Scheduled refresh and link-check jobs are skipped while the machine sleeps. They run at the next scheduled tick after it wakes.
2. **Secrets and variables are not verifiable from a checkout.** The table above lists the names; the values live only in the repository settings.
3. **The refresh is not a fixed point yet.** On 05-10-2026 two consecutive local runs of `refresh-official`, `merge`, `news`, and `changes` produced different tenures for two ministers (closed, then open again). Until that is fixed in `pipelines/`, a refresh can commit on every run.
