"use client";

import { useEffect, useState } from "react";
import { useT } from "@/components/i18n/use-t";
import { THEME_STORAGE_KEY } from "@/lib/site";

export function ThemeToggle() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const t = useT("pages");

  useEffect(() => {
    const current = document.documentElement.getAttribute("data-theme");
    setTheme(current === "light" ? "light" : "dark");
  }, []);

  const isLight = theme === "light";
  const nextLabel = isLight ? t("themeToDark") : t("themeToLight");

  function toggle() {
    const next = isLight ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Theme still applies for this page view when storage is unavailable.
    }
    setTheme(next);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={nextLabel}
      aria-pressed={isLight}
      title={nextLabel}
      className="rounded-sm border border-line p-2 text-ink-muted transition-fast hover:border-line-strong hover:text-ink"
    >
      <svg aria-hidden="true" viewBox="0 0 20 20" width="16" height="16">
        {isLight ? (
          <path
            d="M10 4.2a5.8 5.8 0 1 0 0 11.6 5.8 5.8 0 0 0 0-11.6Zm0-3v2m0 13.6v2M2.6 10h-2m16.8 0h2M4.8 4.8 3.4 3.4m13.2 13.2-1.4-1.4m0-10.4 1.4-1.4M3.4 16.6l1.4-1.4"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        ) : (
          <path
            d="M16.5 12.6A7 7 0 0 1 7.4 3.5a7 7 0 1 0 9.1 9.1Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        )}
      </svg>
    </button>
  );
}
