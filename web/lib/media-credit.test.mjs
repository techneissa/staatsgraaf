import { test } from "node:test";
import assert from "node:assert/strict";

import { getDataset } from "./data.ts";
import { licenseInfo, mediaCreditInfo, mediaCreditLine, mediaIsShareAlike, mediaNeedsChangeNote, sourceSiteName } from "./entity.ts";

test("licenseInfo links the licence text for the recorded values", () => {
  assert.deepEqual(licenseInfo("CC0-1.0"), { label: "CC0 1.0", url: "https://creativecommons.org/publicdomain/zero/1.0/" });
  assert.deepEqual(licenseInfo("CC-BY-4.0"), { label: "CC BY 4.0", url: "https://creativecommons.org/licenses/by/4.0/" });
  assert.deepEqual(licenseInfo("CC-BY-SA-3.0"), { label: "CC BY-SA 3.0", url: "https://creativecommons.org/licenses/by-sa/3.0/" });
  assert.equal(licenseInfo("European Parliament").url, "https://www.europarl.europa.eu/legal-notice/en/");
  // No single licence text for these: the source page is the reference.
  assert.equal(licenseInfo("Attribution").url, null);
  assert.equal(licenseInfo("publiek-domein").url, null);
});

test("sourceSiteName names the site, then the publisher, then the host", () => {
  assert.equal(sourceSiteName("https://commons.wikimedia.org/wiki/File:X.jpg", "Wikimedia Commons"), "Wikimedia Commons");
  assert.equal(sourceSiteName("https://gegevensmagazijn.tweedekamer.nl/OData/v4/2.0/Persoon(1)", "Tweede Kamer der Staten-Generaal"), "Tweede Kamer Open Data");
  assert.equal(sourceSiteName("https://example.org/foto", "Voorbeeld BV"), "Voorbeeld BV");
  assert.equal(sourceSiteName("https://www.example.org/foto", null), "example.org");
});

test("mediaCreditInfo reads author, licence and source from the records", () => {
  const info = mediaCreditInfo(
    { credit: "Foto: Foto Kloet, CC-BY-4.0, via Wikimedia Commons", license: "CC-BY-4.0", author: "Foto Kloet", source: "src:x" },
    { url: "https://commons.wikimedia.org/wiki/File:J.jpg", publisher: "Wikimedia Commons", retrieved: "2026-10-05" },
  );
  assert.equal(info.author, "Foto Kloet");
  assert.equal(info.licenseLabel, "CC BY 4.0");
  assert.equal(info.siteName, "Wikimedia Commons");
  assert.equal(info.sourceUrl, "https://commons.wikimedia.org/wiki/File:J.jpg");
  assert.equal(info.retrieved, "2026-10-05");
});

test("mediaCreditInfo falls back to the publisher when no author is recorded", () => {
  const info = mediaCreditInfo(
    { credit: "Foto: Tweede Kamer der Staten-Generaal, CC0 1.0", license: "CC0-1.0", author: null, source: "src:y" },
    { url: "https://gegevensmagazijn.tweedekamer.nl/OData/v4/2.0/Persoon(1)", publisher: "Tweede Kamer der Staten-Generaal", retrieved: "2026-10-05" },
  );
  assert.equal(info.author, "Tweede Kamer der Staten-Generaal");
  assert.equal(info.siteName, "Tweede Kamer Open Data");
});

test("every portrait in the dataset has a licence, a source page and a site name for the (i)", () => {
  const dataset = getDataset();
  const portraits = dataset.media.filter((item) => item.type === "portrait");
  assert.ok(portraits.length > 0);
  for (const item of portraits) {
    const info = mediaCreditInfo(item);
    assert.ok(info.license !== "", `${item.id} has no licence`);
    assert.ok(info.sourceUrl !== null && info.siteName !== null, `${item.id} has no source record`);
    assert.ok(info.author !== null, `${item.id} has neither an author nor a publisher`);
  }
});

