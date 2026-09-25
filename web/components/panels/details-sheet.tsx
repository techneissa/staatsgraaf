"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useDict } from "@/components/i18n/use-t";
import { useSelection } from "@/components/selection/selection-provider";
import { SheetHandle } from "@/components/peek/sheet-handle";
import { useBottomSheet } from "@/components/peek/use-bottom-sheet";
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
 * so the drawing stays visible. The handle or the header drags it up to at
 * most 90 % of the viewport, down to fold, and further down to clear the
 * pick (use-bottom-sheet.ts).
 */
export function DetailsSheet() {
  const { current } = useSelection();
  const full = useCanvasFullScreen();
  if (!full || current === null) return null;
  return <DetailsSheetBody key={selectionKey(current)} />;
}

function DetailsSheetBody() {
  const { current, clear } = useSelection();
  const view = useSelectionView(current);
  const bodyId = useId();
  const t = useDict("panels");
  const panelRef = useRef<HTMLElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const sheet = useBottomSheet({
    panelRef,
    scrollerRef,
    innerRef,
    detents: ({ chrome, natural, viewport }) => ({ peek: chrome, expanded: Math.min(natural, viewport * 0.9) }),
    onDismiss: clear,
  });
  const open = sheet.detent === "expanded";

  if (current === null) return null;

  return (
    <section
      ref={panelRef}
      aria-label={t("detailsLabel")}
      onKeyDown={(event) => {
        if (event.key !== "Escape") return;
        event.stopPropagation();
        clear();
      }}
      className="motion-sheet fixed inset-x-0 bottom-0 z-50 flex max-h-[90dvh] flex-col overflow-hidden rounded-t-lg border-t border-line bg-surface shadow-lg lg:hidden"
      style={sheet.style}
    >
      <div {...sheet.dragProps} className="shrink-0 select-none px-[max(1rem,var(--safe-left))] pb-2">
        <SheetHandle
          expanded={open}
          onToggle={sheet.toggle}
          onKeyDown={sheet.onHandleKeyDown}
          controls={bodyId}
        />
        <PanelHeader meta={view.meta} size="sm" />
      </div>
      <div
        ref={scrollerRef}
        id={bodyId}
        inert={!open && !sheet.dragging}
        className={`min-h-0 flex-1 overscroll-contain border-t border-line px-[max(1rem,var(--safe-left))] pb-[max(1.5rem,var(--safe-bottom))] pt-4 ${
          open ? "overflow-y-auto" : "overflow-hidden"
        }`}
      >
        <div ref={innerRef} className="motion-swap flow-root">
          <SelectionBody selection={current} view={view} variant="side" />
        </div>
      </div>
    </section>
  );
}
