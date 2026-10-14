import { test } from "node:test";
import assert from "node:assert/strict";

import { peekClickAction, peekOutsidePointerCloses } from "./peek-swap.ts";

test("the same peek link closes, a different one replaces", () => {
  const a = { id: "a" };
  const b = { id: "b" };
  assert.equal(peekClickAction(null, a), "open");
  assert.equal(peekClickAction(undefined, a), "open");
  assert.equal(peekClickAction(a, a), "close");
  assert.equal(peekClickAction(a, b), "replace");
});

test("an outside pointer on another peek link does not close", () => {
  const inside = { id: "inside" };
  const panel = { contains: (node) => node === inside };
  const anchorEl = { id: "anchor", closest: (sel) => (sel === "a[data-peek]" ? anchorEl : null) };
  const anchor = { contains: (node) => node === anchorEl };
  const other = { closest: (sel) => (sel === "a[data-peek]" ? other : null) };
  const nested = { parentElement: other };
  const page = { closest: () => null };

  assert.equal(peekOutsidePointerCloses(other, panel, anchor), false);
  assert.equal(peekOutsidePointerCloses(nested, panel, anchor), false);
  assert.equal(peekOutsidePointerCloses(inside, panel, anchor), false);
  assert.equal(peekOutsidePointerCloses(anchorEl, panel, anchor), false);
  assert.equal(peekOutsidePointerCloses(page, panel, anchor), true);
  assert.equal(peekOutsidePointerCloses(null, panel, anchor), false);
});
