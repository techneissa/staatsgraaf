"use client";

import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import type { IconNode } from "lucide";
import { Building2, Factory, Globe, GraduationCap, HeartPulse, Landmark, Newspaper, Scale, Shield, Users, Waves, Wheat, Coins } from "lucide";
import { Avatar } from "@/components/avatar";
import { LucideIcon } from "@/components/icons/lucide-icon";
import { SourceIcon } from "@/components/source-icon";
import { PartyPill } from "@/components/party-pill";
import { useT } from "@/components/i18n/use-t";
import { initialsFor } from "@/lib/initials";
import { partyByDataset } from "@/lib/parties";
import { orgEnGloss, positionEn } from "@/lib/name-gloss";
import {
  MINISTRY_CLUSTERS,
  MINISTRY_ICON,
  clusterOf,
  clusterVar,
  personSlug,
  type HierarchyHub,
  type HierarchyPerson,
  type HierarchySource,
} from "@/lib/hierarchy";
import { EntityMark } from "./parts";
import type { EntityInfo } from "./model";

const ICONS: Record<string, IconNode> = {
  landmark: Landmark,
  "building-2": Building2,
  globe: Globe,
  shield: Shield,
  factory: Factory,
  waves: Waves,
  scale: Scale,
  wheat: Wheat,
  "graduation-cap": GraduationCap,
  users: Users,
  "heart-pulse": HeartPulse,
  coins: Coins,
  newspaper: Newspaper,
};

/**
 * The cluster colours as custom properties on `.hv-root`, per theme, from
 * lib/hierarchy.ts (validated there). Dark is the site default.
 */
export const CLUSTER_CSS = [
  `.hv-root{--hv-lift:38%;--hv-shade:0%;${MINISTRY_CLUSTERS.map((cluster) => `--hv-${cluster.id}:${cluster.dark};`).join("")}}`,
  `[data-theme="light"] .hv-root{--hv-lift:0%;--hv-shade:22%;${MINISTRY_CLUSTERS.map((cluster) => `--hv-${cluster.id}:${cluster.light};`).join("")}}`,
].join("\n");

/** Neutral colours for groups that are not a ministry or a party. */
export const KIND_COLOR = {
  cabinet: "var(--t-color-ink-faint)",
  office: "var(--t-color-sector-zelfstandig)",
  news: "var(--t-color-line-strong)",
} as const;

/** A ministry's cluster colour, or a fractie's sourced party colour. */
export function hubColor(hub: HierarchyHub): string {
  return hub.kind === "ministry" ? clusterVar(clusterOf(hub.id).id) : partyStroke(hub.color ?? null);
}

