"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Boxes, Building2 } from "lucide";
import { Count } from "@/components/i18n/count";
import { L } from "@/components/i18n/t";
import { LocaleLabel } from "@/components/i18n/locale-label";
import { GROUP_META, IconTile, TYPE_META } from "@/components/index-list/org-visual";
import { branchColorVar } from "@/lib/branch-colors";
import type { OrgBranch, OrgType } from "@/lib/types";

const TILE =
  "flex min-w-0 flex-col rounded-md border border-line bg-surface px-3 py-2.5 transition-fast hover:border-line-strong hover:bg-surface-raised focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus";

const ROW =
  "relative flex min-h-11 items-center gap-2.5 rounded-md px-1.5 py-1 transition-fast hover:bg-surface-inset focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus";

function FigureLink({
  href,
  icon,
  color,
  label,
  value,
}: {
  href: string;
  icon: typeof Building2;
  color: string;
  label: ReactNode;
  value: number;
}) {
  return (
    <Link href={href} className={TILE}>
      <span className="flex items-start gap-2 text-xs leading-snug text-ink-muted">
        <IconTile color={color} icon={icon} size="md" />
        <span className="min-w-0 pt-1.5">{label}</span>
      </span>
      <span className="mt-1.5 whitespace-nowrap text-xl font-semibold tabular-nums tracking-tight text-ink">
        <Count value={value} />
      </span>
    </Link>
  );
}

function BranchRow({ branch, count }: { branch: OrgBranch; count: number }) {
  const color = branchColorVar(branch);
  return (
    <li>
      <Link href={`/organisaties/#groep-${branch}`} className={ROW}>
        <IconTile color={color} icon={GROUP_META[branch]?.icon ?? GROUP_META.zelfstandig.icon} size="sm" />
        <span className="min-w-0 flex-1 text-sm leading-snug text-ink [overflow-wrap:anywhere]">
          <LocaleLabel kind="branch" value={branch} />
        </span>
        <span className="shrink-0 text-sm font-medium tabular-nums text-ink-muted">
          <Count value={count} />
        </span>
      </Link>
    </li>
  );
}

function TypeRow({ type, count }: { type: OrgType; count: number }) {
  const meta = TYPE_META[type] ?? TYPE_META.department;
  const color = branchColorVar(meta.colorBranch);
  return (
    <li>
      <Link href={`/organisaties/?type=${type}`} className={ROW}>
        <IconTile color={color} icon={meta.icon} size="sm" />
        <span className="min-w-0 flex-1 text-sm leading-snug text-ink [overflow-wrap:anywhere]">
          <LocaleLabel kind="type" value={type} />
        </span>
        <span className="shrink-0 text-sm font-medium tabular-nums text-ink-muted">
          <Count value={count} />
        </span>
      </Link>
    </li>
  );
}

/**
 * The home overview: two headline figures, then the bodies by branch (the
 * graph colours) and by type. Every figure and row is a link into
 * /organisaties/: a branch jumps to its group, a type filters the list.
 */
export function OverviewCounts({
  total,
  subOrganizations,
  byType,
  byBranch,
}: {
  total: number;
  subOrganizations: number;
  byType: { key: string; count: number }[];
  byBranch: { key: string; count: number }[];
}) {
  return (
    <div className="@container">
      <div className="mt-3 grid grid-cols-2 gap-2">
        <FigureLink
          href="/organisaties/"
          icon={Building2}
          color={branchColorVar("regering")}
          label={<L nl="Organisaties" en="Organizations" />}
          value={total}
        />
        <FigureLink
          href="/organisaties/"
          icon={Boxes}
          color={branchColorVar("zelfstandig")}
          label={<L nl="Suborganisaties" en="Sub-organizations" />}
          value={subOrganizations}
        />
      </div>
      <div className="mt-4 grid gap-5 @[30rem]:grid-cols-2 @[30rem]:gap-6">
        <div className="min-w-0">
          <h3 className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
            <L nl="Naar branche" en="By branch" />
          </h3>
          <ul className="mt-1.5">
            {byBranch.map((entry) => (
              <BranchRow key={entry.key} branch={entry.key as OrgBranch} count={entry.count} />
            ))}
          </ul>
        </div>
        <div className="min-w-0">
          <h3 className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
            <L nl="Naar type" en="By type" />
          </h3>
          <ul className="mt-1.5">
            {byType.map((entry) => (
              <TypeRow key={entry.key} type={entry.key as OrgType} count={entry.count} />
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
