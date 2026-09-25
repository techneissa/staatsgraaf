"use client";

import { useEffect, useState } from "react";
import { flushSync } from "react-dom";
import { Moon, Sun } from "lucide";
import { Morph } from "@/components/icons/morph";
import { useT } from "@/components/i18n/use-t";
import { withPageTransition } from "@/lib/motion";
import { THEME_STORAGE_KEY } from "@/lib/site";

export function ThemeToggle() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  /** True once the reader has switched, so the icon only morphs in answer to a click. */
  const [switched, setSwitched] = useState(false);
  const t = useT("pages");

  useEffect(() => {
    const current = document.documentElement.getAttribute("data-theme");
    setTheme(current === "light" ? "light" : "dark");
  }, []);

  const isLight = theme === "light";
  const nextLabel = isLight ? t("themeToDark") : t("themeToLight");

  function toggle() {
    const next = isLight ? "dark" : "light";
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Theme still applies for this page view when storage is unavailable.
    }
    // The whole page cross-fades from one theme to the other.
    withPageTransition(() => {
      document.documentElement.setAttribute("data-theme", next);
      flushSync(() => {
        setTheme(next);
        setSwitched(true);
      });
    }, "theme");
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={nextLabel}
      aria-pressed={isLight}
      title={nextLabel}
      className="tap-target flex items-center justify-center rounded-sm border border-line p-2 text-ink-muted transition-fast hover:border-line-strong hover:text-ink"
    >
      <Morph icon={isLight ? Sun : Moon} size={16} strokeWidth={1.8} still={!switched} />
    </button>
  );
}
