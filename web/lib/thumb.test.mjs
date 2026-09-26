import { test } from "node:test";
import assert from "node:assert/strict";

import { thumbUrl } from "./thumb.ts";

test("a portrait maps to its small WebP copy; anything else stays as it is", () => {
  assert.equal(thumbUrl("/media/portretten/rob-jetten.jpg"), "/media/portretten/klein/rob-jetten.webp");
  assert.equal(thumbUrl("/media/portretten/a.PNG"), "/media/portretten/klein/a.webp");
  assert.equal(thumbUrl("https://example.org/a.jpg"), "https://example.org/a.jpg");
  assert.equal(thumbUrl(null), null);
});
