/**
 * Pure geometry and scaling for the budget radar chart on /begroting. No
 * dataset imports, so the client component and the tests can use it.
 *
 * The chart puts one axis per ministry around a circle and draws one closed
 * line per selected year. The radius is either the ministry's share of that
 * year's summed spending or the amount in euros, both linear from zero, so
 * the distance from the centre is always proportional to the money.
 */

export type RadarScaleMode = "share" | "amount";

/** Which figure a year uses: the budgeted amount when a budget record exists, otherwise the realized amount. */
export type RadarMeasure = "budget" | "actual";

export type RadarYear = { year: number; measure: RadarMeasure };

export type RadarMinistry = {
  id: string;
  slug: string;
  /** Canonical Dutch name, for example "Ministerie van Financiën". */
  name: string;
  /** Spending in euros per fiscal year, keyed by the year as a string; null when the source has no figure. */
  values: Record<string, number | null>;
};

export type RadarData = {
  years: RadarYear[];
  ministries: RadarMinistry[];
};

/** Short axis labels for the ministries, curated so twelve fit around a phone-sized circle. */
const SHORT_LABELS: Record<string, { nl: string; en: string }> = {
  "Algemene Zaken": { nl: "Algemene Zaken", en: "General Affairs" },
  "Binnenlandse Zaken en Koninkrijksrelaties": { nl: "Binnen\u00ADlandse Zaken", en: "Interior" },
  "Buitenlandse Zaken": { nl: "Buiten\u00ADlandse Zaken", en: "Foreign Affairs" },
  Defensie: { nl: "Defensie", en: "Defence" },
  "Economische Zaken en Klimaat": { nl: "Econo\u00ADmische Zaken", en: "Economic Affairs" },
  "Economische Zaken": { nl: "Econo\u00ADmische Zaken", en: "Economic Affairs" },
  Financiën: { nl: "Financiën", en: "Finance" },
  "Infrastructuur en Waterstaat": { nl: "Infra\u00ADstructuur", en: "Infra\u00ADstructure" },
  "Justitie en Veiligheid": { nl: "Justitie", en: "Justice" },
  "Landbouw, Visserij, Voedselzekerheid en Natuur": { nl: "Landbouw", en: "Agriculture" },
  "Landbouw, Natuur en Voedselkwaliteit": { nl: "Landbouw", en: "Agriculture" },
  "Onderwijs, Cultuur en Wetenschap": { nl: "Onderwijs", en: "Education" },
  "Sociale Zaken en Werkgelegenheid": { nl: "Sociale Zaken", en: "Social Affairs" },
  "Volksgezondheid, Welzijn en Sport": { nl: "Volks\u00ADgezondheid", en: "Health" },
  "Asiel en Migratie": { nl: "Asiel en Migratie", en: "Asylum and Migration" },
  "Klimaat en Groene Groei": { nl: "Klimaat", en: "Climate" },
  "Volkshuisvesting en Ruimtelijke Ordening": { nl: "Volks\u00ADhuisvesting", en: "Housing" },
};

/**
 * The short axis label for a ministry. Falls back to the name without
 * "Ministerie van ", and in English to the gloss without "Ministry of ".
 */
export function ministryShortLabel(
  name: string,
  locale: "nl" | "en",
  englishGloss: string | null = null,
  { breakable = false }: { breakable?: boolean } = {},
): string {
  const portfolio = name.replace(/^Ministerie van /u, "");
  const curated = SHORT_LABELS[portfolio];
  if (curated) return breakable ? curated[locale] : curated[locale].replace(/\u00AD/gu, "");
  if (locale === "en" && englishGloss) return englishGloss.replace(/^Ministry of (the )?/u, "");
  return portfolio;
}

/**
 * Split a label into at most two lines when it is longer than maxChars. It
 * breaks at a space or at a soft hyphen (U+00AD, which then shows as "-"),
 * choosing the break that makes the longer line shortest. Soft hyphens that
 * are not used are dropped.
 */
