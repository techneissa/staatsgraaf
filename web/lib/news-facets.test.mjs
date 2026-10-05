import { test } from "node:test";
import assert from "node:assert/strict";

import { newsFacets, rowMatches } from "./news-facets.ts";

const rows = [
  { kind: "krant", publisher: "NRC", language: "nl" },
  { kind: "krant", publisher: "NRC", language: "nl" },
  { kind: "krant", publisher: "AD", language: "nl" },
  { kind: "online", publisher: "NL Times", language: "en" },
  { kind: "online", publisher: "NU.nl", language: "nl" },
];
const base = { language: "all", kind: "all", publisher: null };

test("facets count kinds within the language and outlets within the kind", () => {
  const out = newsFacets(rows, { ...base, kind: "krant" });
  assert.equal(out.languageRows.length, 5);
  assert.deepEqual([...out.kindCounts.entries()], [["krant", 3], ["online", 2]]);
  assert.deepEqual(out.publishers, [["NRC", 2], ["AD", 1]]);
  assert.equal(out.activePublisher, null);
});

test("a language narrows kinds and outlets", () => {
  const out = newsFacets(rows, { ...base, language: "en" });
  assert.equal(out.languageRows.length, 1);
  assert.deepEqual(out.publishers, [["NL Times", 1]]);
});

test("an outlet that does not apply is not active", () => {
  assert.equal(newsFacets(rows, { ...base, kind: "krant", publisher: "NL Times" }).activePublisher, null);
  assert.equal(newsFacets(rows, { ...base, kind: "krant", publisher: "NRC" }).activePublisher, "NRC");
  assert.equal(newsFacets(rows, { ...base, publisher: "Bestaat niet" }).activePublisher, null);
});

test("rowMatches applies language, kind and the active outlet together", () => {
  const filters = { language: "nl", kind: "krant", publisher: null };
  assert.equal(rowMatches(rows[0], filters, null), true);
  assert.equal(rowMatches(rows[3], filters, null), false);
  assert.equal(rowMatches(rows[2], filters, "NRC"), false);
  assert.equal(rowMatches(rows[0], filters, "NRC"), true);
});
