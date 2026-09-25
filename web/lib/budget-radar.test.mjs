import { describe, expect, test } from "bun:test";
import {
  axisAngle,
  logTicks,
  ministryShortLabel,
  radarLayout,
  radarLayoutForLabels,
  radarPath,
  scaleFraction,
  shareTicks,
  sharesOf,
  wedgePath,
  wrapLabel,
} from "./budget-radar";
import { formatPercent, formatShare } from "./budget-format";

describe("axis angles", () => {
  test("the first axis points up and the axes run clockwise", () => {
    expect(axisAngle(0, 12)).toBeCloseTo(-Math.PI / 2);
    expect(axisAngle(3, 12)).toBeCloseTo(0);
    expect(axisAngle(6, 12)).toBeCloseTo(Math.PI / 2);
  });
});

describe("labels", () => {
  test("curated short labels per locale", () => {
    expect(ministryShortLabel("Ministerie van Financiën", "nl")).toBe("Financiën");
    expect(ministryShortLabel("Ministerie van Volksgezondheid, Welzijn en Sport", "en")).toBe("Health");
  });

  test("falls back to the portfolio and the English gloss", () => {
    expect(ministryShortLabel("Ministerie van Iets Nieuws", "nl")).toBe("Iets Nieuws");
    expect(ministryShortLabel("Ministerie van Iets Nieuws", "en", "Ministry of Something New")).toBe(
      "Something New",
    );
  });

  test("wraps long labels into two balanced lines", () => {
    expect(wrapLabel("Defensie")).toEqual(["Defensie"]);
    expect(wrapLabel("Binnenlandse Zaken")).toEqual(["Binnenlandse", "Zaken"]);
    expect(wrapLabel("Volksgezondheid")).toEqual(["Volksgezondheid"]);
    expect(wrapLabel("Volks\u00ADgezondheid")).toEqual(["Volks-", "gezondheid"]);
    expect(wrapLabel("Infra\u00ADstructuur")).toEqual(["Infra-", "structuur"]);
    expect(ministryShortLabel("Ministerie van Volksgezondheid, Welzijn en Sport", "nl")).toBe("Volksgezondheid");
  });
});

describe("layout", () => {
  const labels = Array.from({ length: 12 }, () => ["Volksgezondheid"]);

  test("fits a 358 px phone column", () => {
    const layout = radarLayout({ width: 358, labels });
    expect(layout.radius).toBeGreaterThanOrEqual(60);
    for (const label of layout.labels) {
      const width = label.lines[0].length * 11 * 0.56;
      const left = label.anchor === "start" ? label.x : label.anchor === "end" ? label.x - width : label.x - width / 2;
      expect(left).toBeGreaterThanOrEqual(0);
      expect(left + width).toBeLessThanOrEqual(358 + 0.01);
      expect(label.y).toBeGreaterThan(0);
      expect(label.y).toBeLessThan(layout.height);
    }
  });

  test("hyphenates only when it buys a larger circle", () => {
    const names = Array.from({ length: 12 }, () => "Volks\u00ADgezondheid");
    expect(radarLayoutForLabels(358, names).labels[3].lines).toEqual(["Volks-", "gezondheid"]);
    expect(radarLayoutForLabels(1200, names).labels[3].lines).toEqual(["Volksgezondheid"]);
    expect(wrapLabel("Volks\u00ADgezondheid", 10, { hyphenate: false })).toEqual(["Volksgezondheid"]);
  });

  test("caps the radius on a wide column", () => {
    expect(radarLayout({ width: 1200, labels }).radius).toBe(170);
  });

  test("centres the circle horizontally and inside the height", () => {
    const layout = radarLayout({ width: 400, labels });
    expect(layout.cx).toBe(200);
    expect(layout.cy - layout.radius).toBeGreaterThan(0);
    expect(layout.cy + layout.radius).toBeLessThan(layout.height);
  });
});

describe("scales", () => {
  test("shares sum to 100 and keep gaps", () => {
    const shares = sharesOf([30, null, 10]);
    expect(shares[0]).toBeCloseTo(75);
    expect(shares[1]).toBeNull();
    expect(shares[2]).toBeCloseTo(25);
  });

  test("share ticks round up to at most five rings", () => {
    expect(shareTicks(20.6)).toEqual({ max: 25, ticks: [5, 10, 15, 20, 25] });
    expect(shareTicks(4.2)).toEqual({ max: 5, ticks: [1, 2, 3, 4, 5] });
    expect(shareTicks(0).ticks.length).toBeGreaterThan(0);
  });

  test("log ticks cover the values in powers of ten", () => {
    const { lo, hi, ticks } = logTicks([1.13e8, 6.8e10, null]);
    expect(lo).toBe(7);
    expect(hi).toBe(11);
    expect(ticks).toEqual([1e8, 1e9, 1e10, 1e11]);
  });

  test("fractions stay inside the circle and skip missing values", () => {
    const domain = { shareMax: 25, lo: 7, hi: 11 };
    expect(scaleFraction(12.5, "share", domain)).toBeCloseTo(0.5);
    expect(scaleFraction(1e9, "log", domain)).toBeCloseTo(0.5);
    expect(scaleFraction(null, "share", domain)).toBeNull();
    expect(scaleFraction(0, "log", domain)).toBeNull();
    expect(scaleFraction(1e13, "log", domain)).toBe(1);
  });
});

describe("paths", () => {
  test("a full ring closes", () => {
    const { d, closed } = radarPath([
      { x: 0, y: -1 },
      { x: 1, y: 0 },
      { x: 0, y: 1 },
    ]);
    expect(closed).toBe(true);
    expect(d).toBe("M0 -1L1 0L0 1Z");
  });

  test("a gap breaks the line instead of dropping to zero", () => {
    const { d, closed } = radarPath([{ x: 0, y: -1 }, null, { x: 0, y: 1 }, { x: -1, y: 0 }]);
    expect(closed).toBe(false);
    expect(d).toBe("M0 1L-1 0L0 -1");
  });

  test("a wedge starts at the centre and arcs around its axis", () => {
    expect(wedgePath(0, 0, 10, 0, 4)).toMatch(/^M0 0L.+A10 10 0 0 1 .+Z$/);
  });
});

describe("percent formatting", () => {
  test("follows the reader's locale", () => {
    expect(formatPercent(3.72, "nl")).toBe("3,7%");
    expect(formatPercent(3.72, "en")).toBe("3.7%");
    expect(formatPercent(-3.72, "en", { signed: true })).toBe("−3.7%");
    expect(formatPercent(3.72, "nl", { signed: true })).toBe("+3,7%");
    expect(formatShare(0.03, "nl")).toBe("< 0,1%");
  });
});
