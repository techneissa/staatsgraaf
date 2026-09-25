"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { PowerMapBundle, PowerNewsItem } from "@/lib/graph";
import type { Selection } from "@/lib/selection";
import type { PowerLink } from "@/lib/power-connections";
import { egoFits, rankOverview } from "@/lib/power-map-layout";
import { useT } from "@/components/i18n/use-t";
import { useLocale } from "@/components/i18n/language-provider";
import { useSelection } from "@/components/selection/selection-provider";
import {
  KIND_LABEL_KEY,
  entityInfo,
  focusLinks,
  formatDutchDate,
  groupViews,
  reasonViews,
  type EntityInfo,
  type FractieResolver,
  type NameResolver,
} from "./model";
import { EgoDiagram } from "./ego-diagram";
import { Overview } from "./overview";
import { TieList } from "./tie-list";
import { EntityMark, NewsRows, PartyChip, ProfileLink, SourceNote } from "./parts";

export type { FractieResolver, NameResolver } from "./model";

type Focus = { kind: "person" | "org"; id: string };

/** News rows under the diagram before the rest folds away. */
const NEWS_PREVIEW = 3;

/** The size of an element, followed as it changes. */
function useBoxSize<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const update = () => {
      const rect = element.getBoundingClientRect();
      setSize((current) =>
        Math.abs(current.width - rect.width) < 1 && Math.abs(current.height - rect.height) < 1
          ? current
          : { width: Math.round(rect.width), height: Math.round(rect.height) },
      );
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return [ref, size] as const;
}

/**
 * Verbanden (Connections), the canvas view with the internal id `power`: who
 * is tied to whom through office, cabinet, party and shared news. An adapter
 * of the selection store (docs/adr/0018): a pick focuses a person or body, a
 * news pick lights up whom it names, and "back" and Escape step back.
 *
 * Nothing picked: the most connected people, by role. A focus: an ego
 * network where the box is wide enough (lib/power-map-layout.ts egoFits),
 * otherwise the same groups as a list. Every tie shows its reason; the news
 * behind a tie links to the article.
 */
