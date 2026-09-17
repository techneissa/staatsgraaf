import type { Metadata } from "next";
import { Card } from "@/components/card";
import { EmptyState } from "@/components/empty-state";
import { EntityCard } from "@/components/entity-card";
import { JsonLd } from "@/components/json-ld";
import { getOrganizationCounts, getOrganizations } from "@/lib/data";
import { formatCount } from "@/lib/format";
import { ORG_BRANCH_LABELS, ORG_TYPE_LABELS } from "@/lib/labels";
import { SCOPE_LABEL, SITE_NAME, SITE_TAGLINE, canonical } from "@/lib/site";
import type { OrgBranch, OrgType } from "@/lib/types";

export const metadata: Metadata = {
  title: { absolute: `${SITE_NAME}: de Nederlandse rijksoverheid in kaart` },
  description: SITE_TAGLINE,
  alternates: canonical("/"),
};

export default function HomePage() {
  const counts = getOrganizationCounts();
  const organizations = getOrganizations();
  const ministries = counts.bySubtype.find((entry) => entry.key === "ministerie")?.count ?? 0;

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: SITE_NAME,
          description: SITE_TAGLINE,
        }}
      />

      <section className="border-b border-line pb-6">
        <p className="text-xs font-medium uppercase tracking-wider text-accent-text">{SCOPE_LABEL}</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-ink">
          De Nederlandse rijksoverheid in kaart
        </h1>
        <p className="mt-3 max-w-prose text-sm leading-relaxed text-ink-muted">{SITE_TAGLINE}</p>
      </section>

      <section aria-labelledby="nieuws-titel" className="border-b border-line py-6">
        <h2 id="nieuws-titel" className="text-lg font-semibold tracking-tight text-ink">
          Laatste nieuws
        </h2>
        <div className="mt-3">
          <EmptyState
            title="Nog geen nieuwsberichten"
            description="Zodra de nieuwsbronnen zijn aangesloten, verschijnen hier recente berichten met bron en datum."
          />
        </div>
      </section>

      <section aria-labelledby="wijzigingen-titel" className="border-b border-line py-6">
        <h2 id="wijzigingen-titel" className="text-lg font-semibold tracking-tight text-ink">
          Laatste wijzigingen
        </h2>
        <div className="mt-3">
          <EmptyState
            title="Nog geen wijzigingen"
            description="De wijzigingenfeed wordt gevuld door de dagelijkse vergelijking van de dataset met de vorige versie. Aanstellingen, vertrekken en structuurwijzigingen verschijnen hier zodra die vergelijking draait."
          />
        </div>
      </section>

      <section aria-labelledby="overzicht-titel" className="border-b border-line py-6">
        <h2 id="overzicht-titel" className="text-lg font-semibold tracking-tight text-ink">
          Overzicht
        </h2>
        <p className="mt-1 text-sm text-ink-muted">Tellingen op het hoogste niveau voor het Rijk.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Card>
            <h3 className="text-xs font-medium uppercase tracking-wider text-ink-faint">
              Naar type
            </h3>
            <ul className="mt-2.5 space-y-1.5">
              {counts.byType.map((entry) => (
                <li key={entry.key} className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="text-ink-muted">
                    {ORG_TYPE_LABELS[entry.key as OrgType] ?? entry.key}
                  </span>
                  <span className="tabular-nums text-ink">{formatCount(entry.count)}</span>
                </li>
              ))}
            </ul>
          </Card>
          <Card>
            <h3 className="text-xs font-medium uppercase tracking-wider text-ink-faint">
              Naar branche
            </h3>
            <ul className="mt-2.5 space-y-1.5">
              {counts.byBranch.map((entry) => (
                <li key={entry.key} className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="text-ink-muted">
                    {ORG_BRANCH_LABELS[entry.key as OrgBranch] ?? entry.key}
                  </span>
                  <span className="tabular-nums text-ink">{formatCount(entry.count)}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
        <p className="mt-3 text-xs text-ink-faint">
          {formatCount(counts.total)} organisaties in totaal, waarvan {formatCount(ministries)}{" "}
          ministeries.
        </p>
      </section>

      <section aria-labelledby="organisaties-titel" className="py-6">
        <h2 id="organisaties-titel" className="text-lg font-semibold tracking-tight text-ink">
          Organisaties
        </h2>
        <ul className="mt-3 space-y-2">
          {organizations.map((organization) => (
            <li key={organization.id}>
              <EntityCard organization={organization} />
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
