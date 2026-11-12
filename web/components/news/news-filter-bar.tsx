"use client";

import { ChevronDown, Check, Languages, ListFilter, type IconNode } from "lucide";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { LucideIcon } from "@/components/icons/lucide-icon";
import { formatCountIn } from "@/lib/format";
import { NEWS_DICT } from "@/lib/i18n/dict-news";
import { NEWS_LANGUAGES, PUBLISHER_KINDS } from "@/lib/news-meta";
import { NEWS_MESSAGES } from "@/lib/news-i18n";
import type { NewsFilterState } from "@/lib/news-url-state";
import type { NewsLanguage, PublisherKind } from "@/lib/types";

/** A filter pill: 32 px with a fine pointer, 44 px on touch (NW-16), and it wraps instead of scrolling. */
export const pillClass = (active: boolean) =>
  `inline-flex min-h-8 shrink-0 items-center whitespace-nowrap rounded-pill border px-3 text-sm font-medium transition-fast pointer-coarse:min-h-11 ${
    active
      ? "border-accent/40 bg-accent-soft text-accent-text"
      : "border-line bg-surface-raised text-ink-muted hover:text-ink"
  }`;

const ALL_PUBLISHERS = "__all__";

type MenuName = "language" | "kind";

/** Each menu has its own icon and a colour from the sector palette (a text colour on the icon, a tint when a choice is active). */
const MENU_TONES: Record<MenuName, { icon: IconNode; iconClass: string; idle: string; active: string }> = {
  language: {
    icon: Languages,
    iconClass: "text-sector-decentraal-lokaal",
    idle: "border-sector-decentraal-lokaal/30",
    active: "border-sector-decentraal-lokaal/60 bg-sector-decentraal-lokaal/10",
  },
  kind: {
    icon: ListFilter,
    iconClass: "text-sector-hoge-colleges",
    idle: "border-sector-hoge-colleges/30",
    active: "border-sector-hoge-colleges/60 bg-sector-hoge-colleges/10",
  },
};

/**
 * The compact filter bar shared by the news list and the day archives: two small menus on
 * one row. Each closed menu shows the current choice ("EN · 97", the chosen kind), so the
 * reader sees the active filter without opening it. The language menu lists the original
 * languages; the other holds outlet kind and outlet. Everything wraps; nothing scrolls
 * sideways at any width. The caller owns the counts, because they depend on whether the
 * items that name nothing are shown.
 */
