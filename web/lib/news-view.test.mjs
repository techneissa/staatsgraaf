import { test } from "node:test";
import assert from "node:assert/strict";

import { resolveNewsPreview, toNewsItemView } from "../components/news/news-view.ts";

const base = {
  entities: [],
  publisher: "Voorbeeldkrant",
  publisherKind: "online",
};

test("a licensed media image wins and is not remote", () => {
  const preview = resolveNewsPreview({
    image: { url: "/media/nieuws/x.jpg", caption: "Beeld: X, CC0-1.0", remote: false },
    ...base,
  });
  assert.deepEqual(preview, {
    kind: "image",
    url: "/media/nieuws/x.jpg",
    caption: "Beeld: X, CC0-1.0",
    remote: false,
  });
});

test("a feed-supplied image URL becomes a remote preview credited to the outlet", () => {
  const preview = resolveNewsPreview({
    image: { url: "https://example.org/a.jpg", caption: "Voorbeeldkrant", remote: true },
    ...base,
  });
  assert.deepEqual(preview, {
    kind: "image",
    url: "https://example.org/a.jpg",
    caption: "Voorbeeldkrant",
    remote: true,
  });
});

test("without any image the preview falls back to the outlet monogram", () => {
  const preview = resolveNewsPreview({ image: null, ...base });
  assert.equal(preview.kind, "monogram");
});

test("toNewsItemView exposes a feed image as a remote preview and keeps image null", () => {
  const view = toNewsItemView(
    {
      id: "news:voorbeeld",
      title: "Kabinet presenteert plan",
      url: "https://example.org/nieuws/plan",
      publisher: "Voorbeeldkrant",
      published: "2026-09-18T08:00:00.000Z",
      summary: null,
      summaryMarkup: null,
      entities: [],
      topics: [],
      keywords: [],
      image: null,
      imageUrl: "https://example.org/a.jpg",
      sources: [{ source: "src:voorbeeld", retrieved: "2026-09-18", confidence: "high" }],
    },
    "nl",
  );
  assert.equal(view.image, null);
  assert.deepEqual(view.preview, {
    kind: "image",
    url: "https://example.org/a.jpg",
    caption: "Voorbeeldkrant",
    remote: true,
  });
});

test("toNewsItemView flags an item as relevant only when it names an entity or a topic", () => {
  const raw = {
    id: "news:flag",
    title: "Kabinet presenteert plan",
    url: "https://example.org/nieuws/plan",
    publisher: "Voorbeeldkrant",
    published: "2026-09-18T08:00:00.000Z",
    summary: null,
    summaryMarkup: null,
    entities: [],
    topics: [],
    keywords: [],
    image: null,
    imageUrl: null,
    sources: [{ source: "src:voorbeeld", retrieved: "2026-09-18", confidence: "high" }],
  };
  assert.equal(toNewsItemView(raw, "nl").relevant, false);
  assert.equal(toNewsItemView({ ...raw, topics: ["topic:wonen"] }, "nl").relevant, false, "a topic without evidence");
  assert.equal(toNewsItemView({ ...raw, topics: ["topic:wonen"], keywords: ["woningbouw"] }, "nl").relevant, true);
});
