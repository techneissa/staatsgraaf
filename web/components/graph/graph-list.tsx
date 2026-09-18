"use client";

import { useMemo, useState } from "react";
import { ORG_BRANCH_LABELS, ORG_SUBTYPE_LABELS } from "@/lib/labels";
import { SECTOR_ORDER, type GraphBundle } from "@/lib/graph";
import type { OrgBranch } from "@/lib/types";

type GraphListProps = {
  bundle: GraphBundle;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  hiddenBranches: ReadonlySet<string>;
};

export function GraphList({ bundle, selectedId, onSelect, hiddenBranches }: GraphListProps) {
  const [open, setOpen] = useState(false);

  const groups = useMemo(() => {
    const visible = bundle.nodes.filter((node) => !hiddenBranches.has(node.branch));
    const byBranch = new Map<OrgBranch, typeof visible>();
    for (const node of visible) {
      const list = byBranch.get(node.branch);
      if (list) list.push(node);
      else byBranch.set(node.branch, [node]);
    }
    const order = [
      ...SECTOR_ORDER.filter((branch) => byBranch.has(branch)),
      ...[...byBranch.keys()].filter((branch) => !SECTOR_ORDER.includes(branch)).sort(),
    ];
    return order.map((branch) => {
      const nodes = (byBranch.get(branch) ?? []).slice().sort((a, b) => {
        if (a.name !== b.name) return a.name < b.name ? -1 : 1;
        return a.id < b.id ? -1 : 1;
      });
      return { branch, nodes };
    });
  }, [bundle, hiddenBranches]);

  return (
    <details
      className="absolute left-3 top-3 max-w-[min(22rem,calc(100%-1.5rem))] rounded-md border border-line bg-surface text-sm"
      onToggle={(event) => setOpen((event.currentTarget as HTMLDetailsElement).open)}
    >
      <summary className="cursor-pointer px-3 py-2 text-xs font-medium uppercase tracking-wide text-ink-muted">
        Lijst van organisaties
      </summary>
      {open ? (
        <div className="max-h-72 overflow-y-auto border-t border-line px-3 py-2">
          {groups.map((group) => (
            <section key={group.branch} className="mb-3 last:mb-0">
              <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-faint">
                {ORG_BRANCH_LABELS[group.branch]} ({group.nodes.length})
              </h3>
              <ul className="space-y-0.5">
                {group.nodes.map((node) => (
                  <li key={node.id}>
                    <button
                      type="button"
                      onClick={() => onSelect(node.id)}
                      aria-current={selectedId === node.id ? "true" : undefined}
                      className={`w-full truncate rounded-sm px-1.5 py-1 text-left text-xs ${
                        selectedId === node.id
                          ? "bg-accent-soft text-accent-text"
                          : "text-ink-muted hover:bg-surface-raised hover:text-ink"
                      }`}
                    >
                      {node.name}
                      <span className="sr-only">, {ORG_SUBTYPE_LABELS[node.subtype]}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      ) : null}
    </details>
  );
}