export function wrapLabel(label: string, maxChars = 10, { hyphenate = true }: { hyphenate?: boolean } = {}): string[] {
  if (!hyphenate) label = label.replace(/\u00AD/gu, "");
  const plain = label.replace(/\u00AD/gu, "");
  if (plain.length <= maxChars) return [plain];
  let best: string[] = [plain];
  let bestWidth = plain.length;
  for (let index = 0; index < label.length; index += 1) {
    const char = label[index];
    if (char !== " " && char !== "\u00AD") continue;
    const first = label.slice(0, index).replace(/\u00AD/gu, "") + (char === "\u00AD" ? "-" : "");
    const second = label.slice(index + 1).replace(/\u00AD/gu, "");
    const width = Math.max(first.length, second.length);
    if (width < bestWidth) {
      best = [first, second];
      bestWidth = width;
    }
  }
  return best;
}

/** Rough rendered width of a line of system sans text. */
export function estimateTextWidth(text: string, fontSize: number): number {
  return text.length * fontSize * 0.54;
}

/** Angle of axis `index` of `count`, starting at twelve o'clock and running clockwise. */
export function axisAngle(index: number, count: number): number {
  return -Math.PI / 2 + (2 * Math.PI * index) / count;
}

export function polar(cx: number, cy: number, radius: number, angle: number): { x: number; y: number } {
  return { x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) };
}

export type RadarLabel = {
  x: number;
  y: number;
  anchor: "start" | "middle" | "end";
  lines: string[];
};

export type RadarLayout = {
  width: number;
  height: number;
  cx: number;
  cy: number;
  radius: number;
  labels: RadarLabel[];
};

/**
 * Fit the circle and its axis labels into `width`: the radius is the largest
 * that keeps every label inside the box (clamped to [minRadius, maxRadius]),
 * and the height follows from the labels above and below the circle.
 */
export function radarLayout({
  width,
  labels,
  fontSize = 11,
  lineHeight = 13,
  gap = 8,
  pad = 4,
  minRadius = 60,
  maxRadius = 170,
}: {
  width: number;
  labels: string[][];
  fontSize?: number;
  lineHeight?: number;
  gap?: number;
  pad?: number;
  minRadius?: number;
  maxRadius?: number;
}): RadarLayout {
  const count = labels.length;
  const half = width / 2 - pad;
  let radius = maxRadius;
  const shapes = labels.map((lines, index) => {
    const angle = axisAngle(index, count);
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const textWidth = Math.max(0, ...lines.map((line) => estimateTextWidth(line, fontSize)));
    const anchor: RadarLabel["anchor"] = Math.abs(cos) < 0.26 ? "middle" : cos > 0 ? "start" : "end";
    const reach = anchor === "middle" ? textWidth / 2 : textWidth;
    if (Math.abs(cos) > 1e-6) {
      radius = Math.min(radius, (half - reach) / Math.abs(cos) - gap);
    }
    return { angle, sin, anchor, lines };
  });
  radius = Math.max(minRadius, Math.min(maxRadius, radius));

  let minY = -radius;
  let maxY = radius;
  const boxes = shapes.map((shape) => {
    const point = polar(0, 0, radius + gap, shape.angle);
    const blockHeight = shape.lines.length * lineHeight;
    const top =
      shape.sin < -0.3 ? point.y - blockHeight : shape.sin > 0.3 ? point.y : point.y - blockHeight / 2;
    minY = Math.min(minY, top);
    maxY = Math.max(maxY, top + blockHeight);
    return { ...shape, x: point.x, top };
  });

  const cx = width / 2;
  const cy = pad - minY;
  const height = Math.ceil(maxY - minY + pad * 2);
  return {
    width,
    height,
    cx,
    cy,
    radius,
    labels: boxes.map((box) => ({
      x: cx + box.x,
      // Baseline of the first line: the block top plus the ascent of the font.
      y: cy + box.top + (lineHeight + fontSize * 0.7) / 2,
      anchor: box.anchor,
      lines: box.lines,
    })),
  };
}

/**
 * The layout for labels that may break at soft hyphens: hyphenated only when
 * that buys a clearly larger circle, so wide columns keep whole words.
 */
export function radarLayoutForLabels(
  width: number,
  labels: string[],
  options: { fontSize?: number } = {},
): RadarLayout {
  const whole = radarLayout({ width, labels: labels.map((label) => wrapLabel(label, 10, { hyphenate: false })), ...options });
  const hyphenated = radarLayout({ width, labels: labels.map((label) => wrapLabel(label, 10)), ...options });
  return hyphenated.radius > whole.radius + 12 ? hyphenated : whole;
}

