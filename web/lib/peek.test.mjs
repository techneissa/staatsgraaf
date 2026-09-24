import { test } from "node:test";
import assert from "node:assert/strict";

import { normalizePeekRecord, peekHash, peekKindFor, peekShard, peekShardUrl, PEEK_SHARDS } from "./peek.ts";
import { initialsFor } from "./initials.ts";

test("peek shards are stable and in range", () => {
  assert.equal(peekHash("org:tweede-kamer"), peekHash("org:tweede-kamer"));
  for (const id of ["org:tweede-kamer", "person:dick-schoof", "pos:minister-president", "topic:wonen"]) {
    const shard = Number(peekShard(id));
    assert.ok(shard >= 0 && shard < PEEK_SHARDS);
    assert.match(peekShardUrl(id), /^\/peek\/\d{2}\.json$/);
  }
});

test("peek kind distinguishes places from other organisations", () => {
  assert.equal(peekKindFor("org:gemeente-meerssen", "gemeente"), "place");
  assert.equal(peekKindFor("org:raad-van-state", "hoge-college"), "organization");
  assert.equal(peekKindFor("person:x"), "person");
  assert.equal(peekKindFor("pos:x"), "position");
  assert.equal(peekKindFor("topic:x"), "topic");
  assert.equal(peekKindFor("party:x"), null);
});

test("normalizePeekRecord restores dropped defaults", () => {
  const record = normalizePeekRecord({ id: "person:x", kind: "person", name: "X", href: "/personen/x/", holders: [{ id: "a", name: "A", href: "/a/" }] });
  assert.equal(record.news, 0);
  assert.deepEqual(record.roles, []);
  assert.equal(record.holders[0].portrait, null);
  assert.equal(record.holders[0].acting, false);
});

test("initials use the first and last capitalised name parts", () => {
  assert.equal(initialsFor("Dick Schoof"), "DS");
  assert.equal(initialsFor("Hanneke van der Werf"), "HW");
  assert.equal(initialsFor("mona"), "M");
});
