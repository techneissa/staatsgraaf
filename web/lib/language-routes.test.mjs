import { test } from "node:test";
import assert from "node:assert/strict";

import { isEnglishRoute, languageTwin } from "./language-routes.ts";

test("the news routes pair up in both directions", () => {
  assert.deepEqual(languageTwin("/nieuws/"), { nl: "/nieuws/", en: "/news/" });
  assert.deepEqual(languageTwin("/news/"), { nl: "/nieuws/", en: "/news/" });
  assert.deepEqual(languageTwin("/nieuws/bronnen/"), { nl: "/nieuws/bronnen/", en: "/news/sources/" });
  assert.deepEqual(languageTwin("/news/sources/"), { nl: "/nieuws/bronnen/", en: "/news/sources/" });
});

test("a day page keeps its date in the twin", () => {
  assert.deepEqual(languageTwin("/nieuws/2026-10-01/"), { nl: "/nieuws/2026-10-01/", en: "/news/2026-10-01/" });
  assert.deepEqual(languageTwin("/news/2026-10-01/"), { nl: "/nieuws/2026-10-01/", en: "/news/2026-10-01/" });
});

test("a path without a trailing slash still matches", () => {
  assert.deepEqual(languageTwin("/nieuws"), { nl: "/nieuws/", en: "/news/" });
});

test("pages with one route have no twin", () => {
  assert.equal(languageTwin("/"), null);
  assert.equal(languageTwin("/personen/rob-jetten/"), null);
  assert.equal(languageTwin("/nieuws/niet-een-datum/"), null);
  assert.equal(languageTwin(null), null);
});

test("only the English route counts as an English address", () => {
  assert.equal(isEnglishRoute("/news/"), true);
  assert.equal(isEnglishRoute("/news/2026-10-01/"), true);
  assert.equal(isEnglishRoute("/nieuws/"), false);
  assert.equal(isEnglishRoute("/personen/rob-jetten/"), false);
});
