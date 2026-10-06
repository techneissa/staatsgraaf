import { describe, expect, test } from "bun:test";
import { EMPTY_SELECTION, SELECTION_HISTORY_LIMIT, currentSelection, pathEntity, sameSelection, selectionOwnsPath, selectionReducer } from "./selection.ts";

const org = (id) => ({ kind: "org", id, surface: "graph" });
const run = (...actions) => actions.reduce(selectionReducer, EMPTY_SELECTION);

describe("selection history", () => {
  test("select pushes, back pops to the previous pick", () => {
    const state = run({ type: "select", selection: org("a") }, { type: "select", selection: org("b") });
    expect(currentSelection(state).id).toBe("b");
    expect(currentSelection(selectionReducer(state, { type: "back" })).id).toBe("a");
  });
  test("picking the current thing again adds no step", () => {
    const state = run({ type: "select", selection: org("a") }, { type: "select", selection: org("a") });
    expect(state.stack.length).toBe(1);
  });
  test("the surface does not make a different pick", () => {
    expect(sameSelection(org("a"), { kind: "org", id: "a", surface: "power" })).toBe(true);
  });
  test("picking the previous thing goes back instead of piling up", () => {
    const state = run(
      { type: "select", selection: org("a") },
      { type: "select", selection: org("b") },
      { type: "select", selection: org("a") },
    );
    expect(state.stack.map((s) => s.id)).toEqual(["a"]);
  });
  test("fracties compare by chamber and index", () => {
    const f = (chamberId, index) => ({ kind: "fractie", chamberId, index, surface: "graph" });
    expect(sameSelection(f("tk", 1), f("tk", 1))).toBe(true);
    expect(sameSelection(f("tk", 1), f("ek", 1))).toBe(false);
  });
  test("replace swaps without a step, clear empties, back on empty is a no-op", () => {
    let state = run({ type: "select", selection: org("a") }, { type: "replace", selection: org("b") });
    expect(state.stack.map((s) => s.id)).toEqual(["b"]);
    state = selectionReducer(state, { type: "clear" });
    expect(currentSelection(state)).toBe(null);
    expect(selectionReducer(state, { type: "back" })).toBe(state);
  });
  test("history is capped", () => {
    const actions = Array.from({ length: SELECTION_HISTORY_LIMIT + 5 }, (_, i) => ({ type: "select", selection: org(String(i)) }));
    expect(run(...actions).stack.length).toBe(SELECTION_HISTORY_LIMIT);
  });
});

describe("selection and the page", () => {
  const own = { kind: "org", id: "org:gemeente-amsterdam", surface: "graph" };
  test("the page's own entity is the page, not a pick for the URL", () => {
    expect(selectionOwnsPath(own, "/organisaties/gemeente-amsterdam/")).toBe(true);
    expect(selectionOwnsPath(org("org:provincie-noord-holland"), "/organisaties/gemeente-amsterdam/")).toBe(false);
    expect(selectionOwnsPath({ kind: "person", id: "person:rob-jetten", surface: "graph" }, "/personen/rob-jetten/")).toBe(true);
    expect(selectionOwnsPath({ kind: "sector", id: "gemeenten", surface: "graph" }, "/")).toBe(false);
    expect(selectionOwnsPath(null, "/")).toBe(false);
  });
  test("moving to another page drops a canvas pick, so no stale profile sits above it", () => {
    const state = run({ type: "select", selection: org("org:ministerie-van-defensie") });
    expect(currentSelection(selectionReducer(state, { type: "navigate", pathname: "/posities/minister-van-financien/" }))).toBe(null);
  });
  test("moving to the picked entity's own page keeps the pick, and drops the rest", () => {
    const state = run({ type: "select", selection: org("org:provincie-noord-holland") }, { type: "select", selection: own });
    const next = selectionReducer(state, { type: "navigate", pathname: "/organisaties/gemeente-amsterdam/" });
    expect(next.stack.map((entry) => entry.id)).toEqual(["org:gemeente-amsterdam"]);
  });
  test("nothing to drop is the same state", () => {
    expect(selectionReducer(EMPTY_SELECTION, { type: "navigate", pathname: "/begroting/" })).toBe(EMPTY_SELECTION);
    const state = run({ type: "select", selection: own });
    expect(selectionReducer(state, { type: "navigate", pathname: "/organisaties/gemeente-amsterdam/" })).toBe(state);
  });
});

describe("the entity a page stands for", () => {
  test("organisation, budget, person and party pages name their entity", () => {
    expect(pathEntity("/organisaties/gemeente-amsterdam/")).toEqual({ kind: "org", slug: "gemeente-amsterdam" });
    expect(pathEntity("/begroting/ministerie-van-financien/")).toEqual({ kind: "org", slug: "ministerie-van-financien" });
    expect(pathEntity("/personen/rob-jetten/")).toEqual({ kind: "person", slug: "rob-jetten" });
    expect(pathEntity("/partijen/d66/")).toEqual({ kind: "party", slug: "d66" });
    expect(pathEntity("/")).toBeNull();
    expect(pathEntity("/begroting/")).toBeNull();
    expect(pathEntity("/nieuws/2026-10-01/")).toBeNull();
  });
  test("a ministry's budget page owns the body pick, a party page owns its fractie", () => {
    expect(selectionOwnsPath(org("org:ministerie-van-financien"), "/begroting/ministerie-van-financien/")).toBe(true);
    expect(selectionOwnsPath(org("org:ministerie-van-financien"), "/begroting/ministerie-van-defensie/")).toBe(false);
    const fractie = { kind: "fractie", chamberId: "org:tweede-kamer", index: 3, surface: "graph", slug: "d66" };
    expect(selectionOwnsPath(fractie, "/partijen/d66/")).toBe(true);
    expect(selectionOwnsPath(fractie, "/partijen/vvd/")).toBe(false);
    // A fractie picked on the graph carries no slug and never belongs to a page.
    expect(selectionOwnsPath({ ...fractie, slug: undefined }, "/partijen/d66/")).toBe(false);
  });
  test("moving to a ministry's budget page keeps that body and drops the rest", () => {
    const state = run({ type: "select", selection: org("org:ministerie-van-financien") }, { type: "select", selection: org("org:ministerie-van-defensie") });
    const after = selectionReducer(state, { type: "navigate", pathname: "/begroting/ministerie-van-defensie/" });
    expect(after.stack.map((entry) => entry.id)).toEqual(["org:ministerie-van-defensie"]);
  });
});