/** Shares in percent of the summed non-null values; null stays null. */
export function sharesOf(values: (number | null)[]): (number | null)[] {
  const total = values.reduce<number>((sum, value) => sum + (value ?? 0), 0);
  return values.map((value) => (value === null || total <= 0 ? null : (value / total) * 100));
}

/** A round upper bound and ring values for a share axis in percent, at most five rings. */
export function shareTicks(maxShare: number): { max: number; ticks: number[] } {
  const steps = [1, 2, 5, 10, 20, 25, 50];
  const safe = Math.max(maxShare, 0.1);
  const step = steps.find((candidate) => Math.ceil(safe / candidate) <= 5) ?? 50;
  const max = Math.min(100, Math.ceil(safe / step) * step);
  const ticks: number[] = [];
  for (let value = step; value <= max + 1e-9; value += step) ticks.push(value);
  return { max, ticks };
}

/**
 * A round upper bound and ring values for a linear euro axis, at most five
 * rings: 10, 20, 50 and so on times a power of ten. Linear on purpose: the
 * distance from the centre is proportional to the money, so €23 billion sits
 * a little over a third of the way to a €60 billion ring and never reads as
 * €100 billion, which a logarithmic axis invited.
 */
export function amountTicks(values: (number | null)[]): { max: number; ticks: number[] } {
  const positive = values.filter((value): value is number => value !== null && Number.isFinite(value) && value > 0);
  const top = positive.length === 0 ? 1 : Math.max(...positive);
  const magnitude = 10 ** Math.floor(Math.log10(top));
  const steps = [0.1, 0.2, 0.25, 0.5, 1, 2, 2.5, 5, 10].map((factor) => factor * magnitude);
  const step = steps.find((candidate) => Math.ceil(top / candidate) <= 5) ?? magnitude * 10;
  const max = Math.ceil(top / step) * step;
  const ticks: number[] = [];
  for (let value = step; value <= max * (1 + 1e-9); value += step) ticks.push(value);
  return { max, ticks };
}

/** Radius as a fraction of the full radius, or null when the value cannot be placed. */
export function scaleFraction(
  value: number | null,
  mode: RadarScaleMode,
  domain: { shareMax: number; amountMax: number },
): number | null {
  if (value === null || !Number.isFinite(value)) return null;
  const max = mode === "share" ? domain.shareMax : domain.amountMax;
  if (max <= 0) return null;
  return Math.max(0, Math.min(1, value / max));
}

/**
 * An SVG path through the points in axis order. With no gaps it is one closed
 * shape; a missing point breaks the line, so a gap is never drawn as zero.
 */
export function radarPath(points: ({ x: number; y: number } | null)[]): { d: string; closed: boolean } {
  const count = points.length;
  const fmt = (value: number) => Math.round(value * 100) / 100;
  if (count === 0) return { d: "", closed: false };
  const firstGap = points.findIndex((point) => point === null);
  if (firstGap === -1) {
    const d = points
      .map((point, index) => `${index === 0 ? "M" : "L"}${fmt(point!.x)} ${fmt(point!.y)}`)
      .join("");
    return { d: `${d}Z`, closed: true };
  }
  const parts: string[] = [];
  let open = false;
  for (let step = 1; step <= count; step += 1) {
    const point = points[(firstGap + step) % count];
    if (point === null) {
      open = false;
      continue;
    }
    parts.push(`${open ? "L" : "M"}${fmt(point.x)} ${fmt(point.y)}`);
    open = true;
  }
  return { d: parts.join(""), closed: false };
}

/** The wedge around axis `index`: the hover and tap target for that ministry. */
export function wedgePath(cx: number, cy: number, radius: number, index: number, count: number): string {
  const angle = axisAngle(index, count);
  const halfStep = Math.PI / count;
  const start = polar(cx, cy, radius, angle - halfStep);
  const end = polar(cx, cy, radius, angle + halfStep);
  const fmt = (value: number) => Math.round(value * 100) / 100;
  return `M${fmt(cx)} ${fmt(cy)}L${fmt(start.x)} ${fmt(start.y)}A${fmt(radius)} ${fmt(radius)} 0 0 1 ${fmt(end.x)} ${fmt(end.y)}Z`;
}
