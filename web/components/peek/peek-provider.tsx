"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, useTransition } from "react";
import type { CSSProperties, ReactNode, RefObject } from "react";
import type { IconNode } from "lucide";
import { Armchair, Network, Users } from "lucide";
import { Avatar } from "@/components/avatar";
import { LocalizedDescription } from "@/components/entity/localized-description";
import { LucideIcon } from "@/components/icons/lucide-icon";
import { useLocale } from "@/components/i18n/language-provider";
import { useT } from "@/components/i18n/use-t";
import { KindGlyph } from "@/components/kind-glyph";
import { PeekLink } from "@/components/peek/peek-link";
import { ShareButton } from "@/components/share-button";
import { prefersReducedMotion } from "@/lib/motion";
import { SheetHandle } from "./sheet-handle";
import { useBottomSheet } from "./use-bottom-sheet";
import { ORG_SUBTYPE_LABELS, ORG_SUBTYPE_LABELS_EN } from "@/lib/labels";
import { SourceIcon } from "@/components/source-icon";
import {
  normalizePeekRecord,
  peekKindFor,
  peekShardUrl,
  type PeekKind,
  type PeekRecord,
  type PeekRef,
  type PeekShard,
} from "@/lib/peek";
import { peekClickAction, peekOutsidePointerCloses, swallowNextClick } from "@/lib/peek-swap";

/**
 * The peek popover for inline entity links (docs/adr/0017).
 *
 * One delegated click listener handles every `a[data-peek]` on the page, so
 * server components render plain anchors and no client component per link.
 * A plain click or Enter opens the peek; cmd, ctrl, shift, alt or a middle
 * click falls through to the browser and opens the page, and without
 * JavaScript the anchor is an ordinary link. Data comes from the build-time
 * peek shards under /peek/, fetched same-origin and cached per shard.
 *
 * Phones get a bottom sheet with safe-area padding that the handle or the
 * header drags between a peek height and nearly full screen, or down to
 * close (use-bottom-sheet.ts); wider screens get a
 * popover anchored to the link that flips above it when there is no room
 * below. Escape, an outside click or the close button closes it. The page
 * behind is covered, so a dismiss click does not follow a link or open
 * another peek. Focus returns to the link that opened it.
 */

const shardCache = new Map<string, Promise<PeekShard>>();
/** Shards that have arrived, so a peek whose shard was warmed opens with its content in the first frame. */
const shardReady = new Map<string, PeekShard>();

export function loadPeekRecord(id: string): Promise<PeekRecord | null> {
  const url = peekShardUrl(id);
  let promise = shardCache.get(url);
  if (!promise) {
    promise = fetch(url).then((response) => {
      if (!response.ok) throw new Error(String(response.status));
      return response.json() as Promise<PeekShard>;
    });
    promise.then(
      (shard) => shardReady.set(url, shard),
      () => shardCache.delete(url),
    );
    shardCache.set(url, promise);
  }
  return promise.then((shard) => {
    const raw = shard.records[id];
    return raw ? normalizePeekRecord(raw) : null;
  });
}

/** The record when its shard is already here, else undefined. */
function cachedPeekRecord(id: string): PeekRecord | null | undefined {
  const shard = shardReady.get(peekShardUrl(id));
  if (!shard) return undefined;
  const raw = shard.records[id];
  return raw ? normalizePeekRecord(raw) : null;
}

/** Fetches the shard of a link ahead of its click; the result lands in the cache. */
function warmPeek(id: string | undefined) {
  if (id) loadPeekRecord(id).catch(() => {});
}

/** Shards a phone may warm by scrolling past links, per page: each is tens of KB. */
const VIEWPORT_WARM_BUDGET = 6;

type OpenState = {
  id: string;
  kind: PeekKind;
  href: string;
  label: string;
  anchor: HTMLAnchorElement;
};

/** Portrait phones, and landscape phones whose height is the short side. */
const SHEET_QUERY = "(max-width: 639px), ((pointer: coarse) and (max-height: 639px))";
const GAP = 8;
const MARGIN = 8;

