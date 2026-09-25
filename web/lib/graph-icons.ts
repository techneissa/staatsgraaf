/**
 * The icon inside each mark on the graph canvas (owner's choice of
 * 25-09-2026: one shape, a circle, and an icon that says what kind of body
 * it is; the colour still says the branch). A commissie stays a small plain
 * dot. Icons are lucide's, the same set as the rest of the site.
 */

import {
  Briefcase,
  Building,
  ChartLine,
  Cog,
  Crown,
  Eye,
  Flag,
  Handshake,
  House,
  Landmark,
  Lightbulb,
  Map as MapIcon,
  Scale,
  SearchCheck,
  Shield,
  Siren,
  TreePalm,
  Users,
  Vote,
  WavesHorizontal,
  type IconNode,
} from "lucide";
import type { OrgSubtype } from "./types";
import { parseIcon, type ParsedIcon } from "./icon-path";

export const ICON_BY_SUBTYPE: Partial<Record<OrgSubtype, IconNode>> = {
  ministerie: Briefcase,
  defensieonderdeel: Shield,
  agentschap: Cog,
  uitvoeringsorganisatie: Cog,
  inspectie: SearchCheck,
  zbo: Building,
  rwt: Building,
  toezichthouder: Eye,
  "rechterlijke-instantie": Scale,
  "hoge-college": Landmark,
  kiesraad: Vote,
  adviescollege: Lightbulb,
  "raad-van-advies": Lightbulb,
  staatscommissie: Lightbulb,
  planbureau: ChartLine,
  "tweede-kamer": Users,
  "eerste-kamer": Users,
  "provinciale-staten": Users,
  gemeenteraad: Users,
  "algemeen-bestuur-waterschap": Users,
  eilandsraad: Users,
  "europees-parlement": Users,
  "staten-land": Users,
  gemeente: House,
  provincie: MapIcon,
  waterschap: WavesHorizontal,
  veiligheidsregio: Siren,
  "openbaar-lichaam-bes": TreePalm,
  samenwerkingsverband: Handshake,
  koninkrijksorgaan: Crown,
  "land-regering": Flag,
  "kiesgerechtigden-nederland": Vote,
  "kiezers-caribisch-nederland": Vote,
};

const parsed = new Map<IconNode, ParsedIcon>();

/** The parsed icon for a subtype, or null for a body drawn as a plain dot. */
export function iconFor(subtype: string): ParsedIcon | null {
  const node = ICON_BY_SUBTYPE[subtype as OrgSubtype];
  if (!node) return null;
  let icon = parsed.get(node);
  if (!icon) {
    icon = parseIcon(node as unknown as Parameters<typeof parseIcon>[0]);
    parsed.set(node, icon);
  }
  return icon;
}

/** Icon size inside a mark of radius `r`: the icon's 24-unit box fills about 70 percent of the circle's width. */
export const ICON_SCALE = 1.4;