export function ConnectionsView({
  bundle,
  resolveName,
  fractieOf,
}: {
  bundle: PowerMapBundle;
  resolveName?: NameResolver;
  fractieOf?: FractieResolver;
}) {
  const t = useT("power");
  const locale = useLocale();
  const { current, previous, canGoBack, select, back, clear } = useSelection();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [bodyRef, box] = useBoxSize<HTMLDivElement>();
  const [newsOpen, setNewsOpen] = useState(false);

  /**
   * A person or body pick focuses the view; a news or topic pick keeps the
   * focus it was made in; anything else is the overview. Derived during
   * render from the store, not in an effect.
   */
  const focusOf = (selection: Selection | null, kept: Focus | null): Focus | null => {
    if (selection === null) return null;
    if (selection.kind === "person" || selection.kind === "org") return { kind: selection.kind, id: selection.id };
    if (selection.kind === "news" || selection.kind === "topic") return kept;
    return null;
  };
  const [focus, setFocus] = useState<Focus | null>(() => focusOf(current, null));
  const [seen, setSeen] = useState<Selection | null>(current);
  if (seen !== current) {
    setSeen(current);
    const next = focusOf(current, focus);
    if (next?.id !== focus?.id) {
      setFocus(next);
      setNewsOpen(false);
    }
  }
  const pickedNewsId = current?.kind === "news" ? current.id : null;

  const newsById = useMemo(() => new Map(bundle.news.map((item) => [item.id, item])), [bundle.news]);
  const infoCache = useMemo(() => new Map<string, EntityInfo>(), [bundle, locale, resolveName, fractieOf]);
  const infoOf = (id: string): EntityInfo => {
    let info = infoCache.get(id);
    if (!info) {
      info = entityInfo(id, bundle, locale, resolveName, fractieOf);
      infoCache.set(id, info);
    }
    return info;
  };
  const nameOf = (id: string) => infoOf(id).name;

  const focusId = focus?.id ?? null;
  const model = useMemo(() => {
    if (!focusId) return null;
    const ties = focusLinks(bundle, focusId, fractieOf);
    const reasonsOf = (link: PowerLink) => reasonViews(link, t, bundle, newsById, (id) => entityInfo(id, bundle, locale, resolveName).name, locale);
    const news = bundle.news.filter((item) => item.people.includes(focusId) || item.bodies.includes(focusId));
    return { ...groupViews(ties, reasonsOf), news, total: ties.length };
  }, [focusId, bundle, fractieOf, t, newsById, locale, resolveName]);

  // The cabinet group is named after the cabinet, the party group after its one fractie.
  const kindLabel = (kind: keyof typeof KIND_LABEL_KEY) =>
    kind === "cabinet" && bundle.kabinet
      ? bundle.kabinet.name
      : kind === "party" && model?.fractie
        ? t("reasonFractie", { fractie: model.fractie })
        : t(KIND_LABEL_KEY[kind]);

  const overview = useMemo(() => {
    const anchors = new Set(bundle.powerMap.people.map((entry) => entry.person));
    for (const link of bundle.links) {
      if (link.reasons.includes("kabinet")) {
        anchors.add(link.a);
        if (link.b.startsWith("person:")) anchors.add(link.b);
      }
    }
    return rankOverview(bundle.links, anchors, (id) => bundle.people[id]?.job ?? null);
  }, [bundle]);

  const pickedNews: PowerNewsItem | null = pickedNewsId ? newsById.get(pickedNewsId) ?? null : null;
  /**
   * Whom a picked news item names, among the people shown. When it names
   * nobody shown (only the focus, say) nothing is dimmed.
   */
  const highlighted = useMemo(() => {
    if (!pickedNews) return new Set<string>();
    const shown = new Set<string>(
      model ? model.groups.flatMap((group) => group.ties.map((tie) => tie.other)) : overview.flatMap((group) => group.people.map((entry) => entry.id)),
    );
    const named = [...pickedNews.people, ...pickedNews.bodies].filter((id) => shown.has(id));
    return new Set(named);
  }, [pickedNews, model, overview]);

  // Escape steps back through the store while the reader is in this view.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented || !current) return;
      const target = event.target as Node | null;
      if (!(rootRef.current?.contains(target) || target === document.body)) return;
      event.preventDefault();
      if (canGoBack) back();
      else clear();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [current, canGoBack, back, clear]);

  const pick = (id: string) => {
    if (id.startsWith("org:")) select({ kind: "org", id, surface: "power" });
    else select({ kind: "person", id, surface: "power" });
  };
  const pickNews = (id: string) => {
    if (id === pickedNewsId) back();
    else select({ kind: "news", id, surface: "power" });
  };

  const map = bundle.powerMap;
  const sourceText =
    map.sources.length > 0 && map.since && map.asOf
      ? t("sourceNote", { outlets: map.sources.length, since: formatDutchDate(map.since), until: formatDutchDate(map.asOf) })
      : t("sourceNoteNoNews");

  const previousName =
    previous && (previous.kind === "person" || previous.kind === "org")
      ? nameOf(previous.id)
      : previous?.kind === "news"
        ? newsById.get(previous.id)?.title ?? null
        : null;

  const focusInfo = focus ? infoOf(focus.id) : null;
  const newsFocus = !focus && pickedNews ? pickedNews : null;
  const diagram = Boolean(model && focusInfo && model.total > 0 && egoFits(box.width, box.height));
  const emptyOverview = !focus && !newsFocus && overview.length === 0;

  const toolbar = current ? (
    <div className="flex shrink-0 items-center gap-2 px-3 pt-2 sm:px-4">
      {canGoBack ? (
        <button
          type="button"
          onClick={back}
          aria-label={previousName ? t("powerBackTo", { name: previousName }) : t("powerBack")}
          title={previousName ? t("powerBackTo", { name: previousName }) : undefined}
          className="tap-target flex items-center gap-1 rounded-sm border border-line bg-surface px-2 py-1 text-xs font-medium text-ink-muted hover:border-line-strong hover:text-ink"
        >
          <svg aria-hidden="true" viewBox="0 0 20 20" width="12" height="12">
            <path d="M12.5 4.5 7 10l5.5 5.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {t("powerBack")}
        </button>
      ) : null}
      <button
        type="button"
        onClick={clear}
        className="tap-target rounded-sm border border-line bg-surface px-2 py-1 text-xs font-medium text-ink-muted hover:border-line-strong hover:text-ink"
      >
        {t("overview")}
      </button>
    </div>
  ) : null;

  const newsBlock = (items: readonly PowerNewsItem[], preview: boolean) =>
    items.length === 0 ? null : (
      <section aria-labelledby="verbanden-nieuws" className="min-w-0">
        <h3 id="verbanden-nieuws" className="mb-0.5 flex items-baseline gap-2 text-xs font-semibold text-ink-muted">
          {t("inNews")}
          <span className="font-normal text-ink-faint">{items.length}</span>
        </h3>
        <NewsRows
          items={preview && !newsOpen ? items.slice(0, NEWS_PREVIEW) : items}
          picked={pickedNewsId}
          locale={locale}
          onPick={pickNews}
          clamp={preview ? 1 : 2}
        />
        {preview && items.length > NEWS_PREVIEW ? (
          <button
            type="button"
            aria-expanded={newsOpen}
            onClick={() => setNewsOpen((open) => !open)}
            className="tap-row rounded-sm px-2 py-1 text-xs font-medium text-accent-text hover:underline"
          >
            {newsOpen ? t("showFewer") : t("showAll", { n: items.length })}
          </button>
        ) : null}
      </section>
    );

  return (
    <div
      ref={rootRef}
      role="region"
      aria-label={focusInfo ? t("focusAria", { name: focusInfo.name }) : newsFocus ? t("newsFocusAria") : t("overviewAria")}
      className="flex h-full min-h-0 w-full flex-col"
    >
      <style>{`
        @keyframes verbanden-in { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: none; } }
        .verbanden-in { animation: verbanden-in 180ms var(--t-ease-standard, ease-out) both; }
        @media (prefers-reduced-motion: reduce) { .verbanden-in { animation: none; } }
      `}</style>
      {toolbar}

      <div ref={bodyRef} className="relative min-h-0 flex-1">
        <div key={focusId ?? newsFocus?.id ?? "overview"} className={`verbanden-in absolute inset-0 ${diagram ? "" : "overflow-y-auto overscroll-contain"}`}>
          {emptyOverview ? (
            <div className="flex h-full items-center justify-center p-6">
              <div className="max-w-sm text-center">
                <p className="text-sm font-medium text-ink">{t("emptyTitle")}</p>
                <p className="mt-2 text-sm text-ink-faint">{t("emptyBody")}</p>
              </div>
            </div>
          ) : null}

          {!focus && !newsFocus && !emptyOverview ? (
            <Overview groups={overview} infoOf={infoOf} highlighted={highlighted} onPick={pick} />
          ) : null}

          {newsFocus ? (
            <div className="flex flex-col gap-3 px-3 py-3 sm:px-4">
              <NewsRows items={[newsFocus]} picked={newsFocus.id} locale={locale} onPick={pickNews} clamp={2} />
              <ul>
                {[...newsFocus.people, ...newsFocus.bodies].map((id) => {
                  const info = infoOf(id);
                  return (
                    <li key={id} className="border-t border-line">
                      <button
                        type="button"
                        onClick={() => pick(id)}
                        className="tap-row flex w-full min-w-0 items-center gap-2.5 rounded-sm px-1 py-1.5 text-left hover:bg-surface-raised"
                      >
                        <EntityMark info={info} size={36} />
                        <span className="flex min-w-0 flex-1 flex-col">
                          <span className="flex min-w-0 items-center gap-1.5">
                            <span className="truncate text-sm font-medium text-ink">{info.name}</span>
                            <PartyChip info={info} />
                          </span>
                          {info.meta ? <span className="truncate text-xs text-ink-faint">{info.meta}</span> : null}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}

          {focusInfo && model && diagram ? (
            <EgoDiagram
              width={box.width}
              height={box.height}
              raw={model.raw}
              groups={model.groups}
              focus={focusInfo}
              infoOf={infoOf}
              labelOf={kindLabel}
              highlighted={highlighted}
              onPick={pick}
            />
          ) : null}

          {focusInfo && model && !diagram ? (
            <div className="flex flex-col gap-3 px-3 py-3 sm:px-4">
              <header className="flex min-w-0 items-center gap-3">
                <EntityMark info={focusInfo} size={52} />
                <div className="flex min-w-0 flex-1 flex-col">
                  <h3 className="truncate text-base font-semibold text-ink">{focusInfo.name}</h3>
                  {focusInfo.meta ? <p className="line-clamp-2 text-xs text-ink-faint">{focusInfo.meta}</p> : null}
                  <p className="mt-0.5 flex items-center gap-2 text-xs text-ink-muted">
                    <PartyChip info={focusInfo} />
                    {model.total === 1 ? t("tieCount1") : t("tieCount", { n: model.total })}
                  </p>
                </div>
                <ProfileLink info={focusInfo} />
              </header>
              {model.total === 0 ? <p className="text-sm text-ink-faint">{t("noTies")}</p> : null}
              <TieList groups={model.groups} infoOf={infoOf} labelOf={kindLabel} highlighted={highlighted} onPick={pick} />
              {newsBlock(model.news, false)}
            </div>
          ) : null}
        </div>
      </div>

      {diagram && model && model.news.length > 0 ? (
        <div className={`shrink-0 border-t border-line px-3 pt-2 sm:px-4 ${newsOpen ? "max-h-[45%] overflow-y-auto overscroll-contain" : ""}`}>
          {newsBlock(model.news, true)}
        </div>
      ) : null}

      <div className="shrink-0 border-t border-line">
        <SourceNote text={sourceText} />
      </div>
    </div>
  );
}
