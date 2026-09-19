import { getDataset } from "./data";
import { partyByDataset, partyKeyForDataset } from "./parties";
import type { Election, SeatResult } from "./types";

/**
 * Election results for the seat history on the chamber and party pages. The
 * data is `data/elections.json` (workstream Q, 19-09-2026): the final seat
 * allocation per list from the Kiesraad and CBS, with PDC at medium confidence
 * where no official table exists. Nothing here is computed from votes; a seat
 * count is what the source published.
 */

export type ElectionBlock = {
  key: string;
  label: string;
  color: string | null;
  seats: number;
  votes: number | null;
  share: number | null;
};

export type ElectionRow = {
  election: Election;
  majority: number;
  /** Blocks largest first, then by label, the same order the arch uses. */
  blocks: ElectionBlock[];
};

/** Elections of one body, newest first. */
export function getElectionsForBody(organizationId: string): Election[] {
  return getDataset()
    .elections.filter((election) => election.body === organizationId)
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}

function toBlock(result: SeatResult): ElectionBlock {
  const party = partyByDataset(result.party);
  return {
    key: partyKeyForDataset(result.party) ?? result.party,
    label: party?.abbrev ?? result.party,
    color: party?.color ?? null,
    seats: result.seats,
    votes: result.votes ?? null,
    share: result.share ?? null,
  };
}

export function electionRow(election: Election): ElectionRow {
  const blocks = election.seats.map(toBlock).sort((a, b) => b.seats - a.seats || (a.label < b.label ? -1 : a.label > b.label ? 1 : 0));
  return { election, majority: Math.floor(election.seatsTotal / 2) + 1, blocks };
}

export type SeatHistoryPoint = {
  date: string;
  seats: number;
  total: number;
};

/**
 * A party's seats in one body across elections, oldest first, with zero for an
 * election it stood in the data without a seat. An election before the party
 * first appears is left out, so a sparkline starts where the party starts.
 */
export function partySeatHistory(partyKey: string, organizationId: string): SeatHistoryPoint[] {
  const elections = getElectionsForBody(organizationId).slice().reverse();
  const points: SeatHistoryPoint[] = [];
  let seen = false;
  for (const election of elections) {
    const result = election.seats.find((entry) => (partyKeyForDataset(entry.party) ?? entry.party) === partyKey);
    if (!result && !seen) continue;
    seen = true;
    points.push({ date: election.date, seats: result?.seats ?? 0, total: election.seatsTotal });
  }
  return points;
}
