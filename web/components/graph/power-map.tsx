"use client";

import { useMemo } from "react";
import type { PowerMap, PowerMapPerson } from "@/lib/graph";

type PowerMapViewProps = {
  powerMap: PowerMap;
};

const GOLDEN_ANGLE = 2.399963229728653;

function initials(name: string): string {
  const parts = name
    .split(/\s+/)
    .filter((part) => part.length > 0 && part !== "van" && part !== "de" && part !== "der");
  const first = parts[0]?.[0] ?? "?";
  const last = parts.length > 1 ? parts[parts.length - 1][0] ?? "" : "";
  return `${first}${last}`.toUpperCase();
}

function positionFor(index: number): { x: number; y: number } {
  if (index === 0) return { x: 0, y: 0 };
  const angle = index * GOLDEN_ANGLE;
  const radius = 40 + 26 * Math.sqrt(index);
  return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius };
}

export function PowerMapView({ powerMap }: PowerMapViewProps) {
  const people = powerMap.people;

  const points = useMemo(
    () => people.map((person, index) => ({ person, ...positionFor(index) })),
    [people],
  );

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

  const maxRadius = Math.max(...points.map((point) => Math.hypot(point.x, point.y)), 40) + 70;

  return (
    <div className="relative h-full min-h-0 w-full">
      <div className="absolute inset-x-4 top-3 text-center">
        <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
          Machtskaart: wie is in het nieuws
        </p>
        <p className="mt-1 text-xs text-ink-faint">
          De {people.length} mensen die het meest genoemd zijn in {powerMap.articleCount} artikelen
          {powerMap.sources.length > 0 ? ` uit ${powerMap.sources.length} bronnen` : ""} in de laatste{" "}
          {powerMap.windowDays} dagen.
        </p>
      </div>

      <svg
        viewBox={`${-maxRadius} ${-maxRadius} ${maxRadius * 2} ${maxRadius * 2}`}
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
          {points.slice(1).map((point) => (
            <line
              key={`link-${point.person.person}`}
              x1={0}
              y1={0}
              x2={point.x}
              y2={point.y}
              stroke="var(--color-line-strong)"
              strokeWidth={0.75}
              opacity={0.25}
            />
          ))}
        </g>
        {points.map((point) => (
          <g key={point.person.person} transform={`translate(${point.x} ${point.y})`} aria-hidden="true">
            <circle r={26} fill="var(--color-surface-raised)" stroke="var(--color-line)" strokeWidth={1} />
            {point.person.image ? (
              <image
                href={point.person.image}
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
                {initials(point.person.name)}
              </text>
            )}
            <text
              y={40}
              textAnchor="middle"
              fill="var(--color-ink)"
              style={{ fontSize: 12, fontWeight: 600 }}
            >
              {point.person.name}
            </text>
            <text y={55} textAnchor="middle" fill="var(--color-ink-faint)" style={{ fontSize: 10 }}>
              {[point.person.party, point.person.job].filter(Boolean).join(" · ")}
            </text>
            <text y={68} textAnchor="middle" fill="var(--color-ink-faint)" style={{ fontSize: 10 }}>
              {point.person.total} artikelen
            </text>
          </g>
        ))}
      </svg>

      <ol className="sr-only">
        {people.map((person: PowerMapPerson) => (
          <li key={person.person}>
            {person.rank}. {person.name}
            {person.party ? `, ${person.party}` : ""}
            {person.job ? `, ${person.job}` : ""}. {person.total} artikelen.
            {person.latest.date ? ` Laatste bericht op ${person.latest.date}.` : ""}
          </li>
        ))}
      </ol>
    </div>
  );
}
