"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import { IndexSearchField } from "@/components/index-list/search-field";
import { useLocale } from "@/components/i18n/language-provider";
import { useT } from "@/components/i18n/use-t";
import { formatCountIn } from "@/lib/format";
import { personCardVars } from "@/lib/person-color";

type GroupChip = { key: string; nl: string; en: string; count: number };
type PartyChip = { key: string; label: string; color: string | null; count: number };

const CHIP =
  "inline-flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-pill border px-3 text-sm transition-[border-color,background-color,color] duration-150 motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus pointer-coarse:h-11";

/**
 * The sticky filter bar of the people index: a search field, one row of chips
 * for the groups and the parties with a count each, and the A-Z jump row. It
 * is controlled by the people index (people-index-view.tsx), which filters
 * the rows; the choice lives in the URL (?q=, ?groep=, ?partij=). On a phone
 * the chips scroll inside their row.
 */
export function PeopleFilters({
  targetId,
  groups,
  parties,
  letters,
  liveLetters,
  query,
  group,
  party,
  onQuery,
  onGroup,
  onParty,
  onJump,
}: {
  targetId: string;
  groups: GroupChip[];
  parties: PartyChip[];
  letters: string[];
  /** Letters that have a match, or null before the list is filtered. */
  liveLetters: Set<string> | null;
  query: string;
  group: string;
  party: string;
  onQuery: (value: string) => void;
  onGroup: (value: string) => void;
  onParty: (value: string) => void;
  onJump: (letter: string) => void;
}) {
  const locale = useLocale();
  const t = useT("entity");
  const en = locale === "en";
  const barRef = useRef<HTMLDivElement>(null);

  // A chip chosen by the URL may sit off screen in its scrolling row.
  useEffect(() => {
    const chip = barRef.current?.querySelector<HTMLElement>('[aria-pressed="true"]');
    const row = chip?.parentElement;
    if (chip && row) row.scrollLeft = chip.offsetLeft - row.offsetLeft - 16;
  }, [group, party]);

  return (
    <>
      <div
        ref={barRef}
        id={`${targetId}-filters`}
        className="sticky top-0 z-10 -mx-2 mt-4 border-b border-line/70 bg-canvas/90 px-2 py-2 backdrop-blur-md"
      >
        <div className="flex flex-col gap-2 @xl:flex-row @xl:items-center">
          <IndexSearchField
            value={query}
            onChange={onQuery}
            label={t("idxSearchPeople")}
            placeholder={t("idxSearchPeoplePlaceholder")}
            className="@xl:w-64"
          />
          <div className="scroll-row min-w-0 flex-1 gap-1.5 py-0.5 ps-0.5 pe-4" role="group" aria-label={t("idxFilterLabel")}>
            {groups.map((chip) => {
              const active = group === chip.key;
              return (
                <button
                  key={chip.key}
                  type="button"
                  aria-pressed={active}
                  onClick={() => onGroup(active ? "" : chip.key)}
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
                  onClick={() => onParty(active ? "" : chip.key)}
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

      <nav aria-label={t("idxAlphabet")} className="scroll-row mt-3 gap-1 ps-0.5 pe-4 @xl:flex-wrap @xl:[mask-image:none]">
        {letters.map((letter) => {
          const live = liveLetters === null || liveLetters.has(letter);
          return (
            <a
              key={letter}
              href={`#letter-${letter}`}
              aria-disabled={live ? undefined : true}
              tabIndex={live ? undefined : -1}
              onClick={(event) => {
                if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
                event.preventDefault();
                onJump(letter);
              }}
              className={`inline-flex h-8 min-w-8 shrink-0 items-center justify-center rounded-md text-sm font-medium transition-fast focus-visible:outline-2 focus-visible:outline-focus pointer-coarse:h-11 pointer-coarse:min-w-11 ${
                live ? "text-ink-muted hover:bg-surface-raised hover:text-ink" : "pointer-events-none text-ink-faint opacity-40"
              }`}
            >
              {letter}
            </a>
          );
        })}
      </nav>
    </>
  );
}
