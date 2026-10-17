"use client";

import Link from "next/link";
import { BriefcaseBusiness, Landmark, Users } from "lucide";
import type { IconNode } from "lucide";
import { DateT } from "@/components/content/local-date";
import { useT } from "@/components/i18n/use-t";
import { branchColorVar } from "@/lib/branch-colors";
import type { PositionRow } from "@/lib/index-lists";
import type { OrgType } from "@/lib/types";
import { IconTile } from "./org-visual";

const TYPE_ICON: Record<OrgType, IconNode> = {
  elected: Landmark,
  dept_head: BriefcaseBusiness,
  commission: Users,
  department: BriefcaseBusiness,
  advisory: Users,
  constituency: Landmark,
};

const LINK_CLASS =
  "block font-medium leading-snug underline-offset-2 outline-none break-words after:absolute after:inset-0 after:rounded-[inherit] hover:text-accent-text hover:underline focus-visible:after:outline-2 focus-visible:after:outline-offset-[-2px] focus-visible:after:outline-focus";

/**
 * One position on the positions index: type icon in the colour of its branch,
 * the title (or the distinctive rest of a family heading), the body and a
 * current holder on one secondary line, and a seat count when it is more
 * than one. The title link covers the card (ADR 0017).
 */
export function PositionCard({ row, label }: { row: PositionRow; label?: string }) {
  const t = useT("entity");
  const color = row.b != null ? branchColorVar(row.b) : branchColorVar("zelfstandig");
  const title = label ?? row.n;
  const seats = row.se != null && row.se > 1 ? row.se : null;
  const more = row.hc != null && row.hc > 0 ? row.hc : null;
  const holder = row.h ?? null;
  const holderLine = holder !== null ? (more != null ? `${holder} +${more}` : holder) : null;
  const meta = [row.o, holderLine].filter((part): part is string => typeof part === "string" && part !== "");
  const tooltip = [row.n, row.o, holder !== null && more != null ? t("idxMoreHolders", { name: holder, n: more }) : holder]
    .filter((part): part is string => typeof part === "string" && part !== "")
    .join("\n");
  return (
    <article className="relative flex h-full min-h-12 min-w-0 items-center gap-3 overflow-hidden rounded-lg border border-line bg-surface px-2 py-1.5 transition-fast hover:border-line-strong">
      <IconTile color={color} icon={TYPE_ICON[row.t] ?? BriefcaseBusiness} size="md" />
      <div className="min-w-0 flex-1">
        <h3 className="min-w-0 text-sm">
          <Link href={`/posities/${row.s}/`} prefetch={false} title={tooltip} className={`${LINK_CLASS} line-clamp-2 text-ink`}>
            {title}
          </Link>
        </h3>
        {meta.length > 0 ? (
          <p lang="nl" className="mt-0.5 truncate text-xs text-ink-muted">
            {meta.join(" · ")}
          </p>
        ) : null}
      </div>
      {seats !== null ? (
        <span className="shrink-0 rounded-pill bg-surface-raised px-2 py-0.5 text-xs tabular-nums text-ink-muted">
          <DateT area="entity" k="seatMany" counts={{ n: seats }} />
        </span>
      ) : null}
    </article>
  );
}
