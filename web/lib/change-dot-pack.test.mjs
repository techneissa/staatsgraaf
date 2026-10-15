import { test } from "node:test";
import assert from "node:assert/strict";

import { filterByKind, packDayDots, packedCount, STRIP_ROWS } from "./change-dot-pack.ts";

const empty = { appointment: 0, acting: 0, departure: 0, vacancy: 0, other: 0 };

test("a quiet day packs to no columns", () => {
  assert.deepEqual(packDayDots(empty), []);
  assert.equal(packedCount([]), 0);
});

test("one vacancy is one mark on the baseline", () => {
  const columns = packDayDots({ ...empty, vacancy: 1 });
  assert.deepEqual(columns, [["vacancy"]]);
});

test("a bulk day fills columns from the baseline, nine marks high", () => {
  const columns = packDayDots({ ...empty, departure: 27 });
  assert.equal(columns.length, 3);
  assert.equal(columns[0].length, STRIP_ROWS);
  assert.equal(columns[1].length, STRIP_ROWS);
  assert.equal(columns[2].length, STRIP_ROWS);
  assert.ok(columns.every((col) => col.every((kind) => kind === "departure")));
  assert.equal(packedCount(columns), 27);
});

test("kinds keep their order: appointments, then acting, then departures", () => {
  const columns = packDayDots({ ...empty, appointment: 2, acting: 1, departure: 1 }, 3);
  assert.deepEqual(columns, [["appointment", "appointment", "acting"], ["departure"]]);
});

test("a kind filter hides the other marks", () => {
  const day = { ...empty, departure: 27, vacancy: 1 };
  assert.equal(packedCount(packDayDots(filterByKind(day, "vacancy"))), 1);
  assert.equal(packedCount(packDayDots(filterByKind(day, "departure"))), 27);
  assert.equal(packedCount(packDayDots(filterByKind(day, "appointment"))), 0);
  assert.equal(packedCount(packDayDots(filterByKind(day, "all"))), 28);
});