/** Grows the tap box on a coarse pointer without stretching the row. `relative` keeps that box on the link: the sheet has a transform, so an uncontained absolute after fills the dialog and eats Share, Close and Open page. */
const PEEK_HIT =
  "relative pointer-coarse:after:absolute pointer-coarse:after:-inset-y-3 pointer-coarse:after:-inset-x-1 pointer-coarse:after:content-['']";

export function PeekProvider() {
  const [open, setOpen] = useState<OpenState | null>(null);
  const [record, setRecord] = useState<PeekRecord | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [sheet, setSheet] = useState(
    () => typeof window !== "undefined" && window.matchMedia(SHEET_QUERY).matches,
  );
  /** The peek that is animating out after a close; null once it has gone. */
  const [leaving, setLeaving] = useState<OpenState | null>(null);
  /** True while one open peek is replaced by another, so enter motion is skipped. */
  const [swap, setSwap] = useState(false);
  const openRef = useRef<OpenState | null>(null);
  openRef.current = open;
  const leavingRef = useRef<OpenState | null>(null);
  leavingRef.current = leaving;

  useLayoutEffect(() => {
    const media = matchMedia(SHEET_QUERY);
    const update = () => setSheet(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const target = event.target instanceof Element ? event.target : null;
      const anchor = target?.closest<HTMLAnchorElement>("a[data-peek]");
      if (!anchor) return;
      const id = anchor.dataset.peek;
      const kind = anchor.dataset.peekKind as PeekKind | undefined;
      const href = anchor.getAttribute("href");
      if (!id || !kind || !href) return;
      event.preventDefault();
      const current = openRef.current;
      const action = peekClickAction(current?.anchor, anchor);
      if (action === "close" && current) {
        setSwap(false);
        setLeaving(current);
        setOpen(null);
        return;
      }
      setSwap(action === "replace" || leavingRef.current != null);
      setLeaving(null);
      setOpen({ id, kind, href, label: anchor.textContent?.trim() ?? "", anchor });
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  // Warm the shard before the click: on hover, focus or a finger going down,
  // and on a touch screen also when a link scrolls into view, because a
  // finger gives no hover. Opening a peek then needs no request.
  useEffect(() => {
    const onIntent = (event: Event) => {
      const target = event.target instanceof Element ? event.target : null;
      warmPeek(target?.closest<HTMLAnchorElement>("a[data-peek]")?.dataset.peek);
    };
    document.addEventListener("pointerover", onIntent, true);
    document.addEventListener("pointerdown", onIntent, true);
    document.addEventListener("focusin", onIntent);

    let observer: IntersectionObserver | null = null;
    let mutations: MutationObserver | null = null;
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    if (matchMedia("(pointer: coarse)").matches && connection?.saveData !== true && typeof IntersectionObserver !== "undefined") {
      const warmed = new Map<string, Set<string>>();
      const idle = (task: () => void) => (typeof window.requestIdleCallback === "function" ? window.requestIdleCallback(task, { timeout: 1500 }) : window.setTimeout(task, 200));
      observer = new IntersectionObserver((entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          observer?.unobserve(entry.target);
          const id = (entry.target as HTMLElement).dataset.peek;
          if (!id) continue;
          const page = location.pathname;
          const urls = warmed.get(page) ?? new Set<string>();
          warmed.set(page, urls);
          const url = peekShardUrl(id);
          if (urls.has(url) || urls.size >= VIEWPORT_WARM_BUDGET) continue;
          urls.add(url);
          idle(() => warmPeek(id));
        }
      });
      const scan = (root: ParentNode) => {
        for (const anchor of root.querySelectorAll("a[data-peek]")) observer?.observe(anchor);
      };
      scan(document);
      mutations = new MutationObserver((records) => {
        for (const record of records) {
          for (const node of record.addedNodes) {
            if (!(node instanceof Element)) continue;
            if (node.matches("a[data-peek]")) observer?.observe(node);
            else scan(node);
          }
        }
      });
      mutations.observe(document.body, { childList: true, subtree: true });
    }

    return () => {
      document.removeEventListener("pointerover", onIntent, true);
      document.removeEventListener("pointerdown", onIntent, true);
      document.removeEventListener("focusin", onIntent);
      observer?.disconnect();
      mutations?.disconnect();
    };
  }, []);

  // A warmed shard fills the peek before the first paint, so it opens with
  // its content and no skeleton flash. A swap whose shard is not yet here
  // shows the skeleton in the same chrome, never the previous entity.
  useLayoutEffect(() => {
    if (!open) return;
    const hit = cachedPeekRecord(open.id);
    if (hit === undefined) {
      setRecord(null);
      setStatus("loading");
      return;
    }
    setRecord(hit);
    setStatus(hit ? "ready" : "error");
  }, [open]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    if (cachedPeekRecord(open.id) !== undefined) return;
    loadPeekRecord(open.id)
      .then((result) => {
        if (cancelled) return;
        setRecord(result);
        setStatus(result ? "ready" : "error");
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  const close = useCallback((returnFocus = true) => {
    const current = openRef.current;
    if (!current) return;
    if (returnFocus) current.anchor.focus({ preventScroll: true });
    // The dialog stays mounted, inert, for its exit animation.
    setSwap(false);
    setLeaving(current);
    setOpen(null);
  }, []);

  const clearLeaving = useCallback(() => setLeaving(null), []);

  // Opening the page of a peek is one step: the peek goes in the same commit
  // as the new page, so the page transition shows the new page rising in
  // while the sheet and its scrim fade with the rest of the screen. Closing
  // first played the sheet's exit, then the old page alone, then the swap.
  // In one transition with the router's push, React commits the close only
  // when the new page is ready.
  const router = useRouter();
  const [opening, startOpening] = useTransition();
  // Fetch the page while the reader looks at the peek, so "Open page" has it ready.
  const openHref = open?.href;
  useEffect(() => {
    if (openHref) router.prefetch(openHref);
  }, [openHref, router]);
  const openPage = useCallback(
    (href: string) => {
      startOpening(() => {
        setSwap(false);
        setLeaving(null);
        setOpen(null);
        router.push(href);
      });
    },
    [router],
  );
  const shown = open ?? leaving;
  if (!shown) return null;
  const visible = visiblePeek(open ?? shown, record, status);
  return (
    <PeekDialog
      open={shown}
      record={visible.record}
      status={visible.status}
      sheet={sheet}
      closing={open === null}
      swap={swap && open !== null}
      onClose={close}
      onClosed={clearLeaving}
      onOpenPage={openPage}
      opening={opening}
    />
  );
}

/** The record for the open id, never the previous peek's while a swap loads. */
function visiblePeek(
  open: OpenState,
  record: PeekRecord | null,
  status: "loading" | "ready" | "error",
): { record: PeekRecord | null; status: "loading" | "ready" | "error" } {
  const cached = cachedPeekRecord(open.id);
  if (cached !== undefined) return { record: cached, status: cached ? "ready" : "error" };
  if (record?.id === open.id) return { record, status };
  return { record: null, status: "loading" };
}

function PeekDialog({
  open,
  record,
  status,
  sheet,
  closing,
  swap,
  onClose,
  onClosed,
  onOpenPage,
  opening,
}: {
  open: OpenState;
  record: PeekRecord | null;
  status: "loading" | "ready" | "error";
  sheet: boolean;
  /** Animating out: inert, and unmounted by `onClosed` when the exit ends. */
  closing: boolean;
  /** Replacing another peek: skip the enter pop and sheet slide. */
  swap: boolean;
  onClose: (returnFocus?: boolean) => void;
  onClosed: () => void;
  /** Go to a page: the peek closes together with the navigation. */
  onOpenPage: (href: string) => void;
  /** The page is on its way: the button says so until it replaces the peek. */
  opening: boolean;
}) {
  const t = useT("common");
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<CSSProperties>({ visibility: "hidden" });

  // Unmount when the exit animation ends; the timer covers reduced motion and
  // browsers that never fire animationend.
  useEffect(() => {
    if (!closing) return;
    const panel = panelRef.current;
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      onClosed();
    };
    const onEnd = (event: AnimationEvent) => {
      if (event.target === panel) finish();
    };
    panel?.addEventListener("animationend", onEnd);
    const timer = window.setTimeout(finish, prefersReducedMotion() ? 0 : 260);
    return () => {
      panel?.removeEventListener("animationend", onEnd);
      window.clearTimeout(timer);
    };
  }, [closing, onClosed]);

  // Anchor the popover to the link: below it, or above when there is no room.
  const place = useCallback(() => {
    const panel = panelRef.current;
    if (!panel || sheet) return;
    const rects = open.anchor.getClientRects();
    const rect = rects.length > 0 ? rects[0] : open.anchor.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) {
      onClose(false);
      return;
    }
    const width = panel.offsetWidth;
    const height = panel.offsetHeight;
    const viewportWidth = document.documentElement.clientWidth;
    const viewportHeight = window.innerHeight;
    // The popover follows its link while the page scrolls; once the link has
    // left the screen there is nothing to point at, so it closes instead of
    // hanging at the edge.
    if (rect.bottom < 0 || rect.top > viewportHeight || rect.right < 0 || rect.left > viewportWidth) {
      onClose(false);
      return;
    }
    const below = viewportHeight - rect.bottom - GAP - MARGIN;
    const above = rect.top - GAP - MARGIN;
    const top = below >= height || below >= above ? rect.bottom + GAP : Math.max(MARGIN, rect.top - GAP - height);
    const left = Math.min(Math.max(MARGIN, rect.left), viewportWidth - width - MARGIN);
    const room = top > rect.top ? viewportHeight - top - MARGIN : rect.top - GAP - MARGIN;
    // The popover grows out of the link: its origin is the edge that faces the
    // link, at the link's horizontal position.
    const originX = Math.min(Math.max(12, rect.left + Math.min(rect.width, 48) / 2 - left), width - 12);
    const originY = top > rect.top ? "0px" : "100%";
    const maxHeight = Math.max(200, room);
    setPosition({
      top,
      left,
      maxHeight,
      overflowY: height > maxHeight + 1 ? "auto" : "hidden",
      "--origin": `${originX.toFixed(0)}px ${originY}`,
    } as CSSProperties);
  }, [open.anchor, sheet, onClose]);

  useLayoutEffect(() => {
    place();
  }, [place, record, status]);

  useEffect(() => {
    if (sheet) return;
    let frame = 0;
    const onMove = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(place);
    };
    window.addEventListener("scroll", onMove, true);
    window.addEventListener("resize", onMove);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onMove, true);
      window.removeEventListener("resize", onMove);
    };
  }, [place, sheet]);

  // The page behind a phone sheet must not move: iOS otherwise rubber-bands
  // the document under the overlay while the sheet itself is scrolling.
  useEffect(() => {
    if (!sheet) return;
    const root = document.documentElement;
    const previous = root.style.overflow;
    root.style.overflow = "hidden";
    return () => {
      root.style.overflow = previous;
    };
  }, [sheet]);

  // Focus moves into the dialog on open; Tab stays inside it; Escape closes.
  useEffect(() => {
    const panel = panelRef.current;
    // After the first placement: a panel that is still visibility:hidden cannot take focus.
    const focusFrame = requestAnimationFrame(() => panel?.focus({ preventScroll: true }));
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose(true);
        return;
      }
      if (event.key !== "Tab" || !panel) return;
      const focusable = [...panel.querySelectorAll<HTMLElement>("a[href], button:not([disabled])")];
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && (document.activeElement === first || document.activeElement === panel)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    const onPointer = (event: PointerEvent) => {
      if (!peekOutsidePointerCloses(event.target, panel, open.anchor)) return;
      event.preventDefault();
      event.stopPropagation();
      swallowNextClick();
      onClose(true);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer, true);
    return () => {
      cancelAnimationFrame(focusFrame);
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer, true);
    };
  }, [onClose, open.anchor]);

  const go = onOpenPage;

  const head = <PeekBody open={open} record={record} status={status} titleId={titleId} onNavigate={go} part="head" />;
  const rest = <PeekBody open={open} record={record} status={status} titleId={titleId} onNavigate={go} part="rest" />;

  const actions = (
    <div className="flex items-center gap-2 border-t border-line pt-3">
      <a
        href={open.href}
        aria-busy={opening || undefined}
        onClick={(event) => {
          if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
          event.preventDefault();
          if (!opening) go(open.href);
        }}
        className="inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-sm bg-accent px-3 text-sm font-semibold text-accent-ink transition-fast hover:brightness-110 sm:min-h-9 pointer-coarse:sm:min-h-11"
      >
        {opening ? (
          <svg aria-hidden="true" viewBox="0 0 20 20" width="15" height="15" className="motion-safe:animate-spin">
            <circle cx="10" cy="10" r="6.5" fill="none" stroke="currentColor" strokeOpacity="0.3" strokeWidth="1.8" />
            <path d="M10 3.5a6.5 6.5 0 0 1 6.5 6.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        ) : (
          <svg aria-hidden="true" viewBox="0 0 20 20" width="15" height="15">
            <path
              d="M11.5 3.5h5v5M16.5 3.5 10 10M8.5 5H5a1.5 1.5 0 0 0-1.5 1.5v8.5A1.5 1.5 0 0 0 5 16.5h8.5A1.5 1.5 0 0 0 15 15v-3.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
        {t("peekOpenPage")}
      </a>
      <ShareButton href={open.href} title={record?.name ?? open.label} compact className="min-w-11 pointer-coarse:sm:min-h-11" />
    </div>
  );

  const closeButton = (
    <button
      type="button"
      onClick={() => onClose(true)}
      aria-label={t("peekClose")}
      title={t("peekClose")}
      className="-mr-1.5 -mt-1.5 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-sm text-ink-muted transition-fast hover:bg-surface-inset hover:text-ink sm:h-8 sm:w-8 pointer-coarse:sm:h-11 pointer-coarse:sm:w-11"
    >
      <svg aria-hidden="true" viewBox="0 0 20 20" width="16" height="16">
        <path d="m5.5 5.5 9 9m0-9-9 9" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      </svg>
    </button>
  );

  if (sheet) {
    return (
      <PeekSheet
        panelRef={panelRef}
        titleId={titleId}
        closing={closing}
        swap={swap}
        onClose={onClose}
        head={head}
        rest={rest}
        closeButton={closeButton}
        actions={actions}
      />
    );
  }

  return (
    <>
      <div
        aria-hidden="true"
        data-state={closing ? "closed" : "open"}
        data-swap={swap ? "" : undefined}
        className="motion-scrim pointer-events-auto fixed inset-0 z-50 bg-overlay"
        onPointerDown={(event) => {
          event.preventDefault();
          event.stopPropagation();
          swallowNextClick();
          onClose(true);
        }}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
        }}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        inert={closing}
        data-state={closing ? "closed" : "open"}
        data-swap={swap ? "" : undefined}
        className="motion-pop fixed z-50 flex w-[min(22rem,calc(100vw-1rem))] max-w-[calc(100vw-1rem)] flex-col overflow-x-hidden overflow-y-auto overscroll-contain rounded-md border border-line-strong bg-surface p-4 shadow-2xl outline-none"
        style={position}
      >
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">{head}</div>
          {closeButton}
        </div>
        <div className="min-w-0">{rest}</div>
        <div className="mt-3">{actions}</div>
      </div>
    </>
  );
}

