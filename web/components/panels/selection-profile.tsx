"use client";

import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { useDict } from "@/components/i18n/use-t";
import { useSelection } from "@/components/selection/selection-provider";
import { PanelHeader, SelectionMark } from "./panel-header";
import { SelectionBody, selectionKey } from "./selection-body";
import { useSelectionView } from "./use-selection-view";
import { PAGE_COLUMN_ID, usePanelState } from "./workspace";

/** How far down the page counts as "mid-page": past this the column does not jump to a new pick. */
const NEAR_TOP_PX = 360;

function smooth(): ScrollBehavior {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
}

/**
 * The profile of the current pick at the top of the page column: a fuller
 * account than the side panel holds, above the page itself. It appears when
 * something is picked on the graph, the power map or in a panel, and brings
 * itself into view unless the reader is mid-page; then a small chip at the
 * top of the column offers the way up instead. Focus never moves on its own.
 * On the entity's own page the profile stays away, since the page says it all.
 */
export function SelectionProfile() {
  const { current } = useSelection();
  const view = useSelectionView(current);
  const { desktop, detailsOpen } = usePanelState();
  const pathname = usePathname();
  const headingId = useId();
  const t = useDict("panels");
  const ref = useRef<HTMLElement | null>(null);
  const [outOfView, setOutOfView] = useState(false);
  const key = selectionKey(current);

  const onOwnPage = Boolean(view.meta?.href && pathname && view.meta.href === pathname);
  // A group of dots or a sector has no page of its own: the details panel says all
  // there is to say, and a copy of it above the page would push the page down.
  const panelOnly = current?.kind === "cluster" || current?.kind === "sector";
  const shown = current !== null && !onOwnPage && !panelOnly;
  // With the details column open beside the canvas the header is not repeated here.
  const sideBySide = desktop && detailsOpen;

  // A new pick: bring the profile up when the reader is near the top of the column.
  useEffect(() => {
    if (!shown) return;
    const column = document.getElementById(PAGE_COLUMN_ID);
    const element = ref.current;
    if (!element) return;
    if (desktop && column) {
      if (column.scrollTop <= NEAR_TOP_PX) column.scrollTo({ top: 0, behavior: smooth() });
    }
    // On a phone the profile sits right under the canvas band; the reader is already there.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, shown]);

  // Out of view: offer the way up.
  useEffect(() => {
    const element = ref.current;
    if (!shown || !element) {
      setOutOfView(false);
      return;
    }
    const observer = new IntersectionObserver(([entry]) => {
      setOutOfView(!entry.isIntersecting && entry.boundingClientRect.top < 0);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [shown, key]);

  if (!shown || current === null) return null;

  return (
    <>
      {outOfView && view.meta ? (
        <div className="pointer-events-none sticky top-2 z-20 -mb-10 flex h-10 justify-center">
          <button
            type="button"
            onClick={() => ref.current?.scrollIntoView({ behavior: smooth(), block: "start" })}
            className="motion-pop tap-row pointer-events-auto inline-flex max-w-[80%] items-center gap-2 rounded-pill border border-line bg-surface py-1 pe-3 ps-1 text-xs font-medium text-ink shadow-lg hover:border-line-strong"
          >
            <SelectionMark meta={view.meta} size={24} />
            <span className="min-w-0 truncate">{t("jumpToSelection", { name: view.meta.name })}</span>
            <svg aria-hidden="true" viewBox="0 0 12 12" width="10" height="10" className="shrink-0 text-ink-muted">
              <path d="M2.5 7.5 6 4l3.5 3.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      ) : null}
      <section
        ref={ref}
        aria-labelledby={headingId}
        className="@container mb-6 scroll-mt-4 border-b border-line pb-6"
      >
        <PanelHeader meta={view.meta} size="md" headingId={headingId} compact={sideBySide} />
        <div key={key} className="motion-swap mt-5">
          <SelectionBody selection={current} view={view} variant="page" withStructure={!desktop || !detailsOpen} />
        </div>
      </section>
    </>
  );
}
