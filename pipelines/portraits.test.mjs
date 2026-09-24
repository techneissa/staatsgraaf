import { test } from "node:test";
import assert from "node:assert/strict";

import {
  normalizeName,
  nameTokens,
  nameForms,
  formatWikidataTime,
  candidateProfile,
  scoreCandidate,
  selectEntity,
  mapLicense,
  buildCredit,
  imageExtension,
  buildMediaRecord,
  commonsSourceId,
  wikidataSourceId,
  renderPortraitReport,
  buildTkMediaRecord as tkMedia,
  isEkWebsitePortrait as ekPortrait,
  matchTkMembers as tkMatch,
  isBlockedFile,
  tkPersoonMatches,
  resolveReviewed,
  fetchWikipediaImage,
  ENWIKI_API,
} from "./portraits.mjs";

const person = {
  id: "person:rob-jetten",
  slug: "rob-jetten",
  name: "Rob Jetten",
  aliases: ["Rob Jetten"],
  birthDate: "1987-03-25",
};

function entity(overrides = {}) {
  return {
    id: "Q28860866",
    labels: { nl: { language: "nl", value: "Rob Jetten" } },
    descriptions: { nl: { language: "nl", value: "Nederlands politicus" } },
    aliases: { nl: [] },
    sitelinks: { nlwiki: { site: "nlwiki", title: "Rob Jetten" } },
    claims: {
      P31: [{ mainsnak: { datavalue: { value: { id: "Q5" } } } }],
      P18: [{ mainsnak: { datavalue: { value: "Rob Jetten, March 2026 - 02.jpg" } } }],
      P569: [{ mainsnak: { datavalue: { value: { time: "+1987-03-25T00:00:00Z", precision: 11 } } } }],
      P27: [{ mainsnak: { datavalue: { value: { id: "Q29999" } } } }],
    },
    ...overrides,
  };
}

test("normalizeName strips accents, punctuation and case", () => {
  assert.equal(normalizeName("Dé Hogeschool van A'dam"), "de hogeschool van a dam");
  assert.equal(normalizeName("A.J.M. van Kesteren"), "a j m van kesteren");
  assert.equal(normalizeName(null), "");
});

test("nameTokens drops forms of address but keeps initials", () => {
  assert.deepEqual(nameTokens("dhr. D.G. (Derk) Boswijk"), ["d", "g", "derk", "boswijk"]);
  assert.deepEqual(nameTokens("mr. J. de Vries"), ["j", "de", "vries"]);
});

test("nameForms adds the call name from parentheses and caps the list", () => {
  const forms = nameForms({
    name: "Derk Boswijk",
    aliases: ["dhr. D.G. (Derk) Boswijk", "Derk Boswijk", "Boswijk"],
  });
  assert.equal(forms[0], "dhr. D.G. (Derk) Boswijk");
  assert.ok(forms.includes("Derk Boswijk"));
  assert.ok(forms.length <= 3);
  assert.equal(new Set(forms.map(normalizeName)).size, forms.length);
});

test("nameForms works without aliases", () => {
  assert.deepEqual(nameForms({ name: "Silvio Erkens" }), ["Silvio Erkens"]);
  assert.deepEqual(nameForms(undefined), []);
});

test("formatWikidataTime respects precision", () => {
  assert.equal(formatWikidataTime({ time: "+1987-03-25T00:00:00Z", precision: 11 }), "1987-03-25");
  assert.equal(formatWikidataTime({ time: "+1987-03-00T00:00:00Z", precision: 10 }), "1987-03");
  assert.equal(formatWikidataTime({ time: "+1987-00-00T00:00:00Z", precision: 9 }), "1987");
  assert.equal(formatWikidataTime({ time: "+1987-00-00T00:00:00Z", precision: 7 }), null);
  assert.equal(formatWikidataTime(null), null);
});

test("candidateProfile reads claims, labels and the nlwiki sitelink", () => {
  const profile = candidateProfile(entity());
  assert.equal(profile.id, "Q28860866");
  assert.equal(profile.isHuman, true);
  assert.equal(profile.image, "Rob Jetten, March 2026 - 02.jpg");
  assert.deepEqual(profile.images, ["Rob Jetten, March 2026 - 02.jpg"]);
  assert.equal(profile.birthDate, "1987-03-25");
  assert.deepEqual(profile.citizenship, ["Q29999"]);
  assert.equal(profile.wikipedia, "https://nl.wikipedia.org/wiki/Rob_Jetten");
  assert.equal(candidateProfile(null), null);
});

