#!/usr/bin/env bun
// Deterministic link checker for Staatsgraaf.
//
// Two jobs:
//   1. internal: scan every href/src in the built static export web/out and
//      confirm each internal target resolves to a file in web/out.
//   2. external: check every distinct source URL in data/sources.json with
//      bounded concurrency, one attempt, a browser User-Agent, and a delay
//      between requests to the same host. Blocks are respected, never evaded.
//
// No dependencies. Node ESM only. Read-only over the repo except for the
// optional --report output path, which the caller names explicitly.
//
// Usage:
//   node scripts/check-links.mjs                 # internal + external, console summary
//   node scripts/check-links.mjs --help
//   node scripts/check-links.mjs --internal-only
//   node scripts/check-links.mjs --external-only --limit 40
//   node scripts/check-links.mjs --report research/qa/link-check.md
//   node scripts/check-links.mjs --json          # full result as JSON on stdout

import { readFileSync, existsSync, statSync, readdirSync, mkdirSync, writeFileSync } from "node:fs";
import { join, dirname, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = join(ROOT, "web", "out");
const SOURCES_FILE = join(ROOT, "data", "sources.json");
const META_FILE = join(ROOT, "data", "meta.json");

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

// Hosts documented as intentionally blocked or unreachable in
// research/00-endpoints.md. A block on these hosts is a WARN/GAP, never a FAIL.
const ALLOW_HOSTS = new Map([
  ["www.raadvanstate.nl", "blocked 403, documented in research/00-endpoints.md"],
  ["raadvanstate.nl", "blocked 403, documented in research/00-endpoints.md"],
  ["www.uvw.nl", "blocked 403, documented in research/00-endpoints.md"],
  ["uvw.nl", "blocked 403, documented in research/00-endpoints.md"],
  ["www.waterschappen.nl", "blocked 403, documented in research/00-endpoints.md"],
  ["waterschappen.nl", "blocked 403, documented in research/00-endpoints.md"],
  ["www.waarstaatjegemeente.nl", "unreachable 000, documented in research/00-endpoints.md"],
  ["waarstaatjegemeente.nl", "unreachable 000, documented in research/00-endpoints.md"],
  ["www.bnr.nl", "blocked 403, documented in research/00-endpoints.md"],
  ["bnr.nl", "blocked 403, documented in research/00-endpoints.md"],
]);

// Individual source records documented as intentionally blocked.
const ALLOW_IDS = new Map([
  ["src:j-news-10", "known NU.nl 403, documented in research/00-endpoints.md"],
]);

// Hosts where this product is shown a consent wall instead of the article.
// Reachability is confirmed with HTTP 200, so it is not a FAIL or WARN; the
// redirect is recorded separately so the reader knows the final host differs.
const CONSENT_HOSTS = new Set([
  "myprivacy.dpgmedia.nl",
  "myprivacy.dpgmedia.be",
  "consent.rtl.nl",
  "cdn.privacy-mgmt.com",
  "cmp.quantcast.com",
]);

// Navigation routes that must exist as built files. Source: web/components/
// top-bar.tsx, web/components/site-footer.tsx, and the root route.
const EXPECTED_NAV = [
  ["top bar", "/"],
  ["top bar", "/wijzigingen/"],
  ["top bar", "/onderwerpen/"],
  ["top bar", "/begroting/"],
  ["footer", "/methodiek/"],
  ["footer", "/privacy/"],
  ["footer", "/toegankelijkheid/"],
];

// ---------------------------------------------------------------------------
// Args
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const opts = {
    help: false,
    internalOnly: false,
    externalOnly: false,
    json: false,
    report: null,
    limit: null,
    concurrency: 8,
    timeout: 9000,
    delay: 300,
    commands: null,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--help" || a === "-h") opts.help = true;
    else if (a === "--internal-only") opts.internalOnly = true;
    else if (a === "--external-only") opts.externalOnly = true;
    else if (a === "--json") opts.json = true;
    else if (a === "--report") opts.report = argv[++i];
    else if (a === "--limit") opts.limit = Number(argv[++i]);
    else if (a === "--concurrency") opts.concurrency = Number(argv[++i]);
    else if (a === "--timeout") opts.timeout = Number(argv[++i]);
    else if (a === "--delay") opts.delay = Number(argv[++i]);
    else if (a === "--commands") opts.commands = argv[++i];
    else throw new Error(`unknown option: ${a}`);
  }
  return opts;
}

