import { test } from "node:test";
import assert from "node:assert/strict";
import {
  applyCanvasState,
  isCalendarDay,
  parseCanvasUrl,
  parseSelection,
  serializeSelection,
  shownLayersFor,
  validAsOf,
} from "./canvas-url.ts";

const layers = ["regering", "staten-generaal", "decentraal-lokaal"];
const today = "2026-10-05";

test("a selection survives a round trip through the URL", () => {
  const picks = [
    { kind: "org", id: "org:ministerie-van-financien", surface: "graph" },
    { kind: "cluster", id: "cluster:uitvoering:org:ministerie-van-financien", surface: "graph" },
    { kind: "sector", id: "gemeenten", surface: "graph" },
    { kind: "fractie", chamberId: "org:tweede-kamer", index: 3, surface: "graph" },
    { kind: "news", id: "news:abc123", surface: "power" },
    { kind: "topic", id: "topic:zorg", surface: "power" },
  ];
  for (const pick of picks) assert.deepEqual(parseSelection(serializeSelection(pick)), pick);
  assert.deepEqual(parseSelection(serializeSelection({ kind: "person", id: "person:rob-jetten", surface: "graph" })), {
    kind: "person",
    id: "person:rob-jetten",
    surface: "power",
  });
});

test("invalid values are ignored, never trusted", () => {
  assert.equal(parseSelection("<script>"), null);
  assert.equal(parseSelection("org:"), null);
  assert.equal(parseSelection("unknown:thing"), null);
  assert.equal(parseSelection("fractie:org:tweede-kamer#x"), null);
  assert.equal(parseSelection("sector:Not A Sector"), null);
  assert.equal(parseSelection("org:" + "a".repeat(300)), null);
  assert.equal(parseSelection(null), null);
  assert.deepEqual(parseCanvasUrl("?view=hologram&layer=nope&date=2026-02-30&sel=%3Cb%3E", layers, today), {});
});

test("dates must be real days between 1945 and today", () => {
  assert.equal(isCalendarDay("2024-02-29"), true);
  assert.equal(isCalendarDay("2023-02-29"), false);
  assert.equal(validAsOf("1944-12-31", today), false);
  assert.equal(validAsOf("2026-10-06", today), false);
  assert.equal(validAsOf("2026-10-05", today), true);
  assert.equal(validAsOf("1950-01-01", today), true);
});

test("a full state parses back out of the query string", () => {
  const search = "?view=power&layer=regering,decentraal-lokaal&date=2020-01-01&sel=org:ministerie-van-financien";
  assert.deepEqual(parseCanvasUrl(search, layers, today), {
    view: "power",
    shownLayers: ["regering", "decentraal-lokaal"],
    asOf: "2020-01-01",
    sel: { kind: "org", id: "org:ministerie-van-financien", surface: "graph" },
  });
});

test("only known layers count, and an empty list is ignored", () => {
  assert.deepEqual(parseCanvasUrl("?layer=regering,bestaatniet", layers, today).shownLayers, ["regering"]);
  assert.equal(parseCanvasUrl("?layer=bestaatniet", layers, today).shownLayers, undefined);
});

test("the plain page keeps its plain URL, and foreign parameters stay", () => {
  const plain = { view: "graph", shownLayers: null, asOf: null, sel: null };
  assert.equal(applyCanvasState("", plain, layers), "");
  assert.equal(applyCanvasState("?utm=x&sel=org:old", plain, layers), "?utm=x");
  const state = { view: "power", shownLayers: ["regering"], asOf: "2020-01-01", sel: { kind: "org", id: "org:a", surface: "graph" } };
  const out = applyCanvasState("?utm=x", state, layers);
  assert.equal(out, "?utm=x&view=power&layer=regering&date=2020-01-01&sel=org:a");
  assert.deepEqual(parseCanvasUrl(out, layers, today).shownLayers, ["regering"]);
});

test("all layers on is no layer parameter", () => {
  const state = { view: "graph", shownLayers: layers, asOf: null, sel: null };
  assert.equal(applyCanvasState("", state, layers), "");
  assert.equal(shownLayersFor(layers, new Set()), null);
  assert.deepEqual(shownLayersFor(layers, new Set(["regering"])), ["staten-generaal", "decentraal-lokaal"]);
});
