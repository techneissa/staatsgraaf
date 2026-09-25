"use client";

import type { IconNode } from "lucide";
import { Building2, Factory, FileText, Globe, GraduationCap, HeartPulse, Landmark, Scale, Shield, Users, Waves, Wheat } from "lucide";
import { LucideIcon } from "@/components/icons/lucide-icon";
import { PartyPill } from "@/components/party-pill";
import { useT } from "@/components/i18n/use-t";
import { initialsFor } from "@/lib/initials";
import { partyByDataset } from "@/lib/parties";
import { orgEnGloss, positionEn } from "@/lib/name-gloss";
import { MINISTRY_ICON, personSlug, type HierarchyHub, type HierarchyPerson, type HierarchySource } from "@/lib/hierarchy";
import { EntityMark } from "./parts";
import { formatDutchDate, type EntityInfo } from "./model";

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
};

/** The cabinet's hubs share the government's colour; icons and labels tell them apart. */
export const CABINET_COLOR = "var(--t-color-sector-regering)";

export function hubColor(hub: HierarchyHub): string {
  return hub.kind === "ministry" ? CABINET_COLOR : hub.color ?? "var(--t-color-line-strong)";
}

export function HubIcon({ hub, size }: { hub: HierarchyHub; size: number }) {
  const icon = ICONS[MINISTRY_ICON[hub.id] ?? ""] ?? Landmark;
  return <LucideIcon icon={icon} size={size} strokeWidth={1.8} />;
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
  const t = useT("power");
  if (!source?.url) return null;
  const label = t("sourceOf", { title: source.title ?? source.id, date: formatDutchDate(source.retrieved) });
  return (
    <a
      href={source.url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      title={label}
      className="tap-target flex w-8 shrink-0 items-center justify-center rounded-sm text-ink-faint hover:bg-surface-raised hover:text-ink"
    >
      <LucideIcon icon={FileText} size={14} />
    </a>
  );
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
