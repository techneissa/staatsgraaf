import { test } from "node:test";
import assert from "node:assert/strict";

import { mergeConnectionRows, splitConnectionTree, withoutDerived } from "./entity-rows.ts";

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

test("the tree puts parents above and offices below", () => {
  const parent = { id: "org:jenv", kind: "organization", slug: "jenv", name: "JenV", href: "/organisaties/jenv/" };
  const head = { id: "pos:chair", kind: "position", slug: "chair", name: "Voorzitter", href: "/posities/chair/" };
  const office = { id: "pos:pg", kind: "position", slug: "pg", name: "PG", href: "/posities/pg/" };
  const overseen = { id: "org:loket", kind: "organization", slug: "loket", name: "Loket", href: "/organisaties/loket/" };
  const tree = splitConnectionTree([
    { ...conn("rel:oversees", overseen, "outgoing"), type: "oversees" },
    { ...conn("rel:office", office, "incoming"), type: "office" },
    { ...conn("rel:part", parent, "outgoing"), type: "part_of" },
    { ...conn("rel:head", head, "incoming"), type: "dept_head" },
  ]);
  assert.deepEqual(
    tree.above.map((branch) => branch.key),
    ["part_of:outgoing"],
  );
  assert.deepEqual(
    tree.below.map((branch) => branch.key),
    ["dept_head:incoming", "office:incoming", "oversees:outgoing"],
  );
  assert.equal(tree.above[0].rows[0].other.name, "JenV");
});

test("a position's organisation sits above it", () => {
  const org = { id: "org:om", kind: "organization", slug: "om", name: "OM", href: "/organisaties/om/" };
  const tree = splitConnectionTree([{ ...conn("rel:head", org, "outgoing"), type: "dept_head" }]);
  assert.equal(tree.above[0].key, "dept_head:outgoing");
  assert.equal(tree.below.length, 0);
});

test("derived tenures leave the tab, sourced relations stay", () => {
  const a = person("person:a");
  const kept = conn("rel:1", a);
  const derived = conn("derived:tenure:1", a);
  const member = { ...conn("derived:membership:1", a), type: "member_of" };
  assert.deepEqual(withoutDerived([kept, derived, member], ["holds_position"]), [kept, member]);
  assert.deepEqual(withoutDerived([kept, derived, member], ["holds_position", "member_of"]), [kept]);
});
