import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

/**
 * The Content-Security-Policy in web/public/_headers must allow every host that
 * feed-supplied news images (ADR 0010) and embedded logos (ADR 0029) come
 * from. Since amendment 2 of ADR 0029 img-src allows any https image, because
 * a list of every logo host passes the 2,000 character line limit; the tests
 * then check that every image URL is https. The news image hosts stay listed:
 * pipelines/news.mjs reads them as the hosts a feed image may come from
 * (ADR 0021), and a news image on another host still fails here.
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

const imgSrcTokens = imgSrcValue.split(/\s+/);
const allowsAnyHttps = imgSrcTokens.includes("https:");
const allowedHosts = new Set(imgSrcTokens.filter((token) => token.includes(".") && !token.startsWith("'")));
/** The image URLs the policy blocks: not https, or a host it does not name. */
function blocked(urls) {
  return [...new Set(urls)].filter((url) => {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return true;
    return !allowsAnyHttps && !allowedHosts.has(parsed.host);
  });
}

const news = JSON.parse(
  readFileSync(fileURLToPath(new URL("../../data/news.json", import.meta.url)), "utf8"),
);
const records = Array.isArray(news) ? news : (news.records ?? []);

describe("CSP img-src covers the news feed image hosts", () => {
  test("img-src directive is present with 'self'", () => {
    expect(imgSrcValue).toContain("'self'");
  });

  test("every imageUrl in data/news.json is on a listed news host", () => {
    const urls = records
      .filter((item) => typeof item.imageUrl === "string" && item.imageUrl !== "")
      .map((item) => item.imageUrl);
    expect(urls.length).toBeGreaterThan(0);
    expect(blocked(urls)).toEqual([]);
    expect(urls.filter((url) => !allowedHosts.has(new URL(url).host))).toEqual([]);
  });
});

const organizations = JSON.parse(
  readFileSync(fileURLToPath(new URL("../../data/organizations.json", import.meta.url)), "utf8"),
);

describe("CSP img-src covers the embedded official logos (ADR 0029, amendments 1 and 2)", () => {
  test("every logoEmbed image in data/organizations.json is allowed", () => {
    const urls = organizations
      .map((organization) => organization.logoEmbed)
      .filter((embed) => embed && !embed.linkOnly && typeof embed.url === "string")
      .map((embed) => embed.url);
    expect(blocked(urls)).toEqual([]);
  });
});

// Cloudflare Pages: "Each line in the _headers file has a 2,000 character limit"
// (https://developers.cloudflare.com/pages/configuration/headers/, read 13-10-2026).
test("every _headers line stays within the Cloudflare Pages limit of 2,000 characters", () => {
  const long = headers.split("\n").filter((line) => line.length > 2000);
  expect(long).toEqual([]);
});
