import { test } from "node:test";
import assert from "node:assert/strict";

import {
  EILANDGEDEPUTEERDE_SOURCE,
  GEDEPUTEERDE_SOURCE,
  STATUUT_SOURCE,
  WETHOUDER_SOURCE,
  positionOfficeCopy,
  stripOfficeCopyMarkup,
  wettenArtikelUrl,
} from "./position-office-copy.ts";
import { getPositionById } from "./data.ts";

// Gemeentewet art. 35 lid 1, fetched from wetten.overheid.nl on 2026-10-17:
// "De raad benoemt de wethouders." The data field fillMethod says
// benoeming-door-college and is wrong for this office; the copy follows the law.
test("Wethouder cites the Gemeentewet and says the council appoints", () => {
  const copy = positionOfficeCopy({ title: "Wethouder", organization: "org:college-van-bw-aa-en-hunze" });
  assert.ok(copy);
  const nl = stripOfficeCopyMarkup(copy.nl);
  const en = stripOfficeCopyMarkup(copy.en);
  assert.match(nl, /Gemeentewet/);
  assert.match(nl, /gemeenteraad benoemt de wethouders/);
  assert.doesNotMatch(nl, /college[^.]*benoemt/i);
  assert.doesNotMatch(en, /college[^.]*appoints/i);
  assert.match(en, /council appoints the wethouders/);
  assert.equal(WETHOUDER_SOURCE, "https://wetten.overheid.nl/BWBR0005416");
});

