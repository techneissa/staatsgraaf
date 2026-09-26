# ADR 0020: tenures with an unknown start

- Date: 26-09-2026
- Status: accepted. On 26-09-2026 the owner reported that the Eerste Kamer committees on the wheel pointed "to nothing": they had no members, while the Tweede Kamer committees showed theirs. Asked how to record Eerste Kamer committee seats whose start the source does not give, the owner chose to allow an unknown start.

## Context

The Tweede Kamer publishes committee seats with their start dates in its OData API (`src:tk-odata-commissiezetels`). The Eerste Kamer publishes its committee rosters only on each committee's page on eerstekamer.nl, under "Leden": every member with their fractie, and the chair and vice-chair by role. The pages give no date on which a member joined. `tenure.start` was a required date, so these seats could not be recorded without inventing one, which the hard rule forbids.

## Decision

1. **`tenure.start` may be null.** Null means the source names the current holder but not when the tenure began. A tenure with a known start keeps it; nothing else changes meaning. `membership.start` stays required.
2. **The Eerste Kamer committee rosters are fetched, not recalled.** `pipelines/ek-commissies.mjs` reads the committee page each organisation's `website` points to, matches each member on the `/persoon/<slug>` link to the person whose Eerste Kamer membership cites that page, and writes a `pos:lid-<committee>` tenure per member and a chair or vice-chair tenure where the page names the role. A member it cannot match is reported and skipped. The positions already on record are used as they are.
3. **A seat no longer listed is closed on the retrieval date it was first seen missing.** That is the latest date it can have ended, not the day it did; the run stops without writing when more than three committee pages list no members, since that points to a changed layout.
4. **Readers show an unknown start plainly.** A period with no start reads "Huidig" ("Current") or "Tot <end>" ("Until <end>"), sorts as the oldest, and an appointment with no start is left off the changes timeline.

## Consequences

- On 26-09-2026 the run recorded 446 current tenures on 15 committees, every member matched. The Commissie voor de Geloofsbrieven has no standing roster (it is formed for each new member) and stays without members, a named gap.
- A picked Eerste Kamer committee on the wheel shows each member's seat, as the Tweede Kamer committees do.
- The run is manual for now (`bun pipelines/ek-commissies.mjs`, `--dry-run` to report only); adding it to the nightly refresh is a follow-up.