test("scoreCandidate rejects non-humans, foreign citizenship and name misses", () => {
  assert.equal(scoreCandidate(candidateProfile(entity({ claims: {} })), person), null);
  assert.equal(
    scoreCandidate(
      candidateProfile(
        entity({
          claims: {
            ...entity().claims,
            P27: [{ mainsnak: { datavalue: { value: { id: "Q30" } } } }],
          },
        }),
      ),
      person,
    ),
    null,
  );
  assert.equal(
    scoreCandidate(candidateProfile(entity({ labels: { nl: { value: "Rob Jeltema" } } })), person),
    null,
  );
});

test("scoreCandidate matches a name subset and flags a checked birth date", () => {
  const scored = scoreCandidate(candidateProfile(entity()), person);
  assert.ok(scored);
  assert.equal(scored.exact, true);
  assert.equal(scored.birthChecked, true);
});

test("scoreCandidate matches initials-only labels against aliases", () => {
  const profile = candidateProfile(
    entity({
      id: "Q136555085",
      labels: { nl: { value: "Rob Jetten" } },
      aliases: { nl: [{ value: "R.H.A. Jetten" }] },
      claims: { ...entity().claims, P569: [] },
    }),
  );
  const scored = scoreCandidate(profile, person);
  assert.ok(scored);
  assert.equal(scored.exact, true);
});

test("scoreCandidate rejects a conflicting birth date", () => {
  const profile = candidateProfile(
    entity({
      claims: {
        ...entity().claims,
        P569: [{ mainsnak: { datavalue: { value: { time: "+1970-01-01T00:00:00Z", precision: 11 } } } }],
      },
    }),
  );
  assert.equal(scoreCandidate(profile, person), null);
});

test("selectEntity picks a unique best and turns a tie into a gap", () => {
  const unique = selectEntity([candidateProfile(entity())], person);
  assert.equal(unique.profile.id, "Q28860866");
  assert.equal(unique.confidence, "high");

  const twin = candidateProfile(
    entity({
      id: "Q99999999",
      labels: { nl: { value: "Rob Jetten" } },
      claims: { ...entity().claims, P569: [] },
    }),
  );
  const tied = selectEntity([candidateProfile(entity()), twin], { ...person, birthDate: null });
  assert.equal(tied.profile, null);
  assert.match(tied.reason, /gelijkwaardige kandidaten/);
});

test("selectEntity uses party labels to break a tie", () => {
  const politicians = (id, claims) => candidateProfile(entity({ id, claims }));
  const politician = politicians("Q2220431", {
    ...entity().claims,
    P569: [],
    P102: [{ mainsnak: { datavalue: { value: { id: "Q239337" } } } }],
  });
  const judoka = politicians("Q2442589", { ...entity().claims, P569: [] });
  const personWithParty = { ...person, birthDate: null, party: "VVD" };

  const unresolved = selectEntity([politician, judoka], personWithParty);
  assert.equal(unresolved.profile, null);
  assert.equal(unresolved.tied.length, 2);

  const resolved = selectEntity([politician, judoka], personWithParty, {
    partyLabels: { Q239337: ["Volkspartij voor Vrijheid en Democratie", "VVD"] },
  });
  assert.equal(resolved.profile.id, "Q2220431");
});

test("mapLicense maps known Commons values and refuses the rest", () => {
  assert.equal(mapLicense({ licenseRaw: "CC0" }), "CC0-1.0");
  assert.equal(mapLicense({ licenseRaw: "CC BY 4.0" }), "CC-BY-4.0");
  assert.equal(mapLicense({ licenseRaw: "CC BY-SA 4.0" }), "CC-BY-SA-4.0");
  assert.equal(mapLicense({ licenseRaw: "Public domain" }), "publiek-domein");
  assert.equal(mapLicense({ licenseRaw: "Attribution" }), "Attribution");
  assert.equal(mapLicense({}), null);
});

test("buildCredit names the author and the license", () => {
  assert.equal(
    buildCredit({ author: "Jan Jansen", license: "CC-BY-4.0" }),
    "Foto: Jan Jansen, CC-BY-4.0, via Wikimedia Commons",
  );
  assert.equal(buildCredit({ license: "CC0-1.0" }), "Foto: Wikimedia Commons, CC0-1.0");
  assert.equal(
    buildCredit({ credit: "Rijksoverheid.nl", license: "CC0-1.0" }),
    "Foto: Rijksoverheid.nl, CC0-1.0, via Wikimedia Commons",
  );
});

test("imageExtension keeps the source format and normalises jpeg", () => {
  assert.equal(imageExtension("https://upload.wikimedia.org/a/b/foto.jpg"), ".jpg");
  assert.equal(imageExtension("https://upload.wikimedia.org/a/b/foto.JPEG"), ".jpg");
  assert.equal(imageExtension("https://upload.wikimedia.org/a/b/logo.svg.png"), ".png");
  assert.equal(imageExtension("niet een url"), ".jpg");
});

