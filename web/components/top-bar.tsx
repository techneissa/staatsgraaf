"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { BrandLockup } from "./brand-lockup";
import { HistoryControls } from "./history-controls";
import { LanguageToggle } from "./language-toggle";
import { SearchOverlay } from "./search/search-overlay";
import { ThemeToggle } from "./theme-toggle";
import { useT } from "./i18n/use-t";

const NAV = [
  { href: "/wijzigingen/", label: "navChanges" },
  { href: "/nieuws/", label: "navNews" },
  { href: "/onderwerpen/", label: "navTopics" },
  { href: "/begroting/", label: "navBudget" },
  { href: "/organisaties/", label: "navOrganizations" },
  { href: "/personen/", label: "navPeople" },
  { href: "/partijen/", label: "navParties" },
] as const;

function isCurrent(pathname: string | null, href: string): boolean {
  if (pathname === null) return false;
  const path = pathname.endsWith("/") ? pathname : `${pathname}/`;
  return path.startsWith(href);
}

/**
 * The menu for screens where the seven sections do not fit in one row: phones
 * and tablets up to the iPad landscape width. A native <details>, so it opens
 * without JavaScript; with JavaScript it closes on navigation, on a tap
 * outside it and on Escape.
 */
function MobileMenu({ pathname }: { pathname: string | null }) {
  const t = useT("common");
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
        className="tap-target flex cursor-pointer list-none items-center gap-1.5 rounded-sm border border-line px-2.5 py-1.5 text-sm text-ink-muted transition-fast hover:border-line-strong hover:text-ink group-open:border-line-strong group-open:text-ink [&::-webkit-details-marker]:hidden"
      >
        <svg aria-hidden="true" viewBox="0 0 20 20" width="14" height="14" className="shrink-0">
          <path
            className="group-open:hidden"
            d="M3.5 6h13M3.5 10h13M3.5 14h13"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
          <path
            className="hidden group-open:block"
            d="m5 5 10 10M15 5 5 15"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
        {t("menu")}
      </summary>
      <nav
        aria-label={t("navMain")}
        className="motion-pop absolute inset-x-0 top-full z-30 mx-[max(0.75rem,var(--safe-left))] mt-1.5 rounded-md border border-line bg-surface p-1.5 shadow-xl sm:inset-x-auto sm:left-0 sm:mx-0 sm:w-64"
      >
        <ul className="flex flex-col">
          {NAV.map((item) => {
            const current = isCurrent(pathname, item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
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
      </nav>
    </details>
  );
}

export function TopBar() {
  const t = useT("common");
  const pathname = usePathname();

  return (
    <header
      className="relative z-20 shrink-0 border-b border-line bg-canvas pt-[var(--safe-top)]"
      style={{ viewTransitionName: "site-header" }}
    >
      <div className="flex items-center gap-1.5 py-2 pl-[max(0.75rem,var(--safe-left))] pr-[max(0.75rem,var(--safe-right))] sm:gap-3 sm:pl-[max(1rem,var(--safe-left))] sm:pr-[max(1rem,var(--safe-right))]">
        <BrandLockup />
        <MobileMenu pathname={pathname} />
        <nav aria-label={t("navMain")} className="hidden items-center gap-0.5 text-sm min-[1180px]:flex">
          {NAV.map((item) => {
            const current = isCurrent(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={current ? "page" : undefined}
                className={`link-draw tap-row flex items-center whitespace-nowrap rounded-sm px-2 py-1 underline-offset-4 [--link-draw-bottom:calc(50%-0.72em)] [--link-draw-inset:0.5rem] hover:text-ink hover:underline ${
                  current ? "text-ink underline decoration-accent" : "text-ink-muted"
                }`}
              >
                {t(item.label)}
              </Link>
            );
          })}
        </nav>
        <div className="ms-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
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
          <HistoryControls />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
