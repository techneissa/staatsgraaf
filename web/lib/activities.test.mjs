import { test } from "node:test";
import assert from "node:assert/strict";

import { ACTIVITY_KIND_ORDER, groupActivityItems } from "./activities.ts";

test("items group by kind in display order, newest first, with the file totals", () => {
  const items = [
    { id: "tk:2026Z1", kind: "schriftelijke-vragen", date: "2026-01-01" },
    { id: "tk:2026Z2", kind: "motie", date: "2026-02-01" },
    { id: "tk:2026Z3", kind: "motie", date: "2026-03-01" },
  ];
  const groups = groupActivityItems(items, { motie: 120, amendement: 4, "schriftelijke-vragen": 1 });
  assert.deepEqual(groups.map((g) => [g.kind, g.total, g.items.map((i) => i.id)]), [
    ["motie", 120, ["tk:2026Z3", "tk:2026Z2"]],
    ["amendement", 4, []],
    ["schriftelijke-vragen", 1, ["tk:2026Z1"]],
  ]);
  assert.deepEqual(items.map((i) => i.id), ["tk:2026Z1", "tk:2026Z2", "tk:2026Z3"]);
});

test("a kind with no total and no item is left out; totals never undercount the items", () => {
  const groups = groupActivityItems([{ id: "tk:2026Z9", kind: "wetsvoorstel", date: "2026-05-01" }], {});
  assert.deepEqual(groups.map((g) => [g.kind, g.total]), [["wetsvoorstel", 1]]);
  assert.equal(ACTIVITY_KIND_ORDER[0], "motie");
});