test("Wethouder copy links the burgemeester, college, raad and the articles", () => {
  const copy = positionOfficeCopy({ title: "Wethouder", organization: "org:college-van-bw-aa-en-hunze" });
  assert.ok(copy);
  assert.match(copy.nl, /<entity id="pos:burgemeester-aa-en-hunze">burgemeester<\/entity>/);
  assert.match(copy.nl, /<entity id="org:college-van-bw-aa-en-hunze">college van burgemeester en wethouders<\/entity>/);
  assert.match(copy.nl, /<entity id="org:gemeenteraad-aa-en-hunze">gemeenteraad<\/entity>/);
  assert.match(copy.nl, new RegExp(wettenArtikelUrl("BWBR0005416", "34").replaceAll(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(copy.nl, new RegExp(wettenArtikelUrl("BWBR0005416", "35").replaceAll(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(copy.en, /<entity id="org:gemeenteraad-aa-en-hunze">municipal council<\/entity>/);
});

test("the Wethouder copy fits the position house style", () => {
  const copy = positionOfficeCopy({ title: "Wethouder" });
  assert.ok(copy);
  for (const text of [stripOfficeCopyMarkup(copy.nl), stripOfficeCopyMarkup(copy.en)]) {
    assert.doesNotMatch(text, /[—‘’“”]/);
    assert.ok(text.split(/(?<=\.)\s+/).length <= 2);
    assert.doesNotMatch(text, /vacant|vacature/i);
  }
});

test("every Wethouder position in the data gets the copy", () => {
  const position = getPositionById("pos:wethouder-aa-en-hunze");
  assert.ok(position);
  assert.ok(positionOfficeCopy({ title: position.title, organization: position.organization }));
});

// Provinciewet art. 34 lid 1: "De commissaris van de Koning en de gedeputeerden
// vormen te zamen gedeputeerde staten." Art. 35 lid 1: "Provinciale staten
// benoemen de gedeputeerden."
test("Gedeputeerde is covered from the Provinciewet", () => {
  const copy = positionOfficeCopy({ title: "Gedeputeerde", organization: "org:gedeputeerde-staten-drenthe" });
  assert.ok(copy);
  const nl = stripOfficeCopyMarkup(copy.nl);
  assert.match(nl, /Provinciewet/);
  assert.match(nl, /Provinciale Staten benoemen de gedeputeerden/);
  assert.match(copy.nl, /<entity id="pos:commissaris-van-de-koning-drenthe">/);
  assert.match(copy.nl, /<entity id="org:provinciale-staten-drenthe">/);
  assert.equal(GEDEPUTEERDE_SOURCE, "https://wetten.overheid.nl/BWBR0005645");
});

// WolBES art. 36 lid 1: "De gezaghebber en de eilandgedeputeerden vormen te
// zamen het bestuurscollege." Art. 37 lid 1: "De eilandsraad benoemt de
// eilandgedeputeerden."
test("Eilandgedeputeerde names the island from the title", () => {
  const copy = positionOfficeCopy({ title: "Eilandgedeputeerde van Saba", organization: "org:bestuurscollege-saba" });
  assert.ok(copy);
  const nl = stripOfficeCopyMarkup(copy.nl);
  assert.match(nl, /eilandgedeputeerde van Saba/);
  assert.match(nl, /De eilandsraad benoemt de eilandgedeputeerden/);
  assert.match(copy.nl, /<entity id="pos:gezaghebber-saba">/);
  assert.equal(EILANDGEDEPUTEERDE_SOURCE, "https://wetten.overheid.nl/BWBR0028142");
});

// Statuut art. 46 lid 1: "De vertegenwoordigende lichamen worden gekozen door
// de ingezetenen van het betrokken land, tevens Nederlanders, ..." The article
// names no seat counts, so the copy has none.
test("Statenlid names the country from the title and states no seat count", () => {
  const copy = positionOfficeCopy({ title: "Statenlid van Sint Maarten", organization: "org:staten-sint-maarten" });
  assert.ok(copy);
  const nl = stripOfficeCopyMarkup(copy.nl);
  assert.match(nl, /Staten van Sint Maarten/);
  assert.match(nl, /Artikel 46 van het Statuut/i);
  assert.doesNotMatch(nl, /zetel|\b(15|21)\b/);
  assert.equal(STATUUT_SOURCE, "https://wetten.overheid.nl/BWBR0002154");
});

// rijksoverheid.nl organogram pages: "De sg heeft de ambtelijke leiding over
// het ministerie." (EZK, LVVN) and equivalents at AZ, BZ, BZK, Defensie, OCW,
// SZW, VWS. The Financien page has no such sentence: named gap.
test("Secretaris-generaal says ambtelijke leiding, except where the page is silent", () => {
  const copy = positionOfficeCopy({ title: "Secretaris-generaal", organization: "org:ministerie-van-algemene-zaken" });
  assert.ok(copy);
  assert.match(copy.nl, /ambtelijke leiding/);
  assert.equal(
    positionOfficeCopy({ title: "Secretaris-generaal", organization: "org:ministerie-van-financien" }),
    null,
  );
});

// Named gap: no fetched source states what an inspecteur-generaal is or does.
test("Inspecteur-generaal is omitted", () => {
  assert.equal(positionOfficeCopy({ title: "Inspecteur-generaal Inspectie van het Onderwijs" }), null);
});

test("Lid gemeenteraad cites Gemeentewet articles 7 and 8", () => {
  const copy = positionOfficeCopy({
    title: "Lid gemeenteraad van Aa en Hunze",
    organization: "org:gemeenteraad-aa-en-hunze",
  });
  assert.ok(copy);
  const nl = stripOfficeCopyMarkup(copy.nl);
  assert.match(nl, /artikel 7 van de Gemeentewet/);
  assert.match(nl, /artikel 8/);
  assert.doesNotMatch(nl, /rechtstreeks|vier jaar/);
  assert.match(copy.nl, /<entity id="org:gemeenteraad-aa-en-hunze">/);
});

test("Lid Provinciale Staten cites Provinciewet articles 7 and 8", () => {
  const copy = positionOfficeCopy({ title: "Lid Provinciale Staten van Drenthe" });
  assert.ok(copy);
  assert.match(stripOfficeCopyMarkup(copy.nl), /Provinciewet/);
});

test("waterschap board seats cite the Waterschapswet", () => {
  const ab = positionOfficeCopy({ title: "Lid Algemeen Bestuur van Waterschap Aa en Maas" });
  assert.ok(ab);
  assert.match(stripOfficeCopyMarkup(ab.nl), /Waterschapswet/);
  assert.match(stripOfficeCopyMarkup(ab.nl), /achttien/);
  const db = positionOfficeCopy({
    title: "Lid Dagelijks Bestuur van Waterschap Aa en Maas",
    organization: "org:dagelijks-bestuur-aa-en-maas",
  });
  assert.ok(db);
  assert.match(stripOfficeCopyMarkup(db.nl), /artikel 41/);
  assert.match(db.nl, /<entity id="org:algemeen-bestuur-aa-en-maas">/);
});

test("Kamerleden cite the Grondwet seat counts", () => {
  const tk = positionOfficeCopy({
    title: "Lid van de Tweede Kamer der Staten-Generaal",
    organization: "org:tweede-kamer",
  });
  assert.ok(tk);
  const tkNl = stripOfficeCopyMarkup(tk.nl);
  assert.match(tkNl, /honderdvijftig/);
  assert.match(tkNl, /artikel 54/);
  assert.match(tk.nl, /<entity id="org:tweede-kamer">/);
  const ek = positionOfficeCopy({ title: "Lid van de Eerste Kamer der Staten-Generaal" });
  assert.ok(ek);
  const ekNl = stripOfficeCopyMarkup(ek.nl);
  assert.match(ekNl, /vijfenzeventig/);
  assert.match(ekNl, /artikel 55/);
});

test("Griffier cites Grondwet article 61", () => {
  const copy = positionOfficeCopy({ title: "Griffier van de Eerste Kamer der Staten-Generaal" });
  assert.ok(copy);
  assert.match(stripOfficeCopyMarkup(copy.nl), /artikel 61/);
});

test("Burgemeester cites Gemeentewet articles 61 and 34", () => {
  const copy = positionOfficeCopy({
    title: "Burgemeester van Aa en Hunze",
    organization: "org:gemeente-aa-en-hunze",
  });
  assert.ok(copy);
  const nl = stripOfficeCopyMarkup(copy.nl);
  assert.match(nl, /koninklijk besluit benoemd voor zes jaar/);
  assert.match(nl, /artikel 61 van de Gemeentewet/);
  assert.match(copy.nl, /<entity id="org:college-van-bw-aa-en-hunze">/);
});

test("a Dutch minister cites Grondwet articles 43 and 44; a Caribbean minister does not", () => {
  const nlMin = positionOfficeCopy({
    title: "Minister van Justitie en Veiligheid",
    organization: "org:ministerie-van-justitie-en-veiligheid",
    country: "nederland",
    subtype: "ministerie",
  });
  assert.ok(nlMin);
  assert.match(stripOfficeCopyMarkup(nlMin.nl), /artikel 43 van de Grondwet/);
  assert.equal(
    positionOfficeCopy({ title: "Minister van Financiën", organization: "org:ministerie-financien-curacao" }),
    null,
  );
});

test("Dijkgraaf cites Waterschapswet article 46", () => {
  const copy = positionOfficeCopy({ title: "Dijkgraaf van Waterschap Aa en Maas", organization: "org:waterschap-aa-en-maas" });
  assert.ok(copy);
  assert.match(stripOfficeCopyMarkup(copy.nl), /artikel 46 van de Waterschapswet/);
});

test("the Justid and RvIG director copy is keyed on the position id", () => {
  const justid = positionOfficeCopy({
    id: "pos:justitiele-informatiedienst-algemeendirecteur",
    title: "Algemeen Directeur Justitiële Informatiedienst",
    organization: "org:justitiele-informatiedienst",
    parent: "org:ministerie-van-justitie-en-veiligheid",
  });
  assert.ok(justid);
  assert.match(stripOfficeCopyMarkup(justid.nl), /Justitiële Informatiedienst/);
  assert.match(justid.nl, /<entity id="org:justitiele-informatiedienst">/);
  assert.match(justid.nl, /<entity id="org:ministerie-van-justitie-en-veiligheid">/);
});

test("titles without sourced copy return null", () => {
  assert.equal(positionOfficeCopy({ title: "Lid gemeenteraad" }), null);
  assert.equal(positionOfficeCopy({ title: "Lid Commissie voor Financiën (FIN)" }), null);
  assert.equal(positionOfficeCopy({ title: "Minister van Financiën" }), null);
  assert.equal(positionOfficeCopy({ title: "Fractievoorzitter GroenLinks-PvdA" }), null);
});

test("a gevolmachtigde minister cites Statuut articles 7 and 8", () => {
  const copy = positionOfficeCopy({ title: "Gevolmachtigde minister van Aruba" });
  assert.ok(copy);
  const nl = stripOfficeCopyMarkup(copy.nl);
  assert.match(nl, /handelt namens de regering/);
  assert.match(nl, /artikel 8 van het Statuut/);
  assert.match(nl, /artikel 7/);
});

test("a rechtbank president cites Wet RO articles 15 and 27", () => {
  const copy = positionOfficeCopy({
    title: "President van de Rechtbank Amsterdam",
    organization: "org:rechtbank-amsterdam",
  });
  assert.ok(copy);
  const nl = stripOfficeCopyMarkup(copy.nl);
  assert.match(nl, /titel van president/);
  assert.match(nl, /artikel 15 van de Wet op de rechterlijke organisatie/);
  assert.match(nl, /artikel 27/);
  assert.match(copy.nl, /<entity id="org:rechtbank-amsterdam">/);
});

test("a Tweede Kamer vaste commissie cites the Reglement van Orde; an Eerste Kamer committee does not", () => {
  const lid = positionOfficeCopy({
    title: "Lid Vaste commissie voor Financiën",
    organization: "org:tweede-kamer",
  });
  assert.ok(lid);
  assert.match(stripOfficeCopyMarkup(lid.nl), /artikel 7.1/);
  assert.match(lid.nl, /<entity id="org:tweede-kamer">/);
  const chair = positionOfficeCopy({ title: "Voorzitter Vaste commissie voor Defensie" });
  assert.ok(chair);
  assert.match(stripOfficeCopyMarkup(chair.nl), /artikel 7.12/);
  assert.equal(positionOfficeCopy({ title: "Voorzitter Commissie voor Financiën (FIN)" }), null);
});

test("an agentschap director cites Regeling agentschappen article 1", () => {
  const copy = positionOfficeCopy({
    title: "Algemeen Directeur CIBG",
    organization: "org:cibg",
    subtype: "agentschap",
  });
  assert.ok(copy);
  assert.match(stripOfficeCopyMarkup(copy.nl), /eindverantwoordelijkheid/);
  assert.match(stripOfficeCopyMarkup(copy.nl), /Regeling agentschappen 2024/);
});

test("the Rekenkamer president and KNMI hoofddirecteur are keyed on the position id", () => {
  const rekenkamer = positionOfficeCopy({
    id: "pos:president-algemene-rekenkamer",
    title: "President Algemene Rekenkamer",
    organization: "org:algemene-rekenkamer",
  });
  assert.ok(rekenkamer);
  assert.match(stripOfficeCopyMarkup(rekenkamer.nl), /artikel 7.8 van de Comptabiliteitswet 2016/);
  const knmi = positionOfficeCopy({
    id: "pos:koninklijk-nederlands-meteorologisch-instituut-hoofddirecteur",
    title: "Hoofddirecteur Koninklijk Nederlands Meteorologisch Instituut",
    organization: "org:koninklijk-nederlands-meteorologisch-instituut",
  });
  assert.ok(knmi);
  assert.match(stripOfficeCopyMarkup(knmi.nl), /eindverantwoordelijk voor het KNMI/);
});

test("the King, korpschef, ombudsman and kamer chairs cite the fetched articles", () => {
  const king = positionOfficeCopy({ id: "pos:koning", title: "Koning der Nederlanden" });
  assert.ok(king);
  assert.match(stripOfficeCopyMarkup(king.nl), /artikel 24 van de Grondwet/);
  assert.match(stripOfficeCopyMarkup(king.nl), /artikel 42/);
  const korps = positionOfficeCopy({
    title: "Korpschef van de politie",
    organization: "org:politie",
  });
  assert.ok(korps);
  assert.match(stripOfficeCopyMarkup(korps.nl), /leiding en het beheer/);
  assert.match(stripOfficeCopyMarkup(korps.nl), /artikel 27 van de Politiewet 2012/);
  const ombudsman = positionOfficeCopy({
    id: "pos:nationale-ombudsman",
    title: "Nationale ombudsman",
    organization: "org:nationale-ombudsman",
  });
  assert.ok(ombudsman);
  assert.match(stripOfficeCopyMarkup(ombudsman.nl), /benoemd door de Tweede Kamer/);
  assert.match(ombudsman.nl, /<entity id="org:tweede-kamer">/);
  const tk = positionOfficeCopy({
    title: "Voorzitter van de Tweede Kamer der Staten-Generaal",
    organization: "org:tweede-kamer",
  });
  assert.ok(tk);
  assert.match(stripOfficeCopyMarkup(tk.nl), /artikel 61, lid 1 van de Grondwet/);
  const ondervoorzitter = positionOfficeCopy({
    title: "Eerste ondervoorzitter van de Tweede Kamer der Staten-Generaal",
    organization: "org:tweede-kamer",
  });
  assert.ok(ondervoorzitter);
  assert.match(stripOfficeCopyMarkup(ondervoorzitter.nl), /artikel 3.5/);
  assert.match(stripOfficeCopyMarkup(ondervoorzitter.nl), /Presidium/);
});

test("a gouverneur cites that land's reglement article 1", () => {
  const aruba = positionOfficeCopy({ title: "Gouverneur van Aruba", organization: "org:regering-aruba" });
  assert.ok(aruba);
  assert.match(stripOfficeCopyMarkup(aruba.nl), /vertegenwoordiger van de Koning/);
  assert.match(aruba.nl, /BWBR0003900/);
  const curacao = positionOfficeCopy({ title: "Gouverneur van Curaçao" });
  assert.ok(curacao);
  assert.match(curacao.nl, /BWBR0028105/);
});

test("CRvB and CBb presidents reuse Wet RO articles 15 and 27", () => {
  const crvb = positionOfficeCopy({
    title: "President van de Centrale Raad van Beroep",
    organization: "org:centrale-raad-van-beroep",
  });
  assert.ok(crvb);
  assert.match(stripOfficeCopyMarkup(crvb.nl), /titel van president/);
  assert.match(crvb.nl, /<entity id="org:centrale-raad-van-beroep">/);
});

test("the Raad voor de rechtspraak cites Wet RO article 84", () => {
  const chair = positionOfficeCopy({
    title: "Voorzitter van de Raad voor de rechtspraak",
    organization: "org:raad-voor-de-rechtspraak",
  });
  assert.ok(chair);
  assert.match(stripOfficeCopyMarkup(chair.nl), /artikel 84 van de Wet op de rechterlijke organisatie/);
  const lid = positionOfficeCopy({
    title: "Rechterlijk lid van de Raad voor de rechtspraak",
    organization: "org:raad-voor-de-rechtspraak",
  });
  assert.ok(lid);
  assert.match(stripOfficeCopyMarkup(lid.nl), /ten minste drie en ten hoogste vijf leden/);
});

test("Hoge Raad and Raad van State heads are keyed on the position id", () => {
  const hr = positionOfficeCopy({
    id: "pos:president-hoge-raad",
    title: "President van de Hoge Raad",
    organization: "org:hoge-raad",
  });
  assert.ok(hr);
  assert.match(stripOfficeCopyMarkup(hr.nl), /artikel 72 van de Wet op de rechterlijke organisatie/);
  const vp = positionOfficeCopy({
    id: "pos:vice-president-raad-van-state",
    title: "Vice-president Raad van State",
    organization: "org:raad-van-state",
  });
  assert.ok(vp);
  assert.match(stripOfficeCopyMarkup(vp.nl), /voor het leven benoemd/);
});
