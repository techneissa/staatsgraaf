import type { OrgBranch } from "./types";

/**
 * Colour-coded top-level branches of the Dutch state graph. Each branch maps to
 * a token in shared/tokens.json (color.dark["sector-*"]), generated into
 * app/generated/tokens.css by web/scripts/build-tokens.mjs as `--color-sector-*`
 * Tailwind variables and `--t-color-sector-*` raw CSS variables.
 */
export const BRANCH_COLOR_KEY: Record<OrgBranch, string> = {
  regering: "sector-regering",
  "staten-generaal": "sector-staten-generaal",
  "rechterlijke-macht": "sector-rechterlijke-macht",
  "hoge-colleges": "sector-hoge-colleges",
  adviescolleges: "sector-adviescolleges",
  "decentraal-provinciaal": "sector-decentraal-provinciaal",
  "decentraal-lokaal": "sector-decentraal-lokaal",
  waterschap: "sector-waterschap",
  "caribisch-nederland": "sector-caribisch-nederland",
  koninkrijk: "sector-koninkrijk",
  zelfstandig: "sector-zelfstandig",
};

export function branchColorVar(branch: OrgBranch): string {
  return `var(--t-color-${BRANCH_COLOR_KEY[branch] ?? "line-strong"})`;
}

export function branchColorClass(branch: OrgBranch, prefix: "text" | "bg" | "stroke" | "fill"): string {
  return `${prefix}-[${branchColorVar(branch)}]`;
}
