import { test } from "node:test";
import assert from "node:assert/strict";

import { COMMON_DICT } from "./dict-common.ts";
import { GRAPH_DICT } from "./dict-graph.ts";
import { POWER_DICT } from "./dict-power.ts";
import { HOME_DICT } from "./dict-home.ts";
import { NEWS_DICT } from "./dict-news.ts";
import { ENTITY_DICT } from "./dict-entity.ts";
import { PAGES_DICT } from "./dict-pages.ts";
import { PANELS_DICT } from "./dict-panels.ts";

const AREAS = {
  common: COMMON_DICT,
  graph: GRAPH_DICT,
  power: POWER_DICT,
  home: HOME_DICT,
  news: NEWS_DICT,
  entity: ENTITY_DICT,
  pages: PAGES_DICT,
  panels: PANELS_DICT,
};

for (const [name, table] of Object.entries(AREAS)) {
  test(`${name}: every key has a non-empty nl and en value`, () => {
    for (const [key, entry] of Object.entries(table)) {
      assert.ok(entry, `${name}.${key} is undefined`);
      assert.equal(typeof entry.nl, "string", `${name}.${key}.nl must be a string`);
      assert.equal(typeof entry.en, "string", `${name}.${key}.en must be a string`);
      assert.ok(entry.nl.trim().length > 0, `${name}.${key}.nl is empty`);
      assert.ok(entry.en.trim().length > 0, `${name}.${key}.en is empty`);
      assert.notEqual(entry.nl, key, `${name}.${key}.nl fell back to the key name`);
      assert.notEqual(entry.en, key, `${name}.${key}.en fell back to the key name`);
    }
  });
}
