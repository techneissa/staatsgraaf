/**
 * Whether the graph band is open below the lg breakpoint on routes other than
 * the home page, where it is collapsed to one toolbar row by default. The
 * choice lives in sessionStorage (it lasts for the visit) and is mirrored on
 * <html> before first paint, so a reader who opened the graph does not see it
 * shut and open again on the next page. The rules that read the attribute are
 * in globals.css ("Graph band"). Pure module: the head script and the client
 * share it.
 */

export const CANVAS_OPEN_KEY = "staatsgraaf.canvas.open";
export const CANVAS_OPEN_ATTR = "data-canvas-open";

export const CANVAS_INIT_SCRIPT = `(function(){try{if(sessionStorage.getItem(${JSON.stringify(
  CANVAS_OPEN_KEY,
)})==="1")document.documentElement.setAttribute(${JSON.stringify(CANVAS_OPEN_ATTR)},"")}catch(e){}})();`;

export function readCanvasOpen(): boolean {
  try {
    return window.sessionStorage.getItem(CANVAS_OPEN_KEY) === "1";
  } catch {
    return false;
  }
}

export function writeCanvasOpen(open: boolean) {
  const root = document.documentElement;
  if (open) root.setAttribute(CANVAS_OPEN_ATTR, "");
  else root.removeAttribute(CANVAS_OPEN_ATTR);
  try {
    window.sessionStorage.setItem(CANVAS_OPEN_KEY, open ? "1" : "0");
  } catch {
    // Remembering is a convenience only.
  }
}