const KIND_KEY: Record<PeekKind, string> = {
  person: "peekKindPerson",
  organization: "peekKindOrganization",
  position: "peekKindPosition",
  topic: "peekKindTopic",
  place: "peekKindPlace",
};

/**
 * The phone layout: a bottom sheet whose handle and header drag it between a
 * peek height and an expanded height, or down to close. Content that fits in
 * 90 % of the viewport sizes the sheet to itself and does not scroll. Taller
 * content opens at 60 % with a handle to 90 %, and the middle scrolls.
 */
function PeekSheet({
  panelRef,
  titleId,
  closing,
  swap,
  onClose,
  head,
  rest,
  closeButton,
  actions,
}: {
  panelRef: RefObject<HTMLDivElement | null>;
  titleId: string;
  closing: boolean;
  swap: boolean;
  onClose: (returnFocus?: boolean) => void;
  head: ReactNode;
  rest: ReactNode;
  closeButton: ReactNode;
  actions: ReactNode;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const scrollerId = useId();
  const sheet = useBottomSheet({
    panelRef,
    scrollerRef,
    innerRef,
    detents: ({ natural, viewport }) => {
      const max = viewport * 0.9;
      if (natural <= max) return { peek: natural, expanded: natural };
      return { peek: Math.min(natural, viewport * 0.6), expanded: max };
    },
    onDismiss: () => onClose(true),
  });
  return (
    <div className="fixed inset-0 z-50">
      <div
        aria-hidden="true"
        data-state={closing ? "closed" : "open"}
        data-swap={swap ? "" : undefined}
        className="motion-scrim pointer-events-auto absolute inset-0 bg-overlay"
        onPointerDown={(event) => {
          event.preventDefault();
          event.stopPropagation();
          swallowNextClick();
          onClose(true);
        }}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
        }}
      />
      <div
        data-state={closing ? "closed" : "open"}
        data-swap={swap ? "" : undefined}
        className="motion-sheet absolute inset-x-0 bottom-0"
      >
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          tabIndex={-1}
          className="flex max-h-[90svh] min-w-0 flex-col overflow-hidden rounded-t-lg border border-b-0 border-line bg-surface shadow-2xl outline-none"
          style={{
            ...sheet.style,
            paddingBottom: "max(var(--t-space-4), env(safe-area-inset-bottom, 0px))",
            paddingLeft: "max(var(--t-space-4), env(safe-area-inset-left, 0px))",
            paddingRight: "max(var(--t-space-4), env(safe-area-inset-right, 0px))",
          }}
        >
          <div {...sheet.dragProps} className={`shrink-0 select-none ${sheet.canExpand ? "" : "pt-3"}`}>
            {sheet.canExpand ? (
              <SheetHandle
                expanded={sheet.detent === "expanded"}
                onToggle={sheet.toggle}
                onKeyDown={sheet.onHandleKeyDown}
                controls={scrollerId}
              />
            ) : null}
            <div className="flex items-start gap-2 pt-2">
              <div className="min-w-0 flex-1">{head}</div>
              {closeButton}
            </div>
          </div>
          <div
            ref={scrollerRef}
            id={scrollerId}
            className={`min-h-0 flex-1 overscroll-contain ${sheet.dragging || !sheet.canExpand ? "overflow-hidden" : "overflow-y-auto"}`}
          >
            <div ref={innerRef} className="flow-root">{rest}</div>
          </div>
          <div className="mt-3 shrink-0">{actions}</div>
        </div>
      </div>
    </div>
  );
}

