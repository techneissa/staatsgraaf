import type { Metadata } from "next";
import { Breadcrumb } from "@/components/breadcrumb";
import { JsonLd } from "@/components/json-ld";
import { EntityCard } from "@/components/entity-card";
import { branchColorVar } from "@/lib/branch-colors";
import { getDatasetDate, getOrganizations } from "@/lib/data";
import { formatCount } from "@/lib/format";
import { SECTOR_ORDER } from "@/lib/graph";
import { ORG_BRANCH_LABELS } from "@/lib/labels";
import { absoluteUrl, pageMetadata, SITE_NAME } from "@/lib/site";
import type { Organization, OrgBranch } from "@/lib/types";

export const metadata: Metadata = pageMetadata({
  title: "Organisaties",
  description:
    "Alle organisaties in de dataset, gegroepeerd naar staatsmacht, met per organisatie het type en een bron voor de instelling.",
  path: "/organisaties/",
  snapshotDate: getDatasetDate(),
});

type BranchGroup = { branch: OrgBranch; organizations: Organization[] };

function groupByBranch(organizations: Organization[]): BranchGroup[] {
  const map = new Map<string, Organization[]>();
  for (const organization of organizations) {
    const list = map.get(organization.branch);
    if (list) list.push(organization);
    else map.set(organization.branch, [organization]);
  }
  const known = SECTOR_ORDER.filter((branch) => map.has(branch));
  const rest = [...map.keys()]
    .filter((branch) => !SECTOR_ORDER.includes(branch as OrgBranch))
    .sort((a, b) => a.localeCompare(b, "nl"));
  return [...known, ...(rest as OrgBranch[])].map((branch) => ({
    branch,
    organizations: map.get(branch) ?? [],
  }));
}

export default function OrganizationsIndexPage() {
  const organizations = [...getOrganizations()].sort((a, b) => a.name.localeCompare(b.name, "nl"));
  const groups = groupByBranch(organizations);
  const pageUrl = absoluteUrl("/organisaties/");

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: `Organisaties · ${SITE_NAME}`,
          description: "Organisaties van de Nederlandse staat, gegroepeerd naar staatsmacht.",
          ...(pageUrl !== undefined ? { url: pageUrl } : {}),
        }}
      />

      <Breadcrumb items={[{ label: SITE_NAME, href: "/" }, { label: "Organisaties" }]} />

      <header className="mt-4">
        <h1 className="text-3xl font-semibold tracking-tight text-ink">Organisaties</h1>
        <p className="mt-2 max-w-prose text-sm leading-relaxed text-ink-muted">
          Alle {formatCount(organizations.length)} organisaties in de dataset, gegroepeerd naar
          staatsmacht. Elke organisatiepagina toont de positie in de staatsinrichting, de
          bijbehorende posities en de bronnen.
        </p>
      </header>

      <nav aria-label="Groepen" className="mt-6">
        <ul className="flex flex-wrap gap-2">
          {groups.map((group) => (
            <li key={group.branch}>
              <a
                href={`#groep-${group.branch}`}
                className="inline-flex items-center gap-1.5 rounded-pill border border-line bg-surface px-3 py-1 text-xs font-medium text-ink-muted transition-fast hover:border-line-strong hover:text-ink"
              >
                <span
                  aria-hidden="true"
                  className="inline-block h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-line"
                  style={{ backgroundColor: branchColorVar(group.branch) }}
                />
                {ORG_BRANCH_LABELS[group.branch] ?? group.branch}
                <span className="tabular-nums text-ink-faint">
                  {formatCount(group.organizations.length)}
                </span>
              </a>
            </li>
          ))}
        </ul>
      </nav>

      {groups.map((group) => (
        <section
          key={group.branch}
          aria-labelledby={`groep-${group.branch}`}
          className="mt-8"
        >
          <h2
            id={`groep-${group.branch}`}
            className="scroll-mt-20 border-b border-line pb-2 text-lg font-semibold tracking-tight text-ink"
          >
            {ORG_BRANCH_LABELS[group.branch] ?? group.branch}
            <span className="ms-2 text-sm font-normal tabular-nums text-ink-faint">
              {formatCount(group.organizations.length)}
            </span>
          </h2>
          <ul className="mt-3 grid list-none gap-3 p-0 sm:grid-cols-2 xl:grid-cols-3">
            {group.organizations.map((organization) => (
              <li key={organization.id}>
                <EntityCard organization={organization} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </>
  );
}
