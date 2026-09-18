"use client";

import { useMemo } from "react";
import type { MouseEvent, ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { EntityPowerPerson, PowerMap, PowerMapPerson } from "@/lib/graph";
import { useT } from "@/components/i18n/use-t";
import { useLocale } from "@/components/i18n/language-provider";
import { partyByDataset } from "@/lib/parties";
import { positionEn } from "@/lib/name-gloss";
import {
  layoutPowerMap,
  powerMapLinkPath,
  powerMapMeta,
  truncateForPowerMap,
  POWER_HUB_RADIUS,
  POWER_MAX_NAME_CHARS,
} from "@/lib/power-map-layout";

type PowerMapViewProps = {
  powerMap: PowerMap;
  /** Entity-scoped variant: when provided, the view shows only these people. */
  entityPeople?: EntityPowerPerson[];
  /** Optional heading for the entity centre card. */
  entityTitle?: string;
  /** Link target for the centre hub (the entity's own page). */
  entityHref?: string | null;
};

const VIEW_MARGIN = 24;
const VIEW_TOP_EXTRA = 64;
const CENTRE_TEXT_WIDTH = 78;

const dayMs = 86_400_000;

function asPowerMapPerson(entity: EntityPowerPerson, rank: number): PowerMapPerson {
  return {
    person: entity.person,
    slug: entity.slug,
    name: entity.name,
    job: entity.job,
    position: null,
    party: entity.party,
    node: null,
    image: entity.image,
    rank,
    total: entity.total,
    recent: entity.recent,
    weeks: [],
    heat: entity.total,
    latest: { ...entity.latest, url: null },
  };
}

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

function initials(name: string): string {
  const parts = name
    .split(/\s+/)
    .filter((part) => part.length > 0 && part !== "van" && part !== "de" && part !== "der");
  const first = parts[0]?.[0] ?? "?";
  const last = parts.length > 1 ? parts[parts.length - 1][0] ?? "" : "";
  return `${first}${last}`.toUpperCase();
}

/** English position gloss when the locale is EN and one is established. */
function jobFor(person: PowerMapPerson, locale: "nl" | "en"): string | null {
  if (locale !== "en" || !person.job) return person.job ?? null;
  return positionEn(person.job) ?? person.job;
}

function PersonLink({
  href,
  label,
  children,
}: {
  label: string;
  children: ReactNode;
  href: string | null;
}) {
  const router = useRouter();
  if (href === null) {
    return <g>{children}</g>;
  }
  // SVG <a> taps can be swallowed on touch devices; the client-side push on
  // plain left clicks makes the card reliable everywhere.
  const handleClick = (event: MouseEvent) => {
    if (
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      event.button !== 0
    ) {
      return;
    }
    event.preventDefault();
    router.push(href);
  };
  return (
    <a href={href} aria-label={label} onClick={handleClick}>
      {children}
    </a>
  );
}

export function PowerMapView({ powerMap, entityPeople, entityTitle, entityHref }: PowerMapViewProps) {
  const t = useT("power");
  const tc = useT("common");
  const locale = useLocale();
  const entityScoped = entityPeople !== undefined;
  const reference = powerMap.computedAt ?? null;

  const people = useMemo(
    () =>
      entityScoped
        ? entityPeople.map((entity: EntityPowerPerson, index: number) =>
            asPowerMapPerson(entity, index + 1),
          )
        : powerMap.people,
    [entityScoped, entityPeople, powerMap.people],
  );

  const { cards, bounds } = useMemo(() => layoutPowerMap(people, locale), [people, locale]);

  const articlesInWindow = powerMap.articleCount === 1
    ? t("powerMapArticle1")
    : tc("articlesCount", { n: powerMap.articleCount });

  const peopleCountLine = t("powerMapEntitySubtitle", { n: people.length });

  if (people.length === 0) {
    const windowDays = tc("windowDays", { days: powerMap.windowDays });
    const since = powerMap.since ? t("powerMapEmptySince", { since: powerMap.since }) : "";
    const windowLine = entityScoped
      ? null
      : t("powerMapEmptyWindow", { days: windowDays, articles: articlesInWindow, since });
    return (
      <div className="flex h-full min-h-0 items-center justify-center p-6">
        <div className="max-w-sm text-center">
          <p className="text-sm font-medium text-ink">{t("powerMapEmptyTitle")}</p>
          <p className="mt-2 text-sm text-ink-faint">{t("powerMapEmptyBody")}</p>
          {windowLine ? <p className="mt-3 text-xs text-ink-faint">{windowLine}</p> : null}
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

  const centreLines = wrapCentreLabel(
    entityScoped ? entityTitle ?? t("powerMapEntityCentreLabel") : t("powerMapCenterLabel"),
    14,
  );

  const subtitle = entityScoped
    ? peopleCountLine
    : powerMap.sources.length > 0
      ? t("powerMapSubtitle", {
          people: people.length,
          articles: articlesInWindow,
          sources: powerMap.sources.length,
          days: powerMap.windowDays,
        })
      : t("powerMapSubtitleNoSources", {
          people: people.length,
          articles: articlesInWindow,
          days: powerMap.windowDays,
        });

  return (
    <div className="relative h-full min-h-0 w-full">
      <div className="absolute inset-x-4 top-3 text-center">
        <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
          {t("powerMapTitle")}
        </p>
        <p className="mt-1 text-xs text-ink-faint">{subtitle}</p>
      </div>

      <svg
        viewBox={viewBox}
        role="group"
        aria-label={entityScoped ? t("powerMapAriaEntity") : t("powerMapAria")}
        className="h-full w-full"
      >
        <style>{`
          .power-map-card { transition: transform var(--t-duration-base) var(--t-ease-standard); }
          .power-map-card:hover { transform: translateY(-3px); }
        `}</style>
        <defs>
          {[...new Set(cards.map((card) => card.radius))].map((radius) => (
            <clipPath key={radius} id={`power-map-portrait-clip-${radius}`}>
              <circle r={radius} />
            </clipPath>
          ))}
        </defs>

        <g aria-hidden="true">
          {cards.map((card) => (
            <path
              key={`link-${card.person.person}`}
              d={powerMapLinkPath(card.x, card.y)}
              fill="none"
              stroke="var(--t-color-line-strong)"
              strokeWidth={card.person.recent > 0 ? 0.9 : 0.7}
              opacity={card.person.rank <= 3 ? 0.4 : 0.22}
            />
          ))}
        </g>

        <PersonLink
          href={entityScoped ? entityHref ?? null : null}
          label={entityTitle ? t("powerMapOpenPersonName", { name: entityTitle }) : t("powerMapTitle")}
        >
          <g
            fill="var(--t-color-surface-raised)"
            stroke="var(--t-color-line-strong)"
            strokeWidth={1}
            className={entityScoped && entityHref ? "power-map-card" : undefined}
          >
            <circle r={POWER_HUB_RADIUS} />
            <circle
              r={POWER_HUB_RADIUS - 5}
              fill="none"
              stroke="var(--t-color-accent)"
              strokeOpacity={0.55}
              strokeWidth={2.5}
              strokeDasharray="1.6 6.51"
            />
          </g>
          <g aria-hidden="true">
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
            <text
              y={POWER_HUB_RADIUS + 15}
              textAnchor="middle"
              fill="var(--t-color-ink-faint)"
              style={{ fontSize: 10 }}
            >
              {truncateForPowerMap(
                entityScoped
                  ? t("powerMapEntityCentreSubtitle", { n: people.length })
                  : t("powerMapCentreSubtitle"),
                20,
              )}
            </text>
          </g>
        </PersonLink>

        {cards.map((card) => {
          const person = card.person;
          const ring = partyByDataset(person.party)?.color ?? "var(--t-color-line-strong)";
          const when = recencyDays(person.latest.date ?? null, reference);
          const job = jobFor(person, locale);
          const countLine =
            person.recent > 0 && when !== null
              ? tc("inTheNews", {
                  when: when <= 0
                    ? tc("todayLabel")
                    : `${when}${tc("daysAgoSuffix")}`,
                })
              : (person.total === 1 ? t("powerMapArticle1") : tc("articlesCount", { n: person.total }));
          const href = person.slug ? `/personen/${person.slug}/` : null;
          return (
            <g key={person.person} transform={`translate(${card.x} ${card.y})`}>
              <PersonLink href={href} label={t("powerMapOpenPersonName", { name: person.name })}>
                <g className="power-map-card">
                  <title>
                    {person.name}
                    {person.party ? `, ${person.party}` : ""}
                    {job ? `, ${job}` : ""}.{" "}
                    {person.total === 1
                      ? t("powerMapArticle1")
                      : tc("articlesCount", { n: person.total })}
                    .
                  </title>
                  <circle
                    r={card.radius}
                    fill="var(--t-color-surface-raised)"
                    stroke={ring}
                    strokeWidth={person.rank <= 3 ? 2 : 1.5}
                  />
                  {person.image ? (
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
                      {initials(person.name)}
                    </text>
                  )}
                  <text
                    y={card.labelTop}
                    textAnchor="middle"
                    fill="var(--t-color-ink)"
                    style={{ fontSize: 12, fontWeight: 600 }}
                  >
                    {truncateForPowerMap(person.name, POWER_MAX_NAME_CHARS)}
                  </text>
                  <text
                    y={card.labelTop + 14}
                    textAnchor="middle"
                    fill="var(--t-color-ink-faint)"
                    style={{ fontSize: 10 }}
                  >
                    {powerMapMeta(person, locale)}
                  </text>
                  <text
                    y={card.labelTop + 28}
                    textAnchor="middle"
                    fill={person.recent > 0 ? "var(--t-color-accent-text)" : "var(--t-color-ink-faint)"}
                    style={{ fontSize: 10 }}
                  >
                    {countLine}
                  </text>
                </g>
              </PersonLink>
            </g>
          );
        })}
      </svg>

      <ol aria-label={t("powerMapTitle")} className="sr-only">
        {people.map((person: PowerMapPerson) => {
          const job = jobFor(person, locale);
          return (
            <li key={person.person}>
              {person.rank}. {person.name}
              {person.party ? `, ${person.party}` : ""}
              {job ? `, ${job}` : ""}.{" "}
              {person.total === 1 ? t("powerMapArticle1") : tc("articlesCount", { n: person.total })}.
              {person.latest.date ? ` ${t("powerMapLastItem", { date: person.latest.date })}` : ""}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
