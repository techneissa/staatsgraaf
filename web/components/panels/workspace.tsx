"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from "react";
import { useDict } from "@/components/i18n/use-t";
import {
  DETAILS_WIDTH,
  DETAILS_WIDTH_VAR,
  PANEL_ATTR,
  PANEL_STORAGE,
  availableDetailsMax,
  clampDetailsWidth,
  parseCanvasOpen,
  parseDetailsWidth,
  parseOpen,
  widthAfterKey,
} from "./panel-prefs";
import dynamic from "next/dynamic";
import { useSelection } from "@/components/selection/selection-provider";

// The panel bodies are large and a phone never shows the column, so each
// surface loads when it is on screen: the column from lg, the sheet when
// something is picked below it.
const loadDetailsPanel = () => import("./details-panel").then((module) => module.DetailsPanel);
const DetailsPanel = dynamic(loadDetailsPanel, { ssr: false });
// From lg the column is on screen from the first paint: its code starts
// downloading as this module runs, before React has hydrated.
if (typeof window !== "undefined" && window.matchMedia("(min-width: 64rem)").matches) void loadDetailsPanel();
const DetailsSheet = dynamic(() => import("./details-sheet").then((module) => module.DetailsSheet), { ssr: false });

export const PAGE_COLUMN_ID = "sg-page-column";
const DETAILS_ID = "sg-details";
const CANVAS_ID = "sg-canvas-body";
const DESKTOP = "(min-width: 64rem)";
const TABLET = "(min-width: 48rem)";

type PanelState = {
  /** True from the lg breakpoint, where the three columns sit side by side. */
  desktop: boolean;
  /** True from md, where the page is first and the canvas starts closed. */
  tablet: boolean;
  pageOpen: boolean;
  detailsOpen: boolean;
  canvasOpen: boolean;
  setCanvasOpen: (open: boolean) => void;
};

const PanelStateContext = createContext<PanelState>({
  desktop: false,
  tablet: false,
  pageOpen: true,
  detailsOpen: true,
  canvasOpen: false,
  setCanvasOpen: () => {},
});

/** Whether the side columns are showing, for panels that adapt to the other one being hidden. */
export function usePanelState(): PanelState {
  return useContext(PanelStateContext);
}

