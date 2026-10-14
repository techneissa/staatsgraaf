"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Menu, X } from "lucide";
import { BrandLockup } from "./brand-lockup";
import { HistoryControls } from "./history-controls";
import { Morph } from "./icons/morph";
import { LanguageToggle } from "./language-toggle";
import { SearchOverlay } from "./search/search-overlay";
import { ThemeToggle } from "./theme-toggle";
import { useT } from "./i18n/use-t";
import { ABOUT, MAIN_NAV, SECTIONS } from "@/lib/site-nav";
import { languageTwin } from "@/lib/language-routes";
import { useLocale } from "./i18n/language-provider";

/** A section that exists in both languages links to the twin in the reader's language. */
function sectionHref(href: string, english: boolean): string {
  return english ? (languageTwin(href)?.en ?? href) : href;
}

function isCurrent(pathname: string | null, href: string): boolean {
  if (pathname === null) return false;
  const path = pathname.endsWith("/") ? pathname : `${pathname}/`;
  const twin = languageTwin(href);
  return path.startsWith(href) || (twin !== null && path.startsWith(twin.en));
}

/**
 * The menu for screens where the seven sections do not fit in one row: phones
 * and tablets up to the iPad landscape width. A native <details>, so it opens
 * without JavaScript; with JavaScript it closes on navigation, on a tap
 * outside it and on Escape.
 */
function MobileMenu({ pathname }: { pathname: string | null }) {
  const t = useT("common");
  const english = useLocale() === "en";
  const ref = useRef<HTMLDetailsElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (ref.current) ref.current.open = false;
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) ref.current.open = false;
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || !ref.current) return;
      ref.current.open = false;
      ref.current.querySelector("summary")?.focus();
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <details
      ref={ref}
      className="group min-[1180px]:hidden sm:relative"
      onToggle={(event) => setOpen((event.currentTarget as HTMLDetailsElement).open)}
    >
      <summary
        className="bar-control tap-target cursor-pointer list-none gap-1.5 px-2.5 text-sm leading-none transition-fast hover:border-line-strong hover:text-ink group-open:border-line-strong group-open:text-ink max-[400px]:px-0 [&::-webkit-details-marker]:hidden"
      >
        <Morph icon={open ? X : Menu} size={16} strokeWidth={1.8} />
        <span className="max-[400px]:sr-only">{t("menu")}</span>
      </summary>
      <nav
        aria-label={t("navMenuLabel")}
        className="motion-pop absolute inset-x-0 top-full z-30 mx-[max(0.75rem,var(--safe-left))] mt-1.5 rounded-md border border-line bg-surface p-1.5 shadow-xl sm:inset-x-auto sm:left-0 sm:mx-0 sm:w-64"
      >
        <ul className="flex flex-col">
          {SECTIONS.map((item) => {
            const current = isCurrent(pathname, item.href);
            return (
              <li key={item.href}>
                <Link
                  href={sectionHref(item.href, english)}
                  aria-current={current ? "page" : undefined}
                  onClick={() => {
                    if (ref.current) ref.current.open = false;
                  }}
                  className={`flex min-h-11 items-center rounded-sm px-3 text-base transition-fast hover:bg-surface-raised hover:text-ink sm:text-sm sm:pointer-fine:min-h-9 ${
                    current ? "font-medium text-accent-text" : "text-ink-muted"
                  }`}
                >
                  {t(item.label)}
                </Link>
              </li>
            );
          })}
        </ul>
        <ul className="mt-1 flex flex-col border-t border-line pt-1">
          <li>
            <Link
              href={ABOUT.href}
              aria-current={isCurrent(pathname, ABOUT.href) ? "page" : undefined}
              onClick={() => {
                if (ref.current) ref.current.open = false;
              }}
              className={`flex min-h-11 items-center rounded-sm px-3 text-base transition-fast hover:bg-surface-raised hover:text-ink sm:text-sm sm:pointer-fine:min-h-9 ${
                isCurrent(pathname, ABOUT.href) ? "font-medium text-accent-text" : "text-ink-muted"
              }`}
            >
              {t(ABOUT.label)}
            </Link>
          </li>
        </ul>
      </nav>
    </details>
  );
}

export function TopBar() {
  const t = useT("common");
  const english = useLocale() === "en";
  const pathname = usePathname();

  return (
    <header
      className="relative z-20 shrink-0 border-b border-line bg-canvas pt-[var(--safe-top)]"
      style={{ viewTransitionName: "site-header" }}
    >
      <div className="flex items-center gap-1.5 py-2 pl-[max(0.75rem,var(--safe-left))] pr-[max(0.75rem,var(--safe-right))] sm:gap-3 sm:pl-[max(1rem,var(--safe-left))] sm:pr-[max(1rem,var(--safe-right))] lg:gap-2">
        <BrandLockup />
        <MobileMenu pathname={pathname} />
        <nav aria-label={t("navMain")} className="hidden items-center gap-0.5 text-sm min-[1180px]:flex">
          {MAIN_NAV.map((item) => {
            const current = isCurrent(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={sectionHref(item.href, english)}
                aria-current={current ? "page" : undefined}
                className={`link-draw tap-row flex items-center whitespace-nowrap rounded-sm px-1.5 py-1 underline-offset-4 [--link-draw-bottom:calc(50%-0.72em)] [--link-draw-inset:0.375rem] hover:text-ink hover:underline ${
                  current ? "text-ink underline decoration-accent" : "text-ink-muted"
                }`}
              >
                {t(item.label)}
              </Link>
            );
          })}
        </nav>
        <div className="ms-auto flex shrink-0 items-center gap-1.5">
          <LanguageToggle />
          <div data-search-mount className="flex items-center">
            <SearchOverlay />
            <noscript>
              <Link
                href="/onderwerpen/"
                className="ms-2 text-xs text-ink-faint underline underline-offset-2"
              >
                {t("searchRequiresJs")}
              </Link>
            </noscript>
          </div>
          {/* Nine sections fill the bar from 1180 px; the history buttons wait for 1281 px. */}
          <div className="max-[400px]:hidden min-[1180px]:max-[1280px]:hidden">
            <HistoryControls />
          </div>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
