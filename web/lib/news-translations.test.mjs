import { test } from "node:test";
import assert from "node:assert/strict";

import { newsSourceHash } from "./news-translations.ts";
import { translationSourceHash, newsLead } from "../../shared/news-translation-hash.mjs";
import { stripTitleFromMarkup } from "./news-text.ts";

const samples = [
  ["Kop", null],
  ["Kop", ""],
  ["Burgers en bureaucratie", 'Burgers en bureaucratie — De <entity id="org:gemeente-meerssen">gemeente Meerssen</entity> is enthousiast.'],
  ["Ünïcödé ‘quotes’ — dash", "Tekst met € en ĳ"],
];

test("the web hash matches the shared translation contract", () => {
  for (const [title, markup] of samples) {
    assert.equal(newsSourceHash(title, markup), translationSourceHash(title, markup));
    assert.equal(newsSourceHash(title, markup).length, 12);
  }
});

test("the web lead matches the shared newsLead", () => {
  for (const [title, markup] of samples) {
    assert.equal(stripTitleFromMarkup(markup, title), newsLead(markup, title));
  }
});