function subscribeDesktop(onChange: () => void) {
  const query = window.matchMedia(DESKTOP);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function subscribeTablet(onChange: () => void) {
  const query = window.matchMedia(TABLET);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function useDesktop(): boolean {
  return useSyncExternalStore(
    subscribeDesktop,
    () => window.matchMedia(DESKTOP).matches,
    () => false,
  );
}

function useTablet(): boolean {
  return useSyncExternalStore(
    subscribeTablet,
    () => window.matchMedia(TABLET).matches,
    () => false,
  );
}

function store(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Private mode or storage full: the choice lasts for this page only.
  }
}

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

/** A column's open state, mirrored on <html> where the grid reads it and in localStorage. */
function useColumnOpen(
  storageKey: string,
  attr: string,
  parse: (raw: string | null) => boolean = parseOpen,
  defaultOpen = true,
): [boolean, (open: boolean) => void] {
  const [open, setOpenState] = useState(defaultOpen);
  useEffect(() => {
    setOpenState(parse(read(storageKey)));
  }, [storageKey, parse]);
  const setOpen = useCallback(
    (next: boolean) => {
      setOpenState(next);
      if (next) document.documentElement.removeAttribute(attr);
      else document.documentElement.setAttribute(attr, "closed");
      store(storageKey, next ? "open" : "closed");
    },
    [storageKey, attr],
  );
  return [open, setOpen];
}

function Chevron({ pointsLeft }: { pointsLeft: boolean }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 12 12" width="12" height="12" className="shrink-0 transition-transform duration-200" style={{ transform: pointsLeft ? "none" : "scaleX(-1)" }}>
      <path d="M7.5 2.5 4 6l3.5 3.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const PANEL_BTN =
  "tap-target inline-flex min-h-11 shrink-0 items-center justify-center gap-1.5 rounded-sm border border-line bg-surface px-3 text-sm font-medium text-ink transition-fast hover:border-line-strong";

/**
 * A slim tab on an edge of the canvas that folds the column on that side
 * away or back. It sits where the column meets the canvas, so it travels
 * with the edge and always points the way the column will move.
 */
function EdgeToggle({
  side,
  open,
  onToggle,
  controls,
  label,
  column = "canvas",
  hidden = false,
  pointsLeft,
  align = "center",
  buttonId,
}: {
  side: "start" | "end";
  open: boolean;
  onToggle: () => void;
  controls: string;
  label: string;
  /** Grid column the tab sits on. "page" is the trailing edge when the canvas is away. */
  column?: "page" | "canvas" | "details";
  hidden?: boolean;
  pointsLeft?: boolean;
  align?: "start" | "center" | "end";
  buttonId?: string;
}) {
  const shape =
    side === "start"
      ? "justify-self-start rounded-e-md border-s-0"
      : "justify-self-end rounded-s-md border-e-0";
  const col =
    column === "page" ? "lg:col-start-1" : column === "details" ? "lg:col-start-3" : "lg:col-start-2";
  const chevronLeft = pointsLeft ?? (side === "start" ? open : !open);
  const alignClass = align === "end" ? "self-end mb-16" : align === "start" ? "self-start mt-20" : "self-center";
  return (
    <button
      type="button"
      id={buttonId}
      onClick={onToggle}
      aria-expanded={open}
      aria-controls={controls}
      aria-label={label}
      title={label}
      className={`relative z-20 h-12 w-5 items-center justify-center border border-line bg-surface/90 text-ink-faint shadow-sm backdrop-blur transition-fast hover:w-6 hover:text-ink focus-visible:w-6 focus-visible:text-ink pointer-coarse:min-h-11 pointer-coarse:w-11 lg:row-start-1 ${alignClass} ${hidden ? "hidden" : "hidden lg:flex"} ${col} ${shape}`}
    >
      <Chevron pointsLeft={chevronLeft} />
    </button>
  );
}

/**
 * The drag handle on the inner edge of the details panel. Pointer drags and
 * the arrow keys change the width (Home and End jump to the limits, Shift
 * takes larger steps); the width is stored when the drag or key press ends.
 */
function ResizeHandle({
  width,
  canvasOpen,
  onWidth,
}: {
  width: number;
  canvasOpen: boolean;
  onWidth: (width: number, commit: boolean) => void;
}) {
  const t = useDict("panels");
  const drag = useRef<{ x: number; width: number; pointer: number } | null>(null);
  const frame = useRef<number | null>(null);
  const liveMax = () => availableDetailsMax(window.innerWidth, canvasOpen);

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { x: event.clientX, width, pointer: event.pointerId };
    document.documentElement.setAttribute("data-panels-resizing", "");
  };
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const start = drag.current;
    if (!start || start.pointer !== event.pointerId) return;
    const next = clampDetailsWidth(start.width + (start.x - event.clientX), liveMax());
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => onWidth(next, false));
  };
  const end = (event: PointerEvent<HTMLDivElement>) => {
    const start = drag.current;
    if (!start || start.pointer !== event.pointerId) return;
    drag.current = null;
    document.documentElement.removeAttribute("data-panels-resizing");
    onWidth(clampDetailsWidth(start.width + (start.x - event.clientX), liveMax()), true);
  };
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const next = widthAfterKey(width, event.key, event.shiftKey, liveMax());
    if (next === null) return;
    event.preventDefault();
    onWidth(next, true);
  };

  return (
    <div
      role="separator"
      tabIndex={0}
      aria-orientation="vertical"
      aria-controls={DETAILS_ID}
      aria-label={t("detailsResize")}
      aria-valuemin={DETAILS_WIDTH.min}
      aria-valuemax={typeof window === "undefined" ? DETAILS_WIDTH.max : availableDetailsMax(window.innerWidth, canvasOpen)}
      aria-valuenow={width}
      aria-valuetext={t("detailsWidthValue", { n: width })}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={end}
      onPointerCancel={end}
      onKeyDown={onKeyDown}
      className="sg-resize-handle group z-30 -ms-1.5 hidden w-3 cursor-col-resize touch-none justify-self-start outline-none pointer-coarse:w-11 lg:col-start-3 lg:row-start-1 lg:flex lg:justify-center"
    >
      <span
        aria-hidden="true"
        className="h-full w-px bg-line transition-fast group-hover:w-0.5 group-hover:bg-line-strong group-focus-visible:w-0.5 group-focus-visible:bg-focus group-active:bg-accent"
      />
    </div>
  );
}

/**
 * The page layout: the page column, the canvas and the details panel, three
 * columns from the lg breakpoint and one stack below it. From tablet width
 * the canvas starts closed so the page can use the full width. Owns the
 * reader's column choices (panel-prefs.ts); the grid itself lives in
 * globals.css ("Workspace"), so the stored widths apply before hydration.
 */
