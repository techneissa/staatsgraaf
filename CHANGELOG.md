# Changelog

All notable changes to this project are recorded here. The data schema follows the process in `docs/04-data-model.md` section 18; data changes are tracked per merge in `research/merge-log.md`.

## Unreleased

## 2026-09-18

- Phase 1 complete: all 15 research workstreams A to O (entities for regering, ministeries, rijksdiensten, ZBO's en RWT's, parlement, rechterlijke macht, hoge colleges en adviescolleges, decentraal, legal mapping, personen, nieuws en koppeling, topics, begroting, plus design, reference and license studies). Raw snapshots under `research/raw/`.
- Phase 2 complete: merged dataset under `data/` validated clean, all Phase 0 headline counts matched, alias gazetteer built, conflict decisions in `research/merge-log.md`, independent validator report 0 FAIL (`research/validation-report.md`).
- Phase 3 build: web app renders the merged dataset (homepage, organisation, position and person pages, topic and budget pages, change feed, graph explorer and power map); `pipelines/changes.mjs` derives 1269 changes; `pipelines/news.mjs` writes 1532 news items with 421 high-confidence entity links; 55 pipeline tests pass; static export builds.
- `docs/05` and `docs/08` amended for the study workstreams and the dated-role acceptance rule. `docs/adr/0002` records graph, change-feed and vacancy semantics.
- Open for the owner: dataset license (`docs/adr/0001`, recommended code MIT plus data CC BY 4.0) and the naming decision.

## 2026-09-17

- Phase 0 complete: endpoint verification (`research/00-endpoints.md`), state snapshot (`research/00-phase0-snapshot.md`), schema freeze (`schema/v1/`), validator (`scripts/validate.mjs`), shared contract (`shared/`),
  seed dataset for the current kabinet, the ministeries, and the parlement.