const HELP = `Link checker for Staatsgraaf.

Usage: node scripts/check-links.mjs [options]

Options:
  -h, --help            show this help and exit
      --internal-only   only scan web/out internal href/src
      --external-only   only check data/sources.json source URLs
      --limit <n>       cap the number of external URLs (for dry runs)
      --concurrency <n> concurrent hosts for external checks (default 8)
      --timeout <ms>    per-request timeout (default 9000)
      --delay <ms>      delay between requests to the same host (default 300)
      --json            print the full result object as JSON to stdout
      --report <path>   write a markdown report to this path
      --commands <str>  literal commands line(s) to record in the report

Exit code is 0 when there is no FAIL, 1 when any FAIL is present.
`;

// ---------------------------------------------------------------------------
// Internal link check
// ---------------------------------------------------------------------------

function walkFiles(dir, predicate, out = []) {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir, { withFileTypes: true }).sort((a, b) =>
    a.name < b.name ? -1 : a.name > b.name ? 1 : 0,
  )) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walkFiles(full, predicate, out);
    else if (predicate(entry.name)) out.push(full);
  }
  return out;
}

function extractRefs(html) {
  const refs = [];
  const re = /\b(href|src)\s*=\s*(?:"([^"]*)"|'([^']*)')/gi;
  let m;
  while ((m = re.exec(html))) refs.push({ attr: m[1].toLowerCase(), value: m[2] ?? m[3] ?? "" });
  return refs;
}

function isExternalRef(value) {
  if (!value) return true;
  if (value.startsWith("//")) return true;
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(value)) return true; // https:, mailto:, tel:, data:, ...
  return false;
}

function toPosix(p) {
  return p.split(sep).join("/");
}

function resolveInternal(value, pageFile) {
  const pageUrlPath = "/" + toPosix(relative(OUT_DIR, pageFile));

  if (value.startsWith("#") || value.startsWith("?")) {
    return { ok: true, file: pageFile, kind: "same-page" };
  }

  let url;
  try {
    const base = "https://internal.invalid" + (value.startsWith("/") ? "/" : dirname(pageUrlPath) + "/");
    url = new URL(value, base);
  } catch {
    return { ok: false, tried: [], reason: "invalid-url" };
  }

  let pathname;
  try {
    pathname = decodeURIComponent(url.pathname || "/");
  } catch {
    pathname = url.pathname || "/";
  }

  const rel = pathname.replace(/^\/+/, "");
  const candidates =
    pathname.endsWith("/")
      ? [join(OUT_DIR, rel, "index.html")]
      : [join(OUT_DIR, rel), join(OUT_DIR, rel, "index.html"), join(OUT_DIR, rel) + ".html"];

  for (const candidate of candidates) {
    if (!candidate.startsWith(OUT_DIR)) continue;
    if (existsSync(candidate) && statSync(candidate).isFile()) {
      return { ok: true, file: candidate, kind: "file" };
    }
  }
  return { ok: false, tried: candidates.map((c) => toPosix(relative(ROOT, c))), reason: "not-found" };
}

