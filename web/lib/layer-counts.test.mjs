import { test } from "node:test";
import assert from "node:assert/strict";
import { countLayers, legendLayers } from "./layer-counts.ts";

const node = (branch, sector, subtype) => ({ branch, sector, subtype });

const nodes = [
  node("decentraal-lokaal", "gemeenten", "gemeente"),
  node("decentraal-lokaal", "gemeenten", "gemeente"),
  node("decentraal-lokaal", "gemeenten", "gemeenteraad"),
  node("decentraal-lokaal", "gemeenten", "commissie"),
  node("staten-generaal", "staten-generaal", "kamer"),
  node("staten-generaal", "frame", "kiesgerechtigden"),
  node("regering", "ministeries", "ministerie"),
  node("regering", "uitvoering", "uitvoeringsorganisatie"),
];

test("the legend and the panel read the same number for the same layer", () => {
  const counts = countLayers(nodes);
  assert.equal(counts.byBranch.get("decentraal-lokaal"), counts.bySector.get("gemeenten"));
  assert.equal(counts.byBranch.get("staten-generaal"), counts.bySector.get("staten-generaal"));
});

test("a layer counts organisations, hidden children included, not the real gemeenten", () => {
  const counts = countLayers(nodes);
  assert.equal(counts.byBranch.get("decentraal-lokaal"), 4);
  assert.equal(counts.municipalities, 2);
});

test("the electorate is the frame, not a body in a layer", () => {
  const counts = countLayers(nodes);
  assert.equal(counts.bySector.has("frame"), false);
  assert.equal(counts.byBranch.get("staten-generaal"), 1);
});

test("a branch that spans several sectors is the sum of them", () => {
  const counts = countLayers(nodes);
  assert.equal(counts.byBranch.get("regering"), (counts.bySector.get("ministeries") ?? 0) + (counts.bySector.get("uitvoering") ?? 0));
});

test("the real dataset: 342 gemeenten in a layer of 1091 organisations", async () => {
  const bundle = JSON.parse(await (await import("node:fs/promises")).readFile(new URL("../public/graph.json", import.meta.url), "utf8"));
  const counts = countLayers(bundle.nodes);
  assert.equal(counts.municipalities, 342);
  assert.equal(counts.bySector.get("gemeenten"), counts.byBranch.get("decentraal-lokaal"));
});

test("the legend lists the layers in order, with the gemeenten noted on their own layer", () => {
  const rows = legendLayers(nodes, ["staten-generaal", "regering", "decentraal-lokaal"]);
  assert.deepEqual(rows.map((row) => row.branch), ["staten-generaal", "regering", "decentraal-lokaal"]);
  assert.equal(rows[2].count, 4);
  assert.equal(rows[2].municipalities, 2);
  assert.equal(rows[0].municipalities, undefined);
});

test("a branch outside the order follows it alphabetically", () => {
  const rows = legendLayers([...nodes, node("zzz", "x", "a"), node("aaa", "y", "b")], ["regering"]);
  assert.deepEqual(rows.map((row) => row.branch), ["regering", "aaa", "decentraal-lokaal", "staten-generaal", "zzz"]);
});
