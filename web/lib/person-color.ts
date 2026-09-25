import { branchColorVar } from "./branch-colors";
import type { OrgBranch } from "./types";

/**
 * The identity colour of a person on the people index: the party colour when
 * the party has a sourced one, the monarchy colour (Rijkshuisstijl oranje, the
 * accent token) for the King and the royal house, and otherwise the branch
 * colour of the organisation of their main position (a minister without a
 * party, a judge, a burgemeester). Null when none applies; the card is neutral.
 */
export type PersonColorSource = "party" | "monarchy" | "branch";

export type PersonColor = { color: string; source: PersonColorSource };

export type PersonColorInput = {
  /** The sourced party colour, or null. */
  partyColor: string | null;
  /** The title of the main position, used to recognise the royal house. */
  mainTitle: string | null;
  /** The branch of the organisation of the main position or chamber. */
  branch: OrgBranch | null;
};

export const MONARCHY_COLOR = "var(--t-color-accent)";

/** Titles of the royal house: the King or Queen, and the princes and princesses of the house. */
export function isRoyalTitle(title: string | null | undefined): boolean {
  if (typeof title !== "string") return false;
  return /^(Koning|Koningin)( der Nederlanden)?$/i.test(title.trim()) || /^(Prins|Prinses) (van Oranje|der Nederlanden)\b/i.test(title.trim());
}

export function personColorFor({ partyColor, mainTitle, branch }: PersonColorInput): PersonColor | null {
  if (typeof partyColor === "string" && partyColor !== "") return { color: partyColor, source: "party" };
  if (isRoyalTitle(mainTitle)) return { color: MONARCHY_COLOR, source: "monarchy" };
  if (branch !== null) return { color: branchColorVar(branch), source: "branch" };
  return null;
}

/**
 * How strong the colour is in each part of the card, in percent, mixed in sRGB
 * with the theme colour behind it. The card fill and the active party chip stay
 * faint so text keeps its contrast; person-color.test.mjs checks ink and muted
 * ink at 4.5:1 against every party and branch colour in both themes.
 */
export const TINT = { fill: 7, fillHover: 11, chipActive: 18, portrait: 22, border: 50, borderHover: 85 } as const;

/** CSS custom properties for a card: `--pc` is the colour, or the strong line colour when there is none. */
export function personCardVars(color: string | null): Record<string, string> {
  return { "--pc": color ?? "var(--t-color-line-strong)" };
}

// Contrast checks, used by the tests -------------------------------------------

type Rgb = [number, number, number];

export function hexToRgb(hex: string): Rgb {
  const value = hex.replace("#", "").slice(0, 6);
  return [0, 2, 4].map((at) => Number.parseInt(value.slice(at, at + 2), 16)) as Rgb;
}

/** color-mix(in srgb, a p%, b): a straight per-channel mix of the encoded values. */
export function mixSrgb(a: Rgb, b: Rgb, percentA: number): Rgb {
  const p = percentA / 100;
  return [0, 1, 2].map((i) => a[i] * p + b[i] * (1 - p)) as Rgb;
}

function luminance([r, g, b]: Rgb): number {
  const lin = (channel: number) => {
    const c = channel / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

export function contrastRatio(a: Rgb, b: Rgb): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}
