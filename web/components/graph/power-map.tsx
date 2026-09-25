"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent, MouseEvent as ReactMouseEvent } from "react";
import { useRouter } from "next/navigation";
import type { PowerMapBundle, PowerMapPerson, PowerNewsItem } from "@/lib/graph";
import type { Selection } from "@/lib/selection";
import { connectionsOf, type PowerLink } from "@/lib/power-connections";
import { useT } from "@/components/i18n/use-t";
import { useLocale } from "@/components/i18n/language-provider";
import { useSelection } from "@/components/selection/selection-provider";
import { partyByDataset } from "@/lib/parties";
import { positionEn } from "@/lib/name-gloss";
import { branchColorVar } from "@/lib/branch-colors";
import { initialsFor } from "@/lib/initials";
import {
  NEWS_BUBBLE_RADIUS,
  layoutPowerMap,
  placeNewsBubbles,
  powerMapLinkPath,
  powerMapMeta,
  POWER_HUB_RADIUS,
  type PowerMapCard,
} from "@/lib/power-map-layout";

/** A name for an id the power bundle does not carry, from the graph bundle (bodies, seated members). */
export type NameResolver = (id: string) => { name: string; image: string | null; slug: string | null } | null;

type PowerMapViewProps = {
  bundle: PowerMapBundle;
  resolveName?: NameResolver;
};

const VIEW_MARGIN = 24;
const VIEW_TOP_EXTRA = 64;
/** Most ties drawn around a focus. */
const FOCUS_LIMIT = 12;
const dayMs = 86_400_000;

type Focus = { kind: "person" | "org"; id: string };

function recencyDays(date: string | null, reference: string | null): number | null {
  if (!date) return null;
  const end = reference ? reference.slice(0, 10) : new Date().toISOString().slice(0, 10);
  const parsed = Date.parse(end);
  const since = Date.parse(date);
  if (Number.isNaN(parsed) || Number.isNaN(since)) return null;
  return Math.round((parsed - since) / dayMs);
}

function wrapCentreLabel(text: string, maxLength: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= maxLength || !current) current = candidate;
    else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function jobFor(job: string | null, locale: "nl" | "en"): string | null {
  if (locale !== "en" || !job) return job ?? null;
  return positionEn(job) ?? job;
}

function formatDate(iso: string | null): string {
  if (!iso) return "";
  const [year, month, day] = iso.split("-");
  if (!year || !month || !day) return iso;
  // The site writes dates as dd-MM-YYYY in both languages (AGENTS.md rule 8).
  return `${day}-${month}-${year}`;
}

/**
 * The power map (machtskaart), an adapter of the selection store.
 *
 * At rest it ranks the people most in the news around the electorate, with the
 * news items that name them as small bubbles on their shoulder. Picking a
 * profile or a body focuses the map on it: the pick moves to the centre and its
 * strongest ties (lib/power-connections.ts, built from news, fracties, the
 * cabinet and positions) sit around it, each line drawn only for that focus.
 * Picking a bubble picks the news item and draws its lines to the people and
 * bodies it names. The way back is the store's: the back control, or Escape.
 */