function runInternal() {
  if (!existsSync(OUT_DIR)) throw new Error(`static export not found: ${OUT_DIR}`);
  const pages = walkFiles(OUT_DIR, (n) => n.endsWith(".html")).sort();
  const broken = [];
  const perTarget = new Map();
  let occurrences = 0;
  let externalRefs = 0;
  const distinct = new Set();
  const distinctInternal = new Set();

  for (const page of pages) {
    const html = readFileSync(page, "utf8");
    const pageLabel = toPosix(relative(OUT_DIR, page));
    for (const ref of extractRefs(html)) {
      if (isExternalRef(ref.value)) {
        externalRefs++;
        continue;
      }
      distinct.add(ref.value);
      distinctInternal.add(ref.value);
      occurrences++;
      const r = resolveInternal(ref.value, page);
      if (!r.ok) {
        const row = { page: pageLabel, target: ref.value, attr: ref.attr, tried: r.tried, reason: r.reason };
        broken.push(row);
        if (!perTarget.has(ref.value)) perTarget.set(ref.value, []);
        perTarget.get(ref.value).push(pageLabel);
      }
    }
  }

  const nav = EXPECTED_NAV.map(([where, href]) => {
    const r = resolveInternal(href, join(OUT_DIR, "index.html"));
    return { where, href, ok: r.ok, file: r.ok ? toPosix(relative(OUT_DIR, r.file)) : null };
  });

  const grouped = [...perTarget.entries()]
    .map(([target, pageList]) => ({ target, pages: [...new Set(pageList)].sort(), count: new Set(pageList).size }))
    .sort((a, b) => (a.target < b.target ? -1 : 1));

  return {
    pagesScanned: pages.length,
    internalOccurrences: occurrences,
    distinctInternalRefs: distinctInternal.size,
    externalRefsInHtml: externalRefs,
    nav,
    navOk: nav.every((n) => n.ok),
    brokenCount: broken.length,
    broken,
    brokenGrouped: grouped,
  };
}

// ---------------------------------------------------------------------------
// External source URL check
// ---------------------------------------------------------------------------

function loadSources() {
  const records = JSON.parse(readFileSync(SOURCES_FILE, "utf8"));
  const byUrl = new Map();
  for (const rec of records) {
    if (!rec.url) continue;
    if (!byUrl.has(rec.url)) {
      let host = null;
      try {
        host = new URL(rec.url).host;
      } catch {
        host = null;
      }
      byUrl.set(rec.url, { url: rec.url, host, ids: [], titles: [], retrieved: [], archiveUrl: rec.archiveUrl ?? null });
    }
    const entry = byUrl.get(rec.url);
    entry.ids.push(rec.id);
    if (rec.title) entry.titles.push(rec.title);
    if (rec.retrieved) entry.retrieved.push(rec.retrieved);
    if (!entry.archiveUrl && rec.archiveUrl) entry.archiveUrl = rec.archiveUrl;
  }
  const list = [...byUrl.values()].map((e) => ({
    ...e,
    ids: [...new Set(e.ids)].sort(),
    titles: [...new Set(e.titles)],
    retrieved: [...new Set(e.retrieved)].sort(),
  }));
  list.sort((a, b) => (a.url < b.url ? -1 : a.url > b.url ? 1 : 0));
  return { totalRecords: records.length, list };
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchOnce(url, timeoutMs) {
  const started = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "user-agent": UA,
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "accept-language": "nl-NL,nl;q=0.9,en;q=0.8",
      },
    });
    clearTimeout(timer);
    try {
      await res.body?.cancel();
    } catch {
      /* body already gone */
    }
    return { status: res.status, finalUrl: res.url, ms: Date.now() - started, error: null };
  } catch (err) {
    clearTimeout(timer);
    const code = err?.cause?.code || err?.code || (err.name === "AbortError" ? "timeout" : err.name);
    return { status: 0, finalUrl: null, ms: Date.now() - started, error: String(code) };
  }
}

