"use client";

import { useMemo, useState } from "react";
import { SECTOR_ORDER, type GraphBundle } from "@/lib/graph";
import type { OrgBranch } from "@/lib/types";
import { useT } from "@/components/i18n/use-t";
import { useLocale } from "@/components/i18n/language-provider";
import {
  BRANCH_LABELS_I18N,
  EDGE_TYPE_LABELS_I18N,
  ORG_SUBTYPE_LABELS_I18N,
} from "@/lib/i18n/dict-graph";
import { orgEnGloss } from "@/lib/name-gloss";

type GraphListProps = {
  bundle: GraphBundle;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  hiddenBranches: ReadonlySet<string>;
};

type Relation = {
  key: string;
  outgoing: boolean;
  verb: string;
  neighbour: string;
};

export function GraphList({ bundle, selectedId, onSelect, hiddenBranches }: GraphListProps) {
  const [open, setOpen] = useState(false);
  const t = useT("graph");
  const locale = useLocale();

  const localized = (map: Record<string, { nl: string; en: string }>, key: string | null | undefined) => {
    if (!key) return "";
    const entry = map[key];
    if (!entry) return key;
    return locale === "en" ? entry.en : entry.nl;
  };

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
      const entry = EDGE_TYPE_LABELS_I18N[edge.type];
      const verb = entry ? (locale === "en" ? entry.en : entry.nl) : edge.type;
      push(edge.from, { key: `${edge.from}>${edge.to}:${edge.type}`, outgoing: true, verb, neighbour: to.name });
      push(edge.to, { key: `${edge.from}>${edge.to}:${edge.type}`, outgoing: false, verb, neighbour: from.name });
    }
    for (const list of map.values()) {
      list.sort(
        (a, b) => a.neighbour.localeCompare(b.neighbour, "nl") || a.key.localeCompare(b.key),
      );
    }
    return map;
  }, [bundle, hiddenBranches, locale]);

  return (
    <details
      className="absolute left-[max(0.75rem,var(--safe-left))] top-3 max-w-[min(22rem,calc(100%-1.5rem))] rounded-md border border-line bg-surface text-sm"
      onToggle={(event) => setOpen((event.currentTarget as HTMLDetailsElement).open)}
    >
      <summary className="tap-row flex cursor-pointer items-center gap-1.5 px-3 py-2 text-xs font-medium uppercase tracking-wide text-ink-muted [&::-webkit-details-marker]:hidden">
        <svg aria-hidden="true" viewBox="0 0 20 20" width="12" height="12" className={`shrink-0 transition-fast ${open ? "rotate-90" : ""}`}>
          <path d="M7.5 4.5 13 10l-5.5 5.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {/* A short label where the canvas is narrow, so it does not cover the top of the rings. */}
        <span aria-hidden="true" className="@min-[38rem]/drawing:hidden">{t("listTitleShort")}</span>
        <span className="sr-only @min-[38rem]/drawing:not-sr-only">{t("listTitle")}</span>
      </summary>
      {open ? (
        <div className="max-h-[min(18rem,30dvh)] overflow-y-auto overscroll-contain border-t border-line px-3 py-2 @min-[38rem]/drawing:max-h-72">
          {groups.map((group) => (
            <section key={group.branch} className="mb-3 last:mb-0">
              <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-faint">
                {localized(BRANCH_LABELS_I18N, group.branch)} ({group.nodes.length})
              </h3>
              <ul className="space-y-0.5">
                {group.nodes.map((node) => {
                  const relations = relationsByNode.get(node.id) ?? [];
                  const gloss = locale === "en" ? orgEnGloss(node.name) : null;
                  return (
                    <li key={node.id}>
                      <button
                        type="button"
                        onClick={() => onSelect(node.id)}
                        aria-current={selectedId === node.id ? "true" : undefined}
                        className={`tap-row w-full truncate rounded-sm px-1.5 py-1 text-left text-xs pointer-coarse:text-sm ${
                          selectedId === node.id
                            ? "bg-accent-soft text-accent-text"
                            : "text-ink-muted hover:bg-surface-raised hover:text-ink"
                        }`}
                      >
                        {node.name}
                        <span className="sr-only">, {localized(ORG_SUBTYPE_LABELS_I18N, node.subtype)}</span>
                        {gloss ? (
                          <span className="sr-only"> ({gloss})</span>
                        ) : null}
                      </button>
                      {relations.length > 0 ? (
                        <ul
                          aria-label={t("connectionAria", { name: node.name })}
                          className="mb-1 ps-3 pt-0.5"
                        >
                          {relations.map((relation, index) => (
                            <li
                              key={`${node.id}-${relation.key}-${index}`}
                              className="text-xs leading-snug text-ink-faint"
                            >
                              {relation.outgoing
                                ? t("edgeOut", { verb: relation.verb, neighbour: relation.neighbour })
                                : t("edgeIn", { verb: relation.verb, neighbour: relation.neighbour })}
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
