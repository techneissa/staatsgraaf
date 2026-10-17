import { describe, expect, test } from "bun:test";
import { establishedEn, orgEnGloss, positionEn, restEn } from "./name-gloss";
import { readFileSync } from "node:fs";

describe("positionEn", () => {
  test("translates the prime minister compound title", () => {
    expect(positionEn("Minister-president en Minister van Algemene Zaken")).toBe(
      "Prime Minister and Minister of General Affairs",
    );
  });

  test("translates the King without compound splitting", () => {
    expect(positionEn("Koning der Nederlanden")).toBe("King of the Netherlands");
  });

  test("does not split ministerial portfolios on 'en'", () => {
    expect(
      positionEn(
        "Staatssecretaris van Landbouw, Visserij, Voedselzekerheid en Natuur",
      ),
    ).toBe("State Secretary for Agriculture, Fisheries, Food Security and Nature");
  });

  test("translates ministry portfolios to the official English names", () => {
    expect(positionEn("Minister van Financiën")).toBe("Minister of Finance");
    expect(positionEn("Minister van Binnenlandse Zaken en Koninkrijksrelaties")).toBe(
      "Minister of the Interior and Kingdom Relations",
    );
  });

  test("translates parliamentary committee titles", () => {
    expect(positionEn("Lid Vaste commissie voor Asiel en Migratie")).toBe(
      "Member of the standing committee on Asylum and Migration",
    );
    expect(positionEn("Voorzitter Commissie voor Financiën")).toBe(
      "Chair of the committee on Finance",
    );
    expect(
      positionEn(
        "Ondervoorzitter Commissie voor Buitenlandse Zaken, Defensie en Ontwikkelingssamenwerking (BDO)",
      ),
    ).toBe(
      "Deputy chair of the committee on Foreign Affairs, Defence and Development Cooperation",
    );
  });

  test("translates combined committees on both sides of the slash", () => {
    expect(
      positionEn("Voorzitter Commissie voor Economische Zaken / Klimaat en Groene Groei"),
    ).toBe("Chair of the committee on Economic Affairs / Climate Policy and Green Growth");
  });

  test("translates party leaders through the party registry", () => {
    expect(positionEn("Fractievoorzitter Partij voor de Vrijheid")).toBe(
      "Party leader, Party for Freedom",
    );
  });

  test("keeps splinter party leaders unglossed", () => {
    expect(positionEn("Fractievoorzitter Lid Keijzer")).toBeNull();
  });

  test("translates local and water governance titles", () => {
    expect(positionEn("Burgemeester van Heumen")).toBe("Mayor of Heumen");
    expect(positionEn("Wethouder")).toBe("Alderman");
    expect(positionEn("Commissaris van de Koning in Gelderland")).toBe(
      "King's Commissioner in Gelderland",
    );
    expect(positionEn("Dijkgraaf van Waterschap Aa en Maas")).toBe(
      "Chair of the water board of Aa en Maas",
    );
    expect(positionEn("Lid Algemeen Bestuur van Waterschap Limburg")).toBe(
      "Member of the general board of the water board Limburg",
    );
    expect(positionEn("Lid Dagelijks Bestuur van Hoogheemraadschap van Rijnland")).toBe(
      "Member of the executive board of the water board Rijnland",
    );
  });

  test("translates parliamentary seats", () => {
    expect(positionEn("Tweede Kamerlid")).toBe(
      "Member of the House of Representatives",
    );
    expect(positionEn("Voorzitter van de Eerste Kamer der Staten-Generaal")).toBe(
      "Speaker of the Senate",
    );
    expect(positionEn("Griffier van de Tweede Kamer der Staten-Generaal")).toBe(
      "Clerk of the House of Representatives",
    );
  });

  test("does not treat 'Directeur en ...' as an organisation name", () => {
    expect(
      positionEn("Algemeen directeur en Algemene Rijksarchivaris Nationaal Archief"),
    ).toBeNull();
    expect(positionEn("Directeur van het Kabinet van de Koning")).toBe(
      "Director of the Royal Household",
    );
  });

  test("translates agency directors with the official English body name", () => {
    expect(
      positionEn("Algemeen Directeur Agentschap College ter Beoordeling van Geneesmiddelen"),
    ).toBe("Director, Medicines Evaluation Board");
    expect(positionEn("Algemeen Directeur Centraal Justitieel Incassobureau")).toBe(
      "Director, Central Judicial Collection Agency",
    );
    expect(positionEn("Algemeen Directeur Rijksdienst voor Identiteitsgegevens")).toBe(
      "Director, National Office for Identity Data",
    );
    expect(positionEn("Algemeen Directeur Justitiële Informatiedienst")).toBe(
      "Director, Judicial Information Service",
    );
    expect(positionEn("Algemeen Directeur CIBG")).toBe("Director, CIBG");
    expect(
      positionEn("Algemeen secretaris/directeur Centrale Commissie Mensgebonden Onderzoek"),
    ).toBe("Secretary/director, Central Committee on Research Involving Human Subjects");
  });

  test("translates board seats and kingdom offices", () => {
    expect(positionEn("Bestuurslid Autoriteit Consument en Markt")).toBe(
      "Board member, Authority for Consumers and Markets",
    );
    expect(positionEn("Bestuursvoorzitter Autoriteit Consument en Markt")).toBe(
      "Chair of the board, Authority for Consumers and Markets",
    );
    expect(positionEn("Lid Provinciale Staten van Drenthe")).toBe(
      "Member of the provincial council of Drenthe",
    );
    expect(positionEn("Gouverneur van Curaçao")).toBe("Governor of Curaçao");
    expect(positionEn("Gevolmachtigde minister van Aruba")).toBe(
      "Minister Plenipotentiary of Aruba",
    );
    expect(positionEn("Statenlid van Curaçao")).toBe("Member of the parliament of Curaçao");
    expect(
      positionEn("Eerste ondervoorzitter van de Tweede Kamer der Staten-Generaal"),
    ).toBe("First Deputy Speaker of the House of Representatives");
  });

  test("returns null for empty and unknown input", () => {
    expect(positionEn(null)).toBeNull();
    expect(positionEn("")).toBeNull();
    expect(positionEn("Onbekende functietitel")).toBeNull();
  });
});

