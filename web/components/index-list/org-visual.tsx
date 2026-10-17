"use client";

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
import type { OrgBranch, OrgType } from "@/lib/types";

/** Where a group sits in the structure of the state: the overview arranges its tiles by this. */
export type GroupCluster = "national" | "decentral" | "distance";

export const GROUP_CLUSTERS: GroupCluster[] = ["national", "decentral", "distance"];

/** Icon and a branch colour for each organisation type on the home overview. */
export const TYPE_META: Record<OrgType, { icon: IconNode; colorBranch: OrgBranch }> = {
  department: { icon: Building2, colorBranch: "regering" },
  elected: { icon: Landmark, colorBranch: "staten-generaal" },
  commission: { icon: Users, colorBranch: "staten-generaal" },
  advisory: { icon: MessagesSquare, colorBranch: "adviescolleges" },
  dept_head: { icon: BriefcaseBusiness, colorBranch: "regering" },
  constituency: { icon: Vote, colorBranch: "staten-generaal" },
};

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
  xs: { box: "h-5 w-5 rounded", icon: 12 },
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
 * The visual of a body in the index: its coat of arms, else a tile in the
 * colour of its group with an icon for its type. Decorative: the name next to
 * it says what it is. Official logos stay on the organisation page: at this
 * size a wordmark is unreadable, and the index loads nothing from other sites.
 */
export function OrgVisual({ row, size = "lg" }: { row: OrganizationRow; size?: VisualSize }) {
  if (row.w) return <ArmsImage url={row.w} size={size} />;
  return <IconTile color={branchColorVar(row.b)} icon={organizationIcon(row)} size={size} />;
}
