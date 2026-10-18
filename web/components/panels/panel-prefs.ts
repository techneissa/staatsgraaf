/**
 * The reader's layout choices for the two side columns: whether the page
 * column and the details panel are open, and how wide the details panel is.
 *
 * The choices live in localStorage and are mirrored on <html> as data
 * attributes and a CSS variable, so the columns render at the right size
 * before React hydrates (PANELS_INIT_SCRIPT runs in the document head) and
 * the grid in globals.css ("Workspace") is the only place that turns them
 * into widths. Pure module: the script, the client and the tests share it.
 */

export const PANEL_STORAGE = {
  page: "staatsgraaf.panels.page",
  details: "staatsgraaf.panels.details",
  detailsWidth: "staatsgraaf.panels.details-width",
} as const;

/** The attributes on <html> the grid reads. "closed" or absent. */
export const PANEL_ATTR = {
  page: "data-page-panel",
  details: "data-details-panel",
} as const;

/** The CSS variable the grid reads for the details panel width. */
export const DETAILS_WIDTH_VAR = "--details-w";

/** Details panel width in CSS pixels: about 16rem to 30rem, 20rem by default. */
export const DETAILS_WIDTH = { min: 256, max: 480, initial: 320, step: 16 } as const;

export function clampDetailsWidth(value: number): number {
  if (!Number.isFinite(value)) return DETAILS_WIDTH.initial;
  return Math.round(Math.min(DETAILS_WIDTH.max, Math.max(DETAILS_WIDTH.min, value)));
}

/** A stored width, or the default when nothing valid is stored. */
export function parseDetailsWidth(raw: string | null | undefined): number {
  if (raw === null || raw === undefined || raw.trim() === "") return DETAILS_WIDTH.initial;
  const value = Number.parseInt(raw, 10);
  return Number.isFinite(value) ? clampDetailsWidth(value) : DETAILS_WIDTH.initial;
}

/** A stored open state; anything but "closed" is open, so a fresh visit shows both columns. */
export function parseOpen(raw: string | null | undefined): boolean {
  return raw !== "closed";
}

/**
 * The width after a key press on the resize handle, or null for a key the
 * handle does not use. The handle sits on the panel's left edge, so the left
 * arrow widens the panel and the right arrow narrows it; Home and End jump to
 * the limits. Shift makes a larger step.
 */
export function widthAfterKey(width: number, key: string, shift = false): number | null {
  const step = shift ? DETAILS_WIDTH.step * 4 : DETAILS_WIDTH.step;
  switch (key) {
    case "ArrowLeft":
      return clampDetailsWidth(width + step);
    case "ArrowRight":
      return clampDetailsWidth(width - step);
    case "Home":
      return DETAILS_WIDTH.min;
    case "End":
      return DETAILS_WIDTH.max;
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
)})==="closed")d.setAttribute(${JSON.stringify(PANEL_ATTR.details)},"closed");var w=parseInt(s.getItem(${JSON.stringify(
  PANEL_STORAGE.detailsWidth,
)})||"",10);if(w>=${DETAILS_WIDTH.min}&&w<=${DETAILS_WIDTH.max})d.style.setProperty(${JSON.stringify(DETAILS_WIDTH_VAR)},w+"px")}catch(e){}})();`;
