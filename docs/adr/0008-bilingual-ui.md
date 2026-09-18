# ADR 0008: Bilingual interface (Dutch and English)

Date: 18-09-2026
Status: accepted

## Context

The web app shipped Dutch-only (`html lang="nl"`, every UI string hardcoded in Dutch). The reference product is English-only; Staatsgraaf must serve both Dutch and English readers because the Dutch state is an international-facing subject and the news pipeline already tracks EN and NL outlets. Entity names stay Dutch in both languages by project rule; only interface copy translates.

A `[locale]` route refactor was rejected: the site is a static export with thousands of prerendered pages and Dutch slugs (`/organisaties/`, `/personen/`, `/nieuws/`) that are stable public URLs.

## Decision

Client-side translation with Dutch as the build-time default:

- `web/lib/i18n/locales.ts` defines `Locale = "nl" | "en"`, the default (`nl`), and the storage key `staatsgraaf-lang`.
- Dictionaries are split by area: `web/lib/i18n/dict-{common,graph,power,home,news,entity}.ts`, each `{ key: { nl, en } }`, merged in `dict-registry.ts`. Each build area owns its own dictionary file, which keeps parallel edits conflict-free.
- `components/i18n/language-provider.tsx` is a client provider that reads the stored locale after hydration and sets `document.documentElement.lang` accordingly. `components/i18n/use-t.ts` exposes `useT(area)` for client components. `components/i18n/t.tsx` exposes `T` (dictionary key) and `L` (per-use `nl`/`en` strings for one-off server-page copy) client components usable inside server components.
- Server pages keep rendering Dutch at build time; English applies after hydration. SEO metadata stays Dutch with `hreflang`-equivalent canonical URLs unchanged.
- `components/language-toggle.tsx` adds an NL/EN segmented control to the top bar.

## Consequences

Static prerendered HTML is Dutch, matching `lang="nl"` at load, so no flash of unstyled language for first paint; English readers see the interface swap in once the provider hydrates. Client bundles carry both dictionaries, adding a few kilobytes. New UI strings must be added as `{ nl, en }` pairs in the owning area's dictionary; a missing key renders the key name, which typecheck and visual review catch. The existing English-only `/news/` route remains as a static English news page; the bilingual dictionary supersedes its role for interface copy.