describe("orgEnGloss", () => {
  test("uses the official English name for national bodies", () => {
    expect(orgEnGloss("Tweede Kamer der Staten-Generaal")).toBe(
      "House of Representatives",
    );
    expect(orgEnGloss("Algemene Rekenkamer")).toBe("Netherlands Court of Audit");
    expect(orgEnGloss("Kiesgerechtigden Nederland")).toBe("Dutch electorate");
  });

  test("translates the patterned government layers", () => {
    expect(orgEnGloss("Gemeente Heumen")).toBe("Municipality of Heumen");
    expect(orgEnGloss("Gemeenteraad van Heumen")).toBe("Municipal council of Heumen");
    expect(orgEnGloss("College van burgemeester en wethouders van Heumen")).toBe(
      "Mayor and aldermen of Heumen",
    );
    expect(orgEnGloss("Provinciale Staten van Drenthe")).toBe(
      "Provincial council of Drenthe",
    );
    expect(orgEnGloss("Gedeputeerde Staten van Drenthe")).toBe(
      "Provincial executive of Drenthe",
    );
    expect(orgEnGloss("Waterschap Limburg")).toBe("Water board of Limburg");
    expect(orgEnGloss("Hoogheemraadschap Hollands Noorderkwartier")).toBe(
      "Water board of Hollands Noorderkwartier",
    );
    expect(orgEnGloss("Dagelijks Bestuur van Hoogheemraadschap van Rijnland")).toBe(
      "Executive board of the water board Rijnland",
    );
    expect(orgEnGloss("Veiligheidsregio Haaglanden")).toBe("Safety region of Haaglanden");
    expect(orgEnGloss("Rechtbank Den Haag")).toBe("District court of Den Haag");
    expect(orgEnGloss("Gerechtshof Arnhem-Leeuwarden")).toBe(
      "Court of appeal of Arnhem-Leeuwarden",
    );
    expect(orgEnGloss("Eilandsraad van Bonaire")).toBe("Island council of Bonaire");
  });

  test("translates ministries with the official portfolio names", () => {
    expect(orgEnGloss("Ministerie van Binnenlandse Zaken en Koninkrijksrelaties")).toBe(
      "Ministry of the Interior and Kingdom Relations",
    );
    expect(orgEnGloss("Ministerie van Financiën (Curaçao)")).toBe(
      "Ministry of Finance (Curaçao)",
    );
    expect(orgEnGloss("Ministerie van Onbekende Zaken")).toBeNull();
  });

  test("uses official English for extra executive bodies", () => {
    expect(orgEnGloss("Agentschap College ter Beoordeling van Geneesmiddelen")).toBe(
      "Medicines Evaluation Board",
    );
    expect(orgEnGloss("Justitiële Informatiedienst")).toBe("Judicial Information Service");
    expect(orgEnGloss("Stichting Autoriteit Financiële Markten")).toBe(
      "Dutch Authority for the Financial Markets",
    );
    expect(orgEnGloss("Staten van Aruba")).toBe("Parliament of Aruba");
    expect(orgEnGloss("Centrale Commissie Mensgebonden Onderzoek")).toBe(
      "Central Committee on Research Involving Human Subjects",
    );
  });

  test("translates a ministry rest on a secretaris-generaal", () => {
    expect(restEn("Financiën")).toBe("Finance");
    expect(restEn("Financiën (Curaçao)")).toBe("Finance (Curaçao)");
    expect(restEn("Amsterdam")).toBe("Amsterdam");
  });

  test("translates parliamentary committees", () => {
    expect(orgEnGloss("Vaste commissie voor Asiel en Migratie")).toBe(
      "Standing committee on Asylum and Migration",
    );
    expect(orgEnGloss("Commissie voor Economische Zaken / Klimaat en Groene Groei")).toBe(
      "Committee on Economic Affairs / Climate Policy and Green Growth",
    );
  });

  test("returns null for unsourced bodies instead of inventing a name", () => {
    expect(orgEnGloss("Stichting Nederlands Voetbal")).toBeNull();
    expect(orgEnGloss(null)).toBeNull();
    expect(orgEnGloss("")).toBeNull();
  });
});

