"use client";

import { useState } from "react";
import { useT } from "@/components/i18n/use-t";
import type { EntityInfo, GroupView } from "./model";
import { EntityMark, PartyChip, ReasonChips, StrengthMeter } from "./parts";

/** Rows shown per group before "show all". */
const GROUP_PREVIEW = 6;

/**
 * The focus's ties as grouped rows, for phones and narrow columns: the same
 * groups, reasons and strengths as the diagram. A row picks that neighbour.
 */
export function TieList({
  groups,
  infoOf,
  labelOf,
  highlighted,
  onPick,
}: {
  groups: readonly GroupView[];
  infoOf: (id: string) => EntityInfo;
  labelOf: (kind: GroupView["kind"]) => string;
  highlighted: ReadonlySet<string>;
  onPick: (id: string) => void;
}) {
  const t = useT("power");
  const [open, setOpen] = useState<Set<string>>(new Set());
  return (
    <div className="flex flex-col gap-3">
      {groups.map((group) => {
        const expanded = open.has(group.kind);
        const shown = expanded ? group.ties : group.ties.slice(0, GROUP_PREVIEW);
        const headingId = `verbanden-groep-${group.kind}`;
        return (
          <section key={group.kind} aria-labelledby={headingId}>
            <h3 id={headingId} className="mb-0.5 flex items-baseline gap-2 text-xs font-semibold text-ink-muted">
              {labelOf(group.kind)}
              <span className="font-normal text-ink-faint">{group.ties.length}</span>
            </h3>
            <ul>
              {shown.map((tie) => {
                const info = infoOf(tie.other);
                const lit = highlighted.size === 0 || highlighted.has(tie.other);
                return (
                  <li key={tie.other} className={`border-t border-line ${lit ? "" : "opacity-40"}`}>
                    <button
                      type="button"
                      onClick={() => onPick(tie.other)}
                      className="tap-row flex w-full min-w-0 items-center gap-2.5 rounded-sm px-1 py-1.5 text-left hover:bg-surface-raised"
                    >
                      <EntityMark info={info} size={36} />
                      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <span className="flex min-w-0 items-center gap-1.5">
                          <span className="truncate text-sm font-medium text-ink">{info.name}</span>
                          <PartyChip info={info} />
                        </span>
                        {info.meta ? <span className="truncate text-xs text-ink-faint">{info.meta}</span> : null}
                        {tie.reasons.length > 0 ? <ReasonChips tie={tie} /> : null}
                      </span>
                      <StrengthMeter level={tie.level} />
                    </button>
                  </li>
                );
              })}
            </ul>
            {group.ties.length > GROUP_PREVIEW ? (
              <button
                type="button"
                aria-expanded={expanded}
                onClick={() =>
                  setOpen((current) => {
                    const next = new Set(current);
                    if (next.has(group.kind)) next.delete(group.kind);
                    else next.add(group.kind);
                    return next;
                  })
                }
                className="tap-row mt-0.5 rounded-sm px-1 py-1 text-xs font-medium text-accent-text hover:underline"
              >
                {expanded ? t("showFewer") : t("showAll", { n: group.ties.length })}
              </button>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}
