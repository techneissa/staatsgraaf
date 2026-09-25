"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { useLocale } from "@/components/i18n/language-provider";
import { formatCountIn } from "@/lib/format";

const useIsoLayoutEffect = typeof document === "undefined" ? useEffect : useLayoutEffect;

const COUNT_MS = 700;

function prefersReducedMotion(): boolean {
  return typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Calls `onEnter` once, the first time the element scrolls into view. Returns
 * false when the effect should not run at all (reduced motion, no observer),
 * so the caller keeps its static rendering.
 */
function useFirstView<E extends Element>(onEnter: () => void): [RefObject<E | null>, boolean] {
  const ref = useRef<E>(null);
  const [armed, setArmed] = useState(false);
  const enter = useRef(onEnter);
  enter.current = onEnter;

  useIsoLayoutEffect(() => {
    const node = ref.current;
    if (!node || prefersReducedMotion() || typeof IntersectionObserver !== "function") return;
    // Already on screen when the script starts: the reader has seen the real
    // number in the server HTML, so resetting it to zero would only flash.
    const box = node.getBoundingClientRect();
    if (box.top < window.innerHeight && box.bottom > 0) return;
    setArmed(true);
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();
        enter.current();
      },
      { rootMargin: "0px 0px -8% 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return [ref, armed];
}

/**
 * A count that runs up from zero once, the first time it is seen. The server
 * HTML holds the real number, as does the text a screen reader hears; the
 * running figure is aria-hidden and sits over an invisible copy of the final
 * figure, so its width never changes.
 */
export function CountUp({ value }: { value: number }) {
  const locale = useLocale();
  const [shown, setShown] = useState(value);
  const frame = useRef<number | null>(null);

  const [ref, armed] = useFirstView<HTMLSpanElement>(() => {
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / COUNT_MS);
      const eased = 1 - (1 - t) ** 3;
      setShown(Math.round(value * eased));
      frame.current = t < 1 ? requestAnimationFrame(step) : null;
    };
    frame.current = requestAnimationFrame(step);
  });

  useIsoLayoutEffect(() => {
    if (armed) setShown(0);
  }, [armed]);

  useEffect(
    () => () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    },
    [],
  );

  const final = formatCountIn(value, locale);
  return (
    <span ref={ref} className="relative inline-block tabular-nums">
      <span className="sr-only">{final}</span>
      <span aria-hidden="true" className="invisible">
        {final}
      </span>
      <span aria-hidden="true" className="absolute inset-y-0 left-0">
        {formatCountIn(shown, locale)}
      </span>
    </span>
  );
}

/**
 * Lets a card rise in slightly, once, the first time it is seen. Without
 * script or with reduced motion the card is simply there.
 */
export function Rise({ children, className = "" }: { children: ReactNode; className?: string }) {
  const [seen, setSeen] = useState(false);
  const [ref, armed] = useFirstView<HTMLDivElement>(() => setSeen(true));
  const state = !armed || seen ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0";
  return (
    <div
      ref={ref}
      className={`h-full transition-[opacity,translate] duration-500 ease-out print:translate-y-0 print:opacity-100 ${state} ${className}`.trim()}
    >
      {children}
    </div>
  );
}

/** A file size in the site language, for example 1,2 MB or 1.2 MB. */
export function FileSize({ bytes }: { bytes: number }) {
  const locale = useLocale();
  const tag = locale === "en" ? "en-GB" : "nl-NL";
  const units: [number, string][] = [
    [1024 * 1024, "MB"],
    [1024, "kB"],
  ];
  for (const [size, unit] of units) {
    if (bytes >= size) {
      const value = bytes / size;
      const text = new Intl.NumberFormat(tag, { maximumFractionDigits: value < 10 ? 1 : 0 }).format(value);
      return <>{`${text} ${unit}`}</>;
    }
  }
  return <>{`${new Intl.NumberFormat(tag).format(bytes)} B`}</>;
}
