import { ChangeRow } from "@/components/change-row";
import type { Change } from "@/lib/types";

/**
 * A change on the home page: the same row as the change feed, a little more
 * compact. Hangs inside a RailItem (components/change/rail.tsx).
 */
export function ChangeCard({ change }: { change: Change; date?: string }) {
  return <ChangeRow change={change} compact />;
}
