import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { COMMON_DICT } from "./dict-common.ts";
import { GRAPH_DICT } from "./dict-graph.ts";
import { POWER_DICT } from "./dict-power.ts";
import { HOME_DICT } from "./dict-home.ts";
import { NEWS_DICT } from "./dict-news.ts";
import { ENTITY_DICT } from "./dict-entity.ts";
import { PAGES_DICT } from "./dict-pages.ts";
import { PANELS_DICT } from "./dict-panels.ts";

/**
 * An English value that equals its Dutch value is usually a missing
 * translation. Legitimate cases (proper names, abbreviations, words that are
 * the same in both languages) are listed with a reason in same-in-both.json.
 */
const ALLOW = JSON.parse(readFileSync(new URL("./same-in-both.json", import.meta.url), "utf8"));

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

/** True when a value has words to translate once its {placeholders} are removed. */
function hasWords(value) {
  return /\p{L}{2,}/u.test(value.replace(/\{[^}]*\}/g, ""));
}

test("every English dictionary value differs from its Dutch value, or is allowlisted", () => {
  const untranslated = [];
  for (const [area, table] of Object.entries(AREAS)) {
    for (const [key, entry] of Object.entries(table)) {
      if (entry.nl.trim() !== entry.en.trim() || !hasWords(entry.nl)) continue;
      if (Object.hasOwn(ALLOW, `${area}.${key}`)) continue;
      untranslated.push(`${area}.${key}: ${JSON.stringify(entry.en)}`);
    }
  }
  assert.deepEqual(untranslated, [], `English equals Dutch; translate it or add it to same-in-both.json:\n${untranslated.join("\n")}`);
});

test("the allowlist names only keys that exist and still match", () => {
  for (const [id, reason] of Object.entries(ALLOW)) {
    const [area, key] = id.split(".");
    const entry = AREAS[area]?.[key];
    assert.ok(entry, `${id} is in same-in-both.json but not in a dictionary`);
    assert.equal(entry.nl.trim(), entry.en.trim(), `${id} is translated now; remove it from same-in-both.json`);
    assert.ok(typeof reason === "string" && reason.trim() !== "", `${id} needs a reason`);
  }
});
