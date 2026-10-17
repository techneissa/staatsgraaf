"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { SECTOR_ORDER } from "@/lib/graph";
import { legendLayers } from "@/lib/layer-counts";
import type { OrgBranch } from "@/lib/types";
import { useT } from "@/components/i18n/use-t";
import { CanvasControls, type CanvasView } from "./canvas-controls";
import dynamic from "next/dynamic";
import { preload } from "react-dom";
import { ChevronUp, Orbit } from "lucide";
import { LucideIcon } from "./icons/lucide-icon";
import type { FractieResolver, NameResolver } from "./power/connections-view";
import { useSelection } from "./selection/selection-provider";
import { seatIndex } from "@/lib/seats";
import { pathEntity, type Selection } from "@/lib/selection";
import { partyBySlug } from "@/lib/parties";
import { useGraphBundle, usePowerMapBundle } from "./graph/use-graph-bundle";
import { readCanvasOpen, writeCanvasOpen } from "@/lib/canvas-prefs";
import { usePanelState } from "./panels/workspace";

/**
 * The wheel and the connections view are the heaviest code on the site and
 * many routes never show them (a phone on a page other than the home page keeps
 * the graph folded), so neither is in the shared bundle. The wheel loads as soon
 * as the canvas is on screen, in parallel with graph.json; the connections view
 * loads only when the reader picks it. Both render in the browser only, like the
 * frame around them.
 */
function CanvasLoading() {
  const t = useT("common");
  return (
    <div className="flex h-full items-center justify-center p-6">
      <p className="text-sm text-ink-muted">{t("graphLoading")}</p>
    </div>
  );
}
const loadWheel = () => import("./graph/graph-wheel").then((module) => module.GraphWheel);
const GraphWheel = dynamic(loadWheel, { ssr: false, loading: CanvasLoading });

// The home page is the graph, so its code starts downloading as this module
// runs. Every other route leaves it alone until the page has painted: drawing
// the wheel on a body page froze the top bar (language, menu, search).
if (typeof window !== "undefined" && window.location.pathname === "/") {
  void loadWheel();
}

function whenIdle(task: () => void, timeout = 600): () => void {
  if (typeof window.requestIdleCallback === "function") {
    const id = window.requestIdleCallback(task, { timeout });
    return () => window.cancelIdleCallback(id);
  }
  const id = window.setTimeout(task, 0);
  return () => window.clearTimeout(id);
}
const ConnectionsView = dynamic(() => import("./power/connections-view").then((module) => module.ConnectionsView), {
  ssr: false,
  loading: CanvasLoading,
});

