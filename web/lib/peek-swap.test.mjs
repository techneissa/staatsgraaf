import { test } from "node:test";
import assert from "node:assert/strict";

import { peekClickAction, peekOutsidePointerCloses, swallowNextClick } from "./peek-swap.ts";

test("the same peek link closes, a different one replaces", () => {
  const a = { id: "a" };
  const b = { id: "b" };
  assert.equal(peekClickAction(null, a), "open");
  assert.equal(peekClickAction(undefined, a), "open");
  assert.equal(peekClickAction(a, a), "close");
  assert.equal(peekClickAction(a, b), "replace");
});

test("an outside pointer closes, including on another peek link", () => {
  const inside = { id: "inside" };
  const panel = { contains: (node) => node === inside };
  const anchorEl = { id: "anchor" };
  const anchor = { contains: (node) => node === anchorEl };
  const other = { id: "other" };
  const page = { id: "page" };

  assert.equal(peekOutsidePointerCloses(other, panel, anchor), true);
  assert.equal(peekOutsidePointerCloses(inside, panel, anchor), false);
  assert.equal(peekOutsidePointerCloses(anchorEl, panel, anchor), false);
  assert.equal(peekOutsidePointerCloses(page, panel, anchor), true);
  assert.equal(peekOutsidePointerCloses(null, panel, anchor), false);
});

test("swallowNextClick blocks the next click and then lifts", () => {
  const listeners = new Map();
  const root = {
    addEventListener(type, fn, capture) {
      listeners.set(type, { fn, capture });
    },
    removeEventListener(type) {
      listeners.delete(type);
    },
  };
  let later = null;
  swallowNextClick(root, (fn) => {
    later = fn;
  });
  const event = {
    preventDefault() { event.prevented = true; },
    stopPropagation() { event.stopped = true; },
    stopImmediatePropagation() { event.immediate = true; },
    prevented: false,
    stopped: false,
    immediate: false,
  };
  listeners.get("click").fn(event);
  assert.equal(event.prevented, true);
  assert.equal(event.stopped, true);
  assert.equal(event.immediate, true);
  assert.equal(listeners.get("click").capture, true);
  assert.equal(listeners.get("pointerup").capture, true);
  later();
  assert.equal(listeners.has("click"), false);
  assert.equal(listeners.has("pointerup"), false);
});
