import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

import { manifestFileCount, recordCount } from "./dataset-counts.ts";
import { REVEAL_ROOT_MARGIN, isOnScreen } from "./count-reveal.ts";

const DATA_DIR = fileURLToPath(new URL("../../data/", import.meta.url));

test("a list counts its records", () => {
  assert.equal(recordCount([]), 0);
  assert.equal(recordCount([{ id: "a" }, { id: "b" }, { id: "c" }]), 3);
});

test("an object-shaped file has no record count", () => {
  assert.equal(recordCount({ datasetVersion: "v1", sources: 2 }), null);
  assert.equal(recordCount({ records: [1, 2, 3] }), null);
  assert.equal(recordCount(null), null);
  assert.equal(recordCount("[]"), null);
});

test("the manifest count is the length of its file list", () => {
  assert.equal(manifestFileCount({ files: [{ name: "a" }, { name: "b" }] }), 2);
  assert.equal(manifestFileCount({ files: {} }), null);
  assert.equal(manifestFileCount({}), null);
  assert.equal(manifestFileCount(null), null);
});

test("every data file in data/ is a list except meta.json, and none counts as zero", () => {
  const names = readdirSync(DATA_DIR).filter((name) => name.endsWith(".json"));
  assert.ok(names.length > 20);
  for (const name of names) {
    const value = JSON.parse(readFileSync(join(DATA_DIR, name), "utf8"));
    const count = recordCount(value);
    if (name === "meta.json") assert.equal(count, null, name);
    else assert.ok(count !== null && count > 0, `${name} has records`);
  }
});

test("a card that is partly on screen counts up, including one at the bottom edge", () => {
  // The count-up once held a card at 0 while it sat in the bottom 8% of the
  // viewport: visible, but outside the observer's shrunk root, so it never fired.
  assert.equal(REVEAL_ROOT_MARGIN, "0px");
  assert.equal(isOnScreen(850, 970, 900), true);
  assert.equal(isOnScreen(-60, 40, 900), true);
  assert.equal(isOnScreen(900, 1020, 900), false);
  assert.equal(isOnScreen(-130, -10, 900), false);
});
