# Security headers and the Content Security Policy

`_headers` is a Netlify and Cloudflare Pages headers file. It ships from `web/public/` and is copied to the root of the static export, so the deployment host reads it unmodified. The directives are HTTPS/HSTS, `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`, `Permissions-Policy`, and a Content-Security-Policy.

## The chosen policy

```
Content-Security-Policy:
  default-src 'self';
  base-uri 'self';
  object-src 'none';
  frame-ancestors 'none';
  form-action 'self';
  script-src 'self' 'unsafe-inline';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: redactie.rtl.nl screenshots.rtl.nl static.binnenlandsbestuur.nl images.nrc.nl image.trouw.nl image.volkskrant.nl image.parool.nl images.fd.nl images.ad.nl images.nu.nl images.cdn.nos.nl;
  font-src 'self';
  connect-src 'self';
  manifest-src 'self';
  upgrade-insecure-requests
```

The site is a static export. All scripts, styles, and fetches live under `/_next/`, `/graph.json`, and `/search-index.json`, which are same-origin, so `default-src 'self'` holds.

## Recorded gap: inline scripts cannot use a hash-only policy

`script-src` uses `'unsafe-inline'`. This is a recorded gap, not an oversight.

- `web/app/layout.tsx` injects the theme-init script inline.
- Next.js App Router injects its bootstrap script and one inline `self.__next_f.push(...)` script per rendered segment. In the current `web/out` build there are 3,904 HTML files with 64,894 inline `<script>` tags holding 28,259 distinct bodies, and the flight bodies embed the dataset. A static `_headers` file cannot enumerate hashes that stay valid across the nightly data refresh, and a static export has no server to mint a per-response nonce. A hash-only `script-src` would break hydration on the next build.
- CSP Level 3 ignores `'unsafe-inline'` as soon as any hash or nonce is present in `script-src`, so the hashes cannot be added to the shipped header as a belt-and-braces measure. They are recorded here instead.

The stable inline scripts and their SHA-256 hashes in the current build are:

| Inline script | SHA-256 |
| --- | --- |
| Theme-init (`layout.tsx`) | `sha256-e37WDgl0GgnT2grSntXcKYFT9h4Tkxhwyenh6zdNfMQ=` |
| Next bootstrap, `(self.__next_f=self.__next_f||[]).push([0])` | `sha256-OBTN3RiyCV4Bq7dFqZ5a2pAXjnCcCYeTJMO2I/LYKeo=` |

Tightening path: when the project moves to a host that runs Next.js middleware (or enables Next's experimental SRI with a nonce), replace `'unsafe-inline'` with the per-response nonce and keep `'self'`. Until then this gap stands and is visible here.

`style-src` also uses `'unsafe-inline'`. The current build has more than 5,000 inline `style` attributes (the graph and timeline set geometry inline) and no inline `<style>` blocks. This is recorded here as required; only `'unsafe-inline'` for styles is accepted.

## How to verify the hashes after a deploy

Run this from `web/` against the local build output, or point `BASE` at the deployed host. It prints the hash of every inline script it can see, so you can confirm the two stable hashes above and count the data-dependent ones.

```sh
node -e '
const fs = require("fs"), path = require("path"), crypto = require("crypto");
const BASE = process.argv[1] || "out";
function walk(dir, acc) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, acc);
    else if (e.name.endsWith(".html")) acc.push(p);
  }
  return acc;
}
const seen = new Map();
for (const file of walk(BASE, [])) {
  const html = fs.readFileSync(file, "utf8");
  const re = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g;
  let m;
  while ((m = re.exec(html))) {
    const body = m[1];
    if (!seen.has(body)) seen.set(body, 0);
    seen.set(body, seen.get(body) + 1);
  }
}
for (const body of seen.keys()) {
  const hash = "sha256-" + crypto.createHash("sha256").update(body, "utf8").digest("base64");
  const flat = body.replace(/\s+/g, " ").slice(0, 60);
  console.log(hash + "  " + flat);
}
console.error("distinct inline scripts: " + seen.size);
'
```

From the deployed site, fetch a page and pipe the same regex over it:

```sh
curl -sS https://<host>/ | node -e '
let html = ""; process.stdin.on("data", (d) => (html += d)).on("end", () => {
  const re = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g;
  let m;
  while ((m = re.exec(html))) {
    console.log("sha256-" + require("crypto").createHash("sha256").update(m[1], "utf8").digest("base64"));
  }
});
'
```

To confirm the headers themselves, check the response:

```sh
curl -sSI https://<host>/ | grep -iE "content-security-policy|strict-transport-security|x-content-type-options|referrer-policy|x-frame-options|permissions-policy"
```

## News feed image hosts in `img-src`

Since ADR 0010 the news cards render the feed-supplied article image directly from the outlet's server, so `img-src` must name every host those images come from. The list is derived from the `imageUrl` values in `data/news.json`, not a blanket `https:`, so the policy stays explicit about which third parties the reader's browser contacts.

Current hosts (regenerate with the one-liner below whenever the feed registry in `pipelines/feeds.json` changes):

```
redactie.rtl.nl screenshots.rtl.nl static.binnenlandsbestuur.nl images.nrc.nl
image.trouw.nl image.volkskrant.nl image.parool.nl images.fd.nl images.ad.nl
images.nu.nl images.cdn.nos.nl
```

```sh
node -e '
const { URL } = require("url");
const news = require("./data/news.json");
const records = news.records ?? news;
const hosts = new Set(records.filter((r) => r.imageUrl).map((r) => new URL(r.imageUrl).host));
console.log([...hosts].sort().join("\n"));
'
```

`web/lib/csp.test.mjs` fails the build when a feed image host is missing from this list, so the header cannot silently drift from the data.

## Note for later

`data/media.json` is currently empty. When licensed article images or external portraits ship there, add every host they come from to `img-src`, derived from `media.json`, rather than widening to `https:`.