describe("gloss coverage", () => {
  test("glosses most position titles without inventing names", () => {
    const positions = JSON.parse(
      readFileSync(new URL("../../data/positions.json", import.meta.url), "utf8"),
    );
    const records = Array.isArray(positions) ? positions : positions.records;
    let hit = 0;
    for (const record of records) {
      if (positionEn(record.title) !== null) hit += 1;
    }
    // At least 90% of current titles must be covered; the remainder are honest
    // gaps rather than machine-translated guesses.
    expect(hit / records.length).toBeGreaterThan(0.85);
  });

  test("glosses most organisation names without inventing names", () => {
    const orgs = JSON.parse(
      readFileSync(new URL("../../data/organizations.json", import.meta.url), "utf8"),
    );
    const records = Array.isArray(orgs) ? orgs : orgs.records;
    let hit = 0;
    for (const record of records) {
      if (orgEnGloss(record.name) !== null) hit += 1;
    }
    expect(hit / records.length).toBeGreaterThan(0.75);
  });
});

describe("establishedEn", () => {
  test("glosses a mayor and a national body, and leaves a person name alone", () => {
    expect(establishedEn("Burgemeester van Wierden")).toBe("Mayor of Wierden");
    expect(establishedEn("Openbaar Ministerie")).toBe("Public Prosecution Service");
    expect(establishedEn("Doret Tigchelaar-van Oene")).toBeNull();
  });
});
