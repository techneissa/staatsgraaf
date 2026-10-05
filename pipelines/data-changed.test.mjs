import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { changedPaths, sameContent } from "../scripts/data-changed.mjs";

const buf = (value) => Buffer.from(typeof value === "string" ? value : JSON.stringify(value));

describe("sameContent", () => {
  test("ignores generatedAt in JSON, at any depth", () => {
    const a = { generatedAt: "2026-10-05T10:00:00Z", n: 1, nested: { generatedAt: "x", keep: true } };
    const b = { generatedAt: "2026-10-05T13:00:00Z", n: 1, nested: { generatedAt: "y", keep: true } };
    expect(sameContent("data/meta.json", buf(a), buf(b))).toBe(true);
  });

  test("a changed fact is a change, a changed retrieval date too", () => {
    expect(sameContent("data/people.json", buf({ a: 1 }), buf({ a: 2 }))).toBe(false);
    expect(sameContent("data/news.json", buf({ retrieved: "2026-10-04" }), buf({ retrieved: "2026-10-05" }))).toBe(false);
  });

  test("other files change on any byte difference, and added or deleted files count", () => {
    expect(sameContent("ATTRIBUTION.md", buf("a"), buf("a"))).toBe(true);
    expect(sameContent("ATTRIBUTION.md", buf("a"), buf("b"))).toBe(false);
    expect(sameContent("data/new.json", null, buf({}))).toBe(false);
    expect(sameContent("data/old.json", buf({}), null)).toBe(false);
  });

  test("invalid JSON falls back to a byte comparison", () => {
    expect(sameContent("data/x.json", buf("{"), buf("{ "))).toBe(false);
  });
});

describe("changedPaths in a git repository", () => {
  let dir;
  let cwd;
  const git = (...args) => execFileSync("git", ["-c", "user.name=t", "-c", "user.email=t@t.invalid", ...args], { cwd: dir, stdio: "pipe" });

  beforeEach(() => {
    cwd = process.cwd();
    dir = mkdtempSync(join(tmpdir(), "data-changed-"));
    git("init", "-q", "-b", "main");
    mkdirSync(join(dir, "data"));
    writeFileSync(join(dir, "data", "meta.json"), JSON.stringify({ generatedAt: "a", n: 1 }));
    writeFileSync(join(dir, "data", "people.json"), JSON.stringify([1, 2]));
    git("add", "-A");
    git("commit", "-q", "-m", "seed");
    process.chdir(dir);
  });

  afterEach(() => {
    process.chdir(cwd);
    rmSync(dir, { recursive: true, force: true });
  });

  test("a timestamp-only rewrite is unchanged", () => {
    writeFileSync(join(dir, "data", "meta.json"), JSON.stringify({ generatedAt: "b", n: 1 }));
    expect(changedPaths(["data"])).toEqual([]);
  });

  test("a real edit, a new file, and a deleted file are reported", () => {
    writeFileSync(join(dir, "data", "people.json"), JSON.stringify([1, 2, 3]));
    writeFileSync(join(dir, "data", "news.json"), "[]");
    rmSync(join(dir, "data", "meta.json"));
    expect(changedPaths(["data"])).toEqual(["data/meta.json", "data/news.json", "data/people.json"]);
  });

  test("paths outside the list are ignored", () => {
    writeFileSync(join(dir, "elsewhere.json"), "{}");
    expect(changedPaths(["data"])).toEqual([]);
  });
});
