"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import { navServerSnapshot, navSnapshot, setNavMotion, subscribeNav } from "@/lib/nav-history";
import { useT } from "./i18n/use-t";
import { useGoBack } from "./use-go-back";

const BUTTON =
  "bar-control tap-target transition-fast hover:border-line-strong hover:text-ink disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-line disabled:hover:text-ink-muted";

function BackArrow({ size = 16 }: { size?: number }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" width={size} height={size}>
      <path d="M12.5 4.5 7 10l5.5 5.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** The back and forward pair in the top bar, from sm. */
export function HistoryControls() {
  const router = useRouter();
  const t = useT("common");
  // Back is offered when there is a previous page or a level above
  // (components/use-go-back.ts), forward only when the app has an entry to
  // go to (lib/nav-history.ts), so neither button is ever dead.
  const { target, goBack } = useGoBack();
  const { canForward } = useSyncExternalStore(subscribeNav, navSnapshot, navServerSnapshot);
  const backLabel = t(target === "up" ? "backUpLabel" : "backLabel");

  return (
    <div className="hidden items-center gap-1.5 sm:flex">
      <button
        type="button"
        onClick={() => goBack()}
        disabled={target === null}
        aria-label={backLabel}
        title={backLabel}
        className={BUTTON}
      >
        <BackArrow />
      </button>
      <button
        type="button"
        onClick={() => {
          setNavMotion("forward");
          router.forward();
        }}
        disabled={!canForward}
        aria-label={t("forwardLabel")}
        title={t("forwardLabel")}
        className={BUTTON}
      >
        <svg aria-hidden="true" viewBox="0 0 20 20" width="16" height="16">
          <path
            d="M7.5 4.5 13 10l-5.5 5.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </div>
  );
}

/** Scrolled this far down past the last turn, the floating button steps aside. */
const HIDE_AFTER_PX = 48;

/**
 * Back on a phone, where the top bar has no room for it: a round button in
 * the bottom left corner, in reach of the thumb. It steps aside while the
 * reader scrolls down through a page and comes back as soon as they scroll up,
 * like the browser's own toolbar. Sheets, the search and the full-screen
 * graph open above it.
 */
export function FloatingBack() {
  const t = useT("common");
  const { target, goBack } = useGoBack();
  const [tucked, setTucked] = useState(false);

  useEffect(() => {
    let turn = window.scrollY;
    let last = window.scrollY;
    let frame = 0;
    const onScroll = () => {
      if (frame !== 0) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        const y = window.scrollY;
        if ((y > last) !== (last > turn)) turn = last;
        last = y;
        setTucked(y > HIDE_AFTER_PX && y - turn > HIDE_AFTER_PX);
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.cancelAnimationFrame(frame);
    };
  }, []);

  const hidden = target === null || tucked;
  const label = t(target === "up" ? "backUpLabel" : "backLabel");

  return (
    <button
      type="button"
      onClick={() => goBack()}
      aria-label={label}
      title={label}
      aria-hidden={target === null ? true : undefined}
      tabIndex={target === null ? -1 : undefined}
      data-hidden={hidden ? "" : undefined}
      className="sg-float-back fixed bottom-[calc(var(--safe-bottom)+0.75rem)] left-[max(0.75rem,var(--safe-left))] z-30 flex size-11 items-center justify-center rounded-full border border-line bg-surface/90 text-ink shadow-md backdrop-blur hover:border-line-strong sm:hidden print:hidden"
    >
      <BackArrow size={20} />
    </button>
  );
}
