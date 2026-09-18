# Diff engine specification

Nightly change classifier. It compares two dataset snapshots and writes `data/changes.json` as records shaped by `schema/v1/change.schema.json`. This document is the agreed rule set, written before the code, as `docs/06-build-plan.md` section 6 requires.

## 1. Inputs and output

- Previous snapshot: one dataset directory (the older `data/` snapshot).
- Current snapshot: one dataset directory (default `data/`).
- Output: `data/changes.json` inside the current snapshot directory, plus a summary on stdout.

The classifier reads `organizations.json`, `positions.json`, `people.json`, and `tenures.json` from both directories. Missing files count as empty. It reads `meta.json` from the current directory for the snapshot date. It never reads `news.json` or `changes.json`; the change stream is never its own input.

Entities are matched across snapshots by `id`, never by name. A name is data and can change; an id is the identity. This is what keeps a rename from being read as a departure plus an appointment.

## 2. Snapshot date

Each change carries a date.

- Appointment: the tenure `start`.
- Departure: the tenure `end`.
- Vacancy, structural, rename, move: the current snapshot date from `meta.json` (`snapshotId`), falling back to the run date when `meta.json` is absent.

## 3. Classification rules

| Rule | Detection | Kind | Date |
| --- | --- | --- | --- |
| A tenure appears | A tenure id is in the current snapshot and not in the previous one | `appointment` | tenure `start` |
| A tenure ends | The id is in both, previous `end` is null, current `end` is set | `departure` | tenure `end` |
| A position has no open tenure | The position has at least one open tenure (`end` null) in the previous snapshot and none in the current one | `vacancy` | snapshot date |
| A new organization | An organization id is in the current snapshot and not in the previous one | `structural` | snapshot date |
| A rename | The same id has a different organization `name`, or a different position `title` | `rename` | snapshot date |
| A move | The same organization id has a different `parent` or `partOf`, or the same position id has a different `organization` | `move` | snapshot date |

The `out` and `in` rows carry the outgoing and incoming tenure and person where they are known.

- Appointment `out`: the tenure named by `predecessor`, when it exists in either snapshot. Otherwise `{tenure: null, person: null, label: "Geen voorganger bekend"}`.
- Appointment `in`: the new tenure.
- Departure `out`: the ended tenure.
- Departure `in`: the tenure named by `successor`, or a tenure whose `predecessor` points at the ended tenure. Otherwise `{tenure: null, person: null, label: "Geen opvolger bekend"}`.
- Rename and move `out`/`in`: a label with the old and new name or parent. Tenure and person stay null because no seat changed.

## 4. Edge cases

- **Acting appointment.** A new tenure with `acting: true` is still an `appointment`. The summary marks it as waarnemend. It is not a separate kind, because the seat and the date are the same fact.
- **Renamed position.** The position id stays and the title changes, so the rule emits `rename`, not a departure plus an appointment. A rename never opens a vacancy.
- **Renamed organization.** The organization id stays and the name changes, so the rule emits `rename`. A slug change is a redirect record, not a diff kind, and does not appear here.
- **Reorganization.** A new parent, or a changed `partOf`, emits `move` for the moved body. A body that disappears and a new body that appears at the same time are two facts: they emit no change on their own unless a tenure or an organization id is new. When a position id is removed and a replacement id is added, the new tenure makes an `appointment`; the old position simply stops being diffed. The `succeeded_by` relation records the structural link at merge time, not here.
- **Simultaneous departure and vacancy.** When a tenure ends in the current snapshot, the position loses its last open tenure, so the same comparison can emit both `departure` and `vacancy`. That is intended: one says a person left, the other says the seat is now empty. The change consumer decides whether to show both.
- **Successor chain gap.** When `successor` is null but another tenure names this tenure as its `predecessor`, the diff uses that tenure as the successor. It never infers a successor from a shared position alone.
- **Removed position.** A position present only in the previous snapshot emits nothing. There is no reliable date for a removal in the data, and inventing one would break the source rule.
- **Concurrent holders.** A position with more than one open tenure is allowed. Vacancy only fires when the count of open tenures for the position reaches zero.
- **Memberships.** Seat-level memberships are not classified in this version. They are large-body seats and need their own diff rules; that is a later change to this specification.

