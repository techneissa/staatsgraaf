"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { SECTOR_ORDER } from "@/lib/graph";
import type { OrgBranch } from "@/lib/types";
import { CanvasControls, type CanvasView } from "./canvas-controls";
import { GraphExplorer } from "./graph/graph-explorer";
import { PowerMapView } from "./graph/power-map";
import { useGraphBundle } from "./graph/use-graph-bundle";

export function CanvasFrame() {
  const pathname = usePathname();
  const { bundle, status } = useGraphBundle();
  const [view, setView] = useState<CanvasView>("graph");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hiddenBranches, setHiddenBranches] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!bundle || !pathname) return;
    const parts = pathname.split("/").filter(Boolean);
    if (parts[0] === "organisaties" && parts[1]) {
      const node = bundle.nodes.find((candidate) => candidate.slug === parts[1]);
      if (node) setSelectedId(node.id);
    }
  }, [bundle, pathname]);

  useEffect(() => {
    const handler = (event: Event) => {
      if (!bundle) return;
      const detail = (event as CustomEvent<{ id?: string; slug?: string }>).detail;
      if (!detail) return;
      if (detail.id && bundle.nodes.some((node) => node.id === detail.id)) {
        setSelectedId(detail.id);
      } else if (detail.slug) {
        const node = bundle.nodes.find((candidate) => candidate.slug === detail.slug);
        if (node) setSelectedId(node.id);
      }
    };
    window.addEventListener("nl-overheid-graph:focus", handler);
    return () => window.removeEventListener("nl-overheid-graph:focus", handler);
  }, [bundle]);

  const branches = useMemo(() => {
    if (!bundle) return [] as { branch: OrgBranch; count: number }[];
    const counts = new Map<OrgBranch, number>();
    for (const node of bundle.nodes) {
      counts.set(node.branch, (counts.get(node.branch) ?? 0) + 1);
    }
    const order = [
      ...SECTOR_ORDER.filter((branch) => counts.has(branch)),
      ...[...counts.keys()].filter((branch) => !SECTOR_ORDER.includes(branch)).sort(),
    ];
    return order.map((branch) => ({ branch, count: counts.get(branch) ?? 0 }));
  }, [bundle]);

  const toggleBranch = (branch: OrgBranch, visible: boolean) => {
    setHiddenBranches((current) => {
      const next = new Set(current);
      if (visible) next.delete(branch);
      else next.add(branch);
      return next;
    });
  };

  return (
    <aside
      aria-labelledby="grafiek-titel"
      className="flex min-h-72 flex-col border-t border-line bg-surface-inset lg:min-h-0 lg:border-s lg:border-t-0"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-2.5">
        <h2
          id="grafiek-titel"
          className="text-xs font-medium uppercase tracking-wider text-ink-muted"
        >
          {view === "power" ? "Machtskaart" : "Grafiek"}
        </h2>
        <CanvasControls
          view={view}
          onViewChange={setView}
          branches={branches}
          hiddenBranches={hiddenBranches}
          onToggleBranch={toggleBranch}
          onShowAll={() => setHiddenBranches(new Set())}
        />
      </div>

      <div className="relative min-h-0 flex-1">
        {status === "loading" ? (
          <div className="flex h-full items-center justify-center p-6">
            <p className="text-sm text-ink-muted">De grafiek wordt geladen.</p>
          </div>
        ) : null}

        {status === "error" ? (
          <div className="flex h-full items-center justify-center p-6">
            <div className="max-w-sm text-center">
              <p className="text-sm text-ink-muted">De grafiek kon niet worden geladen.</p>
              <p className="mt-2 text-xs text-ink-faint">
                Alle gegevens op deze pagina zijn ook zonder de grafiek te lezen, met een bron per
                gegeven.
              </p>
            </div>
          </div>
        ) : null}

        {status === "ready" && bundle && view === "graph" ? (
          <GraphExplorer
            bundle={bundle}
            selectedId={selectedId}
            onSelect={setSelectedId}
            hiddenBranches={hiddenBranches}
          />
        ) : null}

        {status === "ready" && bundle && view === "power" ? (
          <PowerMapView powerMap={bundle.powerMap} />
        ) : null}
      </div>
    </aside>
  );
}
