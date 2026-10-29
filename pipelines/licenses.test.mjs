import { test } from "node:test";
import assert from "node:assert/strict";

import {
  INSPIRATION_CREDIT,
  SOURCE_FAMILIES,
  buildAttribution,
  recordedLicense,
  summarizePortraits,
  summarizeSources,
} from "./licenses.mjs";

const source = (url, license, extra = {}) => ({ id: `src:${url}`, url, publisher: "X", type: "page", license, ...extra });

const SOURCES = [
  source("https://gegevensmagazijn.tweedekamer.nl/OData/v4/2.0/Persoon(1)", "CC0-1.0"),
  source("https://gegevensmagazijn.tweedekamer.nl/OData/v4/2.0/Persoon(2)", "CC0-1.0"),
  source("https://www.wikidata.org/wiki/Q1", "CC0-1.0"),
  source("https://opendata.cbs.nl/odata/84583NED", "CC-BY-4.0"),
  source("https://commons.wikimedia.org/wiki/File:A.jpg", "CC-BY-SA-4.0"),
  source("https://commons.wikimedia.org/wiki/File:B.jpg", "Attribution"),
  source("https://www.nrc.nl/nieuws/a", "all-rights-reserved", { type: "news" }),
  source("https://www.dutchnews.nl/a", "Koppen en deep links; geen overname van artikeltekst of beeld."),
  source("https://www.ser.nl/", "unknown"),
  source("https://www.knmi.nl/", null),
  source("https://www.example.nl/", "CC0-1.0"),
];

const MEDIA = [
  { type: "portrait", license: "CC0-1.0" },
  { type: "portrait", license: "CC-BY-3.0" },
  { type: "portrait", license: "Attribution" },
  { type: "portrait", license: "CC-BY-SA-4.0" },
  { type: "portrait", license: "CC-BY-SA-2.0" },
  { type: "portrait", license: "publiek-domein" },
  { type: "portrait", license: "European Parliament" },
];

test("recordedLicense reads the recorded value and never invents one", () => {
  assert.equal(recordedLicense({ license: "CC0-1.0" }), "CC0-1.0");
  assert.equal(recordedLicense({ license: "CC-BY-SA-3.0" }), "CC-BY-SA-3.0");
  assert.equal(recordedLicense({ license: null }), "unknown");
  assert.equal(recordedLicense({ license: "unknown" }), "unknown");
  assert.equal(recordedLicense({ license: "iets anders", type: "page" }), "unknown");
  assert.equal(recordedLicense({ license: "iets anders", type: "news" }), "all-rights-reserved");
  assert.equal(
    recordedLicense({ license: "Koppen en deep links; geen overname van artikeltekst of beeld.", type: "page" }),
    "all-rights-reserved",
  );
});

test("summarizeSources splits families, news and unknown, and every source is counted once", () => {
  const summary = summarizeSources(SOURCES);
  assert.equal(summary.total, 11);
  assert.equal(summary.unknown, 2);
  assert.equal(summary.news, 2);
  const tabled = [...summary.families.values()].flatMap((counts) => [...counts.values()]).reduce((a, b) => a + b, 0);
  assert.equal(tabled + summary.news + summary.unknown, summary.total);
  assert.equal(summary.families.get("Tweede Kamer open data").get("CC0-1.0"), 2);
  assert.equal(summary.families.get("Other public bodies").get("CC0-1.0"), 1);
});

test("summarizePortraits groups the licence families", () => {
  const counts = summarizePortraits(MEDIA);
  assert.equal(counts.total, 7);
  assert.equal(counts.cc0, 1);
  assert.equal(counts.by, 2);
  assert.equal(counts.byAttributionOnly, 1);
  assert.equal(counts.bySa, 2);
  assert.equal(counts.publicDomain, 1);
  assert.equal(counts.other.get("European Parliament"), 1);
});

