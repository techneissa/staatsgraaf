/**
 * News cards in the page column: one column on a phone, two from about
 * 40 rem of the column, three from 64 rem. The page column is a container
 * (`@container` on `main`), so this follows the column, not the window: a
 * 32 rem column beside the graph stays one card wide; a full-width iPad or
 * desktop page gets two or three.
 */
export const NEWS_GRID_CLASS =
  "grid list-none grid-cols-1 gap-2.5 p-0 @[40rem]:grid-cols-2 @[64rem]:grid-cols-3";
