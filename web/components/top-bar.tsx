import Link from "next/link";
import { BrandLockup } from "./brand-lockup";
import { HistoryControls } from "./history-controls";
import { SearchOverlay } from "./search/search-overlay";
import { ThemeToggle } from "./theme-toggle";

const NAV = [
  { href: "/wijzigingen/", label: "Wijzigingen" },
  { href: "/onderwerpen/", label: "Onderwerpen" },
  { href: "/begroting/", label: "Begroting" },
];

export function TopBar() {
  return (
    <header className="z-20 shrink-0 border-b border-line bg-canvas">
      <div className="flex items-center gap-3 px-4 py-2.5">
        <BrandLockup />
        <details className="relative md:hidden">
          <summary className="flex cursor-pointer list-none items-center rounded-sm border border-line px-2.5 py-2 text-sm text-ink-muted [&::-webkit-details-marker]:hidden">
            Menu
          </summary>
          <nav
            aria-label="Hoofdnavigatie"
            className="absolute left-0 top-full z-30 mt-2 flex min-w-44 flex-col gap-0.5 rounded-md border border-line bg-surface p-2 text-sm shadow-lg"
          >
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-sm px-2 py-1.5 text-ink-muted underline-offset-2 hover:text-ink hover:underline"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </details>
        <nav aria-label="Hoofdnavigatie" className="hidden items-center gap-1 text-sm md:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-sm px-2 py-1 text-ink-muted underline-offset-2 hover:text-ink hover:underline"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="ms-auto flex items-center gap-2">
          <div data-search-mount className="flex items-center">
            <SearchOverlay />
            <noscript>
              <Link
                href="/onderwerpen/"
                className="ms-2 text-xs text-ink-faint underline underline-offset-2"
              >
                Zoeken vereist JavaScript, blader door onderwerpen
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
