import { test } from "node:test";
import assert from "node:assert/strict";

import { buildHistogramBuckets } from "./change-buckets.ts";

const source = { source: "src:test", retrieved: "2026-10-01" };
const seat = (id, date, person, position) => ({
  id,
  date,
  kind: "appointment",
  position,
  organization: null,
  summary: id,
  source,
  in: { tenure: null, person, label: "A" },
});

test("a bulk day counts per person for the strip and per change in the text", () => {
  const changes = [
    seat("a1", "2026-09-09", "person:a", "pos:1"),
    seat("a2", "2026-09-09", "person:a", "pos:2"),
    seat("a3", "2026-09-09", "person:a", "pos:3"),
    seat("b1", "2026-09-09", "person:b", "pos:4"),
    seat("c1", "2026-09-10", "person:c", "pos:5"),
  ];
  const buckets = buildHistogramBuckets(changes, 30, "2026-10-05");
  assert.equal(buckets.length, 30);
  assert.equal(buckets.at(-1).date, "2026-10-05");
  const bulk = buckets.find((bucket) => bucket.date === "2026-09-09");
  assert.equal(bulk.count, 2);
  assert.equal(bulk.changes, 4);
  assert.equal(bulk.people, 2);
  assert.equal(bulk.byKind.appointment, 2);
  assert.equal(bulk.changesByKind.appointment, 4);
  const quiet = buckets.find((bucket) => bucket.date === "2026-09-20");
  assert.equal(quiet.count, 0);
  assert.equal(quiet.changes, 0);
});
