import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import {
  contrastRatio,
  hexToRgb,
  isRoyalTitle,
  MONARCHY_COLOR,
  mixSrgb,
  personColorFor,
  TINT,
} from "./person-color";
import { PARTIES, UNLISTED_PARTIES } from "./parties";

const tokens = JSON.parse(readFileSync(new URL("../../shared/tokens.json", import.meta.url), "utf8"));

describe("personColorFor", () => {
  test("a party colour wins over any role", () => {
    expect(personColorFor({ partyColor: "#0A2CCA", mainTitle: "Minister van Financiën", branch: "regering" })).toEqual({
      color: "#0A2CCA",
      source: "party",
    });
  });

  test("the King takes the monarchy colour", () => {
    expect(personColorFor({ partyColor: null, mainTitle: "Koning der Nederlanden", branch: "regering" })).toEqual({
      color: MONARCHY_COLOR,
      source: "monarchy",
    });
  });

  test("a minister without a party takes the government branch colour", () => {
    expect(personColorFor({ partyColor: null, mainTitle: "Minister van Defensie", branch: "regering" })).toEqual({
      color: "var(--t-color-sector-regering)",
      source: "branch",
    });
  });

  test("a judge takes the judiciary colour", () => {
    expect(personColorFor({ partyColor: null, mainTitle: "President", branch: "rechterlijke-macht" })?.color).toBe(
      "var(--t-color-sector-rechterlijke-macht)",
    );
  });

  test("nothing known is neutral", () => {
    expect(personColorFor({ partyColor: null, mainTitle: null, branch: null })).toBeNull();
    expect(personColorFor({ partyColor: "", mainTitle: null, branch: null })).toBeNull();
  });

  test("royal titles, and not the Commissaris van de Koning", () => {
    expect(isRoyalTitle("Koning der Nederlanden")).toBe(true);
    expect(isRoyalTitle("Koningin")).toBe(true);
    expect(isRoyalTitle("Prinses van Oranje")).toBe(true);
    expect(isRoyalTitle("Commissaris van de Koning in Utrecht")).toBe(false);
    expect(isRoyalTitle("Directeur van het Kabinet van de Koning")).toBe(false);
    expect(isRoyalTitle(null)).toBe(false);
  });
});

describe("card tint contrast", () => {
  const partyColors = [...PARTIES, ...UNLISTED_PARTIES].map((party) => party.color).filter((color) => color !== null);

  for (const theme of ["light", "dark"]) {
    const palette = tokens.color[theme];
    const sectors = Object.entries(palette)
      .filter(([key]) => key.startsWith("sector-"))
      .map(([, value]) => value);
    const colors = [...partyColors, ...sectors, palette.accent, palette["line-strong"]];

    test(`ink and muted ink stay at 4.5:1 on the card fill in ${theme} mode`, () => {
      const surface = hexToRgb(palette.surface);
      for (const color of colors) {
        for (const pct of [TINT.fill, TINT.fillHover, TINT.chipActive]) {
          const fill = mixSrgb(hexToRgb(color), surface, pct);
          expect(contrastRatio(hexToRgb(palette.ink), fill)).toBeGreaterThanOrEqual(4.5);
          expect(contrastRatio(hexToRgb(palette["ink-muted"]), fill)).toBeGreaterThanOrEqual(4.5);
        }
      }
    });

    test(`initials stay at 4.5:1 on the portrait tint in ${theme} mode`, () => {
      const raised = hexToRgb(palette["surface-raised"]);
      for (const color of colors) {
        const fill = mixSrgb(hexToRgb(color), raised, TINT.portrait);
        expect(contrastRatio(hexToRgb(palette.ink), fill)).toBeGreaterThanOrEqual(4.5);
      }
    });
  }
});
