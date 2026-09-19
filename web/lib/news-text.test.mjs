import { test } from "node:test";
import assert from "node:assert/strict";

import { clampMarkupSentences, clampSentences, plainMarkupText, stripPublisherPrefix, stripTitleFromMarkup } from "./news-text.ts";

const TITLE = "Kop over Prinsjesdag";

test("strips the headline and dash from the linked summary", () => {
  const markup = `${TITLE} \u2014 <entity id="person:x">Koning Willem-Alexander</entity> sprak over samenwerking en overleg in de troonrede van vandaag.`;
  const stripped = stripTitleFromMarkup(markup, TITLE);
  assert.equal(
    stripped,
    `<entity id="person:x">Koning Willem-Alexander</entity> sprak over samenwerking en overleg in de troonrede van vandaag.`,
  );
});

test("keeps the markup unchanged when it does not start with the headline", () => {
  const markup = `De inleiding gaat over de troonrede en de reacties van fractieleiders erop.`;
  assert.equal(stripTitleFromMarkup(markup, TITLE), markup);
});

test("returns null when the summary is the headline alone", () => {
  assert.equal(stripTitleFromMarkup(TITLE, TITLE), null);
  assert.equal(stripTitleFromMarkup(`${TITLE} \u2014 kort`, TITLE), null);
});

test("handles a headline with an entity tag inside", () => {
  const markup = `<entity id="person:y">${TITLE}</entity> \u2014 De reacties van de fractieleiders bleven verdeeld na afloop van de troonrede.`;
  const stripped = stripTitleFromMarkup(markup, TITLE);
  assert.equal(stripped, "De reacties van de fractieleiders bleven verdeeld na afloop van de troonrede.");
});

test("handles a mention that straddles the cut", () => {
  const markup = `<entity id="person:y">${TITLE} \u2014 en meer</entity> De fractieleiders reageerden verdeeld na afloop van de troonrede van vandaag.`;
  const stripped = stripTitleFromMarkup(markup, TITLE);
  assert.ok(stripped !== null);
  assert.ok(stripped.includes("De fractieleiders reageerden verdeeld"));
  assert.ok(!stripped.includes("<entity"));
});

test("plainMarkupText keeps the mention surface", () => {
  assert.equal(plainMarkupText(`<entity id="x">Naam</entity> loopt`), "Naam loopt");
  assert.equal(plainMarkupText(null), null);
});

test("stripPublisherPrefix removes the publisher-headline prefix", () => {
  assert.equal(
    stripPublisherPrefix(`Trouw bericht: "${TITLE}" Volgens de inleiding gaat het om samenwerking.`, TITLE),
    "Volgens de inleiding gaat het om samenwerking.",
  );
});

test("stripPublisherPrefix leaves summaries without the prefix unchanged", () => {
  const text = "Volgens de inleiding gaat het om samenwerking.";
  assert.equal(stripPublisherPrefix(text, TITLE), text);
});

test("a summary that is only the publisher echo is detected", () => {
  assert.equal(stripPublisherPrefix(`Trouw bericht: "${TITLE}"`, TITLE), "");
});

test("a summary is cut at a sentence, never mid-word, and a broken sentence gets an ellipsis", () => {
  const text = "Eerste zin is kort. Tweede zin gaat verder over het onderwerp. Derde zin is lang en past niet meer in het budget van tekens dat de kaart heeft.";
  assert.equal(clampSentences(text, 70), "Eerste zin is kort. Tweede zin gaat verder over het onderwerp.");
  assert.equal(clampSentences("Een enkele heel lange zin zonder einde die maar doorgaat en doorgaat", 30), "Een enkele heel lange zin…");
  assert.equal(clampSentences("Past.", 30), "Past.");
});

test("a markup summary is cut on the plain text and never inside an entity tag", () => {
  const markup = 'De <entity id="org:politie">Politie</entity> meldt een aanhouding. Daarna volgt <entity id="org:om">het Openbaar Ministerie</entity> met een besluit.';
  const cut = clampMarkupSentences(markup, 40);
  assert.equal(cut, 'De <entity id="org:politie">Politie</entity> meldt een aanhouding.');
  const inside = clampMarkupSentences(markup, 62);
  assert.ok(!inside.includes('<entity id="org:om">') || inside.includes("</entity>"), "no half-open tag");
  assert.ok(inside.endsWith("…") || inside.endsWith("."), inside);
});
