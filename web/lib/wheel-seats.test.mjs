import { test } from "node:test";
import assert from "node:assert/strict";

import { bodySeatLinks, seatLinks, WHEEL_VOTERS } from "./wheel.ts";

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

test("a body lists the people whose seats and posts land on it, so every seat tie shows from both ends", () => {
  const withB = { ...bundle, seatTies: { ...bundle.seatTies, "person:b": [["org:tk-commissie-fin", "member"]] } };
  assert.deepEqual(bodySeatLinks(withB, "org:tk-commissie-fin", drawn), [
    { other: "person:a", type: "member_of", outgoing: false },
    { other: "person:b", type: "member_of", outgoing: false },
  ]);
  // A body not drawn on its own stands in through the drawn body it belongs to.
  assert.deepEqual(bodySeatLinks(withB, "org:gemeente-x", drawn), [{ other: "person:a", type: "holds_post", outgoing: false }]);
  for (const person of ["person:a", "person:b"]) {
    for (const link of seatLinks(withB, person, "org:tweede-kamer", drawn)) {
      if (link.other === WHEEL_VOTERS) continue;
      assert.ok(bodySeatLinks(withB, link.other, drawn).some((back) => back.other === person), `${link.other} lists ${person}`);
    }
  }
});
