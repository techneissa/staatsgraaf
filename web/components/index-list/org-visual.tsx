"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import type { IconNode } from "lucide";
import {
  Boxes,
  BriefcaseBusiness,
  Building,
  Building2,
  ChartLine,
  Crown,
  Droplets,
  Eye,
  Handshake,
  Landmark,
  Map as MapIcon,
  MessagesSquare,
  Scale,
  ScanSearch,
  ShieldCheck,
  Siren,
  TreePalm,
  Users,
  Vote,
  Wrench,
} from "lucide";
import { LucideIcon } from "@/components/icons/lucide-icon";
import { ministryIcon } from "@/components/icons/ministry-icon";
import { branchColorVar } from "@/lib/branch-colors";
import type { OrganizationRow } from "@/lib/index-lists";
import type { OrgBranch } from "@/lib/types";

/** Where a group sits in the structure of the state: the overview arranges its tiles by this. */
export type GroupCluster = "national" | "decentral" | "distance";

export const GROUP_CLUSTERS: GroupCluster[] = ["national", "decentral", "distance"];

/** The icon and the place of each group (staatsmacht), the same colours as the graph. */
export const GROUP_META: Record<OrgBranch, { icon: IconNode; cluster: GroupCluster }> = {
  "staten-generaal": { icon: Landmark, cluster: "national" },
  regering: { icon: BriefcaseBusiness, cluster: "national" },
  "rechterlijke-macht": { icon: Scale, cluster: "national" },
  "hoge-colleges": { icon: ShieldCheck, cluster: "national" },
  adviescolleges: { icon: MessagesSquare, cluster: "national" },
  "decentraal-provinciaal": { icon: MapIcon, cluster: "decentral" },
  "decentraal-lokaal": { icon: Building2, cluster: "decentral" },
  waterschap: { icon: Droplets, cluster: "decentral" },
  "caribisch-nederland": { icon: TreePalm, cluster: "decentral" },
  zelfstandig: { icon: Boxes, cluster: "distance" },
  koninkrijk: { icon: Crown, cluster: "distance" },
};

/** The icon of a body without a coat of arms or logo, by its type. */
const SUBTYPE_ICON: Record<string, IconNode> = {
  "tweede-kamer": Landmark,
  "eerste-kamer": Landmark,
  "kiesgerechtigden-nederland": Vote,
  kiesraad: Vote,
  commissie: Users,
  agentschap: BriefcaseBusiness,
  uitvoeringsorganisatie: Wrench,
  inspectie: ScanSearch,
  "land-regering": Crown,
  "rechterlijke-instantie": Scale,
  "hoge-college": ShieldCheck,
  adviescollege: MessagesSquare,
  planbureau: ChartLine,
  provincie: MapIcon,
  "provinciale-staten": Landmark,
  gemeente: Building2,
  gemeenteraad: Landmark,
  samenwerkingsverband: Handshake,
  veiligheidsregio: Siren,
  koepel: Handshake,
  waterschap: Droplets,
  "algemeen-bestuur-waterschap": Landmark,
  "openbaar-lichaam-bes": TreePalm,
  eilandsraad: Landmark,
  zbo: Boxes,
  rwt: Building,
  koninkrijksorgaan: Crown,
  "staten-land": Landmark,
  toezichthouder: Eye,
};

export function organizationIcon(row: Pick<OrganizationRow, "s" | "st" | "b">): IconNode {
  if (row.st === "ministerie") return ministryIcon(`org:${row.s}`);
  return SUBTYPE_ICON[row.st] ?? GROUP_META[row.b]?.icon ?? Building;
}

const TILE_SIZE = {
  lg: { box: "h-9 w-9 rounded-lg", icon: 19 },
  md: { box: "h-8 w-8 rounded-lg", icon: 17 },
  sm: { box: "h-7 w-7 rounded-md", icon: 15 },
} as const;

export type VisualSize = keyof typeof TILE_SIZE;

/** A square in the colour of a group with an icon in it: the fallback visual, and the badge of a group. Decorative. */
export function IconTile({ color, icon, size = "lg", className = "" }: { color: string; icon: IconNode; size?: VisualSize; className?: string }) {
  const tile = TILE_SIZE[size];
  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center border ${tile.box} ${className}`.trim()}
      style={{
        color,
        backgroundColor: `color-mix(in srgb, ${color} 16%, transparent)`,
        borderColor: `color-mix(in srgb, ${color} 34%, transparent)`,
      }}
    >
      <LucideIcon icon={icon} size={tile.icon} strokeWidth={1.9} />
    </span>
  );
}

/** A coat of arms as a decorative image in a square slot. */
export function ArmsImage({ url, size = "lg" }: { url: string; size?: VisualSize }) {
  return (
    <span aria-hidden="true" className={`inline-flex shrink-0 items-center justify-center ${TILE_SIZE[size].box}`}>
      <img src={url} alt="" loading="lazy" decoding="async" className="max-h-full max-w-full object-contain" />
    </span>
  );
}

/**
 * The official logo of a body, loaded from its own site without a referrer
 * (ADR 0029, amendment 1). Logos are wide wordmarks drawn for a white page,
 * so it sits on a white plate, wider than the square tiles, in both themes.
 * When it does not load (hotlink protection, a moved file) the plate gives
 * way to the icon tile; the check after mount catches an error that came
 * before the page was hydrated.
 */
function LogoPlate({ url, fallback, small }: { url: string; fallback: ReactNode; small: boolean }) {
  const [failed, setFailed] = useState(false);
  const ref = useRef<HTMLImageElement>(null);
  useEffect(() => {
    const image = ref.current;
    if (image && image.complete && image.naturalWidth === 0) setFailed(true);
  }, []);
  if (failed) return <>{fallback}</>;
  return (
    <span aria-hidden="true" className={`inline-flex shrink-0 items-center justify-center overflow-hidden bg-white ${small ? "h-7 w-11 rounded-md p-0.5" : "h-9 w-14 rounded-lg px-1 py-0.5"}`}>
      <img
        ref={ref}
        src={url}
        alt=""
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
        className="max-h-full max-w-full object-contain"
      />
    </span>
  );
}

/**
 * The visual of a body in the index: its coat of arms, else its official
 * logo, else a tile in the colour of its group with an icon for its type.
 * Decorative: the name next to it says what it is. With `wide` the slot has
 * the width of a logo plate, so the names in a grid with logos line up.
 */
export function OrgVisual({ row, size = "lg", wide = false }: { row: OrganizationRow; size?: VisualSize; wide?: boolean }) {
  const tile = <IconTile color={branchColorVar(row.b)} icon={organizationIcon(row)} size={size} />;
  const visual = row.w ? <ArmsImage url={row.w} size={size} /> : row.lg ? <LogoPlate url={row.lg} fallback={tile} small={size === "sm"} /> : tile;
  if (!wide) return visual;
  return <span className={`inline-flex shrink-0 justify-center ${size === "sm" ? "w-11" : "w-14"}`}>{visual}</span>;
}
