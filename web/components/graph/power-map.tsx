"use client";

import { useMemo } from "react";
import type { PowerMap, PowerMapPerson } from "@/lib/graph";
import {
  layoutPowerMap,
  powerMapCountLabel,
  powerMapMeta,
  truncateForPowerMap,
  POWER_MAX_NAME_CHARS,
} from "@/lib/power-map-layout";

type PowerMapViewProps = {
  powerMap: PowerMap;
};

function initials(name: string): string {
  const parts = name
    .split(/\s+/)
    .filter((part) => part.length > 0 && part !== "van" && part !== "de" && part !== "der");
  const first = parts[0]?.[0] ?? "?";
  const last = parts.length > 1 ? parts[parts.length - 1][0] ?? "" : "";
  return `${first}${last}`.toUpperCase();
}

const VIEW_MARGIN = 24;
const VIEW_TOP_EXTRA = 56;

export function PowerMapView({ powerMap }: PowerMapViewProps) {
  const people = powerMap.people;

  const { cards, bounds } = useMemo(() => layoutPowerMap(people), [people]);

  if (people.length === 0) {
    return (
      <div className="flex h-full min-h-0 items-center justify-center p-6">
        <div className="max-w-sm text-center">
          <p className="text-sm font-medium text-ink">Nog geen machtskaart</p>
          <p className="mt-2 text-sm text-ink-faint">
            De machtskaart rangschikt mensen naar hoe vaak zij in het nieuws voorkomen. Er zijn nog
            geen nieuwsartikelen aan de dataset toegevoegd, dus er valt nog geen rangschikking te
            tonen. We verzinnen er geen.
          </p>
          <p className="mt-3 text-xs text-ink-faint">
            Venster: {powerMap.windowDays} dagen
            {powerMap.since ? ` vanaf ${powerMap.since}` : ""}. Artikelen in het venster:{" "}
            {powerMap.articleCount}.
          </p>
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

  return (
    <div className="relative h-full min-h-0 w-full">
      <div className="absolute inset-x-4 top-3 text-center">
        <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
          Machtskaart: wie is in het nieuws
        </p>
        <p className="mt-1 text-xs text-ink-faint">
          De {people.length} mensen die het meest genoemd zijn in {powerMapCountLabel(powerMap.articleCount)}
          {powerMap.sources.length > 0 ? ` uit ${powerMap.sources.length} bronnen` : ""} in de laatste{" "}
          {powerMap.windowDays} dagen.
        </p>
      </div>

      <svg
        viewBox={viewBox}
        role="img"
        aria-label="Machtskaart met de meest genoemde personen in het nieuws."
        className="h-full w-full"
      >
        <defs>
          <clipPath id="power-map-portrait-clip">
            <circle r={22} />
          </clipPath>
        </defs>
        <g aria-hidden="true">
          {cards.slice(1).map((card) => (
            <line
              key={`link-${card.person.person}`}
              x1={0}
              y1={0}
              x2={card.x}
              y2={card.y}
              stroke="var(--color-line-strong)"
              strokeWidth={0.75}
              opacity={0.25}
            />
          ))}
        </g>
        {cards.map((card) => (
          <g key={card.person.person} transform={`translate(${card.x} ${card.y})`} aria-hidden="true">
            <title>
              {card.person.name}
              {card.person.party ? `, ${card.person.party}` : ""}
              {card.person.job ? `, ${card.person.job}` : ""}. {powerMapCountLabel(card.person.total)}.
            </title>
            <circle r={26} fill="var(--color-surface-raised)" stroke="var(--color-line)" strokeWidth={1} />
            {card.person.image ? (
              <image
                href={card.person.image}
                x={-22}
                y={-22}
                width={44}
                height={44}
                clipPath="url(#power-map-portrait-clip)"
                preserveAspectRatio="xMidYMid slice"
              />
            ) : (
              <text
                textAnchor="middle"
                dominantBaseline="central"
                fill="var(--color-ink-muted)"
                style={{ fontSize: 14, fontWeight: 600 }}
              >
                {initials(card.person.name)}
              </text>
            )}
            <text
              y={40}
              textAnchor="middle"
              fill="var(--color-ink)"
              style={{ fontSize: 12, fontWeight: 600 }}
            >
              {truncateForPowerMap(card.person.name, POWER_MAX_NAME_CHARS)}
            </text>
            <text y={55} textAnchor="middle" fill="var(--color-ink-faint)" style={{ fontSize: 10 }}>
              {powerMapMeta(card.person)}
            </text>
            <text y={68} textAnchor="middle" fill="var(--color-ink-faint)" style={{ fontSize: 10 }}>
              {powerMapCountLabel(card.person.total)}
            </text>
          </g>
        ))}
      </svg>

      <ol className="sr-only">
        {people.map((person: PowerMapPerson) => (
          <li key={person.person}>
            {person.rank}. {person.name}
            {person.party ? `, ${person.party}` : ""}
            {person.job ? `, ${person.job}` : ""}. {powerMapCountLabel(person.total)}.
            {person.latest.date ? ` Laatste bericht op ${person.latest.date}.` : ""}
          </li>
        ))}
      </ol>
    </div>
  );
}
