import { BrandLockup } from "./brand-lockup";
import { HistoryControls } from "./history-controls";
import { ThemeToggle } from "./theme-toggle";

export function TopBar() {
  return (
    <header className="z-20 shrink-0 border-b border-line bg-canvas">
      <div className="flex items-center gap-3 px-4 py-2.5">
        <BrandLockup />
        <div className="ms-auto flex items-center gap-2">
          <div data-search-mount>
            <button
              type="button"
              disabled
              aria-label="Zoeken"
              title="Zoeken is binnenkort beschikbaar"
              className="flex items-center gap-2 rounded-sm border border-line px-2.5 py-2 text-sm text-ink-faint disabled:cursor-not-allowed disabled:opacity-60"
            >
              <svg aria-hidden="true" viewBox="0 0 20 20" width="15" height="15">
                <circle cx="8.5" cy="8.5" r="4.75" fill="none" stroke="currentColor" strokeWidth="1.5" />
                <path d="m12.2 12.2 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              <span className="hidden sm:inline">Zoeken</span>
            </button>
          </div>
          <HistoryControls />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