## 5. Source rule

Every emitted change carries the `source` reference of the record that produced it: the tenure `source` for an appointment or departure, and the first `sources[]` entry for a vacancy, structural, rename, or move. When no source reference exists, the change is dropped rather than shipped unsourced. The no-source skip count is visible in the pipeline and belongs in the nightly review.

## 6. No-fabrication policy

When no previous snapshot is supplied, the engine writes `[]` to `data/changes.json` and prints that history was not fabricated. It does not treat the current data as a first snapshot with invented dates, and it does not infer ends from a successor, removals from absence, or a snapshot date for a fact whose own record carries no date. A gap in the previous snapshot stays a gap.

The engine derives only mechanical facts: an id appeared, an id ended, a field changed. It does not judge intent, does not assign a reason that the source does not state, and does not merge two changes into a narrative. A human or an agent reviews the diff before it ships, per `docs/07-workflow-and-roadmap.md` section 9.

## 7. Determinism

- Matching is by id.
- A change id is `change:<date>-<kind>-<entity-key>`, derived only from the date, the kind, and the affected entity. It is stable across runs of the same two snapshots.
- The output array is sorted by date, then by id, so a re-run produces a byte-identical file for the same input.

## 8. Out of scope

- No news, no topics, no budgets, no media diffs.
- No partial field diffs. A change reports the fact, not every altered field inside the record.
- No runtime scraping. The engine only reads two local snapshots.

## 9. Single-snapshot derivation (changes.mjs)

`pipelines/diff.mjs` is the nightly engine and needs two snapshots. `pipelines/changes.mjs` is the deterministic backfill that runs on the merged dataset alone, for the first build and whenever no previous snapshot exists. It reads the same four files (`organizations.json`, `positions.json`, `people.json`, `tenures.json`) plus `meta.json`, and writes the same `change.schema.json` shape.

The rules are the section 3 rules with the previous snapshot dropped, applied to the records that carry a date or a capacity:

| Rule | Detection in one snapshot | Kind | Date |
| --- | --- | --- | --- |
| Appointment | A tenure with a `start` | `appointment` | tenure `start` |
| Departure | A tenure with an `end` | `departure` | tenure `end` |
| Vacancy | A position with at least one tenure on record and fewer open tenures than `seatsCount` | `vacancy` | snapshot date |

- **Vacancy is seat level.** The two-snapshot engine fires vacancy when the open-tenure count reaches zero. The single-snapshot engine has no "before", so it reports a seat deficit: when `seatsCount` is known, `open < seatsCount` is one or more vacancies; when `seatsCount` is unknown, only a position with zero open tenures is a vacancy. A position with no tenure at all is left alone, because absence of a holder in the dataset is not evidence that the seat is empty. That gap is named, not guessed.
- **Source rule.** The section 5 rule applies unchanged. An appointment or departure without a tenure `source`, and a vacancy without a first `sources[]` entry, is dropped and counted.
- **Rename, move, structural.** These need a previous snapshot and are not emitted by the single-snapshot derivation. `diff.mjs` classifies them when a previous snapshot is supplied, and `diff.mjs` remains the source of truth for those kinds.
- **Out and in.** Appointment `out` is `predecessor` when the id resolves, otherwise `Geen voorganger bekend`. Departure `in` is `successor`, or a tenure that names the ended tenure as its `predecessor`, otherwise `Geen opvolger bekend`. Vacancy `out` and `in` are labels only, because no seat changes hands.
- **Id and order.** Section 7 is unchanged. The entity key is the position id, so an appointment, a departure, and a vacancy for the same seat stay grouped.
