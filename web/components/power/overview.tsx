"use client";

import { useT } from "@/components/i18n/use-t";
import type { RoleGroup } from "@/lib/power-map-layout";
import type { EntityInfo } from "./model";
import { EntityMark, PartyChip } from "./parts";

const ROLE_KEY = { cabinet: "roleCabinet", parliament: "roleParliament", other: "roleOther" } as const;

/**
 * Nothing picked: the most connected people, by role, each with a bar for the
 * summed strength of their ties (one scale for the whole view) and the count.
 */
export function Overview({
  groups,
  infoOf,
  highlighted,
  onPick,
}: {
  groups: readonly RoleGroup[];
  infoOf: (id: string) => EntityInfo;
  highlighted: ReadonlySet<string>;
  onPick: (id: string) => void;
}) {
  const t = useT("power");
  const max = Math.max(0.001, ...groups.flatMap((group) => group.people.map((entry) => entry.strength)));
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,16rem),1fr))] gap-x-4 gap-y-4 px-3 py-3 sm:px-4">
      {groups.map((group) => (
        <section key={group.role} aria-labelledby={`verbanden-rol-${group.role}`}>
          <h3 id={`verbanden-rol-${group.role}`} className="mb-1 flex items-baseline gap-2 text-xs font-semibold text-ink-muted">
            {t(ROLE_KEY[group.role])}
            <span className="font-normal text-ink-faint">{group.people.length}</span>
          </h3>
          <ol>
            {group.people.map((entry) => {
              const info = infoOf(entry.id);
              const lit = highlighted.size === 0 || highlighted.has(entry.id);
              return (
                <li key={entry.id} className={`min-w-0 border-t border-line transition-opacity ${lit ? "" : "opacity-40"}`}>
                  <button
                    type="button"
                    onClick={() => onPick(entry.id)}
                    className="tap-row flex w-full min-w-0 items-center gap-2.5 rounded-sm px-1 py-1.5 text-left hover:bg-surface-raised"
                  >
                    <EntityMark info={info} size={34} />
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="flex min-w-0 items-center gap-1.5">
                        <span className="truncate text-sm font-medium text-ink">{info.name}</span>
                        <PartyChip info={info} />
                      </span>
                      {info.meta ? <span className="truncate text-xs text-ink-faint">{info.meta}</span> : null}
                      <span className="mt-1 flex items-center gap-2">
                        <span aria-hidden="true" className="h-1.5 flex-1 rounded-sm bg-line">
                          <span
                            className="block h-full rounded-sm bg-accent"
                            style={{ width: `${Math.max(4, Math.round((entry.strength / max) * 100))}%` }}
                          />
                        </span>
                        <span className="shrink-0 text-xs tabular-nums text-ink-muted">
                          {entry.ties === 1 ? t("tieCount1") : t("tieCount", { n: entry.ties })}
                        </span>
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </section>
      ))}
    </div>
  );
}
