"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { SECTOR_ORDER } from "@/lib/graph";
import type { OrgBranch } from "@/lib/types";
import { edgeTypeOrderIndex } from "./graph/edge-styles";
import { useT } from "@/components/i18n/use-t";
import { CanvasControls, type CanvasView } from "./canvas-controls";
import { GraphCanvas } from "./graph/graph-canvas";
import { PowerMapView, type NameResolver } from "./graph/power-map";
import { useSelection } from "./selection/selection-provider";
import { seatIndex } from "@/lib/seats";
import type { Selection } from "@/lib/selection";
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
  const [hiddenBranches, setHiddenBranches] = useState<Set<string>>(new Set());
  /** The date the relations are drawn for; null is today. Only the dated relations change. */
  const [asOf, setAsOf] = useState<string | null>(null);
  const datedEdges = useMemo(() => bundle?.edges.some((edge) => Boolean(edge.validFrom || edge.validTo)) ?? false, [bundle]);

  /**
   * What is picked lives in the selection store (lib/selection.ts), for both
   * canvases and the panels. The frame only decides which canvas shows it.
   */
  const { current, select } = useSelection();

  // The machtskaart bundle is loaded only when it is shown.
  const wantsPower = view === "power" || current?.kind === "news" || current?.kind === "topic";
  const power = usePowerMapBundle(wantsPower);

  const seats = useMemo(() => (bundle ? seatIndex(bundle.chambers) : new Map()), [bundle]);
  const personBySlug = useMemo(() => {
    const map = new Map<string, string>();
    for (const [id, person] of Object.entries(bundle?.seatPeople ?? {})) map.set(person.slug, id);
    for (const [id, person] of Object.entries(power.bundle?.people ?? {})) map.set(person.slug, id);
    return map;
  }, [bundle, power.bundle]);

  /**
   * The page's own entity is picked when the page opens: an organisation page
   * picks its body, a person page its person (and so lights their seat). Once
   * per path, so a reader who lets the pick go keeps it gone.
   */
  const pathPickRef = useRef<{ path: string; selection: Selection | null } | null>(null);
  useEffect(() => {
    if (!bundle || !pathname) return;
    if (pathPickRef.current?.path === pathname && pathPickRef.current.selection !== null) return;
    const parts = pathname.split("/").filter(Boolean);
    let selection: Selection | null = null;
    if (parts[0] === "organisaties" && parts[1]) {
      const node = bundle.nodes.find((candidate) => candidate.slug === parts[1] && candidate.id.startsWith("org:"));
      if (node) selection = { kind: "org", id: node.id, surface: "graph" };
    } else if (parts[0] === "personen" && parts[1]) {
      const id = personBySlug.get(parts[1]);
      if (id) {
        const seat = seats.get(id);
        selection = seat
          ? { kind: "person", id, surface: "graph", seat: { chamberId: seat.chamberId, fractieIndex: seat.fractieIndex } }
          : { kind: "person", id, surface: "power" };
      }
    }
    pathPickRef.current = { path: pathname, selection };
    if (selection) select(selection);
  }, [bundle, pathname, personBySlug, seats, select]);

  /**
   * The canvas that can show the pick comes forward: news and topics live on
   * the power map, groups, fracties and sectors on the graph, a person without
   * a seat on the power map. A body or a seated person shows on both, so the
   * reader's choice stands. A pick made by opening a page never switches.
   */
  useEffect(() => {
    if (!current || current === pathPickRef.current?.selection) return;
    if (current.kind === "news" || current.kind === "topic") setView("power");
    else if (current.kind === "cluster" || current.kind === "fractie" || current.kind === "sector") setView("graph");
    else if (current.kind === "person" && !seats.has(current.id)) setView("power");
  }, [current, seats]);

  /** Names the power map does not carry itself: bodies from the graph, seated members. */
  const resolveName = useMemo<NameResolver>(() => {
    const nodes = new Map((bundle?.nodes ?? []).map((node) => [node.id, node]));
    return (id: string) => {
      const node = nodes.get(id);
      if (node) return { name: node.name, image: null, slug: node.slug };
      const person = bundle?.seatPeople?.[id];
      return person ? { name: person.name, image: person.image, slug: person.slug } : null;
    };
  }, [bundle]);

  /**
   * Page code that is not on the store yet (the "who is in the news" callout)
   * asks for a focus with a `staatsgraaf:focus` event. It becomes a pick like
   * any other; this bridge holds no state of its own.
   */
  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ id?: string; slug?: string; view?: CanvasView }>).detail;
      if (!detail) return;
      if (detail.view) setView(detail.view);
      const node = bundle?.nodes.find((candidate) => candidate.id === detail.id || candidate.slug === detail.slug);
      if (node) select({ kind: "org", id: node.id, surface: detail.view === "power" ? "power" : "graph" });
      else {
        const id = detail.id ?? (detail.slug ? personBySlug.get(detail.slug) ?? `person:${detail.slug}` : null);
        if (id) select({ kind: "person", id, surface: "power" });
      }
      // On a phone or tablet the canvas sits above the content: bring it into view.
      if (window.matchMedia("(max-width: 1023.98px)").matches) {
        const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        asideRef.current?.scrollIntoView({ behavior: smooth ? "smooth" : "auto", block: "start" });
      }
    };
    window.addEventListener("staatsgraaf:focus", handler);
    return () => window.removeEventListener("staatsgraaf:focus", handler);
  }, [bundle, personBySlug, select]);

  useEffect(() => {
    setExpanded(false);
  }, [pathname]);

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
          className="sr-only text-xs font-medium text-ink-muted sm:not-sr-only"
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
          <GraphCanvas bundle={bundle} hiddenBranches={hiddenBranches} asOf={asOf} />
        ) : null}

        {view === "power" && power.status !== "ready" ? (
          <div className="flex h-full items-center justify-center p-6">
            <p className="text-sm text-ink-muted">
              {power.status === "error" ? t("graphErrorTitle") : t("graphLoading")}
            </p>
          </div>
        ) : null}

        {view === "power" && power.status === "ready" && power.bundle ? (
          <PowerMapView bundle={power.bundle} resolveName={resolveName} />
        ) : null}
      </div>
    </aside>
  );
}
