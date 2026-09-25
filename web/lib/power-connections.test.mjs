import { test } from "node:test";
import assert from "node:assert/strict";

import { connectionsOf, isCabinetPost, scoreConnections } from "./power-connections.ts";

const positions = new Map([
  ["pos:mp", { organization: "org:ministerie-van-algemene-zaken", title: "Minister-president", type: "elected" }],
  ["pos:fin", { organization: "org:ministerie-van-financien", title: "Minister van Financiën", type: "elected" }],
  ["pos:dg", { organization: "org:ministerie-van-financien", title: "Directeur-generaal", type: "dept_head" }],
  ["pos:cie", { organization: "org:commissie-fin", title: "Lid", type: "commission" }],
]);

const base = {
  news: [],
  memberships: [],
  tenures: [],
  positions,
  asOf: "2026-09-19",
};

const find = (links, a, b) => links.find((link) => (link.a === a && link.b === b) || (link.a === b && link.b === a));

test("co-mentions count once per item and weigh recent news more", () => {
  const links = scoreConnections({
    ...base,
    anchors: new Set(["person:a"]),
    news: [
      { id: "news:1", published: "2026-09-19T08:00:00Z", entities: ["person:a", "person:b", "person:b"] },
      { id: "news:2", published: "2026-08-20", entities: ["person:a", "person:b"] },
      { id: "news:3", published: "2026-09-18", entities: ["person:a", "person:c"] },
      { id: "news:old", published: "2026-01-01", entities: ["person:a", "person:d"] },
      { id: "news:future", published: "2026-10-01", entities: ["person:a", "person:d"] },
    ],
  });
  const ab = find(links, "person:a", "person:b");
  assert.deepEqual(ab.reasons, ["news"]);
  assert.deepEqual(ab.news, ["news:1", "news:2"]);
  assert.equal(ab.newsCount, 2);
  // One story today (1) plus one a half-life ago (0.5).
  assert.equal(ab.weight, 1.5);
  assert.ok(find(links, "person:a", "person:c").weight < ab.weight);
  assert.equal(find(links, "person:a", "person:d"), undefined, "news outside the window never counts");
});

test("a minister is tied to their ministry and to the rest of the cabinet, with the tenures as evidence", () => {
  const links = scoreConnections({
    ...base,
    anchors: new Set(["person:pm"]),
    tenures: [
      { id: "tenure:pm", person: "person:pm", position: "pos:mp", end: null },
      { id: "tenure:fin", person: "person:fin", position: "pos:fin", end: null },
      { id: "tenure:dg", person: "person:dg", position: "pos:dg", end: null },
      { id: "tenure:old", person: "person:pm", position: "pos:fin", end: "2025-01-01" },
    ],
  });
  const ministry = find(links, "person:pm", "org:ministerie-van-algemene-zaken");
  assert.deepEqual(ministry.reasons, ["tenure"]);
  assert.deepEqual(ministry.tenures, ["tenure:pm"]);
  assert.equal(ministry.weight, 1);
  const cabinet = find(links, "person:pm", "person:fin");
  assert.deepEqual(cabinet.reasons, ["kabinet"]);
  assert.deepEqual(cabinet.tenures, ["tenure:fin", "tenure:pm"]);
  assert.equal(find(links, "person:pm", "org:ministerie-van-financien"), undefined, "an ended tenure is no tie");
  assert.equal(find(links, "person:fin", "person:dg"), undefined, "ties between two non-anchors are not kept");
  assert.ok(isCabinetPost(positions.get("pos:fin")));
  assert.ok(!isCabinetPost(positions.get("pos:dg")));
});

test("fractie and shared bodies add up, and a commission seat weighs half", () => {
  const links = scoreConnections({
    ...base,
    anchors: new Set(["person:a"]),
    memberships: [
      { id: "membership:a", person: "person:a", organization: "org:tk", fractie: "VVD", end: null },
      { id: "membership:b", person: "person:b", organization: "org:tk", fractie: "VVD", end: null },
      { id: "membership:c", person: "person:c", organization: "org:ek", fractie: "VVD", end: null },
    ],
    tenures: [
      { id: "tenure:a", person: "person:a", position: "pos:cie", end: null },
      { id: "tenure:b", person: "person:b", position: "pos:cie", end: null },
    ],
  });
  const ab = find(links, "person:a", "person:b");
  assert.deepEqual(ab.reasons, ["fractie", "organisation"]);
  assert.equal(ab.weight, 0.7);
  assert.deepEqual(ab.memberships, ["membership:a", "membership:b"]);
  assert.deepEqual(ab.orgs, ["org:commissie-fin"]);
  assert.equal(ab.fractie, "VVD");
  assert.equal(find(links, "person:a", "person:c"), undefined, "the same party in another chamber is another fractie");
  assert.equal(find(links, "person:a", "org:commissie-fin").weight, 0.5);
});

test("each anchor keeps its strongest ties, weak ties drop, and the result is deterministic", () => {
  const memberships = Array.from({ length: 12 }, (_, index) => ({
    id: `membership:${index}`,
    person: `person:m${String(index).padStart(2, "0")}`,
    organization: "org:tk",
    fractie: "PRO",
    end: null,
  }));
  const input = {
    ...base,
    anchors: new Set(["person:m00"]),
    memberships,
    prominence: new Map([["person:m11", 5]]),
    options: { perEntity: 3 },
  };
  const links = scoreConnections(input);
  const ties = connectionsOf(links, "person:m00").map((entry) => entry.other).sort();
  // Equal weights: the most prominent neighbour is kept first, then the rest by id.
  assert.deepEqual(ties, ["person:m01", "person:m02", "person:m11"]);
  assert.deepEqual(scoreConnections(input), links);

  const weak = scoreConnections({ ...input, options: { minWeight: 0.5 } });
  assert.equal(weak.length, 0);
});

test("the reference date is the newest news item, and the snapshot only without news", async () => {
  const { newsReferenceDate } = await import("./power-connections.ts");
  const news = [
    { published: "2026-09-19T07:00:00Z" },
    { published: "2026-09-25T06:30:00.000Z" },
    { published: null },
    { published: "not a date" },
    { published: "2026-09-24" },
  ];
  assert.equal(newsReferenceDate(news, "2026-09-19"), "2026-09-25");
  assert.equal(newsReferenceDate([], "2026-09-19"), "2026-09-19");
  assert.equal(newsReferenceDate([{ published: null }], "2026-09-19T07:36:29.880Z"), "2026-09-19");
  assert.equal(newsReferenceDate([], null), null);

  // A story from the newest day counts at full weight when that day is the reference.
  const asOf = newsReferenceDate(news, "2026-09-19");
  const links = scoreConnections({
    ...base,
    asOf,
    anchors: new Set(["person:a"]),
    news: [{ id: "news:new", published: "2026-09-25T06:30:00.000Z", entities: ["person:a", "person:b"] }],
  });
  assert.equal(find(links, "person:a", "person:b").weight, 1);
  // Measured from the stale snapshot date, the same story would fall outside the window.
  assert.equal(scoreConnections({ ...base, asOf: "2026-09-19", anchors: new Set(["person:a"]), news: [{ id: "news:new", published: "2026-09-25", entities: ["person:a", "person:b"] }] }).length, 0);
});
