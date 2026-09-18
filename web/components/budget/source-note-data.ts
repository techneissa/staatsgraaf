import type { SourceRef } from "@/lib/types";
import { getSourceById } from "@/lib/data";
import type { SourceNoteItem } from "./source-note";

/** Server helper: resolve source refs into plain items for SourceNote. */
export function toSourceNoteItems(refs: SourceRef[]): SourceNoteItem[] {
  return refs.map((ref) => {
    const source = getSourceById(ref.source);
    return { id: ref.source, title: source?.title ?? null, url: source?.url ?? null };
  });
}
