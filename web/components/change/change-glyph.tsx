import type { ChangeDisplayKind } from "@/lib/changes";

/**
 * Colour per change kind, from the token palette. Colour is never the only
 * signal: every kind also has its own glyph shape and a text label.
 */
export const CHANGE_TONE: Record<ChangeDisplayKind, string> = {
  appointment: "text-accent",
  acting: "text-sector-hoge-colleges",
  departure: "text-sector-staten-generaal",
  vacancy: "text-ink-faint",
  structural: "text-sector-decentraal-provinciaal",
  rename: "text-sector-decentraal-provinciaal",
  move: "text-sector-decentraal-provinciaal",
  relation: "text-sector-waterschap",
};

/** Label text colour per kind, readable on the canvas in both themes. */
export const CHANGE_LABEL_TONE: Record<ChangeDisplayKind, string> = {
  ...CHANGE_TONE,
  appointment: "text-accent-text",
  vacancy: "text-ink-muted",
};

export const CHANGE_KIND_KEY: Record<ChangeDisplayKind, string> = {
  appointment: "changeKindAppointment",
  acting: "changeKindActing",
  departure: "changeKindDeparture",
  vacancy: "changeKindVacancy",
  structural: "changeKindStructural",
  rename: "changeKindRename",
  move: "changeKindMove",
  relation: "changeKindRelation",
};

/**
 * A 14 px mark per change kind: a plus disc for an appointment, a half disc
 * for acting, a minus disc for a departure, an empty dashed ring for a
 * vacancy, a square for a structural change and a double arrow for a
 * handover. Decorative; the kind label next to it carries the meaning.
 */
export function ChangeKindGlyph({ kind, size = 14 }: { kind: ChangeDisplayKind; size?: number }) {
  let shape;
  switch (kind) {
    case "appointment":
      shape = (
        <>
          <circle cx="7" cy="7" r="6" fill="currentColor" />
          <path d="M7 4v6M4 7h6" stroke="var(--color-canvas)" strokeWidth="1.6" strokeLinecap="round" />
        </>
      );
      break;
    case "acting":
      shape = (
        <>
          <circle cx="7" cy="7" r="5.25" fill="var(--color-canvas)" stroke="currentColor" strokeWidth="1.5" />
          <path d="M7 1.75a5.25 5.25 0 0 1 0 10.5Z" fill="currentColor" />
        </>
      );
      break;
    case "departure":
      shape = (
        <>
          <circle cx="7" cy="7" r="6" fill="currentColor" />
          <path d="M4 7h6" stroke="var(--color-canvas)" strokeWidth="1.6" strokeLinecap="round" />
        </>
      );
      break;
    case "vacancy":
      shape = (
        <circle
          cx="7"
          cy="7"
          r="5.25"
          fill="var(--color-canvas)"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeDasharray="2.2 1.6"
        />
      );
      break;
    case "structural":
    case "rename":
    case "move":
      shape = <rect x="1.5" y="1.5" width="11" height="11" rx="2" fill="currentColor" />;
      break;
    case "relation":
      shape = (
        <>
          <path d="M7 0.8 13.2 7 7 13.2 0.8 7Z" fill="currentColor" />
        </>
      );
      break;
  }
  return (
    <svg aria-hidden="true" viewBox="0 0 14 14" width={size} height={size} className={`block shrink-0 ${CHANGE_TONE[kind]}`}>
      {shape}
    </svg>
  );
}
