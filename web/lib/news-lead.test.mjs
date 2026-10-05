import { test } from "node:test";
import assert from "node:assert/strict";

import { clampLead, clampLeadMarkup, leadSegments } from "./news-text.ts";

const LONG =
  "De Tweede Kamer debatteert vandaag over de begroting. Minister Heinen zegt dat de rijksuitgaven stabiel blijven, maar de oppositie vindt dat te optimistisch en wil extra bezuinigingen voorkomen bij de zorg.";

test("a short lead is not clamped", () => {
  assert.deepEqual(clampLead("Kort bericht.", 200), { text: "Kort bericht.", clamped: false });
});

test("a long lead is cut at a sentence end when one fits", () => {
  const out = clampLead(LONG, 120);
  assert.equal(out.clamped, true);
  assert.equal(out.text, "De Tweede Kamer debatteert vandaag over de begroting.");
});

test("without a sentence end it is cut at a word and gets an ellipsis, never mid-word", () => {
  const text = "Een lang verhaal zonder punt dat maar doorgaat over allerlei zaken en nog veel meer zaken die niemand wil lezen";
  for (const max of [20, 33, 47, 60, 80]) {
    const out = clampLead(text, max);
    assert.equal(out.clamped, true);
    assert.ok(out.text.endsWith("…"), out.text);
    const head = out.text.slice(0, -1);
    assert.ok(text.startsWith(head), `${head} is a prefix`);
    assert.ok(text[head.length] === " ", `cut at ${max} falls before a space, got ${JSON.stringify(text[head.length])}`);
  }
});

test("a markup lead keeps whole entity tags and flags the clamp", () => {
  const markup = `De <entity id="org:tweede-kamer">Tweede Kamer</entity> debatteert vandaag over de begroting van het jaar en de rijksuitgaven die stabiel blijven volgens de minister.`;
  const out = clampLeadMarkup(markup, 40);
  assert.equal(out.clamped, true);
  const opens = (out.markup.match(/<entity /g) ?? []).length;
  const closes = (out.markup.match(/<\/entity>/g) ?? []).length;
  assert.equal(opens, closes);
  assert.ok(out.markup.endsWith("\u2026"));
  assert.deepEqual(clampLeadMarkup(markup, 500), { markup, clamped: false });
});

test("leadSegments marks only the first mention of an entity", () => {
  const markup = `<entity id="a">Heinen</entity> en <entity id="b">Jetten</entity> spraken; later zei <entity id="a">Heinen</entity> meer, en <entity id="a">Heinen</entity> sloot af.`;
  const segments = leadSegments(markup);
  const mentions = segments.filter((segment) => segment.type === "mention");
  assert.deepEqual(
    mentions.map((segment) => [segment.id, segment.first]),
    [
      ["a", true],
      ["b", true],
      ["a", false],
      ["a", false],
    ],
  );
  assert.equal(segments.map((segment) => segment.text).join(""), "Heinen en Jetten spraken; later zei Heinen meer, en Heinen sloot af.");
});

test("leadSegments passes text without markup through", () => {
  assert.deepEqual(leadSegments("gewone tekst"), [{ type: "text", text: "gewone tekst" }]);
  assert.deepEqual(leadSegments(""), []);
});
