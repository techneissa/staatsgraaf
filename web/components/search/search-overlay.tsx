"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import { useT } from "@/components/i18n/use-t";
import { prefersReducedMotion } from "@/lib/motion";
import { buildSearchIndex, rankSearch } from "@/lib/search";
import type { SearchIndex, SearchKind, SearchRecord } from "@/lib/search";

const MAX_RESULTS = 8;

type IndexStatus = "idle" | "loading" | "ready" | "error";

type SearchIndexFile = {
  version: number;
  records: SearchRecord[];
};

function SearchIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" width="15" height="15">
      <circle cx="8.5" cy="8.5" r="4.75" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="m12.2 12.2 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function SearchOverlay() {
  const router = useRouter();
  const t = useT("pages");
  const tg = useT("graph");
  const baseId = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const inputId = `${baseId}-input`;
  const listboxId = `${baseId}-listbox`;
  const labelId = `${baseId}-label`;

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(-1);
  const [index, setIndex] = useState<SearchIndex | null>(null);
  const [status, setStatus] = useState<IndexStatus>("idle");
  const [closing, setClosing] = useState(false);
  const closeTimer = useRef<number | null>(null);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const loadStarted = useRef(false);

  const kindLabels: Record<SearchKind, string> = {
    organization: t("kindOrganization"),
    position: t("kindPosition"),
    person: t("kindPerson"),
    topic: t("kindTopic"),
  };

  const loadIndex = useCallback(() => {
    if (loadStarted.current) return;
    loadStarted.current = true;
    setStatus("loading");
    fetch("/search-index.json")
      .then((response) => {
        if (!response.ok) throw new Error(String(response.status));
        return response.json() as Promise<SearchIndexFile>;
      })
      .then((data) => {
        setIndex(buildSearchIndex(data.records));
        setStatus("ready");
      })
      .catch(() => setStatus("error"));
  }, []);

  const openOverlay = useCallback(() => {
    if (closeTimer.current !== null) window.clearTimeout(closeTimer.current);
    closeTimer.current = null;
    setClosing(false);
    setOpen(true);
    loadIndex();
  }, [loadIndex]);

  // The dialog stays mounted, inert, for its short exit animation.
  const closeOverlay = useCallback((returnFocus = true) => {
    if (returnFocus) triggerRef.current?.focus();
    if (closeTimer.current !== null) return;
    setClosing(true);
    closeTimer.current = window.setTimeout(
      () => {
        closeTimer.current = null;
        setClosing(false);
        setOpen(false);
        setQuery("");
        setActive(-1);
      },
      prefersReducedMotion() ? 0 : 160,
    );
  }, []);

  useEffect(
    () => () => {
      if (closeTimer.current !== null) window.clearTimeout(closeTimer.current);
    },
    [],
  );

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const results = useMemo(() => {
    if (status !== "ready" || !index || query.trim() === "") return [];
    return rankSearch(index, query, MAX_RESULTS);
  }, [index, query, status]);

  useEffect(() => {
    setActive(results.length > 0 ? 0 : -1);
  }, [results]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeOverlay();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, closeOverlay]);

  const suggestedTopics = useMemo(() => {
    if (!index) return [];
    return index.entries.filter((entry) => entry.kind === "topic").slice(0, 6);
  }, [index]);

  const activeOptionId =
    active >= 0 && results[active] ? `${baseId}-option-${active}` : undefined;

  const statusMessage =
    status === "loading"
      ? t("searchLoading")
      : status === "error"
        ? t("searchUnavailable")
        : query.trim() !== ""
          ? results.length === 1
            ? t("searchResultOne", { n: results.length })
            : t("searchResultMany", { n: results.length })
          : "";

  function selectResult(href: string) {
    closeOverlay(false);
    router.push(href);
  }

  function onInputKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (results.length > 0) setActive((current) => (current + 1) % results.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      if (results.length > 0) setActive((current) => (current - 1 + results.length) % results.length);
    } else if (event.key === "Home") {
      event.preventDefault();
      if (results.length > 0) setActive(0);
    } else if (event.key === "End") {
      event.preventDefault();
      if (results.length > 0) setActive(results.length - 1);
    } else if (event.key === "Enter") {
      if (active >= 0 && results[active]) {
        event.preventDefault();
        selectResult(results[active].href);
      }
    } else if (event.key === "Tab") {
      closeOverlay();
    }
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label={t("searchTrigger")}
        aria-haspopup="dialog"
        aria-expanded={open && !closing}
        onClick={openOverlay}
        className="tap-target flex items-center justify-center gap-2 rounded-sm border border-line px-2.5 py-2 text-sm text-ink-muted transition-fast hover:border-line-strong hover:text-ink"
      >
        <SearchIcon />
        <span className="hidden sm:inline">{t("searchTrigger")}</span>
      </button>

      {open ? (
        <div
          className={`fixed inset-0 z-40 flex items-start justify-center overscroll-contain sm:px-4 sm:pt-16 ${closing ? "pointer-events-none" : ""}`}
          inert={closing}
        >
          <div
            aria-hidden="true"
            data-state={closing ? "closed" : "open"}
            className="motion-scrim absolute inset-0 bg-overlay"
            onClick={() => closeOverlay()}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label={t("searchDialogLabel")}
            data-state={closing ? "closed" : "open"}
            className="motion-pop relative w-full border-b border-line bg-surface pl-[var(--safe-left)] pr-[var(--safe-right)] pt-[var(--safe-top)] shadow-2xl sm:max-w-xl sm:rounded-md sm:border sm:p-0"
          >
            <div className="flex items-center gap-2 border-b border-line py-1.5 pl-3 pr-1.5 sm:py-2.5 sm:pr-3">
              <span className="text-ink-faint">
                <SearchIcon />
              </span>
              <label id={labelId} htmlFor={inputId} className="sr-only">
                {t("searchInputLabel")}
              </label>
              <input
                ref={inputRef}
                id={inputId}
                role="combobox"
                aria-expanded={open}
                aria-controls={listboxId}
                aria-activedescendant={activeOptionId}
                aria-autocomplete="list"
                aria-labelledby={labelId}
                autoComplete="off"
                spellCheck={false}
                placeholder={t("searchPlaceholder")}
                className="w-full bg-transparent text-base text-ink outline-none placeholder:text-ink-faint"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={onInputKeyDown}
              />
              <button
                type="button"
                aria-label={t("searchClose")}
                onClick={() => closeOverlay()}
                className="tap-target flex shrink-0 items-center justify-center rounded-sm px-2 py-1 text-xs text-ink-muted hover:text-ink"
              >
                <span aria-hidden="true" className="pointer-coarse:hidden">Esc</span>
                <span aria-hidden="true" className="hidden text-sm pointer-coarse:inline">{tg("searchCloseShort")}</span>
              </button>
            </div>

            <p role="status" aria-live="polite" className="sr-only">
              {statusMessage}
            </p>

            {status === "loading" ? (
              <p className="p-4 text-sm text-ink-faint">{t("searchLoadingInline")}</p>
            ) : status === "error" ? (
              <p className="p-4 text-sm text-ink-faint">
                {t("searchUnavailable")}{" "}
                <Link href="/onderwerpen/" onClick={() => closeOverlay(false)} className="underline">
                  {t("searchBrowseTopics")}
                </Link>
                .
              </p>
            ) : query.trim() === "" ? (
              <div className="p-4">
                {suggestedTopics.length > 0 ? (
                  <div>
                    <p className="text-xs font-semibold text-ink-faint">
                      {t("searchTopicsHeader")}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {suggestedTopics.map((topic) => (
                        <button
                          key={topic.id}
                          type="button"
                          onClick={() => setQuery(topic.label)}
                          className="tap-row rounded-pill border border-line px-2.5 py-1 text-xs text-ink-muted hover:border-line-strong hover:text-ink pointer-coarse:px-3.5 pointer-coarse:text-sm"
                        >
                          {topic.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : results.length === 0 ? (
              <p className="p-4 text-sm text-ink-faint">{t("searchNoResults")}</p>
            ) : (
              <div
                id={listboxId}
                role="listbox"
                aria-labelledby={labelId}
                className="max-h-[calc(100dvh-8rem-var(--safe-top))] overflow-y-auto overscroll-contain p-1 pb-[max(0.25rem,var(--safe-bottom))] sm:max-h-80 sm:pb-1"
              >
                {results.map((result, index) => (
                  <Link
                    key={result.id}
                    id={`${baseId}-option-${index}`}
                    role="option"
                    aria-selected={index === active}
                    href={result.href}
                    tabIndex={-1}
                    onMouseEnter={() => setActive(index)}
                    onClick={() => closeOverlay(false)}
                    className={`tap-row flex items-center justify-between gap-3 rounded-sm px-3 py-2 text-sm ${
                      index === active ? "bg-surface-raised text-ink" : "text-ink-muted"
                    }`}
                  >
                    {result.kind === "person" ? (
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-pill border border-line bg-surface-raised">
                        {result.image ? (
                          <img src={result.image} alt="" width={24} height={24} loading="lazy" className="h-full w-full object-cover" />
                        ) : (
                          <span aria-hidden="true" className="text-[10px] font-medium text-ink-faint">
                            {result.label.charAt(0)}
                          </span>
                        )}
                      </span>
                    ) : null}
                    <span className="min-w-0 flex-1 truncate">{result.label}</span>
                    {result.abbreviation ? (
                      <span className="shrink-0 text-xs text-ink-faint">{result.abbreviation}</span>
                    ) : null}
                    <span className="shrink-0 text-xs text-ink-faint">
                      {kindLabels[result.kind]}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
