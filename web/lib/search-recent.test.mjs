import { test } from "node:test";
import assert from "node:assert/strict";

import { pushRecent } from "./search-recent.ts";

test("newest first, deduplicated ignoring case, capped at five", () => {
  let list = [];
  for (const query of ["zorg", "wonen", "Zorg", "duo", "bzk", "vng", "kamer"]) list = pushRecent(list, query);
  assert.deepEqual(list, ["kamer", "vng", "bzk", "duo", "Zorg"]);
});

test("one-letter and blank queries are not remembered", () => {
  assert.deepEqual(pushRecent(["zorg"], "a"), ["zorg"]);
  assert.deepEqual(pushRecent(["zorg"], "   "), ["zorg"]);
});
