import { describe, expect, test } from "bun:test";
import {
  currentMembershipsForPartyKey,
  seatCountsByPartyKey,
  seatTallyForOrganization,
} from "./parliament";

describe("seatTallyForOrganization", () => {
  test("tallies the 150 Tweede Kamer seats with a 76-seat majority", () => {
    const tally = seatTallyForOrganization("org:tweede-kamer");
    expect(tally).not.toBeNull();
    expect(tally.total).toBe(150);
    expect(tally.majority).toBe(76);
    expect(tally.entries.reduce((sum, entry) => sum + entry.seats, 0)).toBe(150);
  });

  test("resolves factions through the party registry for colour and links", () => {
    const tally = seatTallyForOrganization("org:tweede-kamer");
    const d66 = tally.entries.find((entry) => entry.key === "D66");
    expect(d66).toBeDefined();
    expect(d66.seats).toBe(26);
    expect(d66.color).toBe("#00AE41");
    expect(d66.party.name.en).toBe("Democrats 66");
  });

  test("tallies the 75 Eerste Kamer seats with a 38-seat majority", () => {
    const tally = seatTallyForOrganization("org:eerste-kamer");
    expect(tally).not.toBeNull();
    expect(tally.total).toBe(75);
    expect(tally.majority).toBe(38);
  });

  test("an organisation without memberships has no tally", () => {
    expect(seatTallyForOrganization("org:kabinet")).toBeNull();
  });
});

describe("seatCountsByPartyKey", () => {
  test("counts TK seats per registry key, aliases included", () => {
    const counts = seatCountsByPartyKey("org:tweede-kamer");
    expect(counts.get("CU")).toBe(3);
    expect(counts.get("D66")).toBe(26);
  });
});

describe("currentMembershipsForPartyKey", () => {
  test("returns the current ChristenUnie members under the CU key", () => {
    const memberships = currentMembershipsForPartyKey("CU", ["org:tweede-kamer", "org:eerste-kamer"]);
    expect(memberships.length).toBe(6);
    expect(memberships.filter((entry) => entry.organizationId === "org:tweede-kamer").length).toBe(3);
    for (const entry of memberships) {
      expect(entry.membership.fractie).toBe("ChristenUnie");
      expect(entry.membership.end).toBeNull();
    }
  });
});
