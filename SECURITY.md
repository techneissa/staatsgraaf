# Security policy

Staatsgraaf is a static, read-only publication. It has no user accounts, no runtime database, and no server-side request handling, so the attack surface is small. The remaining risks are the build pipeline, the sources it fetches, and any markup derived from those sources. This policy follows `docs/12-discovery-privacy-accessibility-security.md` Part 4 and `docs/10-operations-runbook.md` section 3.

## 1. What is in scope

- The published site and its static assets.
- The pipelines, the validator, and the supply chain that build the dataset and the site.
- The integrity of the published data: a fact that was altered outside the pipeline.
- The shared contract in `shared/` and the web app in `web/`.

A wrong fact is a data-correctness issue, not a security issue. It follows the correction path in `docs/09-content-and-ai-policy.md` section 8 and `CONTRIBUTING.md` section 12.

## 2. What is out of scope

- The external source websites and their infrastructure.
- Denial-of-service against the host or the CI provider.
- Reports without a concrete, reproducible issue, including scanner output with no impact statement.

## 3. How to report

The repository is private today, and no security contact address is published yet. That is a named gap. Once the repository is public, use the repository's private vulnerability reporting to file a report without opening a public issue.

Include what you can of the following:

- The affected URL, file, or pipeline step.
- Steps to reproduce, with the expected and the observed result.
- The impact, and any suggested fix.
- The environment, such as the browser, the Node.js version, or the commit.

Do not include real personal data or a working exploit against a live third party.

## 4. Response expectation

- We aim to acknowledge a report promptly and to confirm whether the issue is in scope.
- We investigate, ship a fix, and record the change in `CHANGELOG.md`.
- We will credit the reporter on request.
- No formal response-time guarantee is published yet. That is a named gap.

## 5. Secrets policy

- Pipeline API keys and any licensed-source key live only in the CI secret store, never in the repository.
- No secret ever reaches `data/`, a page, a log, or the client bundle.
- A secret is scoped to the one job that needs it. The deploy job does not receive feed keys.
- Rotate on a schedule and on any suspected exposure. The repository is intended to be public, so treat a leaked secret as compromised immediately.
- The site sets security headers, including HSTS and a Content Security Policy, in `web/public/_headers`. The policy and its named gaps are documented in `web/public/_headers.md`.

## 6. Supported versions

- The dataset and the schema are versioned `v1`. Only the current version is maintained.
- The site supports the current and previous major of Chrome, Edge, Firefox, and Safari, on desktop and mobile, per `docs/12-discovery-privacy-accessibility-security.md` Part 5.
- The site reads facts without JavaScript. The graph and search need JavaScript and say so.