export function PowerMapView({ bundle, resolveName }: PowerMapViewProps) {
  const t = useT("power");
  const tc = useT("common");
  const locale = useLocale();
  const router = useRouter();
  const { current, previous, canGoBack, select, back, clear } = useSelection();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const powerMap = bundle.powerMap;
  const reference = powerMap.asOf ?? powerMap.computedAt ?? null;

  /**
   * What the map is centred on. A person or body pick focuses it; a news or
   * topic pick keeps the focus it was made in, so a bubble picked inside a
   * focus lights up there; nothing picked is the whole map. Following a
   * derived value by adjusting state during render, not in an effect.
   */
  const focusOf = (selection: Selection | null, kept: Focus | null): Focus | null => {
    if (selection === null) return null;
    if (selection.kind === "person") return { kind: "person", id: selection.id };
    if (selection.kind === "org") return { kind: "org", id: selection.id };
    if (selection.kind === "news" || selection.kind === "topic") return kept;
    return null;
  };
  const [focus, setFocus] = useState<Focus | null>(() => focusOf(current, null));
  const [seen, setSeen] = useState<Selection | null>(current);
  if (seen !== current) {
    setSeen(current);
    const next = focusOf(current, focus);
    if (next?.id !== focus?.id) setFocus(next);
  }
  const selectedNews = current?.kind === "news" ? current.id : null;

  const personOf = (id: string) => bundle.people[id] ?? null;
  const bodyOf = (id: string) => bundle.bodies[id] ?? null;
  const nameOf = (id: string): string => personOf(id)?.name ?? bodyOf(id)?.name ?? resolveName?.(id)?.name ?? id;

  const reasonText = (link: PowerLink): string => {
    const parts: string[] = [];
    for (const reason of link.reasons) {
      if (reason === "news") parts.push(link.newsCount === 1 ? t("reasonNews1") : t("reasonNews", { n: link.newsCount ?? 0 }));
      else if (reason === "tenure") parts.push(t("reasonTenure"));
      else if (reason === "kabinet") parts.push(bundle.kabinet?.name ?? t("reasonKabinet"));
      else if (reason === "fractie") parts.push(t("reasonFractie", { fractie: link.fractie ?? "" }));
      else if (reason === "organisation")
        parts.push((link.orgs?.length ?? 0) > 1 ? t("reasonOrganisations", { n: link.orgs?.length ?? 0 }) : t("reasonOrganisation"));
    }
    return parts.join(", ");
  };

  /** The cards on the map: the ranking at rest, or the focus's ties. */
  const scene = useMemo(() => {
    if (!focus) {
      return { people: powerMap.people, links: new Map<string, PowerLink>() };
    }
    const ties = connectionsOf(bundle.links, focus.id, FOCUS_LIMIT);
    const links = new Map<string, PowerLink>();
    const people: PowerMapPerson[] = ties.map(({ other, link }, index) => {
      links.set(other, link);
      const person = bundle.people[other];
      const body = bundle.bodies[other];
      return {
        person: other,
        slug: person?.slug ?? body?.slug ?? null,
        name: person?.name ?? body?.name ?? other,
        job: person?.job ?? null,
        position: null,
        party: person?.party ?? null,
        node: null,
        image: person?.image ?? null,
        rank: index + 1,
        total: 0,
        recent: 0,
        weeks: [],
        heat: link.weight,
        latest: { date: null, headline: null, source: null, url: null },
      };
    });
    return { people, links };
  }, [focus, bundle, powerMap.people]);

  const { cards, bounds } = useMemo(
    () =>
      layoutPowerMap(scene.people, locale, focus ? (person) => {
        const link = scene.links.get(person.person);
        return link ? reasonText(link) : "";
      } : undefined),
    // reasonText reads the locale's strings (t) and the bundle's cabinet.
    [scene, locale, focus, t, bundle.kabinet],
  );

  const focusId = focus?.id ?? null;
  const cardById = useMemo(() => new Map(cards.map((card) => [card.person.person, card])), [cards]);

  /** The news items this map shows: all of them at rest, the focus's own around a focus. */
  const bubbles = useMemo(() => {
    const items = focusId
      ? bundle.news.filter((item) => item.people.includes(focusId) || item.bodies.includes(focusId))
      : bundle.news;
    const anchors = [
      ...(focusId ? [{ id: focusId, x: 0, y: 0, radius: POWER_HUB_RADIUS }] : []),
      ...cards.map((card) => ({ id: card.person.person, x: card.x, y: card.y, radius: card.radius })),
    ];
    // Around a focus a shared item sits with the neighbour it names, so the hub is the last resort.
    const ordered = focusId ? [...anchors.slice(1), anchors[0]] : anchors;
    return placeNewsBubbles(ordered, items);
  }, [bundle.news, cards, focusId]);
  const newsById = useMemo(() => new Map(bundle.news.map((item) => [item.id, item])), [bundle.news]);
  const pickedNews: PowerNewsItem | null = selectedNews ? newsById.get(selectedNews) ?? null : null;
  const pickedBubble = selectedNews ? bubbles.find((bubble) => bubble.id === selectedNews) ?? null : null;

  // Escape steps back through the store when the reader is on the map.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented || !current) return;
      const target = event.target as Node | null;
      const inside = containerRef.current?.contains(target) || target === document.body;
      if (!inside) return;
      event.preventDefault();
      if (canGoBack) back();
      else clear();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [current, canGoBack, back, clear]);

  const pickEntity = (id: string) => {
    if (id.startsWith("org:")) select({ kind: "org", id, surface: "power" });
    else select({ kind: "person", id, surface: "power" });
  };
  const openPage = (id: string) => {
    const person = personOf(id);
    const body = bodyOf(id);
    const slug = person?.slug ?? body?.slug ?? resolveName?.(id)?.slug ?? null;
    if (!slug) return;
    router.push(id.startsWith("org:") ? `/organisaties/${slug}/` : `/personen/${slug}/`);
  };
  const onCardKey = (event: ReactKeyboardEvent, id: string) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (event.key === "Enter" && id === focusId) openPage(id);
      else pickEntity(id);
    }
  };

  const articlesInWindow = powerMap.articleCount === 1 ? t("powerMapArticle1") : tc("articlesCount", { n: powerMap.articleCount });

  if (!focus && powerMap.people.length === 0) {
    const windowDays = tc("windowDays", { days: powerMap.windowDays });
    const since = powerMap.since ? t("powerMapEmptySince", { since: powerMap.since }) : "";
    return (
      <div className="flex h-full min-h-0 items-center justify-center p-6">
        <div className="max-w-sm text-center">
          <p className="text-sm font-medium text-ink">{t("powerMapEmptyTitle")}</p>
          <p className="mt-2 text-sm text-ink-faint">{t("powerMapEmptyBody")}</p>
          <p className="mt-3 text-xs text-ink-faint">{t("powerMapEmptyWindow", { days: windowDays, articles: articlesInWindow, since })}</p>
        </div>
      </div>
    );
  }

  const viewBox = [
    Math.round(bounds.minX - VIEW_MARGIN),
    Math.round(bounds.minY - VIEW_MARGIN - VIEW_TOP_EXTRA),
    Math.round(bounds.maxX - bounds.minX + VIEW_MARGIN * 2),
    Math.round(bounds.maxY - bounds.minY + VIEW_MARGIN * 2 + VIEW_TOP_EXTRA),
  ].join(" ");

  const focusPerson = focus?.kind === "person" ? personOf(focus.id) : null;
  const focusResolved = focus ? resolveName?.(focus.id) ?? null : null;
  const focusName = focus ? nameOf(focus.id) : "";
  const focusImage = focusPerson?.image ?? focusResolved?.image ?? null;
  const focusBody = focus?.kind === "org" ? bodyOf(focus.id) : null;
  const centreLines = wrapCentreLabel(focus ? (focusImage ? "" : focusName) : t("powerMapCenterLabel"), 14).filter(Boolean);

  const subtitle = focus
    ? cards.length === 0
      ? t("powerFocusEmpty")
      : cards.length === 1
        ? t("powerFocusSubtitle1")
        : t("powerFocusSubtitle", { n: cards.length })
    : powerMap.sources.length > 0
      ? t("powerMapSubtitle", { people: cards.length, articles: articlesInWindow, sources: powerMap.sources.length, days: powerMap.windowDays })
      : t("powerMapSubtitleNoSources", { people: cards.length, articles: articlesInWindow, days: powerMap.windowDays });

  const previousName =
    previous && (previous.kind === "person" || previous.kind === "org" || previous.kind === "news")
      ? previous.kind === "news"
        ? newsById.get(previous.id)?.title ?? null
        : nameOf(previous.id)
      : null;

  /** Where a card or the hub is, for the lines of a picked news item. */
  const pointOf = (id: string): { x: number; y: number; r: number } | null => {
    if (id === focusId) return { x: 0, y: 0, r: POWER_HUB_RADIUS };
    const card = cardById.get(id);
    return card ? { x: card.x, y: card.y, r: card.radius } : null;
  };
  const newsTargets = pickedNews ? [...pickedNews.people, ...pickedNews.bodies] : [];
  const onMap = new Set(newsTargets.filter((id) => pointOf(id) !== null));
  const offMap = newsTargets.filter((id) => !onMap.has(id));
  const newsTitle = (item: PowerNewsItem) => (locale === "en" && item.titleEn ? item.titleEn : item.title);

  const hubStroke = focus ? "var(--t-color-accent)" : "var(--t-color-line-strong)";

  return (
    <div ref={containerRef} className="relative h-full min-h-0 w-full">
      <div className="pointer-events-none absolute inset-x-4 top-3 text-center">
        <p className="text-xs font-semibold text-ink-muted">{focus ? focusName : t("powerMapTitle")}</p>
        <p className="mt-1 text-xs text-ink-faint">{subtitle}</p>
      </div>

      {current ? (
        <div className="absolute left-[max(0.75rem,var(--safe-left))] top-3 z-10 flex flex-col items-start gap-1">
          {canGoBack ? (
            <button
              type="button"
              onClick={back}
              aria-label={previousName ? t("powerBackTo", { name: previousName }) : t("powerBack")}
              title={previousName ? t("powerBackTo", { name: previousName }) : undefined}
              className="tap-target flex max-w-[14rem] items-center gap-1 rounded-sm border border-line bg-surface px-2 py-1 text-xs font-medium text-ink-muted hover:border-line-strong hover:text-ink"
            >
              <svg aria-hidden="true" viewBox="0 0 20 20" width="12" height="12">
                <path d="M12.5 4.5 7 10l5.5 5.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="truncate">{t("powerBack")}</span>
            </button>
          ) : null}
          <button
            type="button"
            onClick={clear}
            className="tap-target rounded-sm border border-line bg-surface px-2 py-1 text-xs font-medium text-ink-muted hover:border-line-strong hover:text-ink"
          >
            {t("powerWholeMap")}
          </button>
        </div>
      ) : null}

      <svg
        viewBox={viewBox}
        role="group"
        aria-label={focus ? t("powerFocusAria", { name: focusName }) : t("powerMapAria")}
        className="h-full w-full"
        onClick={(event) => {
          // A click on empty map lets a picked news item go, back to the focus it was picked in.
          if (event.target === event.currentTarget && selectedNews) back();
        }}
      >
        <style>{`
          .power-map-card { transition: transform var(--t-duration-base) var(--t-ease-standard); }
          .power-map-card:hover { transform: translateY(-3px); }
          @media (prefers-reduced-motion: reduce) { .power-map-card:hover { transform: none; } }
        `}</style>
        <defs>
          {[...new Set([...cards.map((card) => card.radius), POWER_HUB_RADIUS])].map((radius) => (
            <clipPath key={radius} id={`power-map-portrait-clip-${radius}`}>
              <circle r={radius} />
            </clipPath>
          ))}
        </defs>

        {/* The lines: to the hub at rest; around a focus, its ties, weighted by strength. */}
        <g aria-hidden="true" pointerEvents="none">
          {cards.map((card) => {
            const link = scene.links.get(card.person.person);
            if (focus && link) {
              return (
                <path
                  key={`link-${card.person.person}`}
                  d={powerMapLinkPath(card.x, card.y)}
                  fill="none"
                  stroke="var(--t-color-accent-text)"
                  strokeWidth={Math.min(2.4, 0.8 + link.weight * 0.6)}
                  strokeDasharray={link.reasons.includes("news") || link.reasons.includes("tenure") ? undefined : "3 3"}
                  opacity={pickedNews ? 0.2 : 0.6}
                />
              );
            }
            return (
              <path
                key={`link-${card.person.person}`}
                d={powerMapLinkPath(card.x, card.y)}
                fill="none"
                stroke="var(--t-color-line-strong)"
                strokeWidth={card.person.recent > 0 ? 0.9 : 0.7}
                opacity={pickedNews ? 0.1 : card.person.rank <= 3 ? 0.4 : 0.22}
              />
            );
          })}
        </g>

        {/* The hub: the electorate at rest, the focus when one is picked. */}
        <g
          role={focus ? "button" : undefined}
          tabIndex={focus ? 0 : undefined}
          aria-label={focus ? t("powerMapOpenPersonName", { name: focusName }) : undefined}
          className={focus ? "cursor-pointer" : undefined}
          onDoubleClick={focus ? () => openPage(focus.id) : undefined}
          onKeyDown={focus ? (event) => onCardKey(event, focus.id) : undefined}
        >
          <circle
            r={POWER_HUB_RADIUS}
            fill="var(--t-color-surface-raised)"
            stroke={focusBody ? branchColorVar(focusBody.branch) : hubStroke}
            strokeWidth={focus ? 2 : 1}
          />
          {focusImage ? (
            <image
              href={focusImage}
              x={-POWER_HUB_RADIUS}
              y={-POWER_HUB_RADIUS}
              width={POWER_HUB_RADIUS * 2}
              height={POWER_HUB_RADIUS * 2}
              clipPath={`url(#power-map-portrait-clip-${POWER_HUB_RADIUS})`}
              preserveAspectRatio="xMidYMid slice"
            />
          ) : (
            <circle r={POWER_HUB_RADIUS - 5} fill="none" stroke="var(--t-color-accent)" strokeOpacity={0.35} strokeWidth={1.25} />
          )}
          <g aria-hidden="true" pointerEvents="none">
            {centreLines.map((line, index) => (
              <text
                key={line}
                y={index * 12 - (centreLines.length - 1) * 6}
                textAnchor="middle"
                dominantBaseline="central"
                fill="var(--t-color-ink)"
                style={{ fontSize: 11, fontWeight: 600 }}
              >
                {line}
              </text>
            ))}
            <text y={POWER_HUB_RADIUS + 15} textAnchor="middle" fill="var(--t-color-ink-faint)" style={{ fontSize: 10 }}>
              {focus
                ? focusImage
                  ? focusName
                  : jobFor(focusPerson?.job ?? null, locale) ?? ""
                : t("powerMapCentreSubtitle")}
            </text>
            {focus && focusImage && focusPerson?.job ? (
              <text y={POWER_HUB_RADIUS + 28} textAnchor="middle" fill="var(--t-color-ink-faint)" style={{ fontSize: 9.5 }}>
                {jobFor(focusPerson.job, locale)}
              </text>
            ) : null}
          </g>
        </g>

        {cards.map((card) => (
          <PowerCard
            key={card.person.person}
            card={card}
            locale={locale}
            reference={reference}
            link={scene.links.get(card.person.person) ?? null}
            thirdLine={focus ? reasonText(scene.links.get(card.person.person) as PowerLink) : null}
            body={bodyOf(card.person.person)}
            named={onMap.has(card.person.person)}
            dimmed={Boolean(pickedNews) && !onMap.has(card.person.person)}
            articleLine={(n) => (n === 1 ? t("powerMapArticle1") : tc("articlesCount", { n }))}
            inNewsLine={(when) => tc("inTheNews", { when: when <= 0 ? tc("todayLabel") : `${when}${tc("daysAgoSuffix")}` })}
            onPick={() => pickEntity(card.person.person)}
            onOpen={() => openPage(card.person.person)}
            onKeyDown={(event) => onCardKey(event, card.person.person)}
          />
        ))}

        {/* A picked news item: lines to what it names, only for this pick. */}
        {pickedNews && pickedBubble ? (
          <g aria-hidden="true" pointerEvents="none">
            {[...onMap].map((id) => {
              const at = pointOf(id);
              if (!at) return null;
              const dx = at.x - pickedBubble.x;
              const dy = at.y - pickedBubble.y;
              const length = Math.hypot(dx, dy) || 1;
              const end = { x: at.x - (dx / length) * (at.r + 3), y: at.y - (dy / length) * (at.r + 3) };
              return (
                <line
                  key={`news-line-${id}`}
                  x1={pickedBubble.x}
                  y1={pickedBubble.y}
                  x2={end.x}
                  y2={end.y}
                  stroke="var(--t-color-accent)"
                  strokeWidth={1.3}
                  strokeLinecap="round"
                />
              );
            })}
          </g>
        ) : null}

        {/* News bubbles: one per item, on the shoulder of the first card it names. */}
        <g>
          {bubbles.map((bubble) => {
            const item = newsById.get(bubble.id);
            if (!item) return null;
            const picked = bubble.id === selectedNews;
            const label = t("newsBubble", {
              title: newsTitle(item),
              publisher: item.publisher ?? "",
              date: formatDate(item.date),
            });
            return (
              <g
                key={bubble.id}
                role="button"
                tabIndex={0}
                aria-label={label}
                aria-pressed={picked}
                className="cursor-pointer"
                onClick={(event: ReactMouseEvent) => {
                  event.stopPropagation();
                  if (picked) back();
                  else select({ kind: "news", id: bubble.id, surface: "power" });
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    if (picked) back();
                    else select({ kind: "news", id: bubble.id, surface: "power" });
                  }
                }}
                opacity={pickedNews && !picked ? 0.35 : 1}
              >
                <title>{label}</title>
                <circle cx={bubble.x} cy={bubble.y} r={NEWS_BUBBLE_RADIUS + 5} fill="transparent" />
                <circle
                  cx={bubble.x}
                  cy={bubble.y}
                  r={picked ? NEWS_BUBBLE_RADIUS + 1.5 : NEWS_BUBBLE_RADIUS}
                  fill={picked ? "var(--t-color-accent)" : "var(--t-color-surface-raised)"}
                  stroke={picked ? "var(--t-color-accent)" : "var(--t-color-ink-muted)"}
                  strokeWidth={1}
                />
              </g>
            );
          })}
        </g>

        {/* What a picked item names that is not on the map: pills beside the bubble. */}
        {pickedNews && pickedBubble && offMap.length > 0 ? (
          <g>
            {offMap.slice(0, 6).map((id, index) => {
              const name = nameOf(id);
              const width = Math.min(220, name.length * 5.6 + 16);
              const x = pickedBubble.x + 18;
              const y = pickedBubble.y - ((Math.min(offMap.length, 6) - 1) * 20) / 2 + index * 20;
              const color = id.startsWith("org:") && bodyOf(id) ? branchColorVar(bodyOf(id)!.branch) : "var(--t-color-line-strong)";
              return (
                <g
                  key={`off-${id}`}
                  role="button"
                  tabIndex={0}
                  aria-label={name}
                  className="cursor-pointer"
                  onClick={(event: ReactMouseEvent) => {
                    event.stopPropagation();
                    pickEntity(id);
                  }}
                  onKeyDown={(event) => onCardKey(event, id)}
                >
                  <line x1={pickedBubble.x} y1={pickedBubble.y} x2={x} y2={y} stroke="var(--t-color-accent)" strokeWidth={1} aria-hidden="true" />
                  <rect x={x} y={y - 8} width={width} height={16} rx={8} fill="var(--t-color-surface)" stroke={color} strokeWidth={1} />
                  <text x={x + 8} y={y} dominantBaseline="central" fill="var(--t-color-ink)" style={{ fontSize: 10, fontWeight: 500 }}>
                    {name.length > 38 ? `${name.slice(0, 37)}…` : name}
                  </text>
                </g>
              );
            })}
          </g>
        ) : null}
      </svg>

      <ol aria-label={focus ? focusName : t("powerMapTitle")} className="sr-only">
        {cards.map((card) => {
          const person = card.person;
          const link = scene.links.get(person.person);
          const job = jobFor(person.job, locale);
          return (
            <li key={person.person}>
              {person.rank}. {person.name}
              {person.party ? `, ${person.party}` : ""}
              {job ? `, ${job}` : ""}.{" "}
              {link ? reasonText(link) : person.total === 1 ? t("powerMapArticle1") : tc("articlesCount", { n: person.total })}.
              {!link && person.latest.date ? ` ${t("powerMapLastItem", { date: person.latest.date })}` : ""}
            </li>
          );
        })}
      </ol>
      {pickedNews ? (
        <p className="sr-only" aria-live="polite">
          {newsTitle(pickedNews)}. {t("newsMentions", { names: newsTargets.map(nameOf).join(", ") })}
        </p>
      ) : null}
    </div>
  );
}

