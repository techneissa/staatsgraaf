import { describe, expect, test } from "bun:test";
import { DETAILS_WIDTH, PANELS_INIT_SCRIPT, clampDetailsWidth, parseCanvasOpen, parseDetailsWidth, parseOpen, widthAfterKey } from "./panel-prefs.ts";
import { compactValue, normalizePanelRecord, panelShard } from "./panel-data.ts";

describe("panel preferences", () => {
  test("widths clamp to the range and fall back to the default", () => {
    expect(clampDetailsWidth(10)).toBe(DETAILS_WIDTH.min);
    expect(clampDetailsWidth(9999)).toBe(DETAILS_WIDTH.max);
    expect(parseDetailsWidth(null)).toBe(DETAILS_WIDTH.initial);
    expect(parseDetailsWidth("abc")).toBe(DETAILS_WIDTH.initial);
    expect(parseDetailsWidth("400")).toBe(400);
  });
  test("only a stored 'closed' closes a column", () => {
    expect(parseOpen(null)).toBe(true);
    expect(parseOpen("open")).toBe(true);
    expect(parseOpen("closed")).toBe(false);
  });
  test("the canvas starts closed unless a stored 'open' restores it", () => {
    expect(parseCanvasOpen(null)).toBe(false);
    expect(parseCanvasOpen("closed")).toBe(false);
    expect(parseCanvasOpen("open")).toBe(true);
  });
  test("the head script closes the canvas by default", () => {
    expect(PANELS_INIT_SCRIPT).toContain("data-canvas-panel");
    expect(PANELS_INIT_SCRIPT).toContain("!==\"open\"");
    expect(PANELS_INIT_SCRIPT).toMatch(/catch\(e\)\{try\{document\.documentElement\.setAttribute\("data-canvas-panel","closed"\)/);
  });
  test("arrow keys resize from the left edge", () => {
    expect(widthAfterKey(320, "ArrowLeft")).toBe(336);
    expect(widthAfterKey(320, "ArrowRight")).toBe(304);
    expect(widthAfterKey(320, "ArrowRight", true)).toBe(256);
    expect(widthAfterKey(320, "End")).toBe(DETAILS_WIDTH.max);
    expect(widthAfterKey(320, "a")).toBeNull();
  });
  test("the head script is valid JavaScript", () => {
    expect(() => new Function(PANELS_INIT_SCRIPT)).not.toThrow();
  });
});

describe("panel data", () => {
  test("shards are stable three-digit keys", () => {
    expect(panelShard("org:tweede-kamer")).toMatch(/^\d{3}$/);
    expect(panelShard("org:tweede-kamer")).toBe(panelShard("org:tweede-kamer"));
  });
  test("compact then normalize restores lists and nulls", () => {
    const raw = compactValue({ kind: "org", id: "org:x", name: "X", href: "/x/", holders: [], parent: null, newsCount: 0 });
    expect(raw.holders).toBeUndefined();
    const record = normalizePanelRecord(raw);
    expect(record.holders).toEqual([]);
    expect(record.parent).toBeNull();
    expect(record.newsCount).toBe(0);
  });
});
