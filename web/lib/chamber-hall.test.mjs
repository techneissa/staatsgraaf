import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { layoutHall } from "./chamber-hall.ts";
import { seatOrder } from "./seats.ts";

const read = (name) => JSON.parse(readFileSync(new URL(`../../data/${name}`, import.meta.url), "utf8"));
const plans = read("chamber-plans.json");
const memberships = read("memberships.json");
const people = new Map(read("people.json").map((person) => [person.id, person]));

function membersOf(orgId) {
  return memberships
    .filter((membership) => membership.organization === orgId && membership.end === null)
    .map((membership) => ({ person: membership.person, fractie: membership.fractie ?? "", name: people.get(membership.person)?.name ?? membership.person }));
}

const bench = Array.from({ length: 12 }, (_, i) => ({ person: `person:bench-${i}`, hub: "org:ministerie-van-financien" }));

function hallFor(orgId, overrides = {}) {
  const plan = plans.find((entry) => entry.organization === orgId);
  return layoutHall({
    plan,
    src: 0,
    members: membersOf(orgId),
    hubOf: (fractie) => `fractie:test:${fractie}`,
    chair: null,
    cabinet: bench,
    seatOrder,
    ...overrides,
  });
}

test("the Eerste Kamer plan names every sitting member once, in their own seat", () => {
  const plan = plans.find((entry) => entry.organization === "org:eerste-kamer");
  const hall = hallFor("org:eerste-kamer");
  assert.equal(hall.basis, "person");
  assert.equal(hall.seats.length, 75);
  const seated = hall.seats.map((seat) => seat.person);
  assert.equal(new Set(seated).size, 75);
  assert.deepEqual(new Set(seated), new Set(membersOf("org:eerste-kamer").map((member) => member.person)));
  plan.seats.forEach((seat, index) => assert.equal(hall.seats[index].person, seat.person));
  assert.equal(hall.seats.filter((seat) => seat.chair).length, 1);
  assert.equal(hall.majority, 38);
});

test("the Tweede Kamer plan keeps every fractie in its published seats", () => {
  const plan = plans.find((entry) => entry.organization === "org:tweede-kamer");
  const members = membersOf("org:tweede-kamer");
  const hall = hallFor("org:tweede-kamer");
  assert.equal(hall.basis, "fractie");
  assert.equal(hall.seats.length, 150);
  plan.seats.forEach((seat, index) => assert.equal(hall.seats[index].hub, `fractie:test:${seat.fractie}`));
  const seated = hall.seats.map((seat) => seat.person).filter(Boolean);
  assert.equal(new Set(seated).size, 150);
  const fractieOf = new Map(members.map((member) => [member.person, member.fractie]));
  hall.seats.forEach((seat) => assert.equal(seat.hub, `fractie:test:${fractieOf.get(seat.person)}`));
  assert.equal(hall.majority, 76);
});

test("the chair of the Tweede Kamer sits at the desk and leaves one fractie seat empty", () => {
  const members = membersOf("org:tweede-kamer");
  const chair = members[0];
  const hall = hallFor("org:tweede-kamer", { chair: chair.person });
  assert.equal(hall.chair?.person, chair.person);
  const empty = hall.seats.filter((seat) => seat.person === null);
  assert.equal(empty.length, 1);
  assert.equal(empty[0].chair, true);
  assert.equal(empty[0].hub, `fractie:test:${chair.fractie}`);
  assert.ok(!hall.seats.some((seat) => seat.person === chair.person));
});

test("a plan that no longer matches the members is refilled by blocks, largest first", () => {
  const members = membersOf("org:tweede-kamer");
  // Someone crosses the floor: the published seat counts no longer hold.
  const moved = members.map((member, index) => (index === 0 ? { ...member, fractie: "Nieuwe fractie" } : member));
  const hall = hallFor("org:tweede-kamer", { members: moved });
  assert.equal(hall.basis, "blocks");
  assert.equal(new Set(hall.seats.map((seat) => seat.person)).size, 150);
  assert.ok(hall.seats.some((seat) => seat.hub === "fractie:test:Nieuwe fractie"));

  const ek = membersOf("org:eerste-kamer").slice(1);
  const partial = hallFor("org:eerste-kamer", { members: ek });
  assert.equal(partial.basis, "blocks");
  assert.equal(partial.seats.filter((seat) => seat.person).length, 74);
});

test("the kabinet bench seats everyone given, apart from the benches, in the given order", () => {
  for (const orgId of ["org:tweede-kamer", "org:eerste-kamer"]) {
    const hall = hallFor(orgId);
    assert.deepEqual(hall.cabinet.seats.map((seat) => seat.person), bench.map((entry) => entry.person));
    const minGap = Math.min(
      ...hall.cabinet.seats.flatMap((a) => hall.seats.map((b) => Math.hypot(a.x - b.x, a.y - b.y))),
    );
    assert.ok(minGap > hall.r + hall.cabinet.r, `${orgId}: bench overlaps a member seat (${minGap})`);
  }
});

test("seats never overlap and everything lies inside the box", () => {
  for (const orgId of ["org:tweede-kamer", "org:eerste-kamer"]) {
    const hall = hallFor(orgId);
    for (let i = 0; i < hall.seats.length; i += 1) {
      for (let j = i + 1; j < hall.seats.length; j += 1) {
        const a = hall.seats[i];
        const b = hall.seats[j];
        assert.ok(Math.hypot(a.x - b.x, a.y - b.y) >= hall.r * 2 - 1e-6, `${orgId}: seats ${i} and ${j} overlap`);
      }
    }
    for (const point of [...hall.seats, ...hall.cabinet.seats]) {
      assert.ok(point.x >= 0 && point.y >= 0 && point.x <= hall.width && point.y <= hall.height);
    }
  }
});

test("the layout is deterministic", () => {
  assert.deepEqual(hallFor("org:tweede-kamer"), hallFor("org:tweede-kamer"));
});
