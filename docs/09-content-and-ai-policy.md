# Content and AI policy

The reference uses language models to summarize news and draft descriptions. We do too, and because a sourced product lives or dies on trust, the use of AI is governed, disclosed, and reviewed. This document defines how every sentence that ships is written, checked, and corrected.

Read it with `01-vision-and-goals.md` (principles) and `08-acceptance-and-qa.md` (the gate that enforces this).

## 1. What this policy covers

- Entity and position descriptions.
- News summaries and their entity links.
- Change summaries.
- Topic descriptions.
- Any other prose a reader sees, including UI microcopy where it carries a factual claim.

## 2. The prime directive

A language model may compress, rewrite, and link facts that a source states. It may never introduce a fact a source does not state. If a model is unsure, the output is dropped or flagged, never guessed.

This is the same rule as the data pipeline: fetch, never recall. The model is a writer, not a source.

## 3. Where AI is used, and how

Every AI touchpoint is listed here with its guardrail. If a new touchpoint is added, it is added here first.

| Touchpoint | What the model does | Guardrail |
| --- | --- | --- |
| Entity description | Drafts two to four sentences from a legal source and an official page | A human or a checked agent confirms every claim against the cited source before it ships |
| News summary | Compresses one article into one to three sentences | The summary may only state what the article states, and every clause carries the article source |
| Entity linking | Tags entity mentions in a summary | Matched against the alias gazetteer, with a confidence threshold and a manual review list |
| Change summary | Writes a one-line description of a diff | Derived only from the dataset diff and its source, no outside knowledge |
| Topic description | Drafts a scope paragraph and keyword list | Reviewed against the responsible-entities list |

## 4. Description standards

Entity and position descriptions follow these rules.

- Length: two to four sentences for an organization, one to two for a position.
- Language: Dutch, plain, active voice, sentence case, no marketing tone.
- Content: what the body is, what it does, its legal basis where one exists, and its place in the structure.
- Sources: the enabling law and the official page are cited. The legal basis appears in the prose, the way the reference writes "established by the Act of ...".
- No adjectives that sell. No "belangrijk", "toonaangevend", "cruciaal" unless a source states it and it matters.
- No em dashes, no curly quotes, no headings inside a description. This matches the repo prose rules in `AGENTS.md`.

## 5. News summary standards

- One to three sentences, each traceable to the article.
- Entities linked inline using the entity id markup from `04-data-model.md`, never a free-text guess.
- A numbered citation maps to the article URL.
- If an article is ambiguous or the model is unsure which entity is meant, the link is omitted rather than guessed.
- No summary ships without a resolving source URL.

## 6. AI disclosure

- The site states plainly, on an About or Method page, that language models help summarize and describe, that every fact is traced to a source, and that humans or checked agents review what ships.
- Each AI-assisted block can point to its sources. The reader can always reach the raw source.
- We do not present model output as original reporting.

## 7. Review

- A review step sits between generation and publication for anything that will appear on the homepage: appointments, departures, and structural changes get a quick human or checked-agent pass.
- The nightly data diff is reviewed before it ships, because an unattended pipeline can confidently publish a wrong appointment. See `10-operations-runbook.md`.
- Descriptions are confirmed against their cited source once, at the merge gate, and only revisited when the source changes.

## 8. Corrections and changelog

- Every correction is logged with the old value, the new value, the date, and the reason, in a public changelog.
- A published fact is never silently edited. A reader who saw the old value can see what changed and why.
- The correction path is public: a contact address and a simple form or issue.
- Serious errors trigger a short note on the affected page for a period.

## 9. Tone and language

- Dutch, formal but not stiff. Use the register of good government communication, not of a startup.
- Sentence case. Straight quotes. No em dashes.
- Match the entity's own Dutch name exactly, and use the official abbreviation where a source uses it.
- Numbers and dates format as `nl-NL` at render only; the data stays ISO.

## 10. What never ships

- A factual claim with no source.
- A model-invented detail, however plausible.
- A portrait or image without a recorded license and credit.
- A summary that cannot be traced to an article.
- Prose copied from the reference site or from a news article.

## 11. Adding a new AI touchpoint

1. Write the touchpoint, its input, its output, and its guardrail into section 3.
2. State how its output traces to a source and how it is reviewed.
3. Add an acceptance check for it in `08-acceptance-and-qa.md`.
4. Only then implement it.
