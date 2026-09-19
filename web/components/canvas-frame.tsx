"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { SECTOR_ORDER } from "@/lib/graph";
import type { OrgBranch } from "@/lib/types";
import { edgeTypeOrderIndex } from "./graph/edge-styles";
import { useT } from "@/components/i18n/use-t";
import { CanvasControls, type CanvasView } from "./canvas-controls";
import { GraphCanvas } from "./graph/graph-canvas";
import { PowerMapView } from "./graph/power-map";
import { useGraphBundle } from "./graph/use-graph-bundle";

export function CanvasFrame() {
  const pathname = usePathname();
  const { bundle, status } = useGraphBundle();
  const t = useT("common");
  const [view, setView] = useState<CanvasView>("graph");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hiddenBranches, setHiddenBranches] = useState<Set<string>>(new Set());
  /** Person focused through the callout on the Who's in the news strip. */
  const [focusPerson, setFocusPerson] = useState<{ id: string; slug: string; title: string } | null>(
    null,
  );

  useEffect(() => {
    if (!bundle || !pathname) return;
    const parts = pathname.split("/").filter(Boolean);
    if (parts[0] === "organisaties" && parts[1]) {
      const node = bundle.nodes.find((candidate) => candidate.slug === parts[1]);
      if (node) setSelectedId(node.id);
    }
  }, [bundle, pathname]);

  /** Entity id behind the current page (org, person or position) for the entity power map. */
  const currentEntityId = useMemo<string | null>(() => {
    if (focusPerson) return focusPerson.id;
    if (!bundle || !pathname) return null;
    const parts = pathname.split("/").filter(Boolean);
    if (parts.length < 2 || !parts[1]) return null;

    const resolveNodeIdBySlug = (nodeIdPrefix: string, slug: string): string | null => {
      for (const node of bundle.nodes) {
        if (node.slug === slug && node.id.startsWith(nodeIdPrefix)) return node.id;
      }
      return null;
    };

    if (parts[0] === "organisaties") return resolveNodeIdBySlug("org:", parts[1]);
    if (parts[0] === "personen") return bundle.personSlugs?.[parts[1]] ?? null;
    // Position ids are not in the bundle; the entity power map stays global there.
    return null;
  }, [bundle, pathname, focusPerson]);

  const entityPeople = useMemo(() => {
    if (!bundle || currentEntityId === null) return null;
    const people = bundle.entityPowerMap?.[currentEntityId];
    return Array.isArray(people) && people.length > 0 ? people : null;
  }, [bundle, currentEntityId]);

  useEffect(() => {
    const handler = (event: Event) => {
      if (!bundle) return;
      const detail = (event as CustomEvent<{
        id?: string;
        slug?: string;
        view?: CanvasView;
        title?: string;
      }>).detail;
      if (!detail) return;
      if (detail.view === "power") setView("power");
      if (detail.slug && bundle.personSlugs?.[detail.slug]) {
        // A person slug is not a graph node; it focuses the entity power map.
        setFocusPerson({
          id: bundle.personSlugs[detail.slug],
          slug: detail.slug,
          title: detail.title ?? "",
        });
        return;
      }
      if (detail.id && bundle.nodes.some((node) => node.id === detail.id)) {
        setSelectedId(detail.id);
      } else if (detail.slug) {
        const node = bundle.nodes.find((candidate) => candidate.slug === detail.slug);
        if (node) setSelectedId(node.id);
      }
    };
    window.addEventListener("staatsgraaf:focus", handler);
    return () => window.removeEventListener("staatsgraaf:focus", handler);
  }, [bundle]);

  // Navigating away from the page that triggered the callout clears the focus.
  useEffect(() => {
    setFocusPerson(null);
  }, [pathname]);

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

  const edgeTypes = useMemo(() => {
    if (!bundle) return [] as { type: string; count: number }[];
    const counts = new Map<string, number>();
    for (const edge of bundle.edges) {
      counts.set(edge.type, (counts.get(edge.type) ?? 0) + 1);
    }
    return [...counts.entries()]
      .sort(
        (a, b) =>
          edgeTypeOrderIndex(a[0]) - edgeTypeOrderIndex(b[0]) ||
          b[1] - a[1] ||
          a[0].localeCompare(b[0]),
      )
      .map(([type, count]) => ({ type, count }));
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
      className="flex h-[70dvh] flex-col border-b border-line bg-surface-inset lg:col-start-2 lg:row-start-1 lg:h-auto lg:min-h-0 lg:border-b-0 lg:border-s lg:border-t-0"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-2.5">
        <h2
          id="grafiek-titel"
          className="text-xs font-medium uppercase tracking-wider text-ink-muted"
        >
          {view === "power" ? t("powerTitle") : t("graphTitle")}
        </h2>
        <CanvasControls
          view={view}
          onViewChange={setView}
          branches={branches}
          edgeTypes={edgeTypes}
          hiddenBranches={hiddenBranches}
          onToggleBranch={toggleBranch}
          onShowAll={() => setHiddenBranches(new Set())}
        />
      </div>

      <div className="relative min-h-0 flex-1">
        {status === "loading" ? (
          <div className="flex h-full items-center justify-center p-6">
            <p className="text-sm text-ink-muted">{t("graphLoading")}</p>
          </div>
        ) : null}

        {status === "error" ? (
          <div className="flex h-full items-center justify-center p-6">
            <div className="max-w-sm text-center">
              <p className="text-sm text-ink-muted">{t("graphErrorTitle")}</p>
              <p className="mt-2 text-xs text-ink-faint">{t("graphErrorNote")}</p>
            </div>
          </div>
        ) : null}

        {status === "ready" && bundle && view === "graph" ? (
          <GraphCanvas
            bundle={bundle}
            selectedId={selectedId}
            onSelect={setSelectedId}
            hiddenBranches={hiddenBranches}
          />
        ) : null}

        {status === "ready" && bundle && view === "power" ? (
          <PowerMapView
            powerMap={bundle.powerMap}
            entityPeople={entityPeople ?? undefined}
            entityTitle={focusPerson?.title || undefined}
            entityHref={focusPerson ? `/personen/${focusPerson.slug}/` : null}
          />
        ) : null}
      </div>
    </aside>
  );
}
