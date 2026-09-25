import type { IconNode } from "lucide";
import { Building2, Coins, Factory, Globe, GraduationCap, HeartPulse, Landmark, Scale, Shield, Users, Waves, Wheat } from "lucide";
import { LucideIcon } from "./lucide-icon";
import { MINISTRY_ICON } from "@/lib/hierarchy";

const ICONS: Record<string, IconNode> = {
  landmark: Landmark,
  "building-2": Building2,
  globe: Globe,
  shield: Shield,
  factory: Factory,
  coins: Coins,
  waves: Waves,
  scale: Scale,
  wheat: Wheat,
  "graduation-cap": GraduationCap,
  users: Users,
  "heart-pulse": HeartPulse,
};

/** The icon of a ministry, from the same map the Connections hierarchy uses. */
export function ministryIcon(orgId: string): IconNode {
  return ICONS[MINISTRY_ICON[orgId] ?? ""] ?? Landmark;
}

/** A ministry's icon: coins for Financiën, a shield for Defensie, and so on. Decorative. */
export function MinistryIcon({
  orgId,
  size = 16,
  strokeWidth = 1.9,
  className,
  x,
  y,
}: {
  orgId: string;
  size?: number;
  strokeWidth?: number;
  className?: string;
  x?: number;
  y?: number;
}) {
  return <LucideIcon icon={ministryIcon(orgId)} size={size} strokeWidth={strokeWidth} className={className} x={x} y={y} />;
}
