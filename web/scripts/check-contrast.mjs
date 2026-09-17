#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const WEB_DIR = join(dirname(fileURLToPath(import.meta.url)), "..");
const TOKENS_PATH = join(WEB_DIR, "..", "shared", "tokens.json");

function luminance(hex) {
  const value = hex.replace("#", "").slice(0, 6);
  const channels = [0, 2, 4].map((offset) => {
    const c = parseInt(value.slice(offset, offset + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function ratio(a, b) {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

const tokens = JSON.parse(readFileSync(TOKENS_PATH, "utf8"));
const palette = tokens.color;

const textPairs = [
  ["ink", "canvas"],
  ["ink", "surface"],
  ["ink-muted", "canvas"],
  ["ink-muted", "surface"],
  ["ink-faint", "canvas"],
  ["ink-faint", "surface"],
  ["accent-text", "canvas"],
  ["accent-text", "surface"],
  ["accent-text", "surface-raised"],
  ["accent-text", "accent-soft"],
  ["accent-ink", "accent"],
];

const nonTextPairs = [
  ["focus", "canvas"],
  ["focus", "surface"],
  ["accent", "canvas"],
];

const failures = [];
for (const [theme, values] of Object.entries(palette)) {
  for (const [fg, bg] of textPairs) {
    const value = ratio(values[fg], values[bg]);
    const pass = value >= 4.5;
    if (!pass) failures.push(`${theme}: ${fg} on ${bg} is ${value.toFixed(2)}:1 (needs 4.5:1)`);
    console.log(`${pass ? "ok  " : "FAIL"} ${theme.padEnd(5)} ${`${fg} on ${bg}`.padEnd(30)} ${value.toFixed(2)}:1`);
  }
  for (const [fg, bg] of nonTextPairs) {
    const value = ratio(values[fg], values[bg]);
    const pass = value >= 3;
    if (!pass) failures.push(`${theme}: ${fg} on ${bg} is ${value.toFixed(2)}:1 (needs 3:1 for non-text)`);
    console.log(`${pass ? "ok  " : "FAIL"} ${theme.padEnd(5)} ${`${fg} on ${bg}`.padEnd(30)} ${value.toFixed(2)}:1 (non-text)`);
  }
}

if (failures.length > 0) {
  console.error(`\ncheck-contrast: ${failures.length} pair(s) below WCAG AA`);
  process.exit(1);
}
console.log("\ncheck-contrast: all pairs meet WCAG 2.2 AA");
