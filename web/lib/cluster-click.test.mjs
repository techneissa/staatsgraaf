import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveCanvasClick } from "./cluster-click.ts";

const open = { selectedId: null, openCluster: "c1" };

test("a click on a member of the open cluster selects it and keeps the cluster open", () => {
  assert.deepEqual(resolveCanvasClick({ kind: "node", id: "m1", cluster: "c1" }, open), { select: "m1", open: "c1" });
});

test("switching members keeps the cluster open", () => {
  assert.deepEqual(
    resolveCanvasClick({ kind: "node", id: "m2", cluster: "c1" }, { selectedId: "m1", openCluster: "c1" }),
    { select: "m2", open: "c1" },
  );
});

test("clicking the selected member again clears the selection, cluster stays open", () => {
  assert.deepEqual(
    resolveCanvasClick({ kind: "node", id: "m1", cluster: "c1" }, { selectedId: "m1", openCluster: "c1" }),
    { select: null, open: "c1" },
  );
});

test("a stray click on the open grid is ignored, or selects the dot under it", () => {
  assert.deepEqual(resolveCanvasClick({ kind: "cluster", id: "c1", dot: null }, { selectedId: "m1", openCluster: "c1" }), {
    select: undefined,
    open: "c1",
  });
  assert.deepEqual(resolveCanvasClick({ kind: "cluster", id: "c1", dot: "m3" }, open), { select: "m3", open: "c1" });
});

test("a closed grid opens, on a dot it also selects that dot", () => {
  assert.deepEqual(resolveCanvasClick({ kind: "cluster", id: "c2", dot: null }, open), { select: null, open: "c2" });
  assert.deepEqual(resolveCanvasClick({ kind: "cluster", id: "c2", dot: "x" }, open), { select: "x", open: "c2" });
});

test("a mark outside the cluster folds it; the background folds it unless the click is on a member", () => {
  assert.deepEqual(resolveCanvasClick({ kind: "node", id: "o1", cluster: null }, open), { select: "o1", open: null });
  assert.deepEqual(resolveCanvasClick({ kind: "background", nearMember: null }, open), { select: null, open: null });
  assert.deepEqual(resolveCanvasClick({ kind: "background", nearMember: "m4" }, open), { select: "m4", open: "c1" });
  assert.deepEqual(resolveCanvasClick({ kind: "fractie" }, open), { select: null, open: null });
});
