import Link from "next/link";
import { branchColorClass } from "@/lib/branch-colors";
import { DateT } from "@/components/content/local-date";
import { LocaleLabel } from "@/components/i18n/locale-label";
import type { Organization } from "@/lib/types";

/** Employee number used for the card count line, budgeted value as fallback. */
export function employeeCountValue(organization: Organization): number | null {
  return organization.employeeCount?.actual ?? organization.employeeCount?.budgeted ?? null;
}

export function EntityCard({ organization }: { organization: Organization }) {
  const seats = organization.seatsCount;
  const employees = employeeCountValue(organization);
  return (
    <article className="relative flex h-full flex-col overflow-hidden rounded-md border border-line border-l-4 bg-surface p-3 pr-4 transition-fast hover:border-line-strong">
      <span
        aria-hidden="true"
        className={`absolute inset-y-0 left-0 w-1 ${branchColorClass(organization.branch, "bg")}`}
      />
      <h3 className="text-sm font-semibold">
        <Link
          href={`/organisaties/${organization.slug}/`}
          className="text-ink underline-offset-2 hover:text-accent-text hover:underline"
        >
          {organization.name}
        </Link>
      </h3>
      <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="text-xs text-ink-muted"><LocaleLabel kind="subtype" value={organization.subtype} /></span>
        <span className="text-xs text-ink-faint"><LocaleLabel kind="branch" value={organization.branch} /></span>
      </div>
      {organization.description !== null ? (
        <p className="mt-1.5 line-clamp-2 text-sm leading-normal text-ink-muted">
          {organization.description}
        </p>
      ) : null}
      {seats !== null || employees !== null ? (
        <p className="mt-auto pt-2 text-xs tabular-nums text-ink-faint">
          {seats !== null ? <DateT area="common" k="seatsOfLabel" counts={{ n: seats }} /> : null}
          {seats !== null && employees !== null ? " · " : null}
          {employees !== null ? (
            <DateT area="entity" k="employeesShort" counts={{ n: employees }} />
          ) : null}
        </p>
      ) : null}
    </article>
  );
}
