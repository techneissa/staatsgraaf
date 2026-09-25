"use client";

import { useId } from "react";
import { useDict } from "@/components/i18n/use-t";
import { useSelection } from "@/components/selection/selection-provider";
import { DefaultBody } from "./panel-bodies";
import { PanelHeader } from "./panel-header";
import { SelectionBody, selectionKey } from "./selection-body";
import { useGraphLayout, usePanelIndex } from "./use-panel-data";
import { useSelectionView } from "./use-selection-view";

/**
 * The details panel beside the canvas: what the current pick is, where it
 * sits and what it connects to, every item a pick of its own. With nothing
 * picked it lists the people most in the news, the largest sectors and the
 * latest changes, so the panel is never an empty box.
 */
export function DetailsPanel() {
  const { current } = useSelection();
  const view = useSelectionView(current);
  const headingId = useId();
  const t = useDict("panels");

  if (current === null) return <DefaultPanel />;

  return (
    <section aria-labelledby={headingId} className="flex min-h-0 flex-1 flex-col">
      <div className="border-b border-line px-4 pb-3 pt-2">
        <PanelHeader meta={view.meta} size="sm" headingId={headingId} />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-[max(1.5rem,var(--safe-bottom))] pt-4">
        <div key={selectionKey(current)} className="motion-swap">
          <SelectionBody selection={current} view={view} variant="side" />
        </div>
        <span className="sr-only" aria-live="polite">
          {view.meta ? `${t("detailsLabel")}: ${view.meta.name}` : ""}
        </span>
      </div>
    </section>
  );
}

function DefaultPanel() {
  const index = usePanelIndex();
  const graph = useGraphLayout();
  const t = useDict("panels");
  return (
    <section aria-label={t("detailsLabel")} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-6 pt-4">
      <DefaultBody index={index.value} layout={graph.value} />
    </section>
  );
}
