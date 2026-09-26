import type { WheelLinkType } from "@/lib/wheel";

/**
 * How each kind of tie is drawn on the wheel: dashed for the line of parts,
 * dotted for a seat on a body or a joint arrangement, an arrow for the rest.
 * The wheel and the legend's key both read it, so the key shows the lines the
 * wheel draws.
 */
export const WHEEL_LINK_STYLE: Record<WheelLinkType, { dash?: string; arrow: "filled" | "open" | "double" | null }> = {
  elects: { arrow: "double" },
  oversees: { arrow: "filled" },
  advises: { arrow: "open" },
  accountable_to: { arrow: "open" },
  part_of: { dash: "3 3", arrow: null },
  appoints: { arrow: "filled" },
  confirms: { arrow: "open" },
  joint_arrangement_member: { dash: "1 3", arrow: null },
  member_of: { dash: "1 2.5", arrow: null },
  holds_post: { arrow: "filled" },
};

/** The order the legend lists the wheel's ties in. */
export const WHEEL_LINK_ORDER: WheelLinkType[] = [
  "elects",
  "oversees",
  "accountable_to",
  "advises",
  "appoints",
  "confirms",
  "part_of",
  "joint_arrangement_member",
  "member_of",
  "holds_post",
];
