import { getSourceById } from "./data";
import type { Position, SourceRef } from "./types";

export type UnknownHolderMessage = "holdersNoneUnknown" | "holdersNoneNoSource" | "holdersNoneRegisterUnread";

export type UnknownHolderGap = {
  key: UnknownHolderMessage;
  sources: SourceRef[];
};

const REGISTER_UNREAD: Array<{ match: (title: string) => boolean; source: string }> = [
  {
    match: (title) => title === "Wethouder" || title.startsWith("Lid gemeenteraad van "),
    source: "src:koop-medewerkers-gemeenten",
  },
  {
    match: (title) => title === "Gedeputeerde" || title.startsWith("Lid Provinciale Staten van "),
    source: "src:koop-medewerkers-provincies",
  },
];

function registerRef(id: string): SourceRef | null {
  const source = getSourceById(id);
  if (source === undefined) return null;
  return { source: source.id, retrieved: source.retrieved, confidence: "high" };
}

/**
 * What the empty-holders note should cite. The enabling law (type `wet`)
 * describes the office, not who holds it, so it is not a holder source.
 * For wethouder and raadslid the live register names people; those names are
 * not written into the dataset yet (ADR 0027).
 */
export function unknownHolderGap(position: Position): UnknownHolderGap {
  const unread = REGISTER_UNREAD.find((row) => row.match(position.title));
  if (unread !== undefined) {
    const ref = registerRef(unread.source);
    return { key: "holdersNoneRegisterUnread", sources: ref === null ? [] : [ref] };
  }
  const sources = position.sources.filter((ref) => getSourceById(ref.source)?.type !== "wet");
  return {
    key: sources.length > 0 ? "holdersNoneUnknown" : "holdersNoneNoSource",
    sources,
  };
}
