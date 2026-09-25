"use client";

import { useDeferredValue, useEffect, useState, type CSSProperties } from "react";
import { useLocale } from "@/components/i18n/language-provider";
import { formatCountIn } from "@/lib/format";
import { personCardVars } from "@/lib/person-color";

type GroupChip = { key: string; nl: string; en: string; count: number };
type PartyChip = { key: string; label: string; color: string | null; count: number };

function fold(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

const CHIP =
  "inline-flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-pill border px-3 text-sm transition-[border-color,background-color,color] duration-150 motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus pointer-coarse:h-11";

/**
 * The sticky filter bar of the people index: a search field, one row of chips
 * for the groups and the parties with a count each, and the A-Z jump row. It
 * filters the server-rendered cards in place by their data attributes, so the
 * full list stays in the static HTML, and keeps the choice in the URL
 * (?q=, ?groep=, ?partij=). On a phone the chips scroll inside their row.
 */
export function PeopleFilters({
  targetId,
  groups,
  parties,
  letters,
}: {
  targetId: string;
  groups: GroupChip[];
  parties: PartyChip[];
  letters: string[];
}) {
  const locale = useLocale();
  const en = locale === "en";
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState<string | null>(null);
  const [party, setParty] = useState<string | null>(null);
  const [shown, setShown] = useState<number | null>(null);
  const [liveLetters, setLiveLetters] = useState<Set<string> | null>(null);
  const deferredQuery = useDeferredValue(query);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setQuery(params.get("q") ?? "");
    setGroup(params.get("groep"));
    setParty(params.get("partij"));
    // A chip chosen by the URL may sit off screen in its scrolling row.
    requestAnimationFrame(() => {
      const chip = document.querySelector<HTMLElement>(`#${CSS.escape(targetId)}-filters [aria-pressed="true"]`);
      const row = chip?.parentElement;
      if (chip && row) row.scrollLeft = chip.offsetLeft - row.offsetLeft - 16;
    });
  }, [targetId]);

  useEffect(() => {
    const root = document.getElementById(targetId);
    if (!root) return;
    const terms = fold(deferredQuery.trim()).split(/\s+/).filter(Boolean);
    let count = 0;
    const present = new Set<string>();
    for (const section of root.querySelectorAll<HTMLElement>("[data-letter]")) {
      let any = false;
      for (const card of section.querySelectorAll<HTMLElement>("[data-person]")) {
        const search = card.dataset.search ?? "";
        const match =
          (group === null || card.dataset.group === group) &&
          (party === null || card.dataset.party === party) &&
          terms.every((term) => search.includes(term));
        if (card.hidden === match) card.hidden = !match;
        if (match) {
          any = true;
          count += 1;
        }
      }
      section.hidden = !any;
      if (any) present.add(section.dataset.letter ?? "");
    }
    setShown(count);
    setLiveLetters(present);

    const url = new URL(window.location.href);
    const set = (key: string, value: string | null) => {
      if (value) url.searchParams.set(key, value);
      else url.searchParams.delete(key);
    };
    set("q", deferredQuery.trim() || null);
    set("groep", group);
    set("partij", party);
    if (url.href !== window.location.href) window.history.replaceState(window.history.state, "", url);
  }, [deferredQuery, group, party, targetId]);

  return (
    <>
      <div id={`${targetId}-filters`} className="sticky top-0 z-10 -mx-2 mt-4 border-b border-line/70 bg-canvas/90 px-2 py-2 backdrop-blur-md">
        <div className="flex flex-col gap-2 @xl:flex-row @xl:items-center">
          <label className="relative block shrink-0 @xl:w-64">
            <span className="sr-only">{en ? "Search people" : "Zoek personen"}</span>
            <svg
              aria-hidden="true"
              viewBox="0 0 16 16"
              width="15"
              height="15"
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint"
            >
              <circle cx="7" cy="7" r="4.8" fill="none" stroke="currentColor" strokeWidth="1.5" />
              <path d="m10.6 10.6 3.4 3.4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={en ? "Name, party or position" : "Naam, partij of functie"}
              enterKeyHint="search"
              autoComplete="off"
              spellCheck={false}
              className="h-10 w-full rounded-md border border-line bg-surface pe-3 ps-9 text-base text-ink placeholder:text-ink-faint focus-visible:border-line-strong focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-focus pointer-coarse:h-11"
            />
          </label>
          <div className="scroll-row min-w-0 flex-1 gap-1.5 py-0.5 ps-0.5 pe-4" role="group" aria-label={en ? "Filter" : "Filter"}>
            {groups.map((chip) => {
              const active = group === chip.key;
              return (
                <button
                  key={chip.key}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setGroup(active ? null : chip.key)}
                  className={`${CHIP} ${
                    active
                      ? "border-ink bg-surface-raised text-ink"
                      : "border-line bg-surface text-ink-muted hover:border-line-strong hover:text-ink"
                  }`}
                >
                  {en ? chip.en : chip.nl}
                  <span className="text-xs tabular-nums text-ink-muted">{formatCountIn(chip.count, locale)}</span>
                </button>
              );
            })}
            <span aria-hidden="true" className="mx-1 w-px shrink-0 self-stretch bg-line" />
            {parties.map((chip) => {
              const active = party === chip.key;
              return (
                <button
                  key={chip.key}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setParty(active ? null : chip.key)}
                  style={personCardVars(chip.color) as CSSProperties}
                  className={`${CHIP} text-ink ${
                    active
                      ? "border-[var(--pc)] bg-[color-mix(in_srgb,var(--pc)_18%,var(--t-color-surface))]"
                      : "border-[color-mix(in_oklab,var(--pc)_45%,var(--t-color-line))] bg-[color-mix(in_srgb,var(--pc)_7%,var(--t-color-surface))] hover:border-[color-mix(in_oklab,var(--pc)_80%,var(--t-color-line))]"
                  }`}
                >
                  <span aria-hidden="true" className="size-2 shrink-0 rounded-full bg-[var(--pc)]" />
                  {chip.label}
                  <span className="text-xs tabular-nums text-ink-muted">{formatCountIn(chip.count, locale)}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <nav aria-label={en ? "Alphabet" : "Alfabet"} className="scroll-row mt-3 gap-1 ps-0.5 pe-4 @xl:flex-wrap @xl:[mask-image:none]">
        {letters.map((letter) => {
          const live = liveLetters === null || liveLetters.has(letter);
          return (
            <a
              key={letter}
              href={`#letter-${letter}`}
              aria-disabled={live ? undefined : true}
              tabIndex={live ? undefined : -1}
              className={`inline-flex h-8 min-w-8 shrink-0 items-center justify-center rounded-md text-sm font-medium transition-fast focus-visible:outline-2 focus-visible:outline-focus pointer-coarse:h-11 pointer-coarse:min-w-11 ${
                live ? "text-ink-muted hover:bg-surface-raised hover:text-ink" : "pointer-events-none text-ink-faint opacity-40"
              }`}
            >
              {letter}
            </a>
          );
        })}
      </nav>

      {shown === 0 ? (
        <p role="status" className="mt-8 text-sm text-ink-muted">
          {en ? "No people found" : "Geen personen gevonden"}
        </p>
      ) : null}
    </>
  );
}
