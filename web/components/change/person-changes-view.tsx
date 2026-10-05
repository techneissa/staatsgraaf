import { PersonCardList, type PersonCardEntry } from "./person-card-list";
import { PersonTimeline, roleFor } from "./person-timeline";
import { findSeatFiller, type PersonChangeGroup } from "@/lib/changes";

/**
 * Changes grouped per person: a card for each person with a short rail of
 * their appointments, acting roles and departures, and a card for each seat
 * that went vacant. A server component; the explorer's kind and day filters
 * reach the client list below through context.
 */
export function PersonChangesView({ groups, reference }: { groups: PersonChangeGroup[]; reference: string }) {
  const cards: PersonCardEntry[] = groups.map((group) => ({
    key: group.key,
    kinds: [...new Set(group.events.map((event) => roleFor(event, group.personId)))],
    days: [...new Set(group.events.map((event) => event.date))],
    node: <PersonTimeline group={group} reference={reference} filler={findSeatFiller(group, groups)} />,
  }));
  return <PersonCardList cards={cards} />;
}