/** OKLab lightness of a hex colour, or null when it is not a hex colour. */
function lightness(hex: string): number | null {
  const match = /^#([0-9a-f]{6})$/i.exec(hex.trim());
  if (!match) return null;
  const lin = [0, 2, 4].map((i) => {
    const c = parseInt(match[1].slice(i, i + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  const l = Math.cbrt(0.4122214708 * lin[0] + 0.5363325363 * lin[1] + 0.0514459929 * lin[2]);
  const m = Math.cbrt(0.2119034982 * lin[0] + 0.6806995451 * lin[1] + 0.1073969566 * lin[2]);
  const sh = Math.cbrt(0.0883024619 * lin[0] + 0.2817188376 * lin[1] + 0.6299787005 * lin[2]);
  return 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * sh;
}

/**
 * A sourced party colour as an outline or ring: unchanged, except that a very
 * dark one (PVV, JA21) is lifted toward white on the dark theme and a very
 * light one darkened on the light theme, so the outline stays visible. The
 * hue is kept; the pill and legend dot next to it show the colour as sourced.
 */
export function partyStroke(color: string | null): string {
  if (!color) return "var(--t-color-line-strong)";
  const l = lightness(color);
  if (l === null) return color;
  if (l < 0.42) return `color-mix(in oklab, ${color}, #fff var(--hv-lift))`;
  if (l > 0.8) return `color-mix(in oklab, ${color}, #000 var(--hv-shade))`;
  return color;
}


export function HubIcon({ hub, size, strokeWidth = 1.9 }: { hub: HierarchyHub; size: number; strokeWidth?: number }) {
  const icon = ICONS[MINISTRY_ICON[hub.id] ?? ""] ?? Landmark;
  return <LucideIcon icon={icon} size={size} strokeWidth={strokeWidth} />;
}

/**
 * A portrait in a circle with a coloured outline, as in the concept: the
 * outline in the group's colour, a thin surface gap, then the photo.
 */
export function RingPortrait({
  name,
  image,
  size,
  color,
  stroke,
  tint = null,
}: {
  name: string;
  image: string | null;
  size: number;
  color: string;
  stroke: number;
  tint?: string | null;
}) {
  const inner = Math.max(8, Math.round(size - 2 * stroke - 3));
  return (
    <span
      aria-hidden="true"
      className="flex shrink-0 items-center justify-center rounded-pill bg-surface"
      style={{ width: size, height: size, boxShadow: `inset 0 0 0 ${stroke}px ${color}` }}
    >
      <Avatar name={name} url={image} color={tint} size={inner} />
    </span>
  );
}

/** A hub-like circle: coloured outline, surface fill, content centred in the colour. */
export function RingBadge({
  size,
  color,
  stroke,
  children,
  className = "",
  style,
}: {
  size: number;
  color: string;
  stroke: number;
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <span
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center rounded-pill bg-surface ${className}`}
      style={{ width: size, height: size, boxShadow: `inset 0 0 0 ${stroke}px ${color}`, color, ...style }}
    >
      {children}
    </span>
  );
}

/** The display role of a head: the first title, cut before " en " (Minister-president en Minister van ...). */
export function shortRole(role: string | null): string | null {
  if (!role) return null;
  return role.split(/ en | and |, /)[0].replace(/ van de (Tweede|Eerste) Kamer der Staten-Generaal$/, "").replace(/ of the (House|Senate).*$/, "");
}

/** The hub's full name, with the English gloss in English mode. */
export function hubName(hub: HierarchyHub, locale: "nl" | "en"): string {
  if (locale !== "en" || hub.kind !== "ministry") return hub.name;
  return orgEnGloss(hub.name) ?? hub.name;
}

export function roleText(person: HierarchyPerson, locale: "nl" | "en"): string | null {
  const titles = [person.role, ...(person.extra ?? [])].filter((title): title is string => Boolean(title));
  if (titles.length === 0) return null;
  return titles.map((title) => (locale === "en" ? positionEn(title) ?? title : title)).join(" · ");
}

/** A hierarchy person as the connections view's entity info. */
export function personInfo(person: HierarchyPerson, hub: HierarchyHub | null, locale: "nl" | "en", meta?: string | null): EntityInfo {
  const record = partyByDataset(person.party ?? null);
  const fractie = hub?.kind === "fractie" ? hub : null;
  return {
    id: person.id,
    isOrg: false,
    name: person.name,
    meta: meta ?? roleText(person, locale),
    party: record?.abbrev ?? person.party ?? fractie?.short ?? null,
    color: record?.color ?? fractie?.color ?? null,
    image: person.image,
    initials: initialsFor(person.name),
    href: `/personen/${personSlug(person)}/`,
  };
}

/** A small icon link to the record that puts a person in the hierarchy. */
export function SourceIconLink({ source }: { source: HierarchySource | null | undefined }) {
  if (!source?.url) return null;
  return <SourceIcon href={source.url} title={source.title ?? source.id} retrieved={source.retrieved ?? null} size={14} />;
}

/**
 * One person in a hub: portrait, name, and title or role; the party pill and
 * the source beside it, as their own links.
 */
export function PersonRow({
  person,
  hub,
  source,
  locale,
  dim,
  onPick,
}: {
  person: HierarchyPerson;
  hub: HierarchyHub;
  source: HierarchySource | null;
  locale: "nl" | "en";
  dim: boolean;
  onPick: (id: string) => void;
}) {
  const t = useT("power");
  const meta = person.leader ? t("leader") : hub.kind === "fractie" ? null : roleText(person, locale);
  const info = personInfo(person, hub, locale, meta);
  // Within a fractie the hub already names the party.
  const party = hub.kind === "fractie" ? null : person.party ?? null;
  return (
    <li className={`flex min-w-0 items-center gap-1 border-t border-line first:border-t-0 transition-opacity ${dim ? "opacity-40" : ""}`}>
      <button
        type="button"
        onClick={() => onPick(person.id)}
        className="tap-row flex min-w-0 flex-1 items-center gap-2.5 rounded-sm px-1 py-1.5 text-left hover:bg-surface-raised"
      >
        <EntityMark info={info} size={34} />
        <span className="flex min-w-0 flex-1 flex-col leading-tight">
          <span className="truncate text-sm font-medium text-ink">{person.name}</span>
          {meta ? <span className={`truncate text-xs ${person.leader ? "text-ink-muted" : "text-ink-faint"}`}>{meta}</span> : null}
        </span>
      </button>
      {party ? <PartyPill party={party} className="shrink-0" /> : null}
      <SourceIconLink source={source} />
    </li>
  );
}

/** Motion of the hierarchy and the focus: transform, opacity and stroke-dashoffset only, none under reduced motion. */
export const MOTION_CSS = `
@keyframes hv-pop { from { opacity: 0; transform: scale(.55); } to { opacity: 1; transform: none; } }
@keyframes hv-fade { from { opacity: 0; } to { opacity: 1; } }
@keyframes hv-draw { from { stroke-dashoffset: var(--len); } to { stroke-dashoffset: 0; } }
@keyframes hv-move { from { transform: translate(var(--fx, 0px), var(--fy, 0px)) scale(var(--fs, 1)); } to { transform: none; } }
.hv-pop { animation: hv-pop 300ms var(--t-ease-decelerate) both; }
.hv-fade { animation: hv-fade 320ms var(--t-ease-standard) both; }
.hv-draw { stroke-dasharray: var(--len) var(--len); animation: hv-draw 480ms var(--t-ease-decelerate) both; }
.hv-move { animation: hv-move 420ms var(--t-ease-decelerate) both; }
.hv-lift { transition: transform var(--t-duration-fast) var(--t-ease-standard), opacity var(--t-duration-base) var(--t-ease-standard); }
@media (prefers-reduced-motion: reduce) {
  .hv-pop, .hv-fade, .hv-draw, .hv-move { animation: none; }
  .hv-draw { stroke-dasharray: none; }
  .hv-lift { transition: none; }
}`;

/**
 * Where the last person picked on a canvas sat, so the next focus can move
 * them from there into the centre. Module state: one canvas per page.
 */
let lastTap: { id: string; x: number; y: number; r: number; at: number } | null = null;

export function rememberTap(id: string, circle: { x: number; y: number; r: number }) {
  lastTap = { id, x: circle.x, y: circle.y, r: circle.r, at: Date.now() };
}

export function takeTap(id: string) {
  const tap = lastTap && lastTap.id === id && Date.now() - lastTap.at < 2000 ? lastTap : null;
  return tap;
}


/**
 * In a narrow column on a wide window the chart would fit full screen: offer
 * it. The canvas frame listens for the event (components/canvas-frame.tsx).
 */
export function ExpandHint() {
  const t = useT("power");
  const [wide, setWide] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(min-width: 700px) and (min-height: 560px)");
    const update = () => setWide(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  if (!wide) return null;
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event("staatsgraaf:canvas-expand"))}
      className="tap-row mb-2 flex w-full items-center justify-center gap-1.5 rounded-md border border-dashed border-line-strong px-2 py-1.5 text-xs font-medium text-ink-muted hover:border-accent hover:text-ink"
    >
      <svg aria-hidden="true" viewBox="0 0 20 20" width="14" height="14">
        <path d="M12 3.5h4.5V8M8 16.5H3.5V12M16.5 3.5 11.5 8.5M3.5 16.5l5-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {t("showChartFull")}
    </button>
  );
}

