import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
import { KindBadge } from "@/components/kind-badge";
import { getOrganizationById } from "@/lib/data";
import { formatCount } from "@/lib/format";
import { ORG_BRANCH_LABELS, ORG_SUBTYPE_LABELS } from "@/lib/labels";
import { getResponsibleOrganizations, getResponsiblePositions } from "@/lib/topics";
import type { Topic } from "@/lib/types";

export function ResponsibleList({ topic }: { topic: Topic }) {
  const organizations = getResponsibleOrganizations(topic);
  const positions = getResponsiblePositions(topic);

  return (
    <section aria-labelledby="verantwoordelijk-titel" className="border-b border-line py-6">
      <h2 id="verantwoordelijk-titel" className="text-lg font-semibold tracking-tight text-ink">
        Wie is verantwoordelijk?
      </h2>
      <p className="mt-1 text-sm text-ink-muted">
        {formatCount(organizations.length)}{" "}
        {organizations.length === 1 ? "organisatie" : "organisaties"} en{" "}
        {formatCount(positions.length)} {positions.length === 1 ? "positie" : "posities"} zijn aan dit
        onderwerp gekoppeld.
      </p>

      {organizations.length === 0 && positions.length === 0 ? (
        <div className="mt-4">
          <EmptyState
            title="Nog geen verantwoordelijke organisaties"
            description="Voor dit onderwerp zijn in de dataset nog geen organisaties of posities vastgelegd. Dit is een bekend gat en geen leeg onderwerp."
          />
        </div>
      ) : null}

      {organizations.length > 0 ? (
        <div className="mt-4">
          <h3 className="text-xs font-medium uppercase tracking-wider text-ink-faint">
            Organisaties
          </h3>
          <ul className="mt-2.5 space-y-2">
            {organizations.map((organization) => (
              <li
                key={organization.id}
                className="rounded-md border border-line bg-surface p-3 transition-fast hover:border-line-strong"
              >
                <Link
                  href={`/organisaties/${organization.slug}/`}
                  className="text-sm font-semibold text-ink underline-offset-2 hover:text-accent-text hover:underline"
                >
                  {organization.name}
                </Link>
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  <KindBadge tone="accent">
                    {ORG_SUBTYPE_LABELS[organization.subtype]}
                  </KindBadge>
                  <span className="text-xs text-ink-faint">
                    {ORG_BRANCH_LABELS[organization.branch]}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {positions.length > 0 ? (
        <div className="mt-5">
          <h3 className="text-xs font-medium uppercase tracking-wider text-ink-faint">Posities</h3>
          <ul className="mt-2.5 space-y-2">
            {positions.map((position) => {
              const organization = getOrganizationById(position.organization);
              return (
                <li
                  key={position.id}
                  className="rounded-md border border-line bg-surface p-3 transition-fast hover:border-line-strong"
                >
                  <Link
                    href={`/posities/${position.slug}/`}
                    className="text-sm font-semibold text-ink underline-offset-2 hover:text-accent-text hover:underline"
                  >
                    {position.title}
                  </Link>
                  {organization ? (
                    <p className="mt-0.5 text-xs text-ink-faint">{organization.name}</p>
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