test("buildMediaRecord points at the local file and omits unknown sizes", () => {
  const record = buildMediaRecord({
    person,
    sourceId: "src:commons-abc",
    image: {
      thumbUrl: "https://upload.wikimedia.org/a/b/foto.jpg",
      license: "CC-BY-4.0",
      author: "Jan Jansen",
      credit: null,
      width: 320,
      height: null,
    },
  });
  assert.equal(record.id, "media:portret-rob-jetten");
  assert.equal(record.url, "/media/portretten/rob-jetten.jpg");
  assert.equal(record.source, "src:commons-abc");
  assert.equal(record.width, 320);
  assert.equal("height" in record, false);
  assert.match(record.credit, /^Foto: Jan Jansen, CC-BY-4.0/);
});

test("source ids are deterministic", () => {
  assert.equal(commonsSourceId("A.jpg"), commonsSourceId("A.jpg"));
  assert.match(commonsSourceId("A.jpg"), /^src:commons-[0-9a-f]+$/);
  assert.equal(wikidataSourceId("rob-jetten"), "src:wikidata-rob-jetten");
});

test("renderPortraitReport writes counts, licenses and gaps", () => {
  const report = renderPortraitReport({
    stats: {
      scanned: 2,
      fromCache: 2,
      queried: 0,
      entityMatches: 1,
      portraitsApplied: 1,
      imagesDownloaded: 1,
      imagesPresent: 0,
    },
    gaps: [{ person: "person:x", name: "X", reason: "geen P18" }],
    licenseCounts: { "CC-BY-4.0": 1, "CC0-1.0": 0 },
    today: "2026-09-18",
  });
  assert.match(report, /# Run report: portretten 18-09-2026/);
  assert.match(report, /\| CC-BY-4.0 \| 1 \|/);
  assert.equal(report.includes("CC0-1.0"), false);
  assert.match(report, /`person:x` \(X\): geen P18/);
});

test("matchTkMembers needs a current TK membership, the full name and an agreeing birth date", () => {
  const members = [
    { id: "a", fullName: "Danny Ranjith Franciscus Clemminck", birthDate: "1986-01-12" },
    { id: "b", fullName: "Jan de Vries", birthDate: "1970-01-01" },
    { id: "c", fullName: "Piet Jansen", birthDate: null },
  ];
  const people = [
    { id: "person:clemminck", name: "Danny Ranjith Franciscus Clemminck", birthDate: "1986-01-12" },
    { id: "person:jan-de-vries", name: "Jan de Vries", birthDate: "1980-05-05" },
    { id: "person:piet-jansen", name: "Piet Jansen" },
    { id: "person:oud-lid", name: "Danny Ranjith Franciscus Clemminck" },
  ];
  const memberships = [
    { organization: "org:tweede-kamer", person: "person:clemminck", end: null },
    { organization: "org:tweede-kamer", person: "person:jan-de-vries", end: null },
    { organization: "org:tweede-kamer", person: "person:piet-jansen", end: null },
    { organization: "org:tweede-kamer", person: "person:oud-lid", end: "2023-01-01" },
  ];
  const matches = tkMatch(members, people, memberships);
  assert.deepEqual(matches.map((m) => [m.person.id, m.member.id, m.birthChecked]), [
    ["person:clemminck", "a", true],
    ["person:piet-jansen", "c", false],
  ]);
});

test("TK media records carry CC0 1.0 and the Kamer as credit; EK website portraits are recognised", () => {
  const record = tkMedia({ slug: "x" });
  assert.equal(record.license, "CC0-1.0");
  assert.equal(record.source, "src:portret-tk-x");
  assert.match(record.credit, /Tweede Kamer der Staten-Generaal, CC0 1\.0/);
  assert.equal(ekPortrait({ source: "src:portret-officieel-y", credit: "Foto: Eerste Kamer der Staten-Generaal, CC BY 4.0" }, { url: "https://www.eerstekamer.nl/persoon/y" }), true);
  assert.equal(ekPortrait({ source: "src:commons-1", credit: "Foto: X" }, null), false);
});

test("mapLicense accepts the European Parliament and Copyrighted free use templates but not GFDL", () => {
  assert.equal(mapLicense({ licenseRaw: "European Parliament" }), "European Parliament");
  assert.equal(mapLicense({ licenseRaw: "Copyrighted free use" }), "Copyrighted free use");
  assert.equal(mapLicense({ licenseRaw: "GFDL 1.2" }), null);
});

test("isBlockedFile refuses files with a pending deletion request or missing permission", () => {
  assert.equal(isBlockedFile({ categories: ["CC-BY-2.0", "Deletion requests June 2026"] }), true);
  assert.equal(isBlockedFile({ categories: ["Media without a license: needs history check"] }), true);
  assert.equal(isBlockedFile({ categories: ["Files with no permission as of 1 June 2026"] }), true);
  assert.equal(isBlockedFile({ categories: ["CC-BY-SA-4.0", "Sjoerd Sjoerdsma"] }), false);
  assert.equal(isBlockedFile({}), false);
});

test("buildCredit gives the European Parliament credit once", () => {
  assert.equal(
    buildCredit({ author: "© European Union, 1998 – 2026", license: "European Parliament" }),
    "Foto: © European Union, 1998 – 2026, Source: European Parliament, hergebruik volgens https://www.europarl.europa.eu/legal-notice/, via Wikimedia Commons",
  );
  assert.equal(
    buildCredit({ author: "European Union 2024 - Source : EP", license: "European Parliament" }),
    "Foto: © European Union 2024 - Source : EP, hergebruik volgens https://www.europarl.europa.eu/legal-notice/, via Wikimedia Commons",
  );
  assert.match(buildCredit({ author: "Alexis Haulot / EP", license: "European Parliament" }), /^Foto: Alexis Haulot \/ EP, © European Union, Source: European Parliament/);
});

function jsonResponse(body) {
  return { ok: true, status: 200, json: async () => body, headers: { get: () => "application/json" } };
}

test("fetchWikipediaImage queries the endpoint it is given", async () => {
  const urls = [];
  const fetchImpl = async (url) => {
    urls.push(url);
    return jsonResponse({ query: { pages: {} } });
  };
  const result = await fetchWikipediaImage("Rob_Jetten", { fetchImpl, endpoint: ENWIKI_API });
  assert.equal(result.ok, false);
  assert.ok(urls[0].startsWith(ENWIKI_API));
});

test("tkPersoonMatches needs the reviewed name and the exact birth date", () => {
  const member = { fullName: "Hendrikus Jager", callName: "Rikus Jager", birthDate: "1954-05-18" };
  assert.equal(tkPersoonMatches(member, { expectName: "Rikus Jager", birthDate: "1954-05-18" }), true);
  assert.equal(tkPersoonMatches(member, { expectName: "Rikus Jager", birthDate: "1954-05-19" }), false);
  assert.equal(tkPersoonMatches(member, { expectName: "Rikus Jager" }), false);
  assert.equal(tkPersoonMatches(member, { expectName: "Hans Jager", birthDate: "1954-05-18" }), false);
});

test("resolveReviewed turns a disputed Commons file into a gap, never another file", async () => {
  const fetchImpl = async () => jsonResponse({
    query: {
      pages: {
        1: {
          title: "File:X.jpg",
          categories: [{ title: "Category:Deletion requests June 2026" }],
          imageinfo: [{ thumburl: "https://upload.example/x.jpg", thumbwidth: 320, thumbheight: 400, extmetadata: { LicenseShortName: { value: "Attribution" } } }],
        },
      },
    },
  });
  const result = await resolveReviewed(
    { id: "person:x", slug: "x", name: "X" },
    { kind: "commons", file: "X.jpg", wikidata: "Q1", identity: "test", confidence: "high" },
    { fetchImpl },
  );
  assert.equal(result.image, null);
  assert.equal(result.reviewed, true);
  assert.match(result.gaps[0].reason, /betwiste licentie/);
});

test("resolveReviewed applies a TK photo only when name and birth date agree", async () => {
  const persoon = { Id: "abc", Voornamen: "Hendrikus", Roepnaam: "Rikus", Achternaam: "Jager", Geboortedatum: "1954-05-18T00:00:00", Functie: "Oud Kamerlid", ContentLength: 6509 };
  const fetchImpl = async () => jsonResponse(persoon);
  const ok = await resolveReviewed(
    { id: "person:rikus-jager", slug: "rikus-jager", name: "Rikus Jager" },
    { kind: "tk", tkId: "abc", expectName: "Rikus Jager", birthDate: "1954-05-18", wikidata: "Q1922264", confidence: "high" },
    { fetchImpl },
  );
  assert.equal(ok.image.kind, "tk");
  assert.equal(ok.image.member.resourceUrl.endsWith("Persoon(abc)/resource"), true);
  const wrong = await resolveReviewed(
    { id: "person:rikus-jager", slug: "rikus-jager", name: "Rikus Jager" },
    { kind: "tk", tkId: "abc", expectName: "Rikus Jager", birthDate: "1963-04-11", wikidata: null },
    { fetchImpl },
  );
  assert.equal(wrong.image, null);
});