function classify(rec, result, allowHost, allowId) {
  const allowlisted = allowHost || allowId;
  const reason = allowHost
    ? ALLOW_HOSTS.get(rec.host)
    : allowId
      ? ALLOW_IDS.get(rec.ids.find((id) => ALLOW_IDS.has(id)))
      : null;

  if (result.status >= 200 && result.status < 300) {
    let consent = null;
    try {
      const finalHost = result.finalUrl ? new URL(result.finalUrl).host : null;
      if (finalHost && finalHost !== rec.host && CONSENT_HOSTS.has(finalHost)) consent = finalHost;
    } catch {
      consent = null;
    }
    return { level: "PASS", reason: consent ? `consent-wall redirect to ${consent} (final HTTP 200)` : null };
  }
  if (result.status === 0) {
    const code = result.error || "unknown";
    const dns = /ENOTFOUND|EAI_AGAIN|EAI_FAIL|ENODATA/i.test(code);
    if (dns && !allowlisted) return { level: "FAIL", reason: `DNS failure (${code})` };
    if (dns) return { level: "WARN", reason: `DNS failure (${code}); host allowlisted` };
    return { level: "WARN", reason: `unreachable (${code})${allowlisted ? "; host allowlisted" : ""}` };
  }
  if ([401, 402, 403].includes(result.status)) {
    return {
      level: "WARN",
      reason: `blocked HTTP ${result.status}${allowlisted ? "; allowlisted in research/00-endpoints.md" : ""}${reason ? ` (${reason})` : ""}`,
    };
  }
  if (result.status === 404 || result.status === 410) {
    if (allowlisted) return { level: "WARN", reason: `dead HTTP ${result.status}; host allowlisted` };
    return { level: "FAIL", reason: `dead HTTP ${result.status}` };
  }
  if (result.status === 429) {
    return { level: "WARN", reason: `rate-limited HTTP 429${allowlisted ? "; host allowlisted" : ""}` };
  }
  if (result.status >= 500) {
    return { level: "WARN", reason: `server error HTTP ${result.status} (transient)` };
  }
  return { level: "WARN", reason: `non-200 HTTP ${result.status}` };
}

async function checkRecord(rec, timeoutMs) {
  const result = await fetchOnce(rec.url, timeoutMs);
  const allowHost = rec.host ? ALLOW_HOSTS.has(rec.host) : false;
  const allowId = rec.ids.some((id) => ALLOW_IDS.has(id));
  const cls = classify(rec, result, allowHost, allowId);
  return {
    url: rec.url,
    host: rec.host,
    ids: rec.ids,
    titles: rec.titles,
    retrieved: rec.retrieved,
    archiveUrl: rec.archiveUrl,
    status: result.status,
    finalUrl: result.finalUrl,
    ms: result.ms,
    error: result.error,
    level: cls.level,
    reason: cls.reason,
    allowlisted: allowHost || allowId,
  };
}

