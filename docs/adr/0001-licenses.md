# ADR 0001: Licenses for code and data

Date: 17-09-2026
Status: accepted (owner decision 18-09-2026: code MIT, dataset CC BY 4.0; amended 05-10-2026: code PolyForm Noncommercial 1.0.0; amended again 05-10-2026: code CC BY-NC-SA 4.0)

## Context

The repo publishes both software (pipelines, validator, later the web app) and a dataset compiled from official sources. Downstream reuse needs explicit licenses. Source licenses vary; workstream O produces the per-source determination.

## Decision

Proposed defaults, to be confirmed by the owner after workstream O reports:

- Code: MIT (alternative: Apache-2.0 if a patent grant is wanted).
- Dataset: CC0 1.0 (alternative: CC BY 4.0 if attribution is wanted).

Workstream O has now reported (`research/O-licenses.md`) and recommends a change: keep code MIT, but license the dataset **CC BY 4.0 instead of CC0**. Reason: CBS requires attribution, CPB is CC BY 3.0 NL and PBL CC BY 4.0, and workstream G used nl.wikipedia lists (CC BY-SA 4.0 with a database-rights waiver on facts). Those rows make a CC0 grant either impossible or misleading. The dataset can only be CC0 if the Wikipedia burgemeester and dijkgraaf rows are re-sourced to KB/Staatscourant and every image without a recorded license is excluded. O also flags that Defensie.nl is CC BY-SA 4.0 and the Eerste Kamer requires the source URL, the extraction date, and an annotation.

Recommended: code MIT, dataset CC BY 4.0. Owner decision still pending.

## Owner decision (18-09-2026)

The owner accepts the recommendation. Code is MIT. The dataset, descriptions, and summaries are CC BY 4.0. Attribution to the project and to the underlying source is required on reuse.

Applied per source in the Wave 2 pass (`pipelines/licenses.mjs`): every source gets an SPDX value from the `research/O-licenses.md` determination, with `unknown` for the O-declared gaps and `all-rights-reserved` for the news and site-prose hosts. Sources whose reuse right is a custom attribution right with no SPDX id (Eerste Kamer, rechtspraak.nl) are represented as `CC-BY-4.0`; the Eerste Kamer credit line is carried in the source notes. The full per-source list is `ATTRIBUTION.md`.

No license files ship until the owner decides. Facts themselves are not copyrightable; the compiled dataset, descriptions, and summaries are the licensed work.

## Consequences

Once decided, `LICENSE` and `LICENSE-DATA` ship and the README states the terms. Workstream O's table (`research/O-licenses.md`) informs the per-source application; the launch gate stays blocked until that application fills `data/sources.json` and 2129 `license: null` records are resolved.

## Amendment 05-10-2026: code moves to PolyForm Noncommercial

The owner decided on 05-10-2026 to make the repository public with source-available code and open data. The code license changes from MIT to the PolyForm Noncommercial License 1.0.0 (`PolyForm-Noncommercial-1.0.0`); `LICENSE` carries `Required Notice: Copyright (c) 2026 Staatsgraaf contributors`. The dataset license does not change: CC BY 4.0, because the sources are CC0 or CC BY.

Reason: MIT lets anyone resell the code as a commercial product; the owner wants the code readable and reusable for noncommercial purposes (personal, research, charitable, educational, government) and wants commercial use to need a separate agreement. The data stays free for any use because the project does not own the facts and the sources are open. Contributions follow the same split (`CONTRIBUTING.md` section 13). Copies of the code obtained under MIT before 05-10-2026 keep that license for the version obtained. What is and is not in the public repository, and the alternatives that were weighed, are in `docs/adr/0023-public-repository.md`.

## Amendment 05-10-2026 (second): code moves from PolyForm Noncommercial to CC BY-NC-SA 4.0

The owner decided later on 05-10-2026 that the code licence is Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International (CC BY-NC-SA 4.0, SPDX `CC-BY-NC-SA-4.0`), replacing the PolyForm Noncommercial License 1.0.0 from the first amendment above. `LICENSE` now carries a short header (project, copyright line `Copyright (c) 2026 Staatsgraaf contributors`, a plain-language summary, the credit line, and a note on third-party dependencies) followed by the unmodified legal code fetched from https://creativecommons.org/licenses/by-nc-sa/4.0/legalcode.txt. `data/meta.json`, the dataset manifest, both `package.json` files, the site, `README.md`, `CONTRIBUTING.md` section 13 and `ATTRIBUTION.md` state the new value. The dataset licence does not change: CC BY 4.0 (`LICENSE-DATA`, with only its reference to the code licence reworded).

Reasons. The owner wants two things: nobody forks the code to make a private or sold version, and anyone who takes something gives credit. CC BY-NC-SA 4.0 asks for exactly that. NonCommercial rules out sale and commercial use. ShareAlike requires an adaptation to carry the same licence, so a fork cannot be closed. Attribution requires credit, and the credit line is `Staatsgraaf (https://github.com/techneissa/staatsgraaf), CC BY-NC-SA 4.0`.

Honest limits, recorded so nobody reads more into the licence than it does:

- Creative Commons advises against using its licences for software. They have no patent grant and no provisions about source code (for example what counts as the preferred form for modification).
- CC BY-NC-SA 4.0 is not an open source licence as the Open Source Initiative defines it. The code is source-available. The README and the site never call it open source.
- GitHub lets anyone fork a public repository, whatever its licence. The licence does not stop a fork from existing. It restricts what the fork may be used for (noncommercial only) and requires credit and ShareAlike from whoever redistributes or adapts the code.
- "NonCommercial" is defined in the legal code as not primarily intended for or directed towards commercial advantage or monetary compensation. Borderline uses (a company's internal use, a nonprofit that earns fees) are open to interpretation.
- A licence change binds new copies only. Anyone who got the code under MIT or PolyForm Noncommercial before this change keeps that licence for the version obtained.
- This is not legal advice.

Third-party dependencies keep their own licences (Next.js, React, Radix UI, Tailwind CSS and morphicons are MIT; lucide is ISC with some icons MIT). They are not relicensed. The notice requirement is met by the header of `LICENSE` and by each package's own licence file.

Open point for a lawyer, without any change to the data licence. `data/sources.json` holds 378 source records licensed CC BY-SA 4.0 (and 34 more under CC BY-SA 3.0 and 2.0), for example the nl.wikipedia lists behind the mayor and dijkgraaf entries and Wikimedia Commons portraits. This ADR already decided how those are handled: facts are not copyrightable, the dataset licence covers only the project's own selection, structure, descriptions and summaries, and a source's own terms stay with the source record and with each photo (`LICENSE-DATA`, `ATTRIBUTION.md`, `data/media.json`). That decision stands. Whether the ShareAlike term of those sources reaches the compiled dataset (a database, not the facts) has not been confirmed by a lawyer. Photos keep their own licence and are not part of the CC BY grant. The code licence is separate from this question, because the code does not incorporate those sources.
