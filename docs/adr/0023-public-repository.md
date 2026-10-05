# ADR 0023: public repository, source-available code, open data

- Date: 05-10-2026
- Status: accepted (owner decision 05-10-2026; amended 05-10-2026: code licence CC BY-NC-SA 4.0)
- Amends: ADR 0001 (licenses), ADR 0004 (hosting and CI)

## Context

The repository was private since the start (ADR 0004). Two things changed. GitHub Actions minutes are free for public repositories, and the scheduled refresh now runs every 3 hours (ADR 0004, amendment 05-10-2026), which a private repository on a capped plan could not carry. And the project is a public good: the dataset is meant to be reused, and readers should be able to read the code that produced it.

The owner wants the code to be readable and reusable for noncommercial purposes, but not free to resell as a commercial product. The dataset stays open for any use, because its sources are CC0 and CC BY.

## Decision

1. **The repository becomes public**, as a new repository built from a purged history (see the migration plan below).
2. **Code: PolyForm Noncommercial License 1.0.0** (SPDX `PolyForm-Noncommercial-1.0.0`), text from https://polyformproject.org/licenses/noncommercial/1.0.0/ (source: github.com/polyformproject/polyform-licenses, tag 1.0.0). `LICENSE` carries the line `Required Notice: Copyright (c) 2026 Staatsgraaf contributors`. It lets anyone use, change, and share the code for any noncommercial purpose, and names personal, research, charitable, educational, public-safety, and government use as permitted. Commercial use needs a separate licence from the project. This is source-available, not open source in the OSI sense; the README, the site, and `data/meta.json` say "source-available" and never "open source" for the code.
3. **Data: CC BY 4.0, unchanged** (`LICENSE-DATA`, `ATTRIBUTION.md`). The sources are CC0 or CC BY, so the compiled dataset, descriptions, and summaries stay free for any use with attribution.
4. **Contributions** come in under the same licences: code under PolyForm Noncommercial, data and documents under CC BY 4.0 (`CONTRIBUTING.md` section 13).
5. **Some things stay out of the public repository and its history:**

