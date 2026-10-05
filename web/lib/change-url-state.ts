/**
 * URL state of /wijzigingen/: `?window=7|30|90&kind=...&day=YYYY-MM-DD&view=people`. Each
 * part is checked on its own, so a bad part is ignored and the rest still
 * applies. Kept free of React so a test can run it.
 */

export type ChangeFilterValue = "all" | "appointment" | "departure" | "vacancy" | "acting";

export type ChangeViewValue = "chronological" | "people";

export type ChangeUrlState = { window: number; kind: ChangeFilterValue; day: string | null; view: ChangeViewValue };

export const CHANGE_FILTER_VALUES: readonly ChangeFilterValue[] = ["all", "appointment", "departure", "vacancy", "acting"];

const DEFAULT_WINDOW = 30;
const DAY_MS = 86_400_000;

function isIsoDay(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const time = Date.parse(`${value}T00:00:00Z`);
  return !Number.isNaN(time) && new Date(time).toISOString().slice(0, 10) === value;
}

export function parseChangeUrlState(search: string, validDays: readonly number[]): ChangeUrlState {
  const params = new URLSearchParams(search);
  const requested = Number(params.get("window"));
  const fallback = validDays.includes(DEFAULT_WINDOW) ? DEFAULT_WINDOW : (validDays[0] ?? DEFAULT_WINDOW);
  const kind = params.get("kind");
  const day = params.get("day");
  return {
    window: validDays.includes(requested) ? requested : fallback,
    kind: CHANGE_FILTER_VALUES.find((value) => value === kind) ?? "all",
    day: day !== null && isIsoDay(day) ? day : null,
    view: params.get("view") === "people" ? "people" : "chronological",
  };
}

/** The day when it falls in the last `days` days up to `reference`, otherwise null. */
export function dayInWindow(day: string | null, days: number, reference: string): string | null {
  if (day === null || !isIsoDay(day)) return null;
  const offset = Math.round((Date.parse(`${reference}T00:00:00Z`) - Date.parse(`${day}T00:00:00Z`)) / DAY_MS);
  return offset >= 0 && offset < days ? day : null;
}

/** The query string for a state, leaving out whatever equals the default. */
export function serializeChangeUrlState(state: ChangeUrlState): string {
  const params = new URLSearchParams();
  if (state.window !== DEFAULT_WINDOW) params.set("window", String(state.window));
  if (state.kind !== "all") params.set("kind", state.kind);
  if (state.day !== null) params.set("day", state.day);
  if (state.view === "people") params.set("view", "people");
  const query = params.toString();
  return query === "" ? "" : `?${query}`;
}
