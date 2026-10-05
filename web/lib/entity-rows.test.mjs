import { test } from "node:test";
import assert from "node:assert/strict";

import { mergeConnectionRows } from "./entity-rows.ts";

const person = (id) => ({ id, kind: "person", slug: id, name: id, href: `/personen/${id}/` });
const conn = (id, other, direction = "incoming") => ({
  id,
  type: "holds_position",
  direction,
  source: { source: "src:x", retrieved: "2026-01-01", confidence: "high" },
  other,
});

test("one person with three tenures becomes one row with three positions", () => {
  const a = person("person:a");
  const b = person("person:b");
  const rows = mergeConnectionRows(
    [conn("derived:t1", a), conn("derived:t2", b), conn("derived:t3", a), conn("derived:t4", a)],
    (c) => ({ positionId: `pos:${c.id}`, current: c.id !== "derived:t3" }),
  );
  assert.equal(rows.length, 2);
  assert.equal(rows[0].other.id, "person:a");
  assert.equal(rows[0].connections.length, 3);
  assert.deepEqual(
    rows[0].via.map((v) => v.positionId),
    ["pos:derived:t1", "pos:derived:t4", "pos:derived:t3"],
  );
});

test("the same position twice is listed once and counts as current when any tenure is", () => {
  const a = person("person:a");
  const rows = mergeConnectionRows([conn("x1", a), conn("x2", a)], (c) => ({ positionId: "pos:p", current: c.id === "x2" }));
  assert.equal(rows[0].via.length, 1);
  assert.equal(rows[0].via[0].current, true);
});

test("directions stay separate rows", () => {
  const a = person("person:a");
  const rows = mergeConnectionRows([conn("x1", a, "incoming"), conn("x2", a, "outgoing")]);
  assert.equal(rows.length, 2);
});
