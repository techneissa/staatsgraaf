import { test } from "node:test";
import assert from "node:assert/strict";

import { dayInWindow, parseChangeUrlState, serializeChangeUrlState } from "./change-url-state.ts";

const DAYS = [7, 30, 90];

test("a full valid query parses as given", () => {
  assert.deepEqual(parseChangeUrlState("?window=90&kind=vacancy&day=2026-09-20", DAYS), {
    window: 90,
    kind: "vacancy",
    day: "2026-09-20",
    view: "chronological",
    now: null,
  });
});

test("no query gives the defaults", () => {
  assert.deepEqual(parseChangeUrlState("", DAYS), { window: 30, kind: "all", day: null, view: "chronological", now: null });
});

test("an unknown kind falls back to all and keeps the rest", () => {
  assert.deepEqual(parseChangeUrlState("?kind=bogus&window=7", DAYS), { window: 7, kind: "all", day: null, view: "chronological", now: null });
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
  assert.equal(serializeChangeUrlState({ window: 30, kind: "all", day: null, view: "chronological", now: null }), "");
  assert.equal(
    serializeChangeUrlState({ window: 90, kind: "vacancy", day: "2026-09-20", view: "chronological", now: null }),
    "?window=90&kind=vacancy&day=2026-09-20",
  );
  assert.equal(serializeChangeUrlState({ window: 30, kind: "acting", day: null, view: "chronological", now: null }), "?kind=acting");
});

test("view=people parses; a bad view is ignored and the rest applies", () => {
  assert.equal(parseChangeUrlState("?view=people", DAYS).view, "people");
  assert.deepEqual(parseChangeUrlState("?window=90&view=bogus&kind=bogus", DAYS), {
    window: 90,
    kind: "all",
    day: null,
    view: "chronological",
    now: null,
  });
});

test("serialize writes view=people only when it is not the default", () => {
  assert.equal(serializeChangeUrlState({ window: 30, kind: "all", day: null, view: "people", now: null }), "?view=people");
  assert.equal(
    serializeChangeUrlState({ window: 90, kind: "all", day: null, view: "people", now: null }),
    "?window=90&view=people",
  );
});

test("now=acting and now=vacancy parse; an unknown now is ignored", () => {
  assert.equal(parseChangeUrlState("?now=acting", DAYS).now, "acting");
  assert.equal(parseChangeUrlState("?now=vacancy&window=7", DAYS).now, "vacancy");
  assert.equal(parseChangeUrlState("?now=bogus", DAYS).now, null);
  assert.equal(parseChangeUrlState("", DAYS).now, null);
});

test("a current-state list serializes as now only, without kind, day or view", () => {
  assert.equal(
    serializeChangeUrlState({ window: 30, kind: "appointment", day: "2026-09-20", view: "people", now: "acting" }),
    "?now=acting",
  );
  assert.equal(
    serializeChangeUrlState({ window: 90, kind: "all", day: null, view: "chronological", now: "vacancy" }),
    "?window=90&now=vacancy",
  );
});