export function NewsFilterBar({
  uiLanguage,
  filters,
  update,
  languageCounts,
  kindCounts,
  rowCount,
  publishers,
  activePublisher,
}: {
  uiLanguage: NewsLanguage;
  filters: NewsFilterState;
  update: (patch: Partial<NewsFilterState>) => void;
  /** Items per original language and in total, for the language menu. */
  languageCounts: Record<"all" | NewsLanguage, number>;
  /** Items per outlet kind within the chosen language. */
  kindCounts: Map<PublisherKind, number>;
  /** Items within the chosen language, the count behind "all kinds". */
  rowCount: number;
  /** Outlets with their item counts within the chosen language and kind, largest first. */
  publishers: [string, number][];
  activePublisher: string | null;
}) {
  const messages = NEWS_MESSAGES[uiLanguage];
  const selectId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState<MenuName | null>(null);

  // A press outside the bar or Escape closes the open menu.
  useEffect(() => {
    if (open === null) return;
    const onPress = (event: PointerEvent) => {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target)) setOpen(null);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(null);
      rootRef.current?.querySelector<HTMLElement>(`[data-menu="${open}"]`)?.focus();
    };
    document.addEventListener("pointerdown", onPress);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPress);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Closing a menu unmounts the option that had focus, so focus goes back to the menu's button.
  const close = (name: MenuName) => {
    setOpen(null);
    rootRef.current?.querySelector<HTMLElement>(`[data-menu="${name}"]`)?.focus();
  };
  const languageOption = (option: "all" | NewsLanguage) =>
    option === "all" ? messages.allLanguagesLabel : messages.languageFilterLabels[option];
  const languageShort = filters.language === "all" ? NEWS_DICT.newsLanguageAllShort[uiLanguage] : filters.language.toUpperCase();
  const languageActive = filters.language !== "all";
  const kindText = [filters.kind !== "all" ? messages.kindLabels[filters.kind] : null, activePublisher].filter((part) => part !== null);
  const kindActive = kindText.length > 0;

  const trigger = (name: MenuName, active: boolean, label: string, children: ReactNode) => {
    const tone = MENU_TONES[name];
    return (
      <button
        type="button"
        data-menu={name}
        aria-expanded={open === name}
        aria-label={label}
        onClick={() => setOpen(open === name ? null : name)}
        className={`inline-flex min-h-8 min-w-0 max-w-full items-center gap-1.5 rounded-pill border px-2.5 text-sm font-medium text-ink transition-fast hover:bg-surface-inset pointer-coarse:min-h-11 ${
          active || open === name ? tone.active : `${tone.idle} bg-surface-raised`
        }`}
      >
        <LucideIcon icon={tone.icon} size={16} className={`shrink-0 ${tone.iconClass}`} />
        {children}
        <LucideIcon
          icon={ChevronDown}
          size={14}
          className={`shrink-0 text-ink-faint transition-transform ${open === name ? "rotate-180" : ""}`}
        />
      </button>
    );
  };

  const optionClass = (selected: boolean) =>
    `flex min-h-9 w-full items-center gap-2 rounded-sm px-2 text-left text-sm pointer-coarse:min-h-11 ${
      selected ? "bg-accent-soft font-medium text-accent-text" : "text-ink hover:bg-surface-raised"
    }`;

  return (
    <div ref={rootRef} role="group" aria-label={messages.filtersLabel}>
      <div className="flex flex-wrap items-center gap-2">
        {trigger(
          "language",
          languageActive,
          `${messages.languageTabsLabel}: ${languageOption(filters.language)}, ${formatCountIn(languageCounts[filters.language], uiLanguage)}`,
          <>
            <span>{languageShort}</span>
            <span aria-hidden="true" className="tabular-nums text-ink-muted">
              {formatCountIn(languageCounts[filters.language], uiLanguage)}
            </span>
          </>,
        )}
        {trigger(
          "kind",
          kindActive,
          kindActive ? `${NEWS_DICT.newsFilterMore[uiLanguage]}: ${kindText.join(", ")}` : NEWS_DICT.newsFilterMore[uiLanguage],
          <span className="min-w-0 truncate">{kindActive ? kindText.join(" · ") : NEWS_DICT.newsFilterMore[uiLanguage]}</span>,
        )}
      </div>

      {open === "language" ? (
        <div role="group" aria-label={messages.languageTabsLabel} className="mt-2 space-y-0.5 rounded-md border border-line bg-surface-inset p-1.5">
          {(["all", ...NEWS_LANGUAGES] as const).map((option) => {
            const selected = filters.language === option;
            return (
              <button
                key={option}
                type="button"
                aria-pressed={selected}
                onClick={() => {
                  update({ language: option, publisher: null });
                  close("language");
                }}
                className={optionClass(selected)}
              >
                <span className="flex size-4 shrink-0 items-center justify-center">
                  {selected ? <LucideIcon icon={Check} size={14} /> : null}
                </span>
                <span className="min-w-0 flex-1">{languageOption(option)}</span>
                <span className="tabular-nums text-ink-faint">{formatCountIn(languageCounts[option], uiLanguage)}</span>
              </button>
            );
          })}
        </div>
      ) : null}

      {open === "kind" ? (
        <div className="mt-2 space-y-3 rounded-md border border-line bg-surface-inset p-3">
          <div role="group" aria-label={messages.kindFilterLabel} className="flex flex-wrap gap-2">
            {(["all", ...PUBLISHER_KINDS] as const).map((option) => {
              const count = option === "all" ? rowCount : (kindCounts.get(option) ?? 0);
              if (option !== "all" && count === 0) return null;
              return (
                <button
                  key={option}
                  type="button"
                  aria-pressed={filters.kind === option}
                  onClick={() => update({ kind: option, publisher: null })}
                  className={pillClass(filters.kind === option)}
                >
                  {option === "all" ? messages.allKindsLabel : messages.kindLabels[option]}
                  <span className="ml-1.5 tabular-nums text-ink-faint">{formatCountIn(count, uiLanguage)}</span>
                </button>
              );
            })}
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <label htmlFor={selectId} className="font-medium text-ink-muted">
              {messages.publisherSelectLabel}
            </label>
            <select
              id={selectId}
              value={activePublisher ?? ALL_PUBLISHERS}
              onChange={(event) => update({ publisher: event.target.value === ALL_PUBLISHERS ? null : event.target.value })}
              className="min-h-9 min-w-0 max-w-full flex-1 rounded-sm border border-line bg-surface-raised px-2 text-sm text-ink pointer-coarse:min-h-11 sm:flex-none"
            >
              <option value={ALL_PUBLISHERS}>{messages.allPublishersLabel}</option>
              {publishers.map(([name, count]) => (
                <option key={name} value={name}>
                  {name} ({formatCountIn(count, uiLanguage)})
                </option>
              ))}
            </select>
          </div>
        </div>
      ) : null}
    </div>
  );
}
