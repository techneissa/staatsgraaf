import { ChangeRow } from "@/components/change-row";
import type { FeedEntry } from "@/lib/changes";
import { ChangeBundle } from "./change-bundle";

/** A feed entry: the plain change row, or the bundle of one person's changes of a day. */
export function EntryRow({ entry, compact = false }: { entry: FeedEntry; compact?: boolean }) {
  return entry.changes.length === 1 ? (
    <ChangeRow change={entry.changes[0]} compact={compact} />
  ) : (
    <ChangeBundle entry={entry} compact={compact} />
  );
}
