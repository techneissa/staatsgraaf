import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumb } from "@/components/breadcrumb";
import { JsonLd } from "@/components/json-ld";
import { getDatasetDate, getOrganizations } from "@/lib/data";
import { formatCount } from "@/lib/format";
import { SECTOR_ORDER } from "@/lib/graph";
import { ORG_BRANCH_LABELS, ORG_SUBTYPE_LABELS } from "@/lib/labels";
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

      <header className="mt-4 border-b border-line pb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Organisaties</h1>
        <p className="mt-3 max-w-prose text-sm leading-relaxed text-ink-muted">
          Alle {formatCount(organizations.length)} organisaties in de dataset, gegroepeerd naar
          staatsmacht. Elke organisatiepagina toont de positie in de staatsinrichting, de
          bijbehorende posities en de bronnen.
        </p>
      </header>

      <nav aria-label="Groepen" className="border-b border-line py-4">
        <ul className="flex flex-wrap gap-2">
          {groups.map((group) => (
            <li key={group.branch}>
              <a
                href={`#groep-${group.branch}`}
                className="inline-flex items-center rounded-sm border border-line bg-surface px-2 py-1 text-xs font-medium text-ink-muted transition-fast hover:border-line-strong hover:text-ink"
              >
                {ORG_BRANCH_LABELS[group.branch] ?? group.branch}
                <span className="ms-1.5 text-ink-faint">{formatCount(group.organizations.length)}</span>
              </a>
            </li>
          ))}
        </ul>
      </nav>

      {groups.map((group) => (
        <section
          key={group.branch}
          aria-labelledby={`groep-${group.branch}`}
          className="border-b border-line py-6 last:border-b-0"
        >
          <h2
            id={`groep-${group.branch}`}
            className="scroll-mt-20 text-lg font-semibold tracking-tight text-ink"
          >
            {ORG_BRANCH_LABELS[group.branch] ?? group.branch}
            <span className="ms-2 text-sm font-normal text-ink-faint">
              {formatCount(group.organizations.length)}
            </span>
          </h2>
          <ul className="mt-3 grid list-none gap-x-4 gap-y-1.5 p-0 sm:grid-cols-2 xl:grid-cols-3">
            {group.organizations.map((organization) => (
              <li key={organization.id} className="flex items-baseline gap-2">
                <Link
                  href={`/organisaties/${organization.slug}/`}
                  className="min-w-0 truncate text-sm text-ink underline-offset-2 hover:text-accent-text hover:underline"
                >
                  {organization.name}
                </Link>
                <span className="shrink-0 text-xs text-ink-faint">
                  {ORG_SUBTYPE_LABELS[organization.subtype] ?? organization.subtype}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </>
  );
}
