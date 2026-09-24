import { T } from "@/components/i18n/t";
import { DictEmptyState } from "@/components/budget/dict-empty-state";
import { getOrganizationById } from "@/lib/data";
import { LocaleLabel } from "@/components/i18n/locale-label";
import { PeekLink } from "@/components/peek/peek-link";
import { peekKindFor } from "@/lib/peek";
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
          <ul className="mt-2 grid gap-x-6 sm:grid-cols-2">
            {organizations.map((organization) => (
              <li key={organization.id} className="border-b border-line/60 py-2.5 text-sm leading-snug">
                <PeekLink
                  id={organization.id}
                  href={`/organisaties/${organization.slug}/`}
                  kind={peekKindFor(organization.id, organization.subtype) ?? "organization"}
                  variant="plain"
                  glyph
                  lang="nl"
                  className="font-medium"
                >
                  {organization.name}
                </PeekLink>
                <span className="mt-0.5 block text-xs text-ink-faint">
                  <LocaleLabel kind="subtype" value={organization.subtype} />
                </span>
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
          <ul className="mt-2 grid gap-x-6 sm:grid-cols-2">
            {positions.map((position) => {
              const organization = getOrganizationById(position.organization);
              return (
                <li key={position.id} className="border-b border-line/60 py-2.5 text-sm leading-snug">
                  <PeekLink
                    id={position.id}
                    href={`/posities/${position.slug}/`}
                    kind="position"
                    variant="plain"
                    glyph
                    lang="nl"
                    className="font-medium"
                  >
                    {position.title}
                  </PeekLink>
                  {organization ? (
                    <span lang="nl" className="mt-0.5 block text-xs text-ink-faint">
                      {organization.name}
                    </span>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
