import Link from "next/link";
import { T } from "@/components/i18n/t";
import { DictEmptyState } from "@/components/budget/dict-empty-state";
import { getOrganizationById } from "@/lib/data";
import { ORG_SUBTYPE_LABELS } from "@/lib/labels";
import { branchColorVar } from "@/lib/branch-colors";
import { formatCount } from "@/lib/format";
import { getResponsibleOrganizations, getResponsiblePositions } from "@/lib/topics";
import type { Topic } from "@/lib/types";

export function ResponsibleList({ topic }: { topic: Topic }) {
  const organizations = getResponsibleOrganizations(topic);
  const positions = getResponsiblePositions(topic);

  return (
    <section aria-labelledby="verantwoordelijk-titel" className="border-b border-line py-6">
      <h2 id="verantwoordelijk-titel" className="text-lg font-semibold tracking-tight text-ink">
        <T area="news" k="responsibleHeading" />
      </h2>
      <p className="mt-1 text-sm text-ink-muted">
        {formatCount(organizations.length)}{" "}
        {organizations.length === 1 ? <T area="news" k="responsibleOrgSingular" /> : <T area="news" k="responsibleOrgPlural" />}{" "}
        {formatCount(positions.length)}{" "}
        {positions.length === 1 ? <T area="news" k="responsiblePositionSingular" /> : <T area="news" k="responsiblePositionPlural" />}{" "}
        <T area="news" k="responsibleLinkedIntro" />
      </p>

      {organizations.length === 0 && positions.length === 0 ? (
        <div className="mt-4">
          <DictEmptyState
            titleKey="responsibleEmptyTitle"
            descriptionKey="responsibleEmptyDescription"
          />
        </div>
      ) : null}

      {organizations.length > 0 ? (
        <div className="mt-4">
          <h3 className="text-xs font-medium uppercase tracking-wider text-ink-faint">
            <T area="news" k="responsibleOrganizationsLabel" />
          </h3>
          <ul className="mt-2.5 flex flex-wrap gap-2">
            {organizations.map((organization) => (
              <li key={organization.id}>
                <Link
                  href={`/organisaties/${organization.slug}/`}
                  className="inline-flex items-center gap-2 rounded-pill border border-line bg-surface py-1.5 pl-2.5 pr-3 text-sm text-ink transition-fast hover:border-line-strong hover:text-accent-text"
                >
                  <span
                    aria-hidden="true"
                    className="h-2 w-2 shrink-0 rounded-pill"
                    style={{ backgroundColor: branchColorVar(organization.branch) }}
                  />
                  <span className="font-medium">{organization.name}</span>
                  <span className="text-xs text-ink-faint">
                    {ORG_SUBTYPE_LABELS[organization.subtype]}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {positions.length > 0 ? (
        <div className="mt-5">
          <h3 className="text-xs font-medium uppercase tracking-wider text-ink-faint">
            <T area="news" k="responsiblePositionsLabel" />
          </h3>
          <ul className="mt-2.5 flex flex-wrap gap-2">
            {positions.map((position) => {
              const organization = getOrganizationById(position.organization);
              return (
                <li key={position.id}>
                  <Link
                    href={`/posities/${position.slug}/`}
                    className="inline-flex items-baseline gap-2 rounded-pill border border-line bg-surface py-1.5 px-3 text-sm text-ink transition-fast hover:border-line-strong hover:text-accent-text"
                  >
                    <span className="font-medium">{position.title}</span>
                    {organization ? (
                      <span className="text-xs text-ink-faint">{organization.name}</span>
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
