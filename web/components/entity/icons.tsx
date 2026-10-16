import type { SVGProps } from "react";

/**
 * Minimal stroke-based inline icons for the entity fact groups. Hand-drawn on a
 * 24x24 grid so no icon dependency is needed. All inherit currentColor.
 */
function base(props: SVGProps<SVGSVGElement>): SVGProps<SVGSVGElement> {
  return {
    width: 16,
    height: 16,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": true,
    ...props,
  };
}

export function PersonIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5.5 20c.8-3.6 3.4-5.5 6.5-5.5s5.7 1.9 6.5 5.5" />
    </svg>
  );
}

export function PeopleIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <circle cx="9" cy="8.5" r="3" />
      <path d="M3.5 20c.7-3.2 3-5 5.5-5s4.8 1.8 5.5 5" />
      <circle cx="17" cy="9.5" r="2.4" />
      <path d="M16 15.2c2.2.2 4 1.6 4.6 4.3" />
    </svg>
  );
}

export function BuildingIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <path d="M4 20V6.5L12 3l8 3.5V20" />
      <path d="M4 20h16" />
      <path d="M9 20v-4h6v4" />
      <path d="M9 9.5h.01M15 9.5h.01M9 13h.01M15 13h.01" />
    </svg>
  );
}

export function SeatIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <path d="M7 4v7c0 1.7 1.3 3 3 3h4c1.7 0 3-1.3 3-3V4" />
      <path d="M7 8h10" />
      <path d="M6 11v6M18 11v6" />
      <path d="M8 17h8v3H8z" />
    </svg>
  );
}

export function AdviceIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v7a2.5 2.5 0 0 1-2.5 2.5H9l-4.5 4v-4H6.5A2.5 2.5 0 0 1 4 13.5z" />
    </svg>
  );
}

export function ScaleIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <path d="M12 4v16M6 6h12" />
      <path d="M6 6 3.5 12a3 3 0 0 0 5 0z" />
      <path d="M18 6l-2.5 6a3 3 0 0 0 5 0z" />
      <path d="M9 20h6" />
    </svg>
  );
}

export function MapPinIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11Z" />
      <circle cx="12" cy="10" r="2.3" />
    </svg>
  );
}

export function GlobeIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M3.5 12h17" />
      <path d="M12 3.5c2.4 2.4 3.6 5.4 3.6 8.5s-1.2 6.1-3.6 8.5M12 3.5C9.6 5.9 8.4 8.9 8.4 12s1.2 6.1 3.6 8.5" />
    </svg>
  );
}

export function GavelIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <rect x="7" y="10.2" width="6" height="3.6" rx="1" transform="rotate(-45 10 12)" />
      <path d="M13.5 7.5l3 3M10 17H4M15 20H9" />
    </svg>
  );
}

export function HandshakeIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <path d="M11 18l-2.5 2a2 2 0 0 1-2.8-2.8L9 14.5" />
      <path d="M9 14.5l3-3a2 2 0 0 1 2.8 0l3.2 3.2" />
      <path d="M3 12l4-4 5-1.5 4 1 5 4.5" />
    </svg>
  );
}

export function HistoryIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <path d="M3.5 12a8.5 8.5 0 1 0 2.5-6L3.5 8.5" />
      <path d="M3.5 4v4.5H8" />
      <path d="M12 8v4.5l3 1.8" />
    </svg>
  );
}

export function LinkIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <path d="M10 14.5a4 4 0 0 0 6 .5l2.5-2.5a4 4 0 1 0-5.7-5.7L11.5 8" />
      <path d="M14 9.5a4 4 0 0 0-6-.5L5.5 11.5a4 4 0 1 0 5.7 5.7l1.3-1.2" />
    </svg>
  );
}

export function NewsIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <rect x="4" y="5" width="16" height="15" rx="2" />
      <path d="M8 9h8M8 13h8M8 17h5" />
    </svg>
  );
}

export function ClipboardIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <rect x="6" y="4.5" width="12" height="16" rx="2" />
      <path d="M9.5 4.5V3h5v1.5" />
      <path d="M9 10h6M9 13.5h6M9 17h3" />
    </svg>
  );
}

export function LayersIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <path d="M12 4 3.5 8.5 12 13l8.5-4.5z" />
      <path d="m3.5 12.5 8.5 4.5 8.5-4.5" />
      <path d="m3.5 16.5 8.5 4.5 8.5-4.5" />
    </svg>
  );
}

export function CalendarIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <rect x="4" y="5.5" width="16" height="14.5" rx="2" />
      <path d="M4 10h16M8.5 3.5v4M15.5 3.5v4" />
    </svg>
  );
}

export function TagIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <path d="M4 4h7l9 9-7 7-9-9z" />
      <path d="M8 8h.01" />
    </svg>
  );
}

export function ClockIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </svg>
  );
}

export function KeyIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <circle cx="8" cy="15" r="4" />
      <path d="m11 12 8.5-8.5M16 7l2.5 2.5M14 9l2 2" />
    </svg>
  );
}

export function BriefcaseIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <rect x="3.5" y="7" width="17" height="12.5" rx="2" />
      <path d="M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7M3.5 12.5h17" />
    </svg>
  );
}
