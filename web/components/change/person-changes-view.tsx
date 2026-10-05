import { EmptyStateT } from "./empty-state-t";
import { PersonTimeline } from "./person-timeline";
import { AriaLabelT } from "./aria-label-t";
import { findSeatFiller, type PersonChangeGroup } from "@/lib/changes";

/**
 * Changes grouped per person: a card for each person with a short rail of
 * their appointments, acting roles and departures, and a card for each seat
 * that went vacant. Cards flow into columns by the width of the container,
 * not the viewport, so the view works in a narrow column too.
 */
export function PersonChangesView({ groups, reference }: { groups: PersonChangeGroup[]; reference: string }) {
  if (groups.length === 0) return <EmptyStateT title="peopleEmpty" />;
  return (
    <AriaLabelT k="peopleListAria">
      <div className="@container">
        <ul className="grid grid-cols-1 gap-3 @2xl:grid-cols-2">
          {groups.map((group) => (
            <li key={group.key} className="min-w-0">
              <PersonTimeline group={group} reference={reference} filler={findSeatFiller(group, groups)} />
            </li>
          ))}
        </ul>
      </div>
    </AriaLabelT>
  );
}
