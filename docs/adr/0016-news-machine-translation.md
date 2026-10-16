# ADR 0016: machine translation of news headlines and leads

- Date: 24-09-2026
- Status: accepted. The owner asked on 24-09-2026 for every Dutch news article to be readable in English, not only the English outlets.
- Supersedes: point 4 of `docs/adr/0007-news-outlets-and-languages.md` ("two languages, no machine translation yet"). Extends `docs/09-content-and-ai-policy.md` section 3.
- Amended by `docs/adr/0028-translation-model-haiku.md` (13-10-2026): the default provider and model in the provider list below are superseded; the rest of this ADR stands.

## Context

ADR 0007 kept machine translation off and left an English reader with about ten English items out of more than 1,500. It required a later ADR to name the engine, the cost, and the disclosure before translation could ship, because `docs/09` forbids a language model from adding a fact a source does not state. The owner has now asked for a full English version of the news section.

What we translate is already small and already shipped: the headline and the lead that the outlet's feed publishes. Nothing new is taken from an outlet. Images and article bodies stay out, as ADR 0007 point 7 requires.

## Decision

1. **Scope.** Every news item gets a translation of its headline and its lead into the other interface language: Dutch items into English, English items into Dutch. The lead is the item's `summaryMarkup` with the headline prefix removed. Nothing else is translated.
2. **Store.** Translations live in their own file, `data/news-translations.json`, one record per item and target language, with `title`, `lead`, `sourceLanguage`, `engine`, `method`, the date, and `sourceHash`: the first 12 hex characters of the SHA-256 of the headline and the summary markup. The news refresh never touches this file, and the web shows a translation only while its hash matches the current item, so a changed headline never shows a stale translation. A JSON schema and `scripts/validate.mjs` check that every record resolves to an item.
3. **Engine and automation.** Translation is automatic: every news run in CI (`.github/workflows/news.yml` and `refresh.yml`) runs `bun run translate` straight after the news fetch. It sends only new or changed items (no current hash match) to a language model, in batches, capped per run, with retries. The translations file is carried between runs in the Actions cache and merged with the committed file, so no item is translated twice. The provider is chosen by `TRANSLATE_PROVIDER`, or else by the first repository secret that is set, in this order:
   - `OPENCODE_API_KEY`: OpenCode Zen, `https://opencode.ai/zen/v1/chat/completions`, default model `deepseek-v4.1-flash` (0.30 dollar per million input tokens and 1.20 per million output tokens on https://opencode.ai/docs/zen/, checked 24-09-2026); `deepseek-v4-flash` is the cheaper option at 0.14 and 0.28. Recorded as `method: opencode-zen`. This is the default.
   - `DEEPSEEK_API_KEY`: the DeepSeek API, `https://api.deepseek.com`, model `deepseek-flash` (DeepSeek-V4.1-Flash, https://api-docs.deepseek.com/quick_start/pricing, checked 24-09-2026). Recorded as `method: deepseek-api`.
   - `ANTHROPIC_API_KEY`: the Anthropic Messages API with a small Claude model. Recorded as `method: anthropic-api`.

   Requests to DeepSeek models send `thinking: {type: "disabled"}`: with reasoning on, a tested request on 24-09-2026 spent its whole output budget on reasoning and returned no translation, so reasoning is off, and an empty reply counts as a failure. The repository variable `TRANSLATE_MODEL` overrides the model, for example to `deepseek-v4-flash`, and each record keeps the model id it was made with in `engine`. Without any key, or when the provider fails, the step logs the backlog and exits cleanly, the build goes on, and untranslated items show in their original language. Only public headlines and leads are sent to the provider. The backlog at decision time was translated once in a Claude Code session (`method: claude-code-session`, `engine: claude-opus-5-5`).
4. **Guardrail.** The prompt asks for a faithful translation only: no summarising, no additions, numbers, names, and quotes kept exact. Entity names stay Dutch (`CONTRIBUTING.md` section 6). Every `<entity id="...">` tag in the source lead must come back unchanged, including its inner text; a record that fails this check is dropped, not repaired.
5. **Disclosure.** A translated card carries a quiet "Translated from Dutch" or "Vertaald uit het Engels" label that links to the machine translation section of `/methodiek`, and a toggle that shows the original. `lang` attributes mark every text run with its real language. The source link always goes to the original article.
6. **Surfaces.** `/news/` and the English site locale show every item, translated where a valid translation exists. The language filter stays as an option; it no longer defaults English readers to English outlets only.

## Consequences

- An English reader sees the whole news section, with the original always one click away.
- Cadence: from 01-10-2026 the news run is every four hours (`15 */4 * * *`), next to the nightly refresh. It was hourly from 06:15 to 23:15 from 25-09-2026, but that used up the Actions minutes of the private repository. A run takes about three minutes. Since 05-10-2026 the single scheduled refresh runs every 3 hours and translates in the same run (ADR 0004, amendment 05-10-2026).
- Cost: the backlog cost no API spend. Each run translates only the new or changed items; at a few hundred short items a day on a small model this stays in the order of cents per day. Until one of the provider secrets is added, cost is zero and new items stay in their original language.
- A reader can tell a translation from an original on every card, which `docs/09` section 6 requires.
- Adding a language later is a new target value, not a new design.

## Amendment 1: descriptions (25-09-2026)

The owner asked on 25-09-2026 for the English version of the site to include the descriptions of organisations and people, not only the news. The same engine, guardrails, disclosure, and hash rule apply. Translations live in `data/description-translations.json`, one record per entity and target language, tied to the Dutch text by the first 12 hex characters of its SHA-256; a changed description hides its translation until a new one exists. The backlog of 341 descriptions was translated once in a Claude Code session; the `bun run translate` step in CI translates new or changed descriptions after that. Descriptions that only say where an entity was listed, instead of what it is, are flagged in `data/description-flags.json` and hidden rather than translated.

## Amendment 2: one disclosure line instead of a label per card (25-09-2026)

The owner decided on 25-09-2026 that translated news cards carry no text label. Instead, one short line above each news list (the news pages, the day pages and the home page) says that items in another language are machine translated, and links to the explanation on the About page. On each translated card, a translate icon switches between the translation and the original; its accessible name and tooltip say which it will show. `lang` attributes still mark the language of every text run, and the source link still goes to the original article. This replaces point 5 above; the aim of `docs/09` section 6, that a reader can tell a translation from an original, is met by the line, the icon and the original one tap away.

## Amendment 3: organisation pages drop the description disclosure (16-10-2026)

The owner asked on 16-10-2026 that organisation pages not show "Translated from Dutch" under the English description. Person pages, peeks and the bodies panel keep the line. `lang` attributes still mark each run. The translation itself is unchanged.

## Amendment 4: no "Translated from Dutch" line (16-10-2026)

The owner asked on 16-10-2026 that the phrase not appear on the site. English descriptions still swap in, marked `lang="en"`. The About page still explains machine translation. News cards keep the translate icon from amendment 2.