async function runExternal(opts) {
  const { totalRecords, list } = loadSources();
  const targets = opts.limit ? list.slice(0, opts.limit) : list;

  const byHost = new Map();
  for (const rec of targets) {
    const host = rec.host || "(invalid)";
    if (!byHost.has(host)) byHost.set(host, []);
    byHost.get(host).push(rec);
  }
  const hosts = [...byHost.keys()].sort();
  for (const host of hosts) byHost.get(host).sort((a, b) => (a.url < b.url ? -1 : 1));

  const results = [];
  let cursor = 0;
  async function worker() {
    while (true) {
      const index = cursor++;
      if (index >= hosts.length) return;
      const host = hosts[index];
      const bucket = byHost.get(host);
      for (let i = 0; i < bucket.length; i++) {
        results.push(await checkRecord(bucket[i], opts.timeout));
        if (i < bucket.length - 1 && opts.delay > 0) await sleep(opts.delay);
      }
    }
  }
  const workers = Math.max(1, Math.min(opts.concurrency, hosts.length));
  await Promise.all(Array.from({ length: workers }, () => worker()));
  results.sort((a, b) => (a.url < b.url ? -1 : a.url > b.url ? 1 : 0));

  const counts = { PASS: 0, WARN: 0, FAIL: 0 };
  for (const r of results) counts[r.level]++;
  const consentWalls = results.filter((r) => r.level === "PASS" && r.reason).length;

  const perHost = hosts.map((host) => {
    const rows = results.filter((r) => (r.host || "(invalid)") === host);
    return {
      host,
      checked: rows.length,
      pass: rows.filter((r) => r.level === "PASS").length,
      warn: rows.filter((r) => r.level === "WARN").length,
      fail: rows.filter((r) => r.level === "FAIL").length,
      allowlisted: ALLOW_HOSTS.has(host),
    };
  });

  return {
    totals: {
      records: totalRecords,
      distinctUrls: list.length,
      checked: targets.length,
      ...counts,
      consentWalls,
    },
    perHost,
    results,
  };
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

function dateOnly(d) {
  return d.toISOString().slice(0, 10);
}

function esc(s) {
  return String(s ?? "").replace(/\|/g, "\\|");
}

function statusLabel(r) {
  if (r.status === 0) return `0 (${r.error || "error"})`;
  return String(r.status);
}

function renderFailTable(fails) {
  if (fails.length === 0) return "_None._\n";
  const lines = [
    "| status | source id | url | retrieval date | verification date | evidence |",
    "| --- | --- | --- | --- | --- | --- |",
  ];
  for (const r of fails) {
    lines.push(
      `| ${esc(statusLabel(r))} | ${esc(r.ids.join(", "))} | ${esc(r.url)} | ${esc(r.retrieved.join(", ") || "n/a")} | ${esc(dateOnly(NOW))} | ${esc(r.reason)} |`,
    );
  }
  return lines.join("\n") + "\n";
}

function renderWarnTable(warns) {
  if (warns.length === 0) return "_None._\n";
  const lines = [
    "| status | source id | url | retrieval date | verification date | reason |",
    "| --- | --- | --- | --- | --- | --- |",
  ];
  for (const r of warns) {
    lines.push(
      `| ${esc(statusLabel(r))} | ${esc(r.ids.join(", "))} | ${esc(r.url)} | ${esc(r.retrieved.join(", ") || "n/a")} | ${esc(dateOnly(NOW))} | ${esc(r.reason)}${r.archiveUrl ? `; archive: ${esc(r.archiveUrl)}` : ""} |`,
    );
  }
  return lines.join("\n") + "\n";
}

function buildGaps(internal, external) {
  const gaps = [];
  const blockedHosts = new Map();
  for (const r of external.results) {
    if (r.level === "WARN" && /blocked|unreachable|DNS|rate-limited|server error|non-200/.test(r.reason || "")) {
      if (!blockedHosts.has(r.host)) blockedHosts.set(r.host, []);
      blockedHosts.get(r.host).push(r);
    }
  }
  for (const [host, rows] of [...blockedHosts.entries()].sort()) {
    const ids = [...new Set(rows.flatMap((r) => r.ids))].sort();
    const statuses = [...new Set(rows.map(statusLabel))].join(", ");
    gaps.push({
      gap: `Host ${host} could not be verified (status ${statuses}); ${rows.length} source URL(s) affected.`,
      endpoint: rows[0].url,
      ids,
    });
  }
  const archived = external.results.filter((r) => r.archiveUrl).length;
  if (archived === 0) {
    gaps.push({
      gap:
        "No checked source record carries an archiveUrl, so a blocked or moved source has no archive fallback.",
      endpoint: "data/sources.json (add archiveUrl per record, for example a web.archive.org or repository.overheid.nl copy)",
      ids: [],
    });
  }
  if (!internal.navOk || internal.brokenCount > 0) {
    gaps.push({
      gap: "Broken internal links or missing navigation routes must be fixed before launch.",
      endpoint: "web/out (rebuild the static export after the fix)",
      ids: [],
    });
  }
  return gaps;
}

function renderReport({ internal, external, opts, startedAt }) {
  const ip = internal;
  const ext = external;
  const fails = ext.results.filter((r) => r.level === "FAIL");
  const warns = ext.results.filter((r) => r.level === "WARN");
  const gaps = buildGaps(ip, ext);
  const commands = opts.commands
    ? opts.commands
    : "node scripts/check-links.mjs --help\nnode scripts/check-links.mjs --internal-only\nnode scripts/check-links.mjs --external-only --limit 40\nnode scripts/check-links.mjs --report research/qa/link-check.md";

  const lines = [];
  lines.push("# Link check: Staatsgraaf Phase 4");
  lines.push("");
  lines.push(`- Date: ${dateOnly(startedAt)}`);
  lines.push("- Role: QA-link agent (Phase 4 link checker, find only, do not fix)");
  lines.push(`- Dataset snapshot id: \`${SNAPSHOT_ID}\` (from \`data/meta.json\`)`);
  lines.push(`- Checked at: ${startedAt.toISOString()}`);
  lines.push("- Commands run:");
  for (const c of commands.split("\n")) lines.push(`  - \`${c}\``);
  lines.push("");
  lines.push("## Summary counts");
  lines.push("");
  lines.push(`- Internal pages scanned: ${ip.pagesScanned}`);
  lines.push(`- Internal href/src checked (occurrences): ${ip.internalOccurrences}`);
  lines.push(`- Internal distinct href/src values: ${ip.distinctInternalRefs}`);
  lines.push(`- Internal broken links: ${ip.brokenCount}`);
  lines.push(`- External href in HTML (not checked here): ${ip.externalRefsInHtml}`);
  lines.push(`- Source records in data/sources.json: ${ext.totals.records}`);
  lines.push(`- External distinct source URLs checked: ${ext.totals.checked} of ${ext.totals.distinctUrls}`);
  lines.push(`- PASS: ${ext.totals.PASS}`);
  lines.push(`- WARN: ${ext.totals.WARN}`);
  lines.push(`- FAIL: ${ext.totals.FAIL}`);
  lines.push(`- GAP: ${gaps.length}`);
  lines.push(`- Consent-wall redirects (still PASS with final HTTP 200): ${ext.totals.consentWalls}`);
  lines.push("");
  lines.push("## 1. Internal links (web/out)");
  lines.push("");
  if (ip.brokenCount === 0 && ip.navOk) {
    lines.push(
      `PASS. All ${ip.internalOccurrences} internal href/src occurrences across ${ip.pagesScanned} pages resolve to a file in \`web/out\`. Navigation (top bar, footer, root) resolves; breadcrumbs are data-driven links covered by the same scan.`,
    );
  } else {
    if (ip.brokenCount > 0) {
      lines.push(`FAIL. ${ip.brokenCount} broken internal link occurrence(s) across ${ip.brokenGrouped.length} distinct target(s).`);
      lines.push("");
      lines.push("| page | target | attribute | tried |");
      lines.push("| --- | --- | --- | --- |");
      for (const b of ip.broken) {
        lines.push(`| ${esc(b.page)} | ${esc(b.target)} | ${esc(b.attr)} | ${esc(b.tried.join(", "))} |`);
      }
      lines.push("");
    }
    if (!ip.navOk) {
      lines.push("Missing navigation routes:");
      lines.push("");
      lines.push("| area | href | resolves |");
      lines.push("| --- | --- | --- |");
      for (const n of ip.nav) if (!n.ok) lines.push(`| ${esc(n.where)} | ${esc(n.href)} | no |`);
      lines.push("");
    }
  }
  lines.push("");
  lines.push("### Navigation route check");
  lines.push("");
  lines.push("| area | href | resolves | file |");
  lines.push("| --- | --- | --- | --- |");
  for (const n of ip.nav) lines.push(`| ${esc(n.where)} | ${esc(n.href)} | ${n.ok ? "yes" : "no"} | ${esc(n.file || "")} |`);
  lines.push("");
  lines.push("## 2. External source URLs (data/sources.json)");
  lines.push("");
  lines.push(
    "Method: one HTTPS GET per distinct URL, browser User-Agent, redirects followed, no cookies, no retry, per-request timeout " +
      `${opts.timeout} ms, at most ${opts.concurrency} hosts in flight, ${opts.delay} ms between requests to the same host. ` +
      "Blocks were respected, never evaded. 403/401/402 is a block (WARN), a 404 or DNS failure is FAIL (unless the host is allowlisted).",
  );
  lines.push("");
  lines.push("### FAIL");
  lines.push("");
  lines.push(renderFailTable(fails));
  lines.push("### WARN");
  lines.push("");
  lines.push(renderWarnTable(warns));
  lines.push("### GAP");
  lines.push("");
  if (gaps.length === 0) {
    lines.push("_None._");
  } else {
    lines.push("| gap | endpoint to fix | source ids |");
    lines.push("| --- | --- | --- |");
    for (const g of gaps) lines.push(`| ${esc(g.gap)} | ${esc(g.endpoint)} | ${esc(g.ids.join(", ") || "-")} |`);
  }
  lines.push("");
  lines.push("### Per-host summary");
  lines.push("");
  lines.push("| host | checked | pass | warn | fail | allowlisted |");
  lines.push("| --- | --- | --- | --- | --- | --- |");
  for (const h of ext.perHost) {
    lines.push(`| ${esc(h.host)} | ${h.checked} | ${h.pass} | ${h.warn} | ${h.fail} | ${h.allowlisted ? "yes" : "no"} |`);
  }
  lines.push("");
  lines.push("## 3. Verdict");
  lines.push("");
  lines.push(
    fails.length === 0
      ? "No open FAIL. External blocks and unreachable hosts are recorded as WARN/GAP above; internal links resolve."
      : `${fails.length} open FAIL(s): see the FAIL table. A build cannot ship with an open FAIL.`,
  );
  lines.push("");
  lines.push("## Appendix A. Every external source URL checked");
  lines.push("");
  lines.push("Status is the final HTTP status after redirects (0 means a network error; the error code is shown).");
  lines.push("");
  lines.push("```");
  lines.push("STATUS  RETRIEVED            URL");
  for (const r of ext.results) {
    lines.push(`${String(statusLabel(r)).padEnd(7)} ${(r.retrieved.join(",") || "n/a").padEnd(20)} ${r.url}`);
  }
  lines.push("```");
  lines.push("");
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const NOW = new Date();
let SNAPSHOT_ID = "unknown";
try {
  SNAPSHOT_ID = JSON.parse(readFileSync(META_FILE, "utf8")).snapshotId ?? "unknown";
} catch {
  /* meta missing, keep unknown */
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help) {
    process.stdout.write(HELP);
    return;
  }

  const startedAt = new Date();
  const wantInternal = !opts.externalOnly;
  const wantExternal = !opts.internalOnly;

  const internal = wantInternal ? runInternal() : null;
  const external = wantExternal ? await runExternal(opts) : null;

  if (opts.json) {
    process.stdout.write(JSON.stringify({ snapshotId: SNAPSHOT_ID, internal, external }, null, 2) + "\n");
  } else if (!opts.report) {
    if (internal) {
      console.log(`internal: ${internal.pagesScanned} pages, ${internal.internalOccurrences} refs, ${internal.brokenCount} broken, nav ${internal.navOk ? "ok" : "MISSING"}`);
    }
    if (external) {
      const t = external.totals;
      console.log(`external: ${t.checked}/${t.distinctUrls} distinct URLs (${t.records} records), PASS ${t.PASS}, WARN ${t.WARN}, FAIL ${t.FAIL}, consent-redirect ${t.consentWalls}`);
    }
  }

  if (opts.report) {
    if (!internal || !external) throw new Error("--report requires both internal and external checks");
    mkdirSync(dirname(opts.report), { recursive: true });
    writeFileSync(opts.report, renderReport({ internal, external, opts, startedAt }));
    console.log(`report written: ${opts.report}`);
  }

  const fails = external ? external.totals.FAIL : 0;
  const internalFail = internal ? internal.brokenCount + (internal.navOk ? 0 : 1) : 0;
  process.exit(fails + internalFail > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(`check-links: ${err.message}`);
  process.exit(2);
});
