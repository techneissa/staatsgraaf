import { test } from "node:test";
import assert from "node:assert/strict";

import {
  DEFAULT_NEWS_FILTERS,
  newsEntityHref,
  parseNewsFilters,
  sameNewsFilters,
  writeNewsFilters,
} from "./news-url-state.ts";

test("an empty query gives the default filters", () => {
  assert.deepEqual(parseNewsFilters(""), DEFAULT_NEWS_FILTERS);
  assert.deepEqual(parseNewsFilters("?"), DEFAULT_NEWS_FILTERS);
});

test("reads language, kind, outlet, entity and the show-all flag", () => {
  const state = parseNewsFilters("?taal=en&soort=krant&bron=Binnenlands+Bestuur&entity=person%3Adavid-van-weel&alles=1");
  assert.deepEqual(state, {
    language: "en",
    kind: "krant",
    publisher: "Binnenlands Bestuur",
    entity: "person:david-van-weel",
    showAll: true,
  });
});

test("a plain colon in the entity id is read too", () => {
  assert.equal(parseNewsFilters("?entity=person:david-van-weel").entity, "person:david-van-weel");
});

test("invalid values are ignored one by one", () => {
  const state = parseNewsFilters("?taal=fr&soort=nonsense&bron=&entity=%3Cscript%3E&alles=maybe");
  assert.deepEqual(state, DEFAULT_NEWS_FILTERS);
  assert.equal(parseNewsFilters("?taal=nl&soort=nonsense").language, "nl");
  assert.equal(parseNewsFilters("?bron=" + "x".repeat(200)).publisher, null);
  assert.equal(parseNewsFilters("?alles=0").showAll, false);
  assert.equal(parseNewsFilters("?alles=true").showAll, true);
});

test("an entity id needs a known kind prefix", () => {
  assert.equal(parseNewsFilters("?entity=org:ministerie-van-financien").entity, "org:ministerie-van-financien");
  assert.equal(parseNewsFilters("?entity=pos:minister-president").entity, "pos:minister-president");
  assert.equal(parseNewsFilters("?entity=topic:zorg").entity, "topic:zorg");
  assert.equal(parseNewsFilters("?entity=javascript:alert(1)").entity, null);
  assert.equal(parseNewsFilters("?entity=person:").entity, null);
});

test("defaults write nothing", () => {
  assert.equal(writeNewsFilters("", DEFAULT_NEWS_FILTERS), "");
  assert.equal(writeNewsFilters("?taal=en&alles=1", DEFAULT_NEWS_FILTERS), "");
});

test("writes only what differs from the defaults, in a fixed order", () => {
  const search = writeNewsFilters("", {
    language: "nl",
    kind: "krant",
    publisher: "de Volkskrant",
    entity: "person:david-van-weel",
    showAll: true,
  });
  assert.equal(search, "?taal=nl&soort=krant&bron=de+Volkskrant&entity=person%3Adavid-van-weel&alles=1");
});

test("keeps query parameters it does not own", () => {
  const search = writeNewsFilters("?utm_source=x&taal=nl", { ...DEFAULT_NEWS_FILTERS, showAll: true });
  assert.equal(search, "?utm_source=x&alles=1");
});

test("what is written reads back the same", () => {
  const state = { language: "en", kind: "online", publisher: "NL Times", entity: "org:politie", showAll: false };
  assert.deepEqual(parseNewsFilters(writeNewsFilters("", state)), state);
});

test("sameNewsFilters compares every field", () => {
  assert.equal(sameNewsFilters(DEFAULT_NEWS_FILTERS, { ...DEFAULT_NEWS_FILTERS }), true);
  assert.equal(sameNewsFilters(DEFAULT_NEWS_FILTERS, { ...DEFAULT_NEWS_FILTERS, showAll: true }), false);
  assert.equal(sameNewsFilters(DEFAULT_NEWS_FILTERS, { ...DEFAULT_NEWS_FILTERS, entity: "org:politie" }), false);
});

test("the entity link points at the list of the right language route", () => {
  assert.equal(newsEntityHref("person:david-van-weel"), "/nieuws/?entity=person%3Adavid-van-weel");
  assert.equal(newsEntityHref("person:david-van-weel", "en"), "/news/?entity=person%3Adavid-van-weel");
});
