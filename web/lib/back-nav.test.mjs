import { expect, test } from "bun:test";
import { parentPath, swipeCommits, swipeIntent, swipeOffset, swipeProgress, swipeThreshold } from "./back-nav.ts";

test("one level up from any page, nothing above the home page", () => {
  expect(parentPath("/personen/rob-jetten/")).toBe("/personen/");
  expect(parentPath("/personen/rob-jetten")).toBe("/personen/");
  expect(parentPath("/nieuws/bronnen/")).toBe("/nieuws/");
  expect(parentPath("/news/2026-10-15/")).toBe("/news/");
  expect(parentPath("/personen/")).toBe("/");
  expect(parentPath("/")).toBe(null);
  expect(parentPath(null)).toBe(null);
});

test("a sideways move to the right is a swipe back, a scroll is not", () => {
  expect(swipeIntent(4, 3)).toBe("pending");
  expect(swipeIntent(30, 5)).toBe("engage");
  expect(swipeIntent(30, 25)).toBe("abandon");
  expect(swipeIntent(-30, 0)).toBe("abandon");
  expect(swipeIntent(2, 40)).toBe("abandon");
});

test("release goes back past the threshold or on a flick", () => {
  expect(swipeThreshold(390)).toBe(97.5);
  expect(swipeThreshold(200)).toBe(72);
  expect(swipeThreshold(1440)).toBe(140);
  expect(swipeCommits(100, 0, 390)).toBe(true);
  expect(swipeCommits(60, 0.1, 390)).toBe(false);
  expect(swipeCommits(40, 0.6, 390)).toBe(true);
  expect(swipeCommits(20, 2, 390)).toBe(false);
});

test("progress and offset stay in range", () => {
  expect(swipeProgress(-10, 390)).toBe(0);
  expect(swipeProgress(500, 390)).toBe(1);
  expect(swipeOffset(-5, 390)).toBe(0);
  expect(swipeOffset(10_000, 390)).toBeLessThanOrEqual(390 * 0.4);
  expect(swipeOffset(20, 390)).toBeGreaterThan(18);
});
