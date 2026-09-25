"use client";

import { useEffect, useId, useState } from "react";
import { useDict } from "@/components/i18n/use-t";
import { useSelection } from "@/components/selection/selection-provider";
import { PanelHeader } from "./panel-header";
import { SelectionBody, selectionKey } from "./selection-body";
import { useSelectionView } from "./use-selection-view";

/**
 * True while the canvas fills the screen on a phone or tablet. The canvas
 * frame (components/canvas-frame.tsx) switches to a fixed, full-screen box
 * then; watching its position keeps this file free of the frame's state.
 */
function useCanvasFullScreen(): boolean {
  const [full, setFull] = useState(false);
  useEffect(() => {
    const frame = document.querySelector<HTMLElement>("[data-canvas-frame]");
    if (!frame) return;
    const check = () => setFull(getComputedStyle(frame).position === "fixed");
    check();
    const observer = new MutationObserver(check);
    observer.observe(frame, { attributes: true, attributeFilter: ["class", "style", "data-expanded"] });
    window.addEventListener("resize", check);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", check);
    };
  }, []);
  return full;
}

/**
 * Below the lg breakpoint the page column already describes the pick right
 * under the canvas. Only when the canvas fills the screen does the pick need
 * its own surface: this sheet at the bottom, folded to its header by default
 * so the drawing stays visible, and opened to half the screen on request.
 */
export function DetailsSheet() {
  const { current } = useSelection();
  const full = useCanvasFullScreen();
  const view = useSelectionView(full ? current : null);
  const [open, setOpen] = useState(false);
  const bodyId = useId();
  const t = useDict("panels");

  useEffect(() => {
    setOpen(false);
  }, [current]);

  if (!full || current === null) return null;

  return (
    <section
      aria-label={t("detailsLabel")}
      className="motion-sheet fixed inset-x-0 bottom-0 z-50 flex max-h-[60dvh] flex-col rounded-t-lg border-t border-line bg-surface shadow-lg lg:hidden"
    >
      <div className="px-[max(1rem,var(--safe-left))] pb-2 pt-1.5">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={bodyId}
          aria-label={open ? t("showFewer") : view.meta?.name ?? t("detailsLabel")}
          onClick={() => setOpen((value) => !value)}
          className="mx-auto flex h-6 w-full items-center justify-center"
        >
          <span aria-hidden="true" className="h-1 w-10 rounded-pill bg-line-strong" />
        </button>
        <PanelHeader meta={view.meta} size="sm" />
      </div>
      <div
        id={bodyId}
        hidden={!open}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain border-t border-line px-[max(1rem,var(--safe-left))] pb-[max(1.5rem,var(--safe-bottom))] pt-4"
      >
        <div key={selectionKey(current)} className="motion-swap">
          <SelectionBody selection={current} view={view} variant="side" />
        </div>
      </div>
    </section>
  );
}
