import { test } from "node:test";
import assert from "node:assert/strict";
import { orgTies } from "./org-ties.ts";

const nodes = [
  { id: "defensie", parent: null },
  { id: "paresto", parent: "defensie" },
  { id: "dienst", parent: "defensie" },
  { id: "onderdeel", parent: "dienst" },
];
const byId = new Map(nodes.map((node) => [node.id, node]));
const adjacency = new Map([
  ["defensie", ["dienst", "extern"]],
  ["dienst", ["defensie"]],
]);
const source = { nodes, byId, adjacency };

test("a body with only a parent has one connection, not zero", () => {
  const ties = orgTies(source, "paresto");
  assert.equal(ties.parent, "defensie");
  assert.equal(ties.connections, 1);
});

test("a body reached two ways counts once", () => {
  const ties = orgTies(source, "defensie");
  // dienst is both a related body and a child, paresto is a child, extern is related.
  assert.deepEqual(ties.children.sort(), ["dienst", "paresto"]);
  assert.equal(ties.connections, 3);
});

test("parent, children and relations all count", () => {
  assert.equal(orgTies(source, "dienst").connections, 2);
});

test("a body with no ties has none", () => {
  assert.equal(orgTies({ nodes: [{ id: "x", parent: null }], byId: new Map([["x", { parent: null }]]), adjacency: new Map() }, "x").connections, 0);
});

test("a parent that is not in the graph is not a connection", () => {
  const lone = { nodes: [{ id: "x", parent: "gone" }], byId: new Map([["x", { parent: "gone" }]]), adjacency: new Map() };
  assert.equal(orgTies(lone, "x").connections, 0);
});
