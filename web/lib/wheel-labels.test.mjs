import { expect, test } from "bun:test";
import { WHEEL_TITLES_EN, localizeWheelModel } from "./wheel-labels.ts";

const model = {
  cells: [{ id: "a", title: "Commissies" }, { id: "b", title: "Tweede Kamer" }],
  groups: [{ id: "g", title: "Regering" }],
  wedges: [{ id: "leg", title: "Wetgevende macht", a0: 0, a1: 1 }],
  familyOf: {},
};

test("Dutch keeps the model as it is", () => {
  expect(localizeWheelModel(model, "nl")).toBe(model);
});

test("English translates the structural labels and leaves names of bodies and ids alone", () => {
  const en = localizeWheelModel(model, "en");
  expect(en.cells.map((cell) => cell.title)).toEqual(["Committees", "Tweede Kamer"]);
  expect(en.cells.map((cell) => cell.id)).toEqual(["a", "b"]);
  expect(en.groups[0].title).toBe("Government");
  expect(en.wedges[0]).toEqual({ id: "leg", title: "Legislative branch", a0: 0, a1: 1 });
});

test("every label has a different English value", () => {
  for (const [nl, en] of Object.entries(WHEEL_TITLES_EN)) expect(en).not.toBe(nl);
});