/** One profile or body on the map; a click picks it, a double click opens its page. */
function PowerCard({
  card,
  locale,
  reference,
  link,
  thirdLine,
  body,
  named,
  dimmed,
  articleLine,
  inNewsLine,
  onPick,
  onOpen,
  onKeyDown,
}: {
  card: PowerMapCard;
  locale: "nl" | "en";
  reference: string | null;
  link: PowerLink | null;
  thirdLine: string | null;
  body: { name: string; branch: import("@/lib/types").OrgBranch } | null;
  named: boolean;
  dimmed: boolean;
  articleLine: (n: number) => string;
  inNewsLine: (when: number) => string;
  onPick: () => void;
  onOpen: () => void;
  onKeyDown: (event: ReactKeyboardEvent) => void;
}) {
  const person = card.person;
  const ring = body ? branchColorVar(body.branch) : partyByDataset(person.party)?.color ?? "var(--t-color-line-strong)";
  const when = recencyDays(person.latest.date ?? null, reference);
  const job = jobFor(person.job, locale);
  const countLine =
    thirdLine ??
    (person.recent > 0 && when !== null ? inNewsLine(when) : articleLine(person.total));
  const accentLine = link ? link.reasons.includes("news") : person.recent > 0;
  return (
    <g transform={`translate(${card.x} ${card.y})`} opacity={dimmed ? 0.4 : 1}>
      <g
        role="button"
        tabIndex={0}
        aria-label={person.name}
        className="power-map-card cursor-pointer"
        onClick={(event) => {
          event.stopPropagation();
          onPick();
        }}
        onDoubleClick={(event) => {
          event.stopPropagation();
          onOpen();
        }}
        onKeyDown={onKeyDown}
      >
        <title>
          {person.name}
          {person.party ? `, ${person.party}` : ""}
          {job ? `, ${job}` : ""}. {countLine}.
        </title>
        {named ? <circle r={card.radius + 4} fill="none" stroke="var(--t-color-accent)" strokeWidth={1.6} /> : null}
        {body ? (
          <rect
            x={-card.radius}
            y={-card.radius}
            width={card.radius * 2}
            height={card.radius * 2}
            rx={card.radius * 0.3}
            fill={`color-mix(in srgb, ${ring} 18%, var(--t-color-surface-raised))`}
            stroke={ring}
            strokeWidth={1.5}
          />
        ) : (
          <circle r={card.radius} fill="var(--t-color-surface-raised)" stroke={ring} strokeWidth={person.rank <= 3 ? 2 : 1.5} />
        )}
        {person.image && !body ? (
          <image
            href={person.image}
            x={-card.radius}
            y={-card.radius}
            width={card.radius * 2}
            height={card.radius * 2}
            clipPath={`url(#power-map-portrait-clip-${card.radius})`}
            preserveAspectRatio="xMidYMid slice"
          />
        ) : (
          <text
            textAnchor="middle"
            dominantBaseline="central"
            fill="var(--t-color-ink-muted)"
            style={{ fontSize: card.radius * 0.6, fontWeight: 600 }}
          >
            {initialsFor(person.name)}
          </text>
        )}
        <text y={card.labelTop} textAnchor="middle" fill="var(--t-color-ink)" style={{ fontSize: 12, fontWeight: 600 }}>
          {person.name}
        </text>
        <text y={card.labelTop + 14} textAnchor="middle" fill="var(--t-color-ink-faint)" style={{ fontSize: 10 }}>
          {powerMapMeta(person, locale)}
        </text>
        <text
          y={card.labelTop + 28}
          textAnchor="middle"
          fill={accentLine ? "var(--t-color-accent-text)" : "var(--t-color-ink-faint)"}
          style={{ fontSize: 10 }}
        >
          {countLine}
        </text>
      </g>
    </g>
  );
}