// One portrait per licence family (ADR 0025): the credit line names author and licence, and the licences that
// ask for it close with the statement of changes. CC0 and public domain owe none.
const FAMILIES = [
  { license: "CC0-1.0", credit: "Foto: Tweede Kamer der Staten-Generaal, CC0 1.0, via het Open Data Portaal van de Tweede Kamer", changes: false, shareAlike: false },
  { license: "CC-BY-4.0", credit: "Foto: Foto Kloet, CC-BY-4.0, via Wikimedia Commons", changes: true, shareAlike: false },
  { license: "CC-BY-3.0", credit: "Foto: Jan Jansen, CC-BY-3.0, via Wikimedia Commons", changes: true, shareAlike: false },
  { license: "CC-BY-2.0", credit: "Foto: Sebastiaan ter Burg, CC-BY-2.0, via Wikimedia Commons", changes: true, shareAlike: false },
  { license: "CC-BY-SA-4.0", credit: "Foto: Masterishn23, CC-BY-SA-4.0, via Wikimedia Commons", changes: true, shareAlike: true },
  { license: "CC-BY-SA-3.0", credit: "Foto: Een Auteur, CC-BY-SA-3.0, via Wikimedia Commons", changes: true, shareAlike: true },
  { license: "CC-BY-SA-2.0", credit: "Foto: Een Auteur, CC-BY-SA-2.0, via Wikimedia Commons", changes: true, shareAlike: true },
  { license: "Attribution", credit: "Foto: European Union, Attribution, via Wikimedia Commons", changes: true, shareAlike: false },
  { license: "European Parliament", credit: "Foto: \u00a9 European Union, 1998 \u2013 2026, Source: European Parliament, hergebruik volgens https://www.europarl.europa.eu/legal-notice/, via Wikimedia Commons", changes: true, shareAlike: false },
  { license: "Copyrighted free use", credit: "Foto: auteur niet vermeld, vrijgegeven door de Partij voor de Dieren, Copyrighted free use, via Wikimedia Commons", changes: true, shareAlike: false },
  { license: "publiek-domein", credit: "Foto: Een Uploader, publiek-domein, via Wikimedia Commons", changes: false, shareAlike: false },
];

for (const family of FAMILIES) {
  test(`credit line for ${family.license}: author and licence, changes statement ${family.changes ? "present" : "absent"}`, () => {
    const line = mediaCreditLine({ credit: family.credit, license: family.license });
    assert.ok(line.startsWith(family.credit), "the recorded credit stays intact");
    assert.equal(line.endsWith(", verkleind en bijgesneden"), family.changes);
    assert.equal(mediaNeedsChangeNote(family.license), family.changes);
    assert.equal(mediaIsShareAlike(family.license), family.shareAlike);
    const info = mediaCreditInfo(
      { credit: family.credit, license: family.license, author: "Een Auteur", source: "src:x" },
      { url: "https://commons.wikimedia.org/wiki/File:X.jpg", publisher: "Wikimedia Commons", retrieved: "2026-10-05" },
    );
    assert.equal(info.changed, family.changes);
    assert.equal(info.shareAlike, family.shareAlike);
    assert.equal(info.credit, line);
  });
}

test("the statement of changes is added once, and a licence missing from the credit is appended before it", () => {
  const once = mediaCreditLine({ credit: "Foto: A, CC-BY-4.0, via Wikimedia Commons, verkleind en bijgesneden", license: "CC-BY-4.0" });
  assert.equal(once, "Foto: A, CC-BY-4.0, via Wikimedia Commons, verkleind en bijgesneden");
  assert.equal(mediaCreditLine({ credit: "Foto: A", license: "CC-BY-4.0" }), "Foto: A (CC-BY-4.0), verkleind en bijgesneden");
  assert.equal(mediaCreditLine({ credit: "", license: "CC-BY-4.0" }), "CC-BY-4.0, verkleind en bijgesneden");
  assert.equal(mediaCreditLine({ credit: "", license: "" }), "");
});

test("every portrait in the dataset that needs the statement of changes gets it", () => {
  const portraits = getDataset().media.filter((item) => item.type === "portrait");
  assert.ok(portraits.length > 0);
  for (const item of portraits) {
    const line = mediaCreditLine(item);
    assert.equal(line.endsWith(", verkleind en bijgesneden"), mediaNeedsChangeNote(item.license), item.id);
  }
});

test("a credit that spells the licence in its usual form does not get the recorded value appended", () => {
  const credit = "Foto: Tweede Kamer der Staten-Generaal, CC0 1.0, via het Open Data Portaal van de Tweede Kamer";
  assert.equal(mediaCreditLine({ credit, license: "CC0-1.0" }), credit);
});