export function Workspace({ canvas, children }: { canvas: ReactNode; children: ReactNode }) {
  const t = useDict("panels");
  const desktop = useDesktop();
  const tablet = useTablet();
  const [pageOpen, setPageOpen] = useColumnOpen(PANEL_STORAGE.page, PANEL_ATTR.page);
  const [detailsOpen, setDetailsOpen] = useColumnOpen(PANEL_STORAGE.details, PANEL_ATTR.details);
  const [canvasOpen, setCanvasOpenState] = useColumnOpen(
    PANEL_STORAGE.canvas,
    PANEL_ATTR.canvas,
    parseCanvasOpen,
    false,
  );
  // Closing the canvas with the page already folded would hide every tab that
  // can bring a column back (the page tab lives on the canvas). Reopen the page
  // so the "show graph" tab stays on screen.
  const setCanvasOpen = useCallback(
    (open: boolean) => {
      if (!open) setPageOpen(true);
      setCanvasOpenState(open);
    },
    [setCanvasOpenState, setPageOpen],
  );
  const [width, setWidthState] = useState<number>(DETAILS_WIDTH.initial);

  useEffect(() => {
    setWidthState(parseDetailsWidth(read(PANEL_STORAGE.detailsWidth)));
  }, []);

  const setWidth = useCallback((next: number, commit: boolean) => {
    setWidthState(next);
    document.documentElement.style.setProperty(DETAILS_WIDTH_VAR, `${next}px`);
    if (commit) store(PANEL_STORAGE.detailsWidth, String(next));
  }, []);
  const detailsMax = desktop && typeof window !== "undefined" ? availableDetailsMax(window.innerWidth, canvasOpen) : DETAILS_WIDTH.max;
  const detailsWide = width >= detailsMax - 16;

  const { current } = useSelection();
  const state = useMemo(
    () => ({ desktop, tablet, pageOpen, detailsOpen, canvasOpen, setCanvasOpen }),
    [desktop, tablet, pageOpen, detailsOpen, canvasOpen, setCanvasOpen],
  );

  // Both side columns are `relative` so they are the containing block for
  // absolutely positioned content inside them (the sr-only labels among it).
  // Without that, such content is placed against the document, escapes the
  // column's own scroll box and lets the window scroll past the layout into
  // blank space on desktop.
  return (
    <PanelStateContext.Provider value={state}>
      <div className="sg-workspace grid min-h-0 flex-1 grid-cols-1">
        {canvas}
        <EdgeToggle
          side="start"
          open={pageOpen}
          onToggle={() => setPageOpen(!pageOpen)}
          controls={PAGE_COLUMN_ID}
          label={pageOpen ? t("pageHide") : t("pageShow")}
          hidden={!canvasOpen}
        />
        {!canvasOpen || !detailsOpen ? (
          <div
            className={`relative z-20 hidden flex-col items-stretch gap-2 justify-self-end lg:flex lg:row-start-1 ${
              canvasOpen ? "lg:col-start-2" : "lg:col-start-1"
            } ${detailsOpen ? "self-end mb-16" : "self-center"}`}
          >
            {canvasOpen ? null : (
              <button
                type="button"
                id="sg-canvas-show"
                onClick={() => setCanvasOpen(true)}
                aria-expanded={false}
                aria-controls={CANVAS_ID}
                className={PANEL_BTN}
              >
                <Chevron pointsLeft={false} />
                {t("canvasShow")}
              </button>
            )}
            {detailsOpen ? null : (
              <button
                type="button"
                onClick={() => setDetailsOpen(true)}
                aria-expanded={false}
                aria-controls={DETAILS_ID}
                className={PANEL_BTN}
              >
                <Chevron pointsLeft={false} />
                {t("detailsShow")}
              </button>
            )}
          </div>
        ) : null}
        <div
          id={PAGE_COLUMN_ID}
          className="sg-page-col relative flex min-h-0 min-w-0 flex-col lg:col-start-1 lg:row-start-1 lg:overflow-y-auto lg:overflow-x-hidden"
        >
          <div className="sg-page-inner flex min-h-full flex-col">{children}</div>
        </div>
        <aside
          id={DETAILS_ID}
          aria-label={t("detailsLabel")}
          className="sg-details-col relative hidden min-h-0 min-w-0 overflow-hidden border-s border-line bg-surface lg:col-start-3 lg:row-start-1 lg:flex lg:flex-col"
        >
          <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-line px-2 py-2">
            <button type="button" onClick={() => setDetailsOpen(false)} aria-expanded={true} aria-controls={DETAILS_ID} className={PANEL_BTN}>
              <Chevron pointsLeft={true} />
              {t("detailsHide")}
            </button>
            <button
              type="button"
              onClick={() => {
                const max = availableDetailsMax(window.innerWidth, canvasOpen);
                setWidth(width >= max - 16 ? DETAILS_WIDTH.initial : max, true);
              }}
              className={PANEL_BTN}
            >
              {detailsWide ? t("detailsNarrow") : t("detailsWiden")}
            </button>
          </div>
          <div className="sg-details-inner flex min-h-0 min-w-0 flex-1 flex-col">
            {desktop ? <DetailsPanel /> : null}
          </div>
        </aside>
        {detailsOpen ? <ResizeHandle width={width} canvasOpen={canvasOpen} onWidth={setWidth} /> : null}
      </div>
      {desktop || current === null ? null : <DetailsSheet />}
    </PanelStateContext.Provider>
  );
}
