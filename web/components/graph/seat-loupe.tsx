"use client";

import { useLayoutEffect, useState, type RefObject } from "react";
import type { ChamberSeatEntry } from "@/lib/graph";
import type { SeatPerson } from "@/lib/seats";
import { avatarTint, initialsFor } from "@/lib/initials";
import { PartyPill } from "@/components/party-pill";
import { useT } from "@/components/i18n/use-t";

/**
 * The seats of one fractie at a size a pointer or a finger can hit.
 *
 * On the canvas a seat is a few pixels wide at the zoom most readers leave it
 * at, and the canvas never zooms by itself. The loupe is the zoom on demand:
 * it opens beside the fractie once the fractie or one of its members is
 * picked, and shows every seat as the face or initials of its member, in the
 * block's own columns. The canvas places it (graph-canvas placeOverlays).
 */
export function SeatLoupe({
  loupeRef,
  chamberName,
  entry,
  total,
  rows,
  people,
  selectedPersonId,
  onPick,
  onClose,
  onPlaced,
}: {
  loupeRef: RefObject<HTMLDivElement | null>;
  chamberName: string;
  entry: ChamberSeatEntry;
  total: number;
  rows: number;
  people: Record<string, SeatPerson>;
  selectedPersonId: string | null;
  onPick: (personId: string) => void;
  onClose: () => void;
  onPlaced: () => void;
}) {
  const t = useT("power");
  const [hovered, setHovered] = useState<string | null>(null);
  const members = entry.members ?? [];
  // Placed once it has a size; a new fractie changes the size.
  useLayoutEffect(() => {
    onPlaced();
  }, [entry, onPlaced]);

  const shown = hovered ?? selectedPersonId;
  const shownName = shown ? people[shown]?.name ?? null : null;
  const color = entry.color;

  return (
    <div
      ref={loupeRef}
      role="group"
      aria-label={t("seatLoupeLabel", { label: entry.label, chamber: chamberName })}
      className="absolute left-0 top-0 z-20 max-w-[calc(100%-0.5rem)] rounded-md border border-line bg-surface p-2 shadow-lg [--seat:1.5rem] pointer-coarse:[--seat:1.875rem]"
      style={{ borderTopWidth: 3, borderTopColor: color ?? undefined }}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          event.stopPropagation();
          onClose();
        }
      }}
    >
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <PartyPill party={entry.key ?? entry.label} />
          <p className="mt-1 text-[11px] text-ink-muted">
            {t("seatLoupeSeats", { n: entry.seats, total, chamber: chamberName })}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={t("seatLoupeClose")}
          title={t("seatLoupeClose")}
          className="tap-target -me-1 -mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-sm text-ink-faint hover:text-ink"
        >
          <svg aria-hidden="true" viewBox="0 0 20 20" width="12" height="12">
            <path d="m5 5 10 10M15 5 5 15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <div className="mt-2 overflow-x-auto pb-0.5">
        <ul
          className="grid gap-[3px]"
          style={{
            gridTemplateRows: `repeat(${Math.max(1, Math.min(rows, members.length))}, var(--seat))`,
            gridAutoFlow: "column",
            gridAutoColumns: "var(--seat)",
          }}
        >
          {members.map((personId) => {
            const person = people[personId];
            const name = person?.name ?? personId;
            const picked = personId === selectedPersonId;
            return (
              <li key={personId} className="contents">
                <button
                  type="button"
                  aria-label={name}
                  aria-pressed={picked}
                  onClick={() => onPick(personId)}
                  onPointerEnter={() => setHovered(personId)}
                  onPointerLeave={() => setHovered((current) => (current === personId ? null : current))}
                  onFocus={() => setHovered(personId)}
                  onBlur={() => setHovered((current) => (current === personId ? null : current))}
                  className={`flex h-[var(--seat)] w-[var(--seat)] items-center justify-center overflow-hidden rounded-full border-2 text-[9px] font-semibold text-ink transition-fast focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent ${
                    picked ? "outline-2 outline-offset-1 outline-accent" : ""
                  }`}
                  style={{ ...avatarTint(person?.image ? null : color), borderColor: color ?? "var(--t-color-line-strong)" }}
                >
                  {person?.image ? (
                    <img src={person.image} alt="" decoding="async" className="h-full w-full object-cover" />
                  ) : (
                    <span aria-hidden="true">{initialsFor(name)}</span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <p aria-live="polite" className="mt-1.5 min-h-[1.25em] truncate text-xs font-medium text-ink">
        {shownName ?? ""}
      </p>
      <p className="mt-0.5 max-w-[18rem] text-[10px] leading-snug text-ink-faint">{t("seatOrderNote")}</p>
    </div>
  );
}
