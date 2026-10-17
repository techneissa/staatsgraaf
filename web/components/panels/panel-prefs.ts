/**
 * The reader's layout choices for the page column, the canvas and the
 * details panel: which of them are open, and how wide the details panel is.
 *
 * From tablet width the page is first: the canvas starts closed so the
 * editorial column can use the full width (ADR 0018 amendment 18-10-2026).
 * A stored "open" restores the graph. The choices live in localStorage and
 * are mirrored on <html> as data attributes and a CSS variable, so the
 * columns render at the right size before React hydrates (PANELS_INIT_SCRIPT
 * runs in the document head) and the grid in globals.css ("Workspace") is
 * the only place that turns them into widths. Pure module: the script, the
 * client and the tests share it.
 */

export const PANEL_STORAGE = {
  page: "staatsgraaf.panels.page",
  details: "staatsgraaf.panels.details",
  detailsWidth: "staatsgraaf.panels.details-width",
  canvas: "staatsgraaf.panels.canvas",
} as const;

/** The attributes on <html> the grid reads. "closed" or absent. */
export const PANEL_ATTR = {
  page: "data-page-panel",
  details: "data-details-panel",
  canvas: "data-canvas-panel",
} as const;

/** The CSS variable the grid reads for the details panel width. */
export const DETAILS_WIDTH_VAR = "--details-w";

/** Matches `--page-w` min in globals.css: the page column never shrinks below this. */
export const PAGE_COL_MIN_PX = 352;

/** Space kept for the canvas when it is open, so dragging details cannot crush it. */
export const CANVAS_COL_MIN_PX = 288;

/**
 * Details panel width in CSS pixels. The default is 20rem. The reader can drag
 * it as wide as the window allows after the page (and canvas, when open) keep
 * their minima. `max` is only a ceiling for a huge stored value.
 */
export const DETAILS_WIDTH = { min: 256, max: 2400, initial: 320, step: 16 } as const;

/** How wide the details column may go in this window. */
export function availableDetailsMax(viewportWidth: number, canvasOpen: boolean): number {
  const reserved = PAGE_COL_MIN_PX + (canvasOpen ? CANVAS_COL_MIN_PX : 0);
  return Math.max(DETAILS_WIDTH.min, Math.min(DETAILS_WIDTH.max, Math.floor(viewportWidth - reserved)));
}

export function clampDetailsWidth(value: number, max: number = DETAILS_WIDTH.max): number {
  if (!Number.isFinite(value)) return DETAILS_WIDTH.initial;
  const ceiling = Math.max(DETAILS_WIDTH.min, max);
  return Math.round(Math.min(ceiling, Math.max(DETAILS_WIDTH.min, value)));
}

/** A stored width, or the default when nothing valid is stored. */
export function parseDetailsWidth(raw: string | null | undefined): number {
  if (raw === null || raw === undefined || raw.trim() === "") return DETAILS_WIDTH.initial;
  const value = Number.parseInt(raw, 10);
  return Number.isFinite(value) ? clampDetailsWidth(value) : DETAILS_WIDTH.initial;
}

/** A stored open state; anything but "closed" is open, so a fresh visit shows both side columns. */
export function parseOpen(raw: string | null | undefined): boolean {
  return raw !== "closed";
}

/**
 * The canvas starts closed from tablet width so the page can fill the screen.
 * Only a stored "open" brings the graph back.
 */
export function parseCanvasOpen(raw: string | null | undefined): boolean {
  return raw === "open";
}

/**
 * The width after a key press on the resize handle, or null for a key the
 * handle does not use. The handle sits on the panel's left edge, so the left
 * arrow widens the panel and the right arrow narrows it; Home and End jump to
 * the limits. Shift makes a larger step. `max` is the live ceiling for this
 * window (End and Shift-left stop there).
 */
export function widthAfterKey(width: number, key: string, shift = false, max: number = DETAILS_WIDTH.max): number | null {
  const step = shift ? DETAILS_WIDTH.step * 4 : DETAILS_WIDTH.step;
  switch (key) {
    case "ArrowLeft":
      return clampDetailsWidth(width + step, max);
    case "ArrowRight":
      return clampDetailsWidth(width - step, max);
    case "Home":
      return DETAILS_WIDTH.min;
    case "End":
      return clampDetailsWidth(max, max);
    default:
      return null;
  }
}

/**
 * Runs in the document head before first paint (app/layout.tsx), like the
 * theme script: restores the stored choices onto <html> so a reader who
 * closed a column never sees it open and shut again on load.
 */
export const PANELS_INIT_SCRIPT = `(function(){try{var d=document.documentElement,s=localStorage;if(s.getItem(${JSON.stringify(
  PANEL_STORAGE.page,
)})==="closed")d.setAttribute(${JSON.stringify(PANEL_ATTR.page)},"closed");if(s.getItem(${JSON.stringify(
  PANEL_STORAGE.details,
)})==="closed")d.setAttribute(${JSON.stringify(PANEL_ATTR.details)},"closed");if(s.getItem(${JSON.stringify(
  PANEL_STORAGE.canvas,
)})!=="open")d.setAttribute(${JSON.stringify(PANEL_ATTR.canvas)},"closed");var w=parseInt(s.getItem(${JSON.stringify(
  PANEL_STORAGE.detailsWidth,
)})||"",10);if(w>=${DETAILS_WIDTH.min}&&w<=${DETAILS_WIDTH.max})d.style.setProperty(${JSON.stringify(DETAILS_WIDTH_VAR)},w+"px")}catch(e){try{document.documentElement.setAttribute(${JSON.stringify(PANEL_ATTR.canvas)},"closed")}catch(e2){}}})();`;
