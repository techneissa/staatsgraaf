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
  clampDetailsWidth,
  parseDetailsWidth,
  parseOpen,
  widthAfterKey,
} from "./panel-prefs";
import dynamic from "next/dynamic";
import { useSelection } from "@/components/selection/selection-provider";

// The panel bodies are large and a phone never shows the column, so each
// surface loads when it is on screen: the column from lg, the sheet when
// something is picked below it.
const DetailsPanel = dynamic(() => import("./details-panel").then((module) => module.DetailsPanel), { ssr: false });
const DetailsSheet = dynamic(() => import("./details-sheet").then((module) => module.DetailsSheet), { ssr: false });

export const PAGE_COLUMN_ID = "sg-page-column";
const DETAILS_ID = "sg-details";
const DESKTOP = "(min-width: 64rem)";

type PanelState = {
  /** True from the lg breakpoint, where the three columns sit side by side. */
  desktop: boolean;
  pageOpen: boolean;
  detailsOpen: boolean;
};

const PanelStateContext = createContext<PanelState>({ desktop: false, pageOpen: true, detailsOpen: true });

/** Whether the side columns are showing, for panels that adapt to the other one being hidden. */
export function usePanelState(): PanelState {
  return useContext(PanelStateContext);
}

function subscribeDesktop(onChange: () => void) {
  const query = window.matchMedia(DESKTOP);
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
function useColumnOpen(storageKey: string, attr: string): [boolean, (open: boolean) => void] {
  const [open, setOpenState] = useState(true);
  useEffect(() => {
    setOpenState(parseOpen(read(storageKey)));
  }, [storageKey]);
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
    <svg aria-hidden="true" viewBox="0 0 12 12" width="12" height="12" className="transition-transform duration-200" style={{ transform: pointsLeft ? "none" : "scaleX(-1)" }}>
      <path d="M7.5 2.5 4 6l3.5 3.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

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
}: {
  side: "start" | "end";
  open: boolean;
  onToggle: () => void;
  controls: string;
  label: string;
}) {
  const shape =
    side === "start"
      ? "justify-self-start rounded-e-md border-s-0"
      : "justify-self-end rounded-s-md border-e-0";
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      aria-controls={controls}
      aria-label={label}
      title={label}
      className={`z-20 hidden h-12 w-5 items-center justify-center self-center border border-line bg-surface/90 text-ink-faint shadow-sm backdrop-blur transition-fast hover:w-6 hover:text-ink focus-visible:w-6 focus-visible:text-ink lg:col-start-2 lg:row-start-1 lg:flex ${shape}`}
    >
      <Chevron pointsLeft={side === "start" ? open : !open} />
    </button>
  );
}

/**
 * The drag handle on the inner edge of the details panel. Pointer drags and
 * the arrow keys change the width (Home and End jump to the limits, Shift
 * takes larger steps); the width is stored when the drag or key press ends.
 */
function ResizeHandle({ width, onWidth }: { width: number; onWidth: (width: number, commit: boolean) => void }) {
  const t = useDict("panels");
  const drag = useRef<{ x: number; width: number; pointer: number } | null>(null);
  const frame = useRef<number | null>(null);

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
    const next = clampDetailsWidth(start.width + (start.x - event.clientX));
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => onWidth(next, false));
  };
  const end = (event: PointerEvent<HTMLDivElement>) => {
    const start = drag.current;
    if (!start || start.pointer !== event.pointerId) return;
    drag.current = null;
    document.documentElement.removeAttribute("data-panels-resizing");
    onWidth(clampDetailsWidth(start.width + (start.x - event.clientX)), true);
  };
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const next = widthAfterKey(width, event.key, event.shiftKey);
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
      aria-valuemax={DETAILS_WIDTH.max}
      aria-valuenow={width}
      aria-valuetext={t("detailsWidthValue", { n: width })}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={end}
      onPointerCancel={end}
      onKeyDown={onKeyDown}
      className="sg-resize-handle group z-30 -ms-1.5 hidden w-3 cursor-col-resize touch-none justify-self-start outline-none lg:col-start-3 lg:row-start-1 lg:flex lg:justify-center"
    >
      <span
        aria-hidden="true"
        className="h-full w-px bg-transparent transition-fast group-hover:w-0.5 group-hover:bg-line-strong group-focus-visible:w-0.5 group-focus-visible:bg-focus group-active:bg-accent"
      />
    </div>
  );
}

/**
 * The page layout: the page column, the canvas and the details panel, three
 * columns from the lg breakpoint and one stack below it. Owns the reader's
 * column choices (panel-prefs.ts); the grid itself lives in globals.css
 * ("Workspace"), so the stored widths apply before hydration.
 */
export function Workspace({ canvas, children }: { canvas: ReactNode; children: ReactNode }) {
  const t = useDict("panels");
  const desktop = useDesktop();
  const [pageOpen, setPageOpen] = useColumnOpen(PANEL_STORAGE.page, PANEL_ATTR.page);
  const [detailsOpen, setDetailsOpen] = useColumnOpen(PANEL_STORAGE.details, PANEL_ATTR.details);
  const [width, setWidthState] = useState<number>(DETAILS_WIDTH.initial);

  useEffect(() => {
    setWidthState(parseDetailsWidth(read(PANEL_STORAGE.detailsWidth)));
  }, []);

  const setWidth = useCallback((next: number, commit: boolean) => {
    setWidthState(next);
    document.documentElement.style.setProperty(DETAILS_WIDTH_VAR, `${next}px`);
    if (commit) store(PANEL_STORAGE.detailsWidth, String(next));
  }, []);

  const { current } = useSelection();
  const state = useMemo(() => ({ desktop, pageOpen, detailsOpen }), [desktop, pageOpen, detailsOpen]);

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
        />
        <EdgeToggle
          side="end"
          open={detailsOpen}
          onToggle={() => setDetailsOpen(!detailsOpen)}
          controls={DETAILS_ID}
          label={detailsOpen ? t("detailsHide") : t("detailsShow")}
        />
        <div
          id={PAGE_COLUMN_ID}
          className="sg-page-col relative flex min-h-0 min-w-0 flex-col lg:col-start-1 lg:row-start-1 lg:overflow-y-auto lg:overflow-x-hidden"
        >
          <div className="sg-page-inner flex min-h-full flex-col">{children}</div>
        </div>
        <aside
          id={DETAILS_ID}
          aria-label={t("detailsLabel")}
          className="sg-details-col relative hidden min-h-0 min-w-0 overflow-hidden border-s border-line bg-surface lg:col-start-3 lg:row-start-1 lg:flex"
        >
          <div className="sg-details-inner flex min-h-0 flex-col">
            {desktop ? <DetailsPanel /> : null}
          </div>
        </aside>
        {detailsOpen ? <ResizeHandle width={width} onWidth={setWidth} /> : null}
      </div>
      {desktop || current === null ? null : <DetailsSheet />}
    </PanelStateContext.Provider>
  );
}
