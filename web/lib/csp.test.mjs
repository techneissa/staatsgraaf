import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

/**
 * The Content-Security-Policy in web/public/_headers must name every host that
 * feed-supplied news images come from (ADR 0010). When the feed registry
 * changes and a new image host appears, this test fails until _headers is
 * updated, so the deployed policy cannot drift from the data.
 */
const headers = readFileSync(
  fileURLToPath(new URL("../public/_headers", import.meta.url)),
  "utf8",
);

const imgSrcDirective = headers
  .split("\n")
  .find((line) => line.trim().startsWith("Content-Security-Policy:"));
if (imgSrcDirective === undefined) throw new Error("_headers has no CSP line");

const imgSrcValue = imgSrcDirective
  .slice(imgSrcDirective.indexOf("img-src"))
  .split(";")[0]
  .trim();

const allowedHosts = new Set(
  imgSrcValue
    .split(/\s+/)
    .filter((token) => token.includes(".") && !token.startsWith("'")),
);

const news = JSON.parse(
  readFileSync(fileURLToPath(new URL("../../data/news.json", import.meta.url)), "utf8"),
);
const records = Array.isArray(news) ? news : (news.records ?? []);

describe("CSP img-src covers the news feed image hosts", () => {
  test("img-src directive is present with 'self'", () => {
    expect(imgSrcValue).toContain("'self'");
  });

  test("every imageUrl host in data/news.json is allowed", () => {
    const hosts = new Set(
      records
        .filter((item) => typeof item.imageUrl === "string" && item.imageUrl !== "")
        .map((item) => new URL(item.imageUrl).host),
    );
    expect(hosts.size).toBeGreaterThan(0);
    const missing = [...hosts].filter((host) => !allowedHosts.has(host));
    expect(missing).toEqual([]);
  });
});
