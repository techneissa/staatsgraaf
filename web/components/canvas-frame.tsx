"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { SECTOR_ORDER } from "@/lib/graph";
import type { OrgBranch } from "@/lib/types";
import { edgeTypeOrderIndex } from "./graph/edge-styles";
import { useT } from "@/components/i18n/use-t";
import { CanvasControls, type CanvasView } from "./canvas-controls";
import { GraphCanvas } from "./graph/graph-canvas";
import { PowerMapView } from "./graph/power-map";
import { useGraphBundle, usePowerMapBundle } from "./graph/use-graph-bundle";

export function CanvasFrame() {
  const pathname = usePathname();
  const { bundle, status } = useGraphBundle();
  const t = useT("common");
  const tg = useT("graph");
  const asideRef = useRef<HTMLElement | null>(null);
  /**
   * Below lg the canvas is a compact band above the page so the content starts
   * on the first screen; this opens it full screen. From lg it has its own
   * column and the flag has no effect (every class it sets is max-lg).
   */
  const [expanded, setExpanded] = useState(false);
  const [view, setView] = useState<CanvasView>("graph");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hiddenBranches, setHiddenBranches] = useState<Set<string>>(new Set());
  /** The date the relations are drawn for; null is today. Only the dated relations change. */
  const [asOf, setAsOf] = useState<string | null>(null);
  const datedEdges = useMemo(() => bundle?.edges.some((edge) => Boolean(edge.validFrom || edge.validTo)) ?? false, [bundle]);
  /** Person focused through the callout on the Who's in the news strip. */
  const [focusPerson, setFocusPerson] = useState<{ slug: string; title: string } | null>(null);

  // The machtskaart bundle is loaded only by the views that show it.
  const wantsPower =
    view === "power" || focusPerson !== null || (pathname?.startsWith("/personen/") ?? false);
  const power = usePowerMapBundle(wantsPower);
  const personSlugs = power.bundle?.personSlugs ?? null;

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
    if (focusPerson) return personSlugs?.[focusPerson.slug] ?? null;
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
    if (parts[0] === "personen") return personSlugs?.[parts[1]] ?? null;
    // Position ids are not in the bundle; the entity power map stays global there.
    return null;
  }, [bundle, pathname, focusPerson, personSlugs]);

  const entityPeople = useMemo(() => {
    if (!power.bundle || currentEntityId === null) return null;
    const people = power.bundle.entityPowerMap?.[currentEntityId];
    return Array.isArray(people) && people.length > 0 ? people : null;
  }, [power.bundle, currentEntityId]);

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
      if (detail.id && bundle.nodes.some((node) => node.id === detail.id)) {
        setSelectedId(detail.id);
        return;
      }
      if (detail.slug) {
        const node = bundle.nodes.find((candidate) => candidate.slug === detail.slug);
        if (node) {
          setSelectedId(node.id);
          return;
        }
        // Not a graph node, so a person: it focuses the entity power map. The
        // id resolves once the machtskaart bundle has loaded.
        setFocusPerson({ slug: detail.slug, title: detail.title ?? "" });
        setView("power");
      }
    };
    window.addEventListener("staatsgraaf:focus", handler);
    return () => window.removeEventListener("staatsgraaf:focus", handler);
  }, [bundle]);

  // Navigating away from the page that triggered the callout clears the focus.
  useEffect(() => {
    setFocusPerson(null);
    setExpanded(false);
  }, [pathname]);

  // A focus request from further down the page (the power map callout) brings
  // the canvas into view on a phone or tablet, where it sits above the content.
  useEffect(() => {
    const reveal = () => {
      if (!window.matchMedia("(max-width: 1023.98px)").matches) return;
      const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      asideRef.current?.scrollIntoView({ behavior: smooth ? "smooth" : "auto", block: "start" });
    };
    window.addEventListener("staatsgraaf:focus", reveal);
    return () => window.removeEventListener("staatsgraaf:focus", reveal);
  }, []);

  // Full screen: the page behind stops scrolling and Escape closes it. A menu
  // open inside the canvas handles its own Escape first.
  useEffect(() => {
    if (!expanded) return;
    const root = document.documentElement;
    const previous = root.style.overflow;
    root.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !event.defaultPrevented) setExpanded(false);
    };
    const onResize = () => {
      if (window.matchMedia("(min-width: 1024px)").matches) setExpanded(false);
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", onResize);
    return () => {
      root.style.overflow = previous;
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", onResize);
    };
  }, [expanded]);

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
      ref={asideRef}
      aria-labelledby="grafiek-titel"
      data-canvas-frame
      className={`flex min-w-0 flex-col [--canvas-bottom:0px] lg:[--canvas-bottom:var(--safe-bottom)] border-b border-line bg-surface-inset lg:col-start-2 lg:row-start-1 lg:h-auto lg:min-h-0 lg:border-b-0 lg:border-s lg:border-t-0 ${
        expanded
          ? "max-lg:fixed max-lg:inset-0 max-lg:z-40 max-lg:h-dvh max-lg:border-b-0 max-lg:[--canvas-bottom:var(--safe-bottom)]"
          : "h-[max(19rem,50dvh)] sm:h-[max(24rem,56dvh)]"
      }`}
    >
      <div
        className={`flex items-start gap-2 border-b border-line py-2 pl-[max(0.75rem,var(--safe-left))] pr-[max(0.75rem,var(--safe-right))] sm:items-center sm:pl-[max(1rem,var(--safe-left))] sm:pr-[max(1rem,var(--safe-right))] ${
          expanded ? "max-lg:pt-[max(0.5rem,var(--safe-top))]" : ""
        }`}
      >
        <div className="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-x-3 gap-y-2">
        {/* On a phone the view switch names the view already; the heading stays for screen readers. */}
        <h2
          id="grafiek-titel"
          className="sr-only text-xs font-medium uppercase tracking-wider text-ink-muted sm:not-sr-only"
        >
          {view === "power" ? t("powerTitle") : t("graphTitle")}
        </h2>
        <CanvasControls
          asOfClassName={expanded ? "flex" : "hidden sm:flex"}
          view={view}
          onViewChange={setView}
          branches={branches}
          edgeTypes={edgeTypes}
          hiddenBranches={hiddenBranches}
          onToggleBranch={toggleBranch}
          onShowAll={() => setHiddenBranches(new Set())}
          asOf={asOf}
          onAsOfChange={setAsOf}
          datedEdges={datedEdges}
        />
        </div>
        <button
          type="button"
          onClick={() => setExpanded((current) => !current)}
          aria-pressed={expanded}
          aria-label={expanded ? tg("canvasCollapse") : tg("canvasExpand")}
          title={expanded ? tg("canvasCollapse") : tg("canvasExpand")}
          className="tap-target flex shrink-0 items-center justify-center gap-1.5 rounded-sm border border-line bg-surface px-2 py-1 text-xs font-medium text-ink-muted transition-fast hover:border-line-strong hover:text-ink lg:hidden"
        >
          {expanded ? (
            <>
              <svg aria-hidden="true" viewBox="0 0 20 20" width="14" height="14">
                <path d="m5 5 10 10M15 5 5 15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
              <span aria-hidden="true">{tg("canvasClose")}</span>
            </>
          ) : (
            <svg aria-hidden="true" viewBox="0 0 20 20" width="14" height="14">
              <path
                d="M12 3.5h4.5V8M8 16.5H3.5V12M16.5 3.5 11.5 8.5M3.5 16.5l5-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </button>
      </div>

      <noscript>
        <style>{"[data-canvas-frame]{height:auto!important}[data-canvas-body]{display:none!important}"}</style>
        <p className="px-4 py-3 text-sm text-ink-muted">{tg("canvasNoScript")}</p>
      </noscript>

      <div data-canvas-body className="relative min-h-0 flex-1">
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
            asOf={asOf}
          />
        ) : null}

        {view === "power" && power.status !== "ready" ? (
          <div className="flex h-full items-center justify-center p-6">
            <p className="text-sm text-ink-muted">
              {power.status === "error" ? t("graphErrorTitle") : t("graphLoading")}
            </p>
          </div>
        ) : null}

        {view === "power" && power.status === "ready" && power.bundle ? (
          <PowerMapView
            powerMap={power.bundle.powerMap}
            entityPeople={entityPeople ?? undefined}
            entityTitle={focusPerson?.title || undefined}
            entityHref={focusPerson ? `/personen/${focusPerson.slug}/` : null}
          />
        ) : null}
      </div>
    </aside>
  );
}
