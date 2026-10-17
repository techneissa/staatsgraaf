import { test } from "node:test";
import assert from "node:assert/strict";

import { getPositionById } from "./data.ts";
import { unknownHolderGap } from "./holder-gap.ts";

test("a Wethouder with no tenure cites the municipal register, not the Gemeentewet", () => {
  const position = getPositionById("pos:wethouder-aa-en-hunze");
  assert.ok(position);
  const gap = unknownHolderGap(position);
  assert.equal(gap.key, "holdersNoneRegisterUnread");
  assert.equal(gap.sources.length, 1);
  assert.equal(gap.sources[0].source, "src:koop-medewerkers-gemeenten");
  assert.equal(
    gap.sources.some((ref) => ref.source === "src:gemeentewet"),
    false,
  );
});

test("a raadslid with no members cites the same municipal register", () => {
  const position = getPositionById("pos:raadslid-aa-en-hunze");
  assert.ok(position);
  const gap = unknownHolderGap(position);
  assert.equal(gap.key, "holdersNoneRegisterUnread");
  assert.equal(gap.sources[0].source, "src:koop-medewerkers-gemeenten");
});

test("an office with only a wet source does not pretend the law named holders", () => {
  const position = getPositionById("pos:eilandgedeputeerde-saba");
  assert.ok(position);
  const gap = unknownHolderGap(position);
  assert.equal(gap.key, "holdersNoneNoSource");
  assert.deepEqual(gap.sources, []);
});
