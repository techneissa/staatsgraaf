import { test } from "node:test";
import assert from "node:assert/strict";
import { summariseAsOf } from "./graph-asof.ts";

const edges = [
  { validFrom: null, validTo: null },
  { validFrom: "2020-01-01", validTo: null },
  { validFrom: "2010-01-01", validTo: "2015-06-01" },
  {},
];

test("today hides nothing", () => {
  assert.deepEqual(summariseAsOf(edges, null), { total: 4, dated: 2, hidden: 0 });
});

test("a date before a relation began, or after it ended, hides it", () => {
  assert.equal(summariseAsOf(edges, "2005-01-01").hidden, 2);
  assert.equal(summariseAsOf(edges, "2012-01-01").hidden, 1);
  assert.equal(summariseAsOf(edges, "2016-01-01").hidden, 2);
});

test("undated relations are always drawn", () => {
  assert.equal(summariseAsOf([{}, { validFrom: null }], "1950-01-01").hidden, 0);
});
