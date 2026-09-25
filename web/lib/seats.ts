/**
 * Who sits where on the benches of the Kamers.
 *
 * Named gap (workstream S, 17-09-2026): neither the Tweede Kamer nor the
 * Eerste Kamer publishes a seat number per member, so `seatNumber` is null on
 * every membership in data/memberships.json. The canvas does not pretend to
 * know the real seating. It gives each fractie its block of seats (lib/bench.ts)
 * and fills that block with the fractie's members in one stable, documented
 * order: by surname, Dutch style (tussenvoegsels and titles ignored), then by
 * the full name, then by id. A seat here means "one of this fractie's seats",
 * never "the chair this member sits in".
 *
 * The build (web/scripts/build-graph.mjs) runs `seatOrder` once and ships the
 * member ids per fractie block in `graph.json`, in seat order; the client only
 * zips them with the seats `benchSeats` draws. Pure, so it is tested apart.
 */

/** A member as the seat order needs it. */
export type SeatMember = { id: string; name: string };

/** A person on a bench as `graph.json` ships them: enough for a hover card. */
export type SeatPerson = {
  name: string;
  slug: string;
  /** Local portrait URL (/media/...), or null when none is on record. */
  image: string | null;
};

/** Where one person sits: the chamber, the fractie block, and the seat inside the block. */
export type SeatRef = { chamberId: string; fractieIndex: number; seat: number };

const TITLES = new Set([
  "dr.",
  "drs.",
  "mr.",
  "ir.",
  "ing.",
  "prof.",
  "ds.",
  "bc.",
  "mba",
  "msc",
  "ma",
  "llm",
  "bsc",
  "ba",
  "phd",
  "mpa",
]);

const PARTICLES = new Set(["van", "de", "der", "den", "ter", "ten", "te", "het", "'t", "in", "op", "la", "le", "du", "da", "di", "del", "von", "zu", "'s", "d'"]);

/**
 * The surname a Dutch alphabetical list sorts on: titles dropped, initials and
 * given names dropped, tussenvoegsels dropped ("A.J.M. van Kesteren" sorts
 * under Kesteren, "Renate den Hollander" under Hollander).
 */
export function surnameKey(name: string): string {
  const tokens = name
    .split(/\s+/)
    .filter((token) => token.length > 0 && !TITLES.has(token.toLowerCase()));
  if (tokens.length === 0) return name.toLowerCase();
  // The surname starts after the last initial or given name: at the first
  // particle, or else at the last token.
  let start = tokens.length - 1;
  for (let i = 1; i < tokens.length; i += 1) {
    if (PARTICLES.has(tokens[i].toLowerCase())) {
      start = i;
      break;
    }
  }
  const surname = tokens.slice(start).filter((token) => !PARTICLES.has(token.toLowerCase()));
  return (surname.length > 0 ? surname.join(" ") : tokens[tokens.length - 1]).toLowerCase();
}

const collator = new Intl.Collator("nl", { sensitivity: "base" });

/** Members in seat order: surname, then full name, then id. Never mutates its input. */
export function seatOrder<T extends SeatMember>(members: readonly T[]): T[] {
  return [...members].sort(
    (a, b) =>
      collator.compare(surnameKey(a.name), surnameKey(b.name)) ||
      collator.compare(a.name, b.name) ||
      (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
  );
}

/**
 * Where every seated person sits, from the member lists of the chambers.
 * `members[i]` of a block is seat `i` of that block, the order `benchSeats`
 * draws its seats in.
 */
export function seatIndex(
  chambers: Readonly<Record<string, { entries: readonly { members?: readonly string[] }[] }>>,
): Map<string, SeatRef> {
  const index = new Map<string, SeatRef>();
  for (const chamberId of Object.keys(chambers).sort()) {
    chambers[chamberId].entries.forEach((entry, fractieIndex) => {
      (entry.members ?? []).forEach((personId, seat) => {
        if (!index.has(personId)) index.set(personId, { chamberId, fractieIndex, seat });
      });
    });
  }
  return index;
}

/** A party's members per chamber, for a panel that lists them. Keys are registry keys (lib/parties.ts). */
export function partyMembers(
  chambers: Readonly<Record<string, { entries: readonly { key: string | null; label: string; members?: readonly string[] }[] }>>,
  partyKey: string,
): { chamberId: string; fractieIndex: number; members: string[] }[] {
  const result: { chamberId: string; fractieIndex: number; members: string[] }[] = [];
  for (const chamberId of Object.keys(chambers).sort()) {
    chambers[chamberId].entries.forEach((entry, fractieIndex) => {
      if (entry.key === partyKey || (entry.key === null && entry.label === partyKey)) {
        result.push({ chamberId, fractieIndex, members: [...(entry.members ?? [])] });
      }
    });
  }
  return result;
}