test("buildAttribution is a general document: no per-URL rows, no endpoints, deterministic", () => {
  const first = buildAttribution(SOURCES, MEDIA);
  assert.equal(first, buildAttribution(SOURCES, MEDIA));
  assert.equal(first, buildAttribution([...SOURCES].reverse(), MEDIA));
  assert.ok(first.endsWith("\n") && !first.endsWith("\n\n"));
  assert.ok(!/\b(20\d\d-\d\d-\d\d|\d\d-\d\d-20\d\d)\b/.test(first), "no date that changes between runs");
  for (const item of SOURCES) assert.ok(!first.includes(item.url), `${item.url} is not listed`);
  assert.ok(first.split("\n").length < 120);
});

test("buildAttribution states the code licence as CC BY-NC-SA 4.0 and the data licence as CC BY 4.0", () => {
  const text = buildAttribution(SOURCES, MEDIA);
  assert.ok(text.includes("The code is CC BY-NC-SA 4.0, see `LICENSE`"), "code licence named");
  assert.ok(text.includes("Staatsgraaf (https://github.com/techneissa/staatsgraaf), CC BY-NC-SA 4.0"), "code credit line");
  assert.ok(text.includes("licensed CC BY 4.0, see `LICENSE-DATA`"), "data licence named");
  assert.ok(!/\bMIT\b|PolyForm/.test(text), "no stale code licence");
});

test("buildAttribution credits CivLab as the inspiration and states independence", () => {
  const text = buildAttribution(SOURCES, MEDIA);
  const section = text.split("## Inspiration\n")[1].split("\n## ")[0];
  assert.ok(section.includes("inspired by the Gov Graph (https://graph.civlab.org/us) by CivLab"));
  assert.ok(section.includes("We thank CivLab for the idea."));
  assert.ok(section.includes("not affiliated with or endorsed by CivLab"));
  assert.ok(section.includes("uses none of CivLab's code, data, text or images"));
  assert.ok(section.includes("from the sources listed in this file"));
  assert.equal(section.trim(), INSPIRATION_CREDIT);
});

test("buildAttribution headings are fixed text, never a licence value or a sentence", () => {
  const headings = buildAttribution(SOURCES, MEDIA).split("\n").filter((line) => line.startsWith("#"));
  assert.deepEqual(headings, [
    "# Attribution",
    "## The data licence",
    "## Source families",
    "## Portraits",
    "## News",
    "## Sources with no established licence",
    "## Inspiration",
    "## Where the detail lives",
  ]);
});

test("buildAttribution carries the counts and the licence terms of the families", () => {
  const text = buildAttribution(SOURCES, MEDIA);
  assert.ok(text.includes("11 sources are recorded in all"));
  assert.ok(text.includes("2 news links"));
  assert.ok(text.includes("2 with no established licence"));
  assert.ok(
    text.includes('7 portraits are on record: 1 CC0 1.0, 2 CC BY (1 marked only "Attribution" on Commons), 2 CC BY-SA, 1 public domain, 1 European Parliament.'),
  );
  assert.ok(text.includes("| Centraal Bureau voor de Statistiek | Statistics | CC BY 4.0 | <https://www.cbs.nl/nl-nl/over-ons/website/copyright> | 1 |"));
  assert.ok(text.includes("data/sources.json"));
  assert.ok(text.includes("data/media.json"));
  assert.ok(!text.includes("docs/adr/"));
  assert.ok(!text.includes("research/O-licenses.md"));
});

test("buildAttribution still works without a media file", () => {
  const text = buildAttribution(SOURCES, null);
  assert.ok(text.includes("## Portraits"));
  assert.ok(!text.includes("portraits are on record"));
});

test("every family names a terms page and at least one host, and a host belongs to one family", () => {
  for (const family of SOURCE_FAMILIES) {
    assert.ok(family.hosts.length > 0, family.name);
    assert.ok(/^https:\/\//.test(family.terms), family.name);
  }
  const hosts = SOURCE_FAMILIES.flatMap((family) => family.hosts);
  assert.equal(new Set(hosts).size, hosts.length);
});
