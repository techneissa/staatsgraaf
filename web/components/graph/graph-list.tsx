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

const EDGE_TYPE_LABELS: Record<string, string> = {
  advises: "adviseert",
  elects: "kiest",
  consists_of: "bestaat uit",
  oversees: "houdt toezicht op",
  part_of: "maakt deel uit van",
};

type Relation = {
  key: string;
  outgoing: boolean;
  verb: string;
  neighbour: string;
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

  const relationsByNode = useMemo(() => {
    const byId = new Map(bundle.nodes.map((node) => [node.id, node]));
    const visible = new Set(
      bundle.nodes.filter((node) => !hiddenBranches.has(node.branch)).map((node) => node.id),
    );
    const map = new Map<string, Relation[]>();
    const push = (nodeId: string, relation: Relation) => {
      const list = map.get(nodeId);
      if (list) list.push(relation);
      else map.set(nodeId, [relation]);
    };
    for (const edge of bundle.edges) {
      if (!visible.has(edge.from) || !visible.has(edge.to)) continue;
      const from = byId.get(edge.from);
      const to = byId.get(edge.to);
      if (!from || !to) continue;
      const verb = EDGE_TYPE_LABELS[edge.type] ?? edge.type;
      push(edge.from, { key: `${edge.from}>${edge.to}:${edge.type}`, outgoing: true, verb, neighbour: to.name });
      push(edge.to, { key: `${edge.from}>${edge.to}:${edge.type}`, outgoing: false, verb, neighbour: from.name });
    }
    for (const list of map.values()) {
      list.sort(
        (a, b) => a.neighbour.localeCompare(b.neighbour, "nl") || a.key.localeCompare(b.key),
      );
    }
    return map;
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
                {group.nodes.map((node) => {
                  const relations = relationsByNode.get(node.id) ?? [];
                  return (
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
                      {relations.length > 0 ? (
                        <ul
                          aria-label={`Verbindingen van ${node.name}`}
                          className="mb-1 ps-3 pt-0.5"
                        >
                          {relations.map((relation, index) => (
                            <li
                              key={`${node.id}-${relation.key}-${index}`}
                              className="text-xs leading-snug text-ink-faint"
                            >
                              {relation.outgoing
                                ? `${relation.verb} ${relation.neighbour}`
                                : `${relation.neighbour} ${relation.verb} dit orgaan`}
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      ) : null}
    </details>
  );
}
