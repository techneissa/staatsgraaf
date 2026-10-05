import { test } from "node:test";
import assert from "node:assert/strict";

process.env.NEXT_PUBLIC_SITE_URL = "https://staatsgraaf.example";
const { newsPageMetadata, newsRouteBase, NEWS_IN_LANGUAGE } = await import("./news-page.ts");

test("every news page names both language routes as hreflang alternates", () => {
  for (const [route, path] of [
    ["nl", "/nieuws/"],
    ["en", "/news/"],
    ["nl", "/nieuws/2026-10-01/"],
    ["en", "/news/2026-10-01/"],
    ["nl", "/nieuws/bronnen/"],
    ["en", "/news/sources/"],
  ]) {
    const meta = newsPageMetadata({ route, title: "t", description: "d", path });
    const languages = meta.alternates?.languages;
    assert.ok(languages, `${path} has alternates`);
    assert.ok(languages["nl-NL"].startsWith("https://staatsgraaf.example/nieuws/"), languages["nl-NL"]);
    assert.ok(languages["en-GB"].startsWith("https://staatsgraaf.example/news/"), languages["en-GB"]);
    assert.equal(languages["x-default"], languages["nl-NL"]);
    assert.equal(meta.alternates?.canonical, `https://staatsgraaf.example${path}`);
  }
});

test("og:locale follows the route", () => {
  assert.equal(newsPageMetadata({ route: "en", title: "t", description: "d", path: "/news/" }).openGraph?.locale, "en_GB");
  assert.equal(newsPageMetadata({ route: "nl", title: "t", description: "d", path: "/nieuws/" }).openGraph?.locale, "nl_NL");
});

test("route bases and JSON-LD languages", () => {
  assert.equal(newsRouteBase("nl"), "/nieuws");
  assert.equal(newsRouteBase("en"), "/news");
  assert.equal(NEWS_IN_LANGUAGE.nl, "nl-NL");
  assert.equal(NEWS_IN_LANGUAGE.en, "en-GB");
});
