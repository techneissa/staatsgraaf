import { test } from "node:test";
import assert from "node:assert/strict";

import { dayInWindow, parseChangeUrlState, serializeChangeUrlState } from "./change-url-state.ts";

const DAYS = [7, 30, 90];

test("a full valid query parses as given", () => {
  assert.deepEqual(parseChangeUrlState("?window=90&kind=vacancy&day=2026-09-20", DAYS), {
    window: 90,
    kind: "vacancy",
    day: "2026-09-20",
  });
});

test("no query gives the defaults", () => {
  assert.deepEqual(parseChangeUrlState("", DAYS), { window: 30, kind: "all", day: null });
});

test("an unknown kind falls back to all and keeps the rest", () => {
  assert.deepEqual(parseChangeUrlState("?kind=bogus&window=7", DAYS), { window: 7, kind: "all", day: null });
});

test("a window that is not offered falls back to 30", () => {
  assert.equal(parseChangeUrlState("?window=45", DAYS).window, 30);
  assert.equal(parseChangeUrlState("?window=abc", DAYS).window, 30);
});

test("the fallback window is the first offered one when 30 is missing", () => {
  assert.equal(parseChangeUrlState("?window=45", [7, 90]).window, 7);
});

test("a malformed or impossible day is null", () => {
  assert.equal(parseChangeUrlState("?day=20-09-2026", DAYS).day, null);
  assert.equal(parseChangeUrlState("?day=2026-02-31", DAYS).day, null);
  assert.equal(parseChangeUrlState("?day=", DAYS).day, null);
});

test("the search string may come without its question mark", () => {
  assert.equal(parseChangeUrlState("kind=departure", DAYS).kind, "departure");
});

test("dayInWindow keeps a day inside the window and drops one outside", () => {
  assert.equal(dayInWindow("2026-09-20", 30, "2026-10-01"), "2026-09-20");
  assert.equal(dayInWindow("2026-08-01", 30, "2026-10-01"), null);
  assert.equal(dayInWindow("2026-10-02", 30, "2026-10-01"), null);
  assert.equal(dayInWindow(null, 30, "2026-10-01"), null);
});

test("serialize writes only the parts that differ from the defaults", () => {
  assert.equal(serializeChangeUrlState({ window: 30, kind: "all", day: null }), "");
  assert.equal(
    serializeChangeUrlState({ window: 90, kind: "vacancy", day: "2026-09-20" }),
    "?window=90&kind=vacancy&day=2026-09-20",
  );
  assert.equal(serializeChangeUrlState({ window: 30, kind: "acting", day: null }), "?kind=acting");
});