| Path | Why |
| --- | --- |
| `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, `.cursorrules`, `.claude/`, `STAATSGRAAF-PROMPT.md`, `NEXT-SESSION-PROMPT.md`, `NL-OVERHEID-GRAPH-PROMPT.md` | Instructions for the maintainer's coding agents. Not part of the product, and they name internal workflow. |
| `research/raw/` (528 MB) | A local cache of third-party pages. The pipelines refetch and recreate it. Republishing it would republish pages whose licences do not allow it (for example the Eerste Kamer images and site prose). |
| `docs/superpowers/` | Internal plans, specs, and audits. |
| `docs/10-operations-runbook.md` | Internal operating notes. The public operator notes are `.github/workflows/README.md`. |

6. **Two things inside `research/raw/` stay public**, because the code or the evidence needs them. `research/raw/portraits/licences/` holds the licence evidence ADR 0014 relies on. The pages are not republished in full: each file is a pointer record with the URL, the retrieval date, and the quoted licence sentence. `research/raw/portraits/review.json` is the hand review of portrait identities that `pipelines/portraits.mjs` reads as input (18 KB); it is curated data, not a cache. `.gitignore` carries the exemptions.

## Why this licence

PolyForm Noncommercial matches the stated wish (read and reuse, no commercial resale) in a text written by lawyers for exactly this case, so the project does not draft its own. Alternatives considered: MIT or Apache-2.0 (the previous choice, allows any commercial reuse and cannot be reversed for past copies); AGPL-3.0 (OSI open source, still allows commercial use); PolyForm Shield 1.0.0 (allows commercial use except competing products, the better fit if the owner later wants businesses to use the code); PolyForm Small Business (allows commercial use by small companies). Noncommercial is the owner's default and stays.

Limits to know: the code that the project wrote is the licensed work; third-party dependencies keep their own licences. A licence change binds new copies only; anyone who got the code under MIT before 05-10-2026 keeps those rights for that version. The repository has no contributor licence agreement, so licensing contributed code commercially to a third party would need each contributor's consent.

## Migration plan

GitHub keeps old commit SHAs reachable through `refs/pull/*` and forks even after a force push, so rewriting the existing repository does not purge it. The reliable purge is a new repository built from a rewritten history.

1. Merge all work into `main` of the private repository.
2. Make a fresh mirror clone and run `scripts/purge-history.sh` on it (git-filter-repo; it removes the paths in point 5 from every commit and prints the checks).
3. Create a new empty GitHub repository, push the purged history to it, and rename or archive the old private repository (or delete it once the new one is verified). If the new repository takes the name `techneissa/staatsgraaf`, the URLs in the site, the user-agent strings, and the README keep working.
4. Re-create the Actions secrets and variables in the new repository (names in `.github/workflows/README.md`), set the repository settings listed there, and run **Actions > refresh** once.
5. Point the Cloudflare Pages deploy credentials at the same project; the live site does not change.

## Consequences

- Anyone can read the pipelines, the validator, and the workflows. Secrets stay in Actions secrets only; the history was scanned for secrets and personal data before publication.
- The `/dataset/` and `/methodiek/` pages, the dataset manifest, and `data/meta.json` state the new licence. The manifest field `licenses.code` is now `PolyForm-Noncommercial-1.0.0`.
- Reports of wrong facts and security issues come in through the repository's issues and private vulnerability reporting (`CONTRIBUTING.md`, `SECURITY.md`).
- Links in public documents to the removed files were replaced by links to public documents. Mentions of `research/raw/` paths inside research reports and in `data/sources.json` notes name the local cache and are provenance, not links.
- Open question for the owner `(decide)`: whether to accept contributions only with a sign-off or a contributor licence agreement, if commercial licences for the code are ever offered.

## Amendment 05-10-2026: code licence is CC BY-NC-SA 4.0, not PolyForm Noncommercial

Point 2 of the decision and the section "Why this licence" named PolyForm Noncommercial 1.0.0. The owner replaced it on 05-10-2026 with CC BY-NC-SA 4.0 (SPDX `CC-BY-NC-SA-4.0`; legal code from https://creativecommons.org/licenses/by-nc-sa/4.0/legalcode.txt, in `LICENSE` below a short header). The repository is still public with source-available code and open data. Everything else in this ADR stands: the data licence (CC BY 4.0), the paths kept out of the repository, and the migration plan. Contributions (point 4) now come in under CC BY-NC-SA 4.0 for code and CC BY 4.0 for data and documents (`CONTRIBUTING.md` section 13). The manifest field `licenses.code` is now `CC-BY-NC-SA-4.0`.

Reason for the change. The owner wants nobody to fork the code to make a private or sold version, and wants credit when someone takes something. PolyForm Noncommercial restricted commercial use but required no credit beyond a notice line and had no ShareAlike term. CC BY-NC-SA 4.0 adds credit and requires adaptations to stay under the same licence.

What the licence does and does not do:

- GitHub allows a fork of any public repository regardless of licence. The licence does not prevent a fork. It limits what the fork may be used for and requires attribution and ShareAlike.
- Creative Commons advises against its licences for software: no patent grant and no source-code provisions. PolyForm was written for software. The owner accepted that trade for the credit and ShareAlike terms.
- CC BY-NC-SA 4.0 is not OSI open source, and the repository, README and site keep saying "source-available".
- Not legal advice. A lawyer should confirm the points listed in `docs/adr/0001-licenses.md`, second amendment of 05-10-2026, including whether ShareAlike data sources (378 CC BY-SA 4.0 source records) affect the compiled dataset. The data licence is not changed by this amendment.

Alternatives not taken: keep PolyForm Noncommercial (no credit or ShareAlike term), or PolyForm Shield, AGPL-3.0 or MIT (all allow commercial use). The consequence "no commercial licences are offered" stands. Offering one later needs a contributor licence agreement or each contributor's consent, as before.
