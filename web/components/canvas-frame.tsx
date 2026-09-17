import { CanvasControls } from "./canvas-controls";

export function CanvasFrame() {
  return (
    <aside
      aria-labelledby="grafiek-titel"
      className="flex min-h-72 flex-col border-t border-line bg-surface-inset lg:min-h-0 lg:border-s lg:border-t-0"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-2.5">
        <h2
          id="grafiek-titel"
          className="text-xs font-medium uppercase tracking-wider text-ink-muted"
        >
          Grafiek
        </h2>
        <CanvasControls />
      </div>
      <div data-graph-mount className="flex flex-1 items-center justify-center p-6">
        <div className="max-w-sm text-center">
          <p className="text-sm text-ink-muted">De grafiek is nog niet beschikbaar.</p>
          <p className="mt-2 text-xs text-ink-faint">
            Alle gegevens op deze pagina zijn ook zonder de grafiek te lezen, met een bron per
            gegeven.
          </p>
        </div>
      </div>
    </aside>
  );
}
