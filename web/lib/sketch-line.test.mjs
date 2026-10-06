import { test } from "node:test";
import assert from "node:assert/strict";

import { MIN_WIDTH, WOBBLE_MAX, brushStroke, cubicAt, seeded, sampleCubic, sketchBetween, sketchCurve, widthAt } from "./sketch-line.ts";

const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const nums = (d) => (d.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);
const opts = { seed: "ministerie-a>person-1", widthA: 5, widthB: 3.5, insetA: 3, insetB: 2 };

test("seeded numbers are stable and spread", () => {
  assert.deepEqual(seeded("abc"), seeded("abc"));
  assert.notDeepEqual(seeded("abc"), seeded("abd"));
  for (const v of seeded("x")) assert.ok(v >= 0 && v < 1);
  assert.ok(seeded("").every((v) => Number.isFinite(v)));
});

test("the same input draws the same line; another seed draws another", () => {
  const from = { x: 10, y: 10, r: 20 };
  const to = { x: 150, y: 90, r: 16 };
  assert.deepEqual(sketchBetween(from, to, opts), sketchBetween(from, to, { ...opts }));
  assert.notEqual(sketchBetween(from, to, opts).d, sketchBetween(from, to, { ...opts, seed: "other" }).d);
});

test("the ends are exactly the inset under each circle's edge, on the chord", () => {
  const from = { x: 50, y: 40, r: 22 };
  const to = { x: 210, y: 150, r: 14 };
  const line = sketchBetween(from, to, opts);
  assert.ok(Math.abs(dist(from, line.start) - (from.r - opts.insetA)) < 1e-9);
  assert.ok(Math.abs(dist(to, line.end) - (to.r - opts.insetB)) < 1e-9);
  // The curve itself starts and ends on those points.
  assert.deepEqual(cubicAt(line.cubic, 0), line.start);
  assert.ok(dist(cubicAt(line.cubic, 1), line.end) < 1e-9);
  // An inset deeper than the radius stops at the centre, not past it.
  const deep = sketchBetween(from, to, { ...opts, insetA: 99 });
  assert.ok(dist(from, deep.start) < 1e-9);
});

test("the bow and the wobble stay small and bounded", () => {
  const a = { x: 0, y: 0 };
  for (const length of [6, 20, 60, 140, 400]) {
    for (const seed of ["a", "b", "c", "d", "e", "f"]) {
      const b = { x: length * 0.8, y: length * 0.6 };
      const base = sketchCurve(a, b, { seed, wobble: 0 });
      const wobbled = sketchCurve(a, b, { seed });
      const bow = Math.min(length * 0.06, 7);
      for (let i = 0; i <= 20; i += 1) {
        const t = i / 20;
        const p = cubicAt(wobbled, t);
        const q = cubicAt(base, t);
        assert.ok(dist(p, q) <= WOBBLE_MAX + 1e-9, `wobble <= ${WOBBLE_MAX} (${dist(p, q)})`);
        // Distance of the point from the chord stays within the bow plus the wobble, with a little for the asymmetry.
        const d = Math.abs(((b.x - a.x) * (a.y - p.y) - (a.x - p.x) * (b.y - a.y)) / Math.hypot(b.x - a.x, b.y - a.y));
        assert.ok(d <= bow * 1.2 + WOBBLE_MAX + 1e-6, `bow bounded (${d} > ${bow})`);
      }
    }
  }
});

test("a bow can be told which way to bend", () => {
  const a = { x: 0, y: 0 };
  const b = { x: 100, y: 0 };
  for (const seed of ["p", "q", "r", "s"]) {
    const up = cubicAt(sketchCurve(a, b, { seed, bowToward: { x: 50, y: -80 } }), 0.5);
    const down = cubicAt(sketchCurve(a, b, { seed, bowToward: { x: 50, y: 80 } }), 0.5);
    assert.ok(up.y < 0 && down.y > 0, `${seed}: ${up.y} ${down.y}`);
  }
});

test("zero-length and very short lines give no NaN", () => {
  for (const [from, to] of [
    [{ x: 5, y: 5, r: 10 }, { x: 5, y: 5, r: 10 }],
    [{ x: 5, y: 5, r: 10 }, { x: 5.2, y: 5, r: 10 }],
    [{ x: 0, y: 0, r: 20 }, { x: 25, y: 0, r: 10 }],
    [{ x: 0, y: 0, r: 20 }, { x: 31, y: 0, r: 10 }],
  ]) {
    const line = sketchBetween(from, to, opts);
    assert.ok(!/NaN|Infinity/.test(line.d + line.centre), line.d);
    assert.ok(Number.isFinite(line.length) && line.length >= 1);
    assert.ok(Number.isFinite(line.bounds.x + line.bounds.y + line.bounds.w + line.bounds.h));
    assert.ok(line.widest >= MIN_WIDTH);
  }
});

test("the width never goes negative, tapers from one end to the other and swells at the circles", () => {
  const profile = { widthA: 8, widthB: 3, insetA: 2, insetB: 2, flareA: 0.25, flareB: 0.3, flareLength: 11 };
  for (const len of [0, 1, 4, 30, 200]) {
    for (let i = 0; i <= 40; i += 1) {
      const w = widthAt((len * i) / 40, len, profile);
      assert.ok(w >= MIN_WIDTH && Number.isFinite(w), `width ${w} at ${i}/40 of ${len}`);
    }
  }
  // The middle of a long line is thinner than the start (taper), and the visible edge is the widest part near it (swell).
  assert.ok(widthAt(100, 200, profile) < widthAt(2, 200, profile));
  assert.ok(widthAt(2, 200, profile) > profile.widthA);
  assert.ok(widthAt(198, 200, profile) > profile.widthB);
  // Negative or zero widths clamp.
  assert.equal(widthAt(10, 100, { widthA: 0, widthB: -3, flareA: 0, flareB: 0 }), MIN_WIDTH);
});

test("the outline is a closed path without flat ends, and fits its bounds", () => {
  const cubic = sketchCurve({ x: 20, y: 20 }, { x: 180, y: 120 }, { seed: "k" });
  const brush = brushStroke(cubic, { widthA: 9, widthB: 4, insetA: 2, insetB: 2 });
  assert.match(brush.d, /^M[\d. -]+(?: [QLC][\d. -]+)+ Z$/);
  assert.ok(/ C[\d. -]+ L/.test(brush.d) || / C/.test(brush.d), "round caps are cubic arcs");
  const pts = nums(brush.d);
  for (let i = 0; i + 1 < pts.length; i += 2) {
    assert.ok(pts[i] >= brush.bounds.x && pts[i] <= brush.bounds.x + brush.bounds.w, "x in bounds");
    assert.ok(pts[i + 1] >= brush.bounds.y && pts[i + 1] <= brush.bounds.y + brush.bounds.h, "y in bounds");
  }
  assert.ok(Math.abs(brush.length - sampleCubic(cubic, 60).reduce((s, p, i, all) => (i ? s + dist(p, all[i - 1]) : 0), 0)) < 1.5);
  assert.ok(brush.centre.startsWith("M20 20 C"));
});
