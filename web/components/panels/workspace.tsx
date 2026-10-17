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
import { Maximize2, Minimize2, Orbit, PanelLeftClose, PanelLeftOpen } from "lucide";
import { Morph } from "@/components/icons/morph";
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

const ICON_BTN = "bar-control tap-target transition-fast hover:border-line-strong hover:text-ink";

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
  // Closing the canvas with the page already folded would hide every control
  // that can bring a column back. Reopen the page so the icons stay on screen.
  const setCanvasOpen = useCallback(
    (open: boolean) => {
      if (!open) setPageOpen(true);
      setCanvasOpenState(open);
    },
    [setCanvasOpenState, setPageOpen],
  );
  const setPageOpenSafe = useCallback(
    (open: boolean) => {
      if (!open && !canvasOpen && !detailsOpen) setDetailsOpen(true);
      setPageOpen(open);
    },
    [canvasOpen, detailsOpen, setDetailsOpen, setPageOpen],
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
  const pageWide = pageOpen && !detailsOpen;
  const [chromeUsed, setChromeUsed] = useState(false);

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
        <div
          id="sg-page-chrome"
          className={`relative z-20 hidden items-center gap-1 lg:flex lg:row-start-1 ${
            pageOpen
              ? "self-start justify-self-start ms-2 mt-3 lg:col-start-1"
              : canvasOpen
                ? "self-start justify-self-start ms-2 mt-3 lg:col-start-2"
                : "self-start justify-self-start ms-2 mt-3 lg:col-start-3"
          }`}
        >
          {canvasOpen ? null : (
            <button
              type="button"
              id="sg-canvas-show"
              onClick={() => {
                setChromeUsed(true);
                setCanvasOpen(true);
              }}
              aria-expanded={false}
              aria-controls={CANVAS_ID}
              aria-label={t("canvasShow")}
              title={t("canvasShow")}
              className={ICON_BTN}
            >
              <Morph icon={Orbit} size={16} strokeWidth={1.8} still={!chromeUsed} />
            </button>
          )}
          <button
            type="button"
            id="sg-page-toggle"
            onClick={() => {
              setChromeUsed(true);
              setPageOpenSafe(!pageOpen);
            }}
            aria-expanded={pageOpen}
            aria-controls={PAGE_COLUMN_ID}
            aria-label={pageOpen ? t("pageHide") : t("pageShow")}
            title={pageOpen ? t("pageHide") : t("pageShow")}
            className={ICON_BTN}
          >
            <Morph icon={pageOpen ? PanelLeftClose : PanelLeftOpen} size={16} strokeWidth={1.8} still={!chromeUsed} />
          </button>
          {pageOpen ? (
            <button
              type="button"
              id="sg-page-widen"
              onClick={() => {
                setChromeUsed(true);
                setDetailsOpen(!detailsOpen);
              }}
              aria-pressed={pageWide}
              aria-label={pageWide ? t("pageNarrow") : t("pageWiden")}
              title={pageWide ? t("pageNarrow") : t("pageWiden")}
              className={ICON_BTN}
            >
              <Morph icon={pageWide ? Minimize2 : Maximize2} size={16} strokeWidth={1.8} still={!chromeUsed} />
            </button>
          ) : null}
        </div>
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
