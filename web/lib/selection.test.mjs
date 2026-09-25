import { describe, expect, test } from "bun:test";
import { EMPTY_SELECTION, SELECTION_HISTORY_LIMIT, currentSelection, sameSelection, selectionReducer } from "./selection.ts";

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
