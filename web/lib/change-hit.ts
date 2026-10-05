/**
 * Hit testing for the change histogram. At 90 days a bar is about 5 px wide,
 * far under a finger, so a pointer picks the nearest day with changes within
 * `reach` pixels instead of needing the exact column. Kept free of React so a
 * test can run it.
 */

/** Half of the 44 px touch target, on each side of a bar. */
export const HIT_REACH_PX = 22;

/**
 * The index of the day with changes whose column centre is nearest to `x`
 * (pixels from the chart's left edge), or null when none lies within `reach`.
 * A pointer outside the chart counts as at the nearest edge.
 */
export function nearestActiveIndex(counts: readonly number[], x: number, width: number, reach: number = HIT_REACH_PX): number | null {
  if (width <= 0 || counts.length === 0) return null;
  const column = width / counts.length;
  const clamped = Math.min(width, Math.max(0, x));
  let best: number | null = null;
  let bestDistance = Infinity;
  for (let i = 0; i < counts.length; i += 1) {
    if (counts[i] <= 0) continue;
    const distance = Math.abs(clamped - (i + 0.5) * column);
    if (distance < bestDistance) {
      best = i;
      bestDistance = distance;
    }
  }
  return best !== null && bestDistance <= reach ? best : null;
}
