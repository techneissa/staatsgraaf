import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { hydrateLayout } from "./graph.ts";
import { BENCH_GUTTER, BENCH_ROWS, benchPlans, benchSeats, layoutBenches } from "./bench.ts";

const bundle = JSON.parse(readFileSync(new URL("../public/graph.json", import.meta.url), "utf8"));
const layout = hydrateLayout(bundle);
const sector = layout.sectors.find((entry) => entry.benches.length > 0);

const chambersOf = () =>
  Object.entries(bundle.chambers).map(([id, chamber]) => ({ id, entries: chamber.entries, total: chamber.total }));

test("the bundle carries a bench for each chamber, in seat order", () => {
  assert.ok(sector, "no sector carries benches");
  assert.equal(sector.benches.length, 2);
  assert.deepEqual(
    sector.benches.map((bench) => bench.id),
    ["org:tweede-kamer", "org:eerste-kamer"],
  );
  for (const bench of sector.benches) {
    assert.equal(bench.rows, BENCH_ROWS);
    assert.ok(bench.startAngle >= sector.startAngle - 1e-6 && bench.endAngle <= sector.endAngle + 1e-6, `${bench.id} leaves its sector`);
    assert.ok(bench.outerRadius <= sector.outerRadius + 1e-6);
    assert.ok(bench.innerRadius >= sector.innerRadius - 1e-6);
  }
  // Two chambers never touch: the gutter between them is whole columns wide.
  const [first, second] = sector.benches;
  const gap = (second.startAngle - first.endAngle) / first.columnAngle;
  assert.ok(Math.abs(gap - BENCH_GUTTER) < 1e-3, `gutter is ${gap} columns`);
});

test("every seat of every chamber is drawn, inside its bench, without overlap", () => {
  for (const bench of sector.benches) {
    const chamber = bundle.chambers[bench.id];
    const { seats, blocks } = benchSeats(bench, chamber.entries);
    assert.equal(seats.length, chamber.total, `${bench.id} draws ${seats.length} of ${chamber.total} seats`);
    assert.equal(blocks.length, chamber.entries.length);
    for (const seat of seats) {
      assert.ok(seat.angle >= bench.startAngle - 1e-9 && seat.angle <= bench.endAngle + 1e-9, "seat outside the bench arc");
      assert.ok(seat.radius >= bench.innerRadius && seat.radius <= bench.outerRadius, "seat outside the bench rows");
      assert.ok(Math.abs(Math.hypot(seat.x, seat.y) - seat.radius) < 1e-6);
    }
    for (let i = 0; i < seats.length; i += 1) {
      for (let j = i + 1; j < seats.length; j += 1) {
        const distance = Math.hypot(seats[i].x - seats[j].x, seats[i].y - seats[j].y);
        assert.ok(distance >= 2 * bench.seatRadius - 1e-6, `${bench.id}: seats ${i} and ${j} overlap`);
      }
    }
  }
});

test("a fractie is one contiguous wedge and blocks never overlap", () => {
  for (const bench of sector.benches) {
    const chamber = bundle.chambers[bench.id];
    const { seats, blocks } = benchSeats(bench, chamber.entries);
    let cursor = bench.startAngle;
    for (const block of blocks) {
      assert.ok(Math.abs(block.startAngle - cursor) < 1e-6, `${block.label} does not follow the previous block`);
      assert.ok(block.endAngle > block.startAngle);
      cursor = block.endAngle;
      const mine = seats.filter((seat) => seat.block === block.index);
      assert.equal(mine.length, block.seats, `${block.label} has ${mine.length} of ${block.seats} seats`);
      for (const seat of mine) {
        assert.ok(seat.angle > block.startAngle && seat.angle < block.endAngle, `${block.label} has a seat outside its wedge`);
      }
    }
    assert.ok(Math.abs(cursor - bench.endAngle) < 5e-4, "the blocks do not fill the bench");
  }
});

test("the bench is deterministic and degrades instead of breaking", () => {
  const plans = benchPlans(chambersOf());
  const a = layoutBenches(plans, 0, 1.6, 160);
  const b = layoutBenches(plans, 0, 1.6, 160);
  assert.deepEqual(a, b);
  // A wider arc gives wider columns, up to the cap.
  const wide = layoutBenches(plans, 0, 3.0, 160);
  assert.ok(wide[0].columnAngle >= a[0].columnAngle);
  assert.ok(wide[0].columnAngle * 160 <= 6.5 + 1e-9);
  // An impossible arc returns nothing rather than a broken bench.
  assert.deepEqual(layoutBenches(plans, 0, 0, 160), []);
  assert.deepEqual(layoutBenches([], 0, 1, 160), []);
});