function PeekBody({
  open,
  record,
  status,
  titleId,
  onNavigate,
  part = "all",
}: {
  open: OpenState;
  record: PeekRecord | null;
  status: "loading" | "ready" | "error";
  titleId: string;
  onNavigate: (href: string) => void;
  /** The sheet puts the header in its drag zone and scrolls the rest. */
  part?: "all" | "head" | "rest";
}) {
  const t = useT("common");
  const locale = useLocale();
  const kind = record?.kind ?? open.kind;
  const name = record?.name ?? open.label;
  const subtypeLabel =
    record?.subtype != null
      ? (locale === "en" ? ORG_SUBTYPE_LABELS_EN : ORG_SUBTYPE_LABELS)[record.subtype] ?? null
      : null;
  const kindLabel = subtypeLabel ?? t(KIND_KEY[kind]);

  const link = (ref: PeekRef, extra?: ReactNode) => {
    const kind = peekKindFor(ref.id);
    if (kind === null) {
      return (
        <a
          href={ref.href}
          lang="nl"
          onClick={(event) => {
            if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
            event.preventDefault();
            onNavigate(ref.href);
          }}
          className={`relative break-words text-ink underline decoration-line-strong decoration-1 underline-offset-[3px] transition-fast hover:decoration-2 ${PEEK_HIT}`}
        >
          {ref.name}
          {extra}
        </a>
      );
    }
    return (
      <PeekLink id={ref.id} href={ref.href} kind={kind} variant="inline" glyph lang="nl" className={`break-words ${PEEK_HIT}`}>
        {ref.name}
        {extra}
      </PeekLink>
    );
  };

  const head = (
      <div key={open.id} className="motion-swap flex items-start gap-3">
        {kind === "person" ? (
          <Avatar name={name} url={record?.portrait?.url ?? null} color={record?.color ?? null} size={48} title={record?.portrait?.credit} />
        ) : (
          <span
            aria-hidden="true"
            className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-md border border-line bg-surface-inset"
          >
            <KindGlyph kind={kind} size={18} />
          </span>
        )}
        <div className="min-w-0 flex-1 pt-0.5">
          <p className="flex items-center gap-1.5 text-[11px] font-medium text-ink-faint">
            <KindGlyph kind={kind} size={7} />
            <span className="truncate">{kindLabel}</span>
          </p>
          <h2 id={titleId} lang="nl" className="mt-0.5 break-words text-base font-semibold leading-snug text-ink">
            {name}
          </h2>
          {locale === "en" && record?.gloss && record.gloss.trim().toLowerCase() !== kindLabel.trim().toLowerCase() ? (
            <p lang="en" className="mt-0.5 text-xs text-ink-muted">
              {record.gloss}
            </p>
          ) : null}
          {record?.party ? (
            <p className="mt-1 flex items-center gap-1.5 text-xs text-ink-muted">
              <span
                aria-hidden="true"
                className="inline-block h-2 w-2 rounded-full ring-1 ring-line"
                style={{ backgroundColor: record.color ?? "var(--t-color-line-strong)" }}
              />
              {record.party.href ? link({ id: record.party.href, name: record.party.abbrev, href: record.party.href }) : record.party.abbrev}
            </p>
          ) : null}
        </div>
      </div>
  );

  const rest = (
    <>
      {status === "loading" ? (
        <div aria-live="polite" className="mt-3 space-y-2">
          <span className="sr-only">{t("peekLoading")}</span>
          <span aria-hidden="true" className="sg-skeleton block h-3 w-4/5 rounded-xs" />
          <span aria-hidden="true" className="sg-skeleton block h-3 w-3/5 rounded-xs" />
        </div>
      ) : null}

      {status === "error" ? <p className="mt-3 text-sm text-ink-muted">{t("peekUnavailable")}</p> : null}

      {record ? (
        <div key={open.id} className="motion-swap mt-3 space-y-2.5 text-sm">
          {record.description ? (
            <LocalizedDescription
              nl={record.description}
              en={record.descriptionEn}
              className="leading-snug text-ink-muted"
            />
          ) : null}

          <dl className="space-y-3">
            {record.roles.length > 0 ? (
              <Fact label={t("peekNow")}>
                {record.roles.map((role) => (
                  <span key={role.id} className="block">
                    {link(role)}
                    {role.acting ? <span className="text-ink-faint"> ({t("peekActing")})</span> : null}
                    {role.organization && !role.name.includes(role.organization.name) ? (
                      <span className="text-ink-faint">
                        {" "}
                        {t("peekAt")} {link(role.organization)}
                      </span>
                    ) : null}
                  </span>
                ))}
              </Fact>
            ) : null}

            {record.memberOf.length > 0 ? (
              <Fact label={t("peekMemberOf")}>
                {record.memberOf.map((ref, index) => (
                  <span key={ref.id}>
                    {index > 0 ? ", " : null}
                    {link(ref)}
                  </span>
                ))}
              </Fact>
            ) : null}

            {record.kind === "position" ? (
              <Fact label={t("peekHeldBy")}>
                {record.holders.length === 0 ? (
                  <span className="text-ink-faint">{t("peekVacant")}</span>
                ) : (
                  <HolderList record={record} link={link} />
                )}
              </Fact>
            ) : record.holders.length > 0 ? (
              <Fact label={t("peekLeadership")}>
                <HolderList record={record} link={link} />
              </Fact>
            ) : null}

            {record.parent ? (
              <Fact label={t("peekPartOf")} inline>
                {link(record.parent)}
              </Fact>
            ) : null}

            {record.related.length > 0 ? (
              <Fact label={t("peekResponsible")}>
                {record.related.map((ref, index) => (
                  <span key={ref.id}>
                    {index > 0 ? ", " : null}
                    {link(ref)}
                  </span>
                ))}
              </Fact>
            ) : null}
          </dl>

          <PeekMeta record={record} onNavigate={onNavigate} />

        </div>
      ) : null}
    </>
  );

  if (part === "head") return head;
  if (part === "rest") return <div className="pb-1">{rest}</div>;
  return (
    <div>
      {head}
      {rest}
    </div>
  );
}

