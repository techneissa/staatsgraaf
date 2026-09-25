import { test } from "node:test";
import assert from "node:assert/strict";

import { partyMembers, seatIndex, seatOrder, surnameKey } from "./seats.ts";

test("the surname key drops titles, initials and tussenvoegsels", () => {
  assert.equal(surnameKey("A.J.M. van Kesteren"), "kesteren");
  assert.equal(surnameKey("Renate den Hollander"), "hollander");
  assert.equal(surnameKey("drs. E. Kemperman MBA"), "kemperman");
  assert.equal(surnameKey("Adriaan Harry John de Kort"), "kort");
  assert.equal(surnameKey("mr. R.A. Janssen"), "janssen");
  assert.equal(surnameKey("Ingrid Visseren-Hamakers"), "visseren-hamakers");
  assert.equal(surnameKey("Jan van der Berg"), "berg");
});

test("seat order is by surname, then full name, then id, and never mutates", () => {
  const members = [
    { id: "person:c", name: "Renate den Hollander" },
    { id: "person:b", name: "A.J.M. van Kesteren" },
    { id: "person:a", name: "Fatihya Abdi" },
    { id: "person:e", name: "Piet Hollander" },
    { id: "person:d", name: "Piet Hollander" },
  ];
  const copy = members.map((member) => ({ ...member }));
  const ordered = seatOrder(members).map((member) => member.id);
  assert.deepEqual(ordered, ["person:a", "person:d", "person:e", "person:c", "person:b"]);
  assert.deepEqual(members, copy);
  // The same input in another order gives the same seats.
  assert.deepEqual(seatOrder([...members].reverse()).map((member) => member.id), ordered);
});

test("the seat index maps every member to chamber, fractie block and seat", () => {
  const chambers = {
    "org:tweede-kamer": {
      entries: [
        { key: "PRO", label: "PRO", members: ["person:a", "person:b"] },
        { key: "VVD", label: "VVD", members: ["person:c"] },
      ],
    },
    "org:eerste-kamer": { entries: [{ key: "PRO", label: "PRO", members: ["person:d"] }] },
  };
  const index = seatIndex(chambers);
  assert.deepEqual(index.get("person:b"), { chamberId: "org:tweede-kamer", fractieIndex: 0, seat: 1 });
  assert.deepEqual(index.get("person:c"), { chamberId: "org:tweede-kamer", fractieIndex: 1, seat: 0 });
  assert.deepEqual(index.get("person:d"), { chamberId: "org:eerste-kamer", fractieIndex: 0, seat: 0 });
  assert.equal(index.size, 4);

  assert.deepEqual(partyMembers(chambers, "PRO"), [
    { chamberId: "org:eerste-kamer", fractieIndex: 0, members: ["person:d"] },
    { chamberId: "org:tweede-kamer", fractieIndex: 0, members: ["person:a", "person:b"] },
  ]);
  assert.deepEqual(partyMembers(chambers, "SP"), []);
});
