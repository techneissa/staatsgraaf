import { test } from "node:test";
import assert from "node:assert/strict";

import { seatLinks, WHEEL_VOTERS } from "./wheel.ts";

const node = (id, parent = null, subtype = "overig") => ({ id, parent, subtype });

const bundle = {
  nodes: [
    node("org:kiesgerechtigden", null, "kiesgerechtigden-nederland"),
    node("org:tweede-kamer"),
    node("org:tk-commissie-fin", "org:tweede-kamer"),
    node("org:tk-commissie-def", "org:tweede-kamer"),
    node("org:gemeente-x"),
    node("org:gemeenteraad-x", "org:gemeente-x"),
  ],
  edges: [
    { from: "org:kiesgerechtigden", to: "org:tweede-kamer", type: "elects" },
    { from: "org:tweede-kamer", to: "org:ministerie", type: "oversees" },
  ],
  seatTies: {
    "person:a": [
      ["org:tk-commissie-def", "post"],
      ["org:tk-commissie-fin", "member"],
      ["org:gemeenteraad-x", "post"],
      ["org:tweede-kamer", "post"],
    ],
  },
};
const drawn = new Set(["org:tweede-kamer", "org:tk-commissie-fin", "org:tk-commissie-def", "org:gemeente-x", "org:ministerie"]);

test("a member's seat carries how the chamber is elected and their own posts, not the chamber's other ties", () => {
  const links = seatLinks(bundle, "person:a", "org:tweede-kamer", drawn);
  assert.deepEqual(links, [
    { other: "org:gemeente-x", type: "holds_post", outgoing: true },
    { other: "org:tk-commissie-def", type: "holds_post", outgoing: true },
    { other: "org:tk-commissie-fin", type: "member_of", outgoing: true },
    { other: WHEEL_VOTERS, type: "elects", outgoing: false },
  ]);
});

test("a member without posts on record keeps only the election tie", () => {
  assert.deepEqual(seatLinks(bundle, "person:b", "org:tweede-kamer", drawn), [{ other: WHEEL_VOTERS, type: "elects", outgoing: false }]);
});

test("a bewindspersoon on the kabinet bench carries only their own posts", () => {
  assert.deepEqual(seatLinks(bundle, "person:a", "org:tweede-kamer", drawn, false), [
    { other: "org:gemeente-x", type: "holds_post", outgoing: true },
    { other: "org:tk-commissie-def", type: "holds_post", outgoing: true },
    { other: "org:tk-commissie-fin", type: "member_of", outgoing: true },
  ]);
});