export function CanvasFrame() {
  const pathname = usePathname();
  /** The home page is the graph on a phone; from tablet width the page is first. */
  const isHome = pathname === "/";
  const { desktop, tablet, canvasOpen, setCanvasOpen } = usePanelState();
  // Phone home still leads with the graph, so its data starts with the HTML.
  // From tablet the canvas is closed unless the reader opened it; preload only
  // then, so an iPad does not fetch graph.json for a page it is not showing.
  preload("/graph.json", {
    as: "fetch",
    crossOrigin: "anonymous",
    ...(canvasOpen ? {} : { media: "(max-width: 47.999rem)" }),
  });
  /**
   * Below md a page other than the home page folds the canvas to one toolbar
   * row so its own content starts on the first screen; this opens it. The
   * choice lasts for the visit (lib/canvas-prefs.ts) and is mirrored on <html>
   * where globals.css reads it before hydration. From md, canvasOpen does
   * the same job on every route, including home.
   */
  const [open, setOpen] = useState(false);
  useEffect(() => {
    setOpen(readCanvasOpen());
  }, []);
  const toggleOpen = () => {
    const next = !open;
    setOpen(next);
    writeCanvasOpen(next);
  };
  const t = useT("common");
  const tg = useT("graph");
  const tp = useT("power");
  const asideRef = useRef<HTMLElement | null>(null);
  /**
   * Below lg the canvas is a compact band above the page so the content starts
   * on the first screen; this opens it full screen. From lg it has its own
   * column, and the same button opens it over the whole window when a chart
   * needs more room than the column gives.
   */
  const [expanded, setExpanded] = useState(false);
  /**
   * matchMedia is false on the server, so the first client paint would treat
   * an iPad or desktop as a phone and fetch the graph on home. Wait one frame
   * for the real breakpoint before the canvas counts as on screen, unless the
   * reader already opened or expanded it.
   */
  const [layoutReady, setLayoutReady] = useState(false);
  useEffect(() => {
    setLayoutReady(true);
  }, []);
  /**
   * Whether the canvas is on screen. On a phone the home page is the graph and
   * other routes wait for the fold button. From tablet width the page is first
   * and the graph loads only when the reader opened it, or when it is expanded.
   */
  const onScreen = expanded || canvasOpen || (layoutReady && !tablet && (isHome || open));
  /**
   * Parsing graph.json and mounting the wheel blocks the main thread. On a
   * page that is not the graph, wait until the page (and the top bar) have
   * painted. Opening or expanding the canvas skips the wait.
   */
  const [heavyReady, setHeavyReady] = useState(false);
  useEffect(() => {
    if (!onScreen) return;
    if (isHome || open || expanded) {
      setHeavyReady(true);
      return;
    }
    return whenIdle(() => setHeavyReady(true));
  }, [onScreen, isHome, open, expanded]);
  const visible = onScreen && heavyReady;
  // The graph is fetched when the canvas is on screen; folded, it costs nothing.
  const { bundle, status } = useGraphBundle(visible);
  const [view, setView] = useState<CanvasView>("graph");
  // The wheel's code is requested with the graph data, not after it.
  useEffect(() => {
    if (visible && view === "graph") void loadWheel();
  }, [visible, view]);
  const [hiddenBranches, setHiddenBranches] = useState<Set<string>>(new Set());
  /** The date the relations are drawn for; null is today. Only the dated relations change. */
  const [asOf, setAsOf] = useState<string | null>(null);
  const datedEdges = useMemo(() => bundle?.edges.some((edge) => Boolean(edge.validFrom || edge.validTo)) ?? false, [bundle]);

  /**
   * What is picked lives in the selection store (lib/selection.ts), for both
   * canvases and the panels. The frame only decides which canvas shows it.
   */
  const { current, select } = useSelection();

  // The connections bundle (power-map.json) is loaded only when it is shown.
  const wantsPower = visible && (view === "power" || current?.kind === "news" || current?.kind === "topic");
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
   * or a ministry's budget page picks its body, a person page its person (and
   * so lights their seat), a party page its group in the Kamer. Once
   * per path, so a reader who lets the pick go keeps it gone.
   */
  const pathPickRef = useRef<{ path: string; selection: Selection | null } | null>(null);
  useEffect(() => {
    if (!bundle || !pathname) return;
    if (pathPickRef.current?.path === pathname && pathPickRef.current.selection !== null) return;
    const entity = pathEntity(pathname);
    let selection: Selection | null = null;
    if (entity?.kind === "org") {
      const node = bundle.nodes.find((candidate) => candidate.slug === entity.slug && candidate.id.startsWith("org:"));
      if (node) selection = { kind: "org", id: node.id, surface: "graph" };
    } else if (entity?.kind === "person") {
      const id = personBySlug.get(entity.slug);
      if (id) {
        const seat = seats.get(id);
        selection = seat
          ? { kind: "person", id, surface: "graph", seat: { chamberId: seat.chamberId, fractieIndex: seat.fractieIndex } }
          : { kind: "person", id, surface: "power" };
      }
    } else if (entity?.kind === "party") {
      // A party page lights the party's group in the Tweede Kamer, or in the Eerste Kamer when it has no seat in the Tweede.
      const party = partyBySlug(entity.slug);
      if (party) {
        for (const chamberId of ["org:tweede-kamer", "org:eerste-kamer"]) {
          const index = bundle.chambers?.[chamberId]?.entries.findIndex((entry) => entry.key === party.key) ?? -1;
          if (index >= 0) {
            selection = { kind: "fractie", chamberId, index, surface: "graph", slug: entity.slug };
            break;
          }
        }
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
    // A person picked on the wheel's kabinet bench has no seat but stays on the graph.
    else if (current.kind === "person" && !seats.has(current.id) && current.surface !== "graph") setView("power");
  }, [current, seats]);

  /** Names the connections view does not carry itself: bodies from the graph, seated members. */
  const resolveName = useMemo<NameResolver>(() => {
    const nodes = new Map((bundle?.nodes ?? []).map((node) => [node.id, node]));
    return (id: string) => {
      const node = nodes.get(id);
      if (node) return { name: node.name, image: null, slug: node.slug };
      const person = bundle?.seatPeople?.[id];
      return person ? { name: person.name, image: person.image, slug: person.slug } : null;
    };
  }, [bundle]);

  /** The fractie of a seated member, from the seat blocks, for the connections view. */
  const fractieOf = useMemo<FractieResolver>(() => {
    const byPerson = new Map<string, { label: string; chamber: string; color: string | null; members: readonly string[] }>();
    for (const [chamberId, seatsOf] of Object.entries(bundle?.chambers ?? {})) {
      const chamber = bundle?.nodes.find((node) => node.id === chamberId)?.name ?? chamberId;
      for (const entry of seatsOf.entries) {
        const info = { label: entry.label, chamber, color: entry.color, members: entry.members ?? [] };
        for (const member of info.members) if (!byPerson.has(member)) byPerson.set(member, info);
      }
    }
    return (id: string) => byPerson.get(id) ?? null;
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
      // From tablet width the canvas starts closed: open the column (or the
      // folded band below lg) so the focused person is actually on screen.
      if (window.matchMedia("(min-width: 48rem)").matches) {
        setCanvasOpen(true);
      }
      if (window.matchMedia("(max-width: 1023.98px)").matches) {
        setOpen(true);
        writeCanvasOpen(true);
        const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        asideRef.current?.scrollIntoView({ behavior: smooth ? "smooth" : "auto", block: "start" });
      }
    };
    window.addEventListener("staatsgraaf:focus", handler);
    return () => window.removeEventListener("staatsgraaf:focus", handler);
  }, [bundle, personBySlug, select, setCanvasOpen]);

  useEffect(() => {
    setExpanded(false);
  }, [pathname]);

  // A view that needs more room than the column gives (the hierarchy chart)
  // asks for full screen with a `staatsgraaf:canvas-expand` event.
  useEffect(() => {
    const handler = () => setExpanded(true);
    window.addEventListener("staatsgraaf:canvas-expand", handler);
    return () => window.removeEventListener("staatsgraaf:canvas-expand", handler);
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
    window.addEventListener("keydown", onKeyDown);
    return () => {
      root.style.overflow = previous;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [expanded]);

  // One counting function for the legend and the sector panel (lib/layer-counts.ts).
  const branches = useMemo(
    () => (bundle ? (legendLayers(bundle.nodes, SECTOR_ORDER) as { branch: OrgBranch; count: number; municipalities?: number }[]) : []),
    [bundle],
  );

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
      aria-label={view === "power" ? tp("viewName") : t("graphTitle")}
      data-canvas-frame
      data-route={isHome ? "home" : "page"}
      data-expanded={expanded ? "" : undefined}
      className={`flex min-w-0 flex-col [--canvas-bottom:0px] lg:[--canvas-bottom:var(--safe-bottom)] border-b border-line bg-surface-inset lg:col-start-2 lg:row-start-1 lg:h-auto lg:min-h-0 lg:border-b-0 lg:border-s lg:border-t-0 ${
        expanded
          ? "fixed inset-0 z-40 h-dvh border-b-0 [--canvas-bottom:var(--safe-bottom)] lg:border-s-0"
          : "h-[max(19rem,50svh)] sm:h-[max(24rem,56svh)]"
      }`}
    >
      <div
        className={`flex flex-wrap items-start gap-2 border-b border-line py-2 pl-[max(0.75rem,var(--safe-left))] pr-[max(0.75rem,var(--safe-right))] sm:items-center sm:pl-[max(1rem,var(--safe-left))] sm:pr-[max(1rem,var(--safe-right))] lg:flex-nowrap ${
          expanded ? "pt-[max(0.5rem,var(--safe-top))]" : ""
        }`}
      >
        {/* A page other than the home page folds this band to this one row below
            lg (globals.css, "Graph band"); a native button, remembered for the visit. */}
        {expanded ? null : (
          <button
            type="button"
            data-canvas-fold
            onClick={() => (tablet ? setCanvasOpen(!canvasOpen) : toggleOpen())}
            aria-expanded={tablet ? canvasOpen : open}
            aria-controls="sg-canvas-body"
            className="tap-target flex min-h-11 w-full items-center gap-2 rounded-sm border border-line bg-surface px-3 text-sm font-medium text-ink transition-fast hover:border-line-strong lg:hidden"
          >
            <LucideIcon icon={(tablet ? canvasOpen : open) ? ChevronUp : Orbit} size={16} />
            <span>{(tablet ? canvasOpen : open) ? t("canvasHide") : t("canvasShow")}</span>
          </button>
        )}
        <div data-canvas-tools className="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-x-3 gap-y-2">
          <CanvasControls
            asOfClassName={expanded ? "flex" : "hidden sm:flex"}
            view={view}
            onViewChange={setView}
            branches={branches}
            hiddenBranches={hiddenBranches}
            onToggleBranch={toggleBranch}
            onShowAll={() => setHiddenBranches(new Set())}
            asOf={asOf}
            onAsOfChange={setAsOf}
            datedEdges={datedEdges}
          />
        </div>
        {desktop && canvasOpen && !expanded ? (
          <button
            type="button"
            data-canvas-tools
            onClick={() => {
              setCanvasOpen(false);
              requestAnimationFrame(() => document.getElementById("sg-canvas-show")?.focus());
            }}
            aria-label={t("canvasHide")}
            title={t("canvasHide")}
            className="tap-target hidden shrink-0 items-center justify-center gap-1.5 rounded-sm border border-line bg-surface px-2 py-1 text-xs font-medium text-ink-muted transition-fast hover:border-line-strong hover:text-ink lg:flex"
          >
            <svg aria-hidden="true" viewBox="0 0 12 12" width="12" height="12">
              <path d="M7.5 2.5 4 6l3.5 3.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="max-[1180px]:sr-only">{t("canvasHide")}</span>
          </button>
        ) : null}
        <button
          type="button"
          data-canvas-tools
          onClick={() => setExpanded((current) => !current)}
          aria-pressed={expanded}
          aria-label={expanded ? tg("canvasCollapse") : tg("canvasExpand")}
          title={expanded ? tg("canvasCollapse") : tg("canvasExpand")}
          className="tap-target flex shrink-0 items-center justify-center gap-1.5 rounded-sm border border-line bg-surface px-2 py-1 text-xs font-medium text-ink-muted transition-fast hover:border-line-strong hover:text-ink"
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

      <div id="sg-canvas-body" data-canvas-body className="relative min-h-0 flex-1">
        {status === "loading" || status === "idle" ? (
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
          <GraphWheel bundle={bundle} hiddenBranches={hiddenBranches} asOf={asOf} />
        ) : null}

        {view === "power" && power.status !== "ready" ? (
          <div className="flex h-full items-center justify-center p-6">
            <p className="text-sm text-ink-muted">
              {power.status === "error" ? t("graphErrorTitle") : t("graphLoading")}
            </p>
          </div>
        ) : null}

        {view === "power" && power.status === "ready" && power.bundle ? (
          <ConnectionsView bundle={power.bundle} resolveName={resolveName} fractieOf={fractieOf} />
        ) : null}
      </div>
    </aside>
  );
}
