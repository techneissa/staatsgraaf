/**
 * The canvas's state in the address bar: which canvas (`view`), which layers
 * the legend leaves on (`layer`), the "as of" date (`date`) and what is picked
 * (`sel`). Pure and string-only so it can be tested without a browser; the
 * client component that reads and writes the URL is
 * components/selection/canvas-url-sync.tsx.
 *
 * Every value is validated on the way in: an unknown view, a layer that does
 * not exist, a date that is not a calendar day or lies outside 1945 up to
 * today, or an id of the wrong shape is ignored, never trusted.
 */
import type { Selection } from "./selection";

export type CanvasViewName = "graph" | "power";

export const URL_PARAMS = { view: "view", layer: "layer", date: "date", sel: "sel" } as const;

export const EARLIEST_AS_OF = "1945-01-01";

export type CanvasUrlState = {
  view: CanvasViewName;
  /** Layers the reader has left on; null means all of them. */
  shownLayers: readonly string[] | null;
  asOf: string | null;
  sel: Selection | null;
};

export type ParsedCanvasUrl = {
  view?: CanvasViewName;
  shownLayers?: string[];
  asOf?: string;
  sel?: Selection;
};

const ID_SHAPE = /^[a-z][a-z-]*:[\p{L}\p{N}:._-]{1,190}$/u;
const NAME_SHAPE = /^[a-z0-9-]{1,80}$/;

/** A real calendar day as YYYY-MM-DD. */
export function isCalendarDay(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

/** A date the "as of" control accepts: a real day from 1945 up to `today`. */
export function validAsOf(value: string | null | undefined, today: string): value is string {
  return typeof value === "string" && isCalendarDay(value) && value >= EARLIEST_AS_OF && value <= today;
}

/** The URL form of a selection, or null for one that has no stable name. */
export function serializeSelection(selection: Selection | null): string | null {
  if (selection === null) return null;
  switch (selection.kind) {
    case "org":
    case "person":
    case "cluster":
    case "news":
    case "topic":
      return selection.id;
    case "sector":
      return `sector:${selection.id}`;
    case "fractie":
      return `fractie:${selection.chamberId}#${selection.index}`;
  }
}

/** The selection a URL value names, or null when it is not one this module wrote. */
export function parseSelection(value: string | null | undefined): Selection | null {
  if (typeof value !== "string" || value.length === 0 || value.length > 200) return null;
  if (value.startsWith("fractie:")) {
    const match = /^fractie:(.+)#(\d{1,3})$/.exec(value);
    if (!match || !ID_SHAPE.test(match[1])) return null;
    return { kind: "fractie", chamberId: match[1], index: Number(match[2]), surface: "graph" };
  }
  if (value.startsWith("sector:")) {
    const id = value.slice("sector:".length);
    return NAME_SHAPE.test(id) ? { kind: "sector", id, surface: "graph" } : null;
  }
  if (!ID_SHAPE.test(value)) return null;
  const prefix = value.slice(0, value.indexOf(":"));
  switch (prefix) {
    case "org":
      return { kind: "org", id: value, surface: "graph" };
    case "person":
      return { kind: "person", id: value, surface: "power" };
    case "cluster":
      return { kind: "cluster", id: value, surface: "graph" };
    case "news":
      return { kind: "news", id: value, surface: "power" };
    case "topic":
      return { kind: "topic", id: value, surface: "power" };
    default:
      return null;
  }
}

/**
 * What a query string says about the canvas. `knownLayers` are the layers that
 * exist (the legend's branches); `today` bounds the date.
 */
export function parseCanvasUrl(search: string, knownLayers: readonly string[], today: string): ParsedCanvasUrl {
  const params = new URLSearchParams(search);
  const result: ParsedCanvasUrl = {};
  const view = params.get(URL_PARAMS.view);
  if (view === "graph" || view === "power") result.view = view;
  const layerValue = params.get(URL_PARAMS.layer);
  if (layerValue !== null) {
    const known = new Set(knownLayers);
    const shown = [...new Set(layerValue.split(",").filter((layer) => known.has(layer)))];
    // Every layer off is not a view; an unknown-only list is a typo. Both are ignored.
    if (shown.length > 0) result.shownLayers = shown;
  }
  const date = params.get(URL_PARAMS.date);
  if (validAsOf(date, today)) result.asOf = date;
  const sel = parseSelection(params.get(URL_PARAMS.sel));
  if (sel) result.sel = sel;
  return result;
}

/**
 * The query string for a state, keeping every parameter that is not the
 * canvas's own. Defaults are left out so the plain page keeps its plain URL.
 */
export function applyCanvasState(search: string, state: CanvasUrlState, knownLayers: readonly string[]): string {
  const params = new URLSearchParams(search);
  for (const name of Object.values(URL_PARAMS)) params.delete(name);
  if (state.view !== "graph") params.set(URL_PARAMS.view, state.view);
  if (state.shownLayers !== null && state.shownLayers.length < knownLayers.length) {
    params.set(URL_PARAMS.layer, knownLayers.filter((layer) => state.shownLayers?.includes(layer)).join(","));
  }
  if (state.asOf !== null) params.set(URL_PARAMS.date, state.asOf);
  const sel = serializeSelection(state.sel);
  if (sel !== null) params.set(URL_PARAMS.sel, sel);
  return queryOf(params);
}

function queryOf(params: URLSearchParams): string {
  const text = params.toString().replace(/%3A/gi, ":").replace(/%2C/gi, ",").replace(/%23/g, "#");
  return text === "" ? "" : `?${text}`;
}

/** The state that goes in `shownLayers` for a set of hidden layers. */
export function shownLayersFor(knownLayers: readonly string[], hidden: ReadonlySet<string>): readonly string[] | null {
  return hidden.size === 0 ? null : knownLayers.filter((layer) => !hidden.has(layer));
}

/** A query string with some of the canvas's own parameters set (a string) or removed (null); others stay. */
export function withParams(search: string, patch: Partial<Record<keyof typeof URL_PARAMS, string | null>>): string {
  const params = new URLSearchParams(search);
  for (const [name, value] of Object.entries(patch) as [keyof typeof URL_PARAMS, string | null | undefined][]) {
    if (value === null || value === undefined) params.delete(URL_PARAMS[name]);
    else params.set(URL_PARAMS[name], value);
  }
  return queryOf(params);
}
