import { test } from "node:test";
import assert from "node:assert/strict";

import { agoPhrase, amsterdamDay, describeRecency, resolveReferenceDay } from "./change-clock.ts";

test("the build day is the calendar day in Nederland, not in UTC", () => {
  assert.equal(amsterdamDay(new Date("2026-10-05T10:00:00Z")), "2026-10-05");
  // 23:30 UTC on 4 October is already 5 October in Amsterdam (CEST, UTC+2).
  assert.equal(amsterdamDay(new Date("2026-10-04T23:30:00Z")), "2026-10-05");
  assert.equal(amsterdamDay(new Date("2026-12-31T23:30:00Z")), "2027-01-01");
});

test("the reference day is the build day, never earlier than the newest change", () => {
  assert.equal(resolveReferenceDay("2026-10-05", "2026-09-19"), "2026-10-05");
  assert.equal(resolveReferenceDay("2026-10-05", null), "2026-10-05");
  assert.equal(resolveReferenceDay("2026-10-05", "2026-10-07"), "2026-10-07");
});

test("recency counts from the reference day, not from the data snapshot", () => {
  const recency = describeRecency("2026-09-19", "2026-10-05", [7, 30, 90]);
  assert.deepEqual(recency, { date: "2026-09-19", age: 16, window: 30 });
});

test("the first window that holds the newest change is named, null when none does", () => {
  assert.equal(describeRecency("2026-10-05", "2026-10-05", [7, 30, 90])?.window, 7);
  // A window of 7 days holds offsets 0 to 6.
  assert.equal(describeRecency("2026-09-29", "2026-10-05", [7, 30, 90])?.window, 7);
  assert.equal(describeRecency("2026-09-28", "2026-10-05", [7, 30, 90])?.window, 30);
  assert.equal(describeRecency("2026-01-01", "2026-10-05", [7, 30, 90])?.window, null);
  assert.equal(describeRecency(null, "2026-10-05", [7, 30, 90]), null);
});

test("ago phrases for today, yesterday and older", () => {
  assert.deepEqual(agoPhrase(0), { key: "chgAgoToday" });
  assert.deepEqual(agoPhrase(1), { key: "chgAgoYesterday" });
  assert.deepEqual(agoPhrase(16), { key: "chgAgo", vars: { n: 16 } });
});
