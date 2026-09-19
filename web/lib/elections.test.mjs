import { test } from "node:test";
import assert from "node:assert/strict";

import { electionRow, getElectionsForBody, partySeatHistory } from "./elections.ts";

const tk = getElectionsForBody("org:tweede-kamer");
const ek = getElectionsForBody("org:eerste-kamer");

test("both chambers have election history, newest first", () => {
  assert.ok(tk.length >= 25, `Tweede Kamer elections: ${tk.length}`);
  assert.ok(ek.length >= 12, `Eerste Kamer elections: ${ek.length}`);
  for (const list of [tk, ek]) {
    for (let i = 1; i < list.length; i += 1) assert.ok(list[i - 1].date > list[i].date, "newest first");
  }
});

test("every election row sums to its seat total and orders blocks largest first", () => {
  for (const election of [...tk, ...ek]) {
    const row = electionRow(election);
    const sum = row.blocks.reduce((total, block) => total + block.seats, 0);
    assert.equal(sum, election.seatsTotal, election.id);
    assert.equal(row.majority, Math.floor(election.seatsTotal / 2) + 1);
    for (let i = 1; i < row.blocks.length; i += 1) assert.ok(row.blocks[i - 1].seats >= row.blocks[i].seats, election.id);
    for (const block of row.blocks) assert.ok(block.label.length > 0, `${election.id} has an unlabelled block`);
  }
});

test("a party's seat history is oldest first and starts where the party starts", () => {
  const vvd = partySeatHistory("VVD", "org:tweede-kamer");
  assert.ok(vvd.length >= 20, `VVD history points: ${vvd.length}`);
  for (let i = 1; i < vvd.length; i += 1) assert.ok(vvd[i - 1].date < vvd[i].date);
  assert.ok(vvd[0].seats > 0, "the first point is the first election with seats");
  const nsc = partySeatHistory("NSC", "org:tweede-kamer");
  assert.ok(nsc.length >= 1 && nsc[0].date >= "2023-11-22", "NSC starts at its first election");
  assert.deepEqual(partySeatHistory("no-such-party", "org:tweede-kamer"), []);
});
