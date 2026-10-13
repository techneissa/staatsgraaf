# ADR 0028: translation with Claude Haiku 5.5 through OpenCode

- Date: 13-10-2026
- Status: accepted. The owner asked on 13-10-2026 to switch the translation from DeepSeek V4.1 Flash to Claude Haiku 5.5 at effort medium (the work is translation only; a first pass ran at high), and to translate the existing backlog again with it while the OpenCode Go subscription is still active.
- Amends: `docs/adr/0016-news-machine-translation.md` (the default provider and model). Extends `docs/09-content-and-ai-policy.md` section 3.

## Context

ADR 0016 made OpenCode Zen with DeepSeek V4.1 Flash the default. The owner now wants Claude Haiku 5.5 at effort medium, because the work is translation only. Haiku 5.5 defaults to medium, so the explicit setting matches the default. OpenCode serves Haiku 5.5 on the Anthropic Messages endpoints, `https://opencode.ai/inference/v1/messages` (pay-as-you-go) and `https://opencode.ai/inference/go/v1/messages` (Go subscription). Sources: https://opencode.ai/v2/docs/console/models and https://opencode.ai/v2/docs/console/go, retrieved 13-10-2026. Effort is set with `output_config.effort`; Haiku 5.5 defaults to medium (https://platform.claude.com/docs/en/build-with-claude/effort, retrieved 13-10-2026).

The owner's existing OpenCode key works on both endpoints. A probe on 13-10-2026 sent one Haiku 5.5 request at effort high to each: the pay-as-you-go endpoint answered 200, the Go endpoint answered 200 with the session header, and the Go endpoint without it answered 400 `MissingSessionID`. No new key is needed.

## Decision

1. `opencode` (`OPENCODE_API_KEY`, pay-as-you-go) is the default provider. Model `claude-haiku-5-5`, Anthropic Messages endpoint, `output_config.effort` set to `medium`, JSON schema output. Records: `method: opencode-zen`, `engine: claude-haiku-5-5`.
2. `opencode-go` is a new provider: the same key on the Go endpoint, with an `x-opencode-session` header (one id per run, as the Go docs require) and a `staatsgraaf-translate/1.0` user agent. It is chosen only by name (`TRANSLATE_PROVIDER` or `--provider`), never by the auto-selection order. Records: `method: opencode-go`. The method enum in `schema/v1/news-translation.schema.json` and `schema/v1/description-translation.schema.json` accepts it.
3. `translate api --replace ENGINE` also translates again the current records made by `ENGINE`. The backlog uses `--replace deepseek-v4.1-flash --provider opencode-go`. Records made in Claude Code sessions (`claude-opus-5-5`, `claude-sonnet-5-5`) stay: a smaller model would lower their quality.
4. DeepSeek stays as a fallback provider (`DEEPSEEK_API_KEY`); its code and its records are unchanged.
5. Reader-facing text names no model. News labels say "Vertaald met AI" and "Translated with AI"; the method page says headlines and leads are translated "met AI" and "with AI". The model id stays in the data (`engine`, which the schema requires) and in this ADR, so the record stays auditable.
6. Descriptions use the same default provider, so new or changed description translations are made with Haiku 5.5. The existing description records are not replaced (see open points).

## Verification

- `bun test pipelines/translate.test.mjs`: 24 tests pass, including the Messages request shape (URL, effort, JSON schema), the Go session header, `--replace`, and the DeepSeek paths.
- Zen test on 13-10-2026: `--provider opencode --replace deepseek-v4.1-flash --max 2` translated 2 items in 1 request; both records pass the entity-tag check.
- Backlog: see the results section below.

## Cost

Prices per 1M tokens, checked 13-10-2026 on https://opencode.ai/v2/docs/console/models: `claude-haiku-5-5` $0.10 input and $0.50 output up to 100K context; `deepseek-v4.1-flash` $0.30 and $1.20. Go usage of Haiku draws on the Go monthly usage limit, not on Zen credit.

## Open points

- The owner cancels the Go subscription in about four days (around 17-10-2026). After that the pipeline uses the pay-as-you-go endpoint with the same key. Not yet verified after cancellation: one Zen call after cancelling.
- Three description translations made by DeepSeek (`method: opencode-zen`) stay in place. The `desc-*` commands have no `--replace` option yet, so they are a named gap.
- The scheduled news workflow (`.github/workflows/news.yml`) uses the `OPENCODE_API_KEY` secret and no `TRANSLATE_MODEL` or `TRANSLATE_PROVIDER` variable, so from the next run it translates new items with Haiku 5.5 on the pay-as-you-go endpoint.
