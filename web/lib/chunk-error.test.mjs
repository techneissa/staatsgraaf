import { expect, test } from "bun:test";
import { CHUNK_RELOAD_WINDOW_MS, isChunkLoadError, shouldReloadForChunkError } from "./chunk-error.ts";

test("messages of a script file that did not load are recognised", () => {
  expect(isChunkLoadError("ChunkLoadError: Loading chunk 123 failed.")).toBe(true);
  expect(isChunkLoadError("Failed to fetch dynamically imported module: https://x/_next/static/chunks/a.js")).toBe(true);
  expect(isChunkLoadError("error loading dynamically imported module")).toBe(true);
  expect(isChunkLoadError("Importing a module script failed.")).toBe(true);
});

test("other errors and non-strings are not", () => {
  expect(isChunkLoadError("TypeError: x is undefined")).toBe(false);
  expect(isChunkLoadError(undefined)).toBe(false);
  expect(isChunkLoadError(null)).toBe(false);
});

test("it reloads once, then waits out the window", () => {
  expect(shouldReloadForChunkError(null, 1000)).toBe(true);
  expect(shouldReloadForChunkError(1000, 1000 + CHUNK_RELOAD_WINDOW_MS - 1)).toBe(false);
  expect(shouldReloadForChunkError(1000, 1000 + CHUNK_RELOAD_WINDOW_MS + 1)).toBe(true);
});