/** Where "N news items" goes: the news panel on the entity page, which lists every item that mentions it. */
function newsHref(record: PeekRecord): string {
  return `${record.href}${record.kind === "topic" ? "#nieuws-titel" : "#nieuws-paneel-titel"}`;
}

function Fact({ label, children, inline = false }: { label: string; children: ReactNode; inline?: boolean }) {
  return (
    <div className={inline ? "flex min-w-0 items-baseline gap-x-2" : "min-w-0"}>
      <dt className="shrink-0 text-xs text-ink-faint">{label}</dt>
      <dd className={`min-w-0 text-ink ${inline ? "" : "mt-1"}`}>{children}</dd>
    </div>
  );
}

function PeekCount({
  icon,
  n,
  label,
  color,
}: {
  icon: IconNode;
  n: number;
  label: string;
  color: string;
}) {
  return (
    <span
      className="inline-flex items-center gap-1 text-xs font-medium tabular-nums"
      style={{ color }}
      title={label}
      aria-label={label}
    >
      <LucideIcon icon={icon} size={14} strokeWidth={2} className="shrink-0" />
      {n}
    </span>
  );
}

function PeekMeta({
  record,
  onNavigate,
}: {
  record: PeekRecord;
  onNavigate: (href: string) => void;
}) {
  const t = useT("common");
  const items: ReactNode[] = [];
  if (record.members > 0) {
    items.push(
      <PeekCount
        key="members"
        icon={Users}
        n={record.members}
        label={record.members === 1 ? t("peekMembersOne") : t("peekMembers", { n: record.members })}
        color="var(--kind-person)"
      />,
    );
  } else if (record.seats !== null) {
    items.push(
      <PeekCount
        key="seats"
        icon={Armchair}
        n={record.seats}
        label={record.seats === 1 ? t("peekSeatsOne") : t("peekSeats", { n: record.seats })}
        color="var(--kind-position)"
      />,
    );
  }
  if (record.connections > 0) {
    items.push(
      <PeekCount
        key="connections"
        icon={Network}
        n={record.connections}
        label={record.connections === 1 ? t("peekConnectionsOne") : t("peekConnections", { n: record.connections })}
        color="var(--kind-organization)"
      />,
    );
  }
  if (record.news > 0) {
    items.push(
      <a
        key="news"
        href={newsHref(record)}
        onClick={(event) => {
          if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
          event.preventDefault();
          onNavigate(newsHref(record));
        }}
        className={`relative text-accent-text underline-offset-2 hover:underline ${PEEK_HIT}`}
      >
        {record.news === 1 ? t("peekNewsCountOne") : t("peekNewsCount", { n: record.news })}
      </a>,
    );
  }
  if (record.source) {
    items.push(
      <SourceIcon
        key="source"
        href={record.source.url}
        title={record.source.publisher || new URL(record.source.url).hostname}
        retrieved={record.source.retrieved}
        size={14}
        className="self-center"
      />,
    );
  }
  if (items.length === 0) return null;
  return (
    <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs tabular-nums text-ink-faint">
      {items}
    </p>
  );
}

function HolderList({
  record,
  link,
}: {
  record: PeekRecord;
  link: (ref: PeekRef, extra?: ReactNode) => ReactNode;
}) {
  const t = useT("common");
  return (
    <span className="block space-y-1">
      {record.holders.map((holder) => (
        <span key={holder.id + (holder.title ?? "")} className="flex items-center gap-2.5 tap-row">
          <Avatar name={holder.name} url={holder.portrait} color={holder.color} size={28} className="shrink-0" />
          <span className="min-w-0">
            {link(holder)}
            {holder.acting ? <span className="text-ink-faint"> ({t("peekActing")})</span> : null}
            {holder.title ? (
              <span lang="nl" className="block text-xs leading-snug text-ink-faint">
                {holder.title}
              </span>
            ) : null}
          </span>
        </span>
      ))}
    </span>
  );
}
