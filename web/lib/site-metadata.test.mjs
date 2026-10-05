import { test } from "node:test";
import assert from "node:assert/strict";

// SITE_URL is read when the module loads, so set it before the import.
process.env.NEXT_PUBLIC_SITE_URL = "https://staatsgraaf.example/";
const { pageMetadata } = await import("./site.ts");

test("a page with an English twin emits hreflang alternates and a canonical", () => {
  const meta = pageMetadata({
    title: "News",
    description: "d",
    path: "/news/",
    alternateLanguages: { nl: "/nieuws/", en: "/news/" },
  });
  assert.equal(meta.alternates.canonical, "https://staatsgraaf.example/news/");
  assert.deepEqual(meta.alternates.languages, {
    "nl-NL": "https://staatsgraaf.example/nieuws/",
    "en-GB": "https://staatsgraaf.example/news/",
    "x-default": "https://staatsgraaf.example/nieuws/",
  });
});

test("a page without a twin keeps the canonical only", () => {
  const meta = pageMetadata({ title: "Over", description: "d", path: "/methodiek/" });
  assert.deepEqual(meta.alternates, { canonical: "https://staatsgraaf.example/methodiek/" });
});
